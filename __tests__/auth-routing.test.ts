import type { User } from '@supabase/supabase-js';

import { destinationForProfile, platformHome, roleHome } from '@/lib/auth-routing';
import type { Profile } from '@/types/database';

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
    email_confirmed_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as User;
}

describe('roleHome', () => {
  it('routes each role to its shell', () => {
    expect(roleHome('resident')).toBe('/(resident)');
    expect(roleHome('guard')).toBe('/(guard)');
    expect(roleHome('admin')).toBe('/(admin)');
    expect(roleHome(null)).toBe('/(auth)/welcome');
  });
});

describe('platformHome', () => {
  it('routes to the platform console', () => {
    expect(platformHome()).toBe('/(platform)');
  });
});

describe('destinationForProfile', () => {
  it('sends missing profile to login', () => {
    expect(destinationForProfile(null, user())).toBe('/(auth)/login');
  });

  it('requires email verification before onboarding', () => {
    expect(
      destinationForProfile(profile(), user({ email_confirmed_at: undefined })),
    ).toBe('/(auth)/verify-email');
  });

  it('requires name and photo before society join', () => {
    expect(
      destinationForProfile(profile({ full_name: '', avatar_url: null }), user()),
    ).toBe('/(onboarding)/complete-profile');
  });

  it('routes platform operators to the platform console before society onboarding', () => {
    expect(
      destinationForProfile(profile({ society_id: null }), user(), true),
    ).toBe('/(platform)');
  });

  it('routes rejected / no-society users to onboarding', () => {
    expect(destinationForProfile(profile({ society_id: null }), user())).toBe('/(onboarding)');
    expect(destinationForProfile(profile({ status: 'rejected' }), user())).toBe('/(onboarding)');
  });

  it('holds pending members on the pending screen', () => {
    expect(destinationForProfile(profile({ status: 'pending' }), user())).toBe(
      '/(onboarding)/pending',
    );
  });

  it('lands active members on their role home', () => {
    expect(destinationForProfile(profile({ role: 'admin' }), user())).toBe('/(admin)');
    expect(destinationForProfile(profile({ role: 'guard' }), user())).toBe('/(guard)');
    expect(destinationForProfile(profile({ role: 'resident' }), user())).toBe('/(resident)');
  });

  it('prefers platform console over society role home', () => {
    expect(destinationForProfile(profile({ role: 'admin' }), user(), true)).toBe('/(platform)');
  });
});
