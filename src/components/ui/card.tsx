import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';

import { Tokens } from '@/theme/tokens';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...props }: CardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Tokens.color.surface,
    borderRadius: Tokens.radius.card,
    padding: Tokens.spacing.lg,
    ...Tokens.elevation.level1,
  },
});
