import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/authStore';

export default function AdminHome() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const name = profile?.full_name?.split(' ')[0] ?? 'Admin';

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 justify-center px-6">
        <Text className="mb-2 text-3xl font-bold text-slate-900">Dashboard</Text>
        <Text className="mb-8 text-base leading-6 text-slate-600">
          Welcome, {name}. Post notices, run polls, and manage helpdesk from the tabs below.
        </Text>

        <Pressable
          onPress={() => router.push('/(admin)/notices')}
          className="mb-3 items-center rounded-xl bg-teal-700 py-3.5"
        >
          <Text className="text-base font-semibold text-white">Post a notice</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(admin)/complaints')}
          className="mb-3 items-center rounded-xl border border-slate-200 bg-white py-3.5"
        >
          <Text className="text-base font-semibold text-slate-800">Open complaints</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(admin)/settings')}
          className="items-center rounded-xl border border-slate-200 bg-white py-3.5"
        >
          <Text className="text-base font-semibold text-slate-800">All management tools</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
