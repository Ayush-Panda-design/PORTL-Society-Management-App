import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { FlatList, Pressable, Text, View } from 'react-native';

import { AppCard, InitialsAvatar } from '@/components/ui/brand';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { formatNoticeDate } from '@/lib/community';
import { fetchNotices } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import { useReadStateStore } from '@/stores/readStateStore';

export default function ResidentNoticesScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const isNoticeUnread = useReadStateStore((s) => s.isNoticeUnread);
  const markNoticeSeen = useReadStateStore((s) => s.markNoticeSeen);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.notices(societyId ?? 'none'),
    queryFn: () => fetchNotices(societyId!),
    enabled: Boolean(societyId),
  });

  if (!societyId) {
    return (
      <ScreenHeader title="Notices" subtitle="Society announcements">
        <EmptyState visual="disconnected" title="No society linked" subtitle="Ask an admin to link your profile." />
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
            <ThemedRefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
            />
          }
          ListEmptyComponent={
            <EmptyState
              visual="notices"
              title="No notices yet"
              subtitle="When the society posts an update, it will appear here."
            />
          }
          renderItem={({ item }) => {
            const unread = isNoticeUnread(item.id);
            return (
              <AppCard
                className={`overflow-hidden p-0 ${unread ? 'border-l-4 border-l-teal-600' : ''}`}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title} notice${unread ? ', unread' : ''}`}
                  onPress={() => markNoticeSeen(item.id)}
                  onFocus={() => markNoticeSeen(item.id)}
                >
                  {item.cover_url ? (
                    <Image
                      source={{ uri: item.cover_url }}
                      style={{ width: '100%', height: 140 }}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : null}
                  <View className="p-4">
                    <View className="mb-1 flex-row items-center gap-2">
                      <InitialsAvatar name={item.title} seed={item.id} size={32} hasUnread={unread} />
                      <Text className="flex-1 text-base font-semibold text-ink" numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                    <Text className="mb-3 text-sm leading-5 text-ink-soft">{item.body}</Text>
                    <Text className="text-xs text-ink-faint">
                      {formatNoticeDate(item.created_at)}
                    </Text>
                  </View>
                </Pressable>
              </AppCard>
            );
          }}
        />
      )}
    </ScreenHeader>
  );
}
