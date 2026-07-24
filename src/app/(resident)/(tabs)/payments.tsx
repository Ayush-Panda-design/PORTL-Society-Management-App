import { useQuery } from '@tanstack/react-query';
import { FileDown, Receipt } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { PaymentSheet } from '@/components/payments/payment-sheet';
import { ContentContainer } from '@/components/ui/content-container';
import { GlassCard } from '@/components/ui/glass-card';
import { ListRow } from '@/components/ui/list-row';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StaggeredListItem } from '@/components/ui/staggered-list-item';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import {
  fetchMyPaymentStatement,
  formatPaise,
  initiatePartialPayment,
} from '@/lib/ops-api';
import { sharePaymentReceiptPdf } from '@/lib/print-docs';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { PaymentLedgerEntry, PaymentPurpose } from '@/types/database';

function statusLabel(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'Paid';
    case 'partially_paid':
      return 'Partial';
    case 'pending_payment':
      return 'Pending';
    case 'failed':
      return 'Failed';
    case 'expired':
      return 'Expired';
    default:
      return status;
  }
}

function purposeLabel(purpose: string): string {
  switch (purpose) {
    case 'maintenance_due':
      return 'Maintenance';
    case 'amenity_booking':
      return 'Amenity';
    case 'one_off_charge':
      return 'Charge';
    case 'fine':
      return 'Fine';
    default:
      return purpose;
  }
}

function statusAccent(status: string): string {
  switch (status) {
    case 'confirmed':
      return Brand.primary;
    case 'partially_paid':
    case 'pending_payment':
      return '#D97706';
    case 'failed':
    case 'expired':
      return '#DC2626';
    default:
      return Brand.inkMuted;
  }
}

function isPayable(item: PaymentLedgerEntry): boolean {
  const outstanding = item.outstanding_paise ?? 0;
  if (outstanding <= 0) return false;
  return (
    item.status === 'pending_payment' ||
    item.status === 'partially_paid' ||
    item.status === 'failed'
  );
}

