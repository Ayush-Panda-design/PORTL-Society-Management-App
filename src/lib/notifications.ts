import { invokeSendPush, type PushChannelId, type SendPushResult } from '@/lib/push-notifications';
import { supabase } from '@/lib/supabase';
import type { ComplaintStatus, InviteRole, VisitorType } from '@/types/database';
import { VISITOR_ACTION_CATEGORY } from '@/lib/visitor-notification-actions';

function visitorTypeLabel(type: VisitorType): string {
  switch (type) {
    case 'guest':
      return 'Guest';
    case 'delivery':
      return 'Delivery';
    case 'cab':
      return 'Cab';
    case 'service':
      return 'Service';
    default:
      return 'Visitor';
  }
}

function channelForType(type: NotificationType): PushChannelId {
  switch (type) {
    case 'visitor_pending':
    case 'visitor_decision':
    case 'visitor_checked_in':
    case 'visitor_auto_approved':
    case 'visitor_checked_out':
    case 'visitor_escalated':
      return 'visitor';
    case 'notice':
    case 'poll_new':
    case 'poll_results':
      return 'notice';
    case 'broadcast':
      return 'alerts';
    case 'payment_due':
    case 'payment_confirmed':
    case 'amenity_booked':
    case 'amenity_waitlist':
      return 'default';
    default:
      return 'default';
  }
}

export type NotificationType =
  | 'visitor_pending'
  | 'visitor_decision'
  | 'visitor_checked_in'
  | 'visitor_auto_approved'
  | 'visitor_checked_out'
  | 'visitor_escalated'
  | 'notice'
  | 'broadcast'
  | 'poll_new'
  | 'poll_results'
  | 'join_request'
  | 'join_reviewed'
  | 'complaint_new'
  | 'complaint_updated'
  | 'payment_due'
  | 'payment_confirmed'
  | 'amenity_booked'
  | 'amenity_waitlist';

export type NotificationData = {
  type: NotificationType;
  societyId?: string;
  flatId?: string;
  visitorId?: string;
  visitorName?: string;
  createdBy?: string;
  noticeId?: string;
  pollId?: string;
  broadcastId?: string;
  complaintId?: string;
  paymentId?: string;
  amenityId?: string;
  status?: string;
};

const BATCH = 100;

function previewText(text: string, max = 120): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function uniqueIds(ids: string[], exclude?: string | null): string[] {
  const set = new Set(ids.filter(Boolean));
  if (exclude) set.delete(exclude);
  return [...set];
}

export async function idsForFlatResidents(
  flatId: string,
  societyId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('flat_id', flatId)
    .eq('role', 'resident')
    .eq('society_id', societyId)
    .eq('status', 'active');

  if (error) {
    console.warn('[push] idsForFlatResidents:', error.message);
    return [];
  }
  return (data ?? []).map((row) => row.id as string);
}

export async function idsForSocietyResidents(societyId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('society_id', societyId)
    .eq('role', 'resident')
    .eq('status', 'active');

  if (error) {
    console.warn('[push] idsForSocietyResidents:', error.message);
    return [];
  }
  return (data ?? []).map((row) => row.id as string);
}

export async function idsForSocietyAdmins(societyId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('society_id', societyId)
    .eq('role', 'admin')
    .eq('status', 'active');

  if (error) {
    console.warn('[push] idsForSocietyAdmins:', error.message);
    return [];
  }
  return (data ?? []).map((row) => row.id as string);
}

/** Admins + holders of a society permission (SECURITY DEFINER RPC). */
export async function idsForPermissionHolders(
  societyId: string,
  permission: string,
): Promise<string[]> {
  const { data, error } = await supabase.rpc('user_ids_with_permission', {
    p_society_id: societyId,
    p_permission: permission,
  });

  if (error) {
    console.warn('[push] idsForPermissionHolders:', error.message);
    // Fallback when migration 040 is not applied yet.
    return idsForSocietyAdmins(societyId);
  }

  return ((data as string[] | null) ?? []).filter(Boolean);
}

export async function idsForSocietyGuards(societyId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('society_id', societyId)
    .eq('role', 'guard')
    .eq('status', 'active');

  if (error) {
    console.warn('[push] idsForSocietyGuards:', error.message);
    return [];
  }
  return (data ?? []).map((row) => row.id as string);
}

