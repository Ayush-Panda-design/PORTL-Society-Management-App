import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, type PastelTone } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';
import {
  fetchPlatformConsoleStats,
  formatPaiseAsInr,
  type PlatformConsoleStats,
} from '@/lib/platform-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';

type StatCard = {
  label: string;
  value: string;
  wash: PastelTone;
};

function buildCards(stats: PlatformConsoleStats): StatCard[] {
  return [
    { label: 'Societies', value: String(stats.societies), wash: 'sky' },
    { label: 'All users', value: String(stats.users), wash: 'rose' },
    { label: 'Active members', value: String(stats.users_active), wash: 'mint' },
    { label: 'Pending joins', value: String(stats.users_pending), wash: 'butter' },
    { label: 'Society admins', value: String(stats.admins), wash: 'lilac' },
    { label: 'Guards', value: String(stats.guards), wash: 'peach' },
    { label: 'Residents', value: String(stats.residents), wash: 'sage' },
    { label: 'Visitors logged', value: String(stats.visitors), wash: 'coral' },
    {
      label: 'Open complaints',
      value: `${stats.complaints_open} / ${stats.complaints_total}`,
      wash: 'peach',
    },
    { label: 'Amenity bookings', value: String(stats.amenity_bookings), wash: 'mint' },
    { label: 'Notices', value: String(stats.notices), wash: 'sky' },
    {
      label: 'Payments confirmed',
      value: String(stats.payments_paid),
      wash: 'lilac',
    },
    {
      label: 'Payments pending',
      value: String(stats.payments_pending),
      wash: 'butter',
    },
    {
      label: 'Confirmed revenue',
      value: formatPaiseAsInr(stats.revenue_paise),
      wash: 'rose',
    },
  ];
}

export default function PlatformAnalyticsScreen() {
  const name = useAuthStore((s) => s.profile?.full_name?.split(' ')[0] ?? 'Operator');
  const { pastels, inkMuted, isDark } = useThemePalette();
  const [refreshing, setRefreshing] = useState(false);

  const statsQuery = useQuery({
    queryKey: queryKeys.platformStats,
    queryFn: fetchPlatformConsoleStats,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await statsQuery.refetch();
    setRefreshing(false);
  }, [statsQuery]);

  const cards = statsQuery.data ? buildCards(statsQuery.data) : [];

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <ThemedRefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
      >
        <View className="px-5 pb-2 pt-3">
          <Text className="text-xs font-semibold uppercase tracking-widest text-brand-800">
            Platform
          </Text>
          <Text
            className="mt-1 text-3xl text-ink"
            style={{ fontFamily: FontFamily.display }}
          >
            Analytics
          </Text>
          <Text className="mt-1 text-sm" style={{ color: inkMuted }}>
            Cross-society overview for {name}. Only your operator account can open this console.
          </Text>
        </View>

        {statsQuery.isError ? (
          <View className="px-5">
            <ErrorBanner
              message={
                statsQuery.error instanceof Error
                  ? statsQuery.error.message
                  : 'Could not load platform analytics'
              }
            />
            <Pressable
              onPress={() => void statsQuery.refetch()}
              className="mt-3 items-center rounded-xl bg-charcoal py-3"
            >
              <Text className="font-semibold text-white">Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {statsQuery.isLoading && !statsQuery.data ? (
          <View className="px-5 pt-4">
            <SkeletonList count={6} />
          </View>
        ) : null}

        {!statsQuery.isLoading && !statsQuery.isError && cards.length === 0 ? (
          <EmptyState
            visual="disconnected"
            title="No data yet"
            subtitle="Stats appear once societies and users exist."
          />
        ) : null}

        <View className="mt-4 flex-row flex-wrap gap-3 px-5">
          {cards.map((card) => (
            <View
              key={card.label}
              className="w-[47%] rounded-2xl p-4"
              style={{
                backgroundColor: pastels[card.wash],
                borderWidth: isDark ? 1 : 0,
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'transparent',
              }}
            >
              <Text className="text-xs font-medium" style={{ color: inkMuted }}>
                {card.label}
              </Text>
              <Text
                className="mt-2 text-2xl text-ink"
                style={{ fontFamily: FontFamily.heading }}
              >
                {card.value}
              </Text>
            </View>
          ))}
        </View>

        <View className="mx-5 mt-6 rounded-2xl border border-surface-border bg-surface-card p-4">
          <Text className="text-sm font-semibold text-ink" style={{ fontFamily: FontFamily.heading }}>
            Operator access
          </Text>
          <Text className="mt-1 text-sm" style={{ color: inkMuted }}>
            Society admins still only see their own society. This console is gated by the{' '}
            <Text style={{ color: Brand.primaryDark }}>platform_admins</Text> table — not by
            hard-coded client emails.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
