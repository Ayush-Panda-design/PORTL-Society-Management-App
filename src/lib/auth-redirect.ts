import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';

/**
 * Redirect URL Supabase uses after email confirmation / magic links.
 * Must also be added in Supabase → Authentication → URL Configuration → Redirect URLs.
 *
 * Expo Router drops `(auth)` groups from the URL, so the path is `/callback`
 * (file: `src/app/(auth)/callback.tsx`), not `/(auth)/callback`.
 *
 * Optional: set EXPO_PUBLIC_AUTH_REDIRECT_URL in .env to a fixed Expo Go URL, e.g.
 * exp://192.168.1.5:8081/--/callback
 */
export function getAuthRedirectUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim();
  if (fromEnv) return fromEnv;

  const redirectUri = makeRedirectUri({
    scheme: 'portl',
    path: 'callback',
  });

  // Expo Go uses exp://…; dev builds use portl://…
  return redirectUri || Linking.createURL('/callback');
}
