import { flatTowerName, formatDateTime } from '@/lib/visitors';
import type { ComplaintStatus, Poll, PollVote, PollVoteWithProfile } from '@/types/database';

export function parseJsonStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function isPollExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export function pollStats(poll: Poll, votes: PollVote[]) {
  const pollVotes = votes.filter((v) => v.poll_id === poll.id);
  const total = pollVotes.length;
  const counts: Record<string, number> = {};
  for (const opt of poll.options) counts[opt] = 0;
  for (const v of pollVotes) {
    counts[v.option] = (counts[v.option] ?? 0) + 1;
  }
  return { total, counts, pollVotes };
}

export function pollRespondentLabel(vote: PollVoteWithProfile): string {
  const name = vote.profile?.full_name?.trim() || 'Unnamed resident';
  const flats = vote.profile?.flats;
  if (!flats) return `${name} · No flat assigned`;
  const tower = flatTowerName(flats.towers);
  const flat = `Flat ${flats.number}`;
  return tower ? `${name} · ${tower} · ${flat}` : `${name} · ${flat}`;
}

export function formatNoticeDate(iso: string): string {
  return formatDateTime(iso);
}

export function complaintStatusTone(status: ComplaintStatus): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (status) {
    case 'open':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        label: 'Open',
      };
    case 'in_progress':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-200',
        label: 'In progress',
      };
    case 'resolved':
      return {
        bg: 'bg-brand-50',
        text: 'text-brand-800',
        border: 'border-brand-200',
        label: 'Resolved',
      };
    default:
      return {
        bg: 'bg-slate-50',
        text: 'text-slate-700',
        border: 'border-slate-200',
        label: status,
      };
  }
}

export function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
