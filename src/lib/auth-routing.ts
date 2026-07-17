import type { Href } from 'expo-router';

import type { Profile, UserRole } from '@/types/database';
import {
  isMembershipActive,
  isMembershipPending,
  needsSocietyOnboarding,
} from '@/stores/authStore';

export function roleHome(role: UserRole | null): Href {
  switch (role) {
    case 'resident':
      return '/(resident)';
    case 'guard':
      return '/(guard)';
    case 'admin':
      return '/(admin)';
    default:
      return '/(auth)/login';
  }
}

/** Where a signed-in user should land based on membership. */
export function destinationForProfile(profile: Profile | null): Href {
  if (!profile) return '/(auth)/login';
  if (needsSocietyOnboarding(profile)) return '/(onboarding)' as Href;
  if (isMembershipPending(profile)) return '/(onboarding)/pending' as Href;
  if (isMembershipActive(profile)) return roleHome(profile.role);
  return '/(onboarding)' as Href;
}
