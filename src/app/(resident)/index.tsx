import { useRouter } from 'expo-router';
import { Bell, Building2, ClipboardList, UserPlus, Users } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuietGateIllustration } from '@/components/illustrations';
import { HeroBanner, PressableActionTile } from '@/components/ui/brand';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { VisitorSwipeDeck } from '@/components/visitors/visitor-swipe-deck';
import type { SwipeDecision } from '@/components/visitors/swipeable-visitor-card';
import { Brand, FontFamily } from '@/constants/theme';
import { useVisitorsRealtime } from '@/hooks/use-visitors-realtime';
import { updateVisitorStatus } from '@/lib/visitors';
import { useAuthStore } from '@/stores/authStore';
import type { VisitorWithFlat } from '@/types/database';

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

  const subtitle = !profile?.flat_id
    ? 'Link a flat to start approving visitors'
    : isLoading && visitors.length === 0
      ? 'Checking for visitor requests…'
      : pendingCount > 0
        ? `${pendingCount} visitor request${pendingCount === 1 ? '' : 's'} waiting — swipe to decide`
        : 'Your society is quiet right now — pre-approve a guest anytime';

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <HeroBanner
          title={`Hi, ${name}`}
          subtitle={subtitle}
          illustration={<QuietGateIllustration width={110} height={78} />}
        />

        {(error || actionError) && (
          <View className="mt-3">
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
          <View className="mt-5">
            <VisitorSwipeDeck
              visitors={pendingVisitors}
              busy={Boolean(actionId)}
              onDecision={handleDecision}
            />
          </View>
        ) : null}

        <View className={pendingCount > 0 ? 'mt-8' : 'mt-5'}>
          {pendingCount === 0 ? (
            <PressableActionTile
              title="Open visitors"
              subtitle="Approve guests at the gate"
              icon={<Users color={Brand.primary} size={20} />}
              onPress={() => router.push('/(resident)/visitors')}
            />
          ) : (
            <PressableActionTile
              title="All visitor requests"
              subtitle="List view with history"
              icon={<Users color={Brand.primary} size={20} />}
              onPress={() => router.push('/(resident)/visitors')}
            />
          )}
          <PressableActionTile
            title="Pre-approve a guest"
            subtitle="Skip the wait when they arrive"
            icon={<UserPlus color={Brand.primary} size={20} />}
            onPress={() => router.push('/(resident)/pre-approve')}
          />
          <PressableActionTile
            title="Notices"
            subtitle="Society announcements"
            icon={<Bell color={Brand.primary} size={20} />}
            onPress={() => router.push('/(resident)/notices')}
          />
          <PressableActionTile
            title="Book an amenity"
            subtitle="Gym, clubhouse, and more"
            icon={<Building2 color={Brand.primary} size={20} />}
            onPress={() => router.push('/(resident)/amenities')}
          />
          <PressableActionTile
            title="Helpdesk"
            subtitle="Raise a complaint"
            icon={<ClipboardList color={Brand.primary} size={20} />}
            onPress={() => router.push('/(resident)/helpdesk')}
          />
        </View>

        <Pressable onPress={() => router.push('/(resident)/more')} className="mt-2 items-center py-3">
          <Text className="text-sm text-brand-700" style={{ fontFamily: FontFamily.medium }}>
            More community tools
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
