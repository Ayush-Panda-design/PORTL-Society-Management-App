/**
 * Dispatches pending rows from public.push_outbox via Expo Push.
 * Auth: service role (Authorization: Bearer SERVICE_ROLE_KEY) or
 * cron secret header x-cron-secret matching CRON_SECRET.
 *
 * Schedule (Supabase Dashboard → Edge Functions → Cron) every 1–2 min, or:
 *   curl -X POST "$SUPABASE_URL/functions/v1/dispatch-push-outbox" \
 *     -H "Authorization: Bearer $SERVICE_ROLE_KEY"
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

type OutboxRow = {
  id: string;
  society_id: string;
  user_ids: string[];
  title: string;
  body: string;
  data: Record<string, unknown>;
  channel_id: string | null;
  category_id: string | null;
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function resolveChannelId(row: OutboxRow): string {
  if (row.channel_id) return row.channel_id;
  const type = typeof row.data?.type === 'string' ? row.data.type : '';
  if (type.startsWith('visitor_')) return 'visitor';
  if (type === 'broadcast') return 'alerts';
  if (type === 'notice' || type.startsWith('poll_')) return 'notice';
  return 'default';
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** True for legacy service_role JWT, exact key match, or CRON_SECRET header. */
function isAuthorized(req: Request, serviceRoleKey: string, cronSecret: string | undefined): boolean {
  const headerCron = req.headers.get('x-cron-secret') ?? '';
  if (cronSecret && headerCron === cronSecret) return true;

  const authHeader = req.headers.get('Authorization') ?? '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!bearer) return false;

  if (bearer === serviceRoleKey) return true;

  // Dashboard Test / gateway often forwards a valid project JWT; accept service_role claim.
  const payload = decodeJwtPayload(bearer);
  if (payload?.role === 'service_role') return true;

  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const cronSecret = Deno.env.get('CRON_SECRET');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { error: 'Missing Supabase env on function' });
    }

    if (!isAuthorized(req, serviceRoleKey, cronSecret)) {
      return jsonResponse(401, {
        error: 'Unauthorized',
        hint: 'Use Role=service_role in the Test panel, or Authorization: Bearer <service_role JWT>, or x-cron-secret.',
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: rows, error: claimError } = await admin.rpc('claim_push_outbox', {
      p_limit: 50,
    });

    if (claimError) {
      return jsonResponse(500, { error: claimError.message });
    }

    const outbox = (rows ?? []) as OutboxRow[];
    if (outbox.length === 0) {
      return jsonResponse(200, { processed: 0, sent: 0 });
    }

    const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };
    if (expoAccessToken) {
      headers.Authorization = `Bearer ${expoAccessToken}`;
    }

    let sent = 0;
    let processed = 0;

    for (const row of outbox) {
      try {
        const { data: profiles, error: profilesError } = await admin
          .from('profiles')
          .select('id, push_token')
          .in('id', row.user_ids)
          .eq('society_id', row.society_id)
          .not('push_token', 'is', null);

        if (profilesError) {
          await admin.rpc('mark_push_outbox_processed', {
            p_id: row.id,
            p_error: profilesError.message,
          });
          processed += 1;
          continue;
        }

        const tokens = (profiles ?? [])
          .map((p) => p.push_token as string | null)
          .filter((t): t is string => Boolean(t));

        if (tokens.length === 0) {
          await admin.rpc('mark_push_outbox_processed', {
            p_id: row.id,
            p_error: 'No push tokens',
          });
          processed += 1;
          continue;
        }

        const channelId = resolveChannelId(row);
        const messages = tokens.map((to) => ({
          to,
          title: row.title,
          body: row.body,
          data: row.data ?? {},
          sound: 'default' as const,
          channelId,
          ...(row.category_id ? { categoryId: row.category_id } : {}),
          priority: 'high' as const,
        }));

        for (const batch of chunk(messages, CHUNK_SIZE)) {
          const res = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify(batch),
          });
          if (!res.ok) {
            const result = await res.text();
            throw new Error(`Expo push failed: ${result}`);
          }
          sent += batch.length;
        }

        await admin.rpc('mark_push_outbox_processed', {
          p_id: row.id,
          p_error: null,
        });
        processed += 1;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        await admin.rpc('mark_push_outbox_processed', {
          p_id: row.id,
          p_error: message,
        });
        processed += 1;
      }
    }

    return jsonResponse(200, { processed, sent, claimed: outbox.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return jsonResponse(500, { error: message });
  }
});
