import { Bell, Check, History, Shield, UserPlus } from 'lucide-react-native';
import { MotiView } from 'moti';
import { Pressable, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Brand, FontFamily, Pastels } from '@/constants/theme';

type Props = {
  onPreApprove: () => void;
  onHistory: () => void;
};

const STEPS = [
  {
    n: '1',
    title: 'Guard registers',
    body: 'Guest details arrive live',
    Icon: Shield,
    tint: Brand.primary,
    wash: Pastels.mint,
  },
  {
    n: '2',
    title: 'You decide',
    body: 'Approve or reject in one tap',
    Icon: Bell,
    tint: Brand.accent,
    wash: Pastels.peach,
  },
  {
    n: '3',
    title: 'Gate opens',
    body: 'Guard is notified instantly',
    Icon: Check,
    tint: '#3B82F6',
    wash: Pastels.sky,
  },
] as const;

/**
 * Purpose-built empty composition for Visitor requests —
 * illustration stage + step rail + dual CTAs (not a sparse centered void).
 */
export function VisitorsEmptyPanel({ onPreApprove, onHistory }: Props) {
  return (
    <View className="pb-4">
      {/* Illustration stage */}
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 420 }}
        className="overflow-hidden rounded-[28px]"
      >
        <LinearGradient
          colors={[Pastels.sky, Pastels.lilac, Pastels.mint]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: 8, paddingBottom: 4 }}
        >
          <View className="items-center">
            <LottieView
              source={require('@/assets/lottie/visitors.json')}
              autoPlay
              loop
              style={{ width: 220, height: 180 }}
            />
          </View>

          <View className="mx-4 mb-4 items-center rounded-2xl bg-white/85 px-4 py-3">
            <View className="mb-2 flex-row items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1">
              <View className="h-1.5 w-1.5 rounded-full bg-brand-600" />
              <Text
                className="text-[11px] text-brand-800"
                style={{ fontFamily: FontFamily.heading }}
              >
                Queue clear · live
              </Text>
            </View>
            <Text
              className="text-center text-[20px] text-ink"
              style={{ fontFamily: FontFamily.heading }}
            >
              No pending requests
            </Text>
            <Text className="mt-1 text-center text-[13px] leading-[18px] text-ink-muted">
              When a guard registers a visitor for your flat, they show up here for instant
              approval.
            </Text>
          </View>
        </LinearGradient>
      </MotiView>

      {/* How it works */}
      <Text
        className="mb-2.5 mt-5 text-[12px] uppercase tracking-wide text-ink-muted"
        style={{ fontFamily: FontFamily.heading }}
      >
        How it works
      </Text>

      <View className="gap-2">
        {STEPS.map((step, i) => (
          <MotiView
            key={step.n}
            from={{ opacity: 0, translateX: -8 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 380, delay: 80 + i * 70 }}
            className="flex-row items-center gap-3 rounded-2xl bg-surface-card px-3 py-3"
            style={{
              shadowColor: '#101512',
              shadowOpacity: 0.05,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 3 },
              elevation: 2,
            }}
          >
            <View
              className="h-11 w-11 items-center justify-center rounded-2xl"
              style={{ backgroundColor: step.wash }}
            >
              <step.Icon color={step.tint} size={20} strokeWidth={1.5} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text
                  className="text-[11px] text-ink-faint"
                  style={{ fontFamily: FontFamily.heading }}
                >
                  Step {step.n}
                </Text>
              </View>
              <Text
                className="text-[15px] text-ink"
                style={{ fontFamily: FontFamily.heading }}
              >
                {step.title}
              </Text>
              <Text className="text-[12px] text-ink-muted">{step.body}</Text>
            </View>
          </MotiView>
        ))}
      </View>

      {/* Dual actions */}
      <View className="mt-4 flex-row gap-2.5">
        <Pressable
          onPress={onPreApprove}
          accessibilityRole="button"
          accessibilityLabel="Pre-approve a guest"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-charcoal py-3.5 active:opacity-80"
        >
          <UserPlus color="#fff" size={18} strokeWidth={1.5} />
          <Text className="text-[14px] text-white" style={{ fontFamily: FontFamily.heading }}>
            Pre-approve
          </Text>
        </Pressable>
        <Pressable
          onPress={onHistory}
          accessibilityRole="button"
          accessibilityLabel="View visitor history"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-surface-border bg-surface-card py-3.5 active:opacity-80"
        >
          <History color={Brand.primary} size={18} strokeWidth={1.5} />
          <Text className="text-[14px] text-ink" style={{ fontFamily: FontFamily.heading }}>
            History
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
