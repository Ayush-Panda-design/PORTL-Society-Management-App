import '@/global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { requireOptionalNativeModule } from 'expo';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect } from 'react';
import { ActivityIndicator, NativeModules, useColorScheme, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { OfflineBanner } from '@/components/ui/offline-banner';
import { Brand } from '@/constants/theme';
import { usePortlFonts } from '@/hooks/use-portl-fonts';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types/database';

void SplashScreen.preventAutoHideAsync();

/** Hide Expo's floating Tools (gear) FAB. Persists via native UserDefaults/SharedPreferences. */
async function hideExpoToolsFab() {
  const modules = [
    requireOptionalNativeModule('DevMenuPreferences'),
    NativeModules.DevMenuPreferences,
    NativeModules.ExpoDevMenuPreferences,
    NativeModules.EXDevMenuPreferences,
  ].filter(Boolean);

  for (const mod of modules) {
    try {
      if (typeof mod.setPreferencesAsync === 'function') {
        await mod.setPreferencesAsync({ showFloatingActionButton: false });
        return true;
      }
      if (typeof mod.setSettingsAsync === 'function') {
        await mod.setSettingsAsync({ showFloatingActionButton: false });
        return true;
      }
    } catch {
      // try next candidate
    }
  }
  return false;
}

function roleHome(role: UserRole | null): '/(resident)' | '/(guard)' | '/(admin)' | '/(auth)/login' {
  switch (role) {
    case 'resident':
      return '/(resident)';
    case 'guard':
      return '/(guard)';
    case 'admin':
      return '/(admin)';
    default:
      return '/(auth)/login';
  }
}

function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { session, role, isLoading, isInitialized, initialize } = useAuthStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      const authScreen = segments[1];
      const allowedAuthScreens = ['login', 'signup', 'callback'];

      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (authScreen && !allowedAuthScreens.includes(authScreen)) {
        router.replace('/(auth)/login');
      }
      return;
    }

    const home = roleHome(role);

    const isRoot = !segments[0];

    if (inAuthGroup || isRoot) {
      router.replace(home);
      return;
    }

    const currentGroup = segments[0];
    const expectedGroup =
      role === 'resident' ? '(resident)' : role === 'guard' ? '(guard)' : role === 'admin' ? '(admin)' : null;

    if (expectedGroup && currentGroup !== expectedGroup) {
      router.replace(home);
    }
  }, [session, role, isLoading, isInitialized, segments, router]);

  if (!isInitialized || isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { fontsLoaded } = usePortlFonts();

  useEffect(() => {
    void hideExpoToolsFab();
    // Retry once — native module can register after first paint in Expo Go.
    const t = setTimeout(() => {
      void hideExpoToolsFab();
    }, 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <KeyboardProvider preload={false}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthGate>
            <View className="flex-1">
              <OfflineBanner />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(resident)" />
                <Stack.Screen name="(guard)" />
                <Stack.Screen name="(admin)" />
              </Stack>
            </View>
          </AuthGate>
          <StatusBar style="auto" />
        </ThemeProvider>
      </KeyboardProvider>
    </QueryClientProvider>
  );
}
