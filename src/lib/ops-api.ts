import { supabase } from '@/lib/supabase';
import type {
  AuditLog,
  CommitteeRole,
  FrequentVisitor,
  NoticeAcknowledgment,
  Payment,
  PaymentLedgerEntry,
  PaymentPurpose,
  SocietyPartner,
  SocietyPaymentAccount,
  SocietyPermission,
  Visitor,
  VisitorType,
} from '@/types/database';

export async function fetchMyPermissions(): Promise<SocietyPermission[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  const { data, error } = await supabase
    .from('society_member_permissions')
    .select('permission')
    .eq('user_id', user.user.id);
  if (error) throw new Error(error.message);
  return ((data ?? []) as { permission: SocietyPermission }[]).map((r) => r.permission);
}

export async function hasPermission(permission: SocietyPermission): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_permission', {
    p_permission: permission,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function grantCommitteeRole(
  userId: string,
  role: CommitteeRole,
): Promise<number> {
  const { data, error } = await supabase.rpc('grant_committee_role', {
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

export async function fetchAuditLogs(limit = 50): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as AuditLog[]) ?? [];
}

export async function logAudit(input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.rpc('log_audit', {
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId ?? null,
    p_metadata: input.metadata ?? {},
  });
  if (error) console.warn('[audit]', error.message);
}

export async function fetchFrequentVisitors(flatId: string): Promise<FrequentVisitor[]> {
  const { data, error } = await supabase
    .from('frequent_visitors')
    .select('*')
    .eq('flat_id', flatId)
    .order('last_visited_at', { ascending: false, nullsFirst: false })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as FrequentVisitor[]) ?? [];
}

