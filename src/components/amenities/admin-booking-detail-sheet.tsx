import type { BottomSheetModal as GorhomBottomSheetModal } from '@gorhom/bottom-sheet';
import { Phone } from 'lucide-react-native';
import { forwardRef, useCallback } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';

import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { formatAmenityBookingDate } from '@/lib/community';
import {
  adminBookingFlatLabel,
  paymentMethodLabel,
  paymentStatusPillStyle,
} from '@/lib/admin-amenity-labels';
import { formatPaise, paymentStatusLabel } from '@/lib/ops-api';
import type { AdminAmenityBookingView } from '@/types/database';

type Props = {
  booking: AdminAmenityBookingView | null;
  onCancel: (id: string, label: string) => void;
  onMarkOfflinePaid: (paymentId: string) => void;
  onRefund: (paymentId: string) => void;
  actionsPending?: boolean;
};

export const AdminBookingDetailSheet = forwardRef<GorhomBottomSheetModal, Props>(
  function AdminBookingDetailSheet(
    { booking, onCancel, onMarkOfflinePaid, onRefund, actionsPending },
    ref,
  ) {
    const callResident = useCallback(() => {
      const phone = booking?.resident_phone?.trim();
      if (!phone) return;
      const tel = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
      void Linking.openURL(`tel:${tel}`).catch(() => {
        Alert.alert('Could not open dialer');
      });
    }, [booking?.resident_phone]);

    if (!booking) {
      return (
        <BottomSheetModal ref={ref} snapPoints={['55%']}>
          <View className="px-5 pb-8" />
        </BottomSheetModal>
      );
    }

    const payStatus = booking.payment_status;
    const pill = paymentStatusPillStyle(payStatus);
    const hasFee = (booking.amount_paise ?? booking.amenity_fee_paise ?? 0) > 0;
    const canMarkOffline =
      booking.payment_id &&
      payStatus &&
      ['pending_payment', 'failed', 'expired', 'partially_paid'].includes(String(payStatus));
    const canRefund = booking.payment_id && payStatus === 'confirmed';

    return (
      <BottomSheetModal ref={ref} snapPoints={['72%']}>
        <View className="px-5 pb-10">
          <Text className="text-xl text-ink" style={{ fontFamily: FontFamily.display }}>
            {booking.amenity_name ?? 'Booking'}
          </Text>
          <Text className="mt-1 text-sm text-ink-muted">
            {formatAmenityBookingDate(booking.date)} · {booking.slot}
          </Text>

          <View className="mt-5 rounded-2xl p-4" style={{ backgroundColor: Pastels.sage }}>
            <Text className="text-xs font-bold uppercase tracking-widest text-ink-muted">
              Resident
            </Text>
            <Text
              className="mt-1 text-base text-ink"
              style={{ fontFamily: FontFamily.heading }}
            >
              {booking.resident_name ?? 'Unknown'}
            </Text>
            <Text className="mt-0.5 text-sm text-ink-muted">{adminBookingFlatLabel(booking)}</Text>
            {booking.resident_phone ? (
              <Pressable
                onPress={callResident}
                className="mt-2 flex-row items-center gap-1.5 self-start"
              >
                <Phone color={Brand.primary} size={14} strokeWidth={1.5} />
                <Text style={{ fontFamily: FontFamily.heading, color: Brand.primary }}>
                  {booking.resident_phone}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {hasFee ? (
            <View className="mt-3 rounded-2xl p-4" style={{ backgroundColor: Pastels.butter }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold uppercase tracking-widest text-ink-muted">
                  Payment
                </Text>
                {payStatus ? (
                  <View
                    className="rounded-pill px-2.5 py-0.5"
                    style={{ backgroundColor: pill.bg }}
                  >
                    <Text className="text-[11px] font-semibold" style={{ color: pill.text }}>
                      {paymentStatusLabel(String(payStatus))}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-xs text-ink-muted">No charge</Text>
                )}
              </View>
              {booking.amount_paise != null ? (
                <>
                  <Text
                    className="mt-2 text-lg text-ink"
                    style={{ fontFamily: FontFamily.heading }}
                  >
                    {formatPaise(booking.amount_paise)}
                    {payStatus === 'partially_paid' && booking.paid_paise != null ? (
                      <Text className="text-sm text-ink-muted">
                        {' '}
                        · paid {formatPaise(booking.paid_paise)}
                      </Text>
                    ) : null}
                  </Text>
                  <Text className="mt-1 text-xs text-ink-muted">
                    {paymentMethodLabel(booking.razorpay_payment_id)}
                    {booking.razorpay_payment_id &&
                    !booking.razorpay_payment_id.startsWith('offline:')
                      ? ` · ${booking.razorpay_payment_id.slice(-8)}`
                      : null}
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}

          <View className="mt-3 rounded-2xl border border-surface-border px-4 py-3">
            <Text className="text-xs text-ink-muted">
              Booked {booking.created_at ? new Date(booking.created_at).toLocaleString() : '—'}
            </Text>
            {booking.cancelled_at ? (
              <Text className="mt-1 text-xs text-ink-muted">
                Cancelled {new Date(booking.cancelled_at).toLocaleString()}
              </Text>
            ) : null}
            {booking.from_waitlist ? (
              <Text className="mt-1 text-xs text-brand-700">Promoted from waitlist</Text>
            ) : null}
            {booking.recurring_series_id ? (
              <Text className="mt-1 text-xs text-brand-700">Part of recurring series</Text>
            ) : null}
            {(booking.cancel_penalty_charged_paise ?? 0) > 0 ? (
              <Text className="mt-1 text-xs" style={{ color: '#C0392B' }}>
                Late-cancel penalty {formatPaise(booking.cancel_penalty_charged_paise!)} (
                {paymentStatusLabel(String(booking.cancel_penalty_payment_status))})
              </Text>
            ) : null}
          </View>

          <View className="mt-5 flex-row flex-wrap gap-2">
            {canMarkOffline ? (
              <Pressable
                disabled={actionsPending}
                onPress={() => onMarkOfflinePaid(booking.payment_id!)}
                className="rounded-pill px-4 py-2"
                style={{ backgroundColor: Pastels.mint }}
              >
                <Text style={{ fontFamily: FontFamily.heading, color: Brand.primary }}>
                  Mark paid offline
                </Text>
              </Pressable>
            ) : null}
            {canRefund ? (
              <Pressable
                disabled={actionsPending}
                onPress={() => onRefund(booking.payment_id!)}
                className="rounded-pill px-4 py-2"
                style={{ backgroundColor: Pastels.peach }}
              >
                <Text style={{ fontFamily: FontFamily.heading, color: Brand.accentDark }}>
                  Refund
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              disabled={actionsPending}
              onPress={() =>
                onCancel(
                  booking.id,
                  `${booking.amenity_name ?? 'slot'} · ${booking.slot}`,
                )
              }
              className="rounded-pill px-4 py-2"
              style={{ backgroundColor: '#FEE2E2' }}
            >
              <Text style={{ fontFamily: FontFamily.heading, color: '#991B1B' }}>
                Cancel booking
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheetModal>
    );
  },
);
