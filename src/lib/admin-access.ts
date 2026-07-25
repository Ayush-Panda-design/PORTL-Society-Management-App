import type { Href } from 'expo-router';

import { href } from '@/lib/href';
import type { SocietyPermission, UserRole } from '@/types/database';

/** Full society admins bypass permission checks. */
export function isFullAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin';
}

export function isCommitteeMember(
  role: UserRole | null | undefined,
  permissions: readonly string[] | null | undefined,
): boolean {
  return role === 'resident' && (permissions?.length ?? 0) > 0;
}

/**
 * Required permissions for each admin tab/route name (Expo Router segment).
 * - `admin-only`: full admins only
 * - `any-committee`: any permission holder (or admin)
 * - permission list: need at least one
 */
export type AdminRouteAccess = 'admin-only' | 'any-committee' | SocietyPermission[];

export const ADMIN_ROUTE_ACCESS: Record<string, AdminRouteAccess> = {
  index: 'any-committee',
  settings: 'any-committee',
  profile: 'any-committee',
  'ask-portl': 'any-committee',

  notices: ['notices.manage'],
  polls: ['polls.manage'],
  complaints: ['complaints.manage'],
  amenities: ['amenities.manage'],
  payments: ['payments.manage', 'payments.view'],
  'payout-setup': ['payments.manage'],
  'join-requests': ['members.review'],
  flats: ['flats.manage'],
  partners: ['visitors.manage'],
  'escalated-visitors': ['visitors.manage'],
  'audit-log': ['audit.view'],

  // Society structure / identity — full admin only
  residents: 'admin-only',
  towers: 'admin-only',
  roles: 'admin-only',
  gates: 'admin-only',
  broadcasts: 'admin-only',
  staff: 'admin-only',
  invites: 'admin-only',
};

export function canAccessAdminRoute(
  routeName: string | undefined,
  role: UserRole | null | undefined,
  permissions: readonly string[] | null | undefined,
): boolean {
  if (isFullAdmin(role)) return true;
  if (!routeName) return isCommitteeMember(role, permissions);

  const access = ADMIN_ROUTE_ACCESS[routeName] ?? 'admin-only';
  if (access === 'admin-only') return false;
  if (access === 'any-committee') return isCommitteeMember(role, permissions);
  if (!permissions?.length) return false;
  return access.some((p) => permissions.includes(p));
}

/** First useful destination for a committee member (or admin home). */
export function committeeHomeHref(permissions: readonly string[]): Href {
  const links = [
    { permission: 'visitors.manage', path: '/(admin)/escalated-visitors' },
    { permission: 'notices.manage', path: '/(admin)/notices' },
    { permission: 'complaints.manage', path: '/(admin)/complaints' },
    { permission: 'polls.manage', path: '/(admin)/polls' },
    { permission: 'payments.manage', path: '/(admin)/payments' },
    { permission: 'payments.view', path: '/(admin)/payments' },
    { permission: 'amenities.manage', path: '/(admin)/amenities' },
    { permission: 'members.review', path: '/(admin)/join-requests' },
    { permission: 'flats.manage', path: '/(admin)/flats' },
    { permission: 'audit.view', path: '/(admin)/audit-log' },
  ] as const;

  for (const link of links) {
    if (permissions.includes(link.permission)) return href(link.path);
  }
  return href('/(admin)/settings');
}

/** Map settings / drawer href paths to route names for access checks. */
export function adminRouteNameFromHref(path: string): string | undefined {
  const cleaned = path.replace(/^\/\(admin\)\/?/, '').replace(/^\//, '');
  const segment = cleaned.split('/')[0];
  if (!segment || segment === '(tabs)') return 'index';
  return segment;
}

export function filterLinksByAdminAccess<T extends { href: Href | string }>(
  links: T[],
  role: UserRole | null | undefined,
  permissions: readonly string[] | null | undefined,
): T[] {
  if (isFullAdmin(role)) return links;
  return links.filter((link) =>
    canAccessAdminRoute(adminRouteNameFromHref(String(link.href)), role, permissions),
  );
}
