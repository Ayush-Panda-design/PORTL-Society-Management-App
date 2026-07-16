import { Tabs } from 'expo-router';
import { ClipboardList, MoreHorizontal, ScanLine, ShieldCheck, UserPlus } from 'lucide-react-native';

import { roleTabScreenOptions } from '@/constants/navigation';

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
    <Tabs screenOptions={roleTabScreenOptions}>
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
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size, focused }) =>
            tabIcon(MoreHorizontal, color, size, focused),
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
