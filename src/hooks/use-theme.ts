/**
 * Resolved appearance for the app (honors Light / Dark preference).
 * Prefer this over React Native's raw useColorScheme for UI that must match the toggle.
 */

import { Brand, Colors, getPalette, getPastels, getStatusColors, type ThemePalette } from '@/constants/theme';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';

export function useTheme() {
  const scheme = useResolvedColorScheme();
  return Colors[scheme];
}

export function useThemePalette(): ThemePalette & {
  scheme: 'light' | 'dark';
  isDark: boolean;
  pastels: ReturnType<typeof getPastels>;
  primaryAccent: string;
} {
  const scheme = useResolvedColorScheme();
  const palette = getPalette(scheme);
  return {
    ...palette,
    scheme,
    isDark: scheme === 'dark',
    pastels: getPastels(scheme),
    primaryAccent: scheme === 'dark' ? Brand.primaryOnDark : Brand.primary,
  };
}

export function useStatusTheme() {
  const scheme = useResolvedColorScheme();
  return getStatusColors(scheme);
}
