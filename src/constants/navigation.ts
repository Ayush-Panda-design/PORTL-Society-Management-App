import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { Brand } from '@/constants/theme';

/** Shared tab navigator options — freezeOnBlur keeps scroll/form state when switching tabs. */
export const roleTabScreenOptions: BottomTabNavigationOptions = {
  headerShown: false,
  lazy: true,
  freezeOnBlur: true,
  tabBarActiveTintColor: Brand.primary,
  tabBarInactiveTintColor: Brand.inkMuted,
  tabBarStyle: {
    backgroundColor: Brand.card,
    borderTopColor: Brand.border,
  },
};
