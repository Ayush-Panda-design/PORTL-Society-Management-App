import type { ComponentType, ReactNode } from 'react';
import { Text, View, Pressable } from 'react-native';
import LottieView from 'lottie-react-native';
import type { LucideProps } from 'lucide-react-native';

import {
  EmptyIllustration,
  type EmptyVisual,
} from '@/components/ui/empty-illustration';
import { Brand, FontFamily, Pastels } from '@/constants/theme';

export type { EmptyVisual };

export type EmptyTip = {
  title: string;
  body: string;
  Icon: ComponentType<LucideProps>;
  tint?: string;
  wash?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  visual?: EmptyVisual;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  /** Page-specific tips / next steps — fills the void under the illustration. */
  tips?: EmptyTip[];
};

const LOTTIE_BY_VISUAL: Partial<Record<EmptyVisual, number>> = {
  notices: require('@/assets/lottie/notices.json'),
  visitors: require('@/assets/lottie/visitors.json'),
  polls: require('@/assets/lottie/polls.json'),
  helpdesk: require('@/assets/lottie/inbox.json'),
  disconnected: require('@/assets/lottie/no-internet.json'),
};

function Visual({ kind }: { kind: EmptyVisual }) {
  const lottie = LOTTIE_BY_VISUAL[kind];

  if (lottie) {
    return (
      <View
        className="mb-1 w-full items-center justify-center overflow-hidden rounded-[24px] py-2"
        style={{ backgroundColor: Pastels.sage }}
      >
        <LottieView
          source={lottie}
          autoPlay
          loop
          style={{ width: 200, height: 168 }}
        />
      </View>
    );
  }

  return (
    <View className="items-center py-2">
      <EmptyIllustration kind={kind} />
    </View>
  );
}

/**
 * Compact empty panel — top-aligned illustration + copy + tip cards.
 * Avoids flex-centered voids that leave half the screen blank.
 */
export function EmptyState({
  title,
  subtitle,
  visual = 'default',
  action,
  actionLabel,
  onAction,
  tips,
}: Props) {
  return (
    <View className="w-full px-1 pt-2 pb-6">
      <Visual kind={visual} />

      <Text
        className="mt-1 text-center text-[20px] font-bold text-ink"
        style={{ fontFamily: FontFamily.heading }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-1.5 px-4 text-center text-[14px] leading-5 text-ink-muted">
          {subtitle}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          className="mt-5 self-center rounded-bubbly bg-charcoal px-7 py-3.5 active:opacity-70"
        >
          <Text className="text-[15px] text-white" style={{ fontFamily: FontFamily.heading }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}

      {action ? <View className="mt-4 items-center">{action}</View> : null}

      {tips && tips.length > 0 ? (
        <View className="mt-6 gap-2.5">
          {tips.map((tip) => {
            const tint = tip.tint ?? Brand.primary;
            const wash = tip.wash ?? Pastels.mint;
            return (
              <View
                key={tip.title}
                className="flex-row items-start gap-3 rounded-2xl bg-surface-card px-3.5 py-3"
                style={{
                  shadowColor: '#000',
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 1,
                }}
              >
                <View
                  className="mt-0.5 h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: wash }}
                >
                  <tip.Icon color={tint} size={18} strokeWidth={1.5} />
                </View>
                <View className="flex-1 pr-1">
                  <Text
                    className="text-[14px] font-semibold text-ink"
                    style={{ fontFamily: FontFamily.heading }}
                  >
                    {tip.title}
                  </Text>
                  <Text className="mt-0.5 text-[13px] leading-[18px] text-ink-muted">
                    {tip.body}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
