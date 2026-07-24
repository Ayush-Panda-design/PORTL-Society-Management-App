import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { useRouter, type Href } from 'expo-router';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  ClipboardList,
  KeyRound,
  Layers,
  LogOut,
  Phone,
  User,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InitialsAvatar } from '@/components/ui/brand';
import { CountBadge } from '@/components/ui/count-badge';
import { Brand, FontFamily, Pastels, RoleTints } from '@/constants/theme';
import { badgeForHref, useFeatureBadges } from '@/hooks/use-feature-badges';
import { useModalBack } from '@/hooks/use-modal-back';
import { useThemePalette } from '@/hooks/use-theme';
import { isCommitteeMember, isFullAdmin } from '@/lib/admin-access';
import { committeeManageLinks } from '@/lib/auth-routing';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types/database';

type DrawerLink = {
  href: Href;
  title: string;
  Icon: LucideIcon;
};

const RESIDENT_LINKS: DrawerLink[] = [
  { href: '/(resident)/profile' as Href, title: 'My profile', Icon: User },
  { href: '/(resident)/polls' as Href, title: 'Polls', Icon: BarChart3 },
  { href: '/(resident)/helpdesk' as Href, title: 'Helpdesk', Icon: ClipboardList },
  { href: '/(resident)/amenities' as Href, title: 'Amenities', Icon: Building2 },
  { href: '/(resident)/directory' as Href, title: 'Staff directory', Icon: Phone },
  { href: '/(resident)/visitor-history' as Href, title: 'Visitor history', Icon: Users },
];

const GUARD_LINKS: DrawerLink[] = [
  { href: '/(guard)/profile' as Href, title: 'My profile', Icon: User },
  { href: '/(guard)/dashboard' as Href, title: 'Pending queue', Icon: ClipboardList },
  { href: '/(guard)/logs' as Href, title: 'Visitor logs', Icon: Layers },
];

const ADMIN_LINKS: DrawerLink[] = [
  { href: '/(admin)/profile' as Href, title: 'My profile', Icon: User },
  { href: '/(admin)/escalated-visitors' as Href, title: 'Missed visitors', Icon: AlertTriangle },
  { href: '/(admin)/towers' as Href, title: 'Towers', Icon: Building2 },
  { href: '/(admin)/flats' as Href, title: 'Flats', Icon: Layers },
  { href: '/(admin)/invites' as Href, title: 'Invite links', Icon: KeyRound },
  { href: '/(admin)/join-requests' as Href, title: 'Join requests', Icon: UserPlus },
  { href: '/(admin)/polls' as Href, title: 'Polls', Icon: BarChart3 },
  { href: '/(admin)/complaints' as Href, title: 'Complaints', Icon: ClipboardList },
  { href: '/(admin)/amenities' as Href, title: 'Amenities', Icon: Building2 },
  { href: '/(admin)/staff' as Href, title: 'Staff directory', Icon: Phone },
];

const COMMITTEE_ICONS: Record<string, LucideIcon> = {
  '/(admin)/escalated-visitors': AlertTriangle,
  '/(admin)/notices': ClipboardList,
  '/(admin)/polls': BarChart3,
  '/(admin)/complaints': ClipboardList,
  '/(admin)/amenities': Building2,
  '/(admin)/payments': Layers,
  '/(admin)/join-requests': UserPlus,
  '/(admin)/flats': Layers,
  '/(admin)/partners': Phone,
  '/(admin)/audit-log': KeyRound,
};

function linksForRole(
  role: UserRole | null,
  permissions: readonly string[],
): DrawerLink[] {
  if (isFullAdmin(role)) return ADMIN_LINKS;
  if (role === 'guard') return GUARD_LINKS;
  if (isCommitteeMember(role, permissions)) {
    const committee = committeeManageLinks([...permissions]).map((link) => ({
      href: link.href,
      title: link.title,
      Icon: COMMITTEE_ICONS[String(link.href)] ?? ClipboardList,
    }));
    return [
      { href: '/(resident)/profile' as Href, title: 'My profile', Icon: User },
      ...committee,
      ...RESIDENT_LINKS.filter((l) => String(l.href) !== '/(resident)/profile'),
    ];
  }
  return RESIDENT_LINKS;
}

function roleTint(role: UserRole | null, permissions: readonly string[]): string {
  if (isFullAdmin(role)) return RoleTints.admin;
  if (role === 'guard') return RoleTints.guard;
  if (isCommitteeMember(role, permissions)) return RoleTints.admin;
  return RoleTints.resident;
}

