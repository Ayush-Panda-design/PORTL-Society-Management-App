import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Clock,
  Search,
  Users,
  X,
} from 'lucide-react-native';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import {
  ClipboardChecklistIllustration,
  FlatsDoorIllustration,
  MegaphoneIllustration,
  MembersApproveIllustration,
  ServiceComplaintsIcon,
  ServiceInvitesIcon,
  ServiceNoticesIcon,
  ServiceResidentsIcon,
  ServiceStaffIcon,
  ServiceTowersIcon,
  ShareLinkIllustration,
  StaffPhoneIllustration,
  TowersMiniIllustration,
} from '@/components/illustrations';
import { DrawerMenuButton } from '@/components/navigation/drawer-menu-button';
import { AskPortlFloatingFab } from '@/components/ask-portl/ask-portl-orb';
import { InitialsAvatar } from '@/components/ui/brand';
import { BrandedRefreshMark, ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, SocietyImages, type PastelTone } from '@/constants/theme';
import { CountBadge } from '@/components/ui/count-badge';
import { useFeatureBadges } from '@/hooks/use-feature-badges';
import { adminRouteNameFromHref, canAccessAdminRoute } from '@/lib/admin-access';
import { fetchAdminDashboardStats, fetchResidents } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { href } from '@/lib/href';
import { flatTowerName } from '@/lib/visitors';
import { useAuthStore } from '@/stores/authStore';
import { useThemePalette } from '@/hooks/use-theme';
import type { ProfileWithFlat } from '@/types/database';

const SEARCHABLE_TOOLS: { title: string; subtitle: string; path: string; keywords: string }[] = [
  { title: 'Ask Portl', subtitle: 'Society ops assistant', path: '/(admin)/ask-portl', keywords: 'ask portl ai assistant help chat' },
  { title: 'Towers', subtitle: 'Buildings & structure', path: '/(admin)/towers', keywords: 'towers buildings structure' },
  { title: 'Flats', subtitle: 'Map units to towers', path: '/(admin)/flats', keywords: 'flats units apartments' },
  { title: 'Invites', subtitle: 'Share join codes', path: '/(admin)/invites', keywords: 'invites invite links codes share' },
  { title: 'Members', subtitle: 'Approve join requests', path: '/(admin)/join-requests', keywords: 'members join requests approvals pending' },
  { title: 'Residents', subtitle: 'Assign flats', path: '/(admin)/residents', keywords: 'residents people members flats' },
  { title: 'Notices', subtitle: 'Post announcements', path: '/(admin)/notices', keywords: 'notices announcements post' },
  { title: 'Complaints', subtitle: 'Helpdesk queue', path: '/(admin)/complaints', keywords: 'complaints helpdesk tickets issues' },
  { title: 'Staff', subtitle: 'Staff directory', path: '/(admin)/staff', keywords: 'staff directory contacts phone' },
  { title: 'Amenities', subtitle: 'Facilities & bookings', path: '/(admin)/amenities', keywords: 'amenities facilities bookings' },
];

function residentFlatLabel(profile: ProfileWithFlat): string {
  if (!profile.flats) return 'No flat assigned';
  const tower = flatTowerName(profile.flats.towers);
  return tower ? `${tower} · Flat ${profile.flats.number}` : `Flat ${profile.flats.number}`;
}

type ServiceItem = {
  label: string;
  path: string;
  icon: ReactNode;
};

type MoreTile = {
  title: string;
  subtitle: string;
  path: string;
  wash: PastelTone;
  illustration: ReactNode;
};

const SERVICES: ServiceItem[] = [
  { label: 'Towers', path: '/(admin)/towers', icon: <ServiceTowersIcon size={58} /> },
  { label: 'Residents', path: '/(admin)/residents', icon: <ServiceResidentsIcon size={58} /> },
  { label: 'Invites', path: '/(admin)/invites', icon: <ServiceInvitesIcon size={58} /> },
  { label: 'Notices', path: '/(admin)/notices', icon: <ServiceNoticesIcon size={58} /> },
  { label: 'Complaints', path: '/(admin)/complaints', icon: <ServiceComplaintsIcon size={58} /> },
  { label: 'Staff', path: '/(admin)/staff', icon: <ServiceStaffIcon size={58} /> },
];

