/**
 * Portl brand tokens — deep forest green primary, terracotta accent.
 * Brand spec: primary #1F4B3F, accent #E4823D, off-white #FAF9F6 / near-black #101512.
 * Type scale: 32 / 24 / 16 / 13px · 4 levels.
 * Elevation: shadow-only cards, no hairline borders.
 * Icon stroke: 1.5px throughout (Lucide).
 */

import '@/global.css';

import { Platform } from 'react-native';

// ─── Brand ─────────────────────────────────────────────────────────────────
/** Static brand accents — deep forest green primary, terracotta accent. */
export const Brand = {
  // Primary — deep forest green
  primary: '#2D6A4F',
  primaryDark: '#1B4332',
  primarySoft: '#D8F3DC', // Maps to primaryContainer
  primaryMid: '#2E6B5B',

  // Accent — terracotta (CTAs & alerts)
  accent: '#EA580C', // Maps to accentGuard
  accentDark: '#C2410C', // Maps to accentGuardDark
  accentSoft: '#FDEBD8',

  // Neutrals
  charcoal: '#1E2322',
  charcoalSoft: '#2E3532',
  surface: '#FAF7F2', // Maps to background
  card: '#FFFFFF', // Maps to surface
  border: '#E5E7EB', // Maps to border
  ink: '#1A1A1A', // Maps to textPrimary
  inkSoft: '#6B7280', // Maps to textSecondary
  inkMuted: '#9CA3AF', // Maps to textMuted
} as const;

// Per-role identity tints (used in tab bar active color)
export const RoleTints = {
  resident: '#1F4B3F', // forest green
  admin: '#1F3A6B',    // deep blue — authority/trust
  guard: '#8B4513',    // dark amber/sienna — alertness
} as const;

// ─── Pastels ────────────────────────────────────────────────────────────────
/** Soft pastel washes for category / stat cards. */
export const Pastels = {
  mint: '#E3F0EC',
  peach: '#FDEBD8',
  sky: '#DDE8F4',
  rose: '#F8E4E4',
  butter: '#F9F0DC',
  lilac: '#EBE4F6',
  sage: '#E0EDEA',
  coral: '#FAE4DC',
} as const;

// ─── Type Scale ─────────────────────────────────────────────────────────────
/** 4-level type scale (px) per design spec. */
export const TypeScale = {
  display: 28,
  heading: 24, // h1
  h2: 20,
  h3: 17,
  body: 15,
  caption: 13,
  label: 12,
} as const;

// ─── Elevation ──────────────────────────────────────────────────────────────
/** Shadow-only elevation system — no hairline borders on cards. */
export const Elevation = {
  sm: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  // Dark-mode variants (stronger shadow for contrast on dark bg)
  smDark: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 2,
  },
  mdDark: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 4,
  },
  lgDark: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

// ─── Palette (semantic, theme-aware) ────────────────────────────────────────
/** Semantic surfaces / text that flip with appearance. */
export type ThemePalette = {
  surface: string;
  card: string;
  muted: string;
  border: string;
  ink: string;
  inkSoft: string;
  inkMuted: string;
  inkFaint: string;
  brandSoft: string;
  brandSoftBg: string;
  accentSoft: string;
  segmentTrack: string;
  shadow: string;
  primarySoft: string;
  primarySoftText: string;
  charcoal: string;
  isDark?: boolean;
};

export const Palette = {
  light: {
    surface: '#FAF9F6',
    card: '#FFFFFF',
    muted: '#EFF2F0',
    border: '#E5E8E4',
    ink: '#101512',
    inkSoft: '#374140',
    inkMuted: '#6B7A77',
    inkFaint: '#9EAAA7',
    brandSoft: '#C8DDD8',
    brandSoftBg: '#E3F0EC',
    accentSoft: '#FDEBD8',
    segmentTrack: '#E5E8E4',
    shadow: '#101512',
    primarySoft: '#C8DDD8',
    primarySoftText: '#1F4B3F',
    charcoal: '#1E2322',
  },
  dark: {
    surface: '#101512',
    card: '#181C1A',
    muted: '#1E2421',
    border: '#272E2B',
    ink: '#F0F4F2',
    inkSoft: '#D4DDD9',
    inkMuted: '#8A9C97',
    inkFaint: '#5E706B',
    brandSoft: '#1A342C',
    brandSoftBg: '#122920',
    accentSoft: '#3A2318',
    segmentTrack: '#222925',
    shadow: '#000000',
    primarySoft: '#1A342C',
    primarySoftText: '#7ABFAC',
    charcoal: '#E8EFEC',
  },
} as const satisfies Record<'light' | 'dark', ThemePalette>;

