import { supabase } from '@/lib/supabase';

export type AskPortlMessage = {
  role: 'user' | 'assistant';
  content: string;
};

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
    if (error.message.includes('non-2xx')) {
      return 'Ask Portl backend error. Check GEMINI_API_KEY is a Google AI Studio key (AIza…) and the ask-portl function is deployed.';
    }
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
    throw new Error(await readFunctionsError(error, data));
  }

  const payload = data as { answer?: string; error?: string } | null;
  if (payload?.error) throw new Error(payload.error);
  if (!payload?.answer) throw new Error('Empty response from Ask Portl');
  return payload.answer;
}

/** Role-scoped Ask Portl route for resident / admin / guard shells. */
export function askPortlPath(role: string | null | undefined): string {
  if (role === 'admin') return '/(admin)/ask-portl';
  if (role === 'guard') return '/(guard)/ask-portl';
  return '/(resident)/ask-portl';
}
