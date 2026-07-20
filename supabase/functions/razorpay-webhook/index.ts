import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
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
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { error: 'Missing Supabase env on function' });
    }
    if (!webhookSecret) {
      return jsonResponse(500, { error: 'Missing RAZORPAY_WEBHOOK_SECRET' });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') ?? '';
    const expected = await hmacSha256Hex(webhookSecret, rawBody);

    if (!signature || !timingSafeEqual(signature, expected)) {
      return jsonResponse(401, { error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(rawBody) as {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            status?: string;
          };
        };
      };
    };

    const eventName = event.event ?? '';
    const paymentEntity = event.payload?.payment?.entity;
    const razorpayPaymentId = paymentEntity?.id;
    const razorpayOrderId = paymentEntity?.order_id;

    // Only confirm on captured / authorized success events.
    if (
      eventName !== 'payment.captured' &&
      eventName !== 'payment.authorized'
    ) {
      return jsonResponse(200, { ok: true, ignored: eventName });
    }

    if (!razorpayPaymentId || !razorpayOrderId) {
      return jsonResponse(400, { error: 'Missing payment or order id in payload' });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await admin.rpc('confirm_payment', {
      p_razorpay_payment_id: razorpayPaymentId,
      p_razorpay_order_id: razorpayOrderId,
    });

    if (error) {
      // Duplicate / already confirmed / expired — acknowledge so Razorpay stops retrying hard errors carefully.
      const msg = error.message ?? '';
      if (
        /not pending/i.test(msg) ||
        /expired/i.test(msg) ||
        /not found/i.test(msg)
      ) {
        return jsonResponse(200, { ok: false, reason: msg });
      }
      return jsonResponse(500, { error: msg });
    }

    return jsonResponse(200, { ok: true, payment: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return jsonResponse(500, { error: message });
  }
});
