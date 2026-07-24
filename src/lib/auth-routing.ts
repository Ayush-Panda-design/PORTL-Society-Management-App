import type { Href } from 'expo-router';
import type { User } from '@supabase/supabase-js';

import { href } from '@/lib/href';

import type { Profile, UserRole } from '@/types/database';
import {
  isEmailVerified,
  isMembershipActive,
  isMembershipPending,
  needsProfileCompletion,
  needsSocietyOnboarding,
} from '@/stores/authStore';

export function roleHome(role: UserRole | null): Href {
  switch (role) {
    case 'resident':
      return href('/(resident)');
    case 'guard':
      return href('/(guard)');
    case 'admin':
      return href('/(admin)');
    default:
      return href('/(auth)/welcome');
  }
}

export function platformHome(): Href {
  return href('/(platform)');
}

/**
 * Where a signed-in user should land.
 * Order: email verify → profile (name/photo) → platform console (if operator
 * without an active society membership) → society onboarding → pending → role home.
 *
 * Platform operators who also have an active society role can open society dashboards;
 * default home remains the platform console.
 */
export function destinationForProfile(
  profile: Profile | null,
  user?: User | null,
  isPlatformAdmin = false,
): Href {
  if (!profile) return href('/(auth)/login');

  if (user && !isEmailVerified(user)) {
    return href('/(auth)/verify-email');
  }

  if (needsProfileCompletion(profile)) {
    return href('/(onboarding)/complete-profile');
  }

  if (isPlatformAdmin && !isMembershipActive(profile)) {
    return platformHome();
  }

  if (needsSocietyOnboarding(profile)) return href('/(onboarding)');
  if (isMembershipPending(profile)) return href('/(onboarding)/pending');
  if (isMembershipActive(profile)) {
    if (isPlatformAdmin) return platformHome();
    return roleHome(profile.role);
  }
  return href('/(onboarding)');
}

/** Maps committee permissions to admin management routes. */
export function committeeManageLinks(
  permissions: string[],
): { href: Href; title: string; subtitle: string }[] {
  const links: { href: Href; title: string; subtitle: string; permission: string }[] = [
    {
      permission: 'visitors.manage',
      href: href('/(admin)/escalated-visitors'),
      title: 'Missed visitors',
      subtitle: 'Escalated gate requests needing attention',
    },
    {
      permission: 'notices.manage',
      href: href('/(admin)/notices'),
      title: 'Notices',
      subtitle: 'Publish and pin society notices',
    },
    {
      permission: 'polls.manage',
      href: href('/(admin)/polls'),
      title: 'Polls',
      subtitle: 'Create polls and publish results',
    },
    {
      permission: 'complaints.manage',
      href: href('/(admin)/complaints'),
      title: 'Complaints',
      subtitle: 'Triage helpdesk tickets',
    },
    {
      permission: 'amenities.manage',
      href: href('/(admin)/amenities'),
      title: 'Amenities',
      subtitle: 'Facilities and bookings',
    },
    {
      permission: 'payments.manage',
      href: href('/(admin)/payments'),
      title: 'Payments & dues',
      subtitle: 'Issue maintenance and fines',
    },
    {
      permission: 'payments.view',
      href: href('/(admin)/payments'),
      title: 'Payment ledger',
      subtitle: 'View society payment statement',
    },
    {
      permission: 'members.review',
      href: href('/(admin)/join-requests'),
      title: 'Join requests',
      subtitle: 'Approve new members',
    },
    {
      permission: 'flats.manage',
      href: href('/(admin)/flats'),
      title: 'Flats',
      subtitle: 'Map units to towers',
    },
    {
      permission: 'visitors.manage',
      href: href('/(admin)/partners'),
      title: 'Gate partners',
      subtitle: 'Delivery / cab / service whitelist',
    },
    {
      permission: 'audit.view',
      href: href('/(admin)/audit-log'),
      title: 'Audit log',
      subtitle: 'Who changed what',
    },
  ];

  const seen = new Set<string>();
  const out: { href: Href; title: string; subtitle: string }[] = [];
  for (const link of links) {
    if (!permissions.includes(link.permission)) continue;
    const key = String(link.href);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ href: link.href, title: link.title, subtitle: link.subtitle });
  }
  return out;
}
