import { invokeSendPush } from '@/lib/push-notifications';
import { supabase } from '@/lib/supabase';
import type { ComplaintStatus, InviteRole, VisitorType } from '@/types/database';

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
export type NotificationType =
  | 'visitor_pending'
  | 'visitor_decision'
  | 'visitor_checked_in'
  | 'notice'
  | 'poll_new'
  | 'poll_results'
  | 'join_request'
  | 'join_reviewed'
  | 'complaint_new'
  | 'complaint_updated';

export type NotificationData = {
  type: NotificationType;
  societyId?: string;
  flatId?: string;
  visitorId?: string;
  noticeId?: string;
  pollId?: string;
  complaintId?: string;
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

export async function notifyUsers(params: {
  userIds: string[];
  title: string;
  body: string;
  data: NotificationData;
  excludeUserId?: string | null;
}): Promise<void> {
  const userIds = uniqueIds(params.userIds, params.excludeUserId);
  if (userIds.length === 0) return;

  try {
    for (let i = 0; i < userIds.length; i += BATCH) {
      await invokeSendPush({
        userIds: userIds.slice(i, i + BATCH),
        title: params.title,
        body: params.body,
        data: params.data as unknown as Record<string, unknown>,
      });
    }
  } catch (e) {
    console.warn('[push] notifyUsers failed:', e);
  }
}

/** Flat residents: visitor waiting for approval. */
export async function notifyVisitorPending(params: {
  flatId: string;
  societyId: string;
  visitorName: string;
  visitorType: VisitorType;
  visitorId?: string;
  flatLabel?: string;
}): Promise<void> {
  const userIds = await idsForFlatResidents(params.flatId, params.societyId);
  const type = visitorTypeLabel(params.visitorType);
  const where = params.flatLabel ? ` for ${params.flatLabel}` : '';
  await notifyUsers({
    userIds,
    title: 'Approve visitor',
    body: `${params.visitorName} (${type}) is at the gate${where}. Tap to respond.`,
    data: {
      type: 'visitor_pending',
      flatId: params.flatId,
      societyId: params.societyId,
      visitorId: params.visitorId,
    },
  });
}

/** Creating guard: resident approved/rejected. */
export async function notifyVisitorDecision(params: {
  createdBy: string | null;
  visitorName: string;
  status: 'approved' | 'rejected';
}): Promise<void> {
  if (!params.createdBy) return;
  const verb = params.status === 'approved' ? 'approved' : 'rejected';
  await notifyUsers({
    userIds: [params.createdBy],
    title: `Visitor ${verb}`,
    body: `${params.visitorName} was ${verb} by the resident.`,
    data: {
      type: 'visitor_decision',
      status: params.status,
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

/** Society residents: new notice. */
export async function notifyNoticeCreated(params: {
  societyId: string;
  title: string;
  body: string;
  noticeId?: string;
}): Promise<void> {
  const userIds = await idsForSocietyResidents(params.societyId);
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

/** Society admins: someone requested to join. */
export async function notifyJoinRequest(params: {
  societyId: string;
  requesterName: string;
  role: InviteRole | string;
}): Promise<void> {
  const userIds = await idsForSocietyAdmins(params.societyId);
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

/** Society admins: new helpdesk ticket. */
export async function notifyComplaintCreated(params: {
  societyId: string;
  complaintId: string;
  category: string;
  description: string;
  excludeUserId?: string | null;
}): Promise<void> {
  const userIds = await idsForSocietyAdmins(params.societyId);
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
