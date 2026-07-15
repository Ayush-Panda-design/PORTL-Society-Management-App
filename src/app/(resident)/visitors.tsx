import { useRouter } from 'expo-router';
import { History, UserPlus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { VisitorCard } from '@/components/visitors/visitor-card';
import { useVisitorsRealtime } from '@/hooks/use-visitors-realtime';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function ResidentVisitorsScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { visitors, isLoading, error, refresh } = useVisitorsRealtime({
    flatId: profile?.flat_id,
    statuses: ['pending'],
    enabled: Boolean(profile?.flat_id),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const updateStatus = async (visitorId: string, status: 'approved' | 'rejected') => {
    setActionId(visitorId);
    setActionError(null);

    try {
      const { error: updateError } = await supabase
        .from('visitors')
        .update({ status })
        .eq('id', visitorId)
        .eq('flat_id', profile?.flat_id ?? '');

      if (updateError) {
        setActionError(updateError.message);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to update request');
    } finally {
      setActionId(null);
    }
  };

  if (!profile?.flat_id) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <EmptyState
          title="No flat linked"
          subtitle="Ask your society admin to link your profile to a flat to approve visitors."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="flex-row items-start justify-between px-4 pb-2 pt-3">
        <View className="flex-1 pr-3">
          <Text className="text-2xl font-bold text-slate-900">Visitor requests</Text>
          <Text className="text-sm text-slate-500">Approve or reject · live updates</Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => router.push('/(resident)/visitor-history')}
            className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
          >
            <History color="#64748B" size={18} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(resident)/pre-approve')}
            className="h-10 w-10 items-center justify-center rounded-full bg-teal-700"
          >
            <UserPlus color="#fff" size={18} />
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/(resident)/pre-approve')}
        className="mx-4 mb-3 flex-row items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 py-3"
      >
        <UserPlus color="#0F766E" size={18} />
        <Text className="text-sm font-semibold text-teal-800">Pre-approve guest</Text>
      </Pressable>

      {(error || actionError) && (
        <ErrorBanner message={actionError ?? error ?? ''} onRetry={refresh} />
      )}

      {isLoading && visitors.length === 0 ? (
        <SkeletonList count={3} />
      ) : (
        <FlatList
          data={visitors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F766E" />
          }
          ListEmptyComponent={
            <EmptyState
              title="No pending requests"
              subtitle="When the guard registers a visitor for your flat, you can approve them here instantly."
            />
          }
          renderItem={({ item }) => (
            <VisitorCard
              visitor={item}
              actions={[
                {
                  label: 'Reject',
                  variant: 'danger',
                  icon: 'x',
                  loading: actionId === item.id,
                  onPress: () => updateStatus(item.id, 'rejected'),
                },
                {
                  label: 'Approve',
                  variant: 'primary',
                  icon: 'check',
                  loading: actionId === item.id,
                  onPress: () => updateStatus(item.id, 'approved'),
                },
              ]}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
