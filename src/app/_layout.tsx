import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { requireOptionalNativeModule } from 'expo';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { type ReactNode, useEffect } from 'react';
import { ActivityIndicator, NativeModules, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';

import { AppErrorBoundary } from '@/components/error-boundary';
import { BiometricLock } from '@/components/auth/biometric-lock';
import { HardwareBackHandler } from '@/components/navigation/hardware-back-handler';
import { AppThemeProvider } from '@/components/theme/app-theme-provider';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { Brand } from '@/constants/theme';
import { useNotificationRouting } from '@/hooks/use-notification-routing';
import { usePortlFonts } from '@/hooks/use-portl-fonts';
import { destinationForProfile } from '@/lib/auth-routing';
import { initObservability } from '@/lib/observability';
import { configurePushPresentation } from '@/lib/push-notifications';
import { queryClient } from '@/lib/query-client';
import {
  isEmailVerified,
  isMembershipActive,
  isMembershipPending,
  needsProfileCompletion,
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
  const { session, user, profile, isLoading, isInitialized, initialize } = useAuthStore();
  useNotificationRouting();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    void configurePushPresentation();
  }, []);

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    const root = segments[0];
    const inAuthGroup = root === '(auth)';
    const inOnboardingGroup = root === '(onboarding)';
    const parts = segments as readonly string[];
    const authScreen = parts[1];
    const onboardingScreen = parts[1];
    const isRoot = !root;

    if (!session) {
      const allowedAuthScreens = ['welcome', 'login', 'signup', 'callback', 'verify-email'];

      if (!inAuthGroup) {
        router.replace('/(auth)/welcome' as Href);
      } else if (!authScreen || authScreen === 'index') {
        router.replace('/(auth)/welcome' as Href);
      } else if (!allowedAuthScreens.includes(authScreen)) {
        router.replace('/(auth)/welcome' as Href);
      }
      return;
    }

    // Signed in but email not confirmed yet
    if (!isEmailVerified(user)) {
      if (!inAuthGroup || authScreen !== 'verify-email') {
        router.replace('/(auth)/verify-email' as Href);
      }
      return;
    }

    // Name + photo required before society / dashboard
    if (needsProfileCompletion(profile)) {
      if (!inOnboardingGroup || onboardingScreen !== 'complete-profile') {
        router.replace('/(onboarding)/complete-profile' as Href);
      }
      return;
    }

    const dest = destinationForProfile(profile, user);

    if (needsSocietyOnboarding(profile)) {
      const allowed = ['index', 'create', 'join', 'discover'];
      if (!inOnboardingGroup) {
        router.replace('/(onboarding)' as Href);
      } else if (onboardingScreen && !allowed.includes(onboardingScreen)) {
        if (onboardingScreen === 'pending' || onboardingScreen === 'complete-profile') {
          router.replace('/(onboarding)' as Href);
        }
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
  }, [session, user, profile, isLoading, isInitialized, segments, router]);

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
    initObservability();
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
    <AppErrorBoundary>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider preload={false}>
            <AppThemeProvider>
              <AuthGate>
                <BiometricLock>
                  <View className="flex-1">
                    <HardwareBackHandler />
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
                </BiometricLock>
              </AuthGate>
            </AppThemeProvider>
          </KeyboardProvider>
        </QueryClientProvider>
        <Toast />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
