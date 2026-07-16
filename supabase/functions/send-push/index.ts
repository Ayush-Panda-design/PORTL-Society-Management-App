import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

type PushBody = {
  userId?: string;
  userIds?: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: 'default';
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonResponse(500, { error: 'Missing Supabase env on function' });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(401, { error: 'Missing Authorization header' });
    }

    // Verify the caller has a valid user JWT (anon client + user token).
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(401, { error: 'Unauthorized' });
    }

    const payload = (await req.json()) as PushBody;
    if (!payload?.title || !payload?.body) {
      return jsonResponse(400, { error: 'title and body are required' });
    }

    const userIds = Array.from(
      new Set([...(payload.userId ? [payload.userId] : []), ...(payload.userIds ?? [])].filter(Boolean)),
    );

    if (userIds.length === 0) {
      return jsonResponse(400, { error: 'userId or userIds is required' });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id, push_token')
      .in('id', userIds)
      .not('push_token', 'is', null);

    if (profilesError) {
      return jsonResponse(500, { error: profilesError.message });
    }

    const tokens = (profiles ?? [])
      .map((p) => p.push_token as string | null)
      .filter((t): t is string => Boolean(t));

    if (tokens.length === 0) {
      return jsonResponse(200, { sent: 0, skipped: userIds.length, detail: 'No push tokens found' });
    }

    const messages: ExpoMessage[] = tokens.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default',
    }));

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
    const ticketChunks: unknown[] = [];

    for (const batch of chunk(messages, CHUNK_SIZE)) {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(batch),
      });
      const result = await res.json();
      ticketChunks.push(result);
      if (!res.ok) {
        return jsonResponse(502, { error: 'Expo push API failed', result });
      }
      sent += batch.length;
    }

    return jsonResponse(200, {
      sent,
      recipients: tokens.length,
      tickets: ticketChunks,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return jsonResponse(500, { error: message });
  }
});
