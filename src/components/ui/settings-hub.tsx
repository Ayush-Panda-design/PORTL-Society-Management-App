import { useRouter, type Href } from 'expo-router';
import { Bell, ChevronRight, LogOut, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { DrawerMenuButton } from '@/components/navigation/drawer-menu-button';
import { InitialsAvatar } from '@/components/ui/brand';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import {
  getPushRegistrationHint,
  registerForPushNotifications,
} from '@/lib/push-notifications';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, type ThemeMode } from '@/stores/themeStore';

/** Shared icon treatment — calm, one system (not rainbow category colors). */
const ICON_BG = Pastels.sage;
const ICON_COLOR = Brand.primary;

export type SettingsLink = {
  href: Href;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  /** @deprecated Ignored — icons use a single neutral treatment. Kept for call-site compat. */
  tone?: keyof typeof Pastels;
  /** @deprecated Ignored — icons use a single neutral treatment. Kept for call-site compat. */
  iconColor?: string;
};

type SectionGroup = {
  title: string;
  links: SettingsLink[];
};

type Props = {
  title: string;
  subtitle: string;
  links: SettingsLink[];
  /** Optional grouped sections. If provided, `links` is ignored. */
  sections?: SectionGroup[];
};

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === 'dark') return <Moon color={ICON_COLOR} size={18} strokeWidth={1.5} />;
  if (mode === 'light') return <Sun color={ICON_COLOR} size={18} strokeWidth={1.5} />;
  return <Monitor color={ICON_COLOR} size={18} strokeWidth={1.5} />;
}

