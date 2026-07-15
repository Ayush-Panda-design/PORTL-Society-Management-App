import { useRouter } from 'expo-router';
import { Bell, Building2, ClipboardList, UserPlus, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

import { QuietGateIllustration } from '@/components/illustrations';
import { HeroBanner } from '@/components/ui/brand';
import { PressableActionTile } from '@/components/ui/brand';
import { Brand, FontFamily } from '@/constants/theme';
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
      if (!cancelled) setPendingCount(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [isFocused, profile?.flat_id]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-1 px-4 pt-3">
        <HeroBanner
          title={`Hi, ${name}`}
          subtitle={
            pendingCount > 0
              ? `${pendingCount} visitor request${pendingCount === 1 ? '' : 's'} waiting for you`
              : 'Your society is quiet right now — pre-approve a guest anytime'
          }
          illustration={<QuietGateIllustration width={110} height={78} />}
        />

        <View className="mt-5">
          <PressableActionTile
            title={pendingCount > 0 ? 'Review visitor requests' : 'Open visitors'}
            subtitle="Approve guests at the gate"
            icon={<Users color={Brand.primary} size={20} />}
            onPress={() => router.push('/(resident)/visitors')}
          />
          <PressableActionTile
            title="Pre-approve a guest"
            subtitle="Skip the wait when they arrive"
            icon={<UserPlus color={Brand.primary} size={20} />}
            onPress={() => router.push('/(resident)/pre-approve')}
          />
          <PressableActionTile
            title="Notices"
            subtitle="Society announcements"
            icon={<Bell color={Brand.primary} size={20} />}
            onPress={() => router.push('/(resident)/notices')}
          />
          <PressableActionTile
            title="Book an amenity"
            subtitle="Gym, clubhouse, and more"
            icon={<Building2 color={Brand.primary} size={20} />}
            onPress={() => router.push('/(resident)/amenities')}
          />
          <PressableActionTile
            title="Helpdesk"
            subtitle="Raise a complaint"
            icon={<ClipboardList color={Brand.primary} size={20} />}
            onPress={() => router.push('/(resident)/helpdesk')}
          />
        </View>

        <Pressable onPress={() => router.push('/(resident)/more')} className="mt-2 items-center py-3">
          <Text className="text-sm text-brand-700" style={{ fontFamily: FontFamily.medium }}>
            More community tools
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
