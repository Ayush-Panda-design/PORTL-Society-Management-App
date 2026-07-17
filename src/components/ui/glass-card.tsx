import React from 'react';
import { BlurView, BlurViewProps } from 'expo-blur';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useColorScheme } from 'nativewind';

interface GlassCardProps extends BlurViewProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewProps['style'];
}

export const GlassCard = ({ children, className, style, ...props }: GlassCardProps) => {
  const { colorScheme } = useColorScheme();
  const tint = colorScheme === 'dark' ? 'dark' : 'light';

  return (
    <View
      style={[
        styles.shadowContainer,
        {
          shadowColor: colorScheme === 'dark' ? '#000' : '#1A2E28',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: colorScheme === 'dark' ? 0.4 : 0.07,
          shadowRadius: 20,
          elevation: 3,
        },
        style,
      ]}
      className={className}
    >
      <View style={styles.innerContainer}>
        <BlurView tint={tint} intensity={40} style={StyleSheet.absoluteFill} {...props} />
        <View className="z-10 h-full w-full rounded-bubbly border border-surface-border p-4">
          {children}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    backgroundColor: 'transparent',
    borderRadius: 28,
  },
  innerContainer: {
    overflow: 'hidden',
    borderRadius: 28,
    flex: 1,
  },
});
