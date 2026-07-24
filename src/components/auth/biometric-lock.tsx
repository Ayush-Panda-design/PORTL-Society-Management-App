import { Fingerprint } from 'lucide-react-native';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSegments } from 'expo-router';

import { Brand, FontFamily } from '@/constants/theme';
import {
  authenticateWithBiometrics,
  biometricLabel,
  isBiometricEnabled,
  isBiometricHardwareAvailable,
} from '@/lib/biometric';
import { isEmailVerified, useAuthStore } from '@/stores/authStore';

/**
 * Soft app lock: when biometrics are enabled and a session exists,
 * require fingerprint / Face ID / face unlock before showing the signed-in shell.
 *
 * Important: children stay mounted under the overlay. Unmounting the navigator
 * (e.g. after Razorpay / leaving the app) remounts on the dashboard and loses
 * the booking screen.
 *
 * Skipped on auth/onboarding screens and while email is still unverified.
 */
export function BiometricLock({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const segments = useSegments();

  const [checking, setChecking] = useState(true);
  const [locked, setLocked] = useState(false);
  const [label, setLabel] = useState('Biometrics');
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticatingRef = useRef(false);
  const unlockedThisSessionRef = useRef(false);

  const root = segments[0];
  const inAuthOrOnboarding = root === '(auth)' || root === '(onboarding)';
  const emailOk = isEmailVerified(user);

  const evaluate = useCallback(async () => {
    if (!session || inAuthOrOnboarding || !emailOk) {
      setLocked(false);
      setChecking(false);
      return;
    }
    if (unlockedThisSessionRef.current) {
      setLocked(false);
      setChecking(false);
      return;
    }
    const [enabled, available] = await Promise.all([
      isBiometricEnabled(),
      isBiometricHardwareAvailable(),
    ]);
    if (!enabled || !available) {
      setLocked(false);
      setChecking(false);
      return;
    }
    setLabel(await biometricLabel());
    setLocked(true);
    setChecking(false);
  }, [session, inAuthOrOnboarding, emailOk]);

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  useEffect(() => {
    // Android fires `inactive` when the system biometric sheet opens.
    // Only re-lock after a real background — otherwise unlock loops forever.
    let wentToBackground = false;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        wentToBackground = true;
        unlockedThisSessionRef.current = false;
        return;
      }
      if (state === 'active' && wentToBackground) {
        wentToBackground = false;
        if (authenticatingRef.current) return;
        void (async () => {
          if (!session || inAuthOrOnboarding || !emailOk) return;
          const enabled = await isBiometricEnabled();
          if (enabled) setLocked(true);
        })();
      }
    });
    return () => sub.remove();
  }, [session, inAuthOrOnboarding, emailOk]);

  const unlock = useCallback(async () => {
    if (authenticatingRef.current) return;
    authenticatingRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const ok = await authenticateWithBiometrics(`Unlock with ${label}`);
      if (ok) {
        unlockedThisSessionRef.current = true;
        setLocked(false);
      } else {
        setError('Authentication cancelled or failed. Try again, or sign out.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unlock failed');
    } finally {
      authenticatingRef.current = false;
      setBusy(false);
    }
  }, [label]);

  useEffect(() => {
    if (locked && !checking) {
      void unlock();
    }
    // Auto-prompt once when lock engages
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, checking]);

  const onSignOut = async () => {
    setSigningOut(true);
    setError(null);
    try {
      unlockedThisSessionRef.current = false;
      setLocked(false);
      await signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign out');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View className="flex-1">
      <View
        className="flex-1"
        pointerEvents={locked || checking ? 'none' : 'auto'}
        // Keep the navigator alive under the lock so tab/route state survives
        // payment sheets and app backgrounding.
        accessibilityElementsHidden={locked || checking}
        importantForAccessibility={locked || checking ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>

      {checking ? (
        <View className="absolute inset-0 items-center justify-center bg-surface">
          <ActivityIndicator color={Brand.primary} />
        </View>
      ) : null}

      {locked ? (
        <SafeAreaView className="absolute inset-0 items-center justify-center bg-surface px-8">
          <View
            className="mb-6 h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: Brand.primary }}
          >
            <Fingerprint color="#fff" size={28} />
          </View>
          <Text className="mb-2 text-2xl text-ink" style={{ fontFamily: FontFamily.display }}>
            Portl is locked
          </Text>
          <Text className="mb-6 text-center text-sm text-ink-muted">
            Use {label} to continue to your society dashboard.
          </Text>
          {error ? <Text className="mb-4 text-center text-sm text-red-500">{error}</Text> : null}
          <Pressable
            onPress={() => void unlock()}
            disabled={busy || signingOut}
            className="mb-3 min-w-[220px] items-center rounded-bubbly px-8 py-3.5"
            style={{ backgroundColor: Brand.primary, opacity: busy ? 0.7 : 1 }}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base text-white" style={{ fontFamily: FontFamily.heading }}>
                Unlock with {label}
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => void onSignOut()}
            disabled={busy || signingOut}
            className="py-3"
          >
            {signingOut ? (
              <ActivityIndicator color={Brand.primary} />
            ) : (
              <Text className="text-sm font-semibold text-brand-800">Can’t unlock? Sign out</Text>
            )}
          </Pressable>
        </SafeAreaView>
      ) : null}
    </View>
  );
}
