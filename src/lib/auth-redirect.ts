import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';

/**
 * Redirect URL Supabase uses after email confirmation / magic links.
 * Must also be added in Supabase → Authentication → URL Configuration → Redirect URLs.
 *
 * Optional: set EXPO_PUBLIC_AUTH_REDIRECT_URL in .env to a fixed Expo Go URL, e.g.
 * exp://192.168.1.5:8081/--/(auth)/callback
 */
export function getAuthRedirectUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim();
  if (fromEnv) return fromEnv;

  const redirectUri = makeRedirectUri({
    scheme: 'portl',
    path: '(auth)/callback',
  });

  // Expo Go uses exp://…; dev builds use portl://…
  return redirectUri || Linking.createURL('/(auth)/callback');
}
