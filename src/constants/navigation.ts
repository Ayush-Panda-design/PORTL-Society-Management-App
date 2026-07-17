import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { Brand, getPalette } from '@/constants/theme';

/** Shared tab navigator options — freezeOnBlur keeps scroll/form state when switching tabs. */
export function getRoleTabScreenOptions(
  scheme: 'light' | 'dark' = 'light',
): BottomTabNavigationOptions {
  const palette = getPalette(scheme);
  return {
    headerShown: false,
    lazy: true,
    freezeOnBlur: true,
    // Instagram-style cross-fade between tabs (RN Navigation bottom-tabs v7).
    animation: 'fade',
    tabBarActiveTintColor: Brand.primary,
    tabBarInactiveTintColor: palette.inkMuted,
    tabBarStyle: {
      backgroundColor: palette.card,
      borderTopColor: palette.border,
    },
  };
}

/** @deprecated Prefer getRoleTabScreenOptions(scheme) for dark-mode awareness. */
export const roleTabScreenOptions = getRoleTabScreenOptions('light');
