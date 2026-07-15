import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, Text, View, type ViewProps } from 'react-native';

import { Brand, FontFamily, Gradients } from '@/constants/theme';

type CardProps = ViewProps & {
  children: ReactNode;
  className?: string;
};

export function AppCard({ children, className = '', style, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      className={`rounded-2xl border border-surface-border bg-white p-4 ${className}`}
      style={[
        {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
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
  return (
    <LinearGradient colors={[...Gradients.header]} style={{ flex: 1 }}>
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
  const palette = [Brand.primary, Brand.primaryDark, Brand.accent, '#0D9488', '#2563EB'];
  const index = (seed ?? name).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: palette[index],
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
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 overflow-hidden rounded-2xl border border-surface-border bg-white"
      style={{
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
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
