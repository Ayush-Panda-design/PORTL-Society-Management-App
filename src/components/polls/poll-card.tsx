import { useEffect, useRef, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Pressable, Text, View } from 'react-native';
import { Check, ChevronRight, Lock, Megaphone, Users } from 'lucide-react-native';

import { AnimatedPressable } from '@/components/ui/animated-pressable';
import { AvatarStack } from '@/components/ui/avatar-stack';
import { AppCard, InitialsAvatar } from '@/components/ui/brand';
import { Brand, Elevation, FontFamily, TypeScale } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';
import { pollRespondentLabel, pollStatusKind, type PollStatusKind } from '@/lib/community';
import type { Poll, PollVoteWithProfile } from '@/types/database';

const PCT_COL_WIDTH = 44;

export function PollProgressBar({
  pct,
  active = false,
}: {
  pct: number;
  active?: boolean;
}) {
  const { muted } = useThemePalette();
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
      className="mt-2.5 h-2.5 overflow-hidden rounded-pill"
      style={{ backgroundColor: muted }}
    >
      <Animated.View
        style={{
          height: '100%',
          width,
          minWidth: pct > 0 ? 4 : 0,
          backgroundColor: active ? Brand.primary : Brand.primaryMid,
          borderRadius: 999,
          opacity: active ? 1 : 0.55,
        }}
      />
    </View>
  );
}

export function PollStatusChip({ kind }: { kind: PollStatusKind }) {
  const { pastels, primarySoft, primarySoftText, isDark } = useThemePalette();
  const label = kind === 'live' ? 'Live' : kind === 'results' ? 'Results' : 'Closed';
  const bg =
    kind === 'live' ? primarySoft : kind === 'results' ? pastels.mint : pastels.rose;
  const color =
    kind === 'live'
      ? primarySoftText
      : kind === 'results'
        ? isDark
          ? '#6EE7B7'
          : '#047857'
        : primarySoftText;

  return (
    <View className="rounded-pill px-3 py-1.5" style={{ backgroundColor: bg }}>
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
  const { pastels, primarySoft, primaryAccent, inkMuted, isDark } = useThemePalette();
  const kind = pollStatusKind(poll);
  const accent = needsAction
    ? Brand.primary
    : kind === 'live'
      ? primarySoft
      : kind === 'results'
        ? pastels.mint
        : pastels.peach;

  return (
    <AnimatedPressable onPress={onPress} scaleTo={0.98} accessibilityRole="button">
      <View
        className="overflow-hidden rounded-panel bg-surface-card"
        style={{
          shadowColor: '#0F172A',
          shadowOffset: Elevation.md.shadowOffset,
          shadowOpacity: isDark ? 0.35 : Elevation.md.shadowOpacity,
          shadowRadius: Elevation.md.shadowRadius,
          elevation: 4,
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'transparent',
        }}
      >
        <View className="h-1 w-full" style={{ backgroundColor: accent }} />
        <View className="flex-row items-center gap-3 px-4 py-3.5">
          <View className="min-w-0 flex-1">
            <View className="mb-1.5 flex-row items-center gap-1">
              {needsAction ? (
                <View
                  className="mr-1 h-2 w-2 rounded-full"
                  style={{ backgroundColor: Brand.primary }}
                />
              ) : null}
              <PollStatusChip kind={kind} />
              {voted ? (
                <View
                  className="ml-1 flex-row items-center gap-1 rounded-pill px-2.5 py-1"
                  style={{ backgroundColor: pastels.mint }}
                >
                  <Check
                    color={isDark ? '#6EE7B7' : Brand.primaryDark}
                    size={11}
                    strokeWidth={2.5}
                  />
                  <Text
                    style={{
                      color: isDark ? '#6EE7B7' : Brand.primaryDark,
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
                    color: needsAction ? primaryAccent : inkMuted,
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
  const people = votes.map((v) => ({
    id: v.user_id,
    name: v.profile?.full_name?.trim() || 'Resident',
    imageUrl: v.profile?.avatar_url,
  }));
  if (people.length === 0) return null;
  return (
    <View className="h-6 flex-row items-center justify-end" style={{ minWidth: 56 }}>
      <AvatarStack people={people} max={3} size={22} />
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
  const { card, pastels, border } = useThemePalette();
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
        className="mb-3 rounded-[18px] bg-surface-card px-4 py-3.5"
        style={{
          shadowColor: '#0F172A',
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
          borderWidth: selected || pct > 0 ? 1.5 : 0,
          borderColor: selected || pct > 0 ? `${Brand.primary}55` : 'transparent',
          backgroundColor: selected ? pastels.rose : card,
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
      className="mb-3 rounded-[18px] px-4 py-3.5"
      style={{
        backgroundColor: selected ? pastels.rose : card,
        borderWidth: 1.5,
        borderColor: selected ? Brand.primary : border,
        opacity: disabled && !selected ? 0.72 : 1,
        shadowColor: '#0F172A',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
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
      {showTallies ? (
        <Text
          className="mb-2.5 text-[11px] uppercase tracking-widest text-ink-muted"
          style={{ fontFamily: FontFamily.heading }}
        >
          Options
        </Text>
      ) : null}
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
  const { pastels } = useThemePalette();
  return (
    <View
      className="mt-3 overflow-hidden rounded-[20px] bg-surface-card"
      style={{
        shadowColor: '#0F172A',
        shadowOffset: Elevation.md.shadowOffset,
        shadowOpacity: Elevation.md.shadowOpacity,
        shadowRadius: Elevation.md.shadowRadius,
        elevation: 3,
      }}
    >
      <View
        className="flex-row items-center gap-2 px-4 py-3.5"
        style={{ backgroundColor: pastels.rose }}
      >
        <Users color={Brand.primary} size={14} strokeWidth={1.5} />
        <Text
          className="uppercase tracking-wide"
          style={{
            color: Brand.primaryDark,
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
              className="flex-row items-center gap-3 px-4 py-3.5"
              style={{
                borderTopWidth: index === 0 ? 0 : StyleSheetHairline,
                borderTopColor: '#F0F0F2',
              }}
            >
              <InitialsAvatar
                name={name}
                seed={vote.user_id}
                size={40}
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
                className="max-w-[38%] rounded-pill px-3 py-1.5"
                style={{ backgroundColor: Brand.primary }}
              >
                <Text
                  style={{
                    color: '#fff',
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
  const { pastels } = useThemePalette();
  if (published) {
    return (
      <View
        className="mt-5 flex-row items-center gap-3 rounded-panel px-4 py-3.5"
        style={{ backgroundColor: pastels.mint }}
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
        style={{ backgroundColor: pastels.sage }}
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
  const { pastels } = useThemePalette();
  return (
    <View
      className="mt-4 flex-row items-start gap-2.5 rounded-card px-3.5 py-3"
      style={{ backgroundColor: pastels.butter }}
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
  accent,
}: {
  children: ReactNode;
  accent?: string;
}) {
  const { pastels } = useThemePalette();
  const barColor = accent ?? pastels.mint;
  return (
    <AppCard className="overflow-hidden p-0">
      <View className="h-1.5 w-full" style={{ backgroundColor: barColor }} />
      <View className="p-4">{children}</View>
    </AppCard>
  );
}
