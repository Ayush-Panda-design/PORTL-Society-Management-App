import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { AlertCircle, Calendar, ChevronRight, Megaphone, Sparkles, Wrench } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';

import { AppCard } from '@/components/ui/brand';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchField } from '@/components/ui/search-field';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { formatNoticeDate } from '@/lib/community';
import { fetchNotices } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import { useReadStateStore } from '@/stores/readStateStore';
import type { Notice } from '@/types/database';

type NoticeCategory = 'Event' | 'Maintenance' | 'Alert' | 'General';

function inferCategory(title: string): NoticeCategory {
  const t = title.toLowerCase();
  if (t.includes('event') || t.includes('fest') || t.includes('celebr')) return 'Event';
  if (t.includes('maintenance') || t.includes('repair') || t.includes('water') || t.includes('power')) {
    return 'Maintenance';
  }
  if (t.includes('alert') || t.includes('urgent') || t.includes('emergency')) return 'Alert';
  return 'General';
}

const CATEGORY_META: Record<
  NoticeCategory,
  { color: string; bg: string; Icon: typeof Megaphone }
> = {
  Event: { color: '#6B5CC4', bg: Pastels.lilac, Icon: Calendar },
  Maintenance: { color: '#C4861A', bg: Pastels.butter, Icon: Wrench },
  Alert: { color: '#C0392B', bg: Pastels.rose, Icon: AlertCircle },
  General: { color: Brand.primary, bg: Pastels.mint, Icon: Megaphone },
};

function matchesNotice(notice: Notice, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [notice.title, notice.body].join(' ').toLowerCase().includes(q);
}

export default function ResidentNoticesScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const isNoticeUnread = useReadStateStore((s) => s.isNoticeUnread);
  const markNoticeSeen = useReadStateStore((s) => s.markNoticeSeen);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.notices(societyId ?? 'none'),
    queryFn: () => fetchNotices(societyId!),
    enabled: Boolean(societyId),
  });

  const notices = useMemo(
    () => (data ?? []).filter((n) => matchesNotice(n, search)),
    [data, search],
  );

  const selected = notices.find((n) => n.id === selectedId) ?? data?.find((n) => n.id === selectedId) ?? null;

  if (!societyId) {
    return (
      <ScreenHeader title="Notices" subtitle="Society announcements" showMenu>
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Ask an admin to link your profile."
        />
      </ScreenHeader>
    );
  }

  if (selected) {
    const cat = inferCategory(selected.title);
    const meta = CATEGORY_META[cat];
    return (
      <ScreenHeader title="Notice" subtitle={formatNoticeDate(selected.created_at)}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => setSelectedId(null)}
            className="mb-4 self-start"
            accessibilityRole="button"
            accessibilityLabel="Back to notices list"
          >
            <Text className="font-semibold text-brand-700">← All notices</Text>
          </Pressable>

          {selected.cover_url ? (
            <View className="mb-4 overflow-hidden rounded-panel">
              <Image
                source={{ uri: selected.cover_url }}
                style={{ width: '100%', height: 180 }}
                contentFit="cover"
              />
            </View>
          ) : null}

          <View
            className="mb-3 flex-row items-center gap-1.5 self-start rounded-pill px-2.5 py-1"
            style={{ backgroundColor: meta.bg }}
          >
            <meta.Icon color={meta.color} size={12} strokeWidth={1.5} />
            <Text
              className="text-[11px] font-semibold"
              style={{ color: meta.color, fontFamily: FontFamily.heading }}
            >
              {cat}
            </Text>
          </View>

          <Text
            className="mb-2 text-[26px] text-ink"
            style={{ fontFamily: FontFamily.display }}
          >
            {selected.title}
          </Text>
          <Text className="mb-5 text-xs text-ink-muted">
            {formatNoticeDate(selected.created_at)}
          </Text>
          <Text className="text-[15px] leading-6 text-ink">{selected.body}</Text>
        </ScrollView>
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Notices" subtitle="Society announcements" showMenu>
      <View className="px-4 pb-2">
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search notices…"
          accessibilityLabel="Search notices"
        />
      </View>

      {error ? (
        <ErrorBanner message={error.message} onRetry={() => void refetch()} />
      ) : null}

      {isLoading && !data ? (
        <SkeletonList count={6} />
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          refreshControl={
            <ThemedRefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
            />
          }
          ListEmptyComponent={
            <EmptyState
              visual="notices"
              title={search.trim() ? 'No matches' : 'No notices yet'}
              subtitle={
                search.trim()
                  ? 'Try a different title or keyword.'
                  : 'When the society posts an update, it will appear here.'
              }
              tips={
                search.trim()
                  ? undefined
                  : [
                      {
                        Icon: Megaphone,
                        title: 'Society updates',
                        body: 'Events, maintenance, and alerts from your admin show up first.',
                        tint: Brand.primary,
                        wash: Pastels.mint,
                      },
                      {
                        Icon: AlertCircle,
                        title: 'Tap to read',
                        body: 'Open any notice for the full message and cover photo.',
                        tint: '#C0392B',
                        wash: Pastels.rose,
                      },
                      {
                        Icon: Sparkles,
                        title: 'Search quickly',
                        body: 'Use the search bar to find a notice without scrolling forever.',
                        tint: '#6B5CC4',
                        wash: Pastels.lilac,
                      },
                    ]
              }
            />
          }
          renderItem={({ item }) => {
            const unread = isNoticeUnread(item.id);
            const cat = inferCategory(item.title);
            const meta = CATEGORY_META[cat];

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.title}${unread ? ', unread' : ''}`}
                onPress={() => {
                  markNoticeSeen(item.id);
                  setSelectedId(item.id);
                }}
              >
                <AppCard className="flex-row items-center gap-3 p-3.5">
                  <View
                    className="h-10 w-10 items-center justify-center rounded-card"
                    style={{ backgroundColor: meta.bg }}
                  >
                    <meta.Icon color={meta.color} size={16} strokeWidth={1.5} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text
                        className="flex-1 text-[15px] text-ink"
                        numberOfLines={1}
                        style={{ fontFamily: FontFamily.heading }}
                      >
                        {item.title}
                      </Text>
                      {unread ? (
                        <View
                          className="h-2 w-2 rounded-pill"
                          style={{ backgroundColor: Brand.accent }}
                        />
                      ) : null}
                    </View>
                    <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={1}>
                      {cat} · {formatNoticeDate(item.created_at)}
                    </Text>
                  </View>
                  <ChevronRight color={Brand.inkMuted} size={16} strokeWidth={1.5} />
                </AppCard>
              </Pressable>
            );
          }}
        />
      )}
    </ScreenHeader>
  );
}
