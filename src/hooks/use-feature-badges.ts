import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { isPollExpired } from '@/lib/community';
import {
  fetchComplaintsForFlat,
  fetchComplaintsForSociety,
  fetchMyVotesForPolls,
  fetchNotices,
  fetchPolls,
} from '@/lib/community-api';
import { fetchMyPaymentStatement } from '@/lib/ops-api';
import { queryKeys } from '@/lib/query-client';
import { fetchPendingMembers } from '@/lib/society-api';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useReadStateStore } from '@/stores/readStateStore';
import { Tokens } from '@/theme/tokens';

export type FeatureBadges = {
  notices: number;
  visitors: number;
  complaints: number;
  helpdesk: number;
  joinRequests: number;
  polls: number;
  payments: number;
  /** Aggregate for More / Settings hub items that are not on the main tab bar. */
  more: number;
};

const EMPTY: FeatureBadges = {
  notices: 0,
  visitors: 0,
  complaints: 0,
  helpdesk: 0,
  joinRequests: 0,
  polls: 0,
  payments: 0,
  more: 0,
};

const OPEN_TICKET = new Set(['open', 'in_progress', 'reopened']);

/** Value for React Navigation `tabBarBadge` (undefined when zero). */
export function formatTabBadge(count: number): number | string | undefined {
  if (count <= 0) return undefined;
  if (count > 99) return '99+';
  return count;
}

export const TAB_BADGE_STYLE = {
  backgroundColor: Tokens.color.danger,
  color: '#FFFFFF',
  fontSize: 10,
  fontWeight: '700' as const,
  minWidth: 16,
  height: 16,
  lineHeight: 15,
  borderRadius: 8,
};

