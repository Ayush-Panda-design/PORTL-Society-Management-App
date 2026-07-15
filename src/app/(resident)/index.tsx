import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function ResidentHome() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const profile = useAuthStore((s) => s.profile);
  const name = profile?.full_name?.split(' ')[0] ?? 'Resident';
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isFocused || !profile?.flat_id) return;

    let cancelled = false;

    void (async () => {
      const { count } = await supabase
        .from('visitors')
        .select('id', { count: 'exact', head: true })
        .eq('flat_id', profile.flat_id)
        .eq('status', 'pending');

      if (!cancelled) {
        setPendingCount(count ?? 0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isFocused, profile?.flat_id]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 justify-center px-6">
        <Text className="mb-2 text-3xl font-bold text-slate-900">Hi, {name}</Text>
        <Text className="mb-8 text-base leading-6 text-slate-600">
          {pendingCount > 0
            ? `You have ${pendingCount} visitor request${pendingCount === 1 ? '' : 's'} waiting.`
            : 'No pending visitors right now. Pre-approve guests anytime from the Visitors tab.'}
        </Text>

        <Pressable
          onPress={() => router.push('/(resident)/visitors')}
          className="mb-3 flex-row items-center justify-center gap-2 rounded-xl bg-teal-700 py-3.5"
        >
          <Users color="#fff" size={18} />
          <Text className="text-base font-semibold text-white">
            {pendingCount > 0 ? 'Review requests' : 'Open visitors'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(resident)/pre-approve')}
          className="items-center rounded-xl border border-slate-200 bg-white py-3.5"
        >
          <Text className="text-base font-semibold text-slate-800">Pre-approve a guest</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
