import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import {
  CalendarDays,
  Clock3,
  MapPin,
  Sparkles,
  Star,
  Users,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AppCard } from '@/components/ui/brand';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { SuccessOverlay } from '@/components/ui/success-overlay';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Pastels, amenityCoverUri } from '@/constants/theme';
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

function AmenityMetaRow({ amenity }: { amenity: Amenity }) {
  return (
    <View className="mt-2 flex-row flex-wrap gap-x-3 gap-y-1">
      {amenity.location ? (
        <View className="flex-row items-center gap-1">
          <MapPin color={Brand.inkMuted} size={12} strokeWidth={1.5} />
          <Text className="text-xs text-ink-muted">{amenity.location}</Text>
        </View>
      ) : null}
      {amenity.capacity ? (
        <View className="flex-row items-center gap-1">
          <Users color={Brand.inkMuted} size={12} strokeWidth={1.5} />
          <Text className="text-xs text-ink-muted">Up to {amenity.capacity}</Text>
        </View>
      ) : null}
      <View className="flex-row items-center gap-1">
        <Clock3 color={Brand.inkMuted} size={12} strokeWidth={1.5} />
        <Text className="text-xs text-ink-muted">
          {amenity.slots.length} slot{amenity.slots.length === 1 ? '' : 's'}
        </Text>
      </View>
    </View>
  );
}

