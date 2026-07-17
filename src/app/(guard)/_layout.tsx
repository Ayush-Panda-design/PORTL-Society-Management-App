import { Tabs } from 'expo-router';
import { ClipboardList, MoreHorizontal, ScanLine, ShieldCheck, UserPlus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { getGuardTabOptions } from '@/constants/navigation';

/** Consistent 1.5px stroke weight per design spec (Lucide icon family). */
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
      strokeWidth={1.5}
      fill={focused ? color : 'transparent'}
      fillOpacity={focused ? 0.18 : 0}
    />
  );
}

export default function GuardLayout() {
  const scheme = useResolvedColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={getGuardTabOptions({ scheme, bottomInset: insets.bottom })}>
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
