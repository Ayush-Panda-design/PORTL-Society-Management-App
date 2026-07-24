import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { VisitorCard } from '@/components/visitors/visitor-card';
import { Brand, FontFamily } from '@/constants/theme';
import { href } from '@/lib/href';
import { queryKeys } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import { VISITOR_SELECT, updateVisitorStatus } from '@/lib/visitors';
import { useAuthStore } from '@/stores/authStore';
import type { VisitorWithFlat } from '@/types/database';
import { useRouter } from 'expo-router';

async function fetchEscalatedVisitors(societyId: string): Promise<VisitorWithFlat[]> {
  const { data, error } = await supabase
    .from('visitors')
    .select(VISITOR_SELECT)
    .eq('society_id', societyId)
    .eq('status', 'pending')
    .or('is_missed.eq.true,escalation_level.gte.1')
    .order('escalated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as VisitorWithFlat[]) ?? [];
}

export default function EscalatedVisitorsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const [actionId, setActionId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.escalatedVisitors(societyId ?? 'none'),
    queryFn: () => fetchEscalatedVisitors(societyId!),
    enabled: Boolean(societyId),
    refetchInterval: 15_000,
  });

  const resolveMutation = useMutation({
    mutationFn: async (params: {
      visitor: VisitorWithFlat;
      status: 'approved' | 'rejected';
    }) => {
      const { error } = await updateVisitorStatus({
        visitorId: params.visitor.id,
        flatId: params.visitor.flat_id,
        status: params.status,
        rejectReason:
          params.status === 'rejected' ? 'Rejected by committee after escalation' : undefined,
        createdBy: params.visitor.created_by,
        visitorName: params.visitor.name,
        isMissed: false,
        societyId: societyId ?? undefined,
        decidedBy: 'committee',
      });
      if (error) throw new Error(error);
    },
    onSuccess: async (_data, vars) => {
      Toast.show({
        type: 'success',
        text1: vars.status === 'approved' ? 'Visitor approved' : 'Visitor rejected',
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.escalatedVisitors(societyId ?? 'none'),
      });
    },
    onError: (err: Error) => Toast.show({ type: 'error', text1: err.message }),
    onSettled: () => setActionId(null),
  });

  const onRefresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  if (!societyId) {
    return (
      <ScreenHeader title="Missed visitors" subtitle="Escalated gate requests" showBack>
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Assign your profile to a society first."
        />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader
      title="Missed visitors"
      subtitle="Escalated / unanswered gate requests"
      showBack
      right={
        <Pressable
          onPress={() => router.push(href('/(admin)/partners'))}
          className="rounded-pill px-3 py-1.5"
          style={{ backgroundColor: '#E8F5F1' }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: Brand.primary, fontFamily: FontFamily.heading }}
          >
            Partners
          </Text>
        </Pressable>
      }
    >
      {query.error ? (
        <ErrorBanner
          message={query.error instanceof Error ? query.error.message : 'Failed to load'}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isLoading && !query.data ? (
        <SkeletonList count={4} />
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <ThemedRefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void onRefresh()}
            />
          }
          ListHeaderComponent={
            <View className="mb-3 flex-row items-start gap-2 rounded-card bg-surface-card p-3">
              <AlertTriangle color="#EA580C" size={18} />
              <Text className="flex-1 text-sm leading-5 text-ink-muted">
                These visitors are still pending after escalation. Approving here notifies the
                creating guard so they can check the guest in.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              visual="visitors"
              title="No escalated visitors"
              subtitle="When residents miss gate requests, they land here for committee triage."
            />
          }
          renderItem={({ item }) => (
            <VisitorCard
              visitor={item}
              actions={[
                {
                  label: 'Approve',
                  variant: 'primary',
                  icon: 'check',
                  loading: actionId === item.id && resolveMutation.isPending,
                  onPress: () => {
                    setActionId(item.id);
                    resolveMutation.mutate({ visitor: item, status: 'approved' });
                  },
                },
                {
                  label: 'Reject',
                  variant: 'danger',
                  icon: 'x',
                  loading: actionId === item.id && resolveMutation.isPending,
                  onPress: () => {
                    setActionId(item.id);
                    resolveMutation.mutate({ visitor: item, status: 'rejected' });
                  },
                },
              ]}
            />
          )}
        />
      )}
    </ScreenHeader>
  );
}