export default function ResidentAmenitiesScreen() {
  const profile = useAuthStore((s) => s.profile);
  const societyId = profile?.society_id;
  const flatId = profile?.flat_id;
  const queryClient = useQueryClient();
  const selectedAmenityId = useCommunityUiStore((s) => s.selectedAmenityId);
  const setSelectedAmenityId = useCommunityUiStore((s) => s.setSelectedAmenityId);

  const [date, setDate] = useState(todayISODate());
  const [message, setMessage] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

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

  const amenities = amenitiesQuery.data ?? [];
  const featured = amenities.find((a) => a.is_featured) ?? null;
  const listAmenities = featured
    ? amenities.filter((a) => a.id !== featured.id)
    : amenities;

  const selected = amenities.find((a) => a.id === selectedAmenityId) ?? null;

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
      setSuccessVisible(true);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.amenityBookings(selected!.id, date),
      });
    },
    onError: (e: Error) => setMessage(e.message),
  });

  const openAmenity = (id: string) => {
    setMessage(null);
    setSelectedAmenityId(id);
  };

  if (!societyId) {
    return (
      <ScreenHeader title="Amenities" showBack>
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Ask an admin to link your profile."
        />
      </ScreenHeader>
    );
  }

  if (!flatId) {
    return (
      <ScreenHeader title="Amenities" showBack>
        <EmptyState
          visual="disconnected"
          title="No flat linked"
          subtitle="A flat is required to book amenities."
        />
      </ScreenHeader>
    );
  }

  if (selected) {
    const bookedSlots = new Set((bookingsQuery.data ?? []).map((b) => b.slot));

    return (
      <ScreenHeader
        title={selected.name}
        subtitle={selected.description ?? 'Pick a date and slot'}
        showBack
        right={
          <Pressable onPress={() => setSelectedAmenityId(null)}>
            <Text className="font-semibold text-brand-700">List</Text>
          </Pressable>
        }
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-3 overflow-hidden rounded-2xl mx-4">
            <Image
              source={{ uri: amenityCoverUri(selected) }}
              style={{ width: '100%', height: 160 }}
              contentFit="cover"
              transition={200}
            />
          </View>

          <View className="mb-3 px-4">
            <AmenityMetaRow amenity={selected} />
            {selected.rules ? (
              <View
                className="mt-3 rounded-card px-3.5 py-3"
                style={{ backgroundColor: Pastels.butter }}
              >
                <Text
                  className="mb-1 text-xs font-bold uppercase tracking-widest text-ink-muted"
                  style={{ fontFamily: FontFamily.heading }}
                >
                  Rules
                </Text>
                <Text className="text-sm leading-5 text-ink">{selected.rules}</Text>
              </View>
            ) : null}
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
            <View className="px-4 gap-2">
              {selected.slots.length === 0 ? (
                <EmptyState
                  title="No slots configured"
                  subtitle="Ask admin to add time slots."
                />
              ) : (
                selected.slots.map((item) => {
                  const taken = bookedSlots.has(item);
                  return (
                    <Pressable
                      key={item}
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
                })
              )}
            </View>
          )}
        </ScrollView>
        <SuccessOverlay
          visible={successVisible}
          type="payment"
          message="Booking Confirmed"
          onDone={() => setSuccessVisible(false)}
        />
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
          data={listAmenities}
          keyExtractor={(item: Amenity) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <ThemedRefreshControl
              refreshing={amenitiesQuery.isRefetching}
              onRefresh={() => void amenitiesQuery.refetch()}
            />
          }
          ListHeaderComponent={
            featured ? (
              <View className="mb-4">
                <Text
                  className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted"
                  style={{ fontFamily: FontFamily.heading }}
                >
                  Special
                </Text>
                <Pressable onPress={() => openAmenity(featured.id)}>
                  <AppCard className="overflow-hidden p-0">
                    <View className="relative">
                      <Image
                        source={{ uri: amenityCoverUri(featured) }}
                        style={{ width: '100%', height: 180 }}
                        contentFit="cover"
                        transition={200}
                      />
                      <View
                        className="absolute left-3 top-3 flex-row items-center gap-1 rounded-pill px-2.5 py-1"
                        style={{ backgroundColor: 'rgba(16,21,18,0.72)' }}
                      >
                        <Star color="#FBBF24" size={12} fill="#FBBF24" strokeWidth={1.5} />
                        <Text className="text-[11px] font-semibold text-white">Featured</Text>
                      </View>
                    </View>
                    <View className="p-4">
                      <Text
                        className="text-xl text-ink"
                        style={{ fontFamily: FontFamily.display }}
                      >
                        {featured.name}
                      </Text>
                      <Text className="mt-1 text-sm text-ink-muted" numberOfLines={2}>
                        {featured.description || 'Tap to book a slot'}
                      </Text>
                      <AmenityMetaRow amenity={featured} />
                    </View>
                  </AppCard>
                </Pressable>
                {listAmenities.length > 0 ? (
                  <Text
                    className="mb-1 mt-5 text-xs font-bold uppercase tracking-widest text-ink-muted"
                    style={{ fontFamily: FontFamily.heading }}
                  >
                    All facilities
                  </Text>
                ) : null}
              </View>
            ) : null
          }
          ListEmptyComponent={
            amenities.length === 0 ? (
              <EmptyState
                visual="amenities"
                title="No amenities yet"
                subtitle="When your society adds amenities, you can book them here."
                tips={[
                  {
                    Icon: Sparkles,
                    title: 'Gym, clubhouse & more',
                    body: 'Bookable spaces appear here once your admin adds them.',
                    tint: Brand.primary,
                    wash: Pastels.mint,
                  },
                  {
                    Icon: CalendarDays,
                    title: 'Pick a date & slot',
                    body: 'Choose a free time — conflicts are blocked automatically.',
                    tint: '#3B82F6',
                    wash: Pastels.sky,
                  },
                  {
                    Icon: Clock3,
                    title: 'Your bookings stay listed',
                    body: 'Upcoming reservations show on this screen for quick reference.',
                    tint: Brand.accent,
                    wash: Pastels.peach,
                  },
                ]}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => openAmenity(item.id)}>
              <AppCard className="overflow-hidden p-0">
                <Image
                  source={{ uri: amenityCoverUri(item) }}
                  style={{ width: '100%', height: 120 }}
                  contentFit="cover"
                  transition={200}
                />
                <View className="p-4">
                  <Text className="mb-1 text-base font-semibold text-ink">{item.name}</Text>
                  <Text className="text-sm text-ink-muted" numberOfLines={2}>
                    {item.description || `${item.slots.length} slots available`}
                  </Text>
                  <AmenityMetaRow amenity={item} />
                </View>
              </AppCard>
            </Pressable>
          )}
        />
      )}
    </ScreenHeader>
  );
}
