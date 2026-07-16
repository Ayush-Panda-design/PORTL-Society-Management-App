import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Brand } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const { session, role, isLoading, isInitialized } = useAuthStore();

  if (!isInitialized || isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={Brand.primary} />
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
