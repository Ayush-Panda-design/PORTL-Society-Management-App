import React from 'react';
import { BlurView, BlurViewProps } from 'expo-blur';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useColorScheme } from 'nativewind';

interface GlassCardProps extends BlurViewProps {
  children: React.ReactNode;
  className?: string;
  style?: any;
}

export const GlassCard = ({ children, className, style, ...props }: GlassCardProps) => {
  const { colorScheme } = useColorScheme();
  const tint = colorScheme === 'dark' ? 'dark' : 'light';
  
  return (
    <View style={[styles.container, style]} className={className}>
      <BlurView tint={tint} intensity={50} style={StyleSheet.absoluteFill} {...props} />
      <View className="z-10 w-full h-full p-4 border border-surface-border rounded-3xl">
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 24, // 3xl
    backgroundColor: 'transparent',
  },
});
