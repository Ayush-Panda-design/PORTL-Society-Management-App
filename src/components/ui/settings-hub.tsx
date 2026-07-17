import { useRouter, type Href } from 'expo-router';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SegmentedControl } from '@/components/ui/segmented-control';
import { Brand, FontFamily } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, type ThemeMode } from '@/stores/themeStore';

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

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  const color = Brand.primary;
  if (mode === 'dark') return <Moon color={color} size={18} />;
  if (mode === 'light') return <Sun color={color} size={18} />;
  return <Monitor color={color} size={18} />;
}

export function SettingsHub({ title, subtitle, links }: Props) {
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch {
      // AuthGate still redirects once session is cleared; keep button usable.
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="mb-1 text-3xl text-ink"
          style={{ fontFamily: FontFamily.display }}
        >
          {title}
        </Text>
        <Text className="mb-6 text-base text-ink-muted">{subtitle}</Text>

        <View className="mb-6 rounded-2xl border border-surface-border bg-surface-card px-4 py-4">
          <View className="mb-3 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-50">
              <ThemeIcon mode={mode} />
            </View>
            <View className="flex-1">
              <Text className="text-ink" style={{ fontFamily: FontFamily.heading }}>
                Appearance
              </Text>
              <Text className="text-sm text-ink-muted">
                Light, Dark, or match your device
              </Text>
            </View>
          </View>
          <SegmentedControl
            options={THEME_OPTIONS}
            value={mode}
            onChange={setMode}
          />
        </View>

        <View className="mb-6 gap-2">
          {links.map(({ href, title: linkTitle, subtitle: linkSubtitle, Icon }) => (
            <Pressable
              key={linkTitle}
              onPress={() => router.push(href)}
              className="flex-row items-center gap-3 rounded-2xl border border-surface-border bg-surface-card px-4 py-3.5"
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
          accessibilityRole="button"
          disabled={signingOut}
          className="items-center rounded-xl border border-status-rejectedSoft bg-status-rejectedSoft py-3.5"
          onPress={() => {
            void onSignOut();
          }}
        >
          {signingOut ? (
            <ActivityIndicator color="#DC2626" />
          ) : (
            <Text
              className="text-base text-status-rejected"
              style={{ fontFamily: FontFamily.heading }}
            >
              Sign out
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
