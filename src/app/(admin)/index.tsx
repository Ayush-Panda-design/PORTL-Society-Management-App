import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import {
  Bell,
  Building2,
  ClipboardList,
  KeyRound,
  Layers,
  Phone,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, AlertCircle, Clock, ShieldAlert, LayoutGrid, Settings2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';

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
          subtitle="Finish onboarding to create or join a society."
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
          <View className="mb-6 flex-row flex-wrap justify-between gap-y-3">
            <StatCard
              label="Residents"
              value={stats?.totalResidents ?? 0}
              onPress={() => go('/(admin)/residents')}
              color="brand"
              width="100%"
              icon={<Users color="#0F766E" size={24} />}
              trend="+2 this week"
            />
            <StatCard
              label="Pending visitors"
              value={stats?.pendingVisitorsToday ?? 0}
              hint="Today"
              color="pending"
              width="48%"
              icon={<Clock color="#D97706" size={20} />}
            />
            <StatCard
              label="Open complaints"
              value={stats?.openComplaints ?? 0}
              onPress={() => go('/(admin)/complaints')}
              color="rejected"
              width="48%"
              icon={<AlertCircle color="#DC2626" size={20} />}
            />
          </View>
        )}

        <View className="flex-row items-center mb-3 mt-4">
          <View className="bg-brand-50 p-1.5 rounded-lg mr-2">
            <LayoutGrid color={Brand.primary} size={16} />
          </View>
          <Text
            className="text-lg font-bold text-ink"
            style={{ fontFamily: FontFamily.heading }}
          >
            Structure
          </Text>
        </View>
        <View className="bg-surface-muted/30 rounded-2xl p-2 mb-4">
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
          title="Invite links"
          subtitle="Share resident and guard codes"
          icon={<KeyRound color={Brand.primary} size={20} />}
          onPress={() => go('/(admin)/invites' as Href)}
        />
        <PressableActionTile
          title="Join requests"
          subtitle="Approve new residents and guards"
          icon={<UserPlus color={Brand.primary} size={20} />}
          onPress={() => go('/(admin)/join-requests' as Href)}
        />
        <PressableActionTile
          title="Residents"
          subtitle="Assign members to flats"
          icon={<Users color={Brand.primary} size={20} />}
          onPress={() => go('/(admin)/residents')}
        />

        </View>

        <View className="flex-row items-center mb-3 mt-2">
          <View className="bg-accent-soft p-1.5 rounded-lg mr-2">
            <Settings2 color="#D97706" size={16} />
          </View>
          <Text
            className="text-lg font-bold text-ink"
            style={{ fontFamily: FontFamily.heading }}
          >
            Operations
          </Text>
        </View>
        <View className="bg-surface-muted/30 rounded-2xl p-2 mb-4">
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

        </View>

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
  color = 'brand',
  width = '47.5%',
  icon,
  trend,
}: {
  label: string;
  value: number;
  hint?: string;
  onPress?: () => void;
  color?: 'brand' | 'pending' | 'rejected' | 'info';
  width?: string | number;
  icon?: React.ReactNode;
  trend?: string;
}) {
  const bgClasses = {
    brand: 'bg-brand-soft-bg',
    pending: 'bg-yellow-50 dark:bg-yellow-900/20',
    rejected: 'bg-red-50 dark:bg-red-900/20',
    info: 'bg-blue-50 dark:bg-blue-900/20',
  };

  const textClasses = {
    brand: 'text-brand-900',
    pending: 'text-amber-900',
    rejected: 'text-red-900',
    info: 'text-blue-900',
  };

  const content = (
    <AppCard className={`w-full flex-1 p-4 ${bgClasses[color]}`}>
      <View className="flex-row justify-between items-start">
        <View>
          <Text className={`text-[32px] ${textClasses[color]} tracking-tight`} style={{ fontFamily: FontFamily.display }}>
            {value}
          </Text>
          <Text className={`mt-1 text-[15px] font-medium ${textClasses[color]} opacity-80`} numberOfLines={1}>
            {label}
          </Text>
          {hint ? <Text className={`mt-1 text-[12px] ${textClasses[color]} opacity-60`}>{hint}</Text> : null}
          {trend ? (
            <View className="flex-row items-center mt-2 bg-white/40 self-start px-2 py-1 rounded-md">
              <TrendingUp color="#0F766E" size={14} className="mr-1" />
              <Text className="text-xs text-brand-900 font-bold">{trend}</Text>
            </View>
          ) : null}
        </View>
        {icon ? <View className="opacity-80">{icon}</View> : null}
      </View>
    </AppCard>
  );

  return (
    <View style={{ width: width as any }}>
      {onPress ? <Pressable className="flex-1" onPress={onPress}>{content}</Pressable> : <View className="flex-1">{content}</View>}
    </View>
  );
}