export async function upsertFrequentVisitor(input: {
  id?: string;
  societyId: string;
  flatId: string;
  name: string;
  phone?: string | null;
  type: VisitorType;
  purpose?: string | null;
}): Promise<FrequentVisitor> {
  const payload = {
    society_id: input.societyId,
    flat_id: input.flatId,
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    type: input.type,
    purpose: input.purpose?.trim() || null,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('frequent_visitors')
      .update(payload)
      .eq('id', input.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as FrequentVisitor;
  }

  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('frequent_visitors')
    .insert({ ...payload, created_by: user.user?.id ?? null })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as FrequentVisitor;
}

export async function deleteFrequentVisitor(id: string): Promise<void> {
  const { error } = await supabase.from('frequent_visitors').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function quickApproveFrequentVisitor(
  frequentVisitorId: string,
  validityHours = 12,
): Promise<Visitor> {
  const { data, error } = await supabase.rpc('quick_approve_frequent_visitor', {
    p_frequent_visitor_id: frequentVisitorId,
    p_validity_hours: validityHours,
  });
  if (error) throw new Error(error.message);
  return data as Visitor;
}

export async function updateSocietyVisitorEscalationMinutes(
  societyId: string,
  minutes: number,
): Promise<void> {
  const { error } = await supabase.from('society_settings').upsert({
    society_id: societyId,
    visitor_escalation_minutes: minutes,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function fetchSocietyVisitorEscalationMinutes(
  societyId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('society_settings')
    .select('visitor_escalation_minutes')
    .eq('society_id', societyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.visitor_escalation_minutes as number | undefined) ?? 10;
}

export async function acknowledgeNotice(noticeId: string): Promise<NoticeAcknowledgment> {
  const { data, error } = await supabase.rpc('acknowledge_notice', {
    p_notice_id: noticeId,
  });
  if (error) throw new Error(error.message);
  return data as NoticeAcknowledgment;
}

export async function fetchMyNoticeAcks(noticeIds: string[]): Promise<NoticeAcknowledgment[]> {
  if (noticeIds.length === 0) return [];
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  const { data, error } = await supabase
    .from('notice_acknowledgments')
    .select('*')
    .eq('user_id', user.user.id)
    .in('notice_id', noticeIds);
  if (error) throw new Error(error.message);
  return (data as NoticeAcknowledgment[]) ?? [];
}

export async function fetchNoticeAckStats(
  noticeId: string,
): Promise<{ acknowledged_count: number; target_count: number }> {
  const { data, error } = await supabase.rpc('notice_ack_stats', {
    p_notice_id: noticeId,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    acknowledged_count: Number(row?.acknowledged_count ?? 0),
    target_count: Number(row?.target_count ?? 0),
  };
}

export async function reopenComplaint(complaintId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc('reopen_complaint', {
    p_complaint_id: complaintId,
    p_reason: reason ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function rateComplaint(
  complaintId: string,
  rating: number,
  comment?: string,
): Promise<void> {
  const { error } = await supabase.rpc('rate_complaint', {
    p_complaint_id: complaintId,
    p_rating: rating,
    p_comment: comment ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function upsertComplaintCategoryRouting(input: {
  societyId: string;
  category: string;
  assigneeId: string | null;
}): Promise<void> {
  const { error } = await supabase.from('complaint_category_routing').upsert(
    {
      society_id: input.societyId,
      category: input.category,
      assignee_id: input.assigneeId,
    },
    { onConflict: 'society_id,category' },
  );
  if (error) throw new Error(error.message);
}

export async function joinAmenityWaitlist(input: {
  amenityId: string;
  flatId: string;
  date: string;
  slot: string;
  amenityName?: string;
  societyId?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('join_amenity_waitlist', {
    p_amenity_id: input.amenityId,
    p_flat_id: input.flatId,
    p_date: input.date,
    p_slot: input.slot,
  });
  if (error) throw new Error(error.message);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && input.societyId) {
    const { notifyAmenityWaitlisted } = await import('@/lib/notifications');
    void notifyAmenityWaitlisted({
      userId: user.id,
      societyId: input.societyId,
      amenityName: input.amenityName ?? 'Amenity',
      date: input.date,
      slot: input.slot,
      amenityId: input.amenityId,
    });
  }
}

export async function createRecurringAmenityBookings(input: {
  amenityId: string;
  flatId: string;
  slot: string;
  weekday: number;
  startDate: string;
  occurrences?: number;
}): Promise<void> {
  const { error } = await supabase.rpc('create_recurring_amenity_bookings', {
    p_amenity_id: input.amenityId,
    p_flat_id: input.flatId,
    p_slot: input.slot,
    p_weekday: input.weekday,
    p_start_date: input.startDate,
    p_occurrences: input.occurrences ?? 4,
  });
  if (error) throw new Error(error.message);
}

export async function fetchMyPaymentStatement(): Promise<PaymentLedgerEntry[]> {
  const { data, error } = await supabase.rpc('fetch_my_payment_statement');
  if (error) throw new Error(error.message);
  return (data as PaymentLedgerEntry[]) ?? [];
}

export async function initiatePartialPayment(
  parentPaymentId: string,
  amountPaise: number,
) {
  const { data, error } = await supabase.rpc('initiate_partial_payment', {
    p_parent_payment_id: parentPaymentId,
    p_amount_paise: amountPaise,
  });
  if (error) throw new Error(error.message);
  return data;
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function paymentStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'confirmed':
      return 'Paid';
    case 'partially_paid':
      return 'Partial';
    case 'pending_payment':
      return 'Pending';
    case 'failed':
      return 'Failed';
    case 'expired':
      return 'Expired';
    case 'refunded':
      return 'Refunded';
    default:
      return status ? String(status) : '—';
  }
}

export async function fetchSocietyPaymentAccount(
  societyId: string,
): Promise<SocietyPaymentAccount | null> {
  const { data, error } = await supabase
    .from('society_payment_accounts')
    .select('*')
    .eq('society_id', societyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SocietyPaymentAccount | null) ?? null;
}

export async function fetchSocietyPaymentStatement(options?: {
  purpose?: string;
}): Promise<PaymentLedgerEntry[]> {
  const { data, error } = await supabase.rpc('fetch_society_payment_statement', {
    p_from: null,
    p_to: null,
    p_purpose: options?.purpose ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as PaymentLedgerEntry[]) ?? [];
}

export async function adminRecordOfflinePayment(
  paymentId: string,
  method: string,
  note?: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_record_offline_payment', {
    p_payment_id: paymentId,
    p_method: method,
    p_note: note ?? null,
  });
  if (error) throw new Error(error.message);

  const { data: row } = await supabase
    .from('payments')
    .select('id, payer_id, society_id, amount_paise')
    .eq('id', paymentId)
    .maybeSingle();
  if (row?.payer_id && row.society_id) {
    const { notifyPaymentConfirmed } = await import('@/lib/notifications');
    void notifyPaymentConfirmed({
      payerId: row.payer_id,
      societyId: row.society_id,
      paymentId: row.id,
      amountLabel: formatPaise(row.amount_paise),
    });
  }
}

export async function adminRefundPayment(paymentId: string, note?: string): Promise<void> {
  const { error } = await supabase.rpc('admin_refund_payment', {
    p_payment_id: paymentId,
    p_note: note ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function adminIssuePayment(input: {
  payerId: string;
  purpose: Extract<PaymentPurpose, 'maintenance_due' | 'one_off_charge' | 'fine'>;
  amountPaise: number;
  notes?: string | null;
  referenceId?: string | null;
}): Promise<{ payment: Payment; pushOk: boolean; pushError?: string }> {
  const { data, error } = await supabase.rpc('admin_issue_payment', {
    p_payer_id: input.payerId,
    p_purpose: input.purpose,
    p_amount_paise: input.amountPaise,
    p_notes: input.notes ?? null,
    p_reference_id: input.referenceId ?? null,
  });
  if (error) throw new Error(error.message);
  const payment = data as Payment;

  const { notifyPaymentDue } = await import('@/lib/notifications');
  const push = await notifyPaymentDue({
    payerId: input.payerId,
    societyId: payment.society_id,
    paymentId: payment.id,
    purpose: input.purpose,
    amountLabel: formatPaise(input.amountPaise),
  });

  return {
    payment,
    pushOk: push.ok,
    pushError: push.error,
  };
}

export async function fetchSocietyPartners(societyId: string): Promise<SocietyPartner[]> {
  const { data, error } = await supabase
    .from('society_partners')
    .select('*')
    .eq('society_id', societyId)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as SocietyPartner[]) ?? [];
}

export async function upsertSocietyPartner(input: {
  id?: string;
  societyId: string;
  name: string;
  phone?: string | null;
  type: Extract<VisitorType, 'delivery' | 'cab' | 'service'>;
  companyName?: string | null;
  autoApprove?: boolean;
  notes?: string | null;
}): Promise<SocietyPartner> {
  const payload = {
    society_id: input.societyId,
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    type: input.type,
    company_name: input.companyName?.trim() || null,
    auto_approve: input.autoApprove ?? true,
    notes: input.notes?.trim() || null,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('society_partners')
      .update(payload)
      .eq('id', input.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as SocietyPartner;
  }

  const { data, error } = await supabase
    .from('society_partners')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as SocietyPartner;
}

export async function deleteSocietyPartner(id: string): Promise<void> {
  const { error } = await supabase.from('society_partners').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function matchSocietyPartner(
  societyId: string,
  phone: string | null | undefined,
  type: VisitorType,
): Promise<SocietyPartner | null> {
  if (!phone?.trim() || (type !== 'delivery' && type !== 'cab' && type !== 'service')) {
    return null;
  }
  const { data, error } = await supabase.rpc('match_society_partner', {
    p_society_id: societyId,
    p_phone: phone,
    p_type: type,
  });
  if (error) throw new Error(error.message);
  return (data as SocietyPartner | null) ?? null;
}
