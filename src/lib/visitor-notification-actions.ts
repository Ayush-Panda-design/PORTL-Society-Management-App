import { updateVisitorStatus } from '@/lib/visitors';
import { supabase } from '@/lib/supabase';

export const VISITOR_ACTION_CATEGORY = 'visitor_pending';
export const VISITOR_ACTION_APPROVE = 'APPROVE_VISITOR';
export const VISITOR_ACTION_REJECT = 'REJECT_VISITOR';

/** Handle Approve / Reject from a lock-screen notification action. */
export async function handleVisitorNotificationAction(params: {
  actionId: string;
  visitorId?: string;
  flatId?: string;
  visitorName?: string;
  createdBy?: string | null;
}): Promise<{ handled: boolean; error?: string }> {
  const { actionId, visitorId, flatId } = params;
  if (actionId !== VISITOR_ACTION_APPROVE && actionId !== VISITOR_ACTION_REJECT) {
    return { handled: false };
  }
  if (!visitorId || !flatId) {
    return { handled: true, error: 'Missing visitor details on notification.' };
  }

  let createdBy = params.createdBy ?? null;
  let visitorName = params.visitorName ?? 'Visitor';

  // Older pushes omitted createdBy — load from DB so the guard still gets the decision.
  if (!createdBy) {
    const { data } = await supabase
      .from('visitors')
      .select('created_by, name')
      .eq('id', visitorId)
      .eq('flat_id', flatId)
      .maybeSingle();
    createdBy = (data?.created_by as string | null) ?? null;
    if (data?.name) visitorName = data.name as string;
  }

  const status = actionId === VISITOR_ACTION_APPROVE ? 'approved' : 'rejected';
  const { error } = await updateVisitorStatus({
    visitorId,
    flatId,
    status,
    rejectReason: status === 'rejected' ? 'Rejected from notification' : undefined,
    createdBy,
    visitorName,
  });

  return { handled: true, error: error ?? undefined };
}
