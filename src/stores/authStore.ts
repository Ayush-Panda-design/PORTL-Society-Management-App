import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types/database';

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  isInitialized: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  initialize: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<Profile | null>;
  signOut: () => Promise<void>;
};

function isUserRole(value: unknown): value is UserRole {
  return value === 'resident' || value === 'guard' || value === 'admin';
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  role: null,
  isLoading: true,
  isInitialized: false,

  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null,
    });
  },

  setProfile: (profile) => {
    set({
      profile,
      role: profile?.role ?? null,
    });
  },

  fetchProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Failed to fetch profile:', error.message);
      set({ profile: null, role: null });
      return null;
    }

    if (data) {
      const profile = data as Profile;
      set({ profile, role: profile.role });
      return profile;
    }

    // Profile missing (user signed up before trigger) — create one from auth metadata
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const metaRole = user?.user_metadata?.role;
    const role: UserRole = isUserRole(metaRole) ? metaRole : 'resident';
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
      })
      .select('*')
      .maybeSingle();

    if (createError || !created) {
      console.warn('Failed to create profile:', createError?.message ?? 'unknown');
      set({ profile: null, role: null });
      return null;
    }

    const profile = created as Profile;
    set({ profile, role: profile.role });
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
      }

      supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        set({
          session: nextSession,
          user: nextSession?.user ?? null,
        });

        if (nextSession?.user) {
          await get().fetchProfile(nextSession.user.id);
        } else {
          set({ profile: null, role: null });
        }
      });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      session: null,
      user: null,
      profile: null,
      role: null,
    });
  },
}));
