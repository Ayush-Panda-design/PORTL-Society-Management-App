import { Tabs } from 'expo-router';
import { Bell, DoorOpen, Home, MoreHorizontal } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '@/components/ui/tab-bar-icon';
import { getResidentTabOptions, TAB_ICON_SIZE } from '@/constants/navigation';
import {
  formatTabBadge,
  TAB_BADGE_STYLE,
  useFeatureBadges,
} from '@/hooks/use-feature-badges';
import { useNoticesRealtime } from '@/hooks/use-notices-realtime';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { useAuthStore } from '@/stores/authStore';

/** Consistent 1.5px stroke weight per design spec (Lucide icon family), with a spring focus bounce. */
function tabIcon(
  Icon: typeof Home,
  color: string,
  focused: boolean,
) {
  return <TabBarIcon Icon={Icon} color={color} size={TAB_ICON_SIZE} focused={focused} />;
}

export default function ResidentLayout() {
  const scheme = useResolvedColorScheme();
  const insets = useSafeAreaInsets();
  const societyId = useAuthStore((s) => s.profile?.society_id);
  useNoticesRealtime(societyId);
  const badges = useFeatureBadges();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={getResidentTabOptions({ scheme, bottomInset: insets.bottom })}
    >
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
          tabBarAccessibilityLabel:
            badges.visitors > 0
              ? `Visitors, ${badges.visitors} pending`
              : 'Visitors and gate activity',
          tabBarIcon: ({ color, focused }) => tabIcon(DoorOpen, color, focused),
          tabBarBadge: formatTabBadge(badges.visitors),
          tabBarBadgeStyle: TAB_BADGE_STYLE,
        }}
      />
      <Tabs.Screen
        name="notices"
        options={{
          title: 'Notices',
          tabBarIcon: ({ color, focused }) => tabIcon(Bell, color, focused),
          tabBarBadge: formatTabBadge(badges.notices),
          tabBarBadgeStyle: TAB_BADGE_STYLE,
          tabBarAccessibilityLabel:
            badges.notices > 0
              ? `Notices, ${badges.notices} unread`
              : 'Notices',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) =>
            tabIcon(MoreHorizontal, color, focused),
          tabBarBadge: formatTabBadge(badges.more),
          tabBarBadgeStyle: TAB_BADGE_STYLE,
          tabBarAccessibilityLabel:
            badges.more > 0 ? `More, ${badges.more} awaiting` : 'More',
        }}
      />
      <Tabs.Screen name="pre-approve" options={{ href: null }} />
      <Tabs.Screen name="visitor-history" options={{ href: null }} />
      <Tabs.Screen name="polls" options={{ href: null }} />
      <Tabs.Screen name="helpdesk" options={{ href: null }} />
      <Tabs.Screen name="amenities" options={{ href: null }} />
      <Tabs.Screen name="directory" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="ask-portl" options={{ href: null }} />
    </Tabs>
  );
}
