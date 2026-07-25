import type { EmailOtpType } from '@supabase/supabase-js';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Brand, FontFamily, Gradients } from '@/constants/theme';
import { createSessionFromUrl, isAuthSessionMissingError } from '@/lib/auth-callback';
import { authErrorMessage } from '@/lib/auth-errors';
import { destinationForProfile } from '@/lib/auth-routing';
import { getAuthRedirectUrl } from '@/lib/auth-redirect';
import { supabase } from '@/lib/supabase';
import { isEmailVerified, useAuthStore } from '@/stores/authStore';

async function verifyEmailCode(email: string, token: string) {
  const types: EmailOtpType[] = ['signup', 'email', 'magiclink'];
  let lastError: { message?: string; code?: string; status?: number } | null = null;

  for (const type of types) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    });
    if (!error && data.session) {
      return data.session;
    }
    lastError = error;
  }

  throw lastError ?? new Error('Invalid or expired code');
}

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

  const [code, setCode] = useState('');
  const [resending, setResending] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);

  const goHomeWithSession = useCallback(
    async (nextSession: NonNullable<typeof session>) => {
      setSession(nextSession);
      const nextProfile = await fetchProfile(nextSession.user.id);
      router.replace(
        destinationForProfile(
          nextProfile,
          nextSession.user,
          useAuthStore.getState().isPlatformAdmin,
        ),
      );
    },
    [fetchProfile, router, setSession],
  );

  const continueIfVerified = useCallback(
    async (opts?: { fromAppState?: boolean }) => {
      const fromAppState = opts?.fromAppState === true;

      if (!fromAppState) {
        setChecking(true);
        setMessage(null);
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        let activeSession = sessionData.session;

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
          if (fromAppState) return;
          setMessage(
            'Email not confirmed yet. Enter the 6-digit code from your email below, or request a new code.',
          );
          return;
        }

        const { data, error } = await supabase.auth.getUser();
        if (error) {
          if (isAuthSessionMissingError(error)) {
            if (!fromAppState) {
              setMessage('Enter the 6-digit code from your email to finish verifying.');
            }
            return;
          }
          throw error;
        }

        const nextUser = data.user;
        if (!nextUser || !isEmailVerified(nextUser)) {
          if (!fromAppState) {
            setMessage(
              'Still waiting for confirmation. Use the 6-digit code from your email — it’s more reliable than the link on some phones.',
            );
          }
          return;
        }

        await goHomeWithSession(activeSession);
      } catch (e) {
        if (fromAppState) return;
        if (isAuthSessionMissingError(e)) {
          setMessage('Enter the 6-digit code from your email to finish verifying.');
          return;
        }
        setMessage(e instanceof Error ? e.message : 'Couldn’t check your email yet. Try again.');
      } finally {
        if (!fromAppState) setChecking(false);
      }
    },
    [goHomeWithSession, setSession],
  );

  useEffect(() => {
    if (user && isEmailVerified(user) && profile) {
      router.replace(
        destinationForProfile(profile, user, useAuthStore.getState().isPlatformAdmin),
      );
    }
  }, [user, profile, router]);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (
        !url.includes('callback') &&
        !url.includes('access_token') &&
        !url.includes('token_hash') &&
        !url.includes('code=')
      ) {
        return;
      }
      void (async () => {
        const { session: next, errorMessage } = await createSessionFromUrl(url);
        if (!next) {
          if (errorMessage) {
            setMessage(
              'That email link didn’t open correctly. Enter the 6-digit code from your email instead.',
            );
          }
          return;
        }
        await goHomeWithSession(next);
      })();
    });
    return () => sub.remove();
  }, [goHomeWithSession]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void continueIfVerified({ fromAppState: true });
      }
    });
    return () => sub.remove();
  }, [continueIfVerified]);

  const onSendCode = async () => {
    if (!email.trim()) {
      setMessage('We don’t have your email. Go back and create your account again.');
      return;
    }
    setResending(true);
    setMessage(null);
    try {
      const redirectTo = getAuthRedirectUrl();
      // OTP email is the reliable path on Android APKs (deep links often fail in Gmail).
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
          emailRedirectTo: redirectTo,
        },
      });
      if (otpError) {
        // Fall back to classic signup confirmation email if OTP is blocked.
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: email.trim(),
          options: { emailRedirectTo: redirectTo },
        });
        if (resendError) throw otpError;
      }
      setCodeSent(true);
      Toast.show({
        type: 'success',
        text1: 'Code sent',
        text2: 'Check your inbox for a 6-digit code (or confirmation link).',
      });
    } catch (e) {
      const authLike =
        e && typeof e === 'object' && 'message' in e
          ? (e as { message?: string; code?: string; status?: number })
          : null;
      setMessage(
        authErrorMessage(authLike) || (e instanceof Error ? e.message : 'Couldn’t send code'),
      );
    } finally {
      setResending(false);
    }
  };

  const onVerifyCode = async () => {
    const token = code.replace(/\s/g, '');
    if (!email.trim()) {
      setMessage('We don’t have your email. Go back and create your account again.');
      return;
    }
    if (token.length < 6) {
      setMessage('Enter the 6-digit code from your email.');
      return;
    }

    setVerifyingCode(true);
    setMessage(null);
    try {
      const next = await verifyEmailCode(email.trim(), token);
      Toast.show({ type: 'success', text1: 'Email verified' });
      await goHomeWithSession(next);
    } catch (e) {
      const authLike =
        e && typeof e === 'object' && 'message' in e
          ? (e as { message?: string; code?: string; status?: number })
          : null;
      setMessage(
        authErrorMessage(authLike) ||
          (e instanceof Error ? e.message : 'That code didn’t work. Request a new one.'),
      );
    } finally {
      setVerifyingCode(false);
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
            <Text className="text-sm text-white/85">One quick step before you join your society</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="-mt-4 flex-1 rounded-t-[36px] bg-surface px-6 pb-10 pt-8">
          <Text className="mb-2 text-2xl text-ink" style={{ fontFamily: FontFamily.display }}>
            Verify your email
          </Text>
          <Text className="mb-2 text-sm leading-5 text-ink-muted">
            We need to confirm
            {email ? (
              <>
                {' '}
                <Text className="font-semibold text-ink">{email}</Text>
              </>
            ) : null}
            .
          </Text>
          <Text className="mb-5 text-sm leading-5 text-ink-muted">
            The easiest way: tap <Text className="font-semibold text-ink">Send code</Text>, then
            enter the 6-digit code from your email. You can also open the confirmation link on this
            phone.
          </Text>

          {message ? (
            <Text className="mb-4 text-sm text-status-rejected">{message}</Text>
          ) : null}

          <Text
            className="mb-1.5 text-xs uppercase tracking-widest text-ink-soft"
            style={{ fontFamily: FontFamily.heading }}
          >
            6-digit code
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={8}
            placeholder="123456"
            placeholderTextColor="#94A3B8"
            className="mb-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3.5 text-center text-xl tracking-[6px] text-ink"
            style={{ fontFamily: FontFamily.heading }}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />

          <Pressable
            className={`mb-3 items-center rounded-bubbly py-4 ${verifyingCode ? 'opacity-70' : ''}`}
            disabled={verifyingCode || resending}
            onPress={() => void onVerifyCode()}
            style={{
              backgroundColor: Brand.primary,
              shadowColor: Brand.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.28,
              shadowRadius: 14,
              elevation: 4,
            }}
          >
            {verifyingCode ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base text-white" style={{ fontFamily: FontFamily.heading }}>
                Verify code
              </Text>
            )}
          </Pressable>

          <Pressable
            className={`mb-3 items-center rounded-xl border border-brand-700 py-3.5 ${
              resending ? 'opacity-70' : ''
            }`}
            disabled={resending || verifyingCode}
            onPress={() => void onSendCode()}
          >
            {resending ? (
              <ActivityIndicator color={Brand.primary} />
            ) : (
              <Text className="text-base font-semibold text-brand-800">
                {codeSent ? 'Send code again' : 'Send code'}
              </Text>
            )}
          </Pressable>

          <Pressable
            className={`mb-6 items-center py-2 ${checking ? 'opacity-70' : ''}`}
            disabled={checking}
            onPress={() => void continueIfVerified()}
          >
            {checking ? (
              <ActivityIndicator color={Brand.primary} />
            ) : (
              <Text className="text-sm font-semibold text-brand-800">
                I opened the email link — continue
              </Text>
            )}
          </Pressable>

          <View className="mt-auto gap-3">
            <Link href="/(auth)/login" className="text-center text-sm font-semibold text-brand-800">
              Already verified? Sign in
            </Link>
            <Pressable
              onPress={() => void signOut().then(() => router.replace('/(auth)/signup'))}
              className="py-2"
            >
              <Text className="text-center text-sm text-ink-muted">Use a different email</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
