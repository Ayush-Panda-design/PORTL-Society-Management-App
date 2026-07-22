/**
 * Portl brand tokens — white + red light mode; Airbnb-style comfort dark.
 * Light: Primary #E11D48 · soft rose washes · clean white surfaces.
 * Dark: Soft #222 canvas, gentle elevation, off-white ink (not pure white) —
 *        low-chroma washes, hairline borders — less eye strain.
 * Type scale: 28 / 24 / 16 / 13px · soft elevation · Lucide stroke 1.5.
 */

import '@/global.css';

import { Platform } from 'react-native';

// ─── Brand ─────────────────────────────────────────────────────────────────
/** Static brand accents — vivid rose-red primary on white. */
export const Brand = {
  // Primary — rose red (filled CTAs stay this hue in both modes)
  primary: '#E11D48',
  primaryDark: '#BE123C',
  primarySoft: '#FFE4E8',
  primaryMid: '#F43F5E',
  /** Soft Rausch-like rose for icons/text on dark (Airbnb-style, less bloom). */
  primaryOnDark: '#FF6B81',

  // Accent — deep charcoal for secondary CTAs / high-contrast actions
  accent: '#0F172A',
  accentDark: '#020617',
  accentSoft: '#F1F5F9',

  // Neutrals
  charcoal: '#0F172A',
  charcoalSoft: '#1E293B',
  surface: '#F7F7F8',
  card: '#FFFFFF',
  border: '#E8E8EA',
  ink: '#0F172A',
  inkSoft: '#334155',
  inkMuted: '#64748B',
} as const;

// Per-role identity tints (same family, slight depth shifts)
export const RoleTints = {
  resident: '#E11D48',
  admin: '#BE123C',
  guard: '#F43F5E',
} as const;

// ─── Pastels ────────────────────────────────────────────────────────────────
/** Soft pastel washes for category / stat cards — rose-led, with supporting tones. */
export const PastelsLight = {
  mint: '#E8F6EF',
  peach: '#FFE8EC',
  sky: '#E8F0FE',
  rose: '#FFE4E8',
  butter: '#FFF6E5',
  lilac: '#F3E8FF',
  sage: '#FFF1F3',
  coral: '#FFE0E4',
} as const;

/**
 * Dark washes — stay near muted luminance with a whisper of hue (Airbnb-like).
 * Avoid deep crushed colors that feel like black holes on the canvas.
 */
export const PastelsDark = {
  mint: '#2E3632',
  peach: '#3A3234',
  sky: '#30363C',
  rose: '#3A3034',
  butter: '#3A3630',
  lilac: '#343038',
  sage: '#343234',
  coral: '#3A3232',
} as const;

export type PastelTone = keyof typeof PastelsLight;

let pastelsScheme: 'light' | 'dark' = 'light';

/** Called by AppThemeProvider so `Pastels.*` resolves correctly at render time. */
export function setPastelsScheme(scheme: 'light' | 'dark') {
  pastelsScheme = scheme;
}

/** Active scheme synced by AppThemeProvider (for non-React helpers). */
export function getActiveColorScheme(): 'light' | 'dark' {
  return pastelsScheme;
}

export function getPastels(scheme: 'light' | 'dark' = pastelsScheme) {
  return scheme === 'dark' ? PastelsDark : PastelsLight;
}

/**
 * Theme-aware pastel washes. Prefer `getPastels(scheme)` when capturing values
 * into module-level constants (those freeze at import time).
 */
export const Pastels: typeof PastelsLight = new Proxy({} as typeof PastelsLight, {
  get(_target, prop: string | symbol) {
    if (typeof prop !== 'string') return undefined;
    return getPastels(pastelsScheme)[prop as PastelTone];
  },
  ownKeys() {
    return Reflect.ownKeys(PastelsLight);
  },
  getOwnPropertyDescriptor(_target, prop) {
    if (typeof prop !== 'string' || !(prop in PastelsLight)) return undefined;
    return {
      configurable: true,
      enumerable: true,
      value: getPastels(pastelsScheme)[prop as PastelTone],
    };
  },
}) as typeof PastelsLight;

