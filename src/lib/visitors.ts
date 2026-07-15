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
} {
  switch (status) {
    case 'pending':
      return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' };
    case 'approved':
      return { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' };
    case 'rejected':
      return { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' };
    case 'checked_in':
      return { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' };
    case 'checked_out':
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
    default:
      return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
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
 * TODO: look up residents for this flat_id who have Expo push tokens stored,
 * then send a push via the Expo Push API when a visitor is registered/pending.
 */
export async function notifyResidentOfVisitor(params: {
  flatId: string;
  visitorName: string;
  visitorType: VisitorType;
  societyId: string;
}): Promise<void> {
  console.log('[TODO push] Notify resident of visitor', params);
}
