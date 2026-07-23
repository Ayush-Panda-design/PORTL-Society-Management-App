import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Toast from 'react-native-toast-message';

import { FloatingActionBtn } from '@/components/ui/brand';
import { ListRow } from '@/components/ui/list-row';
import { ScreenHeader } from '@/components/ui/screen-header';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily } from '@/constants/theme';
import { useModalBack } from '@/hooks/use-modal-back';
import { deleteGate, fetchGates, setGateCoordsFromDevice, upsertGate } from '@/lib/gates-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { Gate } from '@/types/database';

export default function AdminGatesScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();
  const gatesKey = queryKeys.gates(societyId ?? 'none');

  const [modalOpen, setModalOpen] = useState(false);
  useModalBack(modalOpen, () => setModalOpen(false));
  const [editing, setEditing] = useState<Gate | null>(null);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: gatesKey,
    queryFn: () => fetchGates(societyId!),
    enabled: Boolean(societyId),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!societyId) throw new Error('No society');
      if (!name.trim()) throw new Error('Gate name is required');
      await upsertGate({
        id: editing?.id,
        societyId,
        name: name.trim(),
        isActive,
        sortOrder: editing?.sort_order ?? (listQuery.data?.length ?? 0),
      });
    },
    onSuccess: async () => {
      setModalOpen(false);
      setEditing(null);
      setName('');
      setIsActive(true);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: gatesKey });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gatesKey }),
  });

  const pinMutation = useMutation({
    mutationFn: (id: string) => setGateCoordsFromDevice(id),
    onSuccess: async (gate) => {
      Toast.show({ type: 'success', text1: `Pinned ${gate.name}` });
      await queryClient.invalidateQueries({ queryKey: gatesKey });
    },
    onError: (e: Error) =>
      Toast.show({ type: 'error', text1: 'Could not pin gate', text2: e.message }),
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (gate: Gate) => {
    setEditing(gate);
    setName(gate.name);
    setIsActive(gate.is_active);
    setFormError(null);
    setModalOpen(true);
  };

  if (!societyId) {
    return (
      <ScreenHeader title="Gates" showBack>
        <EmptyState
          visual="disconnected"
          title="No society"
          subtitle="Link a society to manage entry gates."
        />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Gates" showBack>
      {listQuery.error ? (
        <ErrorBanner message={(listQuery.error as Error).message} />
      ) : null}
      {listQuery.isLoading ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={listQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <EmptyState
              visual="gate"
              title="No gates yet"
              subtitle="Add Main Gate, East Gate, Pedestrian entry — guards will pick one on check-in."
            />
          }
          renderItem={({ item, index }) => (
            <ListRow
              title={item.name}
              subtitle={
                item.is_active
                  ? item.latitude != null
                    ? 'Active · location pinned'
                    : 'Active'
                  : 'Inactive'
              }
              last={index === (listQuery.data?.length ?? 0) - 1}
              onPress={() => openEdit(item)}
              trailing={
                <View className="flex-row items-center gap-1">
                  <Pressable
                    onPress={() => pinMutation.mutate(item.id)}
                    accessibilityLabel="Pin gate to current location"
                    className="h-10 w-10 items-center justify-center"
                  >
                    <MapPin
                      color={item.latitude != null ? Brand.primary : Brand.inkMuted}
                      size={18}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => openEdit(item)}
                    className="h-10 w-10 items-center justify-center"
                  >
                    <Pencil color={Brand.inkSoft} size={18} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      Alert.alert('Delete gate?', item.name, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => deleteMutation.mutate(item.id),
                        },
                      ]);
                    }}
                    className="h-10 w-10 items-center justify-center"
                  >
                    <Trash2 color={Brand.inkMuted} size={18} />
                  </Pressable>
                </View>
              }
            />
          )}
        />
      )}

      <FloatingActionBtn
        onPress={openCreate}
        icon={<Plus color="#fff" size={24} />}
        label="Add"
      />

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-surface-card px-5 pb-10 pt-5">
            <Text className="mb-4 text-xl text-ink" style={{ fontFamily: FontFamily.display }}>
              {editing ? 'Edit gate' : 'New gate'}
            </Text>
            {formError ? <Text className="mb-3 text-sm text-red-500">{formError}</Text> : null}
            <TextInput
              className="mb-4 rounded-card bg-surface-muted px-4 py-3 text-base text-ink"
              placeholder="e.g. East Gate"
              placeholderTextColor={Brand.inkMuted}
              value={name}
              onChangeText={setName}
            />
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="text-sm text-ink" style={{ fontFamily: FontFamily.heading }}>
                Active for guards
              </Text>
              <Switch value={isActive} onValueChange={setIsActive} />
            </View>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setModalOpen(false)}
                className="flex-1 items-center rounded-xl border border-surface-border py-3"
              >
                <Text className="font-semibold text-ink-soft">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex-1 items-center rounded-card py-3.5"
                style={{ backgroundColor: Brand.accent }}
              >
                {saveMutation.isPending ? (
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
