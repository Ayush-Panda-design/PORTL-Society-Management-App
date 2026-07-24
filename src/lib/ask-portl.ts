import { supabase } from '@/lib/supabase';

export type AskPortlMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/** Map backend / SDK text to short copy residents and staff can understand. */
export function toUserFriendlyAskPortlMessage(raw: string): string {
  const text = raw.trim();
  if (!text) return 'Ask Portl could not answer right now. Please try again.';

  const lower = text.toLowerCase();

  if (
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('resource_exhausted') ||
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    return 'Ask Portl is busy right now. Please try again in a moment.';
  }

  if (
    lower.includes('gemini') ||
    lower.includes('api_key') ||
    lower.includes('aiza') ||
    lower.includes('not configured') ||
    lower.includes('gemini_api_key') ||
    lower.includes('missing supabase env')
  ) {
    return 'Ask Portl is temporarily unavailable. Please try again later.';
  }

  if (
    lower.includes('edge function returned a non-2xx') ||
    lower.includes('failed to send a request') ||
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('timeout') ||
    lower.includes('could not reach')
  ) {
    return 'Could not reach Ask Portl. Check your connection and try again.';
  }

  if (lower.includes('unauthorized') || lower.includes('missing authorization')) {
    return 'Please sign in again to use Ask Portl.';
  }

  if (lower.includes('active society membership')) {
    return 'Your account needs an active society membership to use Ask Portl.';
  }

  if (lower.includes('message is required') || lower.includes('empty response')) {
    return 'Please type a question and try again.';
  }

  // Raw JSON / status dumps from model providers — never show to users.
  if (
    text.startsWith('{') ||
    lower.includes('"error"') ||
    lower.includes('"status"') ||
    /gemini error\s*\(/i.test(text) ||
    text.length > 160
  ) {
    return 'Ask Portl could not answer right now. Please try again.';
  }

  return text;
}

async function readFunctionsError(error: unknown, data: unknown): Promise<string> {
  // Newer supabase-js may put the body on `data` even when `error` is set.
  if (data && typeof data === 'object' && data !== null && 'error' in data) {
    const msg = (data as { error?: unknown }).error;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }

  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.json();
      if (body && typeof body === 'object' && 'error' in body) {
        const msg = (body as { error?: unknown }).error;
        if (typeof msg === 'string' && msg.trim()) return msg;
      }
      if (typeof body === 'string' && body.trim()) return body.trim();
    } catch {
      try {
        const text = await ctx.text();
        if (text.trim()) return text.trim();
      } catch {
        // fall through
      }
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Ask Portl failed';
}

export async function askPortl(
  message: string,
  history: AskPortlMessage[] = [],
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ask-portl', {
    body: { message, history },
  });

  if (error) {
    throw new Error(toUserFriendlyAskPortlMessage(await readFunctionsError(error, data)));
  }

  const payload = data as { answer?: string; error?: string } | null;
  if (payload?.error) throw new Error(toUserFriendlyAskPortlMessage(payload.error));
  if (!payload?.answer) {
    throw new Error(toUserFriendlyAskPortlMessage('Empty response from Ask Portl'));
  }
  return payload.answer;
}

/** Role-scoped Ask Portl route for resident / admin / guard shells. */
export function askPortlPath(role: string | null | undefined): string {
  if (role === 'admin') return '/(admin)/ask-portl';
  if (role === 'guard') return '/(guard)/ask-portl';
  return '/(resident)/ask-portl';
}
