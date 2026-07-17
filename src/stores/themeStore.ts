import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

/** Instagram / WhatsApp / iOS-style appearance preference. */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Uses expo-secure-store (already in the native binary) instead of AsyncStorage,
 * so theme prefs work in the current Expo dev client without a rebuild.
 */
const themeStorage: StateStorage = {
  getItem: (key) => {
    if (Platform.OS === 'web') {
      try {
        return Promise.resolve(localStorage.getItem(key));
      } catch {
        return Promise.resolve(null);
      }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key, value) => {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch {
        // ignore quota / private mode
      }
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key) => {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

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
      mode: 'system',
      hasHydrated: false,
      setMode: (mode) => set({ mode }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'portl-theme',
      storage: createJSONStorage(() => themeStorage),
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
