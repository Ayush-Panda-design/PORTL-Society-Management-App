import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, QrCode, UserPlus } from 'lucide-react-native';

import { DrawerMenuButton } from '@/components/navigation/drawer-menu-button';
import { AskPortlFloatingFab } from '@/components/ask-portl/ask-portl-orb';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { VisitorCard } from '@/components/visitors/visitor-card';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { Brand, FontFamily } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';
import { useVisitorsRealtime } from '@/hooks/use-visitors-realtime';
import { useAuthStore } from '@/stores/authStore';
import { href } from '@/lib/href';

export default function GuardDashboard() {
  const profile = useAuthStore((s) => s.profile);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { isDark, ...palette } = useThemePalette();

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
      <View className="flex-1">
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
                style={{ backgroundColor: Brand.primary }}
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
          onPress={() => router.push(href('/(guard)/register-visitor'))}
          className="flex-row items-center gap-1.5 rounded-pill px-3 py-2"
          style={{ backgroundColor: isDark ? palette.muted : palette.pastels.rose }}
        >
          <UserPlus color={isDark ? Brand.primaryOnDark : Brand.primary} size={14} strokeWidth={1.5} />
          <Text
            className="text-xs font-semibold"
            style={{
              fontFamily: FontFamily.heading,
              color: isDark ? Brand.primaryOnDark : Brand.primaryDark,
            }}
          >
            Register
          </Text>
        </Pressable>
      </View>

      {/* Scan QR row */}
      <Pressable
        onPress={() => router.push(href('/(guard)/scan-pass'))}
        className="mx-4 mb-3 flex-row items-center justify-center gap-2 rounded-card py-3"
        style={{
          backgroundColor: Brand.primary,
          shadowColor: Brand.primary,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
          elevation: 2,
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
            paddingBottom: 88,
            flexGrow: 1,
          }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          initialNumToRender={10}
          windowSize={8}
          maxToRenderPerBatch={10}
          removeClippedSubviews
          refreshControl={
            <ThemedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              visual="visitors"
              title="Queue is clear"
              subtitle="New visitor registrations will appear here instantly."
              actionLabel="+ Register a visitor"
              onAction={() => router.push(href('/(guard)/register-visitor'))}
              tips={[
                {
                  Icon: UserPlus,
                  title: 'Register at the gate',
                  body: 'Add a guest’s details — the resident gets an approval request.',
                  tint: Brand.primary,
                  washKey: 'peach',
                },
                {
                  Icon: Bell,
                  title: 'Live queue',
                  body: 'Pending approvals refresh here as residents respond.',
                  tint: Brand.primary,
                  washKey: 'mint',
                },
                {
                  Icon: QrCode,
                  title: 'Scan for entry',
                  body: 'Use Entry to verify approved passes when guests arrive.',
                  tint: '#60A5FA',
                  washKey: 'sky',
                },
              ]}
            />
          }
          renderItem={({ item }) => (
            <View
              style={{
                borderLeftWidth: 4,
                borderLeftColor: Brand.primary,
                borderRadius: 20,
                overflow: 'hidden',
              }}
            >
              <VisitorCard visitor={item} />
            </View>
          )}
        />
      )}
      <AskPortlFloatingFab onPress={() => router.push(href('/(guard)/ask-portl'))} />
      </View>
    </SafeAreaView>
  );
}
