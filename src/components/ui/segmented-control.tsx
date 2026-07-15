import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Brand, FontFamily } from '@/constants/theme';

export type SegmentOption<T extends string = string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

const SPRING = { damping: 18, stiffness: 220, mass: 0.7 };

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
  className = '',
}: Props<T>) {
  const [trackWidth, setTrackWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const count = Math.max(options.length, 1);
  const segmentWidth = trackWidth / count;
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (segmentWidth <= 0) return;
    translateX.value = withSpring(index * segmentWidth, SPRING);
  }, [index, segmentWidth, translateX]);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: Math.max(segmentWidth - 4, 0),
  }));

  const select = useCallback(
    (next: T) => {
      if (next === value) return;
      void Haptics.selectionAsync();
      onChange(next);
    },
    [onChange, value],
  );

  return (
    <View
      className={`h-10 flex-row rounded-full bg-surface-muted p-0.5 ${className}`}
      style={style}
      onLayout={onTrackLayout}
    >
      {trackWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 2,
              bottom: 2,
              left: 2,
              borderRadius: 999,
              backgroundColor: Brand.primary,
            },
            indicatorStyle,
          ]}
        />
      ) : null}

      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => select(option.value)}
            className="flex-1 items-center justify-center px-1"
          >
            <Text
              numberOfLines={1}
              style={{
                fontFamily: FontFamily.heading,
                fontSize: 12,
                color: selected ? '#FFFFFF' : Brand.inkMuted,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
