import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { QrCode } from 'lucide-react-native';

import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { VisitorCard } from '@/components/visitors/visitor-card';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { Brand } from '@/constants/theme';
import { useVisitorsRealtime } from '@/hooks/use-visitors-realtime';
import { useAuthStore } from '@/stores/authStore';

export default function GuardDashboard() {
  const profile = useAuthStore((s) => s.profile);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { visitors, isLoading, error, refresh } = useVisitorsRealtime({
    societyId: profile?.society_id,
    statuses: ['pending'],
    enabled: Boolean(profile?.society_id),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (!profile?.society_id) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <EmptyState
          visual="disconnected" title="No society linked"
          subtitle="Ask an admin to assign your profile to a society before managing visitors."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-ink">Pending</Text>
          <Text className="text-sm text-ink-muted">Waiting for resident approval</Text>
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/(guard)/scan-pass')}
        className="mx-4 mb-3 flex-row items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 py-3"
      >
        <QrCode color={Brand.primary} size={18} />
        <Text className="text-sm font-semibold text-brand-800">Scan QR Pass</Text>
      </Pressable>

      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}

      {isLoading && visitors.length === 0 ? (
        <SkeletonList count={4} />
      ) : (
        <FlatList
          data={visitors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 24,
            flexGrow: 1,
          }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <ThemedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              visual="gate"
              title="No pending requests"
              subtitle="New visitor registrations from the gate will appear here instantly."
            />
          }
          renderItem={({ item }) => <VisitorCard visitor={item} />}
        />
      )}
    </SafeAreaView>
  );
}