const MORE_TILES: MoreTile[] = [
  {
    title: 'Flats',
    subtitle: 'Map units to towers',
    path: '/(admin)/flats',
    wash: 'lilac',
    illustration: <FlatsDoorIllustration width={64} height={50} />,
  },
  {
    title: 'Members',
    subtitle: 'Approve joiners',
    path: '/(admin)/join-requests',
    wash: 'mint',
    illustration: <MembersApproveIllustration width={64} height={50} />,
  },
  {
    title: 'Invite links',
    subtitle: 'Share access codes',
    path: '/(admin)/invites',
    wash: 'butter',
    illustration: <ShareLinkIllustration width={64} height={50} />,
  },
  {
    title: 'Directory',
    subtitle: 'Staff contacts',
    path: '/(admin)/staff',
    wash: 'sky',
    illustration: <StaffPhoneIllustration width={64} height={50} />,
  },
];

export default function AdminHome() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const permissions = useAuthStore((s) => s.permissions);
  const role = profile?.role;
  const societyId = profile?.society_id;
  const name = profile?.full_name?.split(' ')[0] ?? 'Admin';
  const { pastels, isDark, inkMuted } = useThemePalette();
  const badges = useFeatureBadges();

  const statsQuery = useQuery({
    queryKey: queryKeys.adminDashboard(societyId ?? 'none'),
    queryFn: () => fetchAdminDashboardStats(societyId!),
    enabled: Boolean(societyId),
  });

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const scrollY = useSharedValue(0);

  const residentsQuery = useQuery({
    queryKey: queryKeys.residents(societyId ?? 'none'),
    queryFn: () => fetchResidents(societyId!),
    enabled: Boolean(societyId) && canAccessAdminRoute('residents', role, permissions),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([statsQuery.refetch(), residentsQuery.refetch()]);
    setRefreshing(false);
  }, [residentsQuery, statsQuery]);

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

  const query = search.trim().toLowerCase();

  const services = useMemo(
    () =>
      SERVICES.filter((item) =>
        canAccessAdminRoute(adminRouteNameFromHref(item.path), role, permissions),
      ),
    [permissions, role],
  );

  const moreTiles = useMemo(
    () =>
      MORE_TILES.filter((item) =>
        canAccessAdminRoute(adminRouteNameFromHref(item.path), role, permissions),
      ),
    [permissions, role],
  );

  const toolHits = useMemo(() => {
    if (!query) return [];
    return SEARCHABLE_TOOLS.filter((tool) =>
      canAccessAdminRoute(adminRouteNameFromHref(tool.path), role, permissions),
    )
      .filter((tool) =>
        `${tool.title} ${tool.subtitle} ${tool.keywords}`.toLowerCase().includes(query),
      )
      .slice(0, 6);
  }, [permissions, query, role]);

  const residentHits = useMemo(() => {
    if (!query) return [];
    return (residentsQuery.data ?? [])
      .filter((p) => {
        const hay = [p.full_name ?? '', p.phone ?? '', residentFlatLabel(p)].join(' ').toLowerCase();
        return hay.includes(query);
      })
      .slice(0, 6);
  }, [query, residentsQuery.data]);

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
  const pendingJoins = badges.joinRequests;
  const unreadComplaints = badges.complaints;
  const openComplaints = stats?.openComplaints ?? 0;
  const residents = stats?.totalResidents ?? 0;
  const showSearchResults = query.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-1">
      <View className="z-10 flex-row items-center justify-between px-5 pb-1 pt-2">
        <DrawerMenuButton />
        <Animated.View
          style={[{ position: 'absolute', left: 56, right: 56, alignItems: 'center' }, compactHeaderStyle]}
        >
          <Text className="text-[15px] text-ink" numberOfLines={1} style={{ fontFamily: FontFamily.heading }}>
            Hello, {name}
          </Text>
        </Animated.View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="My profile"
          onPress={() => go('/(admin)/profile')}
        >
          <InitialsAvatar
            name={profile?.full_name ?? 'You'}
            seed={profile?.id}
            size={40}
            imageUrl={profile?.avatar_url}
          />
        </Pressable>
      </View>

      <Animated.ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 88 }}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <ThemedRefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
      >
        {/* Grab-style layered header */}
        <View className="mb-3 overflow-hidden px-5 pt-1">
          <View
            className="overflow-hidden rounded-[24px]"
            style={{
              backgroundColor: isDark ? '#2C2C2C' : pastels.sky,
              minHeight: 148,
            }}
          >
            <Image
              source={{ uri: SocietyImages.heroResidence }}
              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '58%' }}
              contentFit="cover"
              transition={280}
            />
            {isDark ? (
              <LinearGradient
                colors={['#2C2C2C', 'rgba(44,44,44,0.92)', 'rgba(44,44,44,0.5)', 'rgba(34,34,34,0.15)']}
                locations={[0, 0.4, 0.7, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
              />
            ) : (
              <LinearGradient
                colors={['#E8F0FE', 'rgba(232,240,254,0.92)', 'rgba(232,240,254,0.35)', 'transparent']}
                locations={[0, 0.42, 0.68, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
              />
            )}
            {isDark ? (
              <LinearGradient
                colors={['transparent', 'rgba(14,13,16,0.55)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
              />
            ) : null}
            <View className="justify-between px-4 py-4" style={{ minHeight: 148, maxWidth: '62%' }}>
              <View>
                <Text className="text-[12px] text-ink-soft" style={{ fontFamily: FontFamily.medium }}>
                  Society ops
                </Text>
                <Text
                  className="mt-1 text-[22px] leading-7 text-ink"
                  style={{ fontFamily: FontFamily.display }}
                >
                  Hello, {name}
                </Text>
                <Text className="mt-1.5 text-[13px] leading-[18px] text-ink-soft">
                  Manage towers, residents, and day-to-day work.
                </Text>
              </View>
              <Pressable
                onPress={() => go('/(admin)/invites')}
                accessibilityRole="button"
                accessibilityLabel="Invite residents"
                className="mt-3 h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: Brand.primary }}
              >
                <ArrowRight color="#fff" size={18} strokeWidth={2} />
              </Pressable>
            </View>
          </View>
        </View>

        <View className="px-5">
          <BrandedRefreshMark visible={refreshing} />

          {/* Real search — tools + residents */}
          <View className="mb-4">
            <View
              className="flex-row items-center rounded-pill bg-surface-card px-4 py-1"
              style={{
                shadowColor: '#0F172A',
                shadowOpacity: 0.07,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 4 },
                elevation: 3,
              }}
            >
              <Search color={inkMuted} size={18} strokeWidth={1.5} />
              <TextInput
                accessibilityLabel="Search residents and tools"
                className="ml-2.5 min-h-[44px] flex-1 text-[15px] text-ink"
                style={{ fontFamily: FontFamily.body, paddingVertical: 10 }}
                placeholder="Search residents, flats, tools…"
                placeholderTextColor={inkMuted}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="never"
              />
              {search.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  hitSlop={8}
                  onPress={() => setSearch('')}
                  className="h-7 w-7 items-center justify-center rounded-full bg-surface-muted"
                >
                  <X color={Brand.inkMuted} size={14} />
                </Pressable>
              ) : null}
            </View>

            {showSearchResults ? (
              <View
                className="mt-2 overflow-hidden rounded-[18px] bg-surface-card"
                style={{
                  shadowColor: '#0F172A',
                  shadowOpacity: 0.08,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 3,
                }}
              >
                {toolHits.length === 0 && residentHits.length === 0 ? (
                  <Text className="px-4 py-4 text-[13px] text-ink-muted">
                    No matches for “{search.trim()}”
                  </Text>
                ) : (
                  <>
                    {toolHits.length > 0 ? (
                      <View>
                        <Text
                          className="px-4 pb-1 pt-3 text-[11px] uppercase tracking-wide text-ink-muted"
                          style={{ fontFamily: FontFamily.heading }}
                        >
                          Tools
                        </Text>
                        {toolHits.map((tool, index) => (
                          <Pressable
                            key={tool.path}
                            onPress={() => {
                              setSearch('');
                              go(tool.path);
                            }}
                            className="flex-row items-center px-4 py-3"
                            style={{
                              borderTopWidth: index === 0 ? 0 : 1,
                              borderTopColor: '#F0F0F2',
                            }}
                          >
                            <View className="min-w-0 flex-1">
                              <Text className="text-[14px] text-ink" style={{ fontFamily: FontFamily.heading }}>
                                {tool.title}
                              </Text>
                              <Text className="mt-0.5 text-[12px] text-ink-muted">{tool.subtitle}</Text>
                            </View>
                            <ChevronRight color={Brand.inkMuted} size={16} strokeWidth={1.5} />
                          </Pressable>
                        ))}
                      </View>
                    ) : null}

                    {residentHits.length > 0 ? (
                      <View>
                        <Text
                          className="px-4 pb-1 pt-3 text-[11px] uppercase tracking-wide text-ink-muted"
                          style={{ fontFamily: FontFamily.heading }}
                        >
                          Residents
                        </Text>
                        {residentHits.map((person, index) => (
                          <Pressable
                            key={person.id}
                            onPress={() => {
                              const q = search.trim();
                              setSearch('');
                              router.push(href(`/(admin)/residents?q=${encodeURIComponent(q)}`));
                            }}
                            className="flex-row items-center gap-3 px-4 py-3"
                            style={{
                              borderTopWidth: index === 0 && toolHits.length === 0 ? 0 : 1,
                              borderTopColor: '#F0F0F2',
                            }}
                          >
                            <InitialsAvatar
                              name={person.full_name ?? 'R'}
                              seed={person.id}
                              size={36}
                              imageUrl={person.avatar_url}
                            />
                            <View className="min-w-0 flex-1">
                              <Text className="text-[14px] text-ink" style={{ fontFamily: FontFamily.heading }}>
                                {person.full_name ?? 'Unnamed'}
                              </Text>
                              <Text className="mt-0.5 text-[12px] text-ink-muted">
                                {residentFlatLabel(person)}
                              </Text>
                            </View>
                            <ChevronRight color={Brand.inkMuted} size={16} strokeWidth={1.5} />
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </>
                )}
              </View>
            ) : null}
          </View>

          {statsQuery.error ? (
            <ErrorBanner
              message={statsQuery.error.message}
              onRetry={() => void statsQuery.refetch()}
            />
          ) : null}

          {/* Service icon grid */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 14, paddingRight: 8, paddingBottom: 4 }}
            className="mb-2"
          >
            {services.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => go(item.path)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                className="w-[72px] items-center"
              >
                {item.icon}
                <Text
                  className="mt-2 text-center text-[12px] text-ink"
                  style={{ fontFamily: FontFamily.heading }}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View className="mb-4 mt-1 flex-row items-center justify-center gap-1.5">
            <View className="h-1 w-5 rounded-pill" style={{ backgroundColor: Brand.primary }} />
            <View className="h-1 w-3 rounded-pill bg-surface-muted" />
          </View>

          {/* Compact white metric cards */}
          {statsQuery.isLoading && !stats ? (
            <View className="mb-4">
              <SkeletonList count={1} />
            </View>
          ) : (
            <View className="mb-4 flex-row gap-2.5">
              <StatMini
                value={residents}
                label="Residents"
                icon={<Users color="#059669" size={14} strokeWidth={1.5} />}
                onPress={() => go('/(admin)/residents')}
              />
              <StatMini
                value={pendingJoins}
                label="Joins"
                icon={<Clock color="#D97706" size={14} strokeWidth={1.5} />}
                onPress={() => go('/(admin)/join-requests')}
                badgeCount={pendingJoins}
              />
              <StatMini
                value={openComplaints}
                label="Open"
                icon={<AlertCircle color={Brand.primary} size={14} strokeWidth={1.5} />}
                onPress={() => go('/(admin)/complaints')}
                badgeCount={unreadComplaints}
              />
            </View>
          )}

          {stats && (pendingJoins > 0 || unreadComplaints > 0 || openComplaints > 0) ? (
            <Pressable
              onPress={() =>
                go(
                  unreadComplaints > 0 || openComplaints > 0
                    ? '/(admin)/complaints'
                    : '/(admin)/join-requests',
                )
              }
              className="mb-4 flex-row items-center gap-3 rounded-[18px] bg-surface-card px-3.5 py-3"
              style={{
                shadowColor: '#0F172A',
                shadowOpacity: 0.06,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 3 },
                elevation: 2,
              }}
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: pastels.rose }}
              >
                <AlertCircle color={Brand.primary} size={18} strokeWidth={1.5} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-[14px] text-ink" style={{ fontFamily: FontFamily.heading }}>
                  Needs attention
                </Text>
                <Text className="mt-0.5 text-[12px] text-ink-muted" numberOfLines={1}>
                  {[
                    pendingJoins > 0 ? `${pendingJoins} join request${pendingJoins === 1 ? '' : 's'}` : null,
                    unreadComplaints > 0
                      ? `${unreadComplaints} unread complaint${unreadComplaints === 1 ? '' : 's'}`
                      : openComplaints > 0
                        ? `${openComplaints} open complaint${openComplaints === 1 ? '' : 's'}`
                        : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <ChevronRight color={Brand.inkMuted} size={16} strokeWidth={1.5} />
            </Pressable>
          ) : null}

          {/* Featured photo banner */}
          <Pressable
            onPress={() => go('/(admin)/amenities')}
            accessibilityRole="button"
            accessibilityLabel="Manage amenities"
            className="mb-5 overflow-hidden rounded-[22px]"
            style={{
              shadowColor: '#0F172A',
              shadowOpacity: 0.1,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 4,
            }}
          >
            <Image
              source={{ uri: SocietyImages.communityBanner }}
              style={{ width: '100%', height: 148 }}
              contentFit="cover"
              transition={280}
            />
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(14,13,16,0.15)', 'rgba(14,13,16,0.72)', 'rgba(14,13,16,0.92)']
                  : ['rgba(15,23,42,0.15)', 'rgba(15,23,42,0.45)', 'rgba(15,23,42,0.72)']
              }
              locations={[0, 0.45, 1]}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <LinearGradient
              colors={['transparent', 'rgba(15,23,42,0.55)', 'rgba(15,23,42,0.88)']}
              style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 100 }}
            />
            <View className="absolute bottom-0 left-0 right-0 px-4 pb-3.5">
              <View
                className="mb-2 self-start rounded-pill px-2.5 py-1"
                style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}
              >
                <Text className="text-[10px]" style={{ fontFamily: FontFamily.heading, color: Brand.primary }}>
                  Amenities
                </Text>
              </View>
              <Text className="text-[17px] text-white" style={{ fontFamily: FontFamily.display }}>
                Keep facilities ready for residents
              </Text>
              <Text className="mt-0.5 text-[12px] text-white/80">Manage bookings · covers · fees</Text>
            </View>
          </Pressable>

          {/* Ops rows */}
          <Text className="mb-2.5 text-[17px] text-ink" style={{ fontFamily: FontFamily.display }}>
            Today&apos;s work
          </Text>
          <View className="mb-5 gap-2.5">
            <OpsRow
              title="Post a notice"
              subtitle="Reach every resident"
              wash={pastels.butter}
              illustration={<MegaphoneIllustration width={72} height={58} />}
              onPress={() => go('/(admin)/notices')}
            />
            <OpsRow
              title="Complaints queue"
              subtitle="Triage helpdesk tickets"
              wash={pastels.coral}
              illustration={<ClipboardChecklistIllustration width={72} height={58} />}
              onPress={() => go('/(admin)/complaints')}
            />
            <OpsRow
              title="Society structure"
              subtitle="Towers, flats & invites"
              wash={pastels.sky}
              illustration={<TowersMiniIllustration width={72} height={58} />}
              onPress={() => go('/(admin)/towers')}
            />
          </View>

          {/* More tools grid */}
          <Text className="mb-2.5 text-[17px] text-ink" style={{ fontFamily: FontFamily.display }}>
            More tools
          </Text>
          <View className="mb-2 flex-row flex-wrap justify-between gap-y-2.5">
            {moreTiles.map((tile) => (
              <Pressable
                key={tile.title}
                onPress={() => go(tile.path)}
                accessibilityRole="button"
                accessibilityLabel={tile.title}
                className="overflow-hidden rounded-[18px] px-3 pb-2 pt-3"
                style={{ width: '48.5%', backgroundColor: pastels[tile.wash] }}
              >
                <Text className="text-[14px] text-ink" style={{ fontFamily: FontFamily.heading }}>
                  {tile.title}
                </Text>
                <Text className="mt-0.5 text-[11px] text-ink-muted">{tile.subtitle}</Text>
                <View className="mt-1 items-end">{tile.illustration}</View>
              </Pressable>
            ))}
          </View>

          <Text className="mt-3 text-center text-[12px] text-ink-muted">
            More tools live under the More tab
          </Text>
        </View>
      </Animated.ScrollView>
      <AskPortlFloatingFab onPress={() => go('/(admin)/ask-portl')} />
      </View>
    </SafeAreaView>
  );
}

function StatMini({
  value,
  label,
  icon,
  onPress,
  badgeCount = 0,
}: {
  value: number;
  label: string;
  icon: ReactNode;
  onPress: () => void;
  badgeCount?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        badgeCount > 0 ? `${label}: ${value}, ${badgeCount} new` : `${label}: ${value}`
      }
      className="flex-1 rounded-[16px] bg-surface-card px-2.5 py-3"
      style={{
        shadowColor: '#0F172A',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      }}
    >
      <View className="mb-1.5 flex-row items-center justify-between">
        <View className="relative">
          {icon}
          {badgeCount > 0 ? (
            <View className="absolute -right-2.5 -top-2">
              <CountBadge count={badgeCount} size="sm" />
            </View>
          ) : null}
        </View>
        <Text className="text-[18px] text-ink" style={{ fontFamily: FontFamily.display }}>
          {value}
        </Text>
      </View>
      <Text className="text-[11px] text-ink-soft" numberOfLines={1} style={{ fontFamily: FontFamily.heading }}>
        {label}
      </Text>
    </Pressable>
  );
}

function OpsRow({
  title,
  subtitle,
  wash,
  illustration,
  onPress,
}: {
  title: string;
  subtitle: string;
  wash: string;
  illustration: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      className="flex-row items-center overflow-hidden rounded-[20px] px-3.5 py-3"
      style={{
        backgroundColor: wash,
        shadowColor: '#0F172A',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}
    >
      <View className="min-w-0 flex-1 pr-2">
        <Text className="text-[15px] text-ink" style={{ fontFamily: FontFamily.heading }}>
          {title}
        </Text>
        <Text className="mt-0.5 text-[12px] text-ink-muted">{subtitle}</Text>
      </View>
      {illustration}
    </Pressable>
  );
}
