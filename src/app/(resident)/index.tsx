import { useRouter } from 'expo-router';
import { Bell, Building2, ClipboardList, UserPlus, Users, Search } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuietGateIllustration } from '@/components/illustrations';
import { HeroBanner, PressableActionTile } from '@/components/ui/brand';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { VisitorSwipeDeck } from '@/components/visitors/visitor-swipe-deck';
import type { SwipeDecision } from '@/components/visitors/swipeable-visitor-card';
import { GlassCard } from '@/components/ui/glass-card';
import { AnimatedPressable } from '@/components/ui/animated-pressable';
import { GradientText } from '@/components/ui/gradient-text';
import Toast from 'react-native-toast-message';
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

        <View className="mt-8 flex-row justify-between items-center mb-4">
          <GradientText
            colors={['#14B8A6', '#F59E0B']}
            className="text-xl font-bold"
            style={{ fontFamily: FontFamily.heading }}
          >
            Quick Actions
          </GradientText>
          <AnimatedPressable onPress={() => Toast.show({ type: 'info', text1: 'Command Palette opened' })}>
            <View className="bg-surface-muted px-3 py-1.5 rounded-full flex-row items-center">
              <Search color={Brand.primary} size={16} />
              <Text className="text-xs text-ink-muted ml-2">Cmd + K</Text>
            </View>
          </AnimatedPressable>
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-4">
          <AnimatedPressable
            containerStyle={{ width: '48%' }}
            onPress={() => router.push('/(resident)/visitors')}
          >
            <GlassCard className="h-32 justify-center items-center">
              <Users color={Brand.primary} size={32} className="mb-2" />
              <Text className="text-ink font-bold text-center">Visitors</Text>
            </GlassCard>
          </AnimatedPressable>

          <AnimatedPressable
            containerStyle={{ width: '48%' }}
            onPress={() => router.push('/(resident)/pre-approve')}
          >
            <GlassCard className="h-32 justify-center items-center bg-brand-soft-bg">
              <UserPlus color={Brand.primary} size={32} className="mb-2" />
              <Text className="text-brand-900 font-bold text-center">Pre-approve</Text>
            </GlassCard>
          </AnimatedPressable>

          <AnimatedPressable
            containerStyle={{ width: '100%' }}
            onPress={() => router.push('/(resident)/amenities')}
          >
            <GlassCard className="h-28 flex-row items-center px-6 bg-accent-soft">
              <Building2 color="#F59E0B" size={40} className="mr-4" />
              <View>
                <Text className="text-ink font-bold text-lg">Book an amenity</Text>
                <Text className="text-ink-muted text-sm">Gym, clubhouse, and more</Text>
              </View>
            </GlassCard>
          </AnimatedPressable>
        </View>

        <Pressable onPress={() => router.push('/(resident)/more')} className="mt-6 items-center py-3">
          <Text className="text-sm text-brand-700" style={{ fontFamily: FontFamily.medium }}>
            More community tools
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
