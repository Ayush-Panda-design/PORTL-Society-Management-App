import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Check, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { Dimensions, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { VisitorSilhouette } from '@/components/illustrations';
import { FontFamily, StatusColors } from '@/constants/theme';
import { flatLabel, formatRelativeTime, typeLabel } from '@/lib/visitors';
import type { VisitorWithFlat } from '@/types/database';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const EXIT_X = SCREEN_WIDTH * 1.25;

export type SwipeDecision = 'approved' | 'rejected';

type Props = {
  visitor: VisitorWithFlat;
  /** 0 = top card; higher values sit behind with scale/offset. */
  stackIndex?: number;
  interactive?: boolean;
  disabled?: boolean;
  onSwiped: (decision: SwipeDecision) => void;
};

function triggerDecisionHaptic(decision: SwipeDecision) {
  void Haptics.notificationAsync(
    decision === 'approved'
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Warning,
  );
}

function triggerThresholdHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function SwipeableVisitorCard({
  visitor,
  stackIndex = 0,
  interactive = true,
  disabled = false,
  onSwiped,
}: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const leaving = useSharedValue(0);
  const crossed = useSharedValue(0);

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    leaving.value = 0;
    crossed.value = 0;
  }, [visitor.id, leaving, translateX, translateY, crossed]);

  const finishSwipe = (decision: SwipeDecision) => {
    triggerDecisionHaptic(decision);
    onSwiped(decision);
  };

  const pan = Gesture.Pan()
    .enabled(interactive && !disabled)
    .activeOffsetX([-18, 18])
    .failOffsetY([-24, 24])
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.15;

      const next =
        e.translationX > SWIPE_THRESHOLD ? 1 : e.translationX < -SWIPE_THRESHOLD ? -1 : 0;
      if (next !== 0 && crossed.value === 0) {
        crossed.value = next;
        runOnJS(triggerThresholdHaptic)();
      } else if (next === 0) {
        crossed.value = 0;
      }
    })
    .onEnd((e) => {
      const shouldApprove = translateX.value > SWIPE_THRESHOLD || e.velocityX > 900;
      const shouldReject = translateX.value < -SWIPE_THRESHOLD || e.velocityX < -900;

      if (shouldApprove || shouldReject) {
        const decision: SwipeDecision = shouldApprove ? 'approved' : 'rejected';
        const direction = shouldApprove ? 1 : -1;
        leaving.value = withTiming(1, { duration: 200 });
        translateX.value = withTiming(direction * EXIT_X, { duration: 220 }, (finished) => {
          if (finished) {
            runOnJS(finishSwipe)(decision);
          }
        });
        translateY.value = withTiming(translateY.value + 24, { duration: 220 });
        return;
      }

      translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      crossed.value = 0;
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-12, 0, 12],
      Extrapolation.CLAMP,
    );
    const stackScale = 1 - stackIndex * 0.04;
    const stackY = stackIndex * 10;

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + stackY },
        { rotate: `${rotate}deg` },
        { scale: stackScale },
      ],
      zIndex: 10 - stackIndex,
      opacity: interpolate(leaving.value, [0, 1], [1, 0.35], Extrapolation.CLAMP),
    };
  });

  const approveStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [24, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const rejectStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, -24], [1, 0], Extrapolation.CLAMP),
  }));

  const approveTintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 0.2], Extrapolation.CLAMP),
  }));

  const rejectTintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [0.2, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        className="absolute left-0 right-0 overflow-hidden rounded-3xl border border-surface-border bg-surface-card"
        style={[
          {
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.12,
            shadowRadius: 20,
            elevation: 6,
          },
          cardStyle,
        ]}
      >
        <View className="h-44 overflow-hidden bg-brand-50">
          {visitor.photo_url ? (
            <Image
              source={{ uri: visitor.photo_url }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <VisitorSilhouette size={120} />
            </View>
          )}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                backgroundColor: StatusColors.approved.solid,
              },
              approveTintStyle,
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                backgroundColor: StatusColors.rejected.solid,
              },
              rejectTintStyle,
            ]}
          />
        </View>

        <View className="gap-1 p-5">
          <Text
            className="text-2xl text-ink"
            style={{ fontFamily: FontFamily.display }}
            numberOfLines={1}
          >
            {visitor.name}
          </Text>
          <Text className="text-base text-ink-soft" style={{ fontFamily: FontFamily.medium }}>
            {typeLabel(visitor.type)} · {flatLabel(visitor)}
          </Text>
          {visitor.purpose ? (
            <Text className="mt-1 text-sm text-ink-muted" numberOfLines={2}>
              {visitor.purpose}
            </Text>
          ) : null}
          <Text className="mt-2 text-xs text-ink-faint">
            {formatRelativeTime(visitor.created_at)}
            {visitor.phone ? ` · ${visitor.phone}` : ''}
          </Text>
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 18,
              left: 18,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              borderWidth: 2,
              borderColor: StatusColors.approved.solid,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: 'rgba(255,255,255,0.92)',
              transform: [{ rotate: '-8deg' }],
            },
            approveStyle,
          ]}
        >
          <Check color={StatusColors.approved.solid} size={18} strokeWidth={2.5} />
          <Text
            style={{
              fontFamily: FontFamily.heading,
              color: StatusColors.approved.solid,
              fontSize: 14,
              letterSpacing: 0.6,
            }}
          >
            APPROVE
          </Text>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 18,
              right: 18,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              borderWidth: 2,
              borderColor: StatusColors.rejected.solid,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: 'rgba(255,255,255,0.92)',
              transform: [{ rotate: '8deg' }],
            },
            rejectStyle,
          ]}
        >
          <X color={StatusColors.rejected.solid} size={18} strokeWidth={2.5} />
          <Text
            style={{
              fontFamily: FontFamily.heading,
              color: StatusColors.rejected.solid,
              fontSize: 14,
              letterSpacing: 0.6,
            }}
          >
            DENY
          </Text>
        </Animated.View>

        {disabled ? (
          <View className="absolute inset-0 items-center justify-center bg-surface-card/55">
            <Text className="text-sm text-ink-muted" style={{ fontFamily: FontFamily.medium }}>
              Updating…
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}
