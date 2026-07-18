import { useEffect, useRef, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Pressable, Text, View } from 'react-native';
import { Check, Users } from 'lucide-react-native';

import { AppCard, InitialsAvatar } from '@/components/ui/brand';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { pollRespondentLabel } from '@/lib/community';
import type { PollVoteWithProfile } from '@/types/database';

export function PollProgressBar({
  pct,
  active = false,
}: {
  pct: number;
  active?: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.max(0, Math.min(100, pct)),
      duration: 550,
      useNativeDriver: false,
    }).start();
  }, [anim, pct]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      className="mt-2.5 h-2 overflow-hidden rounded-pill"
      style={{ backgroundColor: active ? `${Brand.primary}22` : Pastels.sage }}
    >
      <Animated.View
        style={{
          height: '100%',
          width,
          backgroundColor: active ? Brand.primary : Brand.primaryMid,
          borderRadius: 999,
          opacity: active ? 1 : 0.55,
        }}
      />
    </View>
  );
}

export function PollVoterStack({ votes }: { votes: PollVoteWithProfile[] }) {
  const shown = votes.slice(0, 4);
  const extra = votes.length - shown.length;
  if (shown.length === 0) return null;

  return (
    <View className="flex-row items-center">
      {shown.map((v, i) => {
        const name = v.profile?.full_name?.trim() || 'Resident';
        return (
          <View
            key={v.id}
            style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }}
          >
            <InitialsAvatar
              name={name}
              seed={v.user_id}
              size={22}
              imageUrl={v.profile?.avatar_url}
            />
          </View>
        );
      })}
      {extra > 0 ? (
        <View
          className="h-6 w-6 items-center justify-center rounded-pill"
          style={{ backgroundColor: Brand.primarySoft, marginLeft: -8 }}
        >
          <Text
            className="text-[10px] font-bold"
            style={{ color: Brand.primary, fontFamily: FontFamily.heading }}
          >
            +{extra}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function PollOptionRow({
  label,
  count,
  pct,
  selected = false,
  disabled = false,
  votes = [],
  onPress,
  showVoters = true,
}: {
  label: string;
  count: number;
  pct: number;
  selected?: boolean;
  disabled?: boolean;
  votes?: PollVoteWithProfile[];
  onPress?: () => void;
  showVoters?: boolean;
}) {
  const content = (
    <>
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          {selected ? (
            <View
              className="h-5 w-5 items-center justify-center rounded-pill"
              style={{ backgroundColor: Brand.primary }}
            >
              <Check color="#fff" size={12} strokeWidth={3} />
            </View>
          ) : null}
          <Text
            className="min-w-0 flex-1 text-[15px] text-ink"
            style={{ fontFamily: selected ? FontFamily.heading : FontFamily.body }}
            numberOfLines={2}
          >
            {label}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {showVoters ? <PollVoterStack votes={votes} /> : null}
          <Text
            className="text-sm tabular-nums"
            style={{
              color: selected ? Brand.primary : Brand.inkMuted,
              fontFamily: FontFamily.heading,
            }}
          >
            {pct}%
          </Text>
        </View>
      </View>
      <PollProgressBar pct={pct} active={selected} />
      {count > 0 ? (
        <Text className="mt-1.5 text-[11px] text-ink-faint">
          {count} vote{count === 1 ? '' : 's'}
        </Text>
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        className="mb-2.5 rounded-card px-3.5 py-3"
        style={{
          backgroundColor: selected ? `${Brand.primary}10` : Pastels.sage,
          borderWidth: selected ? 1.5 : 0,
          borderColor: selected ? Brand.primary : 'transparent',
        }}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className="mb-2.5 rounded-card px-3.5 py-3"
      style={{
        backgroundColor: selected ? `${Brand.primary}10` : 'transparent',
        borderWidth: 1.5,
        borderColor: selected ? Brand.primary : '#E5E8E4',
        opacity: disabled && !selected ? 0.72 : 1,
      }}
    >
      {content}
    </Pressable>
  );
}

export function PollRespondentsList({
  votes,
  loading = false,
}: {
  votes: PollVoteWithProfile[];
  loading?: boolean;
}) {
  return (
    <View
      className="mt-3 overflow-hidden rounded-card"
      style={{ backgroundColor: Pastels.mint }}
    >
      <View className="flex-row items-center gap-2 px-3.5 py-2.5">
        <Users color={Brand.primary} size={14} strokeWidth={1.5} />
        <Text
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: Brand.primary, fontFamily: FontFamily.heading }}
        >
          Who responded · {votes.length}
        </Text>
      </View>

      {loading ? (
        <View className="items-center py-4">
          <ActivityIndicator color={Brand.primary} />
        </View>
      ) : votes.length === 0 ? (
        <Text className="px-3.5 pb-3.5 text-sm text-ink-muted">No responses yet.</Text>
      ) : (
        votes.map((vote, index) => {
          const name = vote.profile?.full_name?.trim() || 'Unnamed resident';
          const label = pollRespondentLabel(vote);
          const meta = label.includes(' · ')
            ? label.split(' · ').slice(1).join(' · ')
            : 'Flat unassigned';
          return (
            <View
              key={vote.id}
              className="flex-row items-center gap-3 px-3.5 py-2.5"
              style={{
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: `${Brand.primary}18`,
              }}
            >
              <InitialsAvatar
                name={name}
                seed={vote.user_id}
                size={36}
                imageUrl={vote.profile?.avatar_url}
              />
              <View className="min-w-0 flex-1">
                <Text
                  className="text-sm text-ink"
                  style={{ fontFamily: FontFamily.heading }}
                  numberOfLines={1}
                >
                  {name}
                </Text>
                <Text className="mt-0.5 text-[11px] text-ink-muted" numberOfLines={1}>
                  {meta}
                </Text>
              </View>
              <View
                className="max-w-[38%] rounded-pill px-2.5 py-1"
                style={{ backgroundColor: Brand.primarySoft }}
              >
                <Text
                  className="text-[11px]"
                  style={{ color: Brand.primaryDark, fontFamily: FontFamily.heading }}
                  numberOfLines={1}
                >
                  {vote.option}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

export function PollShell({
  children,
  accent = Pastels.mint,
}: {
  children: ReactNode;
  accent?: string;
}) {
  return (
    <AppCard className="overflow-hidden p-0">
      <View className="h-1.5 w-full" style={{ backgroundColor: accent }} />
      <View className="p-4">{children}</View>
    </AppCard>
  );
}
