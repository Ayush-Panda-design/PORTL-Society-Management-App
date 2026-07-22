import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appStorage } from '@/lib/app-storage';

/** Instagram / WhatsApp / iOS-style appearance preference. */
export type ThemeMode = 'light' | 'dark';

function coerceThemeMode(raw: unknown): ThemeMode {
  return raw === 'dark' ? 'dark' : 'light';
}

type ThemeState = {
  mode: ThemeMode;
  /** False until persisted preference has been rehydrated from storage. */
  hasHydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  setHasHydrated: (value: boolean) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      hasHydrated: false,
      setMode: (mode) => set({ mode }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'portl-theme',
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({ mode: state.mode }),
      migrate: (persisted) => {
        const row = persisted as { mode?: unknown } | undefined;
        return { mode: coerceThemeMode(row?.mode) };
      },
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) {
          const coerced = coerceThemeMode(state.mode);
          if (coerced !== state.mode) {
            state.setMode(coerced);
          }
          state.setHasHydrated(true);
        }
      },
    },
  ),
);
