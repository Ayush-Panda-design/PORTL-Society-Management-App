import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';

import { Brand, getPalette, RoleTints } from '@/constants/theme';

const TAB_BAR_CONTENT_HEIGHT = 56;
/** Lucide icons in the bottom dock — RN default is 25 which reads oversized. */
export const TAB_ICON_SIZE = 20;

type RoleTabOptionsInput = {
  scheme?: 'light' | 'dark';
  /** Safe-area bottom inset — required so the dock clears Android/iOS system nav. */
  bottomInset?: number;
  /** Per-role active tint color. Defaults to resident (forest green). */
  roleTint?: string;
  /** Whether to use a forest-green tab bar (instead of charcoal) for this role. */
  lightTabBar?: boolean;
};

import { Tokens } from '@/theme/tokens';

function buildTabOptions({
  scheme = 'light',
  bottomInset = 0,
  roleTint = Tokens.color.primary,
  lightTabBar = false,
}: RoleTabOptionsInput): BottomTabNavigationOptions {
  const isDark = scheme === 'dark';
  const safeBottom = Math.max(bottomInset, Platform.OS === 'android' ? 8 : 0);

  const tabBarBg = Tokens.color.surface;
  const activeTint = Tokens.color.primary;
  const inactiveTint = Tokens.color.textMuted;

  return {
    headerShown: false,
    lazy: true,
    freezeOnBlur: true,
    animation: 'fade',
    tabBarActiveTintColor: activeTint,
    tabBarInactiveTintColor: inactiveTint,
    tabBarShowLabel: false,
    tabBarStyle: {
      backgroundColor: tabBarBg,
      borderTopWidth: 1,
      borderTopColor: Tokens.color.border,
      height: TAB_BAR_CONTENT_HEIGHT + safeBottom,
      paddingTop: 6,
      paddingBottom: safeBottom,
      elevation: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: isDark ? 0.45 : 0.08,
      shadowRadius: 18,
    },
    tabBarItemStyle: {
      minHeight: 44,
      minWidth: 44,
      justifyContent: 'center',
    },
    tabBarLabelStyle: {
      ...Tokens.typography.label,
      marginTop: 2,
    },
    // Indicator dot for active tab (accent color)
    tabBarActiveBackgroundColor: 'transparent',
  };
}

/** Resident tab options — charcoal bar, forest-green tint in dark mode. */
export function getResidentTabOptions(opts: Omit<RoleTabOptionsInput, 'roleTint' | 'lightTabBar'> = {}) {
  return buildTabOptions({ ...opts, roleTint: RoleTints.resident, lightTabBar: false });
}

/** Admin tab options — charcoal bar, deep blue tint in dark mode. */
export function getAdminTabOptions(opts: Omit<RoleTabOptionsInput, 'roleTint' | 'lightTabBar'> = {}) {
  return buildTabOptions({ ...opts, roleTint: '#5B8DD9', lightTabBar: false });
}

/** Guard tab options — forest-green bar (light mode), amber tint in dark mode. */
export function getGuardTabOptions(opts: Omit<RoleTabOptionsInput, 'roleTint' | 'lightTabBar'> = {}) {
  return buildTabOptions({ ...opts, roleTint: '#E4A55B', lightTabBar: true });
}

/** Shared generic options (fallback / legacy). */
export function getRoleTabScreenOptions(opts: RoleTabOptionsInput = {}) {
  return buildTabOptions(opts);
}

/** @deprecated Use getResidentTabOptions / getAdminTabOptions / getGuardTabOptions instead. */
export const roleTabScreenOptions = buildTabOptions({ scheme: 'light' });
