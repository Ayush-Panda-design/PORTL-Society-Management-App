import { useQuery } from '@tanstack/react-query';
import { FileDown, Receipt } from 'lucide-react-native';
import { FlatList, Pressable, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { ListRow } from '@/components/ui/list-row';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StaggeredListItem } from '@/components/ui/staggered-list-item';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { fetchMyPaymentStatement, formatPaise } from '@/lib/ops-api';
import { sharePaymentReceiptPdf } from '@/lib/print-docs';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { PaymentLedgerEntry } from '@/types/database';

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

function LedgerRow({ item, index }: { item: PaymentLedgerEntry; index: number }) {
  const outstanding = item.outstanding_paise ?? 0;
  const canReceipt =
    item.status === 'confirmed' || item.status === 'partially_paid';
  return (
    <StaggeredListItem index={index}>
      <ListRow
        title={purposeLabel(String(item.purpose))}
        subtitle={`${new Date(item.created_at).toLocaleString()} · ${statusLabel(String(item.status))}`}
        meta={item.notes ?? undefined}
        accentColor={statusAccent(String(item.status))}
        onPress={canReceipt ? () => void sharePaymentReceiptPdf(item) : undefined}
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
            {canReceipt ? (
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
}

export default function PaymentStatementScreen() {
  const userId = useAuthStore((s) => s.user?.id);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.paymentStatement(userId ?? 'none'),
    queryFn: fetchMyPaymentStatement,
    enabled: Boolean(userId),
  });

  const outstandingTotal = (data ?? []).reduce(
    (sum, row) => sum + (row.outstanding_paise ?? 0),
    0,
  );

  return (
    <ScreenHeader title="Payments" subtitle="Ledger & statement" showBack>
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
          renderItem={({ item, index }) => <LedgerRow item={item} index={index} />}
        />
      )}
    </ScreenHeader>
  );
}
