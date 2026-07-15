import { useRouter } from 'expo-router';
import { ClipboardList, LogOut, ScanLine, UserPlus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuietGateIllustration } from '@/components/illustrations';
import { HeroBanner } from '@/components/ui/brand';
import { PressableActionTile } from '@/components/ui/brand';
import { Brand } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function GuardHomeRedirect() {
  const router = useRouter();
  // Keep index as soft landing; dashboard remains the Pending tab.
  // This file used to redirect only — now a hero for the gate role when hit directly.
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const name = profile?.full_name?.split(' ')[0] ?? 'Guard';

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-1 px-4 pt-3">
        <HeroBanner
          title={`Gate desk · ${name}`}
          subtitle="Register arrivals, clear pending approvals, and log entry"
          illustration={<QuietGateIllustration width={110} height={78} />}
        />
        <View className="mt-5">
          <PressableActionTile
            title="Pending approvals"
            subtitle="Live visitor queue"
            icon={<ScanLine color={Brand.primary} size={20} />}
            onPress={() => router.push('/(guard)/dashboard')}
          />
          <PressableActionTile
            title="Register visitor"
            subtitle="Capture photo and flat"
            icon={<UserPlus color={Brand.primary} size={20} />}
            onPress={() => router.push('/(guard)/register-visitor')}
          />
          <PressableActionTile
            title="Entry & logs"
            subtitle="Check in and mark exits"
            icon={<ClipboardList color={Brand.primary} size={20} />}
            onPress={() => router.push('/(guard)/verify')}
          />
        </View>
        <Pressable
          onPress={async () => {
            await signOut();
            router.replace('/(auth)/login');
          }}
          className="mt-4 flex-row items-center justify-center gap-2 py-3"
        >
          <LogOut color="#DC2626" size={16} />
          <Text className="font-semibold text-status-rejected">Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
