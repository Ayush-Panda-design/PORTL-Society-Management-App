import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';

import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { VisitorCard } from '@/components/visitors/visitor-card';
import { useVisitorsRealtime } from '@/hooks/use-visitors-realtime';
import { useAuthStore } from '@/stores/authStore';

export default function GuardDashboard() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
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

  const onSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

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
        <View>
          <Text className="text-2xl font-bold text-slate-900">Pending</Text>
          <Text className="text-sm text-slate-500">
            Waiting for resident approval · live
          </Text>
        </View>
        <Pressable
          onPress={onSignOut}
          className="h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200"
        >
          <LogOut color="#64748B" size={18} />
        </Pressable>
      </View>

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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F766E" />
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
