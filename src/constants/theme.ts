/**
 * Portl brand tokens — source of truth for colors, gradients, and type.
 * Prefer these (or Tailwind brand-* classes) over hardcoded teal/slate hex values.
 */

import '@/global.css';

import { Platform } from 'react-native';

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

/** Soft header / hero washes (use with expo-linear-gradient). */
export const Gradients = {
  hero: ['#0F766E', '#134E4A'] as const,
  heroWarm: ['#0F766E', '#0D9488', '#D97706'] as const,
  header: ['#F0FDFA', '#F7FAFC'] as const,
  cardAccent: ['#FFFFFF', '#F0FDFA'] as const,
  auth: ['#042F2E', '#0F766E', '#14B8A6'] as const,
} as const;

export const Colors = {
  light: {
    text: Brand.ink,
    background: Brand.surface,
    backgroundElement: Brand.card,
    backgroundSelected: Brand.primarySoft,
    textSecondary: Brand.inkMuted,
    tint: Brand.primary,
  },
  dark: {
    text: '#F8FAFC',
    background: '#0B1220',
    backgroundElement: '#152033',
    backgroundSelected: '#1E293B',
    textSecondary: '#94A3B8',
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