// ─── Type Scale ─────────────────────────────────────────────────────────────
/** 4-level type scale (px) per design spec. */
export const TypeScale = {
  display: 28,
  heading: 24,
  h2: 20,
  h3: 17,
  body: 15,
  caption: 13,
  label: 12,
} as const;

// ─── Elevation ──────────────────────────────────────────────────────────────
/** Soft shadow-only elevation — premium card feel without hard borders. */
export const Elevation = {
  sm: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  md: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  lg: {
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
  /** Dark elevation is subtle — Airbnb separates layers with surface tone, not heavy shadows. */
  smDark: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 1,
  },
  mdDark: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 2,
  },
  lgDark: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 3,
  },
} as const;

// ─── Palette (semantic, theme-aware) ────────────────────────────────────────
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
    surface: '#F7F7F8',
    card: '#FFFFFF',
    muted: '#F0F0F2',
    border: '#E8E8EA',
    ink: '#0F172A',
    inkSoft: '#334155',
    inkMuted: '#64748B',
    inkFaint: '#94A3B8',
    brandSoft: '#FECDD3',
    brandSoftBg: '#FFF1F3',
    accentSoft: '#F1F5F9',
    segmentTrack: '#E8E8EA',
    shadow: '#0F172A',
    primarySoft: '#FECDD3',
    primarySoftText: '#BE123C',
    charcoal: '#0F172A',
  },
  /**
   * Airbnb-style comfort dark:
   * - Canvas ~#222 (not OLED black, not purple-grey)
   * - Cards only a step lighter — soft lift, not high-contrast slabs
   * - Primary ink soft off-white (#EBEBEB) to reduce glare vs pure #FFF
   * - Secondary ~#B0B0B0 (Hof Grey lineage) for calm hierarchy
   */
  dark: {
    surface: '#222222',
    card: '#2C2C2C',
    muted: '#333333',
    border: '#404040',
    ink: '#EBEBEB',
    inkSoft: '#D6D6D6',
    inkMuted: '#B0B0B0',
    inkFaint: '#8C8C8C',
    brandSoft: '#6B3A44',
    brandSoftBg: '#3A3034',
    accentSoft: '#383838',
    segmentTrack: '#383838',
    shadow: '#000000',
    primarySoft: '#4A3438',
    primarySoftText: '#FFB3BE',
    /** Keep charcoal dark — used as `bg-charcoal` CTA surfaces in both modes. */
    charcoal: '#0F172A',
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
    '--color-status-approved-soft': '#E8F6EF',
    '--color-status-pending-soft': '#FFF6E5',
    '--color-status-rejected-soft': '#FFE4E8',
    '--color-status-info-soft': '#E8F0FE',
    '--color-segment-track': Palette.light.segmentTrack,
    '--color-charcoal': Palette.light.charcoal,
    '--color-pastel-mint': PastelsLight.mint,
    '--color-pastel-peach': PastelsLight.peach,
    '--color-pastel-sky': PastelsLight.sky,
    '--color-pastel-rose': PastelsLight.rose,
    '--color-pastel-butter': PastelsLight.butter,
    '--color-pastel-lilac': PastelsLight.lilac,
    '--color-pastel-sage': PastelsLight.sage,
    '--color-pastel-coral': PastelsLight.coral,
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
    '--color-status-approved-soft': '#2E3632',
    '--color-status-pending-soft': '#3A3630',
    '--color-status-rejected-soft': '#3A3034',
    '--color-status-info-soft': '#30363C',
    '--color-segment-track': Palette.dark.segmentTrack,
    '--color-charcoal': Palette.dark.charcoal,
    '--color-pastel-mint': PastelsDark.mint,
    '--color-pastel-peach': PastelsDark.peach,
    '--color-pastel-sky': PastelsDark.sky,
    '--color-pastel-rose': PastelsDark.rose,
    '--color-pastel-butter': PastelsDark.butter,
    '--color-pastel-lilac': PastelsDark.lilac,
    '--color-pastel-sage': PastelsDark.sage,
    '--color-pastel-coral': PastelsDark.coral,
  },
} as const;

export function getPalette(scheme: 'light' | 'dark'): ThemePalette {
  return Palette[scheme];
}

