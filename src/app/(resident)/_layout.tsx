import { Tabs } from 'expo-router';
import { Bell, Home, MoreHorizontal, Users } from 'lucide-react-native';

import { Brand } from '@/constants/theme';

function tabIcon(
  Icon: typeof Home,
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

export default function ResidentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarActiveTintColor: Brand.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => tabIcon(Home, color, size, focused),
        }}
      />
      <Tabs.Screen
        name="visitors"
        options={{
          title: 'Visitors',
          tabBarIcon: ({ color, size, focused }) => tabIcon(Users, color, size, focused),
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
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size, focused }) =>
            tabIcon(MoreHorizontal, color, size, focused),
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
