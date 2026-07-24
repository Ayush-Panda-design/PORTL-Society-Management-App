import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Housekeeping',
  'Security',
  'Parking',
  'Noise',
  'Other',
] as const;

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type TriageResult = {
  category: (typeof CATEGORIES)[number];
  priority: (typeof PRIORITIES)[number];
  rationale: string;
  suggested_assignee_id: string | null;
  suggested_assignee_name: string | null;
  routing_note: string | null;
};

function heuristicTriage(description: string): TriageResult {
  const t = description.toLowerCase();
  let category: TriageResult['category'] = 'Other';
  let priority: TriageResult['priority'] = 'medium';

  if (/(leak|pipe|tap|toilet|drain|water|plumbing|flush)/.test(t)) category = 'Plumbing';
  else if (/(electric|power|light|socket|wiring|short|fan|meter)/.test(t)) category = 'Electrical';
  else if (/(clean|garbage|housekeep|trash|dust|pest|cockroach)/.test(t)) category = 'Housekeeping';
  else if (/(theft|suspicious|security|gate|guard|intrud)/.test(t)) category = 'Security';
  else if (/(park|vehicle|car|bike|scooter|slot)/.test(t)) category = 'Parking';
  else if (/(noise|loud|party|music|shout|bark)/.test(t)) category = 'Noise';

  if (/(flood|fire|smoke|gas|danger|urgent|emergency|critical|no water|no power)/.test(t)) {
    priority = 'critical';
  } else if (/(leak|broken|not working|outage|unsafe)/.test(t)) {
    priority = 'high';
  } else if (/(minor|small|occasionally|sometimes)/.test(t)) {
    priority = 'low';
  }

  return {
    category,
    priority,
    rationale: 'Classified with on-device heuristics (LLM unavailable).',
    suggested_assignee_id: null,
    suggested_assignee_name: null,
    routing_note: null,
  };
}

function extractGeminiText(data: {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}): string {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => p.text ?? '')
    .join('\n')
    .trim();
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    return {};
  }
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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.0-flash';

    if (!supabaseUrl || !anonKey) {
      return jsonResponse(500, { error: 'Missing Supabase env on function' });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse(401, { error: 'Missing Authorization header' });

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) return jsonResponse(401, { error: 'Unauthorized' });

    const { data: profile } = await userClient
      .from('profiles')
      .select('id, society_id, status')
      .eq('id', user.id)
      .single();

    if (!profile?.society_id || profile.status !== 'active') {
      return jsonResponse(403, { error: 'Active society membership required' });
    }

    const payload = (await req.json()) as { description?: string };
    const description = payload.description?.trim();
    if (!description || description.length < 8) {
      return jsonResponse(400, { error: 'description must be at least 8 characters' });
    }

    const { data: routing } = await userClient
      .from('complaint_category_routing')
      .select('category, assignee_id, assignee:profiles!assignee_id(id, full_name)')
      .eq('society_id', profile.society_id);

    const routingMap = new Map<
      string,
      { assignee_id: string | null; assignee_name: string | null }
    >();
    for (const row of routing ?? []) {
      const assignee = row.assignee as { id?: string; full_name?: string | null } | null;
      routingMap.set(row.category as string, {
        assignee_id: (row.assignee_id as string | null) ?? null,
        assignee_name: assignee?.full_name ?? null,
      });
    }

    let triage: TriageResult;

    if (!geminiKey) {
      triage = heuristicTriage(description);
    } else {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
        `?key=${encodeURIComponent(geminiKey)}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: `You triage housing-society helpdesk complaints.
Return JSON only: {"category":"...","priority":"...","rationale":"one short sentence"}.
category must be one of: ${CATEGORIES.join(', ')}.
priority must be one of: ${PRIORITIES.join(', ')}.
Use critical only for safety / outages; low for cosmetic/minor.`,
              },
            ],
          },
          contents: [{ role: 'user', parts: [{ text: description }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        triage = heuristicTriage(description);
      } else {
        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const raw = extractGeminiText(data);
        const parsed = parseJsonObject(raw || '{}');
        const category = CATEGORIES.includes(parsed.category as (typeof CATEGORIES)[number])
          ? (parsed.category as (typeof CATEGORIES)[number])
          : heuristicTriage(description).category;
        const priority = PRIORITIES.includes(parsed.priority as (typeof PRIORITIES)[number])
          ? (parsed.priority as (typeof PRIORITIES)[number])
          : heuristicTriage(description).priority;
        triage = {
          category,
          priority,
          rationale:
            typeof parsed.rationale === 'string' && parsed.rationale.trim()
              ? parsed.rationale.trim()
              : 'AI triage suggestion',
          suggested_assignee_id: null,
          suggested_assignee_name: null,
          routing_note: null,
        };
      }
    }

    const route = routingMap.get(triage.category);
    if (route?.assignee_id) {
      triage.suggested_assignee_id = route.assignee_id;
      triage.suggested_assignee_name = route.assignee_name;
      triage.routing_note = `Routes to ${route.assignee_name ?? 'assigned staff'} via category routing.`;
    } else {
      triage.routing_note = 'No category routing configured — admins will see this ticket.';
    }

    return jsonResponse(200, triage);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[triage-complaint] Unhandled error:', message);
    return jsonResponse(500, {
      error: 'Could not suggest a category right now. Please try again or pick one manually.',
    });
  }
});
