import { LinearGradient } from 'expo-linear-gradient';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Brand, FontFamily, Gradients } from '@/constants/theme';
import { authErrorMessage } from '@/lib/auth-errors';
import { destinationForProfile } from '@/lib/auth-routing';
import { getAuthRedirectUrl } from '@/lib/auth-redirect';
import { supabase } from '@/lib/supabase';
import { isEmailVerified, useAuthStore } from '@/stores/authStore';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const setSession = useAuthStore((s) => s.setSession);
  const signOut = useAuthStore((s) => s.signOut);

  const email =
    (typeof params.email === 'string' && params.email) ||
    user?.email ||
    session?.user?.email ||
    '';

  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const continueIfVerified = useCallback(async () => {
    setChecking(true);
    setMessage(null);
    try {
      // Refresh so email_confirmed_at updates after the user opens the link
      await supabase.auth.refreshSession();
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      const nextUser = data.user;
      if (!nextUser || !isEmailVerified(nextUser)) {
        setMessage(
          'Email not confirmed yet. Open the link we sent (or use Open in browser), then tap “I’ve confirmed”.',
        );
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        setSession(sessionData.session);
        const nextProfile = await fetchProfile(nextUser.id);
        router.replace(destinationForProfile(nextProfile, nextUser));
        return;
      }

      // Confirmed but no session (signed up while confirm-email was on)
      router.replace('/(auth)/login');
      Toast.show({
        type: 'success',
        text1: 'Email confirmed',
        text2: 'Sign in to continue.',
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not check confirmation status');
    } finally {
      setChecking(false);
    }
  }, [fetchProfile, router, setSession]);

  useEffect(() => {
    if (user && isEmailVerified(user) && profile) {
      router.replace(destinationForProfile(profile, user));
    }
  }, [user, profile, router]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void continueIfVerified();
      }
    });
    return () => sub.remove();
  }, [continueIfVerified]);

  const onResend = async () => {
    if (!email.trim()) {
      setMessage('Missing email address. Go back and sign up again.');
      return;
    }
    setResending(true);
    setMessage(null);
    try {
      const redirectTo = getAuthRedirectUrl();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      Toast.show({
        type: 'success',
        text1: 'Confirmation email sent',
        text2: 'Check inbox and spam. If the link does nothing, open it in Chrome/Safari, then return here.',
      });
    } catch (e) {
      const authLike =
        e && typeof e === 'object' && 'message' in e
          ? (e as { message?: string; code?: string; status?: number })
          : null;
      setMessage(authErrorMessage(authLike) || (e instanceof Error ? e.message : 'Could not resend email'));
    } finally {
      setResending(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <LinearGradient
        colors={[...Gradients.auth]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 12, paddingBottom: 28 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="px-6 pt-2">
            <Text
              className="mb-1 text-4xl text-white"
              style={{ fontFamily: FontFamily.display }}
            >
              Portl
            </Text>
            <Text className="text-sm text-white/85">
              Confirm your email before joining a society
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View className="-mt-4 flex-1 rounded-t-[36px] bg-surface px-6 pb-10 pt-8">
        <Text className="mb-2 text-2xl text-ink" style={{ fontFamily: FontFamily.display }}>
          Verify your email
        </Text>
        <Text className="mb-6 text-sm leading-5 text-ink-muted">
          We sent a confirmation link
          {email ? (
            <>
              {' '}
              to <Text className="font-semibold text-ink">{email}</Text>
            </>
          ) : null}
          . Building access accounts need a real inbox — open the link, then continue.
        </Text>

        {message ? (
          <Text className="mb-4 text-sm text-status-rejected">{message}</Text>
        ) : null}

        <Pressable
          className={`mb-3 items-center rounded-bubbly py-4 ${checking ? 'opacity-70' : ''}`}
          disabled={checking}
          onPress={() => void continueIfVerified()}
          style={{
            backgroundColor: Brand.primary,
            shadowColor: Brand.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.28,
            shadowRadius: 14,
            elevation: 4,
          }}
        >
          {checking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base text-white" style={{ fontFamily: FontFamily.heading }}>
              I’ve confirmed — continue
            </Text>
          )}
        </Pressable>

        <Pressable
          className={`mb-6 items-center rounded-xl border border-brand-700 py-3.5 ${
            resending ? 'opacity-70' : ''
          }`}
          disabled={resending}
          onPress={() => void onResend()}
        >
          {resending ? (
            <ActivityIndicator color={Brand.primary} />
          ) : (
            <Text className="text-base font-semibold text-brand-800">Resend confirmation email</Text>
          )}
        </Pressable>

        <View className="mt-auto gap-3">
          <Link href="/(auth)/login" className="text-center text-sm font-semibold text-brand-800">
            Already confirmed? Sign in
          </Link>
          <Pressable
            onPress={() => void signOut().then(() => router.replace('/(auth)/signup'))}
            className="py-2"
          >
            <Text className="text-center text-sm text-ink-muted">Use a different email</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
