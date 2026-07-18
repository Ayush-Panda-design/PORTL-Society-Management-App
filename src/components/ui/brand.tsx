import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, Text, View, type ViewProps } from 'react-native';

import { Brand, Elevation, FontFamily, Gradients, Pastels, Radii, getHeaderGradient } from '@/constants/theme';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { useThemePalette } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  children: ReactNode;
  className?: string;
};

/**
 * AppCard — shadow-only elevation, no hairline border.
 * 12px radius per design spec.
 */
export function AppCard({ children, className = '', style, ...rest }: CardProps) {
  const palette = useThemePalette();
  const elev = palette.isDark ? Elevation.smDark : Elevation.sm;

  return (
    <View
      {...rest}
      className={`rounded-card bg-surface-card ${className}`}
      style={[
        {
          shadowColor: palette.shadow,
          ...elev,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type HeroProps = {
  title: string;
  subtitle: string;
  illustration?: ReactNode;
  children?: ReactNode;
  /** Override gradient — e.g. adminHero or guardHero */
  gradientColors?: readonly [string, string, ...string[]];
};

export function HeroBanner({ title, subtitle, illustration, children, gradientColors }: HeroProps) {
  const colors = gradientColors ?? (Gradients.hero as unknown as [string, string]);

  return (
    <View
      className="mb-5 overflow-hidden rounded-hero"
      style={{
        shadowColor: Brand.primaryDark,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 5,
      }}
    >
      <LinearGradient
        colors={[...colors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 24, paddingVertical: 28 }}
      >
        <View className="flex-row items-center gap-3">
          <View className="min-w-0 flex-1">
            <Text
              className="mb-1.5 text-[28px] font-bold text-white tracking-tight"
              style={{ fontFamily: FontFamily.display }}
            >
              {title}
            </Text>
            <Text className="text-[15px] leading-5 text-white/85">{subtitle}</Text>
          </View>
          {illustration}
        </View>
        {children ? <View className="mt-4">{children}</View> : null}
      </LinearGradient>
    </View>
  );
}

/** Soft pastel promo / highlight strip. */
export function SoftPromoCard({
  title,
  subtitle,
  tone = 'sky',
  illustration,
  onPress,
}: {
  title: string;
  subtitle: string;
  tone?: keyof typeof Pastels;
  illustration?: ReactNode;
  onPress?: () => void;
}) {
  const palette = useThemePalette();

  const body = (
    <View className="flex-row items-center gap-3">
      <View className="min-w-0 flex-1">
        <Text
          className="mb-1 text-lg text-ink"
          style={{ fontFamily: FontFamily.display }}
        >
          {title}
        </Text>
        <Text className="text-sm leading-5 text-ink-muted">{subtitle}</Text>
      </View>
      {illustration}
    </View>
  );

  const shadowStyle = {
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: palette.isDark ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className="mb-4 overflow-hidden rounded-panel px-5 py-5"
        style={[{ backgroundColor: Pastels[tone] }, shadowStyle]}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View
      className="mb-4 overflow-hidden rounded-panel px-5 py-5"
      style={[{ backgroundColor: Pastels[tone] }, shadowStyle]}
    >
      {body}
    </View>
  );
}

type HeaderWashProps = {
  children: ReactNode;
};

export function HeaderWash({ children }: HeaderWashProps) {
  const scheme = useResolvedColorScheme();

  return (
    <LinearGradient colors={[...getHeaderGradient(scheme)]} style={{ flex: 1 }}>
      {children}
    </LinearGradient>
  );
}

const AVATAR_TONES = [
  Brand.primary,
  Brand.primaryDark,
  Brand.accent,
  '#4FA094',
  '#5B7EC4',
  '#C4627A',
];

const STATUS_DOT_COLORS: Record<'online' | 'pending' | 'offline', string> = {
  online: '#22C55E',   // green-500 — on-duty
  pending: '#F59E0B',  // amber-500 — pending invite
  offline: '#94A3B8',  // slate-400 — inactive
};

export function InitialsAvatar({
  name,
  size = 48,
  seed,
  hasUnread = false,
  showOnlineDot = false,
  status,
}: {
  name: string;
  size?: number;
  seed?: string;
  hasUnread?: boolean;
  /** @deprecated use `status` instead */
  showOnlineDot?: boolean;
  status?: 'online' | 'pending' | 'offline';
}) {
  const initial = (name?.trim()?.charAt(0) || '?').toUpperCase();
  const index = (seed ?? name).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length;
  const ringPad = hasUnread ? 3 : 0;
  const outer = size + ringPad * 2;
  const inner = size;

  // Resolve effective status
  const resolvedStatus = status ?? (showOnlineDot ? 'online' : undefined);
  const dotSize = Math.max(10, size * 0.28);

  return (
    <View style={{ width: outer, height: outer, position: 'relative' }}>
      <View
        style={{
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          padding: ringPad,
          borderWidth: hasUnread ? 2.5 : 0,
          borderColor: Brand.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            backgroundColor: AVATAR_TONES[index],
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel={`${name} avatar${hasUnread ? ', unread' : ''}`}
        >
          <Text
            style={{
              color: '#fff',
              fontFamily: FontFamily.heading,
              fontSize: inner * 0.4,
            }}
          >
            {initial}
          </Text>
        </View>
      </View>
      {resolvedStatus ? (
        <View
          accessibilityLabel={resolvedStatus === 'online' ? 'Online' : resolvedStatus === 'pending' ? 'Pending' : 'Offline'}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: dotSize,
            height: dotSize,
            borderRadius: 99,
            backgroundColor: STATUS_DOT_COLORS[resolvedStatus],
            borderWidth: 2,
            borderColor: '#FFFFFF',
          }}
        />
      ) : null}
    </View>
  );
}

export function AvatarRing({
  size = 48,
  hasUnread = false,
  status,
  children,
}: {
  size?: number;
  hasUnread?: boolean;
  status?: 'online' | 'pending' | 'offline';
  children: ReactNode;
}) {
  const ringPad = hasUnread ? 3 : 0;
  const outer = size + ringPad * 2;
  const dotSize = Math.max(10, size * 0.28);

  return (
    <View style={{ width: outer, height: outer, position: 'relative' }}>
      <View
        style={{
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          padding: ringPad,
          borderWidth: hasUnread ? 2.5 : 0,
          borderColor: Brand.primary,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
      {status ? (
        <View
          accessibilityLabel={status}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: dotSize,
            height: dotSize,
            borderRadius: 99,
            backgroundColor: STATUS_DOT_COLORS[status],
            borderWidth: 2,
            borderColor: '#FFFFFF',
          }}
        />
      ) : null}
    </View>
  );
}

export function FloatingActionBtn({
  onPress,
  icon,
  label,
  tone = 'charcoal',
}: {
  onPress: () => void;
  icon: ReactNode;
  label?: string;
  tone?: 'charcoal' | 'accent' | 'primary';
}) {
  const bgColor =
    tone === 'accent'
      ? Brand.accent
      : tone === 'primary'
        ? Brand.primary
        : Brand.charcoal;

  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-6 right-4 flex-row items-center justify-center rounded-pill px-5 py-4"
      style={{
        backgroundColor: bgColor,
        shadowColor: bgColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 6,
      }}
    >
      {icon}
      {label ? (
        <Text className="ml-2 font-bold text-white" style={{ fontFamily: FontFamily.heading }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * PrimaryButton — terracotta accent CTA per design spec.
 * Use for the most important action on a screen.
 */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  tone = 'accent',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'accent' | 'primary' | 'charcoal';
}) {
  const bgColor =
    tone === 'primary'
      ? Brand.primary
      : tone === 'charcoal'
        ? Brand.charcoal
        : Brand.accent;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`items-center rounded-card py-4 ${disabled || loading ? 'opacity-60' : ''}`}
      style={{
        backgroundColor: bgColor,
        shadowColor: bgColor,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 4,
      }}
    >
      <Text className="text-base text-white" style={{ fontFamily: FontFamily.heading }}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * PressableActionTile — icon + title + subtitle row.
 * Shadow-only elevation, 12px radius.
 */
export function PressableActionTile({
  title,
  subtitle,
  icon,
  onPress,
  tone,
  badge,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onPress: () => void;
  tone?: keyof typeof Pastels;
  badge?: number;
}) {
  const palette = useThemePalette();
  const elev = palette.isDark ? Elevation.smDark : Elevation.sm;

  return (
    <Pressable
      onPress={onPress}
      className="mb-2.5 overflow-hidden rounded-card bg-surface-card"
      style={{
        shadowColor: palette.shadow,
        ...elev,
      }}
    >
      <View className="flex-row items-center gap-3.5 p-4">
        <View
          className="h-12 w-12 items-center justify-center rounded-panel"
          style={{ backgroundColor: tone ? Pastels[tone] : palette.brandSoftBg }}
        >
          {icon}
        </View>
        <View className="flex-1">
          <Text className="text-base text-ink" style={{ fontFamily: FontFamily.heading }}>
            {title}
          </Text>
          <Text className="mt-0.5 text-sm text-ink-muted">{subtitle}</Text>
        </View>
        {badge !== undefined && badge > 0 ? (
          <View
            className="h-6 min-w-[24px] items-center justify-center rounded-pill px-1.5"
            style={{ backgroundColor: Brand.accent }}
          >
            <Text className="text-xs font-bold text-white" style={{ fontFamily: FontFamily.heading }}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/** StatusPill — icon + color + text badge for complaint/visitor status. */
export function StatusPill({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View
      className="flex-row items-center rounded-pill px-2.5 py-1"
      style={{ backgroundColor: bg }}
    >
      <Text className="text-xs font-semibold" style={{ color, fontFamily: FontFamily.heading }}>
        {label}
      </Text>
    </View>
  );
}

/** SectionLabel — small uppercase section label with optional left-accent. */
export function SectionLabel({
  label,
  accent,
}: {
  label: string;
  accent?: string;
}) {
  return (
    <View className="mb-2 flex-row items-center gap-2">
      {accent ? (
        <View
          className="h-4 w-1 rounded-pill"
          style={{ backgroundColor: accent }}
        />
      ) : null}
      <Text
        className="text-xs font-bold uppercase tracking-widest text-ink-muted"
        style={{ fontFamily: FontFamily.heading }}
      >
        {label}
      </Text>
    </View>
  );
}

export { Radii, Pastels };