/** CSS variables applied at the root via NativeWind `vars()` — remaps Tailwind tokens live. */
export const themeCssVars = {
  light: {
    '--color-surface': Palette.light.surface,
    '--color-surface-card': Palette.light.card,
    '--color-surface-muted': Palette.light.muted,
    '--color-surface-border': Palette.light.border,
    '--color-ink': Palette.light.ink,
    '--color-ink-soft': Palette.light.inkSoft,
    '--color-ink-muted': Palette.light.inkMuted,
    '--color-ink-faint': Palette.light.inkFaint,
    '--color-brand-soft-bg': Palette.light.brandSoftBg,
    '--color-brand-soft': Palette.light.brandSoft,
    '--color-accent-soft': Palette.light.accentSoft,
    '--color-status-approved-soft': '#E3F0EC',
    '--color-status-pending-soft': '#F9F0DC',
    '--color-status-rejected-soft': '#F8E4E4',
    '--color-status-info-soft': '#DDE8F4',
    '--color-segment-track': Palette.light.segmentTrack,
    '--color-charcoal': Palette.light.charcoal,
  },
  dark: {
    '--color-surface': Palette.dark.surface,
    '--color-surface-card': Palette.dark.card,
    '--color-surface-muted': Palette.dark.muted,
    '--color-surface-border': Palette.dark.border,
    '--color-ink': Palette.dark.ink,
    '--color-ink-soft': Palette.dark.inkSoft,
    '--color-ink-muted': Palette.dark.inkMuted,
    '--color-ink-faint': Palette.dark.inkFaint,
    '--color-brand-soft-bg': Palette.dark.brandSoftBg,
    '--color-brand-soft': Palette.dark.brandSoft,
    '--color-accent-soft': Palette.dark.accentSoft,
    '--color-status-approved-soft': '#0A2E1E',
    '--color-status-pending-soft': '#3A2A08',
    '--color-status-rejected-soft': '#3A1010',
    '--color-status-info-soft': '#0A1E3A',
    '--color-segment-track': Palette.dark.segmentTrack,
    '--color-charcoal': Palette.dark.charcoal,
  },
} as const;

export function getPalette(scheme: 'light' | 'dark'): ThemePalette {
  return Palette[scheme];
}

// ─── Status Colors ───────────────────────────────────────────────────────────
export const StatusColors = {
  approved: { solid: '#16A34A', soft: '#E3F0EC', text: '#163830' }, // success
  pending: { solid: '#F59E0B', soft: '#F9F0DC', text: '#92600E' }, // warning
  rejected: { solid: '#DC2626', soft: '#F8E4E4', text: '#8B1A1A' }, // danger
  info: { solid: '#2563EB', soft: '#DDE8F4', text: '#1E3A8A' },
  entry: { solid: '#16A34A', soft: '#E3F0EC', text: '#163830' }, // success
  exit: { solid: '#DC2626', soft: '#F8E4E4', text: '#8B1A1A' }, // danger
  checked_in: { solid: '#2563EB', soft: '#DDE8F4', text: '#1E3A8A' },
  checked_out: { solid: '#6B7A77', soft: '#EFF2F0', text: '#374140' },
  open: { solid: '#F59E0B', soft: '#F9F0DC', text: '#92600E' }, // warning
  in_progress: { solid: '#2563EB', soft: '#DDE8F4', text: '#1E3A8A' },
  resolved: { solid: '#16A34A', soft: '#E3F0EC', text: '#163830' }, // success
} as const;

export const StatusColorsDark = {
  approved: { solid: '#7ABFAC', soft: '#0A2E1E', text: '#A5D5C8' },
  pending: { solid: '#FBBF24', soft: '#3A2A08', text: '#FCD34D' },
  rejected: { solid: '#F87171', soft: '#3A1010', text: '#FCA5A5' },
  info: { solid: '#60A5FA', soft: '#0A1E3A', text: '#93C5FD' },
  entry: { solid: '#7ABFAC', soft: '#0A2E1E', text: '#A5D5C8' },
  exit: { solid: '#F87171', soft: '#3A1010', text: '#FCA5A5' },
  checked_in: { solid: '#60A5FA', soft: '#0A1E3A', text: '#93C5FD' },
  checked_out: { solid: '#8A9C97', soft: '#1E2421', text: '#D4DDD9' },
  open: { solid: '#FBBF24', soft: '#3A2A08', text: '#FCD34D' },
  in_progress: { solid: '#60A5FA', soft: '#0A1E3A', text: '#93C5FD' },
  resolved: { solid: '#7ABFAC', soft: '#0A2E1E', text: '#A5D5C8' },
} as const;

