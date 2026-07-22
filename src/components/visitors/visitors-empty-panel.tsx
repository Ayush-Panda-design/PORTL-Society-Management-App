import { Bell, Check, History, Shield, UserPlus } from 'lucide-react-native';
import { MotiView } from 'moti';
import { Pressable, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Brand, FontFamily, type PastelTone } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';

type Props = {
  onPreApprove: () => void;
  onHistory: () => void;
};

const STEPS: {
  n: string;
  title: string;
  body: string;
  Icon: typeof Shield;
  tint: string;
  wash: PastelTone;
}[] = [
  {
    n: '1',
    title: 'Guard registers',
    body: 'Guest details arrive live',
    Icon: Shield,
    tint: Brand.primary,
    wash: 'rose',
  },
  {
    n: '2',
    title: 'You decide',
    body: 'Approve or reject in one tap',
    Icon: Bell,
    tint: Brand.primaryDark,
    wash: 'peach',
  },
  {
    n: '3',
    title: 'Gate opens',
    body: 'Guard is notified instantly',
    Icon: Check,
    tint: '#16A34A',
    wash: 'mint',
  },
];

/**
 * Purpose-built empty composition for Visitor requests —
 * illustration stage + step rail + dual CTAs (not a sparse centered void).
 */
export function VisitorsEmptyPanel({ onPreApprove, onHistory }: Props) {
  const { pastels, isDark, card, muted, border, primaryAccent } = useThemePalette();

  return (
    <View className="pb-4">
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 420 }}
        className="overflow-hidden rounded-[28px]"
      >
        <LinearGradient
          colors={
            isDark
              ? [pastels.rose, pastels.peach, muted]
              : [pastels.rose, pastels.peach, pastels.sky]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: 8, paddingBottom: 4 }}
        >
          <View className="items-center" style={isDark ? { opacity: 0.92 } : undefined}>
            <LottieView
              source={require('@/assets/lottie/visitors.json')}
              autoPlay
              loop
              style={{ width: 220, height: 180 }}
            />
          </View>

          <View
            className="mx-4 mb-4 items-center rounded-2xl px-4 py-3"
            style={{ backgroundColor: isDark ? card : 'rgba(255,255,255,0.9)' }}
          >
            <View
              className="mb-2 flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{
                backgroundColor: isDark ? pastels.mint : '#FFF1F3',
              }}
            >
              <View
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: isDark ? '#4ADE80' : Brand.primary }}
              />
              <Text
                className="text-[11px]"
                style={{
                  fontFamily: FontFamily.heading,
                  color: isDark ? '#86EFAC' : Brand.primaryDark,
                }}
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
            <Text className="mt-1 text-center text-[13px] leading-[18px] text-ink-soft">
              When a guard registers a visitor for your flat, they show up here for instant
              approval.
            </Text>
          </View>
        </LinearGradient>
      </MotiView>

      <Text
        className="mb-2.5 mt-5 text-[12px] uppercase tracking-wide text-ink-soft"
        style={{ fontFamily: FontFamily.heading }}
      >
        How it works
      </Text>

      <View
        className="overflow-hidden rounded-[20px] bg-surface-card"
        style={
          isDark
            ? { borderWidth: 1, borderColor: border }
            : {
                shadowColor: '#0F172A',
                shadowOpacity: 0.05,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 3 },
                elevation: 2,
              }
        }
      >
        {STEPS.map((step, i) => (
          <MotiView
            key={step.n}
            from={{ opacity: 0, translateX: -8 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 380, delay: 80 + i * 70 }}
            className="flex-row items-center gap-3 px-3.5 py-3.5"
          >
            <View
              className="h-11 w-11 items-center justify-center rounded-2xl"
              style={{ backgroundColor: pastels[step.wash] }}
            >
              <step.Icon
                color={isDark && step.wash === 'mint' ? '#6EE7B7' : step.tint}
                size={20}
                strokeWidth={1.5}
              />
            </View>
            <View className="flex-1">
              <Text
                className="text-[11px] text-ink-muted"
                style={{ fontFamily: FontFamily.heading }}
              >
                Step {step.n}
              </Text>
              <Text className="text-[15px] text-ink" style={{ fontFamily: FontFamily.heading }}>
                {step.title}
              </Text>
              <Text className="text-[12px] text-ink-soft">{step.body}</Text>
            </View>
          </MotiView>
        ))}
      </View>

      <View className="mt-4 flex-row gap-2.5">
        <Pressable
          onPress={onPreApprove}
          accessibilityRole="button"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-pill py-3.5"
          style={{ backgroundColor: Brand.primary }}
        >
          <UserPlus color="#fff" size={16} strokeWidth={1.5} />
          <Text className="text-[14px] text-white" style={{ fontFamily: FontFamily.heading }}>
            Pre-approve
          </Text>
        </Pressable>
        <Pressable
          onPress={onHistory}
          accessibilityRole="button"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-pill border border-surface-border py-3.5"
          style={{ backgroundColor: isDark ? muted : card }}
        >
          <History color={isDark ? primaryAccent : Brand.primary} size={16} strokeWidth={1.5} />
          <Text
            className="text-[14px]"
            style={{
              fontFamily: FontFamily.heading,
              color: isDark ? primaryAccent : Brand.primary,
            }}
          >
            History
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
