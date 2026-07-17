import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';

import { AppCard } from '@/components/ui/brand';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, amenityImageForName } from '@/constants/theme';
import { addDaysISO, todayISODate } from '@/lib/community';
import {
  bookAmenitySlot,
  fetchAmenities,
  fetchBookingsForDate,
} from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import { useCommunityUiStore } from '@/stores/communityUiStore';
import type { Amenity } from '@/types/database';

export default function ResidentAmenitiesScreen() {
  const profile = useAuthStore((s) => s.profile);
  const societyId = profile?.society_id;
  const flatId = profile?.flat_id;
  const queryClient = useQueryClient();
  const selectedAmenityId = useCommunityUiStore((s) => s.selectedAmenityId);
  const setSelectedAmenityId = useCommunityUiStore((s) => s.setSelectedAmenityId);

  const [date, setDate] = useState(todayISODate());
  const [message, setMessage] = useState<string | null>(null);

  const dateOptions = useMemo(
    () =>
      [-1, 0, 1, 2].map((offset) => {
        const value = addDaysISO(todayISODate(), offset);
        return {
          value,
          label: offset === 0 ? 'Today' : value.slice(5),
        };
      }),
    [],
  );

  const amenitiesQuery = useQuery({
    queryKey: queryKeys.amenities(societyId ?? 'none'),
    queryFn: () => fetchAmenities(societyId!),
    enabled: Boolean(societyId),
  });

  const selected = (amenitiesQuery.data ?? []).find((a) => a.id === selectedAmenityId) ?? null;

  const bookingsQuery = useQuery({
    queryKey: queryKeys.amenityBookings(selected?.id ?? 'none', date),
    queryFn: () => fetchBookingsForDate(selected!.id, date),
    enabled: Boolean(selected?.id),
  });

  const bookMutation = useMutation({
    mutationFn: async (slot: string) => {
      if (!selected || !flatId) throw new Error('Missing amenity or flat.');
      await bookAmenitySlot({
        amenityId: selected.id,
        flatId,
        date,
        slot,
      });
    },
    onSuccess: async (_data, slot) => {
      setMessage(`Booked ${slot} on ${date}.`);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.amenityBookings(selected!.id, date),
      });
    },
    onError: (e: Error) => setMessage(e.message),
  });

  if (!societyId) {
    return (
      <ScreenHeader title="Amenities" showBack>
        <EmptyState visual="disconnected" title="No society linked" subtitle="Ask an admin to link your profile." />
      </ScreenHeader>
    );
  }

  if (!flatId) {
    return (
      <ScreenHeader title="Amenities" showBack>
        <EmptyState visual="disconnected" title="No flat linked" subtitle="A flat is required to book amenities." />
      </ScreenHeader>
    );
  }

  if (selected) {
    const bookedSlots = new Set((bookingsQuery.data ?? []).map((b) => b.slot));

    return (
      <ScreenHeader
        title={selected.name}
        subtitle={selected.description ?? 'Pick a date and slot'}
        right={
          <Pressable onPress={() => setSelectedAmenityId(null)}>
            <Text className="font-semibold text-brand-700">Back</Text>
          </Pressable>
        }
      >
        <View className="mb-3 overflow-hidden rounded-2xl mx-4">
          <Image
            source={{ uri: amenityImageForName(selected.name) }}
            style={{ width: '100%', height: 120 }}
            contentFit="cover"
            transition={200}
          />
        </View>
        <View className="mb-3 px-4">
          <SegmentedControl
            options={dateOptions}
            value={date}
            onChange={(value) => {
              setDate(value);
              setMessage(null);
            }}
          />
        </View>

        {message ? (
          <View className="mx-4 mb-2 rounded-xl border border-surface-border bg-surface-card px-3 py-2">
            <Text className="text-sm text-ink-soft">{message}</Text>
          </View>
        ) : null}

        {bookingsQuery.error ? (
          <ErrorBanner
            message={bookingsQuery.error.message}
            onRetry={() => void bookingsQuery.refetch()}
          />
        ) : null}

        {bookingsQuery.isLoading ? (
          <SkeletonList count={3} />
        ) : (
          <FlatList
            data={selected.slots}
            keyExtractor={(item) => item}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
            ItemSeparatorComponent={() => <View className="h-2" />}
            ListEmptyComponent={
              <EmptyState title="No slots configured" subtitle="Ask admin to add time slots." />
            }
            renderItem={({ item }) => {
              const taken = bookedSlots.has(item);
              return (
                <Pressable
                  disabled={taken || bookMutation.isPending}
                  onPress={() => bookMutation.mutate(item)}
                  className={`flex-row items-center justify-between rounded-xl border px-4 py-3.5 ${
                    taken
                      ? 'border-surface-border bg-surface-muted opacity-60'
                      : 'border-surface-border bg-surface-card'
                  }`}
                >
                  <Text className="font-medium text-ink">{item}</Text>
                  {bookMutation.isPending ? (
                    <ActivityIndicator color={Brand.primary} />
                  ) : (
                    <Text
                      className={`text-sm font-semibold ${
                        taken ? 'text-ink-faint' : 'text-brand-700'
                      }`}
                    >
                      {taken ? 'Booked' : 'Book'}
                    </Text>
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Amenities" subtitle="Book clubhouse, gym, and more" showBack>
      {amenitiesQuery.error ? (
        <ErrorBanner
          message={amenitiesQuery.error.message}
          onRetry={() => void amenitiesQuery.refetch()}
        />
      ) : null}

      {amenitiesQuery.isLoading && !amenitiesQuery.data ? (
        <SkeletonList count={3} />
      ) : (
        <FlatList
          data={amenitiesQuery.data ?? []}
          keyExtractor={(item: Amenity) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <ThemedRefreshControl
              refreshing={amenitiesQuery.isRefetching}
              onRefresh={() => void amenitiesQuery.refetch()}
            />
          }
          ListEmptyComponent={
            <EmptyState
              visual="amenities"
              title="No amenities yet"
              subtitle="When your society adds amenities, you can book them here."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setMessage(null);
                setSelectedAmenityId(item.id);
              }}
            >
              <AppCard className="overflow-hidden p-0">
                <Image
                  source={{ uri: amenityImageForName(item.name) }}
                  style={{ width: '100%', height: 120 }}
                  contentFit="cover"
                  transition={200}
                />
                <View className="p-4">
                  <Text className="mb-1 text-base font-semibold text-ink">{item.name}</Text>
                  <Text className="text-sm text-ink-muted">
                    {item.description || `${item.slots.length} slots available`}
                  </Text>
                </View>
              </AppCard>
            </Pressable>
          )}
        />
      )}
    </ScreenHeader>
  );
}
