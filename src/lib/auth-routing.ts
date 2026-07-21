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

/**
 * Where a signed-in user should land.
 * Order: email verify → profile (name/photo) → society onboarding → pending → role home.
 */
export function destinationForProfile(
  profile: Profile | null,
  user?: User | null,
): Href {
  if (!profile) return href('/(auth)/login');

  if (user && !isEmailVerified(user)) {
    return href('/(auth)/verify-email');
  }

  if (needsProfileCompletion(profile)) {
    return href('/(onboarding)/complete-profile');
  }

  if (needsSocietyOnboarding(profile)) return href('/(onboarding)');
  if (isMembershipPending(profile)) return href('/(onboarding)/pending');
  if (isMembershipActive(profile)) return roleHome(profile.role);
  return href('/(onboarding)');
}
