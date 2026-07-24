import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { clearPushToken, registerForPushNotifications } from '@/lib/push-notifications';
import { fetchIsPlatformAdmin } from '@/lib/platform-api';
import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import type {
  MembershipStatus,
  Profile,
  SocietyPermission,
  UserRole,
} from '@/types/database';

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  membershipStatus: MembershipStatus | null;
  permissions: SocietyPermission[];
  isPlatformAdmin: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  initialize: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<Profile | null>;
  signOut: () => Promise<void>;
};

async function loadPermissions(userId: string): Promise<SocietyPermission[]> {
  const { data, error } = await supabase
    .from('society_member_permissions')
    .select('permission')
    .eq('user_id', userId);
  if (error) {
    console.warn('Failed to fetch permissions:', error.message);
    return [];
  }
  return ((data ?? []) as { permission: SocietyPermission }[]).map((r) => r.permission);
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'resident' || value === 'guard' || value === 'admin';
}

function normalizeProfile(data: Profile): Profile {
  return {
    ...data,
    status: data.status ?? 'active',
  };
}

function syncPushToken(userId: string) {
  // Fire-and-forget — never block auth / navigation.
  void registerForPushNotifications(userId);
}

export function needsSocietyOnboarding(profile: Profile | null): boolean {
  if (!profile) return false;
  if (!profile.society_id) return true;
  if (profile.status === 'rejected') return true;
  return false;
}

/** Name + face photo required before society join / dashboard (guards match faces). */
export function needsProfileCompletion(profile: Profile | null): boolean {
  if (!profile) return true;
  const hasName = Boolean(profile.full_name?.trim());
  const hasPhoto = Boolean(profile.avatar_url?.trim());
  return !hasName || !hasPhoto;
}

export function isEmailVerified(user: User | null | undefined): boolean {
  if (!user) return false;
  // Confirmed accounts have email_confirmed_at; some local/dev projects skip confirm.
  return Boolean(user.email_confirmed_at);
}

export function isMembershipPending(profile: Profile | null): boolean {
  return Boolean(profile?.society_id && profile.status === 'pending');
}

export function isMembershipActive(profile: Profile | null): boolean {
  return Boolean(profile?.society_id && profile.status === 'active');
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  role: null,
  membershipStatus: null,
  permissions: [],
  isPlatformAdmin: false,
  isLoading: true,
  isInitialized: false,

  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null,
    });
  },

  setProfile: (profile) => {
    const normalized = profile ? normalizeProfile(profile) : null;
    set({
      profile: normalized,
      role: normalized?.role ?? null,
      membershipStatus: normalized?.status ?? null,
    });
  },

  fetchProfile: async (userId) => {
    const [{ data, error }, isPlatformAdmin, permissions] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      fetchIsPlatformAdmin(userId),
      loadPermissions(userId),
    ]);

    if (error) {
      console.warn('Failed to fetch profile:', error.message);
      set({
        profile: null,
        role: null,
        membershipStatus: null,
        permissions: [],
        isPlatformAdmin: false,
      });
      return null;
    }

    if (data) {
      const profile = normalizeProfile(data as Profile);
      set({
        profile,
        role: profile.role,
        membershipStatus: profile.status,
        permissions,
        isPlatformAdmin,
      });
      return profile;
    }

    // Profile missing (user signed up before trigger) — create one from auth metadata
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const metaRole = user?.user_metadata?.role;
    const role: UserRole =
      metaRole === 'guard' ? 'guard' : isUserRole(metaRole) && metaRole !== 'admin' ? metaRole : 'resident';
    const fullName =
      typeof user?.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : null;

    const { data: created, error: createError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        role,
        full_name: fullName,
        status: 'active',
      })
      .select('*')
      .maybeSingle();

    if (createError || !created) {
      console.warn('Failed to create profile:', createError?.message ?? 'unknown');
      set({
        profile: null,
        role: null,
        membershipStatus: null,
        permissions: [],
        isPlatformAdmin: false,
      });
      return null;
    }

    // Re-check after insert — bootstrap trigger may have granted platform admin.
    const platformAfterCreate = await fetchIsPlatformAdmin(userId);
    const profile = normalizeProfile(created as Profile);
    set({
      profile,
      role: profile.role,
      membershipStatus: profile.status,
      permissions: [],
      isPlatformAdmin: platformAfterCreate,
    });
    return profile;
  },

  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      set({
        session,
        user: session?.user ?? null,
      });

      if (session?.user) {
        await get().fetchProfile(session.user.id);
        syncPushToken(session.user.id);
      }

      supabase.auth.onAuthStateChange(async (event, nextSession) => {
        set({
          session: nextSession,
          user: nextSession?.user ?? null,
        });

        if (nextSession?.user) {
          await get().fetchProfile(nextSession.user.id);
          // Deduped in registerForPushNotifications — safe alongside getSession above.
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            syncPushToken(nextSession.user.id);
          }
        } else {
          queryClient.clear();
          set({
            profile: null,
            role: null,
            membershipStatus: null,
            permissions: [],
            isPlatformAdmin: false,
          });
        }
      });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  signOut: async () => {
    const userId = get().user?.id;
    // Never block sign-out on push cleanup (network / native can hang).
    if (userId) {
      void clearPushToken(userId).catch(() => undefined);
    }
    try {
      await supabase.auth.signOut();
    } finally {
      // Drop cached queries so the next account never sees prior user data
      // (e.g. "you voted" on polls from another resident in the same society).
      queryClient.clear();
      set({
        session: null,
        user: null,
        profile: null,
        role: null,
        membershipStatus: null,
        permissions: [],
        isPlatformAdmin: false,
        isLoading: false,
      });
    }
  },
}));
