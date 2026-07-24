import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IndianRupee, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { ChipSelector } from '@/components/ui/chip-selector';
import { ContentContainer } from '@/components/ui/content-container';
import { ListRow } from '@/components/ui/list-row';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchField } from '@/components/ui/search-field';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily } from '@/constants/theme';
import { useModalBack } from '@/hooks/use-modal-back';
import {
  adminIssuePayment,
  adminRecordOfflinePayment,
  fetchSocietyPaymentStatement,
  formatPaise,
  paymentStatusLabel,
} from '@/lib/ops-api';
import { fetchSocietyProfiles } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { PaymentLedgerEntry, PaymentPurpose, Profile } from '@/types/database';

type IssuePurpose = Extract<PaymentPurpose, 'maintenance_due' | 'one_off_charge' | 'fine'>;

const PURPOSE_OPTIONS: { value: IssuePurpose; label: string }[] = [
  { value: 'maintenance_due', label: 'Maintenance' },
  { value: 'one_off_charge', label: 'Charge' },
  { value: 'fine', label: 'Fine' },
];

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

export default function AdminPaymentsScreen() {
  const queryClient = useQueryClient();
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const role = useAuthStore((s) => s.profile?.role);
  const permissions = useAuthStore((s) => s.permissions);
  const canIssue =
    role === 'admin' || (permissions ?? []).includes('payments.manage');
  const [purposeFilter, setPurposeFilter] = useState<'all' | IssuePurpose | 'amenity_booking'>(
    'all',
  );
  const [issueOpen, setIssueOpen] = useState(false);
  const [payerSearch, setPayerSearch] = useState('');
  const [selectedPayer, setSelectedPayer] = useState<Profile | null>(null);
  const [amountRupees, setAmountRupees] = useState('');
  const [notes, setNotes] = useState('');
  const [issuePurpose, setIssuePurpose] = useState<IssuePurpose>('maintenance_due');

  useModalBack(issueOpen, () => setIssueOpen(false));

  const statementQuery = useQuery({
    queryKey: queryKeys.societyPaymentStatement(
      societyId ?? 'none',
      purposeFilter === 'all' ? undefined : purposeFilter,
    ),
    queryFn: () =>
      fetchSocietyPaymentStatement(
        purposeFilter === 'all' ? undefined : { purpose: purposeFilter },
      ),
    enabled: Boolean(societyId),
  });

  const residentsQuery = useQuery({
    queryKey: queryKeys.societyProfiles(societyId ?? 'none'),
    queryFn: () => fetchSocietyProfiles(societyId!),
    enabled: Boolean(societyId) && issueOpen,
  });

  const issueMutation = useMutation({
    mutationFn: () => {
      if (!selectedPayer) throw new Error('Select a resident');
      const rupees = Number(amountRupees);
      if (!Number.isFinite(rupees) || rupees < 1) {
        throw new Error('Enter an amount of at least ₹1');
      }
      return adminIssuePayment({
        payerId: selectedPayer.id,
        purpose: issuePurpose,
        amountPaise: Math.round(rupees * 100),
        notes: notes.trim() || null,
      });
    },
    onSuccess: async (result) => {
      Toast.show({ type: 'success', text1: 'Due issued' });
      if (!result.pushOk && result.pushError) {
        Toast.show({
          type: 'info',
          text1: 'Push not delivered',
          text2: result.pushError,
        });
      }
      setIssueOpen(false);
      setSelectedPayer(null);
      setAmountRupees('');
      setNotes('');
      await queryClient.invalidateQueries({
        queryKey: queryKeys.societyPaymentStatement(societyId ?? 'none'),
      });
    },
    onError: (err: Error) => {
      Toast.show({ type: 'error', text1: err.message });
    },
  });

  // adminIssuePayment returns pushOk so we can surface delivery failures.

  const offlineMutation = useMutation({
    mutationFn: (paymentId: string) => adminRecordOfflinePayment(paymentId, 'cash', 'Offline settle'),
    onSuccess: async () => {
      Toast.show({ type: 'success', text1: 'Marked paid offline' });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.societyPaymentStatement(societyId ?? 'none'),
      });
    },
    onError: (err: Error) => Toast.show({ type: 'error', text1: err.message }),
  });

  const payers = useMemo(() => {
    const q = payerSearch.trim().toLowerCase();
    return (residentsQuery.data ?? [])
      .filter((p) => p.role === 'resident' || p.role === 'admin')
      .filter((p) => p.status === 'active')
      .filter((p) => {
        if (!q) return true;
        return [p.full_name ?? '', p.phone ?? ''].join(' ').toLowerCase().includes(q);
      })
      .slice(0, 20);
  }, [residentsQuery.data, payerSearch]);

  const rows = statementQuery.data ?? [];

  return (
    <ScreenHeader
      title="Payments & dues"
      subtitle={canIssue ? 'Issue maintenance, view ledger' : 'Society payment ledger'}
      showBack
      right={
        canIssue ? (
          <Pressable
            onPress={() => setIssueOpen(true)}
            className="h-10 flex-row items-center gap-1 rounded-full bg-brand-700 px-3"
          >
            <Plus color="#fff" size={16} />
            <Text className="text-sm font-semibold text-white">Issue</Text>
          </Pressable>
        ) : undefined
      }
    >
      <ContentContainer>
        <View className="px-4 pb-2">
          <ChipSelector
            presentation="filter"
            options={[
              { value: 'all', label: 'All' },
              { value: 'maintenance_due', label: 'Maintenance' },
              { value: 'fine', label: 'Fines' },
              { value: 'one_off_charge', label: 'Charges' },
              { value: 'amenity_booking', label: 'Amenities' },
            ]}
            value={purposeFilter}
            onChange={setPurposeFilter}
          />
        </View>

        {statementQuery.error ? (
          <ErrorBanner
            message={statementQuery.error.message}
            onRetry={() => void statementQuery.refetch()}
          />
        ) : null}

        {statementQuery.isLoading && !statementQuery.data ? (
          <SkeletonList count={5} />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
            refreshControl={
              <ThemedRefreshControl
                refreshing={statementQuery.isRefetching}
                onRefresh={() => void statementQuery.refetch()}
              />
            }
            ListEmptyComponent={
              <EmptyState
                title="No payments yet"
                subtitle="Issue a maintenance due or wait for amenity bookings."
                tips={[
                  {
                    Icon: IndianRupee,
                    title: 'Issue dues',
                    body: 'Tap Issue to bill a resident. They can pay from Payments.',
                    tint: Brand.primary,
                    wash: '#ECFDF5',
                  },
                ]}
              />
            }
            renderItem={({ item }: { item: PaymentLedgerEntry }) => {
              const outstanding = item.outstanding_paise ?? 0;
              return (
                <ListRow
                  title={purposeLabel(String(item.purpose))}
                  subtitle={`${new Date(item.created_at).toLocaleString()} · ${paymentStatusLabel(String(item.status))}`}
                  meta={item.notes ?? undefined}
                  trailing={
                    <View className="items-end">
                      <Text className="text-base text-ink" style={{ fontFamily: FontFamily.heading }}>
                        {formatPaise(item.amount_paise)}
                      </Text>
                      {outstanding > 0 ? (
                        <Pressable
                          onPress={() => offlineMutation.mutate(item.id)}
                          className="mt-1"
                          hitSlop={8}
                        >
                          <Text className="text-[11px] font-semibold text-brand-700">
                            Mark paid
                          </Text>
                        </Pressable>
                      ) : (
                        <Text className="mt-0.5 text-xs text-brand-700">Settled</Text>
                      )}
                    </View>
                  }
                />
              );
            }}
          />
        )}
      </ContentContainer>

      <Modal visible={issueOpen} animationType="slide" onRequestClose={() => setIssueOpen(false)}>
        <View className="flex-1 bg-surface pt-12">
          <View className="flex-row items-center justify-between px-4 pb-3">
            <Text className="text-xl text-ink" style={{ fontFamily: FontFamily.heading }}>
              Issue due
            </Text>
            <Pressable onPress={() => setIssueOpen(false)}>
              <Text className="text-brand-700">Close</Text>
            </Pressable>
          </View>

          <View className="px-4">
            <ChipSelector
              presentation="filter"
              options={PURPOSE_OPTIONS}
              value={issuePurpose}
              onChange={setIssuePurpose}
            />
            <Text className="mb-1 mt-4 text-xs font-semibold uppercase text-ink-muted">
              Amount (₹)
            </Text>
            <TextInput
              className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              keyboardType="decimal-pad"
              value={amountRupees}
              onChangeText={setAmountRupees}
              placeholder="e.g. 2500"
              placeholderTextColor="#94A3B8"
            />
            <Text className="mb-1 mt-3 text-xs font-semibold uppercase text-ink-muted">Notes</Text>
            <TextInput
              className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              value={notes}
              onChangeText={setNotes}
              placeholder="March maintenance"
              placeholderTextColor="#94A3B8"
            />
            <Text className="mb-1 mt-3 text-xs font-semibold uppercase text-ink-muted">
              Resident
            </Text>
            {selectedPayer ? (
              <Pressable
                onPress={() => setSelectedPayer(null)}
                className="mb-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3"
              >
                <Text className="font-semibold text-ink">
                  {selectedPayer.full_name ?? 'Resident'}
                </Text>
                <Text className="text-xs text-ink-muted">Tap to change</Text>
              </Pressable>
            ) : (
              <>
                <SearchField
                  value={payerSearch}
                  onChangeText={setPayerSearch}
                  placeholder="Search residents…"
                />
                <FlatList
                  data={payers}
                  keyExtractor={(p) => p.id}
                  style={{ maxHeight: 220, marginTop: 8 }}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => setSelectedPayer(item)}
                      className="border-b border-surface-border px-2 py-3"
                    >
                      <Text className="font-medium text-ink">
                        {item.full_name ?? 'Unnamed'}
                      </Text>
                    </Pressable>
                  )}
                />
              </>
            )}

            <Pressable
              disabled={issueMutation.isPending}
              onPress={() => issueMutation.mutate()}
              className="mt-4 items-center rounded-xl bg-brand-700 py-3.5"
            >
              {issueMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">Issue payment</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenHeader>
  );
}
