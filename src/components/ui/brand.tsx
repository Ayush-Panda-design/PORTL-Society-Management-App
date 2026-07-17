import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, Text, View, type ViewProps } from 'react-native';

import { Brand, FontFamily, Gradients, getHeaderGradient } from '@/constants/theme';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { useThemePalette } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  children: ReactNode;
  className?: string;
};

export function AppCard({ children, className = '', style, ...rest }: CardProps) {
  const palette = useThemePalette();

  return (
    <View
      {...rest}
      className={`rounded-[16px] border border-surface-border bg-surface-card p-4 ${className}`}
      style={[
        {
          shadowColor: palette.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: palette.isDark ? 0.4 : 0.08,
          shadowRadius: 16,
          elevation: 3,
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
};

export function HeroBanner({ title, subtitle, illustration, children }: HeroProps) {
  return (
    <View className="overflow-hidden rounded-b-3xl -mx-4 -mt-4 mb-4">
      <LinearGradient
        colors={[...Gradients.hero]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 36, paddingVertical: 32, paddingTop: 40 }}
      >
        <View className="flex-row items-center gap-3">
          <View className="min-w-0 flex-1">
            <Text
              className="mb-1 text-[28px] font-bold text-white tracking-tight"
              style={{ fontFamily: FontFamily.display }}
            >
              {title}
            </Text>
            <Text className="text-[15px] leading-5 text-teal-50/90">{subtitle}</Text>
          </View>
          {illustration}
        </View>
        {children ? <View className="mt-4">{children}</View> : null}
      </LinearGradient>
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

export function InitialsAvatar({
  name,
  size = 48,
  seed,
  hasUnread = false,
  showOnlineDot = false,
}: {
  name: string;
  size?: number;
  seed?: string;
  /** Instagram-style story ring for unread / new content. */
  hasUnread?: boolean;
  /** WhatsApp-style presence / attention dot. */
  showOnlineDot?: boolean;
}) {
  const initial = (name?.trim()?.charAt(0) || '?').toUpperCase();
  const colors = [Brand.primary, Brand.primaryDark, Brand.accent, '#0D9488', '#2563EB'];
  const index = (seed ?? name).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  const ringPad = hasUnread ? 3 : 0;
  const outer = size + ringPad * 2;
  const inner = size;

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
            backgroundColor: colors[index],
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
      {showOnlineDot ? (
        <View
          accessibilityLabel="Online"
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: Math.max(10, size * 0.28),
            height: Math.max(10, size * 0.28),
            borderRadius: 99,
            backgroundColor: '#22C55E',
            borderWidth: 2,
            borderColor: '#FFFFFF',
          }}
        />
      ) : null}
    </View>
  );
}

/** Photo or child avatar with optional Instagram-style unread ring. */
export function AvatarRing({
  size = 48,
  hasUnread = false,
  children,
}: {
  size?: number;
  hasUnread?: boolean;
  children: ReactNode;
}) {
  const ringPad = hasUnread ? 3 : 0;
  const outer = size + ringPad * 2;

  return (
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
  );
}

export function FloatingActionBtn({
  onPress,
  icon,
  label
}: {
  onPress: () => void;
  icon: ReactNode;
  label?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-6 right-4 rounded-full bg-brand-700 flex-row items-center justify-center px-4 py-4"
      style={{
        shadowColor: '#0F766E',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 6,
      }}
    >
      {icon}
      {label && <Text className="ml-2 font-bold text-white">{label}</Text>}
    </Pressable>
  );
}

export function PressableActionTile({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  const palette = useThemePalette();

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 overflow-hidden rounded-[16px] border border-surface-border bg-surface-card"
      style={{
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: palette.isDark ? 0.4 : 0.08,
        shadowRadius: 16,
        elevation: 3,
      }}
    >
      <View className="flex-row items-center gap-3 p-4">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-50">
          {icon}
        </View>
        <View className="flex-1">
          <Text className="text-base text-ink" style={{ fontFamily: FontFamily.heading }}>
            {title}
          </Text>
          <Text className="text-sm text-ink-muted">{subtitle}</Text>
        </View>
      </View>
    </Pressable>
  );
}
