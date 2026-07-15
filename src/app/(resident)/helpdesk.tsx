import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ChipSelector } from '@/components/ui/chip-selector';
import { ScreenHeader } from '@/components/ui/screen-header';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { complaintStatusTone } from '@/lib/community';
import { createComplaint, fetchComplaintsForFlat } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import { COMPLAINT_CATEGORIES } from '@/types/database';

export default function ResidentHelpdeskScreen() {
  const profile = useAuthStore((s) => s.profile);
  const flatId = profile?.flat_id;
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<string>(COMPLAINT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.complaints(`flat:${flatId ?? 'none'}`),
    queryFn: () => fetchComplaintsForFlat(flatId!),
    enabled: Boolean(flatId),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!flatId) throw new Error('No flat linked to your profile.');
      if (!description.trim()) throw new Error('Please describe the issue.');
      await createComplaint({
        flatId,
        category,
        description: description.trim(),
      });
    },
    onSuccess: async () => {
      setDescription('');
      setSuccess('Complaint submitted.');
      setFormError(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.complaints(`flat:${flatId}`),
      });
    },
    onError: (e: Error) => {
      setSuccess(null);
      setFormError(e.message);
    },
  });

  if (!flatId) {
    return (
      <ScreenHeader title="Helpdesk" showBack>
        <EmptyState
          visual="disconnected" title="No flat linked"
          subtitle="Ask an admin to link your flat before filing complaints."
        />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Helpdesk" subtitle="Report issues for your flat" showBack>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <FlatList
          data={listQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <RefreshControl
              refreshing={listQuery.isRefetching}
              onRefresh={() => void listQuery.refetch()}
              tintColor="#0F766E"
            />
          }
          ListHeaderComponent={
            <View className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
              <Text className="mb-2 text-base font-semibold text-slate-900">New complaint</Text>
              {formError ? <Text className="mb-2 text-sm text-red-600">{formError}</Text> : null}
              {success ? <Text className="mb-2 text-sm text-teal-700">{success}</Text> : null}

              <Text className="mb-2 text-sm font-medium text-slate-700">Category</Text>
              <ChipSelector
                className="mb-3"
                title="Category"
                options={COMPLAINT_CATEGORIES.map((c) => ({ value: c, label: c }))}
                value={category}
                onChange={setCategory}
              />

              <TextInput
                className="mb-3 min-h-[90px] rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900"
                placeholder="Describe the issue…"
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />

              <Pressable
                onPress={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="items-center rounded-xl bg-teal-700 py-3"
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-semibold text-white">Submit</Text>
                )}
              </Pressable>

              <Text className="mb-1 mt-5 text-base font-semibold text-slate-900">Your complaints</Text>
            </View>
          }
          ListEmptyComponent={
            listQuery.isLoading ? (
              <SkeletonList count={2} />
            ) : listQuery.error ? (
              <ErrorBanner
                message={listQuery.error.message}
                onRetry={() => void listQuery.refetch()}
              />
            ) : (
              <EmptyState visual="helpdesk" title="No complaints yet" subtitle="Submitted tickets will show here." />
            )
          }
          renderItem={({ item }) => {
            const tone = complaintStatusTone(item.status);
            return (
              <View className="rounded-2xl border border-slate-200 bg-white p-4">
                <View className="mb-2 flex-row items-center justify-between gap-2">
                  <Text className="flex-1 text-base font-semibold text-slate-900">
                    {item.category}
                  </Text>
                  <View className={`rounded-full border px-2 py-0.5 ${tone.bg} ${tone.border}`}>
                    <Text className={`text-xs font-medium ${tone.text}`}>{tone.label}</Text>
                  </View>
                </View>
                <Text className="text-sm text-slate-600">{item.description}</Text>
                <Text className="mt-2 text-xs text-slate-400">
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            );
          }}
        />
      </KeyboardAvoidingView>
    </ScreenHeader>
  );
}
