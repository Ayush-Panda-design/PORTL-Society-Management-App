import React from 'react';
import { View, ViewProps } from 'react-native';
import { Skeleton as MotiSkeleton } from 'moti/skeleton';
import { useColorScheme } from 'nativewind';

interface SkeletonProps extends ViewProps {
  width?: number | string;
  height?: number | string;
  radius?: 'round' | 'square';
  colorMode?: 'light' | 'dark';
}

export const Skeleton = ({ width, height, radius = 'round', style, ...props }: SkeletonProps) => {
  const { colorScheme } = useColorScheme();
  
  return (
    <View style={style} {...props}>
      <MotiSkeleton
        colorMode={colorScheme === 'dark' ? 'dark' : 'light'}
        width={width as any}
        height={height as any}
        radius={radius}
        transition={{
          type: 'timing',
          duration: 1500,
        }}
      />
    </View>
  );
};
