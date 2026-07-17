/**
 * Canonical Design System export — single import for all new components.
 * Usage: import { DS } from '@/constants/design-tokens';
 */
import { Brand, Elevation, FontFamily, Pastels, Radii, RoleTints, Spacing, TypeScale } from '@/constants/theme';

export const DS = {
  color: {
    primary: Brand.primary,
    primaryDark: Brand.primaryDark,
    primarySoft: Brand.primarySoft,
    primaryMid: Brand.primaryMid,
    accent: Brand.accent,
    accentDark: Brand.accentDark,
    accentSoft: Brand.accentSoft,
    charcoal: Brand.charcoal,
    surface: Brand.surface,
    card: Brand.card,
    border: Brand.border,
    ink: Brand.ink,
    inkSoft: Brand.inkSoft,
    inkMuted: Brand.inkMuted,
    pastel: Pastels,
    role: RoleTints,
  },
  type: TypeScale,
  space: Spacing,
  radius: Radii,
  elevation: Elevation,
  font: FontFamily,
} as const;

export type { ThemePalette } from '@/constants/theme';
