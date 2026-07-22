import type { Href } from 'expo-router';

import { href } from '@/lib/href';

type RoleGroup = '(resident)' | '(admin)' | '(guard)';

function isRoleGroup(segment: string | undefined): segment is RoleGroup {
  return segment === '(resident)' || segment === '(admin)' || segment === '(guard)';
}

/** Where to land when there is no stack/tab history (e.g. cold deep link). */
export function backFallbackForSegments(segments: readonly string[]): Href | null {
  const group = segments[0];
  if (!isRoleGroup(group)) return null;

  if (segments[1] === 'profile') {
    return href(`/${group}`);
  }

  if (segments[1] !== '(tabs)') return null;

  const tab = segments[2];
  if (!tab) return null;

  if (tab === 'polls' && segments[3]) {
    return href(`${group}/polls`);
  }

  const residentAux: Record<string, string> = {
    'pre-approve': '/(resident)/visitors',
    'visitor-history': '/(resident)/visitors',
    polls: '/(resident)/more',
    helpdesk: '/(resident)/more',
    amenities: '/(resident)/more',
    directory: '/(resident)/more',
  };

  const adminAux: Record<string, string> = {
    // Opened from dashboard (and More) — prefer home, not the More tab
    polls: '/(admin)',
    complaints: '/(admin)',
    amenities: '/(admin)',
    staff: '/(admin)',
    towers: '/(admin)',
    flats: '/(admin)',
    invites: '/(admin)',
    'join-requests': '/(admin)',
    'audit-log': '/(admin)/settings',
    roles: '/(admin)/settings',
    'payout-setup': '/(admin)/settings',
  };

  const guardAux: Record<string, string> = {
    'scan-pass': '/(guard)/verify',
    index: '/(guard)/dashboard',
  };

  if (group === '(resident)') {
    const path = residentAux[tab];
    return path ? href(path) : null;
  }
  if (group === '(admin)') {
    const path = adminAux[tab];
    return path ? href(path) : null;
  }
  const path = guardAux[tab];
  return path ? href(path) : null;
}
