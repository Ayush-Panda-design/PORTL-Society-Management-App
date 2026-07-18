import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, History, QrCode } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipSelector } from '@/components/ui/chip-selector';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { VisitorCard } from '@/components/visitors/visitor-card';
import { QRCodeModal } from '@/components/visitors/qr-code-modal';
import { Brand, Pastels } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';
import { useVisitorsRealtime } from '@/hooks/use-visitors-realtime';
import { useAuthStore } from '@/stores/authStore';
import type { VisitorStatus, VisitorWithFlat } from '@/types/database';
import { VISITOR_STATUSES } from '@/types/database';

export default function ResidentVisitorHistoryScreen() {
  const router = useRouter();
  const palette = useThemePalette();
  const profile = useAuthStore((s) => s.profile);
  const [statusFilter, setStatusFilter] = useState<VisitorStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorWithFlat | null>(null);

  const statuses = useMemo(
    () => (statusFilter === 'all' ? undefined : [statusFilter]),
    [statusFilter],
  );

  const { visitors, isLoading, error, refresh } = useVisitorsRealtime({
    flatId: profile?.flat_id,
    statuses,
    enabled: Boolean(profile?.flat_id),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (!profile?.flat_id) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <EmptyState
          visual="disconnected" title="No flat linked"
          subtitle="Link a flat to your profile to see visitor history."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center gap-3 px-4 pb-2 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-card"
        >
          <ArrowLeft color={palette.inkMuted} size={18} />
        </Pressable>
        <View>
          <Text className="text-2xl font-bold text-ink">Visitor history</Text>
          <Text className="text-sm text-ink-muted">Past guests for your flat</Text>
        </View>
      </View>

      <View className="px-4 pb-2">
        <ChipSelector
          presentation="filter"
          options={[
            { value: 'all', label: 'All' },
            ...VISITOR_STATUSES.map((s) => ({ value: s.value, label: s.label })),
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </View>

      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}

      {isLoading && visitors.length === 0 ? (
        <SkeletonList count={4} />
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
              title="No visitors yet"
              subtitle="Approved, rejected, and checked-in guests will appear here."
              tips={[
                {
                  Icon: History,
                  title: 'Full trail',
                  body: 'Every decision and gate check-in is kept for your flat.',
                  tint: Brand.primary,
                  wash: Pastels.mint,
                },
                {
                  Icon: CheckCircle2,
                  title: 'Filter by status',
                  body: 'Use the chips above to focus on approved or past guests.',
                  tint: '#3B82F6',
                  wash: Pastels.sky,
                },
                {
                  Icon: QrCode,
                  title: 'Show the pass',
                  body: 'Approved visitors can open a QR pass from their card.',
                  tint: Brand.accent,
                  wash: Pastels.peach,
                },
              ]}
            />
          }
          renderItem={({ item }) => (
            <VisitorCard 
              visitor={item} 
              actions={
                item.status === 'approved' 
                  ? [
                      {
                        label: 'Show Pass',
                        icon: 'qr-code',
                        variant: 'primary',
                        onPress: () => setSelectedVisitor(item),
                      }
                    ] 
                  : undefined
              }
            />
          )}
        />
      )}

      <QRCodeModal 
        visible={!!selectedVisitor} 
        onClose={() => setSelectedVisitor(null)} 
        visitor={selectedVisitor} 
      />
    </SafeAreaView>
  );
}
