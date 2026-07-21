import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BottomSheetModal as GorhomBottomSheetModal } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { ImagePlus, MapPin, Plus, Star, Trash2, Edit2, Users } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { FloatingActionBtn } from '@/components/ui/brand';
import { AdminBookingDetailSheet } from '@/components/amenities/admin-booking-detail-sheet';
import { AdminAmenityRevenueSnapshot } from '@/components/amenities/admin-revenue-snapshot';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Pastels, amenityCoverUri } from '@/constants/theme';
import {
  adminBookingFlatLabel,
  paymentStatusPillStyle,
} from '@/lib/admin-amenity-labels';
import { amenitySlotCapacity, formatAmenityBookingDate } from '@/lib/community';
import {
  cancelAmenityBooking,
  deleteAmenity,
  fetchAdminAmenityRevenue,
  fetchAmenities,
  fetchSocietyAmenityBookings,
  fetchSocietyAmenityWaitlist,
  uploadAmenityCover,
  upsertAmenity,
} from '@/lib/community-api';
import {
  adminRecordOfflinePayment,
  adminRefundPayment,
  formatPaise,
  paymentStatusLabel,
} from '@/lib/ops-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { AdminAmenityBookingView, Amenity } from '@/types/database';
import { DEFAULT_AMENITY_SLOTS } from '@/types/database';
import { Tokens } from '@/theme/tokens';

type AdminTab = 'facilities' | 'bookings';

