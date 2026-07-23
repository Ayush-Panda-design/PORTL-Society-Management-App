import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { ComplaintPriority } from '@/types/database';

export type ComplaintTriage = {
  category: string;
  priority: ComplaintPriority;
  rationale: string;
  suggested_assignee_id: string | null;
  suggested_assignee_name: string | null;
  routing_note: string | null;
};

async function errorMessageFromFunctionsError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body && typeof body === 'object' && 'error' in body) {
        const msg = (body as { error?: unknown }).error;
        if (typeof msg === 'string' && msg.trim()) return msg;
      }
    } catch {
      try {
        const text = await error.context.text();
        if (text.trim()) return text.trim();
      } catch {
        // fall through
      }
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Triage failed';
}

export async function triageComplaint(description: string): Promise<ComplaintTriage> {
  const { data, error } = await supabase.functions.invoke('triage-complaint', {
    body: { description },
  });

  if (error) {
    throw new Error(await errorMessageFromFunctionsError(error));
  }

  const payload = data as (ComplaintTriage & { error?: string }) | null;
  if (payload?.error) throw new Error(payload.error);
  if (!payload?.category || !payload?.priority) {
    throw new Error('Invalid triage response');
  }
  return payload;
}
