import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet } from 'react-native';

import { Brand, getPalette, RoleTints } from '@/constants/theme';

const TAB_BAR_CONTENT_HEIGHT = 56;
/** Lucide icons in the bottom dock — RN default is 25 which reads oversized. */
export const TAB_ICON_SIZE = 20;

type RoleTabOptionsInput = {
  scheme?: 'light' | 'dark';
  /** Safe-area bottom inset — required so the dock clears Android/iOS system nav. */
  bottomInset?: number;
  /** Per-role active tint color. Defaults to resident brand red. */
  roleTint?: string;
  /** Whether to use a light-tinted tab bar for this role. */
  lightTabBar?: boolean;
};

function buildTabOptions({
  scheme = 'light',
  bottomInset = 0,
  roleTint = Brand.primary,
}: RoleTabOptionsInput): BottomTabNavigationOptions {
  const isDark = scheme === 'dark';
  const palette = getPalette(scheme);
  const safeBottom = Math.max(bottomInset, Platform.OS === 'android' ? 8 : 0);

  const tabBarBg = palette.card;
  const activeTint = isDark ? Brand.primaryOnDark : roleTint;
  const inactiveTint = isDark ? palette.inkMuted : palette.inkFaint;

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
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : palette.border,
      height: TAB_BAR_CONTENT_HEIGHT + safeBottom,
      paddingTop: 6,
      paddingBottom: safeBottom,
      elevation: isDark ? 0 : 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: isDark ? 0.12 : 0.08,
      shadowRadius: isDark ? 8 : 18,
    },
    tabBarItemStyle: {
      minHeight: 44,
      minWidth: 44,
      justifyContent: 'center',
    },
    tabBarLabelStyle: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 2,
    },
    tabBarActiveBackgroundColor: 'transparent',
  };
}

/** Resident tab options — surface card bar, brand-red active tint. */
export function getResidentTabOptions(opts: Omit<RoleTabOptionsInput, 'roleTint' | 'lightTabBar'> = {}) {
  return buildTabOptions({ ...opts, roleTint: RoleTints.resident, lightTabBar: false });
}

/** Admin tab options — surface card bar, deep red active tint. */
export function getAdminTabOptions(opts: Omit<RoleTabOptionsInput, 'roleTint' | 'lightTabBar'> = {}) {
  return buildTabOptions({ ...opts, roleTint: RoleTints.admin, lightTabBar: false });
}

/** Guard tab options — surface card bar, bright red active tint. */
export function getGuardTabOptions(opts: Omit<RoleTabOptionsInput, 'roleTint' | 'lightTabBar'> = {}) {
  return buildTabOptions({ ...opts, roleTint: RoleTints.guard, lightTabBar: false });
}

/** Shared generic options (fallback / legacy). */
export function getRoleTabScreenOptions(opts: RoleTabOptionsInput = {}) {
  return buildTabOptions(opts);
}

/** @deprecated Use getResidentTabOptions / getAdminTabOptions / getGuardTabOptions instead. */
export const roleTabScreenOptions = buildTabOptions({ scheme: 'light' });