export function getStatusColors(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? StatusColorsDark : StatusColors;
}

// ─── Gradients ───────────────────────────────────────────────────────────────
/** Header / hero gradients (use with expo-linear-gradient). */
export const Gradients = {
  // Resident hero — deep forest green
  hero: ['#2E6B5B', '#1F4B3F'] as const,
  heroSoft: ['#E3F0EC', '#C8DDD8'] as const,
  heroWarm: ['#1F4B3F', '#2E6B5B', '#E4823D'] as const,
  // Admin hero — deep blue-green
  adminHero: ['#1F3A6B', '#14285A'] as const,
  // Guard hero — dark amber
  guardHero: ['#8B4513', '#6B3010'] as const,
  header: ['#F0F4F2', '#FAF9F6'] as const,
  headerDark: ['#141A17', '#101512'] as const,
  cardAccent: ['#FFFFFF', '#F0F4F2'] as const,
  cardAccentDark: ['#181C1A', '#141A17'] as const,
  auth: ['#163830', '#1F4B3F', '#2E6B5B'] as const,
  accentWarm: ['#E4823D', '#C46B2B'] as const,
} as const;

export function getHeaderGradient(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? Gradients.headerDark : Gradients.header;
}

// ─── Colors (legacy compat) ──────────────────────────────────────────────────
export const Colors = {
  light: {
    text: Palette.light.ink,
    background: Palette.light.surface,
    backgroundElement: Palette.light.card,
    backgroundSelected: Palette.light.primarySoft,
    textSecondary: Palette.light.inkMuted,
    tint: Brand.primary,
  },
  dark: {
    text: Palette.dark.ink,
    background: Palette.dark.surface,
    backgroundElement: Palette.dark.card,
    backgroundSelected: Palette.dark.primarySoft,
    textSecondary: Palette.dark.inkMuted,
    tint: Brand.primary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// ─── Typography ──────────────────────────────────────────────────────────────
export const FontFamily = {
  display: 'Inter_700Bold',
  heading: 'Inter_600SemiBold',
  medium: 'Inter_500Medium',
  body: 'Inter_400Regular',
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: FontFamily.body,
    serif: 'ui-serif',
    rounded: FontFamily.heading,
    mono: 'ui-monospace',
  },
  default: {
    sans: FontFamily.body,
    serif: 'serif',
    rounded: FontFamily.heading,
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-body)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-display)',
    mono: 'var(--font-mono)',
  },
});

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  // Keep legacy for now to avoid breaking existing UI
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// ─── Radii ───────────────────────────────────────────────────────────────────
/** Crisp-professional corner radii — 12px base per design spec. */
export const Radii = {
  input: 8,
  card: 12,
  pill: 999,
  // Keep legacy for now
  xs: 8,
  sm: 12,   // cards (spec: 12px)
  md: 16,   // panels
  lg: 20,   // hero cards
  xl: 28,   // modals / bottom-sheets
} as const;

// ─── Misc ────────────────────────────────────────────────────────────────────
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** Stock Unsplash images for amenity categories (stable source URLs). */
export const AmenityImages: Record<string, string> = {
  gym: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  pool: 'https://images.unsplash.com/photo-1576610616656-d3aa5d1f4534?w=800&q=80',
  clubhouse: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
  hall: 'https://images.unsplash.com/photo-1519167758481-83f15083b18e?w=800&q=80',
  garden: 'https://images.unsplash.com/photo-1558904541-ef1cb83a3c9b?w=800&q=80',
  default: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
};

export function amenityImageForName(name: string): string {
  const key = name.toLowerCase();
  if (key.includes('gym') || key.includes('fitness')) return AmenityImages.gym;
  if (key.includes('pool') || key.includes('swim')) return AmenityImages.pool;
  if (key.includes('club')) return AmenityImages.clubhouse;
  if (key.includes('hall') || key.includes('party') || key.includes('banquet')) {
    return AmenityImages.hall;
  }
  if (key.includes('garden') || key.includes('park')) return AmenityImages.garden;
  return AmenityImages.default;
}
