import { useEffect, type ComponentType } from 'react';
import type { LucideProps } from 'lucide-react-native';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Brand } from '@/constants/theme';

type Props = {
  Icon: ComponentType<LucideProps>;
  color: string;
  size: number;
  focused: boolean;
  strokeWidth?: number;
};

/**
 * Bottom-tab icon with a soft brand-red focus wash + spring bounce.
 */
export function TabBarIcon({ Icon, color, size, focused, strokeWidth = 1.5 }: Props) {
  const scale = useSharedValue(focused ? 1.08 : 1);

  useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.15, { damping: 9, stiffness: 380 }, (finished) => {
        if (finished) {
          scale.value = withSpring(1.08, { damping: 12, stiffness: 260 });
        }
      });
    } else {
      scale.value = withSpring(1, { damping: 14, stiffness: 300 });
    }
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View
        style={{
          width: size + 18,
          height: size + 18,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? Brand.primarySoft : 'transparent',
        }}
      >
        <Icon
          color={color}
          size={size}
          strokeWidth={strokeWidth}
          fill={focused ? color : 'transparent'}
        />
      </View>
    </Animated.View>
  );
}
