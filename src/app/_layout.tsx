import 'react-native-gesture-handler';
import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { requireOptionalNativeModule } from 'expo';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { type ReactNode, useEffect } from 'react';
import { ActivityIndicator, NativeModules, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';

import { AppThemeProvider } from '@/components/theme/app-theme-provider';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { Brand } from '@/constants/theme';
import { usePortlFonts } from '@/hooks/use-portl-fonts';
import { destinationForProfile } from '@/lib/auth-routing';
import { queryClient } from '@/lib/query-client';
import {
  isMembershipActive,
  isMembershipPending,
  needsSocietyOnboarding,
  useAuthStore,
} from '@/stores/authStore';

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

function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { session, profile, isLoading, isInitialized, initialize } = useAuthStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    const root = segments[0];
    const inAuthGroup = root === '(auth)';
    const inOnboardingGroup = root === '(onboarding)';

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

    const dest = destinationForProfile(profile);
    const onboardingScreen = segments[1];
    const isRoot = !root;

    if (needsSocietyOnboarding(profile)) {
      const allowed = ['index', 'create', 'join'];
      if (!inOnboardingGroup) {
        router.replace('/(onboarding)' as Href);
      } else if (onboardingScreen && !allowed.includes(onboardingScreen)) {
        if (onboardingScreen === 'pending') router.replace('/(onboarding)' as Href);
      }
      return;
    }

    if (isMembershipPending(profile)) {
      if (!inOnboardingGroup || onboardingScreen !== 'pending') {
        router.replace('/(onboarding)/pending' as Href);
      }
      return;
    }

    if (isMembershipActive(profile)) {
      if (inAuthGroup || inOnboardingGroup || isRoot) {
        router.replace(dest);
        return;
      }

      const expectedGroup =
        profile?.role === 'resident'
          ? '(resident)'
          : profile?.role === 'guard'
            ? '(guard)'
            : profile?.role === 'admin'
              ? '(admin)'
              : null;

      if (expectedGroup && root !== expectedGroup) {
        router.replace(dest);
      }
    }
  }, [session, profile, isLoading, isInitialized, segments, router]);

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider preload={false}>
            <AppThemeProvider>
              <AuthGate>
                <View className="flex-1">
                  <OfflineBanner />
                  <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(onboarding)" />
                    <Stack.Screen name="(resident)" />
                    <Stack.Screen name="(guard)" />
                    <Stack.Screen name="(admin)" />
                  </Stack>
                </View>
              </AuthGate>
            </AppThemeProvider>
          </KeyboardProvider>
        </QueryClientProvider>
        <Toast />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
