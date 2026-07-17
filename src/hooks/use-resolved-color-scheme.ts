import { useColorScheme as useSystemColorScheme, type ColorSchemeName } from 'react-native';

import { useThemeStore, type ThemeMode } from '@/stores/themeStore';

export function resolveColorScheme(
  mode: ThemeMode,
  system: ColorSchemeName | null | undefined,
): 'light' | 'dark' {
  if (mode === 'system') {
    return system === 'dark' ? 'dark' : 'light';
  }
  return mode;
}

/** Effective light/dark after applying the user's Light / Dark / System preference. */
export function useResolvedColorScheme(): 'light' | 'dark' {
  const mode = useThemeStore((s) => s.mode);
  const systemScheme = useSystemColorScheme();
  return resolveColorScheme(mode, systemScheme);
}
