import { Tabs } from 'expo-router';
import { Bell, LayoutDashboard, MoreHorizontal, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '@/components/ui/tab-bar-icon';
import { getAdminTabOptions, TAB_ICON_SIZE } from '@/constants/navigation';
import {
  formatTabBadge,
  TAB_BADGE_STYLE,
  useFeatureBadges,
} from '@/hooks/use-feature-badges';
import { useNoticesRealtime } from '@/hooks/use-notices-realtime';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { canAccessAdminRoute } from '@/lib/admin-access';
import { useAuthStore } from '@/stores/authStore';

/** Consistent 1.5px stroke weight per design spec (Lucide icon family), with a spring focus bounce. */
function tabIcon(
  Icon: typeof LayoutDashboard,
  color: string,
  focused: boolean,
) {
  return <TabBarIcon Icon={Icon} color={color} size={TAB_ICON_SIZE} focused={focused} />;
}

export default function AdminLayout() {
  const scheme = useResolvedColorScheme();
  const insets = useSafeAreaInsets();
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const role = useAuthStore((s) => s.profile?.role);
  const permissions = useAuthStore((s) => s.permissions);
  useNoticesRealtime(societyId);
  const badges = useFeatureBadges();

  const showNotices = canAccessAdminRoute('notices', role, permissions);
  const showResidents = canAccessAdminRoute('residents', role, permissions);

  return (
    <Tabs
      backBehavior="history"
      screenOptions={getAdminTabOptions({ scheme, bottomInset: insets.bottom })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) =>
            tabIcon(LayoutDashboard, color, focused),
        }}
      />
      <Tabs.Screen
        name="notices"
        options={{
          title: 'Notices',
          href: showNotices ? undefined : null,
          tabBarIcon: ({ color, focused }) => tabIcon(Bell, color, focused),
          tabBarBadge: formatTabBadge(badges.notices),
          tabBarBadgeStyle: TAB_BADGE_STYLE,
          tabBarAccessibilityLabel:
            badges.notices > 0
              ? `Notices, ${badges.notices} unread`
              : 'Notices',
        }}
      />
      <Tabs.Screen
        name="residents"
        options={{
          title: 'Residents',
          href: showResidents ? undefined : null,
          tabBarIcon: ({ color, focused }) => tabIcon(Users, color, focused),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) =>
            tabIcon(MoreHorizontal, color, focused),
          tabBarBadge: formatTabBadge(badges.more),
          tabBarBadgeStyle: TAB_BADGE_STYLE,
          tabBarAccessibilityLabel:
            badges.more > 0 ? `More, ${badges.more} awaiting` : 'More',
        }}
      />
      <Tabs.Screen name="polls" options={{ href: null }} />
      <Tabs.Screen name="complaints" options={{ href: null }} />
      <Tabs.Screen name="amenities" options={{ href: null }} />
      <Tabs.Screen name="payout-setup" options={{ href: null }} />
      <Tabs.Screen name="staff" options={{ href: null }} />
      <Tabs.Screen name="towers" options={{ href: null }} />
      <Tabs.Screen name="flats" options={{ href: null }} />
      <Tabs.Screen name="invites" options={{ href: null }} />
      <Tabs.Screen name="join-requests" options={{ href: null }} />
      <Tabs.Screen name="audit-log" options={{ href: null }} />
      <Tabs.Screen name="roles" options={{ href: null }} />
      <Tabs.Screen name="gates" options={{ href: null }} />
      <Tabs.Screen name="broadcasts" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="partners" options={{ href: null }} />
      <Tabs.Screen name="escalated-visitors" options={{ href: null }} />
      <Tabs.Screen name="ask-portl" options={{ href: null }} />
    </Tabs>
  );
}