async function countPendingVisitors(options: {
  societyId?: string | null;
  flatId?: string | null;
}): Promise<number> {
  let q = supabase.from('visitors').select('id', { count: 'exact', head: true }).eq('status', 'pending');
  if (options.flatId) q = q.eq('flat_id', options.flatId);
  else if (options.societyId) q = q.eq('society_id', options.societyId);
  else return 0;
  const { count, error } = await q;
  if (error) {
    console.warn('Pending visitors count failed:', error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Action / unread counts for notification-backed features.
 * Notices & admin complaints use local seen-state; others use live workflow counts.
 */
export function useFeatureBadges(): FeatureBadges {
  const role = useAuthStore((s) => s.role);
  const permissions = useAuthStore((s) => s.permissions);
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const flatId = useAuthStore((s) => s.profile?.flat_id);
  const userId = useAuthStore((s) => s.user?.id);
  const seenNotices = useReadStateStore((s) => s.seenNotices);
  const seenComplaints = useReadStateStore((s) => s.seenComplaints);

  const canManageNotices =
    role === 'admin' || (permissions ?? []).includes('notices.manage');
  const canManageComplaints =
    role === 'admin' || (permissions ?? []).includes('complaints.manage');
  const canReviewMembers =
    role === 'admin' || (permissions ?? []).includes('members.review');
  const canManageVisitors =
    role === 'admin' || (permissions ?? []).includes('visitors.manage');

  const noticesQuery = useQuery({
    queryKey: [...queryKeys.notices(societyId ?? 'none'), role === 'resident' && !canManageNotices ? 'published' : 'all'],
    queryFn: () =>
      fetchNotices(societyId!, {
        publishedOnly: role === 'resident' && !canManageNotices,
      }),
    enabled: Boolean(societyId) && (role === 'resident' || canManageNotices),
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
  });

  const residentVisitorsQuery = useQuery({
    queryKey: ['feature-badge', 'visitors-flat', flatId ?? 'none'],
    queryFn: () => countPendingVisitors({ flatId }),
    enabled: role === 'resident' && !canManageVisitors && Boolean(flatId),
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
  });

  const societyVisitorsQuery = useQuery({
    queryKey: ['feature-badge', 'visitors-society', societyId ?? 'none'],
    queryFn: () => countPendingVisitors({ societyId }),
    enabled: (role === 'guard' || role === 'admin' || canManageVisitors) && Boolean(societyId),
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
  });

  const escalatedQuery = useQuery({
    queryKey: ['feature-badge', 'escalated', societyId ?? 'none'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('visitors')
        .select('id', { count: 'exact', head: true })
        .eq('society_id', societyId!)
        .eq('status', 'pending')
        .or('is_missed.eq.true,escalation_level.gte.1');
      if (error) {
        console.warn('Escalated visitors count failed:', error.message);
        return 0;
      }
      return count ?? 0;
    },
    enabled: canManageVisitors && Boolean(societyId),
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
  });

  const adminComplaintsQuery = useQuery({
    queryKey: queryKeys.complaints(`society-${societyId ?? 'none'}`),
    queryFn: () => fetchComplaintsForSociety(),
    enabled: canManageComplaints && Boolean(societyId),
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
  });

  const helpdeskQuery = useQuery({
    queryKey: queryKeys.complaints(flatId ?? 'none'),
    queryFn: () => fetchComplaintsForFlat(flatId!),
    enabled: role === 'resident' && Boolean(flatId),
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
  });

  const joinQuery = useQuery({
    queryKey: queryKeys.pendingMembers(societyId ?? 'none'),
    queryFn: () => fetchPendingMembers(societyId!),
    enabled: canReviewMembers && Boolean(societyId),
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
  });

  const pollsQuery = useQuery({
    queryKey: queryKeys.polls(societyId ?? 'none'),
    queryFn: () => fetchPolls(societyId!),
    enabled: role === 'resident' && Boolean(societyId),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  const pollIds = useMemo(
    () => (pollsQuery.data ?? []).map((p) => p.id).sort(),
    [pollsQuery.data],
  );

  const myVotesQuery = useQuery({
    queryKey: queryKeys.myPollVotes(societyId ?? 'none', userId ?? 'none', pollIds),
    queryFn: () => fetchMyVotesForPolls(pollIds),
    enabled: role === 'resident' && Boolean(societyId && userId && pollIds.length > 0),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  const paymentsQuery = useQuery({
    queryKey: queryKeys.paymentStatement(userId ?? 'none'),
    queryFn: () => fetchMyPaymentStatement(),
    enabled: role === 'resident' && Boolean(userId),
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
  });

  return useMemo(() => {
    if (!role) return EMPTY;

    const notices = (noticesQuery.data ?? []).reduce(
      (n, notice) => n + (seenNotices[notice.id] ? 0 : 1),
      0,
    );

    const visitors =
      role === 'guard' || role === 'admin' || canManageVisitors
        ? (societyVisitorsQuery.data ?? 0)
        : (residentVisitorsQuery.data ?? 0);

    const complaints = (adminComplaintsQuery.data ?? []).reduce((n, c) => {
      if (c.status === 'resolved') return n;
      return n + (seenComplaints[c.id] ? 0 : 1);
    }, 0);

    const helpdesk = (helpdeskQuery.data ?? []).reduce(
      (n, c) => n + (OPEN_TICKET.has(c.status) ? 1 : 0),
      0,
    );

    const joinRequests = joinQuery.data?.length ?? 0;
    const escalated = escalatedQuery.data ?? 0;

    const voted = new Set((myVotesQuery.data ?? []).map((v) => v.poll_id));
    const polls = (pollsQuery.data ?? []).reduce((n, poll) => {
      if (isPollExpired(poll.expires_at)) return n;
      if (poll.results_published_at) return n;
      return n + (voted.has(poll.id) ? 0 : 1);
    }, 0);

    const payments = (paymentsQuery.data ?? []).reduce((n, row) => {
      const status = String(row.status);
      const due =
        status === 'pending_payment' ||
        status === 'partially_paid' ||
        (typeof row.outstanding_paise === 'number' && row.outstanding_paise > 0);
      return n + (due ? 1 : 0);
    }, 0);

    let more = 0;
    if (role === 'admin') more = joinRequests + complaints + escalated;
    else if (role === 'guard') more = visitors;
    else if (canManageComplaints || canReviewMembers || canManageVisitors) {
      more = joinRequests + complaints + escalated + polls + helpdesk + payments;
    } else if (role === 'resident') more = polls + helpdesk + payments;

    return {
      notices,
      visitors: canManageVisitors ? escalated || visitors : visitors,
      complaints,
      helpdesk,
      joinRequests,
      polls,
      payments,
      more,
    };
  }, [
    role,
    canManageComplaints,
    canReviewMembers,
    canManageVisitors,
    noticesQuery.data,
    seenNotices,
    residentVisitorsQuery.data,
    societyVisitorsQuery.data,
    escalatedQuery.data,
    adminComplaintsQuery.data,
    seenComplaints,
    helpdeskQuery.data,
    joinQuery.data,
    pollsQuery.data,
    myVotesQuery.data,
    paymentsQuery.data,
  ]);
}

/** Map a route href to the matching feature badge count. */
export function badgeForHref(href: string, badges: FeatureBadges): number {
  const path = href.toLowerCase();
  if (path.includes('/escalated') || path.includes('/partners')) return badges.visitors;
  if (path.includes('/notices')) return badges.notices;
  if (path.includes('/visitors') || path.includes('/dashboard')) return badges.visitors;
  if (path.includes('/complaints')) return badges.complaints;
  if (path.includes('/helpdesk')) return badges.helpdesk;
  if (path.includes('/join-requests')) return badges.joinRequests;
  if (path.includes('/polls')) return badges.polls;
  if (path.includes('/payments')) return badges.payments;
  return 0;
}

export function attachBadgesToSections<
  T extends { title: string; links: { href: unknown; title: string; subtitle: string; Icon: unknown }[] },
>(sections: T[], badges: FeatureBadges): (T & { links: (T['links'][number] & { badge?: number })[] })[] {
  return sections.map((section) => ({
    ...section,
    links: section.links.map((link) => ({
      ...link,
      badge: badgeForHref(String(link.href), badges) || undefined,
    })),
  }));
}
