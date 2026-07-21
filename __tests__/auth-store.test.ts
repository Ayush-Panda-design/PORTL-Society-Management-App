import type { User } from '@supabase/supabase-js';

import type { Profile } from '@/types/database';
import {
  isEmailVerified,
  isMembershipActive,
  isMembershipPending,
  needsProfileCompletion,
  needsSocietyOnboarding,
} from '@/stores/authStore';

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-1',
    role: 'resident',
    full_name: 'Test User',
    avatar_url: 'https://example.com/photo.jpg',
    society_id: 'soc-1',
    flat_id: 'flat-1',
    status: 'active',
    bio: null,
    phone: null,
    push_token: null,
    created_at: '',
    ...overrides,
  };
}

function user(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '',
    ...overrides,
  } as User;
}

describe('authStore routing helpers', () => {
  it('needsSocietyOnboarding when missing society or rejected', () => {
    expect(needsSocietyOnboarding(null)).toBe(false);
    expect(needsSocietyOnboarding(profile({ society_id: null }))).toBe(true);
    expect(needsSocietyOnboarding(profile({ status: 'rejected' }))).toBe(true);
    expect(needsSocietyOnboarding(profile())).toBe(false);
  });

  it('needsProfileCompletion when name or photo missing', () => {
    expect(needsProfileCompletion(null)).toBe(true);
    expect(needsProfileCompletion(profile({ full_name: '  ' }))).toBe(true);
    expect(needsProfileCompletion(profile({ avatar_url: null }))).toBe(true);
    expect(needsProfileCompletion(profile())).toBe(false);
  });

  it('isEmailVerified respects email_confirmed_at', () => {
    expect(isEmailVerified(null)).toBe(false);
    expect(isEmailVerified(user())).toBe(false);
    expect(isEmailVerified(user({ email_confirmed_at: '2026-01-01T00:00:00Z' }))).toBe(true);
  });

  it('membership pending vs active', () => {
    expect(isMembershipPending(profile({ status: 'pending' }))).toBe(true);
    expect(isMembershipPending(profile({ society_id: null, status: 'pending' }))).toBe(false);
    expect(isMembershipActive(profile())).toBe(true);
    expect(isMembershipActive(profile({ status: 'pending' }))).toBe(false);
  });
});
