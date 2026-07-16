import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, FontFamily } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(errorCode);
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (!accessToken || !refreshToken) {
    return null;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw error;
  }

  return data.session;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const [message, setMessage] = useState('Confirming your email…');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleUrl = useCallback(
    async (url: string) => {
      setIsLoading(true);
      setIsError(false);
      setMessage('Confirming your email…');

      try {
        const session = await createSessionFromUrl(url);

        if (!session) {
          setIsError(true);
          setMessage('This confirmation link is invalid or has expired.');
          return;
        }

        await fetchProfile(session.user.id);
        router.replace('/');
      } catch (error) {
        setIsError(true);
        setMessage(error instanceof Error ? error.message : 'Email confirmation failed.');
      } finally {
        setIsLoading(false);
      }
    },
    [fetchProfile, router],
  );

  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      if (url) {
        void handleUrl(url);
      } else {
        setIsLoading(false);
        setIsError(true);
        setMessage('No confirmation link found. Open the link from your email again.');
      }
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => subscription.remove();
  }, [handleUrl]);

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center px-6">
        {isLoading ? (
          <ActivityIndicator size="large" color={Brand.primary} />
        ) : null}
        <Text
          className={`mt-4 text-center text-base ${isError ? 'text-status-rejected' : 'text-ink-muted'}`}
          style={{ fontFamily: FontFamily.body }}
        >
          {message}
        </Text>
        {isError && !isLoading ? (
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            className="mt-6 rounded-xl bg-brand-700 px-6 py-3"
          >
            <Text className="font-semibold text-white" style={{ fontFamily: FontFamily.heading }}>
              Back to login
            </Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
