import { useRouter } from 'expo-router';
import { History, UserPlus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { VisitorCard } from '@/components/visitors/visitor-card';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { SuccessOverlay } from '@/components/ui/success-overlay';
import { Brand } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';
import { useVisitorsRealtime } from '@/hooks/use-visitors-realtime';
import { updateVisitorStatus } from '@/lib/visitors';
import { useAuthStore } from '@/stores/authStore';

export default function ResidentVisitorsScreen() {
  const router = useRouter();
  const palette = useThemePalette();
  const profile = useAuthStore((s) => s.profile);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

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
    if (!profile?.flat_id) return;

    setActionId(visitorId);
    setActionError(null);

    const visitor = visitors.find((v) => v.id === visitorId);

    try {
      const { error: updateError } = await updateVisitorStatus({
        visitorId,
        flatId: profile.flat_id,
        status,
        createdBy: visitor?.created_by,
        visitorName: visitor?.name,
      });

      if (updateError) {
        setActionError(updateError);
      } else if (status === 'approved') {
        setSuccessVisible(true);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to update request');
    } finally {
      setActionId(null);
    }
  };

  if (!profile?.flat_id) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <EmptyState
          visual="disconnected" title="No flat linked"
          subtitle="Ask your society admin to link your profile to a flat to approve visitors."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-start justify-between px-4 pb-2 pt-3">
        <View className="flex-1 pr-3">
          <Text className="text-2xl font-bold text-ink">Visitor requests</Text>
          <Text className="text-sm text-ink-muted">Approve or reject · live updates</Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View visitor history"
            onPress={() => router.push('/(resident)/visitor-history')}
            className="h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-card"
          >
            <History color={palette.inkMuted} size={18} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pre-approve a guest"
            onPress={() => router.push('/(resident)/pre-approve')}
            className="h-10 w-10 items-center justify-center rounded-full bg-charcoal"
          >
            <UserPlus color="#fff" size={18} />
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/(resident)/pre-approve')}
        className="mx-4 mb-3 flex-row items-center justify-center gap-2 rounded-xl border border-brand-100 bg-brand-50 py-3"
      >
        <UserPlus color={Brand.primary} size={18} />
        <Text className="text-sm font-semibold text-brand-800">Pre-approve guest</Text>
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
            <ThemedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              visual="visitors"
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
      <SuccessOverlay
        visible={successVisible}
        message="Visitor Approved"
        onDone={() => setSuccessVisible(false)}
      />
    </SafeAreaView>
  );
}
