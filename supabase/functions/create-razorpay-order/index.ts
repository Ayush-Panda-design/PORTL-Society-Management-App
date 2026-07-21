import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Body = {
  paymentId?: string;
};

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function basicAuth(keyId: string, keySecret: string): string {
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
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
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')?.trim();
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')?.trim();

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonResponse(500, { error: 'Missing Supabase env on function' });
    }
    if (!razorpayKeyId || !razorpayKeySecret) {
      return jsonResponse(500, {
        error:
          'Online payments are not configured on the server yet. Please contact your society office.',
      });
    }
    if (!razorpayKeyId.startsWith('rzp_test_') && !razorpayKeyId.startsWith('rzp_live_')) {
      return jsonResponse(500, {
        error: 'RAZORPAY_KEY_ID looks invalid (expected rzp_test_… or rzp_live_…)',
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(401, { error: 'Missing Authorization header' });
    }

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

    const payload = (await req.json()) as Body;
    const paymentId = payload.paymentId?.trim();
    if (!paymentId) {
      return jsonResponse(400, { error: 'paymentId is required' });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: paymentRow, error: payErr } = await admin
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (payErr || !paymentRow) {
      return jsonResponse(404, { error: payErr?.message ?? 'Payment not found' });
    }

    if (paymentRow.payer_id !== user.id) {
      return jsonResponse(403, { error: 'Not your payment' });
    }

    if (paymentRow.status !== 'pending_payment') {
      return jsonResponse(409, { error: 'Payment is not pending' });
    }

    if (paymentRow.expires_at && new Date(paymentRow.expires_at).getTime() <= Date.now()) {
      return jsonResponse(409, { error: 'Payment has expired' });
    }

    if (paymentRow.razorpay_order_id) {
      return jsonResponse(200, {
        paymentId: paymentRow.id,
        orderId: paymentRow.razorpay_order_id,
        amountPaise: paymentRow.amount_paise,
        keyId: razorpayKeyId,
      });
    }

    const { data: account } = await admin
      .from('society_payment_accounts')
      .select('razorpay_account_id, status')
      .eq('society_id', paymentRow.society_id)
      .maybeSingle();

    if (!account || account.status !== 'verified') {
      return jsonResponse(409, {
        error:
          'Your society has not finished setting up online payments. Please contact the management committee.',
      });
    }

    const orderBody: Record<string, unknown> = {
      amount: paymentRow.amount_paise,
      currency: 'INR',
      receipt: paymentRow.id.replace(/-/g, '').slice(0, 40),
      notes: {
        payment_id: paymentRow.id,
        purpose: paymentRow.purpose,
        society_id: paymentRow.society_id,
      },
    };

    // Route transfer to society linked account when configured.
    if (account.razorpay_account_id) {
      orderBody.transfers = [
        {
          account: account.razorpay_account_id,
          amount: paymentRow.amount_paise,
          currency: 'INR',
          notes: {
            payment_id: paymentRow.id,
            society_id: paymentRow.society_id,
          },
          on_hold: false,
        },
      ];
    }

    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: basicAuth(razorpayKeyId, razorpayKeySecret),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderBody),
    });

    const rzpJson = await rzpRes.json();
    if (!rzpRes.ok || !rzpJson?.id) {
      return jsonResponse(502, {
        error: 'We could not start payment with the bank. Please try again shortly.',
        detail: rzpJson,
      });
    }

    const { data: updated, error: updateError } = await admin
      .from('payments')
      .update({ razorpay_order_id: rzpJson.id as string })
      .eq('id', paymentRow.id)
      .eq('status', 'pending_payment')
      .select('*')
      .maybeSingle();

    if (updateError || !updated) {
      return jsonResponse(500, {
        error: updateError?.message ?? 'Failed to store Razorpay order id',
      });
    }

    return jsonResponse(200, {
      paymentId: updated.id,
      orderId: updated.razorpay_order_id,
      amountPaise: updated.amount_paise,
      keyId: razorpayKeyId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return jsonResponse(500, { error: message });
  }
});
