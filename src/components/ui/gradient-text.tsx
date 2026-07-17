import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

interface GradientTextProps extends TextProps {
  colors: [string, string, ...string[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export const GradientText = ({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
  style,
  ...props
}: GradientTextProps) => {
  // Fallback to standard text with the primary color to avoid MaskedView native crashes on Fabric/New Architecture
  const primaryColor = colors[0] || '#14B8A6';
  
  return (
    <Text {...props} style={[style, { color: primaryColor }]} />
  );
};
