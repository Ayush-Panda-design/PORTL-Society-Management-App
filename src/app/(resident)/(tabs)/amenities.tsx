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
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import { PaymentSheet } from '@/components/payments/payment-sheet';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Pastels, amenityCoverUri } from '@/constants/theme';
import {
  amenityDateOptions,
  amenitySlotCapacity,
  formatAmenityBookingDate,
  todayISODate,
} from '@/lib/community';
import {
  bookAmenitySlot,
  cancelAmenityBooking,
  fetchAmenities,
  fetchBookingsForDate,
  fetchMyAmenityBookings,
} from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import { useCommunityUiStore } from '@/stores/communityUiStore';
import type { Amenity, AmenityBooking } from '@/types/database';

type ListTab = 'book' | 'mine';

function AmenityMetaRow({ amenity }: { amenity: Amenity }) {
  const capacity = amenitySlotCapacity(amenity.capacity);
  return (
    <View className="mt-2 flex-row flex-wrap gap-x-3 gap-y-1">
      {amenity.location ? (
        <View className="flex-row items-center gap-1">
          <MapPin color={Brand.inkMuted} size={12} strokeWidth={1.5} />
          <Text className="text-xs text-ink-muted">{amenity.location}</Text>
        </View>
      ) : null}
      <View className="flex-row items-center gap-1">
        <Users color={Brand.inkMuted} size={12} strokeWidth={1.5} />
        <Text className="text-xs text-ink-muted">
          {capacity === 1 ? '1 spot per slot' : `${capacity} spots per slot`}
        </Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Clock3 color={Brand.inkMuted} size={12} strokeWidth={1.5} />
        <Text className="text-xs text-ink-muted">
          {amenity.slots.length} slot{amenity.slots.length === 1 ? '' : 's'}
        </Text>
      </View>
    </View>
  );
}

function DateChipRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className="rounded-pill px-3.5 py-2"
            style={{
              backgroundColor: selected ? Brand.primary : Pastels.sage,
            }}
          >
            <Text
              className="text-[13px]"
              style={{
                fontFamily: FontFamily.heading,
                color: selected ? '#FFFFFF' : Brand.primaryDark,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function slotStats(bookings: AmenityBooking[], slot: string, flatId: string, capacity: number) {
  const forSlot = bookings.filter((b) => b.slot === slot);
  const taken = forSlot.length;
  const mine = forSlot.some((b) => b.flat_id === flatId);
  const full = taken >= capacity;
  return { taken, mine, full, remaining: Math.max(0, capacity - taken) };
}

export default function ResidentAmenitiesScreen() {
  const profile = useAuthStore((s) => s.profile);
  const societyId = profile?.society_id;
  const flatId = profile?.flat_id;
  const queryClient = useQueryClient();
  const selectedAmenityId = useCommunityUiStore((s) => s.selectedAmenityId);
  const setSelectedAmenityId = useCommunityUiStore((s) => s.setSelectedAmenityId);

  const [listTab, setListTab] = useState<ListTab>('book');
  const [date, setDate] = useState(todayISODate());
  const [message, setMessage] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
  const [payBooking, setPayBooking] = useState<{
    bookingId: string;
    amountPaise: number;
    label: string;
  } | null>(null);

  const amenitiesQuery = useQuery({
    queryKey: queryKeys.amenities(societyId ?? 'none'),
    queryFn: () => fetchAmenities(societyId!),
    enabled: Boolean(societyId),
  });

  const myBookingsQuery = useQuery({
    queryKey: queryKeys.myAmenityBookings(flatId ?? 'none'),
    queryFn: () => fetchMyAmenityBookings(flatId!),
    enabled: Boolean(flatId),
  });

  const amenities = amenitiesQuery.data ?? [];
  const featured = amenities.find((a) => a.is_featured) ?? null;
  const listAmenities = featured
    ? amenities.filter((a) => a.id !== featured.id)
    : amenities;

  const selected = amenities.find((a) => a.id === selectedAmenityId) ?? null;

  const horizonDays = selected?.booking_horizon_days ?? 7;
  const dateOptions = useMemo(
    () => amenityDateOptions(horizonDays),
    [horizonDays],
  );

  useEffect(() => {
    if (!selected) return;
    if (!dateOptions.some((o) => o.value === date)) {
      setDate(dateOptions[0]?.value ?? todayISODate());
    }
  }, [selected, dateOptions, date]);

  const bookingsQuery = useQuery({
    queryKey: queryKeys.amenityBookings(selected?.id ?? 'none', date),
    queryFn: () => fetchBookingsForDate(selected!.id, date),
    enabled: Boolean(selected?.id),
  });

  const bookMutation = useMutation({
    mutationFn: async (slot: string) => {
      if (!selected || !flatId) throw new Error('Missing amenity or flat.');
      const booking = await bookAmenitySlot({
        amenityId: selected.id,
        flatId,
        date,
        slot,
      });
      return { booking, slot, feePaise: selected.fee_paise ?? 0 };
    },
    onSuccess: async (result) => {
      setPendingSlot(null);
      const label = `${result.slot} on ${formatAmenityBookingDate(date)}`;

      if (result.feePaise > 0) {
        setPayBooking({
          bookingId: result.booking.id,
          amountPaise: result.feePaise,
          label,
        });
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryKeys.amenityBookings(selected!.id, date),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.myAmenityBookings(flatId!),
          }),
        ]);
        return;
      }

      setMessage(`Booked ${label}.`);
      setSuccessVisible(true);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.amenityBookings(selected!.id, date),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.myAmenityBookings(flatId!),
        }),
      ]);
    },
    onError: (e: Error) => {
      setPendingSlot(null);
      setMessage(e.message);
    },
  });

  const refreshAfterPayment = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.amenityBookings(selected?.id ?? 'none', date),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.myAmenityBookings(flatId ?? 'none'),
      }),
    ]);
  };
  const cancelMutation = useMutation({
    mutationFn: cancelAmenityBooking,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.myAmenityBookings(flatId!),
        }),
        queryClient.invalidateQueries({ queryKey: ['amenity-bookings'] }),
      ]);
    },
    onError: (e: Error) => Alert.alert('Could not cancel', e.message),
  });

  const openAmenity = (id: string) => {
    setMessage(null);
    setPendingSlot(null);
    setDate(todayISODate());
    setSelectedAmenityId(id);
  };

  const confirmCancel = (bookingId: string, label: string) => {
    Alert.alert('Cancel booking?', `Free up ${label} for someone else?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: () => cancelMutation.mutate(bookingId),
      },
    ]);
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
    const capacity = amenitySlotCapacity(selected.capacity);
    const bookings = bookingsQuery.data ?? [];

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
          <View className="mb-3 mx-4 overflow-hidden rounded-2xl">
            <Image
              source={{ uri: amenityCoverUri(selected) }}
              style={{ width: '100%', height: 160 }}
              contentFit="cover"
              transition={200}
            />
          </View>

          <View className="mb-3 px-4">
            <AmenityMetaRow amenity={selected} />
            {selected.max_active_bookings_per_flat != null ? (
              <Text className="mt-2 text-xs text-ink-muted">
                Max {selected.max_active_bookings_per_flat} active booking
                {selected.max_active_bookings_per_flat === 1 ? '' : 's'} per flat
              </Text>
            ) : null}
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

          <View className="mb-3">
            <DateChipRow
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
            <View className="gap-2 px-4">
              {selected.slots.length === 0 ? (
                <EmptyState
                  title="No slots configured"
                  subtitle="Ask admin to add time slots."
                />
              ) : (
                selected.slots.map((item) => {
                  const { taken, mine, full, remaining } = slotStats(
                    bookings,
                    item,
                    flatId,
                    capacity,
                  );
                  const disabled = mine || full || bookMutation.isPending;
                  let statusLabel = 'Book';
                  if (mine) statusLabel = 'Yours';
                  else if (full) statusLabel = 'Full';
                  else if (capacity > 1) statusLabel = `${remaining} left`;

                  return (
                    <Pressable
                      key={item}
                      disabled={disabled}
                      onPress={() => setPendingSlot(item)}
                      className={`flex-row items-center justify-between rounded-xl border px-4 py-3.5 ${
                        mine || full
                          ? 'border-surface-border bg-surface-muted opacity-70'
                          : 'border-surface-border bg-surface-card'
                      }`}
                    >
                      <View className="min-w-0 flex-1 pr-3">
                        <Text className="font-medium text-ink">{item}</Text>
                        <Text className="mt-0.5 text-xs text-ink-muted">
                          {taken}/{capacity} spot{capacity === 1 ? '' : 's'} taken
                        </Text>
                      </View>
                      {bookMutation.isPending && pendingSlot === item ? (
                        <ActivityIndicator color={Brand.primary} />
                      ) : (
                        <Text
                          className={`text-sm font-semibold ${
                            mine || full ? 'text-ink-faint' : 'text-brand-700'
                          }`}
                        >
                          {statusLabel}
                        </Text>
                      )}
                    </Pressable>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>

        <Modal
          visible={Boolean(pendingSlot)}
          animationType="fade"
          transparent
          onRequestClose={() => {
            if (!bookMutation.isPending) setPendingSlot(null);
          }}
        >
          <Pressable
            className="flex-1 justify-end bg-black/45"
            onPress={() => {
              if (!bookMutation.isPending) setPendingSlot(null);
            }}
          >
            <Pressable
              className="rounded-t-3xl bg-surface-card px-5 pb-10 pt-5"
              onPress={(e) => e.stopPropagation()}
            >
              <Text
                className="mb-1 text-xl text-ink"
                style={{ fontFamily: FontFamily.display }}
              >
                Confirm booking
              </Text>
              <Text className="mb-5 text-sm leading-5 text-ink-muted">
                Book {selected.name} for {pendingSlot} on{' '}
                {formatAmenityBookingDate(date)}
                {(selected.fee_paise ?? 0) > 0
                  ? ` · ₹${((selected.fee_paise ?? 0) / 100).toFixed(0)}`
                  : ''}
                ?
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  disabled={bookMutation.isPending}
                  onPress={() => setPendingSlot(null)}
                  className="flex-1 items-center rounded-xl border border-surface-border py-3.5"
                >
                  <Text className="font-semibold text-ink-soft">Not now</Text>
                </Pressable>
                <Pressable
                  disabled={bookMutation.isPending || !pendingSlot}
                  onPress={() => {
                    if (pendingSlot) bookMutation.mutate(pendingSlot);
                  }}
                  className="flex-1 items-center rounded-bubbly py-3.5"
                  style={{ backgroundColor: Brand.primary }}
                >
                  {bookMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="font-semibold text-white">Confirm</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <SuccessOverlay
          visible={successVisible}
          type="payment"
          message="Booking Confirmed"
          onDone={() => setSuccessVisible(false)}
        />

        {societyId && payBooking ? (
          <PaymentSheet
            visible
            societyId={societyId}
            purpose="amenity_booking"
            referenceId={payBooking.bookingId}
            amountPaise={payBooking.amountPaise}
            title="Pay for booking"
            description={`Confirm ${selected?.name ?? 'amenity'} · ${payBooking.label}`}
            onConfirmed={async () => {
              const label = payBooking.label;
              setPayBooking(null);
              setMessage(`Paid & booked ${label}.`);
              setSuccessVisible(true);
              await refreshAfterPayment();
            }}
            onClose={async () => {
              setPayBooking(null);
              await refreshAfterPayment();
            }}
          />
        ) : null}
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Amenities" subtitle="Book clubhouse, gym, and more" showBack>
      <View className="mb-3 px-4">
        <SegmentedControl
          options={[
            { value: 'book', label: 'Book' },
            { value: 'mine', label: 'My Bookings' },
          ]}
          value={listTab}
          onChange={setListTab}
        />
      </View>

      {listTab === 'mine' ? (
        <>
          {myBookingsQuery.error ? (
            <ErrorBanner
              message={myBookingsQuery.error.message}
              onRetry={() => void myBookingsQuery.refetch()}
            />
          ) : null}
          {myBookingsQuery.isLoading && !myBookingsQuery.data ? (
            <SkeletonList count={3} />
          ) : (
            <FlatList
              data={myBookingsQuery.data ?? []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 24,
                flexGrow: 1,
              }}
              ItemSeparatorComponent={() => <View className="h-2.5" />}
              refreshControl={
                <ThemedRefreshControl
                  refreshing={myBookingsQuery.isRefetching}
                  onRefresh={() => void myBookingsQuery.refetch()}
                />
              }
              ListEmptyComponent={
                <EmptyState
                  visual="amenities"
                  title="No upcoming bookings"
                  subtitle="When you reserve a slot, it shows up here so you can cancel if plans change."
                />
              }
              renderItem={({ item }) => (
                <AppCard>
                  <Text
                    className="text-base text-ink"
                    style={{ fontFamily: FontFamily.heading }}
                  >
                    {item.amenity?.name ?? 'Amenity'}
                  </Text>
                  <Text className="mt-1 text-sm text-ink-muted">
                    {formatAmenityBookingDate(item.date)} · {item.slot}
                  </Text>
                  <Pressable
                    disabled={cancelMutation.isPending}
                    onPress={() =>
                      confirmCancel(
                        item.id,
                        `${item.amenity?.name ?? 'slot'} · ${item.slot}`,
                      )
                    }
                    className="mt-3 self-start rounded-pill px-3 py-1.5"
                    style={{ backgroundColor: Pastels.peach }}
                  >
                    <Text
                      className="text-[12px]"
                      style={{ fontFamily: FontFamily.heading, color: Brand.accentDark }}
                    >
                      Cancel booking
                    </Text>
                  </Pressable>
                </AppCard>
              )}
            />
          )}
        </>
      ) : (
        <>
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
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 24,
                flexGrow: 1,
              }}
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
                            <Star
                              color="#FBBF24"
                              size={12}
                              fill="#FBBF24"
                              strokeWidth={1.5}
                            />
                            <Text className="text-[11px] font-semibold text-white">
                              Featured
                            </Text>
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
                        body: 'Book up to two weeks ahead — confirm before it locks in.',
                        tint: '#3B82F6',
                        wash: Pastels.sky,
                      },
                      {
                        Icon: Clock3,
                        title: 'Manage your bookings',
                        body: 'Cancel from My Bookings if plans change and free the slot.',
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
                      <Text className="mb-1 text-base font-semibold text-ink">
                        {item.name}
                      </Text>
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
        </>
      )}
    </ScreenHeader>
  );
}
