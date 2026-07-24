import { Tabs } from 'expo-router';
import { BarChart3, Building2, LogOut, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '@/components/ui/tab-bar-icon';
import { getPlatformTabOptions, TAB_ICON_SIZE } from '@/constants/navigation';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';

function tabIcon(Icon: typeof BarChart3, color: string, focused: boolean) {
  return <TabBarIcon Icon={Icon} color={color} size={TAB_ICON_SIZE} focused={focused} />;
}

export default function PlatformLayout() {
  const scheme = useResolvedColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={getPlatformTabOptions({ scheme, bottomInset: insets.bottom })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, focused }) => tabIcon(BarChart3, color, focused),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color, focused }) => tabIcon(Users, color, focused),
        }}
      />
      <Tabs.Screen
        name="societies"
        options={{
          title: 'Societies',
          tabBarIcon: ({ color, focused }) => tabIcon(Building2, color, focused),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) => tabIcon(LogOut, color, focused),
        }}
      />
    </Tabs>
  );
}
