import type { Href } from 'expo-router';
import type { User } from '@supabase/supabase-js';

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
      return '/(resident)';
    case 'guard':
      return '/(guard)';
    case 'admin':
      return '/(admin)';
    default:
      return '/(auth)/welcome';
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
  if (!profile) return '/(auth)/login';

  if (user && !isEmailVerified(user)) {
    return '/(auth)/verify-email' as Href;
  }

  if (needsProfileCompletion(profile)) {
    return '/(onboarding)/complete-profile' as Href;
  }

  if (needsSocietyOnboarding(profile)) return '/(onboarding)' as Href;
  if (isMembershipPending(profile)) return '/(onboarding)/pending' as Href;
  if (isMembershipActive(profile)) return roleHome(profile.role);
  return '/(onboarding)' as Href;
}
