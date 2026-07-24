import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InitialsAvatar } from '@/components/ui/brand';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { FontFamily } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';
import {
  fetchPlatformConsoleUsers,
  type PlatformConsoleUser,
} from '@/lib/platform-api';
import { queryKeys } from '@/lib/query-client';

function roleLabel(role: string): string {
  if (role === 'admin') return 'Society admin';
  if (role === 'guard') return 'Guard';
  if (role === 'resident') return 'Resident';
  return role;
}

function UserRow({ item }: { item: PlatformConsoleUser }) {
  const { inkMuted, pastels } = useThemePalette();
  const subtitle = [
    item.email ?? 'No email',
    item.society_name ?? 'No society',
    roleLabel(item.role),
    item.status,
  ].join(' · ');

  return (
    <View
      className="mb-3 flex-row items-center gap-3 rounded-2xl border border-surface-border bg-surface-card p-3"
    >
      <InitialsAvatar name={item.full_name ?? item.email ?? 'User'} size={44} imageUrl={item.avatar_url} />
      <View className="flex-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-base text-ink" style={{ fontFamily: FontFamily.heading }}>
            {item.full_name?.trim() || 'Unnamed user'}
          </Text>
          {item.is_platform_admin ? (
            <View
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: pastels.rose }}
            >
              <Text className="text-[10px] font-bold uppercase tracking-wide text-brand-800">
                Platform
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="mt-0.5 text-xs" style={{ color: inkMuted }} numberOfLines={2}>
          {subtitle}
        </Text>
        {item.phone ? (
          <Text className="mt-0.5 text-xs" style={{ color: inkMuted }}>
            {item.phone}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function PlatformUsersScreen() {
  const { inkMuted, border } = useThemePalette();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const usersQuery = useQuery({
    queryKey: queryKeys.platformUsers,
    queryFn: () => fetchPlatformConsoleUsers({ limit: 300 }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await usersQuery.refetch();
    setRefreshing(false);
  }, [usersQuery]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = usersQuery.data ?? [];
    if (!q) return rows;
    return rows.filter((u) =>
      [u.full_name, u.email, u.phone, u.society_name, u.role, u.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [search, usersQuery.data]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-5 pb-3 pt-3">
        <Text className="text-xs font-semibold uppercase tracking-widest text-brand-800">
          Platform
        </Text>
        <Text className="mt-1 text-3xl text-ink" style={{ fontFamily: FontFamily.display }}>
          All users
        </Text>
        <Text className="mt-1 text-sm" style={{ color: inkMuted }}>
          Every account across every society ({usersQuery.data?.length ?? 0} loaded).
        </Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, email, society…"
          placeholderTextColor={inkMuted}
          className="mt-4 rounded-xl border bg-surface-card px-4 py-3 text-base text-ink"
          style={{ borderColor: border }}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {usersQuery.isError ? (
        <View className="px-5">
          <ErrorBanner
            message={
              usersQuery.error instanceof Error
                ? usersQuery.error.message
                : 'Could not load users'
            }
          />
          <Pressable
            onPress={() => void usersQuery.refetch()}
            className="mt-3 items-center rounded-xl bg-charcoal py-3"
          >
            <Text className="font-semibold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {usersQuery.isLoading && !usersQuery.data ? (
        <View className="px-5">
          <SkeletonList count={8} />
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
            !usersQuery.isError ? (
              <EmptyState
                visual="residents"
                title={search.trim() ? 'No matches' : 'No users yet'}
                subtitle={
                  search.trim()
                    ? 'Try a different name or email.'
                    : 'Users appear after people sign up.'
                }
              />
            ) : null
          }
          renderItem={({ item }) => <UserRow item={item} />}
        />
      )}
    </SafeAreaView>
  );
}
