import { useRouter, type Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, FontFamily } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export type SettingsLink = {
  href: Href;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
};

type Props = {
  title: string;
  subtitle: string;
  links: SettingsLink[];
};

export function SettingsHub({ title, subtitle, links }: Props) {
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);

  const onSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-1 px-6 pt-8">
        <Text
          className="mb-1 text-3xl text-ink"
          style={{ fontFamily: FontFamily.display }}
        >
          {title}
        </Text>
        <Text className="mb-6 text-base text-ink-muted">{subtitle}</Text>

        <View className="mb-6 gap-2">
          {links.map(({ href, title: linkTitle, subtitle: linkSubtitle, Icon }) => (
            <Pressable
              key={linkTitle}
              onPress={() => router.push(href)}
              className="flex-row items-center gap-3 rounded-2xl border border-surface-border bg-white px-4 py-3.5"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                <Icon color={Brand.primary} size={18} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-ink"
                  style={{ fontFamily: FontFamily.heading }}
                >
                  {linkTitle}
                </Text>
                <Text className="text-sm text-ink-muted">{linkSubtitle}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          className="items-center rounded-xl border border-status-rejectedSoft bg-status-rejectedSoft py-3.5"
          onPress={onSignOut}
        >
          <Text
            className="text-base text-status-rejected"
            style={{ fontFamily: FontFamily.heading }}
          >
            Sign out
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
