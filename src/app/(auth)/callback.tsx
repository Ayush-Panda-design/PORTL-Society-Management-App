import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  useEffect(() => {
    const handleUrl = async (url: string) => {
      try {
        const session = await createSessionFromUrl(url);

        if (!session) {
          setMessage('This confirmation link is invalid or has expired.');
          return;
        }

        await fetchProfile(session.user.id);
        router.replace('/');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Email confirmation failed.');
      }
    };

    void Linking.getInitialURL().then((url) => {
      if (url) {
        void handleUrl(url);
      }
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => subscription.remove();
  }, [fetchProfile, router]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <ActivityIndicator size="large" color="#0F766E" />
        <Text className="mt-4 text-center text-base text-slate-600">{message}</Text>
      </View>
    </SafeAreaView>
  );
}