export async function idsForSocietyMembers(societyId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('society_id', societyId)
    .eq('status', 'active');

  if (error) {
    console.warn('[push] idsForSocietyMembers:', error.message);
    return [];
  }
  return (data ?? []).map((row) => row.id as string);
}

export async function notifyUsers(params: {
  userIds: string[];
  title: string;
  body: string;
  data: NotificationData;
  excludeUserId?: string | null;
  channelId?: PushChannelId;
  categoryId?: string;
}): Promise<SendPushResult> {
  const userIds = uniqueIds(params.userIds, params.excludeUserId);
  if (userIds.length === 0) {
    return { ok: false, error: 'No recipients', sent: 0 };
  }

  let sent = 0;
  let lastError: string | undefined;

  try {
    for (let i = 0; i < userIds.length; i += BATCH) {
      const result = await invokeSendPush({
        userIds: userIds.slice(i, i + BATCH),
        title: params.title,
        body: params.body,
        data: params.data as unknown as Record<string, unknown>,
        channelId: params.channelId ?? channelForType(params.data.type),
        categoryId: params.categoryId,
      });
      sent += result.sent ?? 0;
      if (!result.ok && result.error) {
        lastError = result.error;
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'notifyUsers failed';
    console.warn('[push] notifyUsers failed:', e);
    return { ok: false, error: message, sent };
  }

  return {
    ok: sent > 0 || !lastError,
    sent,
    error: sent > 0 ? undefined : lastError,
  };
}

/** Flat residents: visitor waiting for approval. */
export async function notifyVisitorPending(params: {
  flatId: string;
  societyId: string;
  visitorName: string;
  visitorType: VisitorType;
  visitorId?: string;
  flatLabel?: string;
  /** Guard who created the request — required so lock-screen approve can notify them. */
  createdBy?: string | null;
}): Promise<void> {
  const userIds = await idsForFlatResidents(params.flatId, params.societyId);
  const type = visitorTypeLabel(params.visitorType);
  const where = params.flatLabel ? ` for ${params.flatLabel}` : '';
  await notifyUsers({
    userIds,
    title: 'Approve visitor',
    body: `${params.visitorName} (${type}) is at the gate${where}. Approve or reject from this alert.`,
    data: {
      type: 'visitor_pending',
      flatId: params.flatId,
      societyId: params.societyId,
      visitorId: params.visitorId,
      visitorName: params.visitorName,
      createdBy: params.createdBy ?? undefined,
    },
    channelId: 'visitor',
    categoryId: VISITOR_ACTION_CATEGORY,
  });
}

/** Flat residents: whitelisted partner was auto-approved at the gate (informational). */
export async function notifyVisitorAutoApproved(params: {
  flatId: string;
  societyId: string;
  visitorName: string;
  visitorId?: string;
  partnerLabel?: string;
}): Promise<void> {
  const userIds = await idsForFlatResidents(params.flatId, params.societyId);
  const who = params.partnerLabel ? `${params.visitorName} (${params.partnerLabel})` : params.visitorName;
  await notifyUsers({
    userIds,
    title: 'Partner auto-approved',
    body: `${who} was auto-approved at the gate for your flat.`,
    data: {
      type: 'visitor_auto_approved',
      flatId: params.flatId,
      societyId: params.societyId,
      visitorId: params.visitorId,
      visitorName: params.visitorName,
    },
  });
}

/** Creating guard: resident/committee approved/rejected. */
export async function notifyVisitorDecision(params: {
  createdBy: string | null;
  visitorName: string;
  status: 'approved' | 'rejected';
  rejectReason?: string;
  visitorId?: string;
  societyId?: string;
  decidedBy?: 'resident' | 'committee' | 'admin';
}): Promise<void> {
  if (!params.createdBy) return;
  const verb = params.status === 'approved' ? 'approved' : 'rejected';
  const who =
    params.decidedBy === 'committee'
      ? 'the committee'
      : params.decidedBy === 'admin'
        ? 'an admin'
        : 'the resident';
  const reasonText = params.rejectReason ? ` Reason: ${params.rejectReason}` : '';
  await notifyUsers({
    userIds: [params.createdBy],
    title: `Visitor ${verb}`,
    body: `${params.visitorName} was ${verb} by ${who}.${reasonText}`,
    data: {
      type: 'visitor_decision',
      status: params.status,
      visitorId: params.visitorId,
      societyId: params.societyId,
    },
  });
}

/** Flat residents: guest has entered. */
export async function notifyVisitorCheckedIn(params: {
  flatId: string;
  societyId: string;
  visitorName: string;
  visitorId?: string;
}): Promise<void> {
  const userIds = await idsForFlatResidents(params.flatId, params.societyId);
  await notifyUsers({
    userIds,
    title: 'Guest checked in',
    body: `${params.visitorName} has entered the society.`,
    data: {
      type: 'visitor_checked_in',
      flatId: params.flatId,
      societyId: params.societyId,
      visitorId: params.visitorId,
    },
  });
}

/** Flat residents: guest has left. */
export async function notifyVisitorCheckedOut(params: {
  flatId: string;
  societyId: string;
  visitorName: string;
  visitorId?: string;
}): Promise<void> {
  const userIds = await idsForFlatResidents(params.flatId, params.societyId);
  await notifyUsers({
    userIds,
    title: 'Guest checked out',
    body: `${params.visitorName} has left the society.`,
    data: {
      type: 'visitor_checked_out',
      flatId: params.flatId,
      societyId: params.societyId,
      visitorId: params.visitorId,
    },
  });
}

/** Society residents: new notice (optionally tower-scoped). */
export async function notifyNoticeCreated(params: {
  societyId: string;
  title: string;
  body: string;
  noticeId?: string;
  targetAudience?: string | null;
  targetTowerId?: string | null;
}): Promise<void> {
  let userIds: string[];
  if (params.targetAudience === 'tower' && params.targetTowerId) {
    const { data, error } = await supabase.rpc('user_ids_for_tower', {
      p_society_id: params.societyId,
      p_tower_id: params.targetTowerId,
    });
    if (error) {
      console.warn('[push] user_ids_for_tower:', error.message);
      userIds = await idsForSocietyResidents(params.societyId);
    } else {
      userIds = ((data as string[] | null) ?? []).filter(Boolean);
    }
  } else {
    userIds = await idsForSocietyResidents(params.societyId);
  }

  await notifyUsers({
    userIds,
    title: 'New notice',
    body: previewText(`${params.title} — ${params.body}`),
    data: {
      type: 'notice',
      societyId: params.societyId,
      noticeId: params.noticeId,
    },
  });
}

/** Society residents: new poll to vote on. */
export async function notifyPollCreated(params: {
  societyId: string;
  pollId: string;
  question: string;
  excludeUserId?: string | null;
}): Promise<void> {
  const userIds = await idsForSocietyResidents(params.societyId);
  await notifyUsers({
    userIds,
    title: 'New poll',
    body: `${previewText(params.question, 90)} — tap to vote.`,
    data: {
      type: 'poll_new',
      societyId: params.societyId,
      pollId: params.pollId,
    },
    excludeUserId: params.excludeUserId,
  });
}

/** Society residents: poll results published. */
export async function notifyPollResultsPublished(params: {
  societyId: string;
  pollId: string;
  question: string;
}): Promise<void> {
  const userIds = await idsForSocietyResidents(params.societyId);
  await notifyUsers({
    userIds,
    title: 'Poll results are in',
    body: `See results for: ${previewText(params.question, 90)}`,
    data: {
      type: 'poll_results',
      societyId: params.societyId,
      pollId: params.pollId,
    },
  });
}

/** Society admins + members.review: someone requested to join. */
export async function notifyJoinRequest(params: {
  societyId: string;
  requesterName: string;
  role: InviteRole | string;
}): Promise<void> {
  const userIds = await idsForPermissionHolders(params.societyId, 'members.review');
  const roleLabel = params.role === 'guard' ? 'guard' : 'resident';
  await notifyUsers({
    userIds,
    title: 'New join request',
    body: `${params.requesterName} wants to join as ${roleLabel}. Tap to review.`,
    data: {
      type: 'join_request',
      societyId: params.societyId,
    },
  });
}

/** Requester: join approved or rejected. */
export async function notifyJoinReviewed(params: {
  userId: string;
  approve: boolean;
  societyName?: string | null;
}): Promise<void> {
  const place = params.societyName?.trim() || 'the society';
  await notifyUsers({
    userIds: [params.userId],
    title: params.approve ? 'You’re in' : 'Request declined',
    body: params.approve
      ? `Welcome to ${place}. Open Portl to get started.`
      : `Your request to join ${place} was declined.`,
    data: {
      type: 'join_reviewed',
      status: params.approve ? 'active' : 'rejected',
    },
  });
}

/** Society admins + complaints.manage: new helpdesk ticket. */
export async function notifyComplaintCreated(params: {
  societyId: string;
  complaintId: string;
  category: string;
  description: string;
  excludeUserId?: string | null;
}): Promise<void> {
  const userIds = await idsForPermissionHolders(params.societyId, 'complaints.manage');
  await notifyUsers({
    userIds,
    title: 'New helpdesk ticket',
    body: previewText(`${params.category}: ${params.description}`),
    data: {
      type: 'complaint_new',
      societyId: params.societyId,
      complaintId: params.complaintId,
    },
    excludeUserId: params.excludeUserId,
  });
}

/** Reporter: complaint status changed. */
export async function notifyComplaintUpdated(params: {
  reporterId: string | null;
  complaintId: string;
  status: ComplaintStatus;
}): Promise<void> {
  if (!params.reporterId) return;
  const label =
    params.status === 'open'
      ? 'open'
      : params.status === 'in_progress'
        ? 'in progress'
        : 'resolved';
  await notifyUsers({
    userIds: [params.reporterId],
    title: 'Complaint updated',
    body: `Your ticket is now ${label}. Tap to view.`,
    data: {
      type: 'complaint_updated',
      complaintId: params.complaintId,
      status: params.status,
    },
  });
}

/** Resolve society_id for a flat (for complaint notifies). */
export async function societyIdForFlat(flatId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('flats')
    .select('towers ( society_id )')
    .eq('id', flatId)
    .maybeSingle();

  if (error) {
    console.warn('[push] societyIdForFlat:', error.message);
    return null;
  }

  const towers = data?.towers as { society_id?: string } | { society_id?: string }[] | null;
  if (!towers) return null;
  const row = Array.isArray(towers) ? towers[0] : towers;
  return row?.society_id ?? null;
}

/** Resident: admin issued a maintenance due / fine / charge. */
export async function notifyPaymentDue(params: {
  payerId: string;
  societyId: string;
  paymentId: string;
  purpose: string;
  amountLabel: string;
}): Promise<SendPushResult> {
  const purposeLabel =
    params.purpose === 'maintenance_due'
      ? 'Maintenance due'
      : params.purpose === 'fine'
        ? 'Fine issued'
        : 'Payment due';
  return notifyUsers({
    userIds: [params.payerId],
    title: purposeLabel,
    body: `${params.amountLabel} is waiting in Payments. Tap to pay.`,
    data: {
      type: 'payment_due',
      societyId: params.societyId,
      paymentId: params.paymentId,
      status: params.purpose,
    },
  });
}

/** Resident: Razorpay / offline payment confirmed. */
export async function notifyPaymentConfirmed(params: {
  payerId: string;
  societyId: string;
  paymentId: string;
  amountLabel: string;
}): Promise<SendPushResult> {
  return notifyUsers({
    userIds: [params.payerId],
    title: 'Payment confirmed',
    body: `${params.amountLabel} was received. View your statement in Payments.`,
    data: {
      type: 'payment_confirmed',
      societyId: params.societyId,
      paymentId: params.paymentId,
    },
  });
}

/** Flat: amenity booking succeeded. */
export async function notifyAmenityBooked(params: {
  flatId: string;
  societyId: string;
  amenityName: string;
  date: string;
  slot: string;
  amenityId?: string;
  excludeUserId?: string | null;
}): Promise<SendPushResult> {
  const userIds = await idsForFlatResidents(params.flatId, params.societyId);
  return notifyUsers({
    userIds,
    title: 'Amenity booked',
    body: `${params.amenityName} · ${params.date} ${params.slot}`,
    data: {
      type: 'amenity_booked',
      societyId: params.societyId,
      flatId: params.flatId,
      amenityId: params.amenityId,
    },
    excludeUserId: params.excludeUserId,
  });
}

/** Confirm waitlist join to the requester (and flat mates optionally skipped). */
export async function notifyAmenityWaitlisted(params: {
  userId: string;
  societyId: string;
  amenityName: string;
  date: string;
  slot: string;
  amenityId?: string;
}): Promise<SendPushResult> {
  return notifyUsers({
    userIds: [params.userId],
    title: 'Joined waitlist',
    body: `${params.amenityName} · ${params.date} ${params.slot}. We’ll notify you if a spot opens.`,
    data: {
      type: 'amenity_waitlist',
      societyId: params.societyId,
      amenityId: params.amenityId,
      status: 'waiting',
    },
  });
}
