import { invokeSendPush } from '@/lib/push-notifications';
import { supabase } from '@/lib/supabase';
import type { VisitorStatus, VisitorType, VisitorWithFlat } from '@/types/database';

export const VISITOR_SELECT = `
  *,
  flats (
    id,
    number,
    towers (
      id,
      name,
      society_id
    )
  )
`;

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function statusLabel(status: VisitorStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'checked_in':
      return 'Checked in';
    case 'checked_out':
      return 'Checked out';
    default:
      return status;
  }
}

export function statusColor(status: VisitorStatus): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  switch (status) {
    case 'pending':
      return {
        bg: 'bg-status-pendingSoft',
        text: 'text-status-pending',
        border: 'border-amber-200',
        icon: '#D97706',
      };
    case 'approved':
      return {
        bg: 'bg-status-approvedSoft',
        text: 'text-status-approved',
        border: 'border-emerald-200',
        icon: '#059669',
      };
    case 'rejected':
      return {
        bg: 'bg-status-rejectedSoft',
        text: 'text-status-rejected',
        border: 'border-red-200',
        icon: '#DC2626',
      };
    case 'checked_in':
      return {
        bg: 'bg-status-infoSoft',
        text: 'text-status-info',
        border: 'border-blue-200',
        icon: '#2563EB',
      };
    case 'checked_out':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
        icon: '#64748B',
      };
    default:
      return {
        bg: 'bg-slate-50',
        text: 'text-slate-700',
        border: 'border-slate-200',
        icon: '#64748B',
      };
  }
}

export function typeLabel(type: VisitorType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function flatTowerName(
  towers:
    | { name: string }
    | { name: string }[]
    | null
    | undefined,
): string | undefined {
  if (!towers) return undefined;
  return Array.isArray(towers) ? towers[0]?.name : towers.name;
}

export function flatLabel(visitor: VisitorWithFlat): string {
  const number = visitor.flats?.number ?? '?';
  const tower = flatTowerName(visitor.flats?.towers);
  return tower ? `${tower} · ${number}` : `Flat ${number}`;
}

/**
 * Notify residents of a flat when a guard registers a visitor.
 */
export async function notifyResidentOfVisitor(params: {
  flatId: string;
  visitorName: string;
  visitorType: VisitorType;
  societyId: string;
}): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('flat_id', params.flatId)
      .eq('role', 'resident')
      .eq('society_id', params.societyId);

    if (error) {
      console.warn('[push] Failed to look up residents:', error.message);
      return;
    }

    const userIds = (data ?? []).map((row) => row.id as string);
    if (userIds.length === 0) return;

    const typeLabelText = typeLabel(params.visitorType);
    await invokeSendPush({
      userIds,
      title: 'Visitor at the gate',
      body: `${params.visitorName} (${typeLabelText}) is waiting for your approval.`,
      data: {
        type: 'visitor_pending',
        flatId: params.flatId,
        societyId: params.societyId,
      },
    });
  } catch (e) {
    console.warn('[push] notifyResidentOfVisitor failed:', e);
  }
}

/** Notify the guard who created a visitor request after approve/reject. */
export async function notifyGuardOfVisitorDecision(params: {
  createdBy: string | null;
  visitorName: string;
  status: 'approved' | 'rejected';
}): Promise<void> {
  if (!params.createdBy) return;

  const verb = params.status === 'approved' ? 'approved' : 'rejected';
  await invokeSendPush({
    userId: params.createdBy,
    title: `Visitor ${verb}`,
    body: `${params.visitorName} was ${verb} by the resident.`,
    data: {
      type: 'visitor_decision',
      status: params.status,
    },
  });
}

/** Approve or reject a pending visitor and notify the creating guard. */
export async function updateVisitorStatus(params: {
  visitorId: string;
  flatId: string;
  status: 'approved' | 'rejected';
  createdBy?: string | null;
  visitorName?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('visitors')
    .update({ status: params.status })
    .eq('id', params.visitorId)
    .eq('flat_id', params.flatId);

  if (error) {
    return { error: error.message };
  }

  void notifyGuardOfVisitorDecision({
    createdBy: params.createdBy ?? null,
    visitorName: params.visitorName ?? 'Visitor',
    status: params.status,
  });

  return { error: null };
}
