import { Tabs } from 'expo-router';
import { ClipboardList, MoreHorizontal, ScanLine, ShieldCheck, UserPlus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { getGuardTabOptions, TAB_ICON_SIZE } from '@/constants/navigation';

/** Consistent 1.5px stroke weight per design spec (Lucide icon family). */
function tabIcon(
  Icon: typeof ShieldCheck,
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

export default function GuardLayout() {
  const scheme = useResolvedColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={getGuardTabOptions({ scheme, bottomInset: insets.bottom })}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Pending',
          tabBarIcon: ({ color, focused }) =>
            tabIcon(ShieldCheck, color, focused),
        }}
      />
      <Tabs.Screen
        name="register-visitor"
        options={{
          title: 'Register',
          tabBarIcon: ({ color, focused }) => tabIcon(UserPlus, color, focused),
        }}
      />
      <Tabs.Screen
        name="verify"
        options={{
          title: 'Entry',
          tabBarIcon: ({ color, focused }) => tabIcon(ScanLine, color, focused),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          tabBarIcon: ({ color, focused }) =>
            tabIcon(ClipboardList, color, focused),
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
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
