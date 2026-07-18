import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Brand } from '@/constants/theme';
import { destinationForProfile } from '@/lib/auth-routing';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const { session, user, profile, isLoading, isInitialized } = useAuthStore();

  if (!isInitialized || isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return <Redirect href={destinationForProfile(profile, user)} />;
}
