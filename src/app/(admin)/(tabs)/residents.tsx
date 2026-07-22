import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Toast from 'react-native-toast-message';

import { InitialsAvatar } from '@/components/ui/brand';
import { ChipSelector } from '@/components/ui/chip-selector';
import { ListRow } from '@/components/ui/list-row';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchField } from '@/components/ui/search-field';
import { StaggeredListItem } from '@/components/ui/staggered-list-item';
import { SwipeActionRow, type SwipeAction } from '@/components/ui/swipe-action-row';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { FontFamily, Brand, Pastels } from '@/constants/theme';
import { useModalBack } from '@/hooks/use-modal-back';
import {
  assignResidentFlat,
  fetchFlats,
  fetchResidents,
} from '@/lib/community-api';
import { hapticConfirm, hapticLight, hapticWarning } from '@/lib/haptics';
import { queryKeys } from '@/lib/query-client';
import { href } from '@/lib/href';
import { flatTowerName } from '@/lib/visitors';
import { useAuthStore } from '@/stores/authStore';
import type { ProfileWithFlat } from '@/types/database';

function flatLabel(profile: ProfileWithFlat): string {
  if (!profile.flats) return 'No flat assigned';
  const tower = flatTowerName(profile.flats.towers);
  return tower ? `${tower} · Flat ${profile.flats.number}` : `Flat ${profile.flats.number}`;
}

