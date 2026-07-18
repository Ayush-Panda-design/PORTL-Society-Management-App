import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
  ThemeProvider as NavigationThemeProvider,
  type Theme,
} from '@react-navigation/native';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { colorScheme as nwColorScheme, vars } from 'nativewind';
import { type ReactNode, useEffect, useMemo } from 'react';
import { AppState, View } from 'react-native';

import { Brand, getPalette, themeCssVars } from '@/constants/theme';
import {
  resolveColorScheme,
  useResolvedColorScheme,
} from '@/hooks/use-resolved-color-scheme';
import { useThemeStore } from '@/stores/themeStore';

const PortlLightNav: Theme = {
  ...NavDefaultTheme,
  colors: {
    ...NavDefaultTheme.colors,
    primary: Brand.primary,
    background: themeCssVars.light['--color-surface'],
    card: themeCssVars.light['--color-surface-card'],
    text: themeCssVars.light['--color-ink'],
    border: themeCssVars.light['--color-surface-border'],
    notification: Brand.accent,
  },
};

const PortlDarkNav: Theme = {
  ...NavDarkTheme,
  colors: {
    ...NavDarkTheme.colors,
    primary: Brand.primary,
    background: themeCssVars.dark['--color-surface'],
    card: themeCssVars.dark['--color-surface-card'],
    text: themeCssVars.dark['--color-ink'],
    border: themeCssVars.dark['--color-surface-border'],
    notification: Brand.accent,
  },
};

/**
 * Applies Light / Dark / System like Instagram & WhatsApp:
 * - NativeWind colorScheme for dark: variants
 * - CSS vars remap surface/ink tokens instantly
 * - React Navigation + StatusBar + system root background stay in sync
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const resolved = useResolvedColorScheme();
  const palette = getPalette(resolved);

  useEffect(() => {
    nwColorScheme.set(mode);
  }, [mode]);

  useEffect(() => {
    const apply = () => {
      if (AppState.currentState !== 'active') return;
      void SystemUI.setBackgroundColorAsync(palette.surface).catch(() => {});
    };
    apply();
    const sub = AppState.addEventListener('change', apply);
    return () => sub.remove();
  }, [palette.surface]);

  const cssVars = useMemo(
    () => vars(themeCssVars[resolved] as Record<string, string>),
    [resolved],
  );

  return (
    <NavigationThemeProvider value={resolved === 'dark' ? PortlDarkNav : PortlLightNav}>
      <View style={[{ flex: 1, backgroundColor: palette.surface }, cssVars]}>
        {children}
        <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      </View>
    </NavigationThemeProvider>
  );
}

export { resolveColorScheme, useResolvedColorScheme };
