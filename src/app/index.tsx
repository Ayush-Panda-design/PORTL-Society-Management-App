import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const { session, role, isLoading, isInitialized } = useAuthStore();

  if (!isInitialized || isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (role === 'guard') return <Redirect href="/(guard)" />;
  if (role === 'admin') return <Redirect href="/(admin)" />;
  if (role === 'resident') return <Redirect href="/(resident)" />;

  return <Redirect href="/(auth)/login" />;
}
