import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Megaphone } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchField } from '@/components/ui/search-field';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily } from '@/constants/theme';
import { useNoticesRealtime } from '@/hooks/use-notices-realtime';
import { useThemePalette } from '@/hooks/use-theme';
import { formatNoticeDate } from '@/lib/community';
import { fetchNotices } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { Notice } from '@/types/database';

function matchesNotice(notice: Notice, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [notice.title, notice.body, notice.category ?? ''].join(' ').toLowerCase().includes(q);
}

export default function GuardNoticesScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const { pastels, isDark, inkMuted } = useThemePalette();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useNoticesRealtime(societyId);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: [...queryKeys.notices(societyId ?? 'none'), 'published'],
    queryFn: () => fetchNotices(societyId!, { publishedOnly: true }),
    enabled: Boolean(societyId),
  });

  const notices = useMemo(
    () => (data ?? []).filter((n) => matchesNotice(n, search)),
    [data, search],
  );

  const selected = notices.find((n) => n.id === selectedId) ?? null;

  if (!societyId) {
    return (
      <ScreenHeader title="Notices" showBack>
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Ask an admin to link your guard profile."
        />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Notices" subtitle="Society announcements for the gate" showBack>
      <View className="flex-1 px-4 pt-2">
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search notices"
        />

        {error ? (
          <ErrorBanner message={error.message} onRetry={() => void refetch()} />
        ) : null}

        {selected ? (
          <View
            className="mb-3 rounded-2xl p-4"
            style={{ backgroundColor: isDark ? pastels.mint : '#ECFDF5' }}
          >
            <Text className="text-lg text-ink" style={{ fontFamily: FontFamily.display }}>
              {selected.title}
            </Text>
            <Text className="mt-1 text-xs text-ink-muted">
              {formatNoticeDate(selected.created_at)}
            </Text>
            {selected.cover_url ? (
              <Image
                source={{ uri: selected.cover_url }}
                style={{ width: '100%', height: 140, borderRadius: 12, marginTop: 12 }}
                contentFit="cover"
              />
            ) : null}
            <Text className="mt-3 text-[15px] leading-6 text-ink">{selected.body}</Text>
            <Pressable onPress={() => setSelectedId(null)} className="mt-3 self-start">
              <Text style={{ fontFamily: FontFamily.heading, color: Brand.primary }}>
                Close
              </Text>
            </Pressable>
          </View>
        ) : null}

        {isLoading && notices.length === 0 ? (
          <SkeletonList count={4} />
        ) : (
          <FlatList
            data={notices}
            keyExtractor={(item) => item.id}
            refreshControl={
              <ThemedRefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
            }
            contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
            ItemSeparatorComponent={() => <View className="h-2" />}
            ListEmptyComponent={
              <EmptyState
                visual="notices"
                title="No notices yet"
                subtitle="When admin posts a society notice, it shows up here."
              />
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelectedId(item.id)}
                className="rounded-2xl border border-surface-border bg-surface-card px-4 py-3"
              >
                <View className="flex-row items-start gap-3">
                  <View
                    className="mt-0.5 h-9 w-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: pastels.mint }}
                  >
                    <Megaphone color={Brand.primary} size={16} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-base text-ink"
                      style={{ fontFamily: FontFamily.heading }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text className="mt-0.5 text-sm text-ink-muted" numberOfLines={2}>
                      {item.body}
                    </Text>
                    <Text className="mt-1 text-xs" style={{ color: inkMuted }}>
                      {formatNoticeDate(item.created_at)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </ScreenHeader>
  );
}
