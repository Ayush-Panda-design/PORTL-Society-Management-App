import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { GatePicker } from '@/components/visitors/gate-picker';
import { SkeletonList } from '@/components/visitors/loading-state';
import { VisitorCard } from '@/components/visitors/visitor-card';
import { useVisitorsRealtime } from '@/hooks/use-visitors-realtime';
import { href } from '@/lib/href';
import { isVisitorPassExpired, markVisitorEntry } from '@/lib/mark-visitor-entry';
import { useAuthStore } from '@/stores/authStore';
import type { VisitorWithFlat } from '@/types/database';

export default function GuardVerifyScreen() {
  const profile = useAuthStore((s) => s.profile);
  const router = useRouter();
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [gateId, setGateId] = useState<string | null>(null);

  const { visitors, isLoading, error: loadError, refresh } = useVisitorsRealtime({
    societyId: profile?.society_id,
    statuses: ['approved'],
    enabled: Boolean(profile?.society_id),
  });

  const entryReady = useMemo(
    () => visitors.filter((v) => !isVisitorPassExpired(v.expires_at)),
    [visitors],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const markEntry = async (visitor: VisitorWithFlat) => {
    if (!profile?.id || !profile.society_id) return;

    if (isVisitorPassExpired(visitor.expires_at)) {
      setError('This pass has expired.');
      return;
    }

    // Check if photo is missing (pre-approved visitor)
    if (!visitor.photo_url) {
      router.push(href(`/(guard)/scan-pass?visitorId=${visitor.id}`));
      return;
    }

    setActionId(visitor.id);
    setError(null);

    try {
      const { error: entryError } = await markVisitorEntry({
        visitorId: visitor.id,
        guardId: profile.id,
        societyId: profile.society_id,
        flatId: visitor.flat_id,
        visitorName: visitor.name,
        entryGateId: gateId,
      });
      if (entryError) setError(entryError);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to mark entry');
    } finally {
      setActionId(null);
    }
  };

  if (!profile?.society_id) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Assign a society to your guard profile to verify visitors."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-4 pb-2 pt-3">
        <Text className="text-2xl font-bold text-ink">Ready for entry</Text>
        <Text className="mb-2 text-sm text-ink-muted">Approved visitors · mark gate entry</Text>
        <GatePicker societyId={profile.society_id} value={gateId} onChange={setGateId} />
      </View>

      {(error || loadError) && (
        <ErrorBanner message={error ?? loadError ?? ''} onRetry={refresh} />
      )}

      {isLoading && entryReady.length === 0 ? (
        <SkeletonList count={3} />
      ) : (
        <FlatList
          data={entryReady}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <ThemedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              visual="visitors"
              title="No approved visitors"
              subtitle="Once a resident approves a request, they will appear here for check-in."
            />
          }
          renderItem={({ item }) => (
            <VisitorCard
              visitor={item}
              actions={[
                {
                  label: 'Mark Entry',
                  variant: 'primary',
                  icon: 'check',
                  loading: actionId === item.id,
                  onPress: () => void markEntry(item),
                },
              ]}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
