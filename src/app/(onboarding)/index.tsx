import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Building2, KeyRound, LogOut } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GateAuthIllustration } from '@/components/illustrations';
import { Brand, FontFamily, Gradients } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function OnboardingLanding() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const rejected = profile?.status === 'rejected';

  return (
    <View className="flex-1 bg-surface">
      <LinearGradient
        colors={[...Gradients.auth]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 12, paddingBottom: 24 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="items-center px-6 pt-2">
            <Text
              className="mb-1 text-4xl text-white"
              style={{ fontFamily: FontFamily.display }}
            >
              Portl
            </Text>
            <Text className="mb-3 text-center text-sm text-teal-50/90">
              {rejected
                ? 'Your previous join request was declined'
                : 'Set up or join your society'}
            </Text>
            <GateAuthIllustration width={220} height={120} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View className="-mt-4 flex-1 rounded-t-3xl bg-surface px-6 pb-10 pt-7">
        <Text className="mb-2 text-xl text-ink" style={{ fontFamily: FontFamily.heading }}>
          {rejected ? 'Try again' : `Hi${profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}`}
        </Text>
        <Text className="mb-6 text-sm text-ink-muted">
          Create a society as admin, or join one with an invite code from your society office.
        </Text>

        <Pressable
          onPress={() => router.push('/(onboarding)/create')}
          className="mb-3 flex-row items-center gap-4 rounded-2xl border border-brand-700 bg-brand-50 px-4 py-4"
        >
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand-700">
            <Building2 color="#fff" size={22} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-base text-brand-800" style={{ fontFamily: FontFamily.heading }}>
              Create a society
            </Text>
            <Text className="text-sm text-ink-muted">
              You become the admin and get invite links
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(onboarding)/join')}
          className="mb-8 flex-row items-center gap-4 rounded-2xl border border-surface-border bg-surface-card px-4 py-4"
        >
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-surface-muted">
            <KeyRound color={Brand.primary} size={22} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-base text-ink" style={{ fontFamily: FontFamily.heading }}>
              Join a society
            </Text>
            <Text className="text-sm text-ink-muted">
              Enter a resident or guard invite code
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => void signOut()}
          className="flex-row items-center justify-center gap-2 py-3"
        >
          <LogOut color={Brand.inkMuted} size={16} />
          <Text className="text-sm text-ink-muted">Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}