function matchesSearch(profile: ProfileWithFlat, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [profile.full_name ?? '', profile.phone ?? '', flatLabel(profile)]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export default function AdminResidentsScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const residentsKey = queryKeys.residents(societyId ?? 'none');
  const params = useLocalSearchParams<{ q?: string }>();
  const initialQuery = typeof params.q === 'string' ? params.q : Array.isArray(params.q) ? params.q[0] ?? '' : '';

  const [search, setSearch] = useState(initialQuery);
  const [assignOpen, setAssignOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<ProfileWithFlat | null>(null);
  const [flatId, setFlatId] = useState<string>('none');
  const [formError, setFormError] = useState<string | null>(null);

  useModalBack(detailOpen, () => setDetailOpen(false));
  useModalBack(assignOpen, () => setAssignOpen(false));

  useEffect(() => {
    if (initialQuery) setSearch(initialQuery);
  }, [initialQuery]);

  const listQuery = useQuery({
    queryKey: residentsKey,
    queryFn: () => fetchResidents(societyId!),
    enabled: Boolean(societyId),
  });

  const flatsQuery = useQuery({
    queryKey: queryKeys.flats(societyId ?? 'none'),
    queryFn: () => fetchFlats(societyId!),
    enabled: Boolean(societyId),
  });

  const flatOptions = useMemo(
    () => [
      { value: 'none', label: 'Unassigned' },
      ...(flatsQuery.data ?? []).map((f) => {
        const tower = flatTowerName(f.towers);
        return {
          value: f.id,
          label: tower ? `${tower} · ${f.number}` : `Flat ${f.number}`,
        };
      }),
    ],
    [flatsQuery.data],
  );

  const filtered = useMemo(
    () => (listQuery.data ?? []).filter((p) => matchesSearch(p, search)),
    [listQuery.data, search],
  );

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('No resident selected.');
      await assignResidentFlat({
        profileId: selected.id,
        flatId: flatId === 'none' ? null : flatId,
      });
    },
    onMutate: async () => {
      if (!selected) return { previous: undefined };
      await queryClient.cancelQueries({ queryKey: residentsKey });
      const previous = queryClient.getQueryData<ProfileWithFlat[]>(residentsKey);
      const nextFlat =
        flatId === 'none'
          ? null
          : (flatsQuery.data ?? []).find((f) => f.id === flatId) ?? null;

      queryClient.setQueryData<ProfileWithFlat[]>(residentsKey, (old = []) =>
        old.map((p) =>
          p.id === selected.id
            ? {
                ...p,
                flat_id: nextFlat?.id ?? null,
                flats: nextFlat
                  ? {
                      id: nextFlat.id,
                      number: nextFlat.number,
                      towers: nextFlat.towers
                        ? Array.isArray(nextFlat.towers)
                          ? nextFlat.towers[0]
                            ? {
                                id: nextFlat.towers[0].id,
                                name: nextFlat.towers[0].name,
                              }
                            : null
                          : {
                              id: nextFlat.towers.id,
                              name: nextFlat.towers.name,
                            }
                        : null,
                    }
                  : null,
              }
            : p,
        ),
      );
      return { previous };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(residentsKey, context.previous);
      setFormError(e.message);
    },
    onSuccess: () => {
      hapticConfirm();
      Toast.show({ type: 'success', text1: 'Flat assignment saved' });
      setAssignOpen(false);
      setFormError(null);
      setSelected(null);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: residentsKey });
      if (societyId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.adminDashboard(societyId),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.societyProfiles(societyId),
        });
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: (profile: ProfileWithFlat) =>
      assignResidentFlat({ profileId: profile.id, flatId: null }),
    onMutate: async (profile) => {
      await queryClient.cancelQueries({ queryKey: residentsKey });
      const previous = queryClient.getQueryData<ProfileWithFlat[]>(residentsKey);
      queryClient.setQueryData<ProfileWithFlat[]>(residentsKey, (old = []) =>
        old.map((p) => (p.id === profile.id ? { ...p, flat_id: null, flats: null } : p)),
      );
      return { previous };
    },
    onError: (e: Error, _profile, context) => {
      if (context?.previous) queryClient.setQueryData(residentsKey, context.previous);
      Toast.show({ type: 'error', text1: 'Could not remove flat', text2: e.message });
    },
    onSuccess: () => {
      hapticWarning();
      Toast.show({ type: 'success', text1: 'Removed from flat' });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: residentsKey });
      if (societyId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.adminDashboard(societyId),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.societyProfiles(societyId),
        });
      }
    },
  });

  const confirmRemove = (item: ProfileWithFlat) => {
    Alert.alert(
      'Remove from flat?',
      `“${item.full_name ?? 'This resident'}” will be unassigned from ${flatLabel(item)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeMutation.mutate(item),
        },
      ],
    );
  };

  const openDetail = (item: ProfileWithFlat) => {
    setSelected(item);
    setDetailOpen(true);
  };

  const openAssign = (item: ProfileWithFlat) => {
    setSelected(item);
    setFlatId(item.flat_id ?? 'none');
    setFormError(null);
    setAssignOpen(true);
  };

  if (!societyId) {
    return (
      <ScreenHeader title="Residents">
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Assign a society to your admin profile."
        />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Residents" subtitle="Assign members to flats" showMenu>
      <View className="px-4">
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, phone, or flat"
          accessibilityLabel="Search residents"
        />
      </View>

      {listQuery.error ? (
        <ErrorBanner message={listQuery.error.message} onRetry={() => void listQuery.refetch()} />
      ) : null}

      {listQuery.isLoading && !listQuery.data ? (
        <SkeletonList count={5} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          windowSize={8}
          maxToRenderPerBatch={10}
          removeClippedSubviews
          refreshControl={
            <ThemedRefreshControl
              refreshing={listQuery.isRefetching}
              onRefresh={() => void listQuery.refetch()}
            />
          }
          ListEmptyComponent={
            <EmptyState
              visual="residents"
              title={search.trim() ? 'No matches' : 'No residents yet'}
              subtitle={
                search.trim()
                  ? 'Try a different name, phone, or flat.'
                  : 'Residents appear here after signing up with the resident role.'
              }
              actionLabel={!search.trim() ? 'Share invite link' : undefined}
              onAction={!search.trim() ? () => router.push(href('/(admin)/invites')) : undefined}
            />
          }
          renderItem={({ item, index }) => {
            const name = item.full_name ?? 'Unnamed resident';
            const actions: SwipeAction[] = [
              ...(item.phone
                ? [
                    {
                      key: 'call',
                      label: 'Call',
                      color: Brand.primary,
                      onPress: () => {
                        hapticLight();
                        void Linking.openURL(`tel:${item.phone}`);
                      },
                    },
                  ]
                : []),
              {
                key: 'reassign',
                label: item.flat_id ? 'Reassign' : 'Assign',
                color: Brand.primary,
                onPress: () => openAssign(item),
              },
              ...(item.flat_id
                ? [
                    {
                      key: 'remove',
                      label: 'Remove',
                      color: '#DC2626',
                      onPress: () => confirmRemove(item),
                    },
                  ]
                : []),
            ];

            return (
              <StaggeredListItem index={index} disabled={listQuery.isRefetching}>
                <SwipeActionRow actions={actions}>
                  <ListRow
                    title={name}
                    subtitle={flatLabel(item)}
                    meta={item.phone ?? undefined}
                    last={index === filtered.length - 1}
                    accessibilityLabel={`View ${name} profile`}
                    onPress={() => openDetail(item)}
                    leading={
                      <InitialsAvatar
                        name={name}
                        seed={item.id}
                        size={44}
                        imageUrl={item.avatar_url}
                        hasUnread={!item.flat_id}
                        status={item.flat_id ? 'online' : 'pending'}
                      />
                    }
                    trailing={<ChevronRight color={Brand.inkMuted} size={16} strokeWidth={1.5} />}
                  />
                </SwipeActionRow>
              </StaggeredListItem>
            );
          }}
        />
      )}

      <Modal
        visible={detailOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close profile"
            className="absolute inset-0"
            onPress={() => setDetailOpen(false)}
          />
          <View className="rounded-t-[28px] bg-surface px-5 pb-10 pt-3">
            <View className="mb-4 items-center">
              <View className="mb-4 h-1 w-10 rounded-full bg-surface-muted" />
              <View
                className="rounded-full p-1"
                style={{ backgroundColor: Pastels.rose }}
              >
                <InitialsAvatar
                  name={selected?.full_name ?? 'Resident'}
                  seed={selected?.id}
                  size={72}
                  imageUrl={selected?.avatar_url}
                />
              </View>
              <Text
                className="mt-3.5 text-[22px] text-ink"
                style={{ fontFamily: FontFamily.display }}
              >
                {selected?.full_name ?? 'Unnamed resident'}
              </Text>
              <View
                className="mt-2 rounded-pill px-3 py-1"
                style={{ backgroundColor: Pastels.rose }}
              >
                <Text
                  className="text-[12px]"
                  style={{ fontFamily: FontFamily.heading, color: Brand.primaryDark }}
                >
                  Resident profile
                </Text>
              </View>
            </View>

            <View
              className="mb-4 overflow-hidden rounded-[20px] bg-surface-card"
              style={{
                shadowColor: '#0F172A',
                shadowOpacity: 0.06,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
              }}
            >
              <DetailRow label="Phone" value={selected?.phone ?? '—'} />
              <DetailRow label="Flat" value={selected ? flatLabel(selected) : '—'} />
              <DetailRow label="Occupation" value={selected?.occupation?.trim() || '—'} />
              <DetailRow label="Bio" value={selected?.bio?.trim() || '—'} />
              <DetailRow
                label="Emergency contact"
                value={
                  selected?.emergency_contact_name || selected?.emergency_contact_phone
                    ? [selected?.emergency_contact_name, selected?.emergency_contact_phone]
                        .filter(Boolean)
                        .join(' · ')
                    : '—'
                }
              />
              <DetailRow
                label="Vehicle"
                value={selected?.vehicle_number?.trim() || '—'}
              />
              <DetailRow
                label="Joined"
                value={
                  selected?.created_at
                    ? new Date(selected.created_at).toLocaleDateString()
                    : '—'
                }
                last
              />
            </View>
            <Text className="mb-5 text-xs leading-4 text-ink-muted">
              Private details and personal notes are only visible to the member — admins cannot
              access them.
            </Text>

            <View className="flex-row gap-2.5">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setDetailOpen(false)}
                className="flex-1 items-center rounded-[16px] border border-surface-border bg-surface-card py-3.5"
              >
                <Text className="font-semibold text-ink-soft">Close</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Assign flat"
                onPress={() => {
                  if (!selected) return;
                  setDetailOpen(false);
                  openAssign(selected);
                }}
                className="flex-1 items-center rounded-[16px] py-3.5"
                style={{
                  backgroundColor: Brand.primary,
                  shadowColor: Brand.primary,
                  shadowOpacity: 0.28,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 4,
                }}
              >
                <Text className="font-semibold text-white">
                  {selected?.flat_id ? 'Reassign' : 'Assign flat'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={assignOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setAssignOpen(false)}
      >
        <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end bg-black/40">
          <View className="max-h-[90%] rounded-t-3xl bg-surface-card px-5 pb-10 pt-5">
            <Text className="mb-1 text-xl font-bold text-ink">
              {selected?.flat_id ? 'Reassign flat' : 'Assign flat'}
            </Text>
            <Text className="mb-4 text-sm text-ink-muted">
              {selected?.full_name ?? 'Resident'}
            </Text>
            {formError ? <Text className="mb-2 text-sm text-red-500">{formError}</Text> : null}

            {(flatsQuery.data?.length ?? 0) === 0 ? (
              <Text className="mb-4 text-sm text-ink-soft">
                No flats exist yet. Create towers and flats first, then assign residents.
              </Text>
            ) : (
              <View className="mb-4">
                <ChipSelector
                  title="Flat"
                  presentation="sheet"
                  options={flatOptions}
                  value={flatId}
                  onChange={setFlatId}
                />
              </View>
            )}

            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                onPress={() => setAssignOpen(false)}
                className="flex-1 items-center rounded-xl border border-surface-border py-3"
              >
                <Text className="font-semibold text-ink-soft">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save flat assignment"
                onPress={() => assignMutation.mutate()}
                disabled={assignMutation.isPending || (flatsQuery.data?.length ?? 0) === 0}
                className="flex-1 items-center rounded-[16px] py-3.5"
                style={{
                  backgroundColor: Brand.primary,
                  shadowColor: Brand.primary,
                  shadowOpacity: 0.28,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 4,
                }}
              >
                {assignMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-semibold text-white">Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenHeader>
  );
}

function DetailRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  const multiline = value.length > 40 || value.includes('\n');
  return (
    <View
      className={
        multiline
          ? `gap-1 px-4 py-3.5 ${last ? '' : 'border-b border-surface-border'}`
          : `flex-row items-start justify-between gap-3 px-4 py-3.5 ${
              last ? '' : 'border-b border-surface-border'
            }`
      }
    >
      <Text className="text-[13px] text-ink-muted">{label}</Text>
      <Text
        className={
          multiline
            ? 'text-[14px] font-medium text-ink'
            : 'flex-1 text-right text-[14px] font-medium text-ink'
        }
      >
        {value}
      </Text>
    </View>
  );
}
