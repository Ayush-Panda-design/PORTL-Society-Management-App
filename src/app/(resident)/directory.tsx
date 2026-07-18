import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { MessageSquare, Phone, ShieldCheck, Stethoscope, Users, Wrench } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, Text, View } from 'react-native';

import { AppCard, AvatarRing, InitialsAvatar } from '@/components/ui/brand';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchField } from '@/components/ui/search-field';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { fetchStaff } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { StaffMember } from '@/types/database';

type Section = { role: string; data: StaffMember[] };
type Tab = 'Security' | 'Staff' | 'Emergency' | 'Residents';

const TABS: Tab[] = ['Security', 'Staff', 'Emergency', 'Residents'];

const ROLE_META: Record<string, { Icon: typeof ShieldCheck; color: string; bg: string; tab: Tab }> = {
  Security: { Icon: ShieldCheck, color: '#C0392B', bg: Pastels.rose, tab: 'Security' },
  Guard: { Icon: ShieldCheck, color: '#C0392B', bg: Pastels.rose, tab: 'Security' },
  Housekeeping: { Icon: Wrench, color: Brand.primary, bg: Pastels.mint, tab: 'Staff' },
  Maintenance: { Icon: Wrench, color: Brand.primary, bg: Pastels.mint, tab: 'Staff' },
  Emergency: { Icon: Stethoscope, color: '#C0392B', bg: Pastels.rose, tab: 'Emergency' },
  Medical: { Icon: Stethoscope, color: '#C0392B', bg: Pastels.rose, tab: 'Emergency' },
  Resident: { Icon: Users, color: '#6B5CC4', bg: Pastels.lilac, tab: 'Residents' },
};

function getRoleMeta(role: string) {
  return ROLE_META[role] ?? { Icon: Wrench, color: Brand.inkMuted, bg: Pastels.sage, tab: 'Staff' as Tab };
}

function getTabForRole(role: string): Tab {
  return getRoleMeta(role).tab;
}

function matchesSearch(person: StaffMember, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [person.name, person.role, person.phone ?? ''].join(' ').toLowerCase();
  return haystack.includes(q);
}

export default function ResidentDirectoryScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('Security');

  const listQuery = useQuery({
    queryKey: queryKeys.staff(societyId ?? 'none'),
    queryFn: () => fetchStaff(societyId!),
    enabled: Boolean(societyId),
  });

  const sections = useMemo(() => {
    const matches = (listQuery.data ?? []).filter((person) => matchesSearch(person, search));
    const tabFiltered = matches.filter((p) => getTabForRole(p.role) === activeTab);
    const map = new Map<string, StaffMember[]>();
    for (const person of tabFiltered) {
      const list = map.get(person.role) ?? [];
      list.push(person);
      map.set(person.role, list);
    }
    return Array.from(map.entries()).map(([role, data]) => ({ role, data })) as Section[];
  }, [listQuery.data, search, activeTab]);

  if (!societyId) {
    return (
      <ScreenHeader title="Directory" showBack>
        <EmptyState visual="disconnected" title="No society linked" subtitle="Ask an admin to link your profile." />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Directory" subtitle="Contacts & services" showBack>
      {/* Segmented tabs */}
      <View className="flex-row gap-1 px-4 pb-2">
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className="flex-1 items-center rounded-pill py-2"
            style={{
              backgroundColor: activeTab === tab ? Brand.primary : 'transparent',
            }}
          >
            <Text
              className="text-xs font-semibold"
              style={{
                color: activeTab === tab ? '#fff' : Brand.inkMuted,
                fontFamily: FontFamily.heading,
              }}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="px-4 pb-2">
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, role, or phone"
          accessibilityLabel="Search directory"
        />
      </View>

      {listQuery.error ? (
        <ErrorBanner message={listQuery.error.message} onRetry={() => void listQuery.refetch()} />
      ) : null}

      {listQuery.isLoading && !listQuery.data ? (
        <SkeletonList count={4} />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.role}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          refreshControl={
            <ThemedRefreshControl
              refreshing={listQuery.isRefetching}
              onRefresh={() => void listQuery.refetch()}
            />
          }
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              visual="residents"
              subtitle={
                search.trim()
                  ? 'Try a different name, role, or phone.'
                  : `No ${activeTab.toLowerCase()} contacts yet.`
              }
            />
          }
          renderItem={({ item }) => {
            const { Icon: RoleIcon, color: roleColor, bg: roleBg } = getRoleMeta(item.role);
            return (
              <View className="mb-5">
                {/* Section header */}
                <View className="mb-2 flex-row items-center gap-2">
                  <View
                    className="h-6 w-6 items-center justify-center rounded-card"
                    style={{ backgroundColor: roleBg }}
                  >
                    <RoleIcon color={roleColor} size={13} strokeWidth={1.5} />
                  </View>
                  <Text className="text-xs font-bold uppercase tracking-wider text-ink-muted" style={{ fontFamily: FontFamily.heading }}>
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
                      <Text className="font-semibold text-ink" style={{ fontFamily: FontFamily.heading }}>
                        {person.name}
                      </Text>
                      <View className="mt-0.5 flex-row items-center gap-1 self-start rounded-pill px-2 py-0.5" style={{ backgroundColor: roleBg }}>
                        <Text className="text-[11px]" style={{ color: roleColor, fontFamily: FontFamily.medium }}>
                          {person.role}
                        </Text>
                      </View>
                    </View>
                    {/* Dual action buttons */}
                    <View className="flex-row gap-2">
                      {person.phone ? (
                        <Pressable
                          onPress={() => void Linking.openURL(`tel:${person.phone}`)}
                          accessibilityRole="button"
                          accessibilityLabel={`Call ${person.name}`}
                          className="h-10 w-10 items-center justify-center rounded-pill"
                          style={{ backgroundColor: Pastels.mint }}
                        >
                          <Phone color={Brand.primary} size={16} strokeWidth={1.5} />
                        </Pressable>
                      ) : null}
                      {person.phone ? (
                        <Pressable
                          onPress={() => void Linking.openURL(`sms:${person.phone}`)}
                          accessibilityRole="button"
                          accessibilityLabel={`Message ${person.name}`}
                          className="h-10 w-10 items-center justify-center rounded-pill"
                          style={{ backgroundColor: Pastels.sky }}
                        >
                          <MessageSquare color="#2563EB" size={16} strokeWidth={1.5} />
                        </Pressable>
                      ) : null}
                    </View>
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
