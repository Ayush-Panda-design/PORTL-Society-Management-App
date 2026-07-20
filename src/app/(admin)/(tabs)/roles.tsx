import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';

import { AppCard } from '@/components/ui/brand';
import { ChipSelector } from '@/components/ui/chip-selector';
import { ScreenHeader } from '@/components/ui/screen-header';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily } from '@/constants/theme';
import { fetchResidents } from '@/lib/community-api';
import {
  fetchSocietyVisitorEscalationMinutes,
  grantCommitteeRole,
  updateSocietyVisitorEscalationMinutes,
} from '@/lib/ops-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import { COMMITTEE_ROLES, type CommitteeRole } from '@/types/database';

export default function RolesSettingsScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();
  const [role, setRole] = useState<CommitteeRole>('committee');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [escalationMinutes, setEscalationMinutes] = useState('10');

  const residentsQuery = useQuery({
    queryKey: queryKeys.residents(societyId ?? 'none'),
    queryFn: () => fetchResidents(societyId!),
    enabled: Boolean(societyId),
  });

  const settingsQuery = useQuery({
    queryKey: ['visitor-escalation', societyId],
    queryFn: async () => {
      const mins = await fetchSocietyVisitorEscalationMinutes(societyId!);
      setEscalationMinutes(String(mins));
      return mins;
    },
    enabled: Boolean(societyId),
  });

  const residents = useMemo(
    () => (residentsQuery.data ?? []).filter((r) => r.role === 'resident' && r.status === 'active'),
    [residentsQuery.data],
  );

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error('Select a resident');
      return grantCommitteeRole(selectedUserId, role);
    },
    onSuccess: () => {
      Alert.alert('Granted', 'Committee permissions were added for that member.');
      setSelectedUserId(null);
    },
    onError: (e: Error) => Alert.alert('Could not grant', e.message),
  });

  const saveEscalation = useMutation({
    mutationFn: async () => {
      const mins = Math.max(1, Math.min(180, Number(escalationMinutes) || 10));
      await updateSocietyVisitorEscalationMinutes(societyId!, mins);
      return mins;
    },
    onSuccess: (mins) => {
      setEscalationMinutes(String(mins));
      void queryClient.invalidateQueries({ queryKey: ['visitor-escalation', societyId] });
      Alert.alert('Saved', `Visitors escalate after ${mins} minutes without a response.`);
    },
    onError: (e: Error) => Alert.alert('Could not save', e.message),
  });

  return (
    <ScreenHeader title="Roles & escalation" subtitle="Committee rights and visitor timers" showBack>
      <View className="px-4 pb-4">
        <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted">
          Visitor escalation (minutes)
        </Text>
        <View className="mb-4 flex-row items-center gap-2">
          <ChipSelector
            options={[
              { value: '5', label: '5m' },
              { value: '10', label: '10m' },
              { value: '15', label: '15m' },
              { value: '30', label: '30m' },
            ]}
            value={escalationMinutes}
            onChange={setEscalationMinutes}
          />
          <Pressable
            onPress={() => saveEscalation.mutate()}
            disabled={saveEscalation.isPending || settingsQuery.isLoading}
            className="rounded-card px-4 py-2.5"
            style={{ backgroundColor: Brand.primary }}
          >
            {saveEscalation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-semibold text-white">Save</Text>
            )}
          </Pressable>
        </View>

        <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted">
          Grant committee role
        </Text>
        <ChipSelector
          className="mb-3"
          options={COMMITTEE_ROLES.map((r) => ({ value: r.value, label: r.label }))}
          value={role}
          onChange={setRole}
        />
        <Text className="mb-3 text-sm text-ink-soft">
          {COMMITTEE_ROLES.find((r) => r.value === role)?.blurb}
        </Text>
      </View>

      {residentsQuery.error ? (
        <ErrorBanner
          message={residentsQuery.error.message}
          onRetry={() => void residentsQuery.refetch()}
        />
      ) : null}

      {residentsQuery.isLoading ? (
        <SkeletonList count={5} />
      ) : (
        <FlatList
          data={residents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListEmptyComponent={
            <EmptyState title="No residents" subtitle="Approve join requests first." />
          }
          ListFooterComponent={
            <Pressable
              disabled={!selectedUserId || grantMutation.isPending}
              onPress={() => grantMutation.mutate()}
              className="mt-4 items-center rounded-card py-3.5"
              style={{
                backgroundColor: selectedUserId ? Brand.primary : '#CBD5E1',
              }}
            >
              {grantMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">Grant selected role</Text>
              )}
            </Pressable>
          }
          renderItem={({ item }) => {
            const selected = selectedUserId === item.id;
            const flat = item.flats;
            const flatLabel = flat
              ? `Flat ${flat.number}`
              : 'No flat';
            return (
              <Pressable onPress={() => setSelectedUserId(item.id)}>
                <AppCard
                  className={`p-4 ${selected ? 'border-2 border-brand-500' : ''}`}
                >
                  <Text className="text-[15px] text-ink" style={{ fontFamily: FontFamily.heading }}>
                    {item.full_name ?? 'Resident'}
                  </Text>
                  <Text className="mt-0.5 text-xs text-ink-muted">{flatLabel}</Text>
                </AppCard>
              </Pressable>
            );
          }}
        />
      )}
    </ScreenHeader>
  );
}
