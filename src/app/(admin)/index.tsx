import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import {
  Bell,
  Building2,
  ClipboardList,
  Layers,
  Phone,
  Users,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyMailboxIllustration } from '@/components/illustrations';
import { AppCard, HeroBanner, PressableActionTile } from '@/components/ui/brand';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { Brand, FontFamily } from '@/constants/theme';
import { fetchAdminDashboardStats } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';

export default function AdminHome() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const societyId = profile?.society_id;
  const name = profile?.full_name?.split(' ')[0] ?? 'Admin';

  const statsQuery = useQuery({
    queryKey: queryKeys.adminDashboard(societyId ?? 'none'),
    queryFn: () => fetchAdminDashboardStats(societyId!),
    enabled: Boolean(societyId),
  });

  if (!societyId) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Assign a society to your admin profile."
        />
      </SafeAreaView>
    );
  }

  const stats = statsQuery.data;
  const go = (href: Href) => router.push(href);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await statsQuery.refetch();
    setRefreshing(false);
  }, [statsQuery]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <ThemedRefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
      >
        <HeroBanner
          title={`Welcome, ${name}`}
          subtitle="Structure, notices, and day-to-day society ops"
          illustration={<EmptyMailboxIllustration width={110} height={78} />}
        />

        <Text
          className="mb-3 mt-5 text-base text-ink"
          style={{ fontFamily: FontFamily.heading }}
        >
          Today at a glance
        </Text>

        {statsQuery.error ? (
          <ErrorBanner
            message={statsQuery.error.message}
            onRetry={() => void statsQuery.refetch()}
          />
        ) : null}

        {statsQuery.isLoading && !stats ? (
          <View className="mb-2 h-36 items-center justify-center rounded-2xl border border-surface-border bg-surface-card">
            <ActivityIndicator color={Brand.primary} />
          </View>
        ) : (
          <View className="mb-2 flex-row flex-wrap gap-3">
            <StatCard
              label="Residents"
              value={stats?.totalResidents ?? 0}
              onPress={() => go('/(admin)/residents')}
            />
            <StatCard
              label="Pending visitors"
              value={stats?.pendingVisitorsToday ?? 0}
              hint="Today"
            />
            <StatCard
              label="Open complaints"
              value={stats?.openComplaints ?? 0}
              onPress={() => go('/(admin)/complaints')}
            />
            <StatCard
              label="Active polls"
              value={stats?.activePolls ?? 0}
              onPress={() => go('/(admin)/polls')}
            />
          </View>
        )}

        <Text
          className="mb-3 mt-4 text-base text-ink"
          style={{ fontFamily: FontFamily.heading }}
        >
          Structure
        </Text>
        <PressableActionTile
          title="Towers"
          subtitle="Add and rename society buildings"
          icon={<Building2 color={Brand.primary} size={20} />}
          onPress={() => go('/(admin)/towers' as Href)}
        />
        <PressableActionTile
          title="Flats"
          subtitle="Map units to towers"
          icon={<Layers color={Brand.primary} size={20} />}
          onPress={() => go('/(admin)/flats' as Href)}
        />
        <PressableActionTile
          title="Residents"
          subtitle="Assign members to flats"
          icon={<Users color={Brand.primary} size={20} />}
          onPress={() => go('/(admin)/residents')}
        />

        <Text
          className="mb-3 mt-2 text-base text-ink"
          style={{ fontFamily: FontFamily.heading }}
        >
          Operations
        </Text>
        <PressableActionTile
          title="Post a notice"
          subtitle="Reach every resident"
          icon={<Bell color={Brand.primary} size={20} />}
          onPress={() => go('/(admin)/notices')}
        />
        <PressableActionTile
          title="Complaints queue"
          subtitle="Triage helpdesk tickets"
          icon={<ClipboardList color={Brand.primary} size={20} />}
          onPress={() => go('/(admin)/complaints')}
        />
        <PressableActionTile
          title="Staff directory"
          subtitle="Contacts residents can call"
          icon={<Phone color={Brand.primary} size={20} />}
          onPress={() => go('/(admin)/staff')}
        />

        <Text className="mt-1 text-center text-sm text-ink-muted">
          More tools live under the Manage tab
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  hint,
  onPress,
}: {
  label: string;
  value: number;
  hint?: string;
  onPress?: () => void;
}) {
  const content = (
    <AppCard className="w-full p-3.5">
      <Text className="text-2xl text-ink" style={{ fontFamily: FontFamily.display }}>
        {value}
      </Text>
      <Text className="mt-0.5 text-sm text-ink-muted" numberOfLines={1}>
        {label}
      </Text>
      {hint ? <Text className="mt-0.5 text-[11px] text-ink-faint">{hint}</Text> : null}
    </AppCard>
  );

  return (
    <View style={{ width: '47.5%' }}>
      {onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content}
    </View>
  );
}
