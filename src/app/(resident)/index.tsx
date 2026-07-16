import { useRouter } from 'expo-router';
import { Bell, Building2, ClipboardList, UserPlus, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

import { QuietGateIllustration } from '@/components/illustrations';
import { HeroBanner } from '@/components/ui/brand';
import { PressableActionTile } from '@/components/ui/brand';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { Brand, FontFamily } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function ResidentHome() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const profile = useAuthStore((s) => s.profile);
  const name = profile?.full_name?.split(' ')[0] ?? 'Resident';
  const [pendingCount, setPendingCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(false);
  const [countError, setCountError] = useState<string | null>(null);

  const loadPendingCount = useCallback(async () => {
    if (!profile?.flat_id) {
      setPendingCount(0);
      setCountError(null);
      return;
    }

    setLoadingCount(true);
    setCountError(null);

    try {
      const { count, error } = await supabase
        .from('visitors')
        .select('id', { count: 'exact', head: true })
        .eq('flat_id', profile.flat_id)
        .eq('status', 'pending');

      if (error) throw new Error(error.message);
      setPendingCount(count ?? 0);
    } catch (e) {
      setCountError(e instanceof Error ? e.message : 'Could not load visitor count');
    } finally {
      setLoadingCount(false);
    }
  }, [profile?.flat_id]);

  useEffect(() => {
    if (!isFocused) return;
    void loadPendingCount();
  }, [isFocused, loadPendingCount]);

  const subtitle = loadingCount
    ? 'Checking for visitor requests…'
    : pendingCount > 0
      ? `${pendingCount} visitor request${pendingCount === 1 ? '' : 's'} waiting for you`
      : 'Your society is quiet right now — pre-approve a guest anytime';

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-1 px-4 pt-3">
        <HeroBanner
          title={`Hi, ${name}`}
          subtitle={subtitle}
          illustration={<QuietGateIllustration width={110} height={78} />}
        />

        {countError ? (
          <View className="mt-3">
            <ErrorBanner message={countError} onRetry={() => void loadPendingCount()} />
          </View>
        ) : null}

        {loadingCount ? (
          <View className="mt-5 items-center py-4">
            <ActivityIndicator color={Brand.primary} />
          </View>
        ) : (
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
        )}

        <Pressable onPress={() => router.push('/(resident)/more')} className="mt-2 items-center py-3">
          <Text className="text-sm text-brand-700" style={{ fontFamily: FontFamily.medium }}>
            More community tools
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
