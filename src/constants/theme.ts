/**
 * Portl brand tokens — source of truth for colors, gradients, and type.
 * Prefer these (or Tailwind brand-* / surface / ink classes) over hardcoded hex.
 *
 * Dark palette follows Instagram / WhatsApp conventions:
 * near-black canvas, slightly elevated cards, soft muted borders, readable secondary text.
 */

import '@/global.css';

import { Platform } from 'react-native';

/** Static brand accents — stay teal in both modes (like WhatsApp green / IG blue). */
export const Brand = {
  primary: '#0F766E',
  primaryDark: '#115E59',
  primarySoft: '#CCFBF1',
  accent: '#D97706',
  accentSoft: '#FFF7ED',
  surface: '#F7FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  ink: '#0F172A',
  inkSoft: '#334155',
  inkMuted: '#64748B',
} as const;

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
};

export const Palette = {
  light: {
    surface: '#F7FAFC',
    card: '#FFFFFF',
    muted: '#EEF2F6',
    border: '#E2E8F0',
    ink: '#0F172A',
    inkSoft: '#334155',
    inkMuted: '#64748B',
    inkFaint: '#94A3B8',
    brandSoft: '#CCFBF1',
    brandSoftBg: '#F0FDFA',
    accentSoft: '#FFF7ED',
    segmentTrack: '#E8EDF2',
    shadow: '#0F172A',
    primarySoft: '#CCFBF1',
    primarySoftText: '#115E59',
  },
  dark: {
    // Instagram-like near-black canvas + WhatsApp-like elevated layers
    surface: '#0A0A0A',
    card: '#161616',
    muted: '#1C1C1E',
    border: '#2A2A2A',
    ink: '#F5F5F5',
    inkSoft: '#E5E5E5',
    inkMuted: '#A3A3A3',
    inkFaint: '#737373',
    brandSoft: '#134E4A',
    brandSoftBg: '#0D2F2C',
    accentSoft: '#3D2A12',
    segmentTrack: '#262626',
    shadow: '#000000',
    primarySoft: '#0F3D38',
    primarySoftText: '#5EEAD4',
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
    '--color-status-approved-soft': '#ECFDF5',
    '--color-status-pending-soft': '#FFFBEB',
    '--color-status-rejected-soft': '#FEF2F2',
    '--color-status-info-soft': '#EFF6FF',
    '--color-segment-track': Palette.light.segmentTrack,
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
    '--color-status-approved-soft': '#0A2E22',
    '--color-status-pending-soft': '#3D2A0A',
    '--color-status-rejected-soft': '#3D1212',
    '--color-status-info-soft': '#0A1E3D',
    '--color-segment-track': Palette.dark.segmentTrack,
  },
} as const;

export function getPalette(scheme: 'light' | 'dark'): ThemePalette {
  return Palette[scheme];
}

export const StatusColors = {
  approved: { solid: '#059669', soft: '#ECFDF5', text: '#065F46' },
  pending: { solid: '#D97706', soft: '#FFFBEB', text: '#92400E' },
  rejected: { solid: '#DC2626', soft: '#FEF2F2', text: '#991B1B' },
  info: { solid: '#2563EB', soft: '#EFF6FF', text: '#1E40AF' },
  entry: { solid: '#059669', soft: '#ECFDF5', text: '#065F46' },
  exit: { solid: '#DC2626', soft: '#FEF2F2', text: '#991B1B' },
  checked_in: { solid: '#2563EB', soft: '#EFF6FF', text: '#1E40AF' },
  checked_out: { solid: '#64748B', soft: '#F1F5F9', text: '#334155' },
  open: { solid: '#D97706', soft: '#FFFBEB', text: '#92400E' },
  in_progress: { solid: '#2563EB', soft: '#EFF6FF', text: '#1E40AF' },
  resolved: { solid: '#059669', soft: '#ECFDF5', text: '#065F46' },
} as const;

export const StatusColorsDark = {
  approved: { solid: '#34D399', soft: '#0A2E22', text: '#6EE7B7' },
  pending: { solid: '#FBBF24', soft: '#3D2A0A', text: '#FCD34D' },
  rejected: { solid: '#F87171', soft: '#3D1212', text: '#FCA5A5' },
  info: { solid: '#60A5FA', soft: '#0A1E3D', text: '#93C5FD' },
  entry: { solid: '#34D399', soft: '#0A2E22', text: '#6EE7B7' },
  exit: { solid: '#F87171', soft: '#3D1212', text: '#FCA5A5' },
  checked_in: { solid: '#60A5FA', soft: '#0A1E3D', text: '#93C5FD' },
  checked_out: { solid: '#94A3B8', soft: '#1C1C1E', text: '#CBD5E1' },
  open: { solid: '#FBBF24', soft: '#3D2A0A', text: '#FCD34D' },
  in_progress: { solid: '#60A5FA', soft: '#0A1E3D', text: '#93C5FD' },
  resolved: { solid: '#34D399', soft: '#0A2E22', text: '#6EE7B7' },
} as const;

export function getStatusColors(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? StatusColorsDark : StatusColors;
}

/** Soft header / hero washes (use with expo-linear-gradient). */
export const Gradients = {
  hero: ['#0F766E', '#134E4A'] as const,
  heroWarm: ['#0F766E', '#0D9488', '#D97706'] as const,
  header: ['#F0FDFA', '#F7FAFC'] as const,
  headerDark: ['#0D2F2C', '#0A0A0A'] as const,
  cardAccent: ['#FFFFFF', '#F0FDFA'] as const,
  cardAccentDark: ['#161616', '#0D2F2C'] as const,
  auth: ['#042F2E', '#0F766E', '#14B8A6'] as const,
} as const;

export function getHeaderGradient(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? Gradients.headerDark : Gradients.header;
}

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

export const FontFamily = {
  display: 'Manrope_700Bold',
  heading: 'Manrope_600SemiBold',
  medium: 'Manrope_500Medium',
  body: 'Manrope_400Regular',
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

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

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
