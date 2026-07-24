import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, FontFamily } from '@/constants/theme';
import { createSessionFromUrl } from '@/lib/auth-callback';
import { destinationForProfile } from '@/lib/auth-routing';
import { useAuthStore } from '@/stores/authStore';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const setSession = useAuthStore((s) => s.setSession);
  const [message, setMessage] = useState('Confirming your email…');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const handledUrl = useRef<string | null>(null);

  const handleUrl = useCallback(
    async (url: string) => {
      if (!url || handledUrl.current === url) return;
      handledUrl.current = url;

      setIsLoading(true);
      setIsError(false);
      setMessage('Confirming your email…');

      try {
        const { session, type, errorMessage } = await createSessionFromUrl(url);

        if (!session) {
          setIsError(true);
          setMessage(
            errorMessage ||
              'This confirmation link is invalid or has expired. Resend from the verify screen.',
          );
          return;
        }

        setSession(session);
        await fetchProfile(session.user.id);

        if (type === 'recovery') {
          router.replace('/(auth)/update-password' as never);
          return;
        }

        const { profile, isPlatformAdmin } = useAuthStore.getState();
        router.replace(destinationForProfile(profile, session.user, isPlatformAdmin));
      } catch (error) {
        setIsError(true);
        setMessage(error instanceof Error ? error.message : 'Email confirmation failed.');
      } finally {
        setIsLoading(false);
      }
    },
    [fetchProfile, router, setSession],
  );

  useEffect(() => {
    let active = true;

    void (async () => {
      const initial = await Linking.getInitialURL();
      if (!active) return;
      if (initial) {
        await handleUrl(initial);
        return;
      }
      // Cold start sometimes delivers the URL a tick later on Android.
      await new Promise((r) => setTimeout(r, 400));
      const retry = await Linking.getInitialURL();
      if (!active) return;
      if (retry) {
        await handleUrl(retry);
        return;
      }
      setIsLoading(false);
      setIsError(true);
      setMessage(
        'No confirmation link found. Open the email link on this phone (it should open Portl), or resend the email.',
      );
    })();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [handleUrl]);

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center px-6">
        {isLoading ? <ActivityIndicator size="large" color={Brand.primary} /> : null}
        <Text
          className={`mt-4 text-center text-base ${isError ? 'text-status-rejected' : 'text-ink-muted'}`}
          style={{ fontFamily: FontFamily.body }}
        >
          {message}
        </Text>
        {isError && !isLoading ? (
          <View className="mt-6 w-full gap-3">
            <Pressable
              onPress={() => router.replace('/(auth)/verify-email')}
              className="items-center rounded-xl bg-brand-700 px-6 py-3"
            >
              <Text className="font-semibold text-white" style={{ fontFamily: FontFamily.heading }}>
                Back to verify email
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace('/(auth)/login')}
              className="items-center rounded-xl border border-surface-border px-6 py-3"
            >
              <Text className="font-semibold text-ink" style={{ fontFamily: FontFamily.heading }}>
                Sign in instead
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
