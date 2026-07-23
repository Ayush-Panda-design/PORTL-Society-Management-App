import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import LottieView from 'lottie-react-native';
import { FontFamily, Brand } from '@/constants/theme';
import { MotiView } from 'moti';

export type SuccessType = 'success' | 'payment';

type Props = {
  visible: boolean;
  type?: SuccessType;
  message?: string;
  onDone?: () => void;
  /** Optional secondary action (e.g. Add to calendar). */
  actionLabel?: string;
  onAction?: () => void;
};

const LOTTIE_FILES = {
  success: require('@/assets/lottie/success.json'),
  payment: require('@/assets/lottie/payment-success.json'),
};

export function SuccessOverlay({
  visible,
  type = 'success',
  message,
  onDone,
  actionLabel,
  onAction,
}: Props) {
  const animation = useRef<LottieView>(null);

  useEffect(() => {
    if (visible) {
      animation.current?.play();
      // Keep open longer when there's an action the user may tap
      const delay = actionLabel ? 4500 : 2500;
      const timer = setTimeout(() => {
        onDone?.();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [visible, onDone, actionLabel]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} className="z-50 items-center justify-center bg-black/60">
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', damping: 15 }}
        className="items-center justify-center rounded-3xl bg-surface p-8 shadow-2xl"
        style={{ minWidth: 220 }}
      >
        <LottieView
          ref={animation}
          source={LOTTIE_FILES[type]}
          autoPlay={false}
          loop={false}
          style={{ width: 120, height: 120 }}
        />
        {message ? (
          <Text
            className="mt-4 text-center text-lg text-ink"
            style={{ fontFamily: FontFamily.heading }}
          >
            {message}
          </Text>
        ) : null}
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            className="mt-4 rounded-bubbly px-4 py-2.5"
            style={{ backgroundColor: Brand.primary }}
          >
            <Text className="font-semibold text-white">{actionLabel}</Text>
          </Pressable>
        ) : null}
      </MotiView>
    </View>
  );
}
