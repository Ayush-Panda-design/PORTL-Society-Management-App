import { Tabs } from 'expo-router';
import { ClipboardList, ScanLine, ShieldCheck, UserPlus } from 'lucide-react-native';

import { Brand } from '@/constants/theme';

function tabIcon(
  Icon: typeof ShieldCheck,
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

export default function GuardLayout() {
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
        name="dashboard"
        options={{
          title: 'Pending',
          tabBarIcon: ({ color, size, focused }) =>
            tabIcon(ShieldCheck, color, size, focused),
        }}
      />
      <Tabs.Screen
        name="register-visitor"
        options={{
          title: 'Register',
          tabBarIcon: ({ color, size, focused }) => tabIcon(UserPlus, color, size, focused),
        }}
      />
      <Tabs.Screen
        name="verify"
        options={{
          title: 'Entry',
          tabBarIcon: ({ color, size, focused }) => tabIcon(ScanLine, color, size, focused),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          tabBarIcon: ({ color, size, focused }) =>
            tabIcon(ClipboardList, color, size, focused),
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
