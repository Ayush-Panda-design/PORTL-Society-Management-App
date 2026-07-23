import { Fingerprint } from 'lucide-react-native';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, FontFamily } from '@/constants/theme';
import {
  authenticateWithBiometrics,
  biometricLabel,
  isBiometricEnabled,
  isBiometricHardwareAvailable,
} from '@/lib/biometric';
import { useAuthStore } from '@/stores/authStore';

/**
 * Soft app lock: when biometrics are enabled and a session exists,
 * require Face ID / fingerprint before showing the signed-in shell.
 */
export function BiometricLock({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const [checking, setChecking] = useState(true);
  const [locked, setLocked] = useState(false);
  const [label, setLabel] = useState('Biometrics');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluate = useCallback(async () => {
    if (!session) {
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
  }, [session]);

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  useEffect(() => {
    let wasBackground = false;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        wasBackground = true;
        return;
      }
      if (state === 'active' && wasBackground) {
        wasBackground = false;
        void (async () => {
          const enabled = await isBiometricEnabled();
          if (enabled && session) setLocked(true);
        })();
      }
    });
    return () => sub.remove();
  }, [session]);

  const unlock = async () => {
    setBusy(true);
    setError(null);
    try {
      const ok = await authenticateWithBiometrics(`Unlock with ${label}`);
      if (ok) setLocked(false);
      else setError('Authentication cancelled or failed');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unlock failed');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (locked && !checking) {
      void unlock();
    }
    // Auto-prompt once when lock engages
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, checking]);

  if (checking) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator color={Brand.primary} />
      </View>
    );
  }

  if (!locked) return <>{children}</>;

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface px-8">
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
      {error ? <Text className="mb-4 text-sm text-red-500">{error}</Text> : null}
      <Pressable
        onPress={() => void unlock()}
        disabled={busy}
        className="items-center rounded-bubbly px-8 py-3.5"
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
    </SafeAreaView>
  );
}
