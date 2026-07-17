import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Phone } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, Text, View } from 'react-native';

import { AppCard, AvatarRing, InitialsAvatar } from '@/components/ui/brand';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchField } from '@/components/ui/search-field';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand } from '@/constants/theme';
import { fetchStaff } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { StaffMember } from '@/types/database';

type Section = { role: string; data: StaffMember[] };

function matchesSearch(person: StaffMember, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [person.name, person.role, person.phone ?? ''].join(' ').toLowerCase();
  return haystack.includes(q);
}

export default function ResidentDirectoryScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const [search, setSearch] = useState('');

  const listQuery = useQuery({
    queryKey: queryKeys.staff(societyId ?? 'none'),
    queryFn: () => fetchStaff(societyId!),
    enabled: Boolean(societyId),
  });

  const sections = useMemo(() => {
    const matches = (listQuery.data ?? []).filter((person) => matchesSearch(person, search));
    const map = new Map<string, StaffMember[]>();
    for (const person of matches) {
      const list = map.get(person.role) ?? [];
      list.push(person);
      map.set(person.role, list);
    }
    return Array.from(map.entries()).map(([role, data]) => ({ role, data })) as Section[];
  }, [listQuery.data, search]);

  if (!societyId) {
    return (
      <ScreenHeader title="Directory" showBack>
        <EmptyState visual="disconnected" title="No society linked" subtitle="Ask an admin to link your profile." />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Directory" subtitle="Staff & service providers" showBack>
      <View className="px-4">
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
              visual="helpdesk"
              title={search.trim() ? 'No matches' : 'Directory empty'}
              subtitle={
                search.trim()
                  ? 'Try a different name, role, or phone.'
                  : 'Staff contacts will appear here.'
              }
            />
          }
          renderItem={({ item }) => (
            <View className="mb-5">
              <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">
                {item.role}
              </Text>
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
                    <Text className="font-semibold text-ink">{person.name}</Text>
                    <Text className="text-sm text-ink-muted">{person.phone ?? 'No phone'}</Text>
                  </View>
                  {person.phone ? (
                    <Pressable
                      onPress={() => void Linking.openURL(`tel:${person.phone}`)}
                      accessibilityRole="button"
                      accessibilityLabel={`Call ${person.name}`}
                      className="h-10 w-10 items-center justify-center rounded-full bg-brand-50"
                    >
                      <Phone color={Brand.primary} size={18} />
                    </Pressable>
                  ) : null}
                </AppCard>
              ))}
            </View>
          )}
        />
      )}
    </ScreenHeader>
  );
}
