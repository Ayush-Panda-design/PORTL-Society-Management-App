import { Tabs } from 'expo-router';
import { Bell, LayoutDashboard, MoreHorizontal, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '@/components/ui/tab-bar-icon';
import { getAdminTabOptions, TAB_ICON_SIZE } from '@/constants/navigation';
import { useNoticesRealtime } from '@/hooks/use-notices-realtime';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import {
  formatTabBadge,
  useUnreadNoticesCount,
} from '@/hooks/use-unread-notices-count';
import { useAuthStore } from '@/stores/authStore';
import { Tokens } from '@/theme/tokens';

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
  useNoticesRealtime(societyId);
  const unreadNotices = useUnreadNoticesCount();

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
          tabBarIcon: ({ color, focused }) => tabIcon(Bell, color, focused),
          tabBarBadge: formatTabBadge(unreadNotices),
          tabBarBadgeStyle: {
            backgroundColor: Tokens.color.danger,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '700',
            minWidth: 16,
            height: 16,
            lineHeight: 15,
            borderRadius: 8,
          },
          tabBarAccessibilityLabel:
            unreadNotices > 0
              ? `Notices, ${unreadNotices} unread`
              : 'Notices',
        }}
      />
      <Tabs.Screen
        name="residents"
        options={{
          title: 'Residents',
          tabBarIcon: ({ color, focused }) => tabIcon(Users, color, focused),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) =>
            tabIcon(MoreHorizontal, color, focused),
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
    </Tabs>
  );
}
