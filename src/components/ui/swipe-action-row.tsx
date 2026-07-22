import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { FontFamily } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';
import { hapticLight } from '@/lib/haptics';

export type SwipeAction = {
  key: string;
  label: string;
  color: string;
  onPress: () => void;
};

type Props = {
  children: ReactNode;
  actions: SwipeAction[];
  /** Max reveal width (default = actions * 76). */
  actionWidth?: number;
};

const ACTION_W = 76;

/**
 * Swipe left to reveal quick actions (remove / call / resend).
 * Row content stays flat; actions sit underneath.
 */
export function SwipeActionRow({ children, actions, actionWidth = ACTION_W }: Props) {
  const reveal = actions.length * actionWidth;
  const translateX = useSharedValue(0);
  const { surface } = useThemePalette();

  const snapClosed = () => {
    translateX.value = withSpring(0, { damping: 18, stiffness: 240 });
  };

  const snapOpen = () => {
    translateX.value = withSpring(-reveal, { damping: 18, stiffness: 240 });
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-20, 20])
    .onUpdate((e) => {
      const next = Math.min(0, Math.max(-reveal, e.translationX));
      translateX.value = next;
    })
    .onEnd((e) => {
      const shouldOpen = translateX.value < -reveal * 0.35 || e.velocityX < -400;
      if (shouldOpen) {
        runOnJS(hapticLight)();
        runOnJS(snapOpen)();
      } else {
        runOnJS(snapClosed)();
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View className="overflow-hidden bg-surface">
      <View className="absolute bottom-0 right-0 top-0 flex-row" style={{ width: reveal }}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => {
              snapClosed();
              action.onPress();
            }}
            className="h-full items-center justify-center"
            style={{ width: actionWidth, backgroundColor: action.color }}
          >
            <Text
              className="px-1 text-center text-[11px] font-semibold text-white"
              style={{ fontFamily: FontFamily.heading }}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ backgroundColor: surface }, rowStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