export default function PaymentStatementScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const [paying, setPaying] = useState<PaymentLedgerEntry | null>(null);
  const [checkoutPaymentId, setCheckoutPaymentId] = useState<string | null>(null);
  const [checkoutAmount, setCheckoutAmount] = useState(0);
  const [checkoutPurpose, setCheckoutPurpose] = useState<PaymentPurpose>('maintenance_due');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [preparing, setPreparing] = useState(false);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.paymentStatement(userId ?? 'none'),
    queryFn: fetchMyPaymentStatement,
    enabled: Boolean(userId),
  });

  const outstandingTotal = (data ?? []).reduce(
    (sum, row) => sum + (row.outstanding_paise ?? 0),
    0,
  );

  const startPay = async (item: PaymentLedgerEntry) => {
    if (!societyId) return;
    const outstanding = item.outstanding_paise ?? 0;
    if (outstanding <= 0) return;

    setPreparing(true);
    setPaying(item);
    try {
      if (item.status === 'partially_paid') {
        const child = await initiatePartialPayment(item.id, outstanding);
        const childId =
          typeof child === 'object' && child && 'id' in child
            ? String((child as { id: string }).id)
            : null;
        if (!childId) throw new Error('Could not start partial payment.');
        setCheckoutPaymentId(childId);
        setCheckoutAmount(outstanding);
        setCheckoutPurpose(item.purpose as PaymentPurpose);
      } else {
        setCheckoutPaymentId(item.id);
        setCheckoutAmount(outstanding || item.amount_paise);
        setCheckoutPurpose(item.purpose as PaymentPurpose);
      }
      setSheetVisible(true);
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: e instanceof Error ? e.message : 'Could not start payment',
      });
      setPaying(null);
    } finally {
      setPreparing(false);
    }
  };

  return (
    <ScreenHeader title="Payments" subtitle="Ledger, dues & pay online" showBack>
      <ContentContainer>
      {error ? (
        <ErrorBanner message={error.message} onRetry={() => void refetch()} />
      ) : null}

      <View className="mx-4 mb-3">
        <GlassCard accentColor={outstandingTotal > 0 ? '#D97706' : Brand.primary}>
          <Text className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Outstanding balance
          </Text>
          <Text className="mt-1 text-2xl text-ink" style={{ fontFamily: FontFamily.display }}>
            {formatPaise(outstandingTotal)}
          </Text>
        </GlassCard>
      </View>

      {isLoading && !data ? (
        <SkeletonList count={5} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
          refreshControl={
            <ThemedRefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
          }
          initialNumToRender={12}
          windowSize={8}
          removeClippedSubviews
          ListEmptyComponent={
            <EmptyState
              title="No payments yet"
              subtitle="Amenity fees, maintenance, and fines will show up here."
              tips={[
                {
                  Icon: Receipt,
                  title: 'Living ledger',
                  body: 'Confirmed, partial, failed, and retry attempts all appear in one statement.',
                  tint: Brand.primary,
                  wash: Pastels.mint,
                },
              ]}
            />
          }
          renderItem={({ item, index }) => {
            const outstanding = item.outstanding_paise ?? 0;
            const canReceipt =
              item.status === 'confirmed' || item.status === 'partially_paid';
            const payable = isPayable(item);
            return (
              <StaggeredListItem index={index}>
                <ListRow
                  title={purposeLabel(String(item.purpose))}
                  subtitle={`${new Date(item.created_at).toLocaleString()} · ${statusLabel(String(item.status))}`}
                  meta={item.notes ?? undefined}
                  accentColor={statusAccent(String(item.status))}
                  onPress={
                    payable
                      ? () => void startPay(item)
                      : canReceipt
                        ? () => void sharePaymentReceiptPdf(item)
                        : undefined
                  }
                  trailing={
                    <View className="items-end">
                      <Text className="text-base text-ink" style={{ fontFamily: FontFamily.heading }}>
                        {formatPaise(item.amount_paise)}
                      </Text>
                      {outstanding > 0 ? (
                        <Text className="mt-0.5 text-xs" style={{ color: '#E11D48' }}>
                          Due {formatPaise(outstanding)}
                        </Text>
                      ) : (
                        <Text className="mt-0.5 text-xs text-brand-700">Settled</Text>
                      )}
                      {payable ? (
                        <Pressable
                          onPress={() => void startPay(item)}
                          className="mt-1.5 rounded-full bg-brand-700 px-2.5 py-1"
                          disabled={preparing && paying?.id === item.id}
                        >
                          <Text className="text-[11px] font-semibold text-white">Pay</Text>
                        </Pressable>
                      ) : canReceipt ? (
                        <Pressable
                          onPress={() => void sharePaymentReceiptPdf(item)}
                          className="mt-1.5 flex-row items-center gap-1"
                          hitSlop={8}
                        >
                          <FileDown color={Brand.primary} size={12} />
                          <Text className="text-[11px] font-semibold text-brand-700">PDF</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  }
                />
              </StaggeredListItem>
            );
          }}
        />
      )}
      </ContentContainer>

      {societyId && checkoutPaymentId ? (
        <PaymentSheet
          visible={sheetVisible}
          societyId={societyId}
          purpose={checkoutPurpose}
          amountPaise={checkoutAmount}
          existingPaymentId={checkoutPaymentId}
          title={`Pay ${purposeLabel(checkoutPurpose)}`}
          description={paying?.notes ?? undefined}
          onConfirmed={() => {
            setSheetVisible(false);
            setPaying(null);
            setCheckoutPaymentId(null);
            void refetch();
            Toast.show({ type: 'success', text1: 'Payment confirmed' });
          }}
          onClose={() => {
            setSheetVisible(false);
            setPaying(null);
            setCheckoutPaymentId(null);
          }}
        />
      ) : null}
    </ScreenHeader>
  );
}
