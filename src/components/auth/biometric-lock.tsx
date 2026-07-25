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

const AUTH_TIMEOUT_MS = 25_000;

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
  const autoPromptedRef = useRef(false);
  const unlockGenerationRef = useRef(0);

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
        autoPromptedRef.current = false;
        return;
      }
      if (state === 'active' && wentToBackground) {
        wentToBackground = false;
        // If a prompt was left hanging after background, clear the spinner.
        unlockGenerationRef.current += 1;
        authenticatingRef.current = false;
        setBusy(false);
        void (async () => {
          if (!session || inAuthOrOnboarding || !emailOk) return;
          const enabled = await isBiometricEnabled();
          if (enabled) {
            unlockedThisSessionRef.current = false;
            setLocked(true);
          }
        })();
      }
    });
    return () => sub.remove();
  }, [session, inAuthOrOnboarding, emailOk]);

  const unlock = useCallback(async () => {
    if (authenticatingRef.current) return;
    authenticatingRef.current = true;
    const generation = ++unlockGenerationRef.current;
    setBusy(true);
    setError(null);
    try {
      const ok = await Promise.race([
        authenticateWithBiometrics(`Unlock with ${label}`),
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), AUTH_TIMEOUT_MS);
        }),
      ]);
      if (generation !== unlockGenerationRef.current) return;
      if (ok) {
        unlockedThisSessionRef.current = true;
        setLocked(false);
        setError(null);
      } else {
        setError('Authentication timed out or failed. Tap Unlock to try again, or sign out.');
      }
    } catch (e) {
      if (generation !== unlockGenerationRef.current) return;
      setError(e instanceof Error ? e.message : 'Unlock failed');
    } finally {
      if (generation === unlockGenerationRef.current) {
        authenticatingRef.current = false;
        setBusy(false);
      }
    }
  }, [label]);

  useEffect(() => {
    if (locked && !checking && !autoPromptedRef.current) {
      autoPromptedRef.current = true;
      void unlock();
    }
  }, [locked, checking, unlock]);

  const onSignOut = async () => {
    // Always allow escape even if biometric prompt is stuck.
    unlockGenerationRef.current += 1;
    authenticatingRef.current = false;
    setBusy(false);
    setSigningOut(true);
    setError(null);
    try {
      unlockedThisSessionRef.current = false;
      autoPromptedRef.current = false;
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
            onPress={() => {
              // Force a fresh attempt if a previous prompt hung.
              authenticatingRef.current = false;
              void unlock();
            }}
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
            disabled={signingOut}
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
