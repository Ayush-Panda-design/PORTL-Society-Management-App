import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import {
  BadgeCheck,
  MessageSquare,
  Phone,
  ShieldCheck,
  Stethoscope,
  Users,
  Wrench,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, Text, View } from 'react-native';

import { AppCard, AvatarRing, InitialsAvatar } from '@/components/ui/brand';
import { ChipSelector } from '@/components/ui/chip-selector';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchField } from '@/components/ui/search-field';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { fetchDirectoryMembers, fetchStaff } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { flatTowerName } from '@/lib/visitors';
import { useAuthStore } from '@/stores/authStore';
import type { ProfileWithFlat, StaffMember } from '@/types/database';

type Tab = 'Security' | 'Staff' | 'Emergency' | 'Residents' | 'Admins';

const TABS: { value: Tab; label: string }[] = [
  { value: 'Security', label: 'Security' },
  { value: 'Staff', label: 'Staff' },
  { value: 'Emergency', label: 'Emergency' },
  { value: 'Residents', label: 'Residents' },
  { value: 'Admins', label: 'Admins' },
];

const ROLE_META: Record<
  string,
  { Icon: typeof ShieldCheck; color: string; bg: string; tab: Tab }
> = {
  Security: { Icon: ShieldCheck, color: '#C0392B', bg: Pastels.rose, tab: 'Security' },
  Guard: { Icon: ShieldCheck, color: '#C0392B', bg: Pastels.rose, tab: 'Security' },
  Housekeeping: { Icon: Wrench, color: Brand.primary, bg: Pastels.mint, tab: 'Staff' },
  Maintenance: { Icon: Wrench, color: Brand.primary, bg: Pastels.mint, tab: 'Staff' },
  Emergency: { Icon: Stethoscope, color: '#C0392B', bg: Pastels.rose, tab: 'Emergency' },
  Medical: { Icon: Stethoscope, color: '#C0392B', bg: Pastels.rose, tab: 'Emergency' },
};

function getRoleMeta(role: string) {
  return (
    ROLE_META[role] ?? {
      Icon: Wrench,
      color: Brand.inkMuted,
      bg: Pastels.sage,
      tab: 'Staff' as Tab,
    }
  );
}

function memberFlatLabel(profile: ProfileWithFlat): string {
  if (!profile.flats) return 'Flat unassigned';
  const tower = flatTowerName(profile.flats.towers);
  return tower ? `${tower} · Flat ${profile.flats.number}` : `Flat ${profile.flats.number}`;
}

function matchesStaff(person: StaffMember, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [person.name, person.role, person.phone ?? ''].join(' ').toLowerCase().includes(q);
}

function matchesMember(person: ProfileWithFlat, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [person.full_name ?? '', person.phone ?? '', memberFlatLabel(person), person.occupation ?? '']
    .join(' ')
    .toLowerCase()
    .includes(q);
}

function ContactActions({ name, phone }: { name: string; phone: string | null }) {
  if (!phone) return null;
  return (
    <View className="flex-row gap-2">
      <Pressable
        onPress={() => void Linking.openURL(`tel:${phone}`)}
        accessibilityRole="button"
        accessibilityLabel={`Call ${name}`}
        className="h-10 w-10 items-center justify-center rounded-pill"
        style={{ backgroundColor: Pastels.mint }}
      >
        <Phone color={Brand.primary} size={16} strokeWidth={1.5} />
      </Pressable>
      <Pressable
        onPress={() => void Linking.openURL(`sms:${phone}`)}
        accessibilityRole="button"
        accessibilityLabel={`Message ${name}`}
        className="h-10 w-10 items-center justify-center rounded-pill"
        style={{ backgroundColor: Pastels.sky }}
      >
        <MessageSquare color="#2563EB" size={16} strokeWidth={1.5} />
      </Pressable>
    </View>
  );
}