function LinkRow({
  href: _href,
  title,
  subtitle,
  Icon,
  onPress,
}: SettingsLink & { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="mb-2 flex-row items-center gap-3.5 rounded-card bg-surface-card px-4 py-3.5"
      style={{
        shadowColor: '#101512',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-card"
        style={{ backgroundColor: ICON_BG }}
      >
        <Icon color={ICON_COLOR} size={17} strokeWidth={1.5} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] text-ink" style={{ fontFamily: FontFamily.heading }}>
          {title}
        </Text>
        <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <ChevronRight color={Brand.inkMuted} size={16} strokeWidth={1.5} />
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted"
      style={{ fontFamily: FontFamily.heading }}
    >
      {children}
    </Text>
  );
}

export function SettingsHub({ title, subtitle, links, sections }: Props) {
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.user?.id);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const [signingOut, setSigningOut] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushHint, setPushHint] = useState('Checking…');

  const refreshPushHint = useCallback(async () => {
    const info = await getPushRegistrationHint();
    setPushHint(info.hint);
  }, []);

  useEffect(() => {
    void refreshPushHint();
  }, [refreshPushHint]);

  const onEnablePush = async () => {
    if (!userId || pushBusy) return;
    setPushBusy(true);
    try {
      const info = await getPushRegistrationHint();
      if (!info.canRegister) {
        Toast.show({ type: 'info', text1: 'Push unavailable', text2: info.hint });
        setPushHint(info.hint);
        return;
      }
      if (info.permission === 'denied') {
        await Linking.openSettings();
        return;
      }
      const token = await registerForPushNotifications(userId, { force: true });
      if (token) {
        Toast.show({
          type: 'success',
          text1: 'Notifications ready',
          text2: 'This device will get Portl alerts.',
        });
        setPushHint('On — manage notification settings');
      } else {
        const again = await getPushRegistrationHint();
        Toast.show({ type: 'info', text1: 'Could not enable', text2: again.hint });
        setPushHint(again.hint);
      }
    } finally {
      setPushBusy(false);
    }
  };

  const onSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch {
      setSigningOut(false);
    }
  };

  const renderLinks = (items: SettingsLink[]) =>
    items.map((item) => (
      <LinkRow
        key={String(item.href)}
        {...item}
        onPress={() => router.push(item.href)}
      />
    ));

  const displayName = profile?.full_name?.trim() || 'You';

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4">
          <DrawerMenuButton />
        </View>

        <View className="mb-7 flex-row items-center gap-3.5">
          <InitialsAvatar
            name={displayName}
            seed={profile?.id ?? 'user'}
            size={52}
            imageUrl={profile?.avatar_url ?? null}
          />
          <View className="min-w-0 flex-1">
            <Text
              className="text-[32px] tracking-tight text-ink"
              style={{ fontFamily: FontFamily.display }}
            >
              {title}
            </Text>
            <Text className="mt-0.5 text-base leading-5 text-ink-muted" numberOfLines={2}>
              {subtitle}
            </Text>
          </View>
        </View>

        <SectionLabel>Preferences</SectionLabel>
        {/* Inline control — tinted so it reads as a setting, not a nav row */}
        <View
          className="mb-2 rounded-panel px-4 py-3.5"
          style={{
            backgroundColor: Pastels.mint,
            borderWidth: 1,
            borderColor: Brand.primarySoft,
          }}
        >
          <View className="mb-3 flex-row items-center gap-3">
            <View
              className="h-10 w-10 items-center justify-center rounded-card"
              style={{ backgroundColor: '#fff' }}
            >
              <ThemeIcon mode={mode} />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] text-ink" style={{ fontFamily: FontFamily.heading }}>
                Appearance
              </Text>
              <Text className="mt-0.5 text-xs text-ink-muted">
                Light, Dark, or match your device
              </Text>
            </View>
            <Text
              className="rounded-pill px-2 py-0.5 text-[10px]"
              style={{
                fontFamily: FontFamily.heading,
                backgroundColor: '#fff',
                color: Brand.primary,
                overflow: 'hidden',
              }}
            >
              Setting
            </Text>
          </View>
          <SegmentedControl options={THEME_OPTIONS} value={mode} onChange={setMode} />
        </View>

        <Pressable
          onPress={() => {
            void onEnablePush();
          }}
          disabled={pushBusy}
          accessibilityRole="button"
          className="mb-6 flex-row items-center gap-3.5 rounded-card bg-surface-card px-4 py-3.5"
          style={{
            shadowColor: '#101512',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 1,
          }}
        >
          <View
            className="h-10 w-10 items-center justify-center rounded-card"
            style={{ backgroundColor: ICON_BG }}
          >
            <Bell color={ICON_COLOR} size={17} strokeWidth={1.5} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[15px] text-ink" style={{ fontFamily: FontFamily.heading }}>
              Push notifications
            </Text>
            <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={2}>
              {pushHint}
            </Text>
          </View>
          {pushBusy ? (
            <ActivityIndicator color={Brand.primary} />
          ) : (
            <ChevronRight color={Brand.inkMuted} size={16} strokeWidth={1.5} />
          )}
        </Pressable>

        {sections ? (
          sections.map((section) => (
            <View key={section.title} className="mb-5">
              <SectionLabel>{section.title}</SectionLabel>
              {renderLinks(section.links)}
            </View>
          ))
        ) : (
          <View className="mb-5">{renderLinks(links)}</View>
        )}

        <View className="mb-2 mt-4 h-px" style={{ backgroundColor: '#E5E8E4' }} />
        <Pressable
          accessibilityRole="button"
          disabled={signingOut}
          className="mt-4 items-center rounded-card py-4"
          style={{ backgroundColor: `${Brand.accent}15` }}
          onPress={() => {
            void onSignOut();
          }}
        >
          {signingOut ? (
            <ActivityIndicator color={Brand.accent} />
          ) : (
            <View className="flex-row items-center gap-2">
              <LogOut color={Brand.accent} size={16} strokeWidth={1.5} />
              <Text
                className="text-base"
                style={{ color: Brand.accent, fontFamily: FontFamily.heading }}
              >
                Sign out
              </Text>
            </View>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
