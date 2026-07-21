import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Bell,
  Building2,
  ChevronRight,
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
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { EmptyMailboxIllustration } from '@/components/illustrations';
import { DrawerMenuButton } from '@/components/navigation/drawer-menu-button';
import { AppCard, InitialsAvatar } from '@/components/ui/brand';
import { ListRow } from '@/components/ui/list-row';
import { BrandedRefreshMark, ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Gradients, Pastels } from '@/constants/theme';
import { fetchAdminDashboardStats } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { href } from '@/lib/href';
import { useAuthStore } from '@/stores/authStore';

type ActionRow = {
  title: string;
  subtitle: string;
  Icon: typeof Building2;
  path: string;
  tone: keyof typeof Pastels;
};

const STRUCTURE_ROWS: ActionRow[] = [
  { title: 'Towers', subtitle: 'Add and rename society buildings', Icon: Building2, path: '/(admin)/towers', tone: 'sky' },
  { title: 'Flats', subtitle: 'Map units to towers', Icon: Layers, path: '/(admin)/flats', tone: 'lilac' },
  { title: 'Invite links', subtitle: 'Share resident and guard codes', Icon: KeyRound, path: '/(admin)/invites', tone: 'peach' },
  { title: 'Join requests', subtitle: 'Approve new residents and guards', Icon: UserPlus, path: '/(admin)/join-requests', tone: 'butter' },
  { title: 'Residents', subtitle: 'Assign members to flats', Icon: Users, path: '/(admin)/residents', tone: 'mint' },
];

const OPERATIONS_ROWS: ActionRow[] = [
  { title: 'Post a notice', subtitle: 'Reach every resident', Icon: Bell, path: '/(admin)/notices', tone: 'sky' },
  { title: 'Complaints queue', subtitle: 'Triage helpdesk tickets', Icon: ClipboardList, path: '/(admin)/complaints', tone: 'rose' },
  { title: 'Staff directory', subtitle: 'Contacts residents can call', Icon: Phone, path: '/(admin)/staff', tone: 'mint' },
];

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

  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await statsQuery.refetch();
    setRefreshing(false);
  }, [statsQuery]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const compactHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [10, 46], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [10, 46], [8, 0], Extrapolation.CLAMP) },
    ],
  }));

  const heroTitleStyle = useAnimatedStyle(() => ({
    fontSize: interpolate(scrollY.value, [0, 60], [28, 20], Extrapolation.CLAMP),
    opacity: interpolate(scrollY.value, [0, 60], [1, 0.82], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [0, 60], [0, -8], Extrapolation.CLAMP) },
    ],
  }));

  const heroIllustrationStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 50], [1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(scrollY.value, [0, 50], [1, 0.6], Extrapolation.CLAMP) },
    ],
  }));

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
  const go = (path: string) => router.push(href(path));

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pb-1 pt-2">
        <DrawerMenuButton />
        <Animated.View style={[{ position: 'absolute', left: 56, right: 56, alignItems: 'center' }, compactHeaderStyle]}>
          <Text
            className="text-[15px] text-ink"
            numberOfLines={1}
            style={{ fontFamily: FontFamily.heading }}
          >
            Hello, {name}
          </Text>
        </Animated.View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="My profile"
          onPress={() => go('/(admin)/profile')}
        >
          <InitialsAvatar name={profile?.full_name ?? 'You'} seed={profile?.id} size={40} imageUrl={profile?.avatar_url} />
        </Pressable>
      </View>

      <Animated.ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <ThemedRefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
      >
        <View
          className="mb-5 overflow-hidden rounded-hero"
          style={{
            shadowColor: Brand.primaryDark,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 24,
            elevation: 5,
          }}
        >
          <LinearGradient
            colors={[...Gradients.hero]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 24, paddingVertical: 28 }}
          >
            <View className="flex-row items-center gap-3">
              <View className="min-w-0 flex-1">
                <Animated.Text
                  className="mb-1.5 font-bold text-white tracking-tight"
                  style={[{ fontFamily: FontFamily.display }, heroTitleStyle]}
                >
                  Hello, {name}
                </Animated.Text>
                <Text className="text-[15px] leading-5 text-white/85">
                  Structure, notices, and day-to-day society ops
                </Text>
              </View>
              <Animated.View style={heroIllustrationStyle}>
                <EmptyMailboxIllustration width={108} height={76} />
              </Animated.View>
            </View>
          </LinearGradient>
        </View>

        <BrandedRefreshMark visible={refreshing} />

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
                onPress={() => go('/(admin)/join-requests')}
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
          <View className="mb-2">
            <SkeletonList count={3} />
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
        <View className="mb-5 overflow-hidden rounded-panel bg-surface-card">
          {STRUCTURE_ROWS.map((row, index) => (
            <ListRow
              key={row.title}
              title={row.title}
              subtitle={row.subtitle}
              onPress={() => go(row.path)}
              last={index === STRUCTURE_ROWS.length - 1}
              leading={
                <View
                  className="h-11 w-11 items-center justify-center rounded-panel"
                  style={{ backgroundColor: Pastels[row.tone] }}
                >
                  <row.Icon color={Brand.primary} size={19} strokeWidth={1.5} />
                </View>
              }
              trailing={<ChevronRight color={Brand.inkMuted} size={16} strokeWidth={1.5} />}
            />
          ))}
        </View>

        <View className="mb-3 mt-1 flex-row items-center">
          <View className="mr-2 rounded-soft bg-pastel-peach p-2">
            <Settings2 color={Brand.accent} size={16} />
          </View>
          <Text className="text-lg text-ink" style={{ fontFamily: FontFamily.display }}>
            Operations
          </Text>
        </View>
        <View className="mb-4 overflow-hidden rounded-panel bg-surface-card">
          {OPERATIONS_ROWS.map((row, index) => (
            <ListRow
              key={row.title}
              title={row.title}
              subtitle={row.subtitle}
              onPress={() => go(row.path)}
              last={index === OPERATIONS_ROWS.length - 1}
              leading={
                <View
                  className="h-11 w-11 items-center justify-center rounded-panel"
                  style={{ backgroundColor: Pastels[row.tone] }}
                >
                  <row.Icon color={Brand.primary} size={19} strokeWidth={1.5} />
                </View>
              }
              trailing={<ChevronRight color={Brand.inkMuted} size={16} strokeWidth={1.5} />}
            />
          ))}
        </View>

        <Text className="mt-1 text-center text-sm text-ink-muted">
          More tools live under the More tab
        </Text>
      </Animated.ScrollView>
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