export default function ResidentDirectoryScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('Residents');

  const staffQuery = useQuery({
    queryKey: queryKeys.staff(societyId ?? 'none'),
    queryFn: () => fetchStaff(societyId!),
    enabled: Boolean(societyId),
  });

  const membersQuery = useQuery({
    queryKey: queryKeys.directoryMembers(societyId ?? 'none'),
    queryFn: () => fetchDirectoryMembers(societyId!),
    enabled: Boolean(societyId),
  });

  const isPeopleTab = activeTab === 'Residents' || activeTab === 'Admins';

  const staffSections = useMemo(() => {
    if (isPeopleTab) return [];
    const matches = (staffQuery.data ?? []).filter((person) => matchesStaff(person, search));
    const tabFiltered = matches.filter((p) => getRoleMeta(p.role).tab === activeTab);
    const map = new Map<string, StaffMember[]>();
    for (const person of tabFiltered) {
      const list = map.get(person.role) ?? [];
      list.push(person);
      map.set(person.role, list);
    }
    return Array.from(map.entries()).map(([role, data]) => ({ role, data }));
  }, [staffQuery.data, search, activeTab, isPeopleTab]);

  const people = useMemo(() => {
    if (!isPeopleTab) return [];
    const role = activeTab === 'Admins' ? 'admin' : 'resident';
    return (membersQuery.data ?? [])
      .filter((p) => p.role === role)
      .filter((p) => matchesMember(p, search));
  }, [membersQuery.data, search, activeTab, isPeopleTab]);

  const listError = isPeopleTab ? membersQuery.error : staffQuery.error;
  const listLoading = isPeopleTab
    ? membersQuery.isLoading && !membersQuery.data
    : staffQuery.isLoading && !staffQuery.data;
  const listRefetching = isPeopleTab ? membersQuery.isRefetching : staffQuery.isRefetching;
  const refetch = () =>
    isPeopleTab ? void membersQuery.refetch() : void staffQuery.refetch();

  if (!societyId) {
    return (
      <ScreenHeader title="Directory" showBack>
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Ask an admin to link your profile."
        />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Directory" subtitle="People, staff & services" showBack>
      <View className="px-4 pb-2" style={{ flexGrow: 0, flexShrink: 0 }}>
        <ChipSelector
          presentation="filter"
          options={TABS}
          value={activeTab}
          onChange={setActiveTab}
        />
      </View>

      <View className="px-4 pb-2" style={{ flexGrow: 0, flexShrink: 0 }}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder={
            isPeopleTab
              ? 'Search by name, flat, or phone'
              : 'Search by name, role, or phone'
          }
          accessibilityLabel="Search directory"
        />
      </View>

      {listError ? (
        <ErrorBanner message={listError.message} onRetry={refetch} />
      ) : null}

      {listLoading ? (
        <SkeletonList count={4} />
      ) : isPeopleTab ? (
        <FlatList
          data={people}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          refreshControl={
            <ThemedRefreshControl refreshing={listRefetching} onRefresh={refetch} />
          }
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              visual="residents"
              title={search.trim() ? 'No matches' : `No ${activeTab.toLowerCase()} yet`}
              subtitle={
                search.trim()
                  ? 'Try a different name, flat, or phone.'
                  : activeTab === 'Admins'
                    ? 'Society admins will appear here once assigned.'
                    : 'Other residents in your society will appear here.'
              }
            />
          }
          renderItem={({ item }) => {
            const name = item.full_name?.trim() || 'Unnamed';
            const isAdmin = item.role === 'admin';
            const badgeBg = isAdmin ? Pastels.sky : Pastels.lilac;
            const badgeColor = isAdmin ? '#1F3A6B' : '#6B5CC4';
            return (
              <AppCard className="flex-row items-center gap-3 p-3">
                <InitialsAvatar
                  name={name}
                  size={48}
                  seed={item.id}
                  imageUrl={item.avatar_url}
                />
                <View className="min-w-0 flex-1">
                  <Text
                    className="font-semibold text-ink"
                    style={{ fontFamily: FontFamily.heading }}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                  <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={1}>
                    {isAdmin ? 'Society admin' : memberFlatLabel(item)}
                    {item.occupation ? ` · ${item.occupation}` : ''}
                  </Text>
                  <View
                    className="mt-1 flex-row items-center gap-1 self-start rounded-pill px-2 py-0.5"
                    style={{ backgroundColor: badgeBg }}
                  >
                    {isAdmin ? (
                      <BadgeCheck color={badgeColor} size={11} strokeWidth={1.5} />
                    ) : (
                      <Users color={badgeColor} size={11} strokeWidth={1.5} />
                    )}
                    <Text
                      className="text-[11px]"
                      style={{ color: badgeColor, fontFamily: FontFamily.medium }}
                    >
                      {isAdmin ? 'Admin' : 'Resident'}
                    </Text>
                  </View>
                </View>
                <ContactActions name={name} phone={item.phone} />
              </AppCard>
            );
          }}
        />
      ) : (
        <FlatList
          data={staffSections}
          keyExtractor={(item) => item.role}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          refreshControl={
            <ThemedRefreshControl refreshing={listRefetching} onRefresh={refetch} />
          }
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              visual="residents"
              title={search.trim() ? 'No matches' : `No ${activeTab.toLowerCase()} contacts`}
              subtitle={
                search.trim()
                  ? 'Try a different name, role, or phone.'
                  : 'Ask your admin to add contacts in the staff directory.'
              }
            />
          }
          renderItem={({ item }) => {
            const { Icon: RoleIcon, color: roleColor, bg: roleBg } = getRoleMeta(item.role);
            return (
              <View className="mb-5">
                <View className="mb-2 flex-row items-center gap-2">
                  <View
                    className="h-6 w-6 items-center justify-center rounded-card"
                    style={{ backgroundColor: roleBg }}
                  >
                    <RoleIcon color={roleColor} size={13} strokeWidth={1.5} />
                  </View>
                  <Text
                    className="text-xs font-bold uppercase tracking-wider text-ink-muted"
                    style={{ fontFamily: FontFamily.heading }}
                  >
                    {item.role}
                  </Text>
                </View>
                {item.data.map((person) => (
                  <AppCard key={person.id} className="mb-2 flex-row items-center gap-3 p-3">
                    {person.photo_url ? (
                      <AvatarRing size={48}>
                        <Image
                          source={{ uri: person.photo_url }}
                          style={{ width: 48, height: 48 }}
                          contentFit="cover"
                        />
                      </AvatarRing>
                    ) : (
                      <InitialsAvatar name={person.name} size={48} seed={person.id} />
                    )}
                    <View className="flex-1">
                      <Text
                        className="font-semibold text-ink"
                        style={{ fontFamily: FontFamily.heading }}
                      >
                        {person.name}
                      </Text>
                      <View
                        className="mt-0.5 flex-row items-center gap-1 self-start rounded-pill px-2 py-0.5"
                        style={{ backgroundColor: roleBg }}
                      >
                        <Text
                          className="text-[11px]"
                          style={{ color: roleColor, fontFamily: FontFamily.medium }}
                        >
                          {person.role}
                        </Text>
                      </View>
                    </View>
                    <ContactActions name={person.name} phone={person.phone} />
                  </AppCard>
                ))}
              </View>
            );
          }}
        />
      )}
    </ScreenHeader>
  );
}
