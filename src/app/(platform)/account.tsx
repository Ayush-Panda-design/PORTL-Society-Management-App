import { Building2, LogOut } from 'lucide-react-native';
import { useRouter, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InitialsAvatar } from '@/components/ui/brand';
import { Brand, FontFamily } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';
import { roleHome } from '@/lib/auth-routing';
import { isMembershipActive, useAuthStore } from '@/stores/authStore';

export default function PlatformAccountScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { inkMuted, pastels } = useThemePalette();

  const onSignOut = async () => {
    await signOut();
    router.replace('/(auth)/welcome');
  };

  const canOpenSociety = isMembershipActive(profile) && Boolean(profile?.role);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-5 pt-3">
        <Text className="text-xs font-semibold uppercase tracking-widest text-brand-800">
          Platform
        </Text>
        <Text className="mt-1 text-3xl text-ink" style={{ fontFamily: FontFamily.display }}>
          Account
        </Text>
      </View>

      <View className="mx-5 mt-6 items-center rounded-2xl border border-surface-border bg-surface-card p-6">
        <InitialsAvatar
          name={profile?.full_name ?? user?.email ?? 'Operator'}
          size={72}
          imageUrl={profile?.avatar_url}
        />
        <Text
          className="mt-4 text-center text-xl text-ink"
          style={{ fontFamily: FontFamily.heading }}
        >
          {profile?.full_name ?? 'Platform operator'}
        </Text>
        <Text className="mt-1 text-center text-sm" style={{ color: inkMuted }}>
          {user?.email}
        </Text>
        <View
          className="mt-3 rounded-full px-3 py-1"
          style={{ backgroundColor: pastels.rose }}
        >
          <Text className="text-xs font-bold uppercase tracking-wide text-brand-800">
            Platform admin
          </Text>
        </View>
      </View>

      <Text className="mx-5 mt-4 text-sm" style={{ color: inkMuted }}>
        You are signed in as the Portl operator. Other accounts never see this console.
      </Text>

      {canOpenSociety ? (
        <Pressable
          onPress={() => router.push(roleHome(profile!.role) as Href)}
          className="mx-5 mt-6 flex-row items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-card py-3.5"
        >
          <Building2 color={Brand.primary} size={18} strokeWidth={1.5} />
          <Text className="font-semibold text-ink" style={{ fontFamily: FontFamily.heading }}>
            Open society dashboard
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => void onSignOut()}
        className="mx-5 mt-4 flex-row items-center justify-center gap-2 rounded-xl py-3.5"
        style={{ backgroundColor: `${Brand.accent}12` }}
      >
        <LogOut color={Brand.accent} size={18} strokeWidth={1.5} />
        <Text className="font-semibold" style={{ color: Brand.accent, fontFamily: FontFamily.heading }}>
          Sign out
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}
