import { useRouter } from 'expo-router';
import {
  Bell,
  Building2,
  ClipboardList,
  Clock,
  Search,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuietGateIllustration, CalendarIllustration } from '@/components/illustrations';
import { HeroBanner, SoftPromoCard, InitialsAvatar } from '@/components/ui/brand';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { VisitorSwipeDeck } from '@/components/visitors/visitor-swipe-deck';
import type { SwipeDecision } from '@/components/visitors/swipeable-visitor-card';
import { AnimatedPressable } from '@/components/ui/animated-pressable';
import Toast from 'react-native-toast-message';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { useVisitorsRealtime } from '@/hooks/use-visitors-realtime';
import { updateVisitorStatus } from '@/lib/visitors';
import { useAuthStore } from '@/stores/authStore';
import type { VisitorWithFlat } from '@/types/database';

/** Quick action tile with varied pastel tones per category. */
function QuickTile({
  label,
  icon,
  bg,
  iconColor,
  onPress,
  badge,
}: {
  label: string;
  icon: React.ReactNode;
  bg: string;
  iconColor: string;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <AnimatedPressable onPress={onPress}>
      <View
        className="mr-3 items-center justify-center rounded-panel px-4 py-4"
        style={{
          backgroundColor: bg,
          width: 92,
          minHeight: 88,
          shadowColor: iconColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View
          className="mb-2 h-11 w-11 items-center justify-center rounded-card"
          style={{ backgroundColor: 'rgba(255,255,255,0.75)' }}
        >
          {icon}
          {badge !== undefined && badge > 0 ? (
            <View
              className="absolute -right-1 -top-1 h-4.5 min-w-[18px] items-center justify-center rounded-pill px-1"
              style={{ backgroundColor: Brand.accent }}
            >
              <Text className="text-[10px] font-bold text-white">{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text
          className="text-center text-xs text-ink"
          style={{ fontFamily: FontFamily.heading }}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

/** Small avatar chip shown in "Today at a glance" strip. */
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
      <Text
        className="mt-1 max-w-[52px] text-center text-[10px] text-ink-muted"
        numberOfLines={1}
      >
        {initials}
      </Text>
    </View>
  );
}

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

  // Live status chip text
  const statusChip = !profile?.flat_id
    ? 'Link a flat to get started'
    : isLoading && visitors.length === 0
      ? 'Checking for arrivals…'
      : pendingCount > 0
        ? `${pendingCount} visitor${pendingCount === 1 ? '' : 's'} waiting — swipe to decide`
        : 'All quiet · your society is secure';

  const statusDot = pendingCount > 0 ? Brand.accent : '#22C55E';

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero card ── */}
        <HeroBanner
          title={`Hi, ${name} 👋`}
          subtitle=""
          illustration={<QuietGateIllustration width={108} height={76} />}
        >
          {/* Live status chip inside hero */}
          <View className="flex-row items-center self-start rounded-pill bg-white/20 px-3 py-1.5">
            <View
              className="mr-2 h-2 w-2 rounded-pill"
              style={{ backgroundColor: statusDot }}
            />
            <Text className="text-xs text-white/90" style={{ fontFamily: FontFamily.medium }}>
              {statusChip}
            </Text>
          </View>
        </HeroBanner>

        {/* ── Error banners ── */}
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

        {/* ── Pending visitor deck ── */}
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

        {/* ── Today at a glance (pre-approved for today) ── */}
        {visitors.filter((v) => v.status === 'approved').length > 0 && (
          <View className="mb-4 mt-2">
            <View className="mb-2 flex-row items-center gap-2">
              <Clock color={Brand.inkMuted} size={13} strokeWidth={1.5} />
              <Text
                className="text-xs font-semibold uppercase tracking-wider text-ink-muted"
                style={{ fontFamily: FontFamily.heading }}
              >
                Today's approved guests
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

        {/* ── Quick actions ── */}
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xl text-ink" style={{ fontFamily: FontFamily.display }}>
            Quick actions
          </Text>
          <AnimatedPressable
            onPress={() => Toast.show({ type: 'info', text1: 'Search opened' })}
          >
            <View className="flex-row items-center rounded-pill bg-surface-muted px-3.5 py-2">
              <Search color={Brand.primary} size={14} strokeWidth={1.5} />
              <Text className="ml-1.5 text-xs text-ink-muted">Search</Text>
            </View>
          </AnimatedPressable>
        </View>

        {/* Horizontal scrollable quick-action chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-5"
          contentContainerStyle={{ paddingRight: 8 }}
        >
          <QuickTile
            label="Visitors"
            icon={<Users color={Brand.primary} size={22} strokeWidth={1.5} />}
            bg={Pastels.sky}
            iconColor={Brand.primary}
            onPress={() => router.push('/(resident)/visitors')}
            badge={pendingCount}
          />
          <QuickTile
            label="Pre-approve"
            icon={<UserPlus color={Brand.accent} size={22} strokeWidth={1.5} />}
            bg={Pastels.peach}
            iconColor={Brand.accent}
            onPress={() => router.push('/(resident)/pre-approve')}
          />
          <QuickTile
            label="Notices"
            icon={<Bell color="#7C6BA8" size={22} strokeWidth={1.5} />}
            bg={Pastels.lilac}
            iconColor="#7C6BA8"
            onPress={() => router.push('/(resident)/notices')}
          />
          <QuickTile
            label="Helpdesk"
            icon={<ClipboardList color="#B08020" size={22} strokeWidth={1.5} />}
            bg={Pastels.butter}
            iconColor="#B08020"
            onPress={() => router.push('/(resident)/helpdesk')}
          />
          <QuickTile
            label="Amenities"
            icon={<Building2 color="#4A6FA8" size={22} strokeWidth={1.5} />}
            bg={Pastels.sky}
            iconColor="#4A6FA8"
            onPress={() => router.push('/(resident)/amenities')}
          />
        </ScrollView>

        {/* ── More link ── */}
        <Pressable onPress={() => router.push('/(resident)/more')} className="items-center py-3">
          <Text className="text-sm text-brand-600" style={{ fontFamily: FontFamily.medium }}>
            More community tools →
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
