import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  NativeModules,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';

import { Brand, FontFamily } from '@/constants/theme';
import { useModalBack } from '@/hooks/use-modal-back';
import {
  messageFromFunctionInvoke,
  paymentErrorIsNativeUnavailable,
  paymentErrorNeedsRebook,
  toUserFriendlyPaymentMessage,
} from '@/lib/payment-user-messages';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Payment, PaymentPurpose } from '@/types/database';

const CONFIRM_WAIT_MS = 10 * 60 * 1000;

type Phase =
  | 'idle'
  | 'initiating'
  | 'checkout'
  | 'waiting'
  | 'confirmed'
  | 'expired'
  | 'cancelled'
  | 'error';

export type PaymentSheetProps = {
  visible: boolean;
  societyId: string;
  purpose: PaymentPurpose;
  amountPaise: number;
  referenceId?: string | null;
  /** Shown in the sheet and Razorpay checkout. */
  title?: string;
  description?: string;
  onConfirmed: (payment: Payment) => void;
  onClose: () => void;
};

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

function razorpayKey(): string {
  return process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID?.trim() ?? '';
}

function isRazorpayNativeLinked(): boolean {
  if (Platform.OS === 'web') return false;
  return Boolean(NativeModules.RNRazorpayCheckout);
}

export function PaymentSheet({
  visible,
  societyId,
  purpose,
  amountPaise,
  referenceId = null,
  title = 'Complete payment',
  description,
  onConfirmed,
  onClose,
}: PaymentSheetProps) {
  const profile = useAuthStore((s) => s.profile);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(true);
  const [payment, setPayment] = useState<Payment | null>(null);

  const instanceId = useRef(`p${Math.random().toString(36).slice(2, 10)}`).current;
  const startedRef = useRef(false);
  const confirmedRef = useRef(false);
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubRealtimeRef = useRef<(() => void) | null>(null);

  const clearWait = useCallback(() => {
    if (waitTimerRef.current) {
      clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }
    unsubRealtimeRef.current?.();
    unsubRealtimeRef.current = null;
  }, []);

  const reset = useCallback(() => {
    startedRef.current = false;
    confirmedRef.current = false;
    clearWait();
    setPhase('idle');
    setError(null);
    setCanRetry(true);
    setPayment(null);
  }, [clearWait]);

  const showPaymentError = useCallback((rawMessage: string) => {
    const friendly = toUserFriendlyPaymentMessage(rawMessage);
    setError(friendly);
    setCanRetry(
      !paymentErrorNeedsRebook(rawMessage) &&
        !paymentErrorNeedsRebook(friendly) &&
        !paymentErrorIsNativeUnavailable(rawMessage) &&
        !paymentErrorIsNativeUnavailable(friendly),
    );
    setPhase('error');
  }, []);

  const finishConfirmed = useCallback(
    (row: Payment) => {
      if (confirmedRef.current) return;
      confirmedRef.current = true;
      clearWait();
      setPayment(row);
      setPhase('confirmed');
      onConfirmed(row);
    },
    [clearWait, onConfirmed],
  );

  const finishExpired = useCallback(
    (message?: string) => {
      if (confirmedRef.current) return;
      clearWait();
      setError(
        toUserFriendlyPaymentMessage(message ?? 'Payment expired before confirmation.'),
      );
      setCanRetry(false);
      setPhase('expired');
      // Expiry cron also frees holds; no client abandon needed for server-side expire.
    },
    [clearWait],
  );

  const watchPaymentConfirmation = useCallback(
    (paymentId: string) => {
      clearWait();
      setPhase('waiting');

      waitTimerRef.current = setTimeout(() => {
        finishExpired('Timed out waiting for confirmation from your bank.');
      }, CONFIRM_WAIT_MS);

      const channelName = `payments:${paymentId}:${instanceId}`;
      const channel = supabase.channel(channelName);

      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `id=eq.${paymentId}`,
        },
        (payload) => {
          const row = payload.new as Payment;
          setPayment(row);
          if (row.status === 'confirmed') {
            finishConfirmed(row);
            return;
          }
          if (row.status === 'expired' || row.status === 'failed') {
            finishExpired(
              row.status === 'failed'
                ? 'Your payment did not go through.'
                : 'Payment was not confirmed in time.',
            );
          }
        },
      );

      channel.subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return;

        // Catch a webhook that beat the subscription (same defensive re-fetch as visitors).
        const { data, error: fetchError } = await supabase
          .from('payments')
          .select('*')
          .eq('id', paymentId)
          .maybeSingle();

        if (fetchError || !data) return;

        const row = data as Payment;
        setPayment(row);
        if (row.status === 'confirmed') {
          finishConfirmed(row);
        } else if (row.status === 'expired' || row.status === 'failed') {
          finishExpired(
            row.status === 'failed'
              ? 'Your payment did not go through.'
              : 'Payment was not confirmed in time.',
          );
        }
      });

      unsubRealtimeRef.current = () => {
        void supabase.removeChannel(channel);
      };
    },
    [clearWait, finishConfirmed, finishExpired, instanceId],
  );

  const abandonIfNeeded = useCallback(async (paymentId: string | null | undefined) => {
    if (!paymentId) return;
    try {
      await supabase.rpc('abandon_payment', { p_payment_id: paymentId });
    } catch {
      // Best-effort; cron expiry still frees holds.
    }
  }, []);

  const startCheckout = useCallback(async () => {
    if (Platform.OS === 'web') {
      showPaymentError('Payments are not available on web.');
      return;
    }

    const key = razorpayKey();
    if (!key) {
      showPaymentError('Missing EXPO_PUBLIC_RAZORPAY_KEY_ID.');
      return;
    }

    setPhase('initiating');
    setError(null);
    let paymentId: string | null = null;

    try {
      const { data, error: rpcError } = await supabase.rpc('initiate_payment', {
        p_society_id: societyId,
        p_purpose: purpose,
        p_reference_id: referenceId,
        p_amount_paise: amountPaise,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const row = data as Payment | null;
      if (!row?.id) {
        throw new Error('Could not start payment.');
      }
      paymentId = row.id;
      setPayment(row);

      const {
        data: orderData,
        error: orderError,
        response: orderResponse,
      } = await supabase.functions.invoke('create-razorpay-order', {
        body: { paymentId: row.id },
      });

      if (orderError) {
        const detail = await messageFromFunctionInvoke(orderError, orderResponse);
        throw new Error(detail || orderError.message);
      }

      const orderPayload = orderData as {
        orderId?: string;
        amountPaise?: number;
        keyId?: string;
        error?: string;
      } | null;

      if (!orderPayload?.orderId) {
        throw new Error(orderPayload?.error ?? 'Payment order was not created.');
      }

      setPayment((prev) =>
        prev
          ? { ...prev, razorpay_order_id: orderPayload.orderId ?? prev.razorpay_order_id }
          : prev,
      );
      setPhase('checkout');

      if (!isRazorpayNativeLinked()) {
        throw new Error('RAZORPAY_NATIVE_UNAVAILABLE');
      }

      await RazorpayCheckout.open({
        key: orderPayload.keyId || key,
        amount: orderPayload.amountPaise ?? row.amount_paise,
        currency: 'INR',
        name: 'Portl',
        description: description ?? title,
        order_id: orderPayload.orderId,
        prefill: {
          name: profile?.full_name ?? undefined,
          contact: profile?.phone ?? undefined,
        },
        theme: { color: Brand.primary },
        notes: {
          payment_id: row.id,
          purpose: row.purpose,
        },
      });

      // SDK success is not source of truth — wait for webhook via Realtime.
      watchPaymentConfirmation(row.id);
    } catch (e) {
      const message =
        typeof e === 'object' &&
        e !== null &&
        'description' in e &&
        typeof (e as { description?: unknown }).description === 'string'
          ? (e as { description: string }).description
          : e instanceof Error
            ? e.message
            : 'Payment cancelled or failed';

      const code =
        typeof e === 'object' && e !== null && 'code' in e
          ? Number((e as { code?: unknown }).code)
          : null;

      const nativeUnavailable =
        /razorpay_native_unavailable/i.test(message) ||
        /cannot read property 'open' of null/i.test(message);

      if (!nativeUnavailable) {
        await abandonIfNeeded(paymentId);
      }

      // Razorpay user-cancel codes are typically 0 / 2.
      if (code === 0 || code === 2 || /cancel/i.test(message)) {
        setPhase('cancelled');
        setError(toUserFriendlyPaymentMessage(message));
        setCanRetry(true);
        return;
      }

      showPaymentError(message);
    }
  }, [
    abandonIfNeeded,
    showPaymentError,
    amountPaise,
    description,
    profile?.full_name,
    profile?.phone,
    purpose,
    referenceId,
    societyId,
    title,
    watchPaymentConfirmation,
  ]);

  useEffect(() => {
    if (!visible) {
      reset();
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    void startCheckout();
  }, [visible, reset, startCheckout]);

  useEffect(() => {
    return () => {
      clearWait();
    };
  }, [clearWait]);

  const busy = phase === 'initiating' || phase === 'checkout' || phase === 'waiting';
  const canDismiss = !busy || phase === 'waiting';

  useModalBack(visible, () => {
    if (canDismiss) onClose();
  });

  const statusCopy = (() => {
    switch (phase) {
      case 'initiating':
        return 'Starting secure payment…';
      case 'checkout':
        return 'Opening Razorpay…';
      case 'waiting':
        return 'Confirming payment with your society…';
      case 'confirmed':
        return 'Payment confirmed.';
      case 'expired':
        return error ?? 'Payment expired.';
      case 'cancelled':
        return error ?? 'Payment cancelled.';
      case 'error':
        return error ?? 'Something went wrong.';
      default:
        return '';
    }
  })();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => {
        if (canDismiss) onClose();
      }}
    >
      <Pressable
        className="flex-1 justify-end bg-black/45"
        onPress={() => {
          if (canDismiss) onClose();
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
            {title}
          </Text>
          <Text className="mb-1 text-sm text-ink-muted">
            {description ?? `Pay ${formatRupees(amountPaise)}`}
          </Text>
          <Text
            className="mb-6 text-2xl text-ink"
            style={{ fontFamily: FontFamily.heading }}
          >
            {formatRupees(amountPaise)}
          </Text>

          {busy ? (
            <View className="mb-6 items-center gap-3 py-4">
              <ActivityIndicator color={Brand.primary} size="large" />
              <Text className="text-center text-sm text-ink-soft">{statusCopy}</Text>
              {phase === 'waiting' ? (
                <Text className="text-center text-xs text-ink-muted">
                  Waiting for bank confirmation. Do not close the app.
                </Text>
              ) : null}
            </View>
          ) : (
            <View className="mb-6 rounded-2xl bg-surface px-4 py-3">
              <Text className="text-sm leading-5 text-ink-soft">{statusCopy}</Text>
            </View>
          )}

          <View className="flex-row gap-2">
            {phase === 'error' || phase === 'cancelled' || phase === 'expired' ? (
              <>
                <Pressable
                  onPress={onClose}
                  className="flex-1 items-center rounded-xl border border-surface-border py-3.5"
                >
                  <Text className="font-semibold text-ink-soft">Close</Text>
                </Pressable>
                {phase !== 'expired' && canRetry ? (
                  <Pressable
                    onPress={() => {
                      reset();
                      startedRef.current = true;
                      void startCheckout();
                    }}
                    className="flex-1 items-center rounded-bubbly py-3.5"
                    style={{ backgroundColor: Brand.primary }}
                  >
                    <Text className="font-semibold text-white">Try again</Text>
                  </Pressable>
                ) : null}
              </>
            ) : phase === 'confirmed' ? (
              <Pressable
                onPress={onClose}
                className="flex-1 items-center rounded-bubbly py-3.5"
                style={{ backgroundColor: Brand.primary }}
              >
                <Text className="font-semibold text-white">Done</Text>
              </Pressable>
            ) : phase === 'waiting' ? (
              <Pressable
                onPress={onClose}
                className="flex-1 items-center rounded-xl border border-surface-border py-3.5"
              >
                <Text className="font-semibold text-ink-soft">Hide</Text>
              </Pressable>
            ) : (
              <Pressable
                disabled
                className="flex-1 items-center rounded-xl border border-surface-border py-3.5 opacity-50"
              >
                <Text className="font-semibold text-ink-soft">Please wait</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
