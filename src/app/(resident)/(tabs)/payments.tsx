import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react-native';
import { FlatList, Text, View } from 'react-native';

import { AppCard } from '@/components/ui/brand';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { fetchMyPaymentStatement, formatPaise } from '@/lib/ops-api';
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

function LedgerRow({ item }: { item: PaymentLedgerEntry }) {
  const outstanding = item.outstanding_paise ?? 0;
  return (
    <AppCard className="p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] text-ink" style={{ fontFamily: FontFamily.heading }}>
            {purposeLabel(String(item.purpose))}
          </Text>
          <Text className="mt-0.5 text-xs text-ink-muted">
            {new Date(item.created_at).toLocaleString()} · {statusLabel(String(item.status))}
          </Text>
          {item.notes ? (
            <Text className="mt-1 text-xs text-ink-soft" numberOfLines={2}>
              {item.notes}
            </Text>
          ) : null}
        </View>
        <View className="items-end">
          <Text className="text-base text-ink" style={{ fontFamily: FontFamily.heading }}>
            {formatPaise(item.amount_paise)}
          </Text>
          {outstanding > 0 ? (
            <Text className="mt-0.5 text-xs" style={{ color: '#C0392B' }}>
              Due {formatPaise(outstanding)}
            </Text>
          ) : (
            <Text className="mt-0.5 text-xs text-brand-700">Settled</Text>
          )}
        </View>
      </View>
    </AppCard>
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

      <View className="mx-4 mb-3 rounded-panel px-4 py-3" style={{ backgroundColor: Pastels.mint }}>
        <Text className="text-xs text-ink-muted">Outstanding balance</Text>
        <Text className="mt-1 text-2xl text-ink" style={{ fontFamily: FontFamily.display }}>
          {formatPaise(outstandingTotal)}
        </Text>
      </View>

      {isLoading && !data ? (
        <SkeletonList count={5} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          refreshControl={
            <ThemedRefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
          }
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
          renderItem={({ item }) => <LedgerRow item={item} />}
        />
      )}
    </ScreenHeader>
  );
}