export default function AdminAmenitiesScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<AdminTab>('facilities');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Amenity | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('1');
  const [horizonDays, setHorizonDays] = useState('7');
  const [maxPerFlat, setMaxPerFlat] = useState('2');
  const [feeRupees, setFeeRupees] = useState('0');
  const [rules, setRules] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [slotsText, setSlotsText] = useState(DEFAULT_AMENITY_SLOTS.join('\n'));
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<AdminAmenityBookingView | null>(null);
  const detailSheetRef = useRef<GorhomBottomSheetModal>(null);

  const openBookingDetail = useCallback((item: AdminAmenityBookingView) => {
    setSelectedBooking(item);
    requestAnimationFrame(() => detailSheetRef.current?.present());
  }, []);

  const listQuery = useQuery({
    queryKey: queryKeys.amenities(societyId ?? 'none'),
    queryFn: () => fetchAmenities(societyId!),
    enabled: Boolean(societyId),
  });

  const bookingsQuery = useQuery({
    queryKey: [...queryKeys.societyAmenityBookings(societyId ?? 'none'), paymentFilter],
    queryFn: () =>
      fetchSocietyAmenityBookings(societyId!, {
        paymentFilter: paymentFilter ? 'action_needed' : undefined,
      }),
    enabled: Boolean(societyId) && tab === 'bookings',
  });

  const revenueQuery = useQuery({
    queryKey: queryKeys.adminAmenityRevenue(societyId ?? 'none'),
    queryFn: () => fetchAdminAmenityRevenue(societyId!),
    enabled: Boolean(societyId) && tab === 'bookings',
  });

  const waitlistQuery = useQuery({
    queryKey: queryKeys.societyAmenityWaitlist(societyId ?? 'none'),
    queryFn: () => fetchSocietyAmenityWaitlist(societyId!),
    enabled: Boolean(societyId) && tab === 'bookings',
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!societyId) throw new Error('No society linked.');
      if (!name.trim()) throw new Error('Name is required.');
      const slots = slotsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      if (slots.length === 0) throw new Error('Add at least one slot (one per line).');

      let nextCover = coverUri;
      if (coverUri && !coverUri.startsWith('http')) {
        nextCover = (await uploadAmenityCover(societyId, coverUri)) ?? null;
        if (!nextCover) throw new Error('Cover upload failed.');
      }

      const capacityNum = capacity.trim() ? Number.parseInt(capacity.trim(), 10) : 1;
      if (Number.isNaN(capacityNum) || capacityNum < 1) {
        throw new Error('Capacity must be at least 1 (spots per slot).');
      }

      const horizonNum = horizonDays.trim()
        ? Number.parseInt(horizonDays.trim(), 10)
        : 7;
      if (Number.isNaN(horizonNum) || horizonNum < 1 || horizonNum > 14) {
        throw new Error('Booking window must be between 1 and 14 days.');
      }

      const maxNum = maxPerFlat.trim()
        ? Number.parseInt(maxPerFlat.trim(), 10)
        : 2;
      if (Number.isNaN(maxNum) || maxNum < 1) {
        throw new Error('Max bookings per flat must be at least 1.');
      }

      const feeNum = feeRupees.trim() ? Number.parseFloat(feeRupees.trim()) : 0;
      if (Number.isNaN(feeNum) || feeNum < 0) {
        throw new Error('Fee must be 0 or greater (₹).');
      }
      const feePaise = Math.round(feeNum * 100);

      await upsertAmenity({
        id: editing?.id,
        societyId,
        name: name.trim(),
        description: description.trim(),
        slots,
        coverUrl: nextCover,
        isFeatured,
        location: location.trim() || null,
        capacity: capacityNum,
        rules: rules.trim() || null,
        bookingHorizonDays: horizonNum,
        maxActiveBookingsPerFlat: maxNum,
        feePaise,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.amenities(societyId!) });
      setModalOpen(false);
      setEditing(null);
      setFormError(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAmenity,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.amenities(societyId!) });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelAmenityBooking,
    onSuccess: async () => {
      detailSheetRef.current?.dismiss();
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.societyAmenityBookings(societyId!),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.adminAmenityRevenue(societyId!),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.societyAmenityWaitlist(societyId!),
        }),
        queryClient.invalidateQueries({ queryKey: ['amenity-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['my-amenity-bookings'] }),
      ]);
    },
    onError: (e: Error) => Alert.alert('Could not cancel', e.message),
  });

  const paymentActionMutation = useMutation({
    mutationFn: async (input: { type: 'offline' | 'refund'; paymentId: string }) => {
      if (input.type === 'offline') {
        await adminRecordOfflinePayment(input.paymentId, 'cash');
      } else {
        await adminRefundPayment(input.paymentId);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.societyAmenityBookings(societyId!),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.adminAmenityRevenue(societyId!),
        }),
      ]);
    },
    onError: (e: Error) => Alert.alert('Payment action failed', e.message),
  });

  const confirmDelete = (item: Amenity) => {
    Alert.alert('Delete amenity?', `“${item.name}” will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(item.id),
      },
    ]);
  };

  const confirmCancelBooking = (id: string, label: string) => {
    Alert.alert('Cancel booking?', `Override and free ${label}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: () => cancelMutation.mutate(id),
      },
    ]);
  };

  const confirmMarkOffline = (paymentId: string) => {
    Alert.alert(
      'Mark paid offline?',
      'Use for cash or UPI received outside the app. This confirms the booking charge.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark paid',
          onPress: () => paymentActionMutation.mutate({ type: 'offline', paymentId }),
        },
      ],
    );
  };

  const confirmRefund = (paymentId: string) => {
    Alert.alert(
      'Refund payment?',
      'Marks the in-app payment as refunded. Process the actual refund in Razorpay if applicable.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refund',
          style: 'destructive',
          onPress: () => paymentActionMutation.mutate({ type: 'refund', paymentId }),
        },
      ],
    );
  };

  const resetForm = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setLocation('');
    setCapacity('1');
    setHorizonDays('7');
    setMaxPerFlat('2');
    setFeeRupees('0');
    setRules('');
    setIsFeatured(false);
    setSlotsText(DEFAULT_AMENITY_SLOTS.join('\n'));
    setCoverUri(null);
    setFormError(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (item: Amenity) => {
    setEditing(item);
    setName(item.name);
    setDescription(item.description ?? '');
    setLocation(item.location ?? '');
    setCapacity(String(amenitySlotCapacity(item.capacity)));
    setHorizonDays(String(item.booking_horizon_days ?? 7));
    setMaxPerFlat(String(item.max_active_bookings_per_flat ?? 2));
    setFeeRupees(String(((item.fee_paise ?? 0) / 100).toFixed(0)));
    setRules(item.rules ?? '');
    setIsFeatured(Boolean(item.is_featured));
    setSlotsText(item.slots.join('\n'));
    setCoverUri(item.cover_url ?? null);
    setFormError(null);
    setModalOpen(true);
  };

  const pickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFormError('Photo library permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  };

  if (!societyId) {
    return (
      <ScreenHeader title="Amenities" showBack>
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Assign a society to your admin profile."
        />
      </ScreenHeader>
    );
  }

  const amenities = listQuery.data ?? [];
  const featured = amenities.find((a) => a.is_featured) ?? null;
  const revenueRows = revenueQuery.data ?? [];
  const actionNeededCount = revenueRows.reduce(
    (sum, row) => sum + Number(row.failed_or_pending_count ?? 0),
    0,
  );
  const waitlistEntries = waitlistQuery.data ?? [];

  return (
    <ScreenHeader title="Amenities" subtitle="Facilities & bookings" showBack>
      <View className="mb-3 px-4">
        <SegmentedControl
          options={[
            { value: 'facilities', label: 'Facilities' },
            { value: 'bookings', label: 'Bookings' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'bookings' ? (
        <>
          {bookingsQuery.error ? (
            <ErrorBanner
              message={bookingsQuery.error.message}
              onRetry={() => void bookingsQuery.refetch()}
            />
          ) : null}
          {bookingsQuery.isLoading && !bookingsQuery.data ? (
            <SkeletonList count={4} />
          ) : (
            <FlatList
              data={bookingsQuery.data ?? []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 100,
                flexGrow: 1,
              }}
              ItemSeparatorComponent={() => <View className="h-2.5" />}
              refreshing={
                bookingsQuery.isRefetching ||
                revenueQuery.isRefetching ||
                waitlistQuery.isRefetching
              }
              onRefresh={() => {
                void bookingsQuery.refetch();
                void revenueQuery.refetch();
                void waitlistQuery.refetch();
              }}
              ListHeaderComponent={
                <>
                  <AdminAmenityRevenueSnapshot
                    rows={revenueRows}
                    actionNeededCount={actionNeededCount}
                    filterActive={paymentFilter}
                    onFilterActionNeeded={() => setPaymentFilter((v) => !v)}
                  />
                  {waitlistEntries.length > 0 ? (
                    <View className="mb-3">
                      <Text
                        className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted"
                        style={{ fontFamily: FontFamily.heading }}
                      >
                        Waitlist ({waitlistEntries.length})
                      </Text>
                      {waitlistEntries.map((w) => (
                        <Card key={w.id} className="mb-2">
                          <Text
                            className="text-sm text-ink"
                            style={{ fontFamily: FontFamily.heading }}
                          >
                            {w.amenity?.name ?? 'Amenity'} · #{w.position}
                          </Text>
                          <Text className="mt-0.5 text-xs text-ink-muted">
                            {formatAmenityBookingDate(w.date)} · {w.slot}
                          </Text>
                          <Text className="mt-0.5 text-xs text-ink">
                            {w.flat
                              ? w.flat.towers?.name
                                ? `${w.flat.towers.name} · Flat ${w.flat.number}`
                                : `Flat ${w.flat.number}`
                              : 'Flat'}
                            {w.requester?.full_name ? ` · ${w.requester.full_name}` : ''}
                          </Text>
                        </Card>
                      ))}
                    </View>
                  ) : null}
                  <Text
                    className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted"
                    style={{ fontFamily: FontFamily.heading }}
                  >
                    Upcoming bookings
                  </Text>
                </>
              }
              ListEmptyComponent={
                <EmptyState
                  visual="amenities"
                  title={paymentFilter ? 'No bookings need payment action' : 'No upcoming bookings'}
                  subtitle={
                    paymentFilter
                      ? 'All visible bookings are paid or free.'
                      : 'Resident reservations for today and ahead will appear here.'
                  }
                />
              }
              renderItem={({ item }) => {
                const pill = paymentStatusPillStyle(item.payment_status);
                const showPay =
                  (item.amount_paise ?? 0) > 0 || (item.amenity_fee_paise ?? 0) > 0;
                return (
                  <Pressable onPress={() => openBookingDetail(item)}>
                    <Card>
                      <View className="flex-row items-start justify-between gap-2">
                        <Text
                          className="flex-1 text-base text-ink"
                          style={{ fontFamily: FontFamily.heading }}
                        >
                          {item.amenity_name ?? 'Amenity'}
                        </Text>
                        {item.payment_status ? (
                          <View
                            className="rounded-pill px-2 py-0.5"
                            style={{ backgroundColor: pill.bg }}
                          >
                            <Text className="text-[10px] font-semibold" style={{ color: pill.text }}>
                              {paymentStatusLabel(String(item.payment_status))}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="mt-1 text-sm text-ink-muted">
                        {formatAmenityBookingDate(item.date)} · {item.slot}
                      </Text>
                      <Text className="mt-1 text-sm text-ink">
                        {item.resident_name ?? 'Resident'} · {adminBookingFlatLabel(item)}
                      </Text>
                      {showPay && item.amount_paise != null ? (
                        <Text className="mt-1 text-xs text-ink-muted">
                          {formatPaise(item.amount_paise)}
                        </Text>
                      ) : null}
                      <View className="mt-2 flex-row flex-wrap gap-2">
                        {item.from_waitlist ? (
                          <Text className="text-[10px] text-brand-700">Waitlist</Text>
                        ) : null}
                        {item.recurring_series_id ? (
                          <Text className="text-[10px] text-brand-700">Recurring</Text>
                        ) : null}
                      </View>
                    </Card>
                  </Pressable>
                );
              }}
            />
          )}
          <AdminBookingDetailSheet
            ref={detailSheetRef}
            booking={selectedBooking}
            onCancel={confirmCancelBooking}
            onMarkOfflinePaid={confirmMarkOffline}
            onRefund={confirmRefund}
            actionsPending={cancelMutation.isPending || paymentActionMutation.isPending}
          />
        </>
      ) : (
        <>
          {listQuery.error ? (
            <ErrorBanner
              message={listQuery.error.message}
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}

          {listQuery.isLoading && !listQuery.data ? (
            <SkeletonList count={3} />
          ) : (
            <FlatList
              data={amenities}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 100,
                flexGrow: 1,
              }}
              ItemSeparatorComponent={() => <View className="h-3" />}
              refreshing={listQuery.isRefetching}
              onRefresh={() => void listQuery.refetch()}
              ListHeaderComponent={
                featured ? (
                  <View className="mb-5">
                    <Text
                      className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted"
                      style={{ fontFamily: FontFamily.heading }}
                    >
                      Featured
                    </Text>
                    <Pressable onPress={() => openEdit(featured)}>
                      <Card style={{ padding: 0, overflow: 'hidden' }}>
                        <View className="relative">
                          <Image
                            source={{ uri: amenityCoverUri(featured) }}
                            style={{ width: '100%', height: 168 }}
                            contentFit="cover"
                            transition={200}
                          />
                          <View
                            className="absolute left-3 top-3 flex-row items-center gap-1 rounded-pill px-2.5 py-1"
                            style={{ backgroundColor: 'rgba(16,21,18,0.72)' }}
                          >
                            <Star color="#FBBF24" size={12} fill="#FBBF24" strokeWidth={1.5} />
                            <Text className="text-[11px] font-semibold text-white">Special</Text>
                          </View>
                        </View>
                        <View className="p-4">
                          <Text
                            className="text-lg text-ink"
                            style={{ fontFamily: FontFamily.display }}
                          >
                            {featured.name}
                          </Text>
                          <Text className="mt-1 text-sm text-ink-muted" numberOfLines={2}>
                            {featured.description || 'No description'}
                          </Text>
                          <View className="mt-3 flex-row flex-wrap gap-3">
                            {featured.location ? (
                              <View className="flex-row items-center gap-1">
                                <MapPin color={Brand.inkMuted} size={13} strokeWidth={1.5} />
                                <Text className="text-xs text-ink-muted">{featured.location}</Text>
                              </View>
                            ) : null}
                            <View className="flex-row items-center gap-1">
                              <Users color={Brand.inkMuted} size={13} strokeWidth={1.5} />
                              <Text className="text-xs text-ink-muted">
                                {amenitySlotCapacity(featured.capacity)} / slot ·{' '}
                                {featured.booking_horizon_days ?? 7}d window
                              </Text>
                            </View>
                            <Text className="text-xs text-ink-muted">
                              {featured.slots.length} slots
                            </Text>
                          </View>
                        </View>
                      </Card>
                    </Pressable>
                    <Text
                      className="mb-2 mt-5 text-xs font-bold uppercase tracking-widest text-ink-muted"
                      style={{ fontFamily: FontFamily.heading }}
                    >
                      All amenities
                    </Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <EmptyState
                  visual="amenities"
                  title="No amenities"
                  subtitle="Tap + to add gym, clubhouse, etc."
                  actionLabel="Add your first amenity"
                  onAction={openCreate}
                />
              }
              renderItem={({ item }) => (
                <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 4 }}>
                  <Image
                    source={{ uri: amenityCoverUri(item) }}
                    style={{ width: '100%', height: 110 }}
                    contentFit="cover"
                    transition={200}
                  />
                  <View className="p-4">
                    <View className="mb-1 flex-row items-center gap-2">
                      <Text
                        style={{
                          ...Tokens.typography.h3,
                          color: Tokens.color.textPrimary,
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {item.is_featured ? (
                        <Star color="#F59E0B" size={14} fill="#F59E0B" strokeWidth={1.5} />
                      ) : null}
                    </View>
                    <Text
                      style={{
                        ...Tokens.typography.body,
                        color: Tokens.color.textSecondary,
                        marginBottom: 8,
                      }}
                      numberOfLines={2}
                    >
                      {item.description || 'No description'}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{ ...Tokens.typography.caption, color: Tokens.color.textMuted }}
                      >
                        {amenitySlotCapacity(item.capacity)} spots/slot ·{' '}
                        {item.booking_horizon_days ?? 7}d · max{' '}
                        {item.max_active_bookings_per_flat ?? 2}/flat
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable onPress={() => openEdit(item)} style={{ padding: 8 }}>
                          <Edit2 color={Tokens.color.primary} size={18} />
                        </Pressable>
                        <Pressable onPress={() => confirmDelete(item)} style={{ padding: 8 }}>
                          <Trash2 color={Tokens.color.danger} size={18} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Card>
              )}
            />
          )}

          <FloatingActionBtn
            onPress={openCreate}
            icon={<Plus color="#fff" size={24} />}
            label="Add Amenity"
          />
        </>
      )}

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end bg-black/40">
          <View className="max-h-[92%] rounded-t-3xl bg-surface-card px-5 pb-10 pt-5">
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text
                style={{
                  ...Tokens.typography.h2,
                  color: Tokens.color.textPrimary,
                  marginBottom: 16,
                }}
              >
                {editing ? 'Edit amenity' : 'New amenity'}
              </Text>
              {formError ? (
                <Text
                  style={{
                    ...Tokens.typography.caption,
                    color: Tokens.color.danger,
                    marginBottom: 8,
                  }}
                >
                  {formError}
                </Text>
              ) : null}

              <Text className="mb-2 text-sm font-medium text-ink-soft">Cover photo</Text>
              {coverUri ? (
                <View className="mb-3 overflow-hidden rounded-2xl">
                  <Image
                    source={{ uri: coverUri }}
                    style={{ width: '100%', height: 140 }}
                    contentFit="cover"
                  />
                  <Pressable
                    onPress={() => setCoverUri(null)}
                    className="absolute right-3 top-3 rounded-pill px-2.5 py-1"
                    style={{ backgroundColor: 'rgba(16,21,18,0.7)' }}
                  >
                    <Text className="text-xs font-semibold text-white">Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    void pickCover();
                  }}
                  className="mb-3 items-center justify-center rounded-2xl border border-dashed border-surface-border py-8"
                  style={{ backgroundColor: Pastels.sage }}
                >
                  <ImagePlus color={Brand.primary} size={22} strokeWidth={1.5} />
                  <Text
                    className="mt-2 text-sm"
                    style={{ fontFamily: FontFamily.heading, color: Brand.primary }}
                  >
                    Add cover photo
                  </Text>
                  <Text className="mt-1 text-xs text-ink-muted">
                    Optional — stock image used if empty
                  </Text>
                </Pressable>
              )}
              {coverUri ? (
                <Pressable
                  onPress={() => {
                    void pickCover();
                  }}
                  className="mb-3 items-center rounded-xl py-2.5"
                  style={{ backgroundColor: Pastels.mint }}
                >
                  <Text style={{ fontFamily: FontFamily.heading, color: Brand.primary }}>
                    Change cover
                  </Text>
                </Pressable>
              ) : null}

              <TextInput
                className="mb-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
                placeholder="Name"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                className="mb-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
                placeholder="Description"
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
              />
              <TextInput
                className="mb-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
                placeholder="Location (e.g. Tower A ground floor)"
                placeholderTextColor="#94A3B8"
                value={location}
                onChangeText={setLocation}
              />
              <Text className="mb-1 text-xs text-ink-muted">
                Spots per time slot (shared use). Use 1 for exclusive clubhouse booking.
              </Text>
              <TextInput
                className="mb-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
                placeholder="Capacity / spots per slot"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                value={capacity}
                onChangeText={setCapacity}
              />
              <Text className="mb-1 text-xs text-ink-muted">
                How far ahead residents can book (1–14 days, including today).
              </Text>
              <TextInput
                className="mb-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
                placeholder="Booking window (days)"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                value={horizonDays}
                onChangeText={setHorizonDays}
              />
              <Text className="mb-1 text-xs text-ink-muted">
                Max active upcoming bookings one flat can hold for this amenity.
              </Text>
              <TextInput
                className="mb-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
                placeholder="Max bookings per flat"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                value={maxPerFlat}
                onChangeText={setMaxPerFlat}
              />
              <Text className="mb-1 text-xs text-ink-muted">
                Booking fee in ₹ (0 = free). Requires a verified Razorpay society account.
              </Text>
              <TextInput
                className="mb-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
                placeholder="Fee (₹)"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={feeRupees}
                onChangeText={setFeeRupees}
              />
              <TextInput
                className="mb-3 min-h-[80px] rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
                placeholder="Rules / notes for residents (optional)"
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
                value={rules}
                onChangeText={setRules}
              />

              <View
                className="mb-4 flex-row items-center justify-between rounded-xl px-4 py-3"
                style={{ backgroundColor: Pastels.butter }}
              >
                <View className="mr-3 flex-1">
                  <Text style={{ fontFamily: FontFamily.heading }} className="text-[15px] text-ink">
                    Feature in special section
                  </Text>
                  <Text className="mt-0.5 text-xs text-ink-muted">
                    Highlighted at the top for residents
                  </Text>
                </View>
                <Switch
                  value={isFeatured}
                  onValueChange={setIsFeatured}
                  trackColor={{ false: '#D1D5DB', true: Brand.primarySoft }}
                  thumbColor={isFeatured ? Brand.primary : '#f4f3f4'}
                />
              </View>

              <Text className="mb-2 text-sm font-medium text-ink-soft">Slots (one per line)</Text>
              <TextInput
                className="mb-4 min-h-[120px] rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
                placeholder={'06:00-07:00\n07:00-08:00'}
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
                value={slotsText}
                onChangeText={setSlotsText}
              />

              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setModalOpen(false)}
                  className="flex-1 items-center rounded-xl border border-surface-border py-3"
                >
                  <Text
                    style={{
                      ...Tokens.typography.bodyMedium,
                      color: Tokens.color.textSecondary,
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="flex-1 items-center rounded-bubbly py-3.5"
                  style={{ backgroundColor: Tokens.color.primary }}
                >
                  {saveMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ ...Tokens.typography.bodyMedium, color: '#fff' }}>Save</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenHeader>
  );
}
