import { useQuery } from '@tanstack/react-query';
import { Phone } from 'lucide-react-native';
import { useMemo } from 'react';
import { FlatList, Image, Linking, Pressable, RefreshControl, Text, View } from 'react-native';

import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { fetchStaff } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { StaffMember } from '@/types/database';

type Section = { role: string; data: StaffMember[] };

export default function ResidentDirectoryScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);

  const listQuery = useQuery({
    queryKey: queryKeys.staff(societyId ?? 'none'),
    queryFn: () => fetchStaff(societyId!),
    enabled: Boolean(societyId),
  });

  const sections = useMemo(() => {
    const map = new Map<string, StaffMember[]>();
    for (const person of listQuery.data ?? []) {
      const list = map.get(person.role) ?? [];
      list.push(person);
      map.set(person.role, list);
    }
    return Array.from(map.entries()).map(([role, data]) => ({ role, data })) as Section[];
  }, [listQuery.data]);

  if (!societyId) {
    return (
      <ScreenHeader title="Directory" showBack>
        <EmptyState title="No society linked" subtitle="Ask an admin to link your profile." />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Directory" subtitle="Staff & service providers" showBack>
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
            <RefreshControl
              refreshing={listQuery.isRefetching}
              onRefresh={() => void listQuery.refetch()}
              tintColor="#0F766E"
            />
          }
          ListEmptyComponent={
            <EmptyState title="Directory empty" subtitle="Staff contacts will appear here." />
          }
          renderItem={({ item }) => (
            <View className="mb-5">
              <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                {item.role}
              </Text>
              {item.data.map((person) => (
                <View
                  key={person.id}
                  className="mb-2 flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3"
                >
                  <View className="h-12 w-12 overflow-hidden rounded-full bg-slate-100">
                    {person.photo_url ? (
                      <Image
                        source={{ uri: person.photo_url }}
                        style={{ width: 48, height: 48 }}
                      />
                    ) : (
                      <View className="h-full w-full items-center justify-center">
                        <Text className="text-base font-semibold text-slate-400">
                          {person.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-slate-900">{person.name}</Text>
                    <Text className="text-sm text-slate-500">{person.phone ?? 'No phone'}</Text>
                  </View>
                  {person.phone ? (
                    <Pressable
                      onPress={() => void Linking.openURL(`tel:${person.phone}`)}
                      className="h-10 w-10 items-center justify-center rounded-full bg-teal-50"
                    >
                      <Phone color="#0F766E" size={18} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        />
      )}
    </ScreenHeader>
  );
}
