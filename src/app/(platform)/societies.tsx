import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { FontFamily } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';
import {
  fetchPlatformConsoleSocieties,
  type PlatformConsoleSociety,
} from '@/lib/platform-api';
import { queryKeys } from '@/lib/query-client';

function SocietyRow({ item }: { item: PlatformConsoleSociety }) {
  const { inkMuted } = useThemePalette();
  const place = [item.area, item.city].filter(Boolean).join(', ');

  return (
    <View className="mb-3 rounded-2xl border border-surface-border bg-surface-card p-4">
      <Text className="text-base text-ink" style={{ fontFamily: FontFamily.heading }}>
        {item.name}
      </Text>
      {place ? (
        <Text className="mt-1 text-xs" style={{ color: inkMuted }}>
          {place}
        </Text>
      ) : null}
      {item.address ? (
        <Text className="mt-1 text-sm" style={{ color: inkMuted }} numberOfLines={2}>
          {item.address}
        </Text>
      ) : null}
      <Text className="mt-2 text-xs font-medium text-brand-800">
        {item.member_count} members · {item.admin_count} admins
        {item.is_discoverable ? ' · Discoverable' : ''}
      </Text>
    </View>
  );
}

export default function PlatformSocietiesScreen() {
  const { inkMuted, border } = useThemePalette();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const societiesQuery = useQuery({
    queryKey: queryKeys.platformSocieties,
    queryFn: () => fetchPlatformConsoleSocieties({ limit: 200 }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await societiesQuery.refetch();
    setRefreshing(false);
  }, [societiesQuery]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = societiesQuery.data ?? [];
    if (!q) return rows;
    return rows.filter((s) =>
      [s.name, s.address, s.city, s.area]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [search, societiesQuery.data]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-5 pb-3 pt-3">
        <Text className="text-xs font-semibold uppercase tracking-widest text-brand-800">
          Platform
        </Text>
        <Text className="mt-1 text-3xl text-ink" style={{ fontFamily: FontFamily.display }}>
          Societies
        </Text>
        <Text className="mt-1 text-sm" style={{ color: inkMuted }}>
          Every society on Portl ({societiesQuery.data?.length ?? 0} loaded).
        </Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search society name or city…"
          placeholderTextColor={inkMuted}
          className="mt-4 rounded-xl border bg-surface-card px-4 py-3 text-base text-ink"
          style={{ borderColor: border }}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {societiesQuery.isError ? (
        <View className="px-5">
          <ErrorBanner
            message={
              societiesQuery.error instanceof Error
                ? societiesQuery.error.message
                : 'Could not load societies'
            }
          />
          <Pressable
            onPress={() => void societiesQuery.refetch()}
            className="mt-3 items-center rounded-xl bg-charcoal py-3"
          >
            <Text className="font-semibold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {societiesQuery.isLoading && !societiesQuery.data ? (
        <View className="px-5">
          <SkeletonList count={6} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          refreshControl={
            <ThemedRefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
          }
          ListEmptyComponent={
            !societiesQuery.isError ? (
              <EmptyState
                visual="towers"
                title={search.trim() ? 'No matches' : 'No societies yet'}
                subtitle={
                  search.trim()
                    ? 'Try another search.'
                    : 'Societies appear after someone creates one.'
                }
              />
            ) : null
          }
          renderItem={({ item }) => <SocietyRow item={item} />}
        />
      )}
    </SafeAreaView>
  );
}
