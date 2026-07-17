import { Tabs } from 'expo-router';
import { Bell, LayoutDashboard, MoreHorizontal, Users } from 'lucide-react-native';

import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { getRoleTabScreenOptions } from '@/constants/navigation';

function tabIcon(
  Icon: typeof LayoutDashboard,
  color: string,
  size: number,
  focused: boolean,
) {
  return (
    <Icon
      color={color}
      size={size}
      fill={focused ? color : 'transparent'}
      fillOpacity={focused ? 0.22 : 0}
      strokeWidth={focused ? 2.4 : 2}
    />
  );
}

export default function AdminLayout() {
  const scheme = useResolvedColorScheme();

  return (
    <Tabs screenOptions={getRoleTabScreenOptions(scheme)}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) =>
            tabIcon(LayoutDashboard, color, size, focused),
        }}
      />
      <Tabs.Screen
        name="notices"
        options={{
          title: 'Notices',
          tabBarIcon: ({ color, size, focused }) => tabIcon(Bell, color, size, focused),
        }}
      />
      <Tabs.Screen
        name="residents"
        options={{
          title: 'Residents',
          tabBarIcon: ({ color, size, focused }) => tabIcon(Users, color, size, focused),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size, focused }) =>
            tabIcon(MoreHorizontal, color, size, focused),
        }}
      />
      <Tabs.Screen name="polls" options={{ href: null }} />
      <Tabs.Screen name="complaints" options={{ href: null }} />
      <Tabs.Screen name="amenities" options={{ href: null }} />
      <Tabs.Screen name="staff" options={{ href: null }} />
      <Tabs.Screen name="towers" options={{ href: null }} />
      <Tabs.Screen name="flats" options={{ href: null }} />
    </Tabs>
  );
}
