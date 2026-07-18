import { Tabs } from 'expo-router';
import { Bell, Home, MoreHorizontal, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { getResidentTabOptions, TAB_ICON_SIZE } from '@/constants/navigation';

/** Consistent 1.5px stroke weight per design spec (Lucide icon family). */
function tabIcon(
  Icon: typeof Home,
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

export default function ResidentLayout() {
  const scheme = useResolvedColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={getResidentTabOptions({ scheme, bottomInset: insets.bottom })}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => tabIcon(Home, color, focused),
        }}
      />
      <Tabs.Screen
        name="visitors"
        options={{
          title: 'Visitors',
          tabBarIcon: ({ color, focused }) => tabIcon(Users, color, focused),
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
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) =>
            tabIcon(MoreHorizontal, color, focused),
        }}
      />
      <Tabs.Screen name="pre-approve" options={{ href: null }} />
      <Tabs.Screen name="visitor-history" options={{ href: null }} />
      <Tabs.Screen name="polls" options={{ href: null }} />
      <Tabs.Screen name="helpdesk" options={{ href: null }} />
      <Tabs.Screen name="amenities" options={{ href: null }} />
      <Tabs.Screen name="directory" options={{ href: null }} />
    </Tabs>
  );
}
