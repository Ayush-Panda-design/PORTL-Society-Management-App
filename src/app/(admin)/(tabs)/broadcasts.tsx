import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Toast from 'react-native-toast-message';

import { FloatingActionBtn } from '@/components/ui/brand';
import { ChipSelector } from '@/components/ui/chip-selector';
import { ListRow } from '@/components/ui/list-row';
import { ScreenHeader } from '@/components/ui/screen-header';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { useModalBack } from '@/hooks/use-modal-back';
import { createBroadcast, deleteBroadcast, fetchBroadcasts } from '@/lib/broadcasts-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import { BROADCAST_SEVERITIES, type BroadcastSeverity } from '@/types/database';

export default function AdminBroadcastsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const societyId = profile?.society_id;
  const userId = profile?.id;
  const queryClient = useQueryClient();
  const key = queryKeys.broadcasts(societyId ?? 'none');

  const [modalOpen, setModalOpen] = useState(false);
  useModalBack(modalOpen, () => setModalOpen(false));
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState<BroadcastSeverity>('urgent');
  const [formError, setFormError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: key,
    queryFn: () => fetchBroadcasts(societyId!),
    enabled: Boolean(societyId),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!societyId || !userId) throw new Error('Missing society');
      if (!title.trim() || !body.trim()) throw new Error('Title and message are required');
      await createBroadcast({
        societyId,
        title: title.trim(),
        body: body.trim(),
        severity,
        createdBy: userId,
      });
    },
    onSuccess: async () => {
      setModalOpen(false);
      setTitle('');
      setBody('');
      setSeverity('urgent');
      setFormError(null);
      Toast.show({
        type: 'success',
        text1: 'Broadcast sent',
        text2: 'Push delivered society-wide (no acknowledgement).',
      });
      await queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  if (!societyId) {
    return (
      <ScreenHeader title="Broadcasts" showBack>
        <EmptyState visual="disconnected" title="No society" subtitle="Link a society first." />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Broadcasts" showBack>
      <View className="mx-4 mb-3 rounded-card px-4 py-3" style={{ backgroundColor: Pastels.rose }}>
        <Text className="text-sm text-ink" style={{ fontFamily: FontFamily.body }}>
          Push-only urgent channel — water outages, fire drills, lift downtime. No ack tracking
          (use Notices when you need receipts).
        </Text>
      </View>

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
              visual="notices"
              title="No broadcasts yet"
              subtitle="Send a society-wide alert when something needs immediate attention."
            />
          }
          renderItem={({ item, index }) => (
            <ListRow
              title={item.title}
              subtitle={item.body}
              meta={item.severity}
              last={index === (listQuery.data?.length ?? 0) - 1}
              leading={
                <View
                  className="h-10 w-10 items-center justify-center rounded-card"
                  style={{ backgroundColor: Pastels.rose }}
                >
                  <Megaphone color="#E11D48" size={16} />
                </View>
              }
              trailing={
                <Pressable
                  onPress={() => {
                    Alert.alert('Delete broadcast?', item.title, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () =>
                          void deleteBroadcast(item.id).then(() =>
                            queryClient.invalidateQueries({ queryKey: key }),
                          ),
                      },
                    ]);
                  }}
                  className="h-10 w-10 items-center justify-center"
                >
                  <Trash2 color={Brand.inkMuted} size={18} />
                </Pressable>
              }
            />
          )}
        />
      )}

      <FloatingActionBtn
        onPress={() => {
          setFormError(null);
          setModalOpen(true);
        }}
        icon={<Plus color="#fff" size={24} />}
        label="Send"
      />

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-surface-card px-5 pb-10 pt-5">
            <Text className="mb-4 text-xl text-ink" style={{ fontFamily: FontFamily.display }}>
              Society broadcast
            </Text>
            {formError ? <Text className="mb-3 text-sm text-red-500">{formError}</Text> : null}
            <ChipSelector
              className="mb-4"
              presentation="tiles"
              options={BROADCAST_SEVERITIES.map((s) => ({ value: s.value, label: s.label }))}
              value={severity}
              onChange={(v) => setSeverity(v as BroadcastSeverity)}
            />
            <TextInput
              className="mb-3 rounded-card bg-surface-muted px-4 py-3 text-base text-ink"
              placeholder="Title — e.g. Water supply disrupted"
              placeholderTextColor={Brand.inkMuted}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              className="mb-5 min-h-[100px] rounded-card bg-surface-muted px-4 py-3 text-base text-ink"
              placeholder="Short urgent message…"
              placeholderTextColor={Brand.inkMuted}
              multiline
              textAlignVertical="top"
              value={body}
              onChangeText={setBody}
            />
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setModalOpen(false)}
                className="flex-1 items-center rounded-xl border border-surface-border py-3"
              >
                <Text className="font-semibold text-ink-soft">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
                className="flex-1 items-center rounded-card py-3.5"
                style={{ backgroundColor: Brand.accent }}
              >
                {sendMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-semibold text-white">Push now</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenHeader>
  );
}
