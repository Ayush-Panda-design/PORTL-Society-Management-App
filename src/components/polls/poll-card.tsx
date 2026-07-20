import { useEffect, useRef, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Pressable, Text, View } from 'react-native';
import { Check, ChevronRight, Lock, Megaphone, Users } from 'lucide-react-native';

import { AnimatedPressable } from '@/components/ui/animated-pressable';
import { AppCard, InitialsAvatar } from '@/components/ui/brand';
import { Brand, Elevation, FontFamily, Pastels, TypeScale } from '@/constants/theme';
import { pollRespondentLabel, pollStatusKind, type PollStatusKind } from '@/lib/community';
import type { Poll, PollVoteWithProfile } from '@/types/database';

const TRACK_BG = '#E5E8E4';
const PCT_COL_WIDTH = 44;

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
      style={{ backgroundColor: TRACK_BG }}
    >
      <Animated.View
        style={{
          height: '100%',
          width,
          minWidth: pct > 0 ? 2 : 0,
          backgroundColor: active ? Brand.primary : Brand.primaryMid,
          borderRadius: 999,
          opacity: active ? 1 : 0.7,
        }}
      />
    </View>
  );
}

export function PollStatusChip({ kind }: { kind: PollStatusKind }) {
  const label = kind === 'live' ? 'Live' : kind === 'results' ? 'Results' : 'Closed';
  const bg =
    kind === 'live' ? Brand.primarySoft : kind === 'results' ? Pastels.mint : Pastels.peach;
  const color =
    kind === 'live' ? Brand.primaryDark : kind === 'results' ? Brand.primary : Brand.accentDark;

  return (
    <View className="rounded-pill px-2.5 py-1" style={{ backgroundColor: bg }}>
      <Text
        style={{
          color,
          fontFamily: FontFamily.heading,
          fontSize: TypeScale.label,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function PollListRow({
  poll,
  subtitle,
  voted = false,
  needsAction = false,
  onPress,
}: {
  poll: Poll;
  subtitle?: string;
  /** Resident has already cast a vote on this poll. */
  voted?: boolean;
  /** Admin needs to publish — stronger visual cue. */
  needsAction?: boolean;
  onPress: () => void;
}) {
  const kind = pollStatusKind(poll);
  const accent = needsAction
    ? Brand.accent
    : kind === 'live'
      ? Pastels.mint
      : kind === 'results'
        ? Brand.primarySoft
        : Pastels.peach;

  return (
    <AnimatedPressable onPress={onPress} scaleTo={0.98} accessibilityRole="button">
      <View
        className="overflow-hidden rounded-panel bg-surface-card"
        style={{
          shadowColor: '#101512',
          shadowOffset: Elevation.sm.shadowOffset,
          shadowOpacity: Elevation.sm.shadowOpacity,
          shadowRadius: Elevation.sm.shadowRadius,
          elevation: 2,
        }}
      >
        <View className="h-1 w-full" style={{ backgroundColor: accent }} />
        <View className="flex-row items-center gap-3 px-4 py-3.5">
          <View className="min-w-0 flex-1">
            <View className="mb-1.5 flex-row items-center gap-1">
              {needsAction ? (
                <View
                  className="mr-1 h-2 w-2 rounded-full"
                  style={{ backgroundColor: Brand.accent }}
                />
              ) : null}
              <PollStatusChip kind={kind} />
              {voted ? (
                <View
                  className="ml-1 flex-row items-center gap-1 rounded-pill px-2.5 py-1"
                  style={{ backgroundColor: Pastels.mint }}
                >
                  <Check color={Brand.primaryDark} size={11} strokeWidth={2.5} />
                  <Text
                    style={{
                      color: Brand.primaryDark,
                      fontFamily: FontFamily.heading,
                      fontSize: TypeScale.label,
                    }}
                  >
                    Voted
                  </Text>
                </View>
              ) : null}
              {subtitle ? (
                <Text
                  className="ml-1 flex-1"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{
                    color: needsAction ? Brand.accentDark : Brand.inkMuted,
                    fontFamily: needsAction ? FontFamily.heading : FontFamily.body,
                    fontSize: TypeScale.label,
                  }}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Text
              className="text-ink"
              style={{
                fontFamily: FontFamily.heading,
                fontSize: TypeScale.h3,
                lineHeight: 22,
              }}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {poll.question.trim()}
            </Text>
          </View>
          <ChevronRight color={Brand.inkMuted} size={18} strokeWidth={1.5} />
        </View>
      </View>
    </AnimatedPressable>
  );
}

export function PollDetailHeader({
  poll,
  meta,
}: {
  poll: Poll;
  meta?: string;
}) {
  const kind = pollStatusKind(poll);
  return (
    <View className="mb-5">
      <View className="mb-3 flex-row items-start justify-between gap-3">
        <PollStatusChip kind={kind} />
        {meta ? (
          <Text
            className="max-w-[55%] text-right"
            numberOfLines={2}
            style={{ color: Brand.inkMuted, fontSize: TypeScale.label }}
          >
            {meta}
          </Text>
        ) : null}
      </View>
      <Text
        className="tracking-tight text-ink"
        style={{
          fontFamily: FontFamily.display,
          fontSize: TypeScale.display,
          lineHeight: 34,
        }}
      >
        {poll.question.trim()}
      </Text>
    </View>
  );
}

export function PollVoterStack({ votes }: { votes: PollVoteWithProfile[] }) {
  const shown = votes.slice(0, 3);
  const extra = votes.length - shown.length;
  if (shown.length === 0) return null;

  return (
    <View className="h-6 flex-row items-center justify-end" style={{ minWidth: 56 }}>
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
  interactive = false,
  votes = [],
  onPress,
  showTallies = false,
  showVoters = false,
}: {
  label: string;
  count: number;
  pct: number;
  selected?: boolean;
  disabled?: boolean;
  /** True when the option can still be voted on (outlined, pressable). */
  interactive?: boolean;
  votes?: PollVoteWithProfile[];
  onPress?: () => void;
  showTallies?: boolean;
  showVoters?: boolean;
}) {
  const content = (
    <>
      <View className="flex-row items-center gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          {selected ? (
            <View
              className="h-5 w-5 items-center justify-center rounded-pill"
              style={{ backgroundColor: Brand.primary }}
            >
              <Check color="#fff" size={12} strokeWidth={3} />
            </View>
          ) : interactive && !disabled ? (
            <View
              className="h-5 w-5 rounded-pill border-2"
              style={{ borderColor: '#D1D5DB' }}
            />
          ) : null}
          <Text
            className="min-w-0 flex-1 text-ink"
            style={{
              fontFamily: selected ? FontFamily.heading : FontFamily.body,
              fontSize: TypeScale.body,
            }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {label}
          </Text>
        </View>

        {showTallies ? (
          <View className="flex-row items-center gap-2">
            {showVoters ? (
              <View style={{ width: 64, alignItems: 'flex-end' }}>
                <PollVoterStack votes={votes} />
              </View>
            ) : null}
            <Text
              className="text-right tabular-nums"
              style={{
                width: PCT_COL_WIDTH,
                color: selected ? Brand.primary : Brand.inkSoft,
                fontFamily: FontFamily.heading,
                fontSize: TypeScale.body,
              }}
            >
              {pct}%
            </Text>
          </View>
        ) : interactive && !disabled ? (
          <Text
            style={{
              color: Brand.primary,
              fontFamily: FontFamily.heading,
              fontSize: TypeScale.label,
            }}
          >
            Tap
          </Text>
        ) : null}
      </View>

      {showTallies ? <PollProgressBar pct={pct} active={selected || pct > 0} /> : null}
      {showTallies ? (
        <Text className="mt-1.5" style={{ color: Brand.inkMuted, fontSize: TypeScale.label }}>
          {count} vote{count === 1 ? '' : 's'}
        </Text>
      ) : null}
    </>
  );

  if (!interactive || !onPress) {
    return (
      <View
        className="mb-2.5 rounded-card px-3.5 py-3"
        style={{
          backgroundColor: selected ? `${Brand.primary}12` : Pastels.sage,
          borderWidth: 1,
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
      android_ripple={{ color: `${Brand.primary}18` }}
      className="mb-2.5 rounded-card px-3.5 py-3"
      style={{
        backgroundColor: selected ? `${Brand.primary}10` : Brand.card,
        borderWidth: 1.5,
        borderColor: selected ? Brand.primary : '#D1D5DB',
        opacity: disabled && !selected ? 0.72 : 1,
      }}
    >
      {content}
    </Pressable>
  );
}

export function PollOptionsPanel({
  options,
  counts,
  total,
  myVote,
  locked,
  showTallies,
  voting,
  optionVotes,
  showVoters = false,
  onVote,
}: {
  options: string[];
  counts: Record<string, number>;
  total: number;
  myVote?: string | null;
  locked: boolean;
  showTallies: boolean;
  voting?: boolean;
  optionVotes?: Record<string, PollVoteWithProfile[]>;
  showVoters?: boolean;
  onVote?: (option: string) => void;
}) {
  const interactive = Boolean(onVote) && !locked;

  return (
    <View>
      {options.map((option) => {
        const count = counts[option] ?? 0;
        const pct = total === 0 ? 0 : Math.round((count / total) * 100);
        const selected = myVote === option;
        return (
          <PollOptionRow
            key={option}
            label={option}
            count={showTallies ? count : 0}
            pct={showTallies ? pct : 0}
            selected={selected}
            disabled={locked || Boolean(voting)}
            interactive={interactive}
            votes={optionVotes?.[option] ?? []}
            showTallies={showTallies}
            showVoters={showVoters && showTallies}
            onPress={interactive ? () => onVote?.(option) : undefined}
          />
        );
      })}
      {voting ? (
        <View className="mt-1 items-center py-2">
          <ActivityIndicator color={Brand.primary} />
        </View>
      ) : null}
    </View>
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
      className="mt-3 overflow-hidden rounded-panel bg-surface-card"
      style={{
        shadowColor: '#101512',
        shadowOffset: Elevation.sm.shadowOffset,
        shadowOpacity: Elevation.sm.shadowOpacity,
        shadowRadius: Elevation.sm.shadowRadius,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center gap-2 border-b border-surface-border px-4 py-3">
        <Users color={Brand.primary} size={14} strokeWidth={1.5} />
        <Text
          className="uppercase tracking-wide"
          style={{
            color: Brand.primary,
            fontFamily: FontFamily.heading,
            fontSize: TypeScale.label,
          }}
        >
          Who responded · {votes.length}
        </Text>
      </View>

      {loading ? (
        <View className="items-center py-4">
          <ActivityIndicator color={Brand.primary} />
        </View>
      ) : votes.length === 0 ? (
        <Text className="px-4 py-3.5 text-sm text-ink-muted">No responses yet.</Text>
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
              className="flex-row items-center gap-3 px-4 py-3"
              style={{
                borderTopWidth: index === 0 ? 0 : StyleSheetHairline,
                borderTopColor: '#E5E7EB',
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
                  className="text-ink"
                  style={{ fontFamily: FontFamily.heading, fontSize: TypeScale.body }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {name}
                </Text>
                <Text
                  className="mt-0.5"
                  style={{ color: Brand.inkMuted, fontSize: TypeScale.label }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {meta}
                </Text>
              </View>
              <View
                className="max-w-[38%] rounded-pill px-2.5 py-1"
                style={{ backgroundColor: Brand.primarySoft }}
              >
                <Text
                  style={{
                    color: Brand.primaryDark,
                    fontFamily: FontFamily.heading,
                    fontSize: TypeScale.label,
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
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

/** 1px hairline without importing StyleSheet just for this. */
const StyleSheetHairline = 1;

export function PollAdminBreakdown({
  total,
  totalResidents,
  votes,
  loading,
}: {
  total: number;
  totalResidents?: number;
  votes: PollVoteWithProfile[];
  loading?: boolean;
}) {
  const participationPct =
    totalResidents && totalResidents > 0
      ? Math.round((total / totalResidents) * 100)
      : null;

  return (
    <View className="mt-5">
      <View className="mb-3 flex-row items-end gap-2">
        <Text className="text-ink" style={{ fontFamily: FontFamily.display, fontSize: 32 }}>
          {total}
        </Text>
        <Text className="mb-1 text-sm text-ink-muted">
          {totalResidents && totalResidents > 0
            ? `of ${totalResidents} residents${
                participationPct != null ? ` · ${participationPct}%` : ''
              }`
            : `response${total === 1 ? '' : 's'}`}
        </Text>
      </View>
      <PollRespondentsList votes={votes} loading={loading} />
    </View>
  );
}

export function PollPublishCard({
  canPublish,
  published,
  publishing,
  onPublish,
}: {
  canPublish: boolean;
  published: boolean;
  publishing?: boolean;
  onPublish: () => void;
}) {
  if (published) {
    return (
      <View
        className="mt-5 flex-row items-center gap-3 rounded-panel px-4 py-3.5"
        style={{ backgroundColor: Pastels.mint }}
      >
        <Megaphone color={Brand.primary} size={18} strokeWidth={1.5} />
        <View className="min-w-0 flex-1">
          <Text className="text-ink" style={{ fontFamily: FontFamily.heading, fontSize: TypeScale.body }}>
            Results published
          </Text>
          <Text className="mt-0.5" style={{ color: Brand.inkMuted, fontSize: TypeScale.label }}>
            Members can see option percentages — not who voted.
          </Text>
        </View>
      </View>
    );
  }

  if (!canPublish) {
    return (
      <View
        className="mt-5 flex-row items-center gap-3 rounded-panel px-4 py-3.5"
        style={{ backgroundColor: Pastels.sage }}
      >
        <Lock color={Brand.inkMuted} size={18} strokeWidth={1.5} />
        <View className="min-w-0 flex-1">
          <Text className="text-ink" style={{ fontFamily: FontFamily.heading, fontSize: TypeScale.body }}>
            Results stay private
          </Text>
          <Text className="mt-0.5" style={{ color: Brand.inkMuted, fontSize: TypeScale.label }}>
            After the poll ends, you can publish tallies without names.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="mt-5 rounded-panel border border-surface-border bg-surface-card px-4 py-4">
      <Text className="text-ink" style={{ fontFamily: FontFamily.heading, fontSize: TypeScale.body }}>
        Publish results?
      </Text>
      <Text className="mt-1 text-sm leading-5 text-ink-muted">
        Members will see option percentages only — never who voted for what.
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={publishing}
        onPress={onPublish}
        className="mt-4 items-center rounded-card py-3.5"
        style={{ backgroundColor: Brand.primary, opacity: publishing ? 0.7 : 1 }}
      >
        {publishing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white" style={{ fontFamily: FontFamily.heading, fontSize: TypeScale.body }}>
            Publish results
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export function PollAwaitingResultsNote() {
  return (
    <View
      className="mt-4 flex-row items-start gap-2.5 rounded-card px-3.5 py-3"
      style={{ backgroundColor: Pastels.butter }}
    >
      <Lock color={Brand.accentDark} size={16} strokeWidth={1.5} style={{ marginTop: 1 }} />
      <Text className="min-w-0 flex-1 text-sm leading-5 text-ink-muted">
        Voting is closed. Results appear here once an admin publishes them.
      </Text>
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
