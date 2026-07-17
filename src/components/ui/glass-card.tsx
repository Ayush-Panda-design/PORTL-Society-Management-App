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
    <View 
      style={[
        styles.shadowContainer, 
        {
          shadowColor: colorScheme === 'dark' ? '#000' : '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: colorScheme === 'dark' ? 0.4 : 0.08,
          shadowRadius: 16,
          elevation: 3,
        },
        style
      ]} 
      className={className}
    >
      <View style={styles.innerContainer}>
        <BlurView tint={tint} intensity={50} style={StyleSheet.absoluteFill} {...props} />
        <View className="z-10 w-full h-full p-4 border border-surface-border rounded-3xl">
          {children}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    backgroundColor: 'transparent',
    borderRadius: 24,
  },
  innerContainer: {
    overflow: 'hidden',
    borderRadius: 24, // 3xl
    flex: 1,
  },
});
