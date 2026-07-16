import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipSelector } from '@/components/ui/chip-selector';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { VisitorCard } from '@/components/visitors/visitor-card';
import { useVisitorsRealtime } from '@/hooks/use-visitors-realtime';
import { useAuthStore } from '@/stores/authStore';
import type { VisitorStatus } from '@/types/database';
import { VISITOR_STATUSES } from '@/types/database';

export default function ResidentVisitorHistoryScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const [statusFilter, setStatusFilter] = useState<VisitorStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const statuses = useMemo(
    () => (statusFilter === 'all' ? undefined : [statusFilter]),
    [statusFilter],
  );

  const { visitors, isLoading, error, refresh } = useVisitorsRealtime({
    flatId: profile?.flat_id,
    statuses,
    enabled: Boolean(profile?.flat_id),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (!profile?.flat_id) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <EmptyState
          visual="disconnected" title="No flat linked"
          subtitle="Link a flat to your profile to see visitor history."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="flex-row items-center gap-3 px-4 pb-2 pt-3">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
        >
          <ArrowLeft color="#475569" size={18} />
        </Pressable>
        <View>
          <Text className="text-2xl font-bold text-slate-900">Visitor history</Text>
          <Text className="text-sm text-slate-500">Past guests for your flat</Text>
        </View>
      </View>

      <View className="px-4 pb-2">
        <ChipSelector
          presentation="filter"
          options={[
            { value: 'all', label: 'All' },
            ...VISITOR_STATUSES.map((s) => ({ value: s.value, label: s.label })),
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </View>

      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}

      {isLoading && visitors.length === 0 ? (
        <SkeletonList count={4} />
      ) : (
        <FlatList
          data={visitors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F766E" />
          }
          ListEmptyComponent={
            <EmptyState
              visual="visitors"
              title="No visitors yet"
              subtitle="Approved, rejected, and checked-in guests will appear here."
            />
          }
          renderItem={({ item }) => <VisitorCard visitor={item} />}
        />
      )}
    </SafeAreaView>
  );
}
