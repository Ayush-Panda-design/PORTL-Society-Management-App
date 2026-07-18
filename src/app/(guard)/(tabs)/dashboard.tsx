import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, QrCode, UserPlus } from 'lucide-react-native';

import { DrawerMenuButton } from '@/components/navigation/drawer-menu-button';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { VisitorCard } from '@/components/visitors/visitor-card';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
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

  const pendingCount = visitors.length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (!profile?.society_id) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Ask an admin to assign your profile to a society before managing visitors."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header with live badge */}
      <View className="mb-1 flex-row items-center px-4 pt-4">
        <DrawerMenuButton />
      </View>
      <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
        <View>
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl text-ink" style={{ fontFamily: FontFamily.display }}>
              Pending
            </Text>
            {pendingCount > 0 ? (
              <View
                className="h-6 min-w-[24px] items-center justify-center rounded-pill px-2"
                style={{ backgroundColor: Brand.accent }}
              >
                <Text className="text-xs font-bold text-white" style={{ fontFamily: FontFamily.heading }}>
                  {pendingCount}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="text-sm text-ink-muted">Waiting for resident approval</Text>
        </View>
        {/* Quick register FAB inline */}
        <Pressable
          onPress={() => router.push('/(guard)/register-visitor')}
          className="flex-row items-center gap-1.5 rounded-pill px-3 py-2"
          style={{ backgroundColor: Pastels.mint }}
        >
          <UserPlus color={Brand.primary} size={14} strokeWidth={1.5} />
          <Text className="text-xs font-semibold text-brand-700" style={{ fontFamily: FontFamily.heading }}>
            Register
          </Text>
        </Pressable>
      </View>

      {/* Scan QR row */}
      <Pressable
        onPress={() => router.push('/(guard)/scan-pass')}
        className="mx-4 mb-3 flex-row items-center justify-center gap-2 rounded-card py-3"
        style={{
          backgroundColor: Brand.primary,
          shadowColor: Brand.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
          elevation: 4,
        }}
      >
        <QrCode color="#fff" size={16} strokeWidth={1.5} />
        <Text className="text-sm font-semibold text-white" style={{ fontFamily: FontFamily.heading }}>
          Scan QR Pass
        </Text>
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
              visual="visitors"
              title="Queue is clear"
              subtitle="New visitor registrations will appear here instantly."
              actionLabel="+ Register a visitor"
              onAction={() => router.push('/(guard)/register-visitor')}
              tips={[
                {
                  Icon: UserPlus,
                  title: 'Register at the gate',
                  body: 'Add a guest’s details — the resident gets an approval request.',
                  tint: Brand.accent,
                  wash: Pastels.peach,
                },
                {
                  Icon: Bell,
                  title: 'Live queue',
                  body: 'Pending approvals refresh here as residents respond.',
                  tint: Brand.primary,
                  wash: Pastels.mint,
                },
                {
                  Icon: QrCode,
                  title: 'Scan for entry',
                  body: 'Use Entry to verify approved passes when guests arrive.',
                  tint: '#3B82F6',
                  wash: Pastels.sky,
                },
              ]}
            />
          }
          renderItem={({ item }) => (
            <View
              style={{
                borderLeftWidth: 4,
                borderLeftColor: Brand.accent,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <VisitorCard visitor={item} />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
