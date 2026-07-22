import React from 'react';
import { View, type ViewProps, StyleSheet } from 'react-native';

import { useThemePalette } from '@/hooks/use-theme';
import { getTokens } from '@/theme/tokens';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...props }: CardProps) {
  const { scheme, card, isDark } = useThemePalette();
  const tokens = getTokens(scheme);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: card,
          borderRadius: tokens.radius.card,
          padding: tokens.spacing.lg,
          ...tokens.elevation.level1,
          borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'transparent',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
