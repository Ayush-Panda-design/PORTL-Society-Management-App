import { useRouter, type Href } from 'expo-router';
import { ChevronRight, LogOut, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DrawerMenuButton } from '@/components/navigation/drawer-menu-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, type ThemeMode } from '@/stores/themeStore';

export type SettingsLink = {
  href: Href;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  /** Background tint for the icon container. Defaults to mint. */
  tone?: keyof typeof Pastels;
  /** Icon color override. */
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
  const color = Brand.primary;
  if (mode === 'dark') return <Moon color={color} size={18} strokeWidth={1.5} />;
  if (mode === 'light') return <Sun color={color} size={18} strokeWidth={1.5} />;
  return <Monitor color={color} size={18} strokeWidth={1.5} />;
}

function LinkRow({
  href,
  title,
  subtitle,
  Icon,
  tone = 'mint',
  iconColor,
  onPress,
}: SettingsLink & { onPress: () => void }) {
  const bgColor = Pastels[tone];
  const iconCol = iconColor ?? Brand.primary;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3.5 rounded-card bg-surface-card px-4 py-3.5 mb-2"
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
        style={{ backgroundColor: bgColor }}
      >
        <Icon color={iconCol} size={17} strokeWidth={1.5} />
      </View>
      <View className="flex-1">
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

export function SettingsHub({ title, subtitle, links, sections }: Props) {
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
      setSigningOut(false);
    }
  };

  const renderLinks = (items: SettingsLink[]) =>
    items.map(({ href, title: linkTitle, subtitle: linkSubtitle, Icon, tone, iconColor }) => (
      <LinkRow
        key={String(href)}
        href={href}
        title={linkTitle}
        subtitle={linkSubtitle}
        Icon={Icon}
        tone={tone}
        iconColor={iconColor}
        onPress={() => router.push(href)}
      />
    ));

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
        <Text
          className="mb-0.5 text-[32px] tracking-tight text-ink"
          style={{ fontFamily: FontFamily.display }}
        >
          {title}
        </Text>
        <Text className="mb-7 text-base leading-5 text-ink-muted">{subtitle}</Text>

        {/* Appearance section */}
        <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted" style={{ fontFamily: FontFamily.heading }}>
          Preferences
        </Text>
        <View
          className="mb-6 rounded-panel bg-surface-card p-4"
          style={{
            shadowColor: '#101512',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View className="mb-3 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-card" style={{ backgroundColor: Pastels.mint }}>
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
          </View>
          <SegmentedControl
            options={THEME_OPTIONS}
            value={mode}
            onChange={setMode}
          />
        </View>

        {/* Sections or flat links */}
        {sections
          ? sections.map((section) => (
              <View key={section.title} className="mb-5">
                <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted" style={{ fontFamily: FontFamily.heading }}>
                  {section.title}
                </Text>
                {renderLinks(section.links)}
              </View>
            ))
          : (
            <View className="mb-5">
              {renderLinks(links)}
            </View>
          )
        }

        {/* Sign out — terracotta accent, visually separated */}
        <View
          className="mb-2 mt-4 h-px"
          style={{ backgroundColor: '#E5E8E4' }}
        />
        <Pressable
          accessibilityRole="button"
          disabled={signingOut}
          className="mt-4 items-center rounded-card py-4"
          style={{ backgroundColor: `${Brand.accent}15` }}
          onPress={() => { void onSignOut(); }}
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
