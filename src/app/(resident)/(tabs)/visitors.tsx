import { useRouter } from 'expo-router';
import { History, UserPlus } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import type { BottomSheetModal as GorhomBottomSheetModal } from '@gorhom/bottom-sheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { VisitorsEmptyPanel } from '@/components/visitors/visitors-empty-panel';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { VisitorCard } from '@/components/visitors/visitor-card';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { SuccessOverlay } from '@/components/ui/success-overlay';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';
import { useVisitorsRealtime } from '@/hooks/use-visitors-realtime';
import { updateVisitorStatus } from '@/lib/visitors';
import { href } from '@/lib/href';
import { useAuthStore } from '@/stores/authStore';

export default function ResidentVisitorsScreen() {
  const router = useRouter();
  const palette = useThemePalette();
  const profile = useAuthStore((s) => s.profile);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const rejectModalRef = useRef<GorhomBottomSheetModal>(null);
  const [rejectVisitorId, setRejectVisitorId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

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

  const handleRejectClick = (visitorId: string) => {
    setRejectVisitorId(visitorId);
    setRejectReason('');
    rejectModalRef.current?.present();
  };

  const confirmReject = async () => {
    if (!rejectVisitorId) return;
    rejectModalRef.current?.dismiss();
    await updateStatus(rejectVisitorId, 'rejected', rejectReason);
    setRejectVisitorId(null);
  };

  const updateStatus = async (visitorId: string, status: 'approved' | 'rejected', reason?: string) => {
    if (!profile?.flat_id) return;

    setActionId(visitorId);
    setActionError(null);

    const visitor = visitors.find((v) => v.id === visitorId);

    try {
      const { error: updateError } = await updateVisitorStatus({
        visitorId,
        flatId: profile.flat_id,
        status,
        rejectReason: reason,
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
          visual="disconnected"
          title="No flat linked"
          subtitle="Ask your society admin to link your profile to a flat to approve visitors."
        />
      </SafeAreaView>
    );
  }

  const isEmpty = !isLoading && visitors.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={isEmpty ? [Pastels.mint, '#FAF7F2'] : ['#FAF7F2', '#FAF7F2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingBottom: isEmpty ? 4 : 0 }}
      >
        <View className="flex-row items-start justify-between px-4 pb-2 pt-3">
          <View className="flex-1 pr-3">
            <Text
              className="text-[26px] text-ink"
              style={{ fontFamily: FontFamily.display }}
            >
              Visitor requests
            </Text>
            <Text className="mt-0.5 text-sm text-ink-muted">
              {isEmpty
                ? 'You’re all clear — watching for new guests'
                : 'Approve or reject · live updates'}
            </Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View visitor history"
              onPress={() => router.push(href('/(resident)/visitor-history'))}
              className="h-10 w-10 items-center justify-center rounded-full bg-white"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
            >
              <History color={palette.inkMuted} size={18} strokeWidth={1.5} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pre-approve a guest"
              onPress={() => router.push(href('/(resident)/pre-approve'))}
              className="h-10 w-10 items-center justify-center rounded-full bg-charcoal"
            >
              <UserPlus color="#fff" size={18} strokeWidth={1.5} />
            </Pressable>
          </View>
        </View>

        {!isEmpty ? (
          <Pressable
            onPress={() => router.push(href('/(resident)/pre-approve'))}
            className="mx-4 mb-3 flex-row items-center justify-center gap-2 rounded-xl border border-brand-100 bg-brand-50 py-3"
          >
            <UserPlus color={Brand.primary} size={18} />
            <Text className="text-sm font-semibold text-brand-800">Pre-approve guest</Text>
          </Pressable>
        ) : null}
      </LinearGradient>

      {(error || actionError) && (
        <ErrorBanner message={actionError ?? error ?? ''} onRetry={refresh} />
      )}

      {isLoading && visitors.length === 0 ? (
        <SkeletonList count={3} />
      ) : (
        <FlatList
          data={visitors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: isEmpty ? 8 : 4,
            paddingBottom: 28,
            flexGrow: 1,
          }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <ThemedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <VisitorsEmptyPanel
              onPreApprove={() => router.push(href('/(resident)/pre-approve'))}
              onHistory={() => router.push(href('/(resident)/visitor-history'))}
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
                  onPress: () => handleRejectClick(item.id),
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

      <BottomSheetModal ref={rejectModalRef} snapPoints={['40%']}>
        <Text className="mb-4 text-xl font-bold text-ink">Reject Visitor</Text>
        <Text className="mb-2 text-sm text-ink-muted">Reason (optional):</Text>
        <TextInput
          className="mb-4 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
          placeholder="Not expecting anyone..."
          placeholderTextColor="#94A3B8"
          value={rejectReason}
          onChangeText={setRejectReason}
        />
        <View className="flex-row gap-3">
          <Pressable
            className="flex-1 rounded-xl bg-surface-muted py-3"
            onPress={() => rejectModalRef.current?.dismiss()}
          >
            <Text className="text-center font-semibold text-ink">Cancel</Text>
          </Pressable>
          <Pressable
            className="flex-1 rounded-xl bg-status-rejected py-3"
            onPress={confirmReject}
          >
            <Text className="text-center font-semibold text-white">Confirm</Text>
          </Pressable>
        </View>
      </BottomSheetModal>
    </SafeAreaView>
  );
}
