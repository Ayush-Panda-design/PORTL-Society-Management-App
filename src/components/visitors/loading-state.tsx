import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Brand } from '@/constants/theme';

type Props = {
  message?: string;
};

export function LoadingState({ message = 'Loading…' }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <ActivityIndicator size="large" color={Brand.primary} />
      <Text className="mt-3 text-sm text-ink-muted">{message}</Text>
    </View>
  );
}

function ShimmerBlock({ className }: { className: string }) {
  const progress = useSharedValue(0.35);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.45,
  }));

  return <Animated.View className={`rounded-xl bg-slate-200 ${className}`} style={style} />;
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View className="gap-3 px-4 py-2">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          className="rounded-2xl border border-surface-border bg-surface-card p-4"
          style={{
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 1,
          }}
        >
          <ShimmerBlock className="mb-3 h-4 w-1/3" />
          <ShimmerBlock className="mb-2 h-3 w-2/3" />
          <ShimmerBlock className="h-3 w-1/2" />
        </View>
      ))}
    </View>
  );
}
