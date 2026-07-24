import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
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
import { createSessionFromUrl, isAuthSessionMissingError } from '@/lib/auth-callback';
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
  const redirectHint = getAuthRedirectUrl();

  const continueIfVerified = useCallback(
    async (opts?: { fromAppState?: boolean; forceNavigateToLogin?: boolean }) => {
      const fromAppState = opts?.fromAppState === true;
      const forceNavigateToLogin = opts?.forceNavigateToLogin === true;

      if (!fromAppState) {
        setChecking(true);
        setMessage(null);
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        let activeSession = sessionData.session;

        // Only refresh when we already have a local session (avoids "Auth session missing").
        if (activeSession) {
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError && !isAuthSessionMissingError(refreshError)) {
            throw refreshError;
          }
          if (refreshed.session) {
            activeSession = refreshed.session;
            setSession(refreshed.session);
          }
        }

        if (!activeSession) {
          // Returning from the email app often fires AppState before the deep link
          // finishes — never bounce to login from that path.
          if (fromAppState) return;

          setMessage(
            'No signed-in session on this device. Open the confirmation link so Portl launches, or sign in after confirming in the browser.',
          );
          if (forceNavigateToLogin) {
            Toast.show({
              type: 'info',
              text1: 'Sign in to continue',
              text2: 'Confirmation may have completed in the browser.',
            });
            router.replace({
              pathname: '/(auth)/login',
              params: email ? { email } : undefined,
            });
          }
          return;
        }

        const { data, error } = await supabase.auth.getUser();
        if (error) {
          if (isAuthSessionMissingError(error)) {
            if (!fromAppState) {
              setMessage(
                'Session expired on this device. Open the email link in Portl, or sign in after confirming.',
              );
            }
            return;
          }
          throw error;
        }

        const nextUser = data.user;
        if (!nextUser || !isEmailVerified(nextUser)) {
          if (!fromAppState) {
            setMessage(
              'Email not confirmed yet. Open the link in the Portl app (not only in the browser), then tap continue.',
            );
          }
          return;
        }

        setSession(activeSession);
        const nextProfile = await fetchProfile(nextUser.id);
        router.replace(
          destinationForProfile(nextProfile, nextUser, useAuthStore.getState().isPlatformAdmin),
        );
      } catch (e) {
        if (fromAppState) return;
        if (isAuthSessionMissingError(e)) {
          setMessage(
            'Session expired on this device. Sign in after confirming your email — or open the email link so it launches Portl.',
          );
          return;
        }
        setMessage(e instanceof Error ? e.message : 'Could not check confirmation status');
      } finally {
        if (!fromAppState) setChecking(false);
      }
    },
    [email, fetchProfile, router, setSession],
  );

  useEffect(() => {
    if (user && isEmailVerified(user) && profile) {
      router.replace(
        destinationForProfile(profile, user, useAuthStore.getState().isPlatformAdmin),
      );
    }
  }, [user, profile, router]);

  // If the confirmation deep link opens while this screen is mounted, establish the session.
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (!url.includes('callback') && !url.includes('access_token') && !url.includes('token_hash')) {
        return;
      }
      void (async () => {
        const { session: next, errorMessage } = await createSessionFromUrl(url);
        if (!next) {
          if (errorMessage) setMessage(errorMessage);
          return;
        }
        setSession(next);
        await fetchProfile(next.user.id);
        const { profile: p, isPlatformAdmin } = useAuthStore.getState();
        router.replace(destinationForProfile(p, next.user, isPlatformAdmin));
      })();
    });
    return () => sub.remove();
  }, [fetchProfile, router, setSession]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // Quiet check only — do not redirect away while waiting for the deep link.
        void continueIfVerified({ fromAppState: true });
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
      if (error) {
        // Some projects throw session-missing on resend; fall back to magic link OTP.
        if (isAuthSessionMissingError(error)) {
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: {
              shouldCreateUser: false,
              emailRedirectTo: redirectTo,
            },
          });
          if (otpError) throw otpError;
        } else {
          throw error;
        }
      }
      Toast.show({
        type: 'success',
        text1: 'Confirmation email sent',
        text2: `Open the link on this phone so Portl opens (${redirectTo}).`,
      });
    } catch (e) {
      const authLike =
        e && typeof e === 'object' && 'message' in e
          ? (e as { message?: string; code?: string; status?: number })
          : null;
      if (isAuthSessionMissingError(e)) {
        setMessage(
          'Could not resend while signed out. Go to Sign in and use “Forgot password” or OTP, or sign up again.',
        );
      } else {
        setMessage(
          authErrorMessage(authLike) || (e instanceof Error ? e.message : 'Could not resend email'),
        );
      }
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
        <Text className="mb-4 text-sm leading-5 text-ink-muted">
          We sent a confirmation link
          {email ? (
            <>
              {' '}
              to <Text className="font-semibold text-ink">{email}</Text>
            </>
          ) : null}
          . Open it on this phone so Portl launches — confirming only in the browser leaves this
          screen without a session.
        </Text>

        <Text className="mb-6 text-xs leading-4 text-ink-faint">
          Redirect used for links: {redirectHint}
          {'\n'}
          Add this exact URL under Supabase → Authentication → URL Configuration → Redirect URLs.
        </Text>

        {message ? (
          <Text className="mb-4 text-sm text-status-rejected">{message}</Text>
        ) : null}

        <Pressable
          className={`mb-3 items-center rounded-bubbly py-4 ${checking ? 'opacity-70' : ''}`}
          disabled={checking}
          onPress={() => void continueIfVerified({ forceNavigateToLogin: true })}
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
