import { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { VisitorCard } from '@/components/visitors/visitor-card';
import { useVisitorsRealtime } from '@/hooks/use-visitors-realtime';
import { supabase } from '@/lib/supabase';
import { notifyFlatOfVisitorEntry } from '@/lib/visitors';
import { useAuthStore } from '@/stores/authStore';
import { href } from '@/lib/href';
import type { VisitorWithFlat } from '@/types/database';

export default function GuardVerifyScreen() {
  const profile = useAuthStore((s) => s.profile);
  const router = useRouter();
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { visitors, isLoading, error: loadError, refresh } = useVisitorsRealtime({
    societyId: profile?.society_id,
    statuses: ['approved'],
    enabled: Boolean(profile?.society_id),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const markEntry = async (visitor: VisitorWithFlat) => {
    if (!profile?.id) return;
    
    // Check if photo is missing (pre-approved visitor)
    if (!visitor.photo_url) {
      router.push(href(`/(guard)/scan-pass?visitorId=${visitor.id}`));
      return;
    }

    setActionId(visitor.id);
    setError(null);

    try {
      const { error: logError } = await supabase.from('visitor_logs').insert({
        visitor_id: visitor.id,
        entry_time: new Date().toISOString(),
        guard_id: profile.id,
      });

      if (logError) {
        setError(logError.message);
        return;
      }

      const { error: updateError } = await supabase
        .from('visitors')
        .update({ status: 'checked_in' })
        .eq('id', visitor.id);

      if (updateError) {
        setError(updateError.message);
      } else if (profile.society_id && visitor.flat_id) {
        void notifyFlatOfVisitorEntry({
          flatId: visitor.flat_id,
          societyId: profile.society_id,
          visitorName: visitor.name,
          visitorId: visitor.id,
        });
      }
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
          visual="disconnected" title="No society linked"
          subtitle="Assign a society to your guard profile to verify visitors."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-4 pb-2 pt-3">
        <Text className="text-2xl font-bold text-ink">Ready for entry</Text>
        <Text className="text-sm text-ink-muted">Approved visitors · mark gate entry</Text>
      </View>

      {(error || loadError) && (
        <ErrorBanner message={error ?? loadError ?? ''} onRetry={refresh} />
      )}

      {isLoading && visitors.length === 0 ? (
        <SkeletonList count={3} />
      ) : (
        <FlatList
          data={visitors}
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
                  onPress: () => markEntry(item),
                },
              ]}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
