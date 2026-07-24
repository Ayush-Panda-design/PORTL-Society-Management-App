import { Tabs } from 'expo-router';
import { ClipboardList, MoreHorizontal, ScanLine, ShieldCheck, UserPlus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '@/components/ui/tab-bar-icon';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import {
  formatTabBadge,
  TAB_BADGE_STYLE,
  useFeatureBadges,
} from '@/hooks/use-feature-badges';
import { getGuardTabOptions, TAB_ICON_SIZE } from '@/constants/navigation';

/** Consistent 1.5px stroke weight per design spec (Lucide icon family), with a spring focus bounce. */
function tabIcon(
  Icon: typeof ShieldCheck,
  color: string,
  focused: boolean,
) {
  return <TabBarIcon Icon={Icon} color={color} size={TAB_ICON_SIZE} focused={focused} />;
}

export default function GuardLayout() {
  const scheme = useResolvedColorScheme();
  const insets = useSafeAreaInsets();
  const badges = useFeatureBadges();

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
          tabBarBadge: formatTabBadge(badges.visitors),
          tabBarBadgeStyle: TAB_BADGE_STYLE,
          tabBarAccessibilityLabel:
            badges.visitors > 0
              ? `Pending, ${badges.visitors} visitors`
              : 'Pending',
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
      <Tabs.Screen name="more" options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) =>
            tabIcon(MoreHorizontal, color, focused),
          tabBarBadge: formatTabBadge(badges.more),
          tabBarBadgeStyle: TAB_BADGE_STYLE,
          tabBarAccessibilityLabel:
            badges.more > 0 ? `More, ${badges.more} awaiting` : 'More',
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="ask-portl" options={{ href: null }} />
      <Tabs.Screen name="scan-pass" options={{ href: null }} />
    </Tabs>
  );
}
