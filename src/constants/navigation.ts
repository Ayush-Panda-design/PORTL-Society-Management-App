import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';

import { Brand, getPalette, RoleTints } from '@/constants/theme';

const TAB_BAR_CONTENT_HEIGHT = 56;

type RoleTabOptionsInput = {
  scheme?: 'light' | 'dark';
  /** Safe-area bottom inset — required so the dock clears Android/iOS system nav. */
  bottomInset?: number;
  /** Per-role active tint color. Defaults to resident (forest green). */
  roleTint?: string;
  /** Whether to use a forest-green tab bar (instead of charcoal) for this role. */
  lightTabBar?: boolean;
};

function buildTabOptions({
  scheme = 'light',
  bottomInset = 0,
  roleTint = Brand.primary,
  lightTabBar = false,
}: RoleTabOptionsInput): BottomTabNavigationOptions {
  const palette = getPalette(scheme);
  const isDark = scheme === 'dark';
  const safeBottom = Math.max(bottomInset, Platform.OS === 'android' ? 8 : 0);

  // Tab bar bg:
  //   • Dark mode: dark card surface always
  //   • Light mode, lightTabBar=false: charcoal (default for resident/admin)
  //   • Light mode, lightTabBar=true: forest-green variant (guard app)
  const tabBarBg = isDark ? palette.card : lightTabBar ? Brand.primary : Brand.charcoal;
  const activeTint = isDark ? roleTint : '#FFFFFF';
  const inactiveTint = isDark ? palette.inkMuted : 'rgba(255,255,255,0.40)';

  return {
    headerShown: false,
    lazy: true,
    freezeOnBlur: true,
    animation: 'fade',
    tabBarActiveTintColor: activeTint,
    tabBarInactiveTintColor: inactiveTint,
    tabBarStyle: {
      backgroundColor: tabBarBg,
      borderTopWidth: 0,
      borderTopColor: 'transparent',
      height: TAB_BAR_CONTENT_HEIGHT + safeBottom,
      paddingTop: 6,
      paddingBottom: safeBottom,
      elevation: 14,
      shadowColor: isDark ? '#000' : Brand.charcoal,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: isDark ? 0.45 : 0.2,
      shadowRadius: 18,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      fontWeight: '600',
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
