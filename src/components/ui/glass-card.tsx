import React from 'react';
import { BlurView, type BlurViewProps } from 'expo-blur';
import { View, StyleSheet, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useColorScheme } from 'nativewind';

import { Brand } from '@/constants/theme';

type Props = Omit<BlurViewProps, 'style'> & {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  contentClassName?: string;
  /** Left accent rail (status). */
  accentColor?: string;
  intensity?: number;
};

/**
 * Frosted hero summary — use once per detail screen, not on every section.
 */
export function GlassCard({
  children,
  className,
  style,
  contentClassName = 'p-4',
  accentColor,
  intensity = 36,
  ...props
}: Props) {
  const { colorScheme } = useColorScheme();
  const tint = colorScheme === 'dark' ? 'dark' : 'light';

  return (
    <View
      className={className}
      style={[
        {
          backgroundColor: 'transparent',
          borderRadius: 20,
          overflow: 'hidden',
          borderLeftWidth: accentColor ? 4 : 0,
          borderLeftColor: accentColor ?? 'transparent',
          shadowColor: colorScheme === 'dark' ? '#000' : '#1A2E28',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: colorScheme === 'dark' ? 0.35 : 0.08,
          shadowRadius: 16,
          elevation: 3,
        },
        style,
      ]}
    >
      <View style={styles.inner}>
        <BlurView tint={tint} intensity={intensity} style={StyleSheet.absoluteFill} {...props} />
        <View
          className={`z-10 w-full border border-white/40 ${contentClassName}`}
          style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(20,24,22,0.45)' : 'rgba(255,255,255,0.55)' }}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    overflow: 'hidden',
    borderRadius: 20,
  },
});

/** Re-export Brand for callers that tint the hero wash behind glass. */
export const GlassHeroWash = Brand.primarySoft;
