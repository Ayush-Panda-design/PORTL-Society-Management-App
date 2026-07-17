/**
 * Resolved appearance for the app (honors Light / Dark / System preference).
 * Prefer this over React Native's raw useColorScheme for UI that must match the toggle.
 */

import { Colors, getPalette, getStatusColors, type ThemePalette } from '@/constants/theme';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';

export function useTheme() {
  const scheme = useResolvedColorScheme();
  return Colors[scheme];
}

export function useThemePalette(): ThemePalette & { scheme: 'light' | 'dark'; isDark: boolean } {
  const scheme = useResolvedColorScheme();
  return {
    ...getPalette(scheme),
    scheme,
    isDark: scheme === 'dark',
  };
}

export function useStatusTheme() {
  const scheme = useResolvedColorScheme();
  return getStatusColors(scheme);
}