// ─── Status Colors ───────────────────────────────────────────────────────────
export const StatusColors = {
  approved: { solid: '#16A34A', soft: '#E8F6EF', text: '#14532D' },
  pending: { solid: '#F59E0B', soft: '#FFF6E5', text: '#92600E' },
  rejected: { solid: '#E11D48', soft: '#FFE4E8', text: '#9F1239' },
  info: { solid: '#2563EB', soft: '#E8F0FE', text: '#1E3A8A' },
  entry: { solid: '#16A34A', soft: '#E8F6EF', text: '#14532D' },
  exit: { solid: '#E11D48', soft: '#FFE4E8', text: '#9F1239' },
  checked_in: { solid: '#2563EB', soft: '#E8F0FE', text: '#1E3A8A' },
  checked_out: { solid: '#64748B', soft: '#F0F0F2', text: '#334155' },
  open: { solid: '#F59E0B', soft: '#FFF6E5', text: '#92600E' },
  in_progress: { solid: '#2563EB', soft: '#E8F0FE', text: '#1E3A8A' },
  resolved: { solid: '#16A34A', soft: '#E8F6EF', text: '#14532D' },
} as const;

export const StatusColorsDark = {
  approved: { solid: '#5ECF8A', soft: '#2E3632', text: '#A7E6C0' },
  pending: { solid: '#E8B84A', soft: '#3A3630', text: '#F0D48A' },
  rejected: { solid: '#FF6B81', soft: '#3A3034', text: '#FFB3BE' },
  info: { solid: '#6BA3E8', soft: '#30363C', text: '#A8C8F0' },
  entry: { solid: '#5ECF8A', soft: '#2E3632', text: '#A7E6C0' },
  exit: { solid: '#FF6B81', soft: '#3A3034', text: '#FFB3BE' },
  checked_in: { solid: '#6BA3E8', soft: '#30363C', text: '#A8C8F0' },
  checked_out: { solid: '#8C8C8C', soft: '#333333', text: '#D6D6D6' },
  open: { solid: '#E8B84A', soft: '#3A3630', text: '#F0D48A' },
  in_progress: { solid: '#6BA3E8', soft: '#30363C', text: '#A8C8F0' },
  resolved: { solid: '#5ECF8A', soft: '#2E3632', text: '#A7E6C0' },
} as const;

export function getStatusColors(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? StatusColorsDark : StatusColors;
}

// ─── Gradients ───────────────────────────────────────────────────────────────
export const Gradients = {
  hero: ['#F43F5E', '#E11D48'] as const,
  heroSoft: ['#FFF1F3', '#FFE4E8'] as const,
  heroSoftDark: ['#3A3034', '#2C2C2C'] as const,
  heroWarm: ['#E11D48', '#BE123C', '#9F1239'] as const,
  adminHero: ['#BE123C', '#9F1239'] as const,
  guardHero: ['#F43F5E', '#E11D48'] as const,
  header: ['#FFFFFF', '#F7F7F8'] as const,
  headerDark: ['#2C2C2C', '#222222'] as const,
  cardAccent: ['#FFFFFF', '#FFF1F3'] as const,
  cardAccentDark: ['#2C2C2C', '#333333'] as const,
  auth: ['#BE123C', '#E11D48', '#F43F5E'] as const,
  accentWarm: ['#E11D48', '#BE123C'] as const,
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
  wordmark: 'Manrope_800ExtraBold',
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
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// ─── Radii ───────────────────────────────────────────────────────────────────
/** Soft UI radii — larger cards for a premium, approachable feel. */
export const Radii = {
  input: 12,
  card: 20,
  pill: 999,
  xs: 10,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
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

/** Society / community photos for dashboard hero & banners. */
export const SocietyImages = {
  heroResidence: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=80',
  communityBanner: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=900&q=80',
  courtyard: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=80',
} as const;


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

/** Prefer uploaded cover; otherwise keep the existing stock-image behavior. */
export function amenityCoverUri(amenity: {
  name: string;
  cover_url?: string | null;
}): string {
  const custom = amenity.cover_url?.trim();
  return custom || amenityImageForName(amenity.name);
}
