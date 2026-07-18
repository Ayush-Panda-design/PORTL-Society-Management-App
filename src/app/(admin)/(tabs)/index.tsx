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
  TrendingUp,
  AlertCircle,
  Clock,
  LayoutGrid,
  Settings2,
} from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';

import { EmptyMailboxIllustration } from '@/components/illustrations';
import { DrawerMenuButton } from '@/components/navigation/drawer-menu-button';
import { AppCard, HeroBanner, InitialsAvatar, PressableActionTile } from '@/components/ui/brand';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <ThemedRefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
      >
        <View className="mb-3 flex-row items-center justify-between">
          <DrawerMenuButton />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="My profile"
            onPress={() => go('/(admin)/profile' as Href)}
          >
            <InitialsAvatar name={profile?.full_name ?? 'You'} seed={profile?.id} size={40} imageUrl={profile?.avatar_url} />
          </Pressable>
        </View>
        <HeroBanner
          title={`Hello, ${name}`}
          subtitle="Structure, notices, and day-to-day society ops"
          illustration={<EmptyMailboxIllustration width={108} height={76} />}
        />

        <Text
          className="mb-3 mt-2 text-lg text-ink"
          style={{ fontFamily: FontFamily.display }}
        >
          Today at a glance
        </Text>

        {statsQuery.error ? (
          <ErrorBanner
            message={statsQuery.error.message}
            onRetry={() => void statsQuery.refetch()}
          />
        ) : null}

        {/* ── Needs Attention card (urgent items only) ── */}
        {stats && (stats.pendingVisitorsToday > 0 || stats.openComplaints > 0) ? (
          <View
            style={{
              marginBottom: 16,
              borderRadius: 14,
              borderLeftWidth: 4,
              borderLeftColor: '#F59E0B',
              backgroundColor: '#FFFBEB',
              paddingHorizontal: 16,
              paddingVertical: 14,
              shadowColor: '#F59E0B',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <AlertCircle color="#D97706" size={16} />
              <Text style={{ fontFamily: FontFamily.heading, fontSize: 13, color: '#92400E', letterSpacing: 0.5 }}>
                NEEDS ATTENTION
              </Text>
            </View>
            {stats.pendingVisitorsToday > 0 ? (
              <Pressable
                onPress={() => go('/(admin)/join-requests' as Href)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B' }} />
                  <Text style={{ fontSize: 14, color: '#78350F' }}>
                    {stats.pendingVisitorsToday} pending visitor{stats.pendingVisitorsToday > 1 ? 's' : ''} today
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#D97706', fontFamily: FontFamily.heading }}>Review →</Text>
              </Pressable>
            ) : null}
            {stats.openComplaints > 0 ? (
              <Pressable
                onPress={() => go('/(admin)/complaints')}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' }} />
                  <Text style={{ fontSize: 14, color: '#78350F' }}>
                    {stats.openComplaints} open complaint{stats.openComplaints > 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#D97706', fontFamily: FontFamily.heading }}>Review →</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {statsQuery.isLoading && !stats ? (
          <View className="mb-2 h-36 items-center justify-center rounded-bubbly border border-surface-border bg-surface-card">
            <ActivityIndicator color={Brand.primary} />
          </View>
        ) : (
          <View className="mb-6 flex-row flex-wrap justify-between gap-y-3">
            <StatCard
              label="Residents"
              value={stats?.totalResidents ?? 0}
              onPress={() => go('/(admin)/residents')}
              pastel={Pastels.mint}
              width="100%"
              icon={<Users color={Brand.primary} size={24} />}
              trend="+2 this week"
            />
            <StatCard
              label="Pending visitors"
              value={stats?.pendingVisitorsToday ?? 0}
              hint="Today"
              pastel={Pastels.butter}
              width="48%"
              icon={<Clock color="#D97706" size={20} />}
            />
            <StatCard
              label="Open complaints"
              value={stats?.openComplaints ?? 0}
              onPress={() => go('/(admin)/complaints')}
              pastel={Pastels.rose}
              width="48%"
              icon={<AlertCircle color="#DC2626" size={20} />}
            />
          </View>
        )}

        <View className="mb-3 mt-1 flex-row items-center">
          <View className="mr-2 rounded-soft bg-pastel-mint p-2">
            <LayoutGrid color={Brand.primary} size={16} />
          </View>
          <Text className="text-lg text-ink" style={{ fontFamily: FontFamily.display }}>
            Structure
          </Text>
        </View>
        <View className="mb-5 rounded-bubbly bg-pastel-mint/50 p-2.5 dark:bg-surface-muted">
          <PressableActionTile
            title="Towers"
            subtitle="Add and rename society buildings"
            icon={<Building2 color={Brand.primary} size={20} />}
            onPress={() => go('/(admin)/towers' as Href)}
            tone="sky"
          />
          <PressableActionTile
            title="Flats"
            subtitle="Map units to towers"
            icon={<Layers color={Brand.primary} size={20} />}
            onPress={() => go('/(admin)/flats' as Href)}
            tone="lilac"
          />
          <PressableActionTile
            title="Invite links"
            subtitle="Share resident and guard codes"
            icon={<KeyRound color={Brand.primary} size={20} />}
            onPress={() => go('/(admin)/invites' as Href)}
            tone="peach"
          />
          <PressableActionTile
            title="Join requests"
            subtitle="Approve new residents and guards"
            icon={<UserPlus color={Brand.primary} size={20} />}
            onPress={() => go('/(admin)/join-requests' as Href)}
            tone="butter"
          />
          <PressableActionTile
            title="Residents"
            subtitle="Assign members to flats"
            icon={<Users color={Brand.primary} size={20} />}
            onPress={() => go('/(admin)/residents')}
            tone="mint"
          />
        </View>

        <View className="mb-3 mt-1 flex-row items-center">
          <View className="mr-2 rounded-soft bg-pastel-peach p-2">
            <Settings2 color={Brand.accent} size={16} />
          </View>
          <Text className="text-lg text-ink" style={{ fontFamily: FontFamily.display }}>
            Operations
          </Text>
        </View>
        <View className="mb-4 rounded-bubbly bg-pastel-peach/40 p-2.5 dark:bg-surface-muted">
          <PressableActionTile
            title="Post a notice"
            subtitle="Reach every resident"
            icon={<Bell color={Brand.primary} size={20} />}
            onPress={() => go('/(admin)/notices')}
            tone="sky"
          />
          <PressableActionTile
            title="Complaints queue"
            subtitle="Triage helpdesk tickets"
            icon={<ClipboardList color={Brand.primary} size={20} />}
            onPress={() => go('/(admin)/complaints')}
            tone="rose"
          />
          <PressableActionTile
            title="Staff directory"
            subtitle="Contacts residents can call"
            icon={<Phone color={Brand.primary} size={20} />}
            onPress={() => go('/(admin)/staff')}
            tone="mint"
          />
        </View>

        <Text className="mt-1 text-center text-sm text-ink-muted">
          More tools live under the More tab
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
  pastel,
  width = '47.5%',
  icon,
  trend,
}: {
  label: string;
  value: number;
  hint?: string;
  onPress?: () => void;
  pastel: string;
  width?: string | number;
  icon?: React.ReactNode;
  trend?: string;
}) {
  const content = (
    <AppCard className="w-full flex-1 border-0 p-5" style={{ backgroundColor: pastel }}>
      <View className="flex-row items-start justify-between">
        <View>
          <Text
            className="text-[34px] tracking-tight text-ink"
            style={{ fontFamily: FontFamily.display }}
          >
            {value}
          </Text>
          <Text className="mt-1 text-[15px] text-ink-soft" numberOfLines={1} style={{ fontFamily: FontFamily.medium }}>
            {label}
          </Text>
          {hint ? <Text className="mt-1 text-[12px] text-ink-muted">{hint}</Text> : null}
          {trend ? (
            <View className="mt-2.5 flex-row items-center self-start rounded-full bg-white/55 px-2.5 py-1">
              <TrendingUp color={Brand.primary} size={14} />
              <Text className="ml-1 text-xs text-brand-800" style={{ fontFamily: FontFamily.heading }}>
                {trend}
              </Text>
            </View>
          ) : null}
        </View>
        {icon ? (
          <View className="h-11 w-11 items-center justify-center rounded-soft bg-white/50">
            {icon}
          </View>
        ) : null}
      </View>
    </AppCard>
  );

  return (
    <View style={{ width: width as number | `${number}%` }}>
      {onPress ? (
        <Pressable className="flex-1" onPress={onPress}>
          {content}
        </Pressable>
      ) : (
        <View className="flex-1">{content}</View>
      )}
    </View>
  );
}
