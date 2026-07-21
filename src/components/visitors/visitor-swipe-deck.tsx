import { Check, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  SwipeableVisitorCard,
  type SwipeDecision,
} from '@/components/visitors/swipeable-visitor-card';
import { FontFamily, StatusColors } from '@/constants/theme';
import { hapticConfirm, hapticWarning } from '@/lib/haptics';
import type { VisitorWithFlat } from '@/types/database';

const DECK_HEIGHT = 360;

type Props = {
  visitors: VisitorWithFlat[];
  busy?: boolean;
  onDecision: (visitor: VisitorWithFlat, decision: SwipeDecision) => Promise<void> | void;
};

export function VisitorSwipeDeck({ visitors, busy = false, onDecision }: Props) {
  const [error, setError] = useState<string | null>(null);
  const visible = visitors.slice(0, 3);
  const top = visible[0];

  const handleDecision = useCallback(
    async (decision: SwipeDecision, fromSwipe = false) => {
      if (!top || busy) return;
      setError(null);
      if (!fromSwipe) {
        if (decision === 'approved') hapticConfirm();
        else hapticWarning();
      }
      try {
        await onDecision(top, decision);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update visitor');
      }
    },
    [busy, onDecision, top],
  );

  if (!top) return null;

  return (
    <View>
      <View className="mb-3 flex-row items-end justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-lg text-ink" style={{ fontFamily: FontFamily.heading }}>
            Gate requests
          </Text>
          <Text className="text-sm text-ink-muted">
            Swipe right to approve · left to deny
          </Text>
        </View>
        <View className="rounded-full bg-brand-50 px-2.5 py-1">
          <Text className="text-xs text-brand-700" style={{ fontFamily: FontFamily.medium }}>
            {visitors.length} waiting
          </Text>
        </View>
      </View>

      <View style={{ height: DECK_HEIGHT }}>
        {[...visible].reverse().map((visitor, reverseIndex) => {
          const stackIndex = visible.length - 1 - reverseIndex;
          const isTop = stackIndex === 0;
          return (
            <SwipeableVisitorCard
              key={visitor.id}
              visitor={visitor}
              stackIndex={stackIndex}
              interactive={isTop}
              disabled={busy && isTop}
              onSwiped={(decision) => {
                void handleDecision(decision, true);
              }}
            />
          );
        })}
      </View>

      <View className="mt-4 flex-row gap-3">
        <Pressable
          disabled={busy}
          onPress={() => void handleDecision('rejected')}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-red-200 bg-status-rejectedSoft py-3 ${
            busy ? 'opacity-60' : ''
          }`}
        >
          <X color={StatusColors.rejected.solid} size={18} />
          <Text
            className="text-sm text-status-rejected"
            style={{ fontFamily: FontFamily.heading }}
          >
            Deny
          </Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => void handleDecision('approved')}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-bubbly bg-charcoal py-3 ${
            busy ? 'opacity-60' : ''
          }`}
        >
          <Check color="#fff" size={18} />
          <Text className="text-sm text-white" style={{ fontFamily: FontFamily.heading }}>
            Approve
          </Text>
        </Pressable>
      </View>

      {error ? (
        <Text className="mt-2 text-center text-sm text-status-rejected">{error}</Text>
      ) : null}

      <Text className="mt-3 text-center text-xs text-ink-faint">
        Guard sees your decision instantly
      </Text>
    </View>
  );
}
