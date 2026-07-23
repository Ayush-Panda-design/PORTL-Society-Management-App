import { updateVisitorStatus } from '@/lib/visitors';

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

  const status = actionId === VISITOR_ACTION_APPROVE ? 'approved' : 'rejected';
  const { error } = await updateVisitorStatus({
    visitorId,
    flatId,
    status,
    rejectReason: status === 'rejected' ? 'Rejected from notification' : undefined,
    createdBy: params.createdBy ?? null,
    visitorName: params.visitorName ?? 'Visitor',
  });

  return { handled: true, error: error ?? undefined };
}
