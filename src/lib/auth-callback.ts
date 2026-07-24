import type { EmailOtpType, Session } from '@supabase/supabase-js';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

function isEmailOtpType(value: string | undefined): value is EmailOtpType {
  return (
    value === 'signup' ||
    value === 'invite' ||
    value === 'magiclink' ||
    value === 'recovery' ||
    value === 'email_change' ||
    value === 'email'
  );
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

/** Merge query + hash params (Supabase often puts tokens in the #fragment). */
export function authParamsFromUrl(url: string): Record<string, string> {
  const out: Record<string, string> = {};

  try {
    const { params, errorCode } = QueryParams.getQueryParams(url);
    if (errorCode) {
      out.error = String(errorCode);
      out.error_code = String(errorCode);
    }
    for (const [key, value] of Object.entries(params ?? {})) {
      const s = firstString(value);
      if (s) out[key] = s;
    }
  } catch {
    // fall through
  }

  try {
    const parsed = Linking.parse(url);
    for (const [key, value] of Object.entries(parsed.queryParams ?? {})) {
      const s = firstString(value);
      if (s && out[key] == null) out[key] = s;
    }
  } catch {
    // fall through
  }

  const hashIndex = url.indexOf('#');
  if (hashIndex >= 0) {
    const hash = url.slice(hashIndex + 1);
    const hashQuery = hash.includes('=') ? hash : '';
    if (hashQuery) {
      for (const part of hashQuery.split('&')) {
        const [rawKey, ...rest] = part.split('=');
        if (!rawKey) continue;
        const key = decodeURIComponent(rawKey);
        const value = decodeURIComponent(rest.join('=') || '');
        if (key && value) out[key] = value;
      }
    }
  }

  // Some clients nest params after ? inside the path
  const qIndex = url.indexOf('?');
  if (qIndex >= 0) {
    const query = url.slice(qIndex + 1).split('#')[0] ?? '';
    for (const part of query.split('&')) {
      const [rawKey, ...rest] = part.split('=');
      if (!rawKey) continue;
      const key = decodeURIComponent(rawKey);
      const value = decodeURIComponent(rest.join('=') || '');
      if (key && value && out[key] == null) out[key] = value;
    }
  }

  return out;
}

/**
 * Establish a Supabase session from an email confirmation / magic-link / recovery URL.
 */
export async function createSessionFromUrl(url: string): Promise<{
  session: Session | null;
  type?: string;
  errorMessage?: string;
}> {
  const params = authParamsFromUrl(url);

  if (params.error || params.error_code || params.error_description) {
    return {
      session: null,
      errorMessage:
        params.error_description ||
        params.error ||
        params.error_code ||
        'Confirmation link failed',
    };
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) return { session: null, errorMessage: error.message, type: params.type };
    return { session: data.session, type: params.type };
  }

  const code = params.code;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { session: null, errorMessage: error.message, type: params.type };
    return { session: data.session, type: params.type };
  }

  const tokenHash = params.token_hash;
  const type = params.type;
  if (tokenHash && isEmailOtpType(type)) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) return { session: null, errorMessage: error.message, type };
    return { session: data.session, type };
  }

  // Older templates: ?token=...&type=signup (needs email when possible)
  const token = params.token;
  if (token && isEmailOtpType(type)) {
    const email = params.email;
    const { data, error } = await supabase.auth.verifyOtp(
      email
        ? { token, type, email }
        : { token_hash: token, type },
    );
    if (error) return { session: null, errorMessage: error.message, type };
    return { session: data.session, type };
  }

  return {
    session: null,
    errorMessage:
      'No auth tokens in this link. Add portl://callback to Supabase Redirect URLs and resend the email.',
  };
}

export function isAuthSessionMissingError(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: string }).message ?? '')
      : error instanceof Error
        ? error.message
        : String(error ?? '');
  return /auth session missing/i.test(message);
}
