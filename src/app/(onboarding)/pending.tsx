import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock3, LogOut } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, FontFamily, Gradients } from '@/constants/theme';
import { fetchSocietyName } from '@/lib/society-api';
import { useAuthStore } from '@/stores/authStore';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';

export default function PendingApprovalScreen() {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const signOut = useAuthStore((s) => s.signOut);
  const [refreshing, setRefreshing] = useState(false);

  const societyQuery = useQuery({
    queryKey: ['society-name', profile?.society_id ?? 'none'],
    queryFn: () => fetchSocietyName(profile!.society_id!),
    enabled: Boolean(profile?.society_id),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (user?.id) await fetchProfile(user.id);
      await societyQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [fetchProfile, societyQuery, user?.id]);

  return (
    <View className="flex-1 bg-surface">
      <LinearGradient
        colors={[...Gradients.auth]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 12, paddingBottom: 28 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="items-center px-6 pt-6">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-white/15">
              <Clock3 color="#fff" size={28} />
            </View>
            <Text
              className="mb-2 text-center text-3xl text-white"
              style={{ fontFamily: FontFamily.display }}
            >
              Waiting for approval
            </Text>
            <Text className="text-center text-sm text-white/85">
              Your join request was sent to the society admin
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="-mt-4 flex-1 rounded-t-3xl bg-surface"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 }}
        refreshControl={
          <ThemedRefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
      >
        <View className="mb-6 rounded-2xl border border-surface-border bg-surface-card p-4">
          <Text className="text-xs uppercase text-ink-faint">Society</Text>
          {societyQuery.isLoading ? (
            <ActivityIndicator className="mt-3" color={Brand.primary} />
          ) : (
            <Text className="mt-1 text-lg text-ink" style={{ fontFamily: FontFamily.heading }}>
              {societyQuery.data ?? 'Your society'}
            </Text>
          )}
          <Text className="mt-3 text-sm text-ink-muted">
            Role:{' '}
            <Text className="text-ink" style={{ fontFamily: FontFamily.medium }}>
              {profile?.role === 'guard' ? 'Guard' : 'Resident'}
            </Text>
          </Text>
          {profile?.role === 'resident' && profile.flat_id ? (
            <Text className="mt-1 text-sm text-ink-muted">Flat selected — admin can reassign if needed</Text>
          ) : null}
        </View>

        <Text className="mb-6 text-center text-sm text-ink-muted">
          Pull to refresh after an admin approves you. You will enter the app automatically.
        </Text>

        <Pressable
          onPress={() => void signOut()}
          className="flex-row items-center justify-center gap-2 py-3"
        >
          <LogOut color={Brand.inkMuted} size={16} />
          <Text className="text-sm text-ink-muted">Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
