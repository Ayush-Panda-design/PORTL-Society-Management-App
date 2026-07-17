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
      className={`rounded-2xl border border-surface-border bg-surface-card p-4 ${className}`}
      style={[
        {
          shadowColor: palette.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: palette.isDark ? 0.4 : 0.06,
          shadowRadius: 12,
          elevation: 2,
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
    <View className="overflow-hidden rounded-3xl">
      <LinearGradient
        colors={[...Gradients.hero]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingVertical: 22 }}
      >
        <View className="flex-row items-center gap-3">
          <View className="min-w-0 flex-1">
            <Text
              className="mb-1 text-2xl text-white"
              style={{ fontFamily: FontFamily.display }}
            >
              {title}
            </Text>
            <Text className="text-sm leading-5 text-teal-50/90">{subtitle}</Text>
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
}: {
  name: string;
  size?: number;
  seed?: string;
}) {
  const initial = (name?.trim()?.charAt(0) || '?').toUpperCase();
  const colors = [Brand.primary, Brand.primaryDark, Brand.accent, '#0D9488', '#2563EB'];
  const index = (seed ?? name).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors[index],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontFamily: FontFamily.heading,
          fontSize: size * 0.4,
        }}
      >
        {initial}
      </Text>
    </View>
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
      className="mb-3 overflow-hidden rounded-2xl border border-surface-border bg-surface-card"
      style={{
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: palette.isDark ? 0.4 : 0.06,
        shadowRadius: 12,
        elevation: 2,
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
