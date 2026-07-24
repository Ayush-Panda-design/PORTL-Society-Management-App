import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Truck } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { ChipSelector } from '@/components/ui/chip-selector';
import { ContentContainer } from '@/components/ui/content-container';
import { ListRow } from '@/components/ui/list-row';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily } from '@/constants/theme';
import { useModalBack } from '@/hooks/use-modal-back';
import {
  deleteSocietyPartner,
  fetchSocietyPartners,
  upsertSocietyPartner,
} from '@/lib/ops-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { SocietyPartner, VisitorType } from '@/types/database';

type PartnerType = Extract<VisitorType, 'delivery' | 'cab' | 'service'>;

const TYPE_OPTIONS: { value: PartnerType; label: string }[] = [
  { value: 'delivery', label: 'Delivery' },
  { value: 'cab', label: 'Cab' },
  { value: 'service', label: 'Service' },
];

export default function AdminPartnersScreen() {
  const queryClient = useQueryClient();
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SocietyPartner | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState<PartnerType>('delivery');
  const [autoApprove, setAutoApprove] = useState(true);

  useModalBack(open, () => setOpen(false));

  const partnersQuery = useQuery({
    queryKey: queryKeys.societyPartners(societyId ?? 'none'),
    queryFn: () => fetchSocietyPartners(societyId!),
    enabled: Boolean(societyId),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!societyId) throw new Error('No society');
      if (!name.trim()) throw new Error('Name is required');
      if (!phone.trim()) throw new Error('Phone is required for matching at the gate');
      return upsertSocietyPartner({
        id: editing?.id,
        societyId,
        name,
        phone,
        type,
        companyName: company,
        autoApprove,
      });
    },
    onSuccess: async () => {
      Toast.show({ type: 'success', text1: editing ? 'Partner updated' : 'Partner added' });
      setOpen(false);
      setEditing(null);
      setName('');
      setPhone('');
      setCompany('');
      await queryClient.invalidateQueries({
        queryKey: queryKeys.societyPartners(societyId ?? 'none'),
      });
    },
    onError: (err: Error) => Toast.show({ type: 'error', text1: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSocietyPartner(id),
    onSuccess: async () => {
      Toast.show({ type: 'success', text1: 'Partner removed' });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.societyPartners(societyId ?? 'none'),
      });
    },
    onError: (err: Error) => Toast.show({ type: 'error', text1: err.message }),
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setPhone('');
    setCompany('');
    setType('delivery');
    setAutoApprove(true);
    setOpen(true);
  };

  const openEdit = (partner: SocietyPartner) => {
    setEditing(partner);
    setName(partner.name);
    setPhone(partner.phone ?? '');
    setCompany(partner.company_name ?? '');
    setType(partner.type);
    setAutoApprove(partner.auto_approve);
    setOpen(true);
  };

  return (
    <ScreenHeader
      title="Gate partners"
      subtitle="Delivery, cab & service whitelist"
      showBack
      right={
        <Pressable onPress={openCreate} className="rounded-full bg-brand-700 px-3 py-2">
          <Text className="text-sm font-semibold text-white">Add</Text>
        </Pressable>
      }
    >
      <ContentContainer>
        {partnersQuery.error ? (
          <ErrorBanner
            message={partnersQuery.error.message}
            onRetry={() => void partnersQuery.refetch()}
          />
        ) : null}

        {partnersQuery.isLoading && !partnersQuery.data ? (
          <SkeletonList count={4} />
        ) : (
          <FlatList
            data={partnersQuery.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
            refreshControl={
              <ThemedRefreshControl
                refreshing={partnersQuery.isRefetching}
                onRefresh={() => void partnersQuery.refetch()}
              />
            }
            ListEmptyComponent={
              <EmptyState
                title="No approved partners"
                subtitle="Add Swiggy, Uber, or AMC techs so guards can auto-approve them at the gate."
                tips={[
                  {
                    Icon: Truck,
                    title: 'Phone match',
                    body: 'When a guard registers a matching phone + type, Portl auto-approves.',
                    tint: Brand.primary,
                    wash: '#ECFDF5',
                  },
                ]}
              />
            }
            renderItem={({ item }) => (
              <ListRow
                title={item.name}
                subtitle={`${item.type}${item.company_name ? ` · ${item.company_name}` : ''}${item.phone ? ` · ${item.phone}` : ''}`}
                meta={item.auto_approve ? 'Auto-approve on' : 'Manual only'}
                onPress={() => openEdit(item)}
                trailing={
                  <Pressable
                    onPress={() => deleteMutation.mutate(item.id)}
                    hitSlop={8}
                  >
                    <Text className="text-xs font-semibold text-status-rejected">Remove</Text>
                  </Pressable>
                }
              />
            )}
          />
        )}
      </ContentContainer>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-surface pt-12">
          <View className="flex-row items-center justify-between px-4 pb-3">
            <Text className="text-xl text-ink" style={{ fontFamily: FontFamily.heading }}>
              {editing ? 'Edit partner' : 'Add partner'}
            </Text>
            <Pressable onPress={() => setOpen(false)}>
              <Text className="text-brand-700">Close</Text>
            </Pressable>
          </View>
          <View className="px-4">
            <ChipSelector
              presentation="filter"
              options={TYPE_OPTIONS}
              value={type}
              onChange={setType}
            />
            <Text className="mb-1 mt-4 text-xs font-semibold uppercase text-ink-muted">Name</Text>
            <TextInput
              className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              value={name}
              onChangeText={setName}
              placeholder="Rider / driver name"
              placeholderTextColor="#94A3B8"
            />
            <Text className="mb-1 mt-3 text-xs font-semibold uppercase text-ink-muted">Phone</Text>
            <TextInput
              className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="10-digit mobile"
              placeholderTextColor="#94A3B8"
            />
            <Text className="mb-1 mt-3 text-xs font-semibold uppercase text-ink-muted">
              Company
            </Text>
            <TextInput
              className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
              value={company}
              onChangeText={setCompany}
              placeholder="Swiggy, Uber, …"
              placeholderTextColor="#94A3B8"
            />
            <View className="mt-4 flex-row items-center justify-between rounded-xl border border-surface-border bg-surface-card px-4 py-3">
              <Text className="text-ink">Auto-approve at gate</Text>
              <Switch value={autoApprove} onValueChange={setAutoApprove} />
            </View>
            <Pressable
              disabled={saveMutation.isPending}
              onPress={() => saveMutation.mutate()}
              className="mt-5 items-center rounded-xl bg-brand-700 py-3.5"
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">Save partner</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenHeader>
  );
}
