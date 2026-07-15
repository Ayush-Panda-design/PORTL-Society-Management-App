import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { fetchNotices } from '@/lib/community-api';
import { formatNoticeDate } from '@/lib/community';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';

export default function ResidentNoticesScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.notices(societyId ?? 'none'),
    queryFn: () => fetchNotices(societyId!),
    enabled: Boolean(societyId),
  });

  if (!societyId) {
    return (
      <ScreenHeader title="Notices" subtitle="Society announcements">
        <EmptyState title="No society linked" subtitle="Ask an admin to link your profile." />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Notices" subtitle="Society announcements">
      {error ? (
        <ErrorBanner message={error.message} onRetry={() => void refetch()} />
      ) : null}

      {isLoading && !data ? (
        <SkeletonList count={4} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor="#0F766E"
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No notices yet"
              subtitle="When the society posts an update, it will appear here."
            />
          }
          renderItem={({ item }) => (
            <View className="rounded-2xl border border-slate-200 bg-white p-4">
              <Text className="mb-1 text-base font-semibold text-slate-900">{item.title}</Text>
              <Text className="mb-3 text-sm leading-5 text-slate-600">{item.body}</Text>
              <Text className="text-xs text-slate-400">{formatNoticeDate(item.created_at)}</Text>
            </View>
          )}
        />
      )}
    </ScreenHeader>
  );
}
