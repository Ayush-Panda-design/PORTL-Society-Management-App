import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import LottieView from 'lottie-react-native';
import { FontFamily } from '@/constants/theme';
import { MotiView } from 'moti';

export type SuccessType = 'success' | 'payment';

type Props = {
  visible: boolean;
  type?: SuccessType;
  message?: string;
  onDone?: () => void;
};

const LOTTIE_FILES = {
  success: require('@/assets/lottie/success.json'),
  payment: require('@/assets/lottie/payment-success.json'),
};

export function SuccessOverlay({ visible, type = 'success', message, onDone }: Props) {
  const animation = useRef<LottieView>(null);

  useEffect(() => {
    if (visible) {
      animation.current?.play();
      // Auto dismiss after a short delay so the animation finishes
      const timer = setTimeout(() => {
        onDone?.();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible, onDone]);

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
      </MotiView>
    </View>
  );
}
