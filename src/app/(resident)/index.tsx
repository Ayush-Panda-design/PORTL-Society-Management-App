import { useRouter, type Href } from 'expo-router';
import {
  Bell,
  Building2,
  ClipboardList,
  Clock,
  MessageSquare,
  Search,
  UserPlus,
  Users,
  Vote,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import Toast from 'react-native-toast-message';

import { QuietGateIllustration, CalendarIllustration } from '@/components/illustrations';
import { HeroBanner, SoftPromoCard, InitialsAvatar } from '@/components/ui/brand';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { VisitorSwipeDeck } from '@/components/visitors/visitor-swipe-deck';
import type { SwipeDecision } from '@/components/visitors/swipeable-visitor-card';
import { AnimatedPressable } from '@/components/ui/animated-pressable';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { useVisitorsRealtime } from '@/hooks/use-visitors-realtime';
import { updateVisitorStatus } from '@/lib/visitors';
import { useAuthStore } from '@/stores/authStore';
import type { VisitorWithFlat } from '@/types/database';

/** Icon-only quick action — captions removed per design. */
function QuickIcon({
  label,
  icon,
  bg,
  onPress,
  badge,
}: {
  label: string;
  icon: ReactNode;
  bg: string;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <AnimatedPressable onPress={onPress} accessibilityLabel={label}>
      <View
        className="mr-3 h-[64px] w-[64px] items-center justify-center rounded-[22px]"
        style={{
          backgroundColor: bg,
          shadowColor: '#101512',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/80">
          {icon}
        </View>
        {badge !== undefined && badge > 0 ? (
          <View
            className="absolute right-1 top-1 min-w-[18px] items-center justify-center rounded-full px-1"
            style={{ backgroundColor: Brand.accent, height: 18 }}
          >
            <Text className="text-[10px] font-bold text-white">{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

function GuestChip({ visitor }: { visitor: VisitorWithFlat }) {
  const initials = visitor.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View className="mr-2 items-center">
      <InitialsAvatar name={visitor.name} size={36} seed={visitor.id} />
      <Text className="mt-1 max-w-[52px] text-center text-[10px] text-ink-muted" numberOfLines={1}>
        {initials}
      </Text>
    </View>
  );
}

type HubCard = {
  title: string;
  body: string;
  href: Href;
  Icon: typeof Vote;
  wash: string;
  tint: string;
};

const HUB: HubCard[] = [
  {
    title: 'Polls',
    body: 'Vote on society decisions',
    href: '/(resident)/polls',
    Icon: Vote,
    wash: Pastels.lilac,
    tint: '#7C3AED',
  },
  {
    title: 'Helpdesk',
    body: 'Raise & track issues',
    href: '/(resident)/helpdesk',
    Icon: MessageSquare,
    wash: Pastels.rose,
    tint: '#C0392B',
  },
  {
    title: 'Amenities',
    body: 'Book gym & clubhouse',
    href: '/(resident)/amenities',
    Icon: Building2,
    wash: Pastels.mint,
    tint: Brand.primary,
  },
  {
    title: 'Directory',
    body: 'Find neighbours & staff',
    href: '/(resident)/directory',
    Icon: ClipboardList,
    wash: Pastels.butter,
    tint: '#B08020',
  },
];

export default function ResidentHome() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const name = profile?.full_name?.split(' ')[0] ?? 'Resident';
  const [actionId, setActionId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  const { visitors, isLoading, error, refresh } = useVisitorsRealtime({
    flatId: profile?.flat_id,
    statuses: ['pending'],
    enabled: Boolean(profile?.flat_id),
  });

  useEffect(() => {
    const liveIds = new Set(visitors.map((v) => v.id));
    setDismissedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (liveIds.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [visitors]);

  const pendingVisitors = useMemo(
    () => visitors.filter((v) => !dismissedIds.has(v.id)),
    [dismissedIds, visitors],
  );
  const pendingCount = pendingVisitors.length;

  const handleDecision = useCallback(
    async (visitor: VisitorWithFlat, decision: SwipeDecision) => {
      if (!profile?.flat_id || actionId) return;

      setActionId(visitor.id);
      setActionError(null);
      setDismissedIds((prev) => new Set(prev).add(visitor.id));

      const { error: updateError } = await updateVisitorStatus({
        visitorId: visitor.id,
        flatId: profile.flat_id,
        status: decision,
        createdBy: visitor.created_by,
        visitorName: visitor.name,
      });

      if (updateError) {
        setDismissedIds((prev) => {
          const next = new Set(prev);
          next.delete(visitor.id);
          return next;
        });
        setActionError(updateError);
      }

      setActionId(null);
    },
    [actionId, profile?.flat_id],
  );

  const statusChip = !profile?.flat_id
    ? 'Link a flat to get started'
    : isLoading && visitors.length === 0
      ? 'Checking for arrivals…'
      : pendingCount > 0
        ? `${pendingCount} visitor${pendingCount === 1 ? '' : 's'} waiting — swipe to decide`
        : 'All quiet · your society is secure';

  const statusDot = pendingCount > 0 ? Brand.accent : '#22C55E';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <HeroBanner
          title={`Hi, ${name} 👋`}
          subtitle={greeting}
          illustration={<QuietGateIllustration width={108} height={76} />}
        >
          <View className="flex-row items-center self-start rounded-pill bg-white/20 px-3 py-1.5">
            <View className="mr-2 h-2 w-2 rounded-pill" style={{ backgroundColor: statusDot }} />
            <Text className="text-xs text-white/90" style={{ fontFamily: FontFamily.medium }}>
              {statusChip}
            </Text>
          </View>
        </HeroBanner>

        {(error || actionError) && (
          <View className="mt-1">
            <ErrorBanner
              message={actionError ?? error ?? ''}
              onRetry={() => {
                setActionError(null);
                void refresh();
              }}
            />
          </View>
        )}

        {isLoading && visitors.length === 0 ? (
          <View className="mt-8 items-center py-8">
            <ActivityIndicator color={Brand.primary} />
          </View>
        ) : pendingCount > 0 ? (
          <View className="mt-4">
            <VisitorSwipeDeck
              visitors={pendingVisitors}
              busy={Boolean(actionId)}
              onDecision={handleDecision}
            />
          </View>
        ) : (
          <SoftPromoCard
            title="Ready when guests arrive"
            subtitle="Pre-approve visitors so the gate never has to wait on you."
            tone="sky"
            illustration={<CalendarIllustration width={88} height={64} />}
            onPress={() => router.push('/(resident)/pre-approve')}
          />
        )}

        {visitors.filter((v) => v.status === 'approved').length > 0 && (
          <View className="mb-4 mt-2">
            <View className="mb-2 flex-row items-center gap-2">
              <Clock color={Brand.inkMuted} size={13} strokeWidth={1.5} />
              <Text
                className="text-xs font-semibold uppercase tracking-wider text-ink-muted"
                style={{ fontFamily: FontFamily.heading }}
              >
                Today&apos;s approved guests
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {visitors
                .filter((v) => v.status === 'approved')
                .slice(0, 8)
                .map((v) => (
                  <GuestChip key={v.id} visitor={v} />
                ))}
            </ScrollView>
          </View>
        )}

        {/* Quick actions — icons only */}
        <View className="mb-3 mt-1 flex-row items-center justify-between">
          <Text className="text-xl text-ink" style={{ fontFamily: FontFamily.display }}>
            Quick actions
          </Text>
          <AnimatedPressable onPress={() => Toast.show({ type: 'info', text1: 'Search opened' })}>
            <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-muted">
              <Search color={Brand.primary} size={16} strokeWidth={1.5} />
            </View>
          </AnimatedPressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-6"
          contentContainerStyle={{ paddingRight: 8 }}
        >
          <QuickIcon
            label="Visitors"
            icon={<Users color={Brand.primary} size={22} strokeWidth={1.5} />}
            bg={Pastels.sky}
            onPress={() => router.push('/(resident)/visitors')}
            badge={pendingCount}
          />
          <QuickIcon
            label="Pre-approve"
            icon={<UserPlus color={Brand.accent} size={22} strokeWidth={1.5} />}
            bg={Pastels.peach}
            onPress={() => router.push('/(resident)/pre-approve')}
          />
          <QuickIcon
            label="Notices"
            icon={<Bell color="#7C6BA8" size={22} strokeWidth={1.5} />}
            bg={Pastels.lilac}
            onPress={() => router.push('/(resident)/notices')}
          />
          <QuickIcon
            label="Helpdesk"
            icon={<ClipboardList color="#B08020" size={22} strokeWidth={1.5} />}
            bg={Pastels.butter}
            onPress={() => router.push('/(resident)/helpdesk')}
          />
          <QuickIcon
            label="Amenities"
            icon={<Building2 color="#4A6FA8" size={22} strokeWidth={1.5} />}
            bg={Pastels.mint}
            onPress={() => router.push('/(resident)/amenities')}
          />
        </ScrollView>

        {/* Community hub — fills the lower void */}
        <Text className="mb-3 text-xl text-ink" style={{ fontFamily: FontFamily.display }}>
          Around your society
        </Text>

        <View className="flex-row flex-wrap justify-between gap-y-3">
          {HUB.map((card, i) => (
            <MotiView
              key={card.title}
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 360, delay: 60 + i * 50 }}
              style={{ width: '48%' }}
            >
              <Pressable
                onPress={() => router.push(card.href)}
                accessibilityRole="button"
                accessibilityLabel={card.title}
                className="overflow-hidden rounded-[22px] active:opacity-90"
                style={{
                  backgroundColor: card.wash,
                  shadowColor: card.tint,
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 2,
                }}
              >
                <View className="p-3.5">
                  <View
                    className="mb-3 h-10 w-10 items-center justify-center rounded-2xl bg-white/85"
                  >
                    <card.Icon color={card.tint} size={20} strokeWidth={1.5} />
                  </View>
                  <Text
                    className="text-[15px] text-ink"
                    style={{ fontFamily: FontFamily.heading }}
                  >
                    {card.title}
                  </Text>
                  <Text className="mt-0.5 text-[12px] leading-4 text-ink-muted">{card.body}</Text>
                </View>
              </Pressable>
            </MotiView>
          ))}
        </View>

        {/* Tip strip */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 500, delay: 280 }}
          className="mt-4 overflow-hidden rounded-[22px]"
        >
          <LinearGradient
            colors={[Brand.primaryDark, Brand.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 16 }}
          >
            <Text className="text-[11px] uppercase tracking-wide text-white/70"
              style={{ fontFamily: FontFamily.heading }}
            >
              Tip
            </Text>
            <Text
              className="mt-1 text-[16px] text-white"
              style={{ fontFamily: FontFamily.heading }}
            >
              Pre-approve expected guests
            </Text>
            <Text className="mt-1 text-[13px] leading-[18px] text-white/80">
              Guests you add ahead of time skip the wait — the gate can verify them immediately.
            </Text>
            <Pressable
              onPress={() => router.push('/(resident)/pre-approve')}
              className="mt-3.5 self-start rounded-full bg-white px-4 py-2 active:opacity-85"
            >
              <Text className="text-[13px] text-brand-800" style={{ fontFamily: FontFamily.heading }}>
                Pre-approve now
              </Text>
            </Pressable>
          </LinearGradient>
        </MotiView>

        <Pressable
          onPress={() => router.push('/(resident)/more')}
          className="mt-4 items-center py-2"
        >
          <Text className="text-sm text-brand-600" style={{ fontFamily: FontFamily.medium }}>
            More community tools →
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
