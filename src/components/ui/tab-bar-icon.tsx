import { useEffect, type ComponentType } from 'react';
import type { LucideProps } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

type Props = {
  Icon: ComponentType<LucideProps>;
  color: string;
  size: number;
  focused: boolean;
  strokeWidth?: number;
};

/**
 * Bottom-tab icon with a springy focus bounce: pops to ~1.15 then settles
 * at 1.08 while active, relaxes back to 1 when the tab loses focus.
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
      <Icon color={color} size={size} strokeWidth={strokeWidth} fill={focused ? color : 'transparent'} />
    </Animated.View>
  );
}
