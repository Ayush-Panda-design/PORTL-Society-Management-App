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

import { FontFamily } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';

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

/** iOS-style: muted track + elevated thumb — Instagram/WhatsApp appearance picker feel. */
const SPRING = { damping: 20, stiffness: 260, mass: 0.65 };
const INSET = 3;

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
  className = '',
}: Props<T>) {
  const palette = useThemePalette();
  const [trackWidth, setTrackWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const count = Math.max(options.length, 1);
  const segmentWidth = trackWidth > 0 ? (trackWidth - INSET * 2) / count : 0;
  const translateX = useSharedValue(INSET);

  useEffect(() => {
    if (segmentWidth <= 0) return;
    translateX.value = withSpring(INSET + index * segmentWidth, SPRING);
  }, [index, segmentWidth, translateX]);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: segmentWidth,
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
      className={`h-11 flex-row rounded-[12px] ${className}`}
      style={[{ padding: INSET, backgroundColor: palette.segmentTrack }, style]}
      onLayout={onTrackLayout}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: INSET,
              bottom: INSET,
              left: 0,
              borderRadius: 10,
              backgroundColor: palette.card,
              shadowColor: palette.shadow,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: palette.isDark ? 0.35 : 0.1,
              shadowRadius: 3,
              elevation: 2,
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
            style={{ minHeight: 38 }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontFamily: selected ? FontFamily.heading : FontFamily.medium,
                fontSize: 13,
                color: selected ? palette.ink : palette.inkMuted,
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
