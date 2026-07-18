/**
 * README: How to consume this design tokens file
 * 
 * Usage:
 * This file acts as the single source of truth for the Portl visual overhaul (Phase 0).
 * Since the codebase currently uses direct imports from `@/constants/theme`, 
 * you can consume these new tokens via direct import:
 * 
 * import { Tokens } from '@/theme/tokens';
 * 
 * // Example:
 * <Text style={{ color: Tokens.color.textPrimary, ...Tokens.typography.body }}>Hello</Text>
 * 
 * Alternatively, these can be mapped into `tailwind.config.js` or a Context provider.
 * Existing theme files (like `src/constants/theme.ts`) will gradually be migrated to use this.
 */

export const Tokens = {
  color: {
    primary: '#2D6A4F',        // current brand green
    primaryDark: '#1B4332',    // for gradients/header depth
    primaryContainer: '#D8F3DC', // light green tint, selected/tonal states
    accentGuard: '#EA580C',    // guard app identity, orange
    accentGuardDark: '#C2410C',
    danger: '#DC2626',         // reserve for destructive confirm dialogs only
    warning: '#F59E0B',
    success: '#16A34A',        // distinct from primary green
    background: '#FAF7F2',     // current cream
    surface: '#FFFFFF',
    textPrimary: '#1A1A1A',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
  },
  typography: {
    display: { fontSize: 28, fontFamily: 'Manrope_700Bold', fontWeight: 'bold' as const },
    h1: { fontSize: 24, fontFamily: 'Manrope_700Bold', fontWeight: 'bold' as const },
    h2: { fontSize: 20, fontFamily: 'Manrope_600SemiBold', fontWeight: '600' as const },
    h3: { fontSize: 17, fontFamily: 'Manrope_600SemiBold', fontWeight: '600' as const },
    body: { fontSize: 15, fontFamily: 'Inter_400Regular', fontWeight: 'normal' as const },
    bodyMedium: { fontSize: 15, fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
    caption: { fontSize: 13, fontFamily: 'Inter_400Regular', fontWeight: 'normal' as const },
    label: { fontSize: 12, fontFamily: 'Inter_500Medium', fontWeight: '500' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
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
    input: 8,
    card: 12,
    pill: 999,
  },
  elevation: {
    level1: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    level2: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    level3: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  },
} as const;
