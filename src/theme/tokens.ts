/**
 * Design tokens — white + red Portl brand (Phase 0 facade).
 * Prefer getTokens(scheme) for theme-aware chrome (tabs, sheets).
 *
 * import { Tokens, getTokens } from '@/theme/tokens';
 */

import { Brand, Palette } from '@/constants/theme';

const light = {
  color: {
    primary: Brand.primary,
    primaryDark: Brand.primaryDark,
    primaryContainer: Brand.primarySoft,
    accentGuard: Brand.primaryMid,
    accentGuardDark: Brand.primary,
    danger: Brand.primary,
    warning: '#F59E0B',
    success: '#16A34A',
    background: Palette.light.surface,
    surface: Palette.light.card,
    textPrimary: Palette.light.ink,
    textSecondary: Palette.light.inkMuted,
    textMuted: Palette.light.inkFaint,
    border: Palette.light.border,
  },
  elevation: {
    level1: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    level2: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    level3: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.14,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
    },
  },
} as const;

const dark = {
  color: {
    primary: Brand.primary,
    primaryDark: Brand.primaryOnDark,
    primaryContainer: Palette.dark.primarySoft,
    accentGuard: Brand.primaryOnDark,
    accentGuardDark: Brand.primary,
    danger: Brand.primaryOnDark,
    warning: '#FBBF24',
    success: '#4ADE80',
    background: Palette.dark.surface,
    surface: Palette.dark.card,
    textPrimary: Palette.dark.ink,
    textSecondary: Palette.dark.inkMuted,
    textMuted: Palette.dark.inkFaint,
    border: Palette.dark.border,
  },
  elevation: {
    // WhatsApp black: soft lift + hairline feel
    level1: {
      shadowColor: '#000000',
      shadowOpacity: 0.28,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    level2: {
      shadowColor: '#000000',
      shadowOpacity: 0.36,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    level3: {
      shadowColor: '#000000',
      shadowOpacity: 0.44,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
  },
} as const;

const shared = {
  typography: {
    display: { fontSize: 28, fontFamily: 'Manrope_700Bold', fontWeight: 'bold' as const },
    h1: { fontSize: 24, fontFamily: 'Manrope_700Bold', fontWeight: 'bold' as const },
    h2: { fontSize: 20, fontFamily: 'Manrope_600SemiBold', fontWeight: '600' as const },
    h3: { fontSize: 17, fontFamily: 'Manrope_600SemiBold', fontWeight: '600' as const },
    body: { fontSize: 15, fontFamily: 'Inter_400Regular', fontWeight: 'normal' as const },
    bodyMedium: { fontSize: 15, fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
    caption: { fontSize: 13, fontFamily: 'Inter_400Regular', fontWeight: 'normal' as const },
    label: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      fontWeight: '500' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    input: 12,
    card: 20,
    pill: 999,
  },
} as const;

/** Default light tokens (legacy static import). Prefer getTokens(scheme). */
export const Tokens = {
  color: light.color,
  typography: shared.typography,
  spacing: shared.spacing,
  radius: shared.radius,
  elevation: light.elevation,
} as const;

export function getTokens(scheme: 'light' | 'dark') {
  const mode = scheme === 'dark' ? dark : light;
  return {
    color: mode.color,
    typography: shared.typography,
    spacing: shared.spacing,
    radius: shared.radius,
    elevation: mode.elevation,
  };
}
