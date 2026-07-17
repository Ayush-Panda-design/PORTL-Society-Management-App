import React from 'react';
import { Pressable, PressableProps, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode;
  scaleTo?: number;
  activeOpacity?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

export const AnimatedPressable = ({
  children,
  scaleTo = 0.95,
  activeOpacity = 0.8,
  containerStyle,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableProps) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressableComponent
      style={[animatedStyle, containerStyle]}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, { damping: 15, stiffness: 300 });
        opacity.value = withSpring(activeOpacity);
        if (onPressIn) onPressIn(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        opacity.value = withSpring(1);
        if (onPressOut) onPressOut(e);
      }}
      {...props}
    >
      {children}
    </AnimatedPressableComponent>
  );
};
