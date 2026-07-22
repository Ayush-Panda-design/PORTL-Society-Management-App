import { useThemeStore, type ThemeMode } from '@/stores/themeStore';

/** Maps stored preference (and legacy `system`) to effective light/dark. */
export function resolveColorScheme(mode: ThemeMode | 'system' | string): 'light' | 'dark' {
  if (mode === 'dark') return 'dark';
  return 'light';
}

/** Effective light/dark from the user's Light / Dark preference. */
export function useResolvedColorScheme(): 'light' | 'dark' {
  const mode = useThemeStore((s) => s.mode);
  return resolveColorScheme(mode);
}
