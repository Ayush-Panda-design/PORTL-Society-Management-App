import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { useRouter, type Href } from 'expo-router';
import {
  BarChart3,
  Building2,
  ClipboardList,
  KeyRound,
  Layers,
  Phone,
  User,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InitialsAvatar } from '@/components/ui/brand';
import { Brand, FontFamily, Pastels, RoleTints } from '@/constants/theme';
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
  { href: '/(admin)/towers' as Href, title: 'Towers', Icon: Building2 },
  { href: '/(admin)/flats' as Href, title: 'Flats', Icon: Layers },
  { href: '/(admin)/invites' as Href, title: 'Invite links', Icon: KeyRound },
  { href: '/(admin)/join-requests' as Href, title: 'Join requests', Icon: UserPlus },
  { href: '/(admin)/polls' as Href, title: 'Polls', Icon: BarChart3 },
  { href: '/(admin)/complaints' as Href, title: 'Complaints', Icon: ClipboardList },
  { href: '/(admin)/amenities' as Href, title: 'Amenities', Icon: Building2 },
  { href: '/(admin)/staff' as Href, title: 'Staff directory', Icon: Phone },
];

function linksForRole(role: UserRole | null): DrawerLink[] {
  if (role === 'admin') return ADMIN_LINKS;
  if (role === 'guard') return GUARD_LINKS;
  return RESIDENT_LINKS;
}

function roleTint(role: UserRole | null): string {
  if (role === 'admin') return RoleTints.admin;
  if (role === 'guard') return RoleTints.guard;
  return RoleTints.resident;
}

function roleLabel(role: UserRole | null): string {
  if (role === 'admin') return 'Admin';
  if (role === 'guard') return 'Security';
  return 'Resident';
}

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const role = profile?.role ?? null;
  const links = linksForRole(role);
  const tint = roleTint(role);

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 16,
        flexGrow: 1,
      }}
    >
      <View className="mb-5 px-4">
        <View
          className="rounded-panel px-4 py-4"
          style={{ backgroundColor: Pastels.mint }}
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
          <Text className="mt-0.5 text-sm text-ink-muted">{roleLabel(role)}</Text>
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
        return (
          <Pressable
            key={String(href)}
            accessibilityRole="button"
            onPress={() => {
              props.navigation.closeDrawer();
              router.push(href);
            }}
            className="mx-3 mb-1 flex-row items-center gap-3 rounded-card px-3 py-3"
            style={isProfile ? { backgroundColor: `${tint}14` } : undefined}
          >
            <View
              className="h-9 w-9 items-center justify-center rounded-card"
              style={{ backgroundColor: isProfile ? `${tint}22` : Pastels.sage }}
            >
              <Icon color={isProfile ? tint : Brand.primary} size={16} strokeWidth={1.5} />
            </View>
            <Text
              className="flex-1 text-[15px] text-ink"
              style={{ fontFamily: FontFamily.heading }}
            >
              {title}
            </Text>
          </Pressable>
        );
      })}
    </DrawerContentScrollView>
  );
}
