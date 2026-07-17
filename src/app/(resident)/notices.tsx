import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { AlertCircle, Calendar, Megaphone, Wrench } from 'lucide-react-native';
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
import { Brand, FontFamily, Pastels } from '@/constants/theme';

type NoticeCategory = 'Event' | 'Maintenance' | 'Alert' | 'General';

/** Infer category from notice title keywords. */
function inferCategory(title: string): NoticeCategory {
  const t = title.toLowerCase();
  if (t.includes('event') || t.includes('fest') || t.includes('celebr')) return 'Event';
  if (t.includes('maintenance') || t.includes('repair') || t.includes('water') || t.includes('power')) return 'Maintenance';
  if (t.includes('alert') || t.includes('urgent') || t.includes('emergency') || t.includes('notice')) return 'Alert';
  return 'General';
}

const CATEGORY_META: Record<NoticeCategory, { color: string; bg: string; Icon: typeof Megaphone }> = {
  Event: { color: '#6B5CC4', bg: Pastels.lilac, Icon: Calendar },
  Maintenance: { color: '#C4861A', bg: Pastels.butter, Icon: Wrench },
  Alert: { color: '#C0392B', bg: Pastels.rose, Icon: AlertCircle },
  General: { color: Brand.primary, bg: Pastels.mint, Icon: Megaphone },
};

/** Pinned/urgent notice — full-width banner with colored left accent. */
function PinnedNoticeCard({
  title,
  body,
  date,
  coverUrl,
  category,
}: {
  title: string;
  body: string;
  date: string;
  coverUrl?: string | null;
  category: NoticeCategory;
}) {
  const meta = CATEGORY_META[category];

  return (
    <View
      className="mb-3 overflow-hidden rounded-panel bg-surface-card"
      style={{
        shadowColor: meta.color,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 14,
        elevation: 4,
        flexDirection: 'row',
      }}
    >
      {/* Left accent bar */}
      <View style={{ width: 4, backgroundColor: meta.color }} />
      <View className="flex-1">
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={{ width: '100%', height: 120 }}
            contentFit="cover"
          />
        ) : null}
        <View className="px-4 py-3">
          {/* Category tag */}
          <View className="mb-2 flex-row items-center gap-1.5 self-start rounded-pill px-2.5 py-1" style={{ backgroundColor: meta.bg }}>
            <meta.Icon color={meta.color} size={11} strokeWidth={1.5} />
            <Text className="text-[11px] font-semibold" style={{ color: meta.color, fontFamily: FontFamily.heading }}>
              {category}
            </Text>
          </View>
          <Text className="mb-1 text-base font-bold text-ink" style={{ fontFamily: FontFamily.display }}>
            {title}
          </Text>
          <Text className="text-sm leading-5 text-ink-soft" numberOfLines={2}>
            {body}
          </Text>
          <Text className="mt-2 text-xs text-ink-faint">{date}</Text>
        </View>
      </View>
    </View>
  );
}

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

  // Separate pinned/first notice from rest for visual hierarchy
  const notices = data ?? [];
  const [pinned, ...rest] = notices;

  return (
    <ScreenHeader title="Notices" subtitle="Society announcements">
      {error ? (
        <ErrorBanner message={error.message} onRetry={() => void refetch()} />
      ) : null}

      {isLoading && !data ? (
        <SkeletonList count={4} />
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <ThemedRefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
            />
          }
          ListHeaderComponent={
            pinned ? (
              <View className="mb-3">
                {/* Pinned banner (first/most recent notice) */}
                <PinnedNoticeCard
                  title={pinned.title}
                  body={pinned.body}
                  date={formatNoticeDate(pinned.created_at)}
                  coverUrl={pinned.cover_url}
                  category={inferCategory(pinned.title)}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !pinned ? (
              <EmptyState
                visual="notices"
                title="No notices yet"
                subtitle="When the society posts an update, it will appear here."
              />
            ) : null
          }
          renderItem={({ item }) => {
            const unread = isNoticeUnread(item.id);
            const cat = inferCategory(item.title);
            const meta = CATEGORY_META[cat];

            return (
              <AppCard className={`overflow-hidden p-0 ${unread ? '' : ''}`}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title} notice${unread ? ', unread' : ''}`}
                  onPress={() => markNoticeSeen(item.id)}
                  onFocus={() => markNoticeSeen(item.id)}
                >
                  {item.cover_url ? (
                    <Image
                      source={{ uri: item.cover_url }}
                      style={{ width: '100%', height: 120 }}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : null}
                  <View className="p-4">
                    <View className="mb-2 flex-row items-center justify-between gap-2">
                      <View className="flex-row items-center gap-2">
                        <InitialsAvatar name={item.title} seed={item.id} size={32} hasUnread={unread} />
                        <Text className="flex-1 text-base font-semibold text-ink" numberOfLines={1} style={{ fontFamily: FontFamily.heading }}>
                          {item.title}
                        </Text>
                      </View>
                      {/* Unread dot */}
                      {unread ? (
                        <View className="h-2 w-2 rounded-pill" style={{ backgroundColor: Brand.accent }} />
                      ) : null}
                    </View>
                    {/* Category tag */}
                    <View className="mb-2 flex-row items-center gap-1.5 self-start rounded-pill px-2.5 py-1" style={{ backgroundColor: meta.bg }}>
                      <meta.Icon color={meta.color} size={11} strokeWidth={1.5} />
                      <Text className="text-[11px]" style={{ color: meta.color, fontFamily: FontFamily.heading }}>
                        {cat}
                      </Text>
                    </View>
                    <Text className="mb-2 text-sm leading-5 text-ink-soft" numberOfLines={2}>
                      {item.body}
                    </Text>
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
