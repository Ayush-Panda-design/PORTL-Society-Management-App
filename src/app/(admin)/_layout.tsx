import { Tabs } from 'expo-router';
import { Bell, LayoutDashboard, MoreHorizontal, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { getAdminTabOptions, TAB_ICON_SIZE } from '@/constants/navigation';

/** Consistent 1.5px stroke weight per design spec (Lucide icon family). */
function tabIcon(
  Icon: typeof LayoutDashboard,
  color: string,
  focused: boolean,
) {
  return (
    <Icon
      color={color}
      size={TAB_ICON_SIZE}
      strokeWidth={1.5}
      fill={focused ? color : 'transparent'}
    />
  );
}

export default function AdminLayout() {
  const scheme = useResolvedColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={getAdminTabOptions({ scheme, bottomInset: insets.bottom })}>
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
      <Tabs.Screen name="staff" options={{ href: null }} />
      <Tabs.Screen name="towers" options={{ href: null }} />
      <Tabs.Screen name="flats" options={{ href: null }} />
      <Tabs.Screen name="invites" options={{ href: null }} />
      <Tabs.Screen name="join-requests" options={{ href: null }} />
    </Tabs>
  );
}
