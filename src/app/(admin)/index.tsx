import { useRouter } from 'expo-router';
import { Bell, Building2, ClipboardList, Phone, Users } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyMailboxIllustration } from '@/components/illustrations';
import { HeroBanner } from '@/components/ui/brand';
import { PressableActionTile } from '@/components/ui/brand';
import { Brand } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function AdminHome() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const name = profile?.full_name?.split(' ')[0] ?? 'Admin';

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-1 px-4 pt-3">
        <HeroBanner
          title={`Welcome, ${name}`}
          subtitle="Post notices, run polls, and keep the society running"
          illustration={<EmptyMailboxIllustration width={110} height={78} />}
        />
        <View className="mt-5">
          <PressableActionTile
            title="Post a notice"
            subtitle="Reach every resident"
            icon={<Bell color={Brand.primary} size={20} />}
            onPress={() => router.push('/(admin)/notices')}
          />
          <PressableActionTile
            title="Complaints queue"
            subtitle="Triage helpdesk tickets"
            icon={<ClipboardList color={Brand.primary} size={20} />}
            onPress={() => router.push('/(admin)/complaints')}
          />
          <PressableActionTile
            title="Amenities"
            subtitle="Facilities and booking slots"
            icon={<Building2 color={Brand.primary} size={20} />}
            onPress={() => router.push('/(admin)/amenities')}
          />
          <PressableActionTile
            title="Staff directory"
            subtitle="Contacts residents can call"
            icon={<Phone color={Brand.primary} size={20} />}
            onPress={() => router.push('/(admin)/staff')}
          />
          <PressableActionTile
            title="Residents"
            subtitle="Society member overview"
            icon={<Users color={Brand.primary} size={20} />}
            onPress={() => router.push('/(admin)/residents')}
          />
        </View>
        <Text className="mt-2 text-center text-sm text-ink-muted">
          More tools live under the Manage tab
        </Text>
      </View>
    </SafeAreaView>
  );
}