function roleLabel(role: UserRole | null, permissions: readonly string[]): string {
  if (isFullAdmin(role)) return 'Admin';
  if (role === 'guard') return 'Security';
  if (isCommitteeMember(role, permissions)) return 'Committee';
  return 'Resident';
}

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const permissions = useAuthStore((s) => s.permissions);
  const signOut = useAuthStore((s) => s.signOut);
  const role = profile?.role ?? null;
  const links = useMemo(
    () => linksForRole(role, permissions ?? []),
    [role, permissions],
  );
  const tint = roleTint(role, permissions ?? []);
  const { pastels, border, isDark } = useThemePalette();
  const badges = useFeatureBadges();

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  useModalBack(confirmVisible, () => {
    if (!signingOut) setConfirmVisible(false);
  });

  const onConfirmSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      props.navigation.closeDrawer();
      setConfirmVisible(false);
      await signOut();
      router.replace('/(auth)/login');
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: 16,
          flexGrow: 1,
        }}
      >
        <View className="mb-5 px-4">
          <View
            className="rounded-panel px-4 py-4"
            style={{ backgroundColor: isDark ? pastels.rose : Pastels.mint }}
          >
            <InitialsAvatar
              name={profile?.full_name ?? 'You'}
              seed={profile?.id}
              size={52}
              imageUrl={profile?.avatar_url}
            />
            <Text
              className="mt-3 text-lg text-ink"
              style={{ fontFamily: FontFamily.display }}
              numberOfLines={1}
            >
              {profile?.full_name ?? 'Portl member'}
            </Text>
            <Text className="mt-0.5 text-sm text-ink-muted">{roleLabel(role, permissions ?? [])}</Text>
          </View>
        </View>

        <Text
          className="mb-2 px-5 text-xs font-bold uppercase tracking-widest text-ink-muted"
          style={{ fontFamily: FontFamily.heading }}
        >
          Menu
        </Text>

        {links.map(({ href, title, Icon }) => {
          const isProfile = title === 'My profile';
          const badge = badgeForHref(String(href), badges);
          return (
            <Pressable
              key={String(href)}
              accessibilityRole="button"
              accessibilityLabel={badge > 0 ? `${title}, ${badge} new` : title}
              onPress={() => {
                props.navigation.closeDrawer();
                router.push(href);
              }}
              className="mx-3 mb-1 flex-row items-center gap-3 rounded-card px-3 py-3"
              style={isProfile ? { backgroundColor: `${tint}14` } : undefined}
            >
              <View
                className="h-9 w-9 items-center justify-center rounded-card"
                style={{ backgroundColor: isProfile ? `${tint}22` : pastels.sage }}
              >
                <Icon color={isProfile ? tint : Brand.primary} size={16} strokeWidth={1.5} />
              </View>
              <Text
                className="flex-1 text-[15px] text-ink"
                style={{ fontFamily: FontFamily.heading }}
              >
                {title}
              </Text>
              <CountBadge count={badge} size="sm" />
            </Pressable>
          );
        })}
      </DrawerContentScrollView>

      <View
        className="border-t px-4 pt-3"
        style={{
          borderTopColor: isDark ? border : '#E5E8E4',
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={() => setConfirmVisible(true)}
          className="flex-row items-center gap-3 rounded-card px-3 py-3"
          style={{
            backgroundColor: isDark ? `${Brand.primary}12` : `${Brand.accent}12`,
          }}
        >
          <View
            className="h-9 w-9 items-center justify-center rounded-card"
            style={{
              backgroundColor: isDark ? `${Brand.primary}18` : `${Brand.accent}18`,
            }}
          >
            <LogOut
              color={isDark ? Brand.primary : Brand.accent}
              size={16}
              strokeWidth={1.5}
            />
          </View>
          <Text
            className="flex-1 text-[15px]"
            style={{
              color: isDark ? Brand.primary : Brand.accent,
              fontFamily: FontFamily.heading,
            }}
          >
            Sign out
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!signingOut) setConfirmVisible(false);
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(16, 21, 18, 0.45)' }}
          onPress={() => {
            if (!signingOut) setConfirmVisible(false);
          }}
        >
          <Pressable
            accessibilityRole="none"
            onPress={() => {}}
            className="w-full max-w-sm rounded-panel bg-surface-card px-5 py-5"
            style={{
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.18,
              shadowRadius: 24,
              elevation: 8,
            }}
          >
            <View
              className="mb-4 h-12 w-12 items-center justify-center rounded-card"
              style={{
                backgroundColor: isDark ? `${Brand.primary}18` : `${Brand.accent}18`,
              }}
            >
              <LogOut
                color={isDark ? Brand.primary : Brand.accent}
                size={22}
                strokeWidth={1.5}
              />
            </View>

            <Text
              className="text-xl text-ink"
              style={{ fontFamily: FontFamily.display }}
            >
              Sign out?
            </Text>
            <Text className="mt-2 text-[15px] leading-5 text-ink-muted">
              Are you sure you want to sign out? You’ll need to sign in again to access your society.
            </Text>

            <View className="mt-5 gap-2.5">
              <Pressable
                accessibilityRole="button"
                disabled={signingOut}
                onPress={() => { void onConfirmSignOut(); }}
                className="items-center rounded-card py-3.5"
                style={{ backgroundColor: isDark ? Brand.primary : Brand.accent }}
              >
                {signingOut ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    className="text-[15px] text-white"
                    style={{ fontFamily: FontFamily.heading }}
                  >
                    Yes, sign out
                  </Text>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={signingOut}
                onPress={() => setConfirmVisible(false)}
                className="items-center rounded-card py-3.5"
                style={{ backgroundColor: isDark ? pastels.sage : Pastels.sage }}
              >
                <Text
                  className="text-[15px] text-ink"
                  style={{ fontFamily: FontFamily.heading }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
