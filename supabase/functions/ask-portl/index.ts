import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };
type UserRole = 'resident' | 'admin' | 'guard';

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args?: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

type GeminiContent = {
  role: 'user' | 'model';
  parts: GeminiPart[];
};

type ToolDecl = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── Shared tools ────────────────────────────────────────────────────────────

const TOOL_SEARCH_AMENITY_SLOTS: ToolDecl = {
  name: 'search_amenity_slots',
  description:
    'Find amenity booking slots (gym, pool, clubhouse, etc.) for a date. Use for availability questions.',
  parameters: {
    type: 'OBJECT',
    properties: {
      amenity_name: { type: 'STRING', description: 'Partial amenity name' },
      date: { type: 'STRING', description: 'ISO date YYYY-MM-DD; default tomorrow' },
    },
    required: ['amenity_name'],
  },
};

const TOOL_LIST_AMENITIES: ToolDecl = {
  name: 'list_amenities',
  description: 'List society amenities / facilities with locations and slot counts.',
  parameters: { type: 'OBJECT', properties: {} },
};

const TOOL_SEARCH_VISITORS: ToolDecl = {
  name: 'search_visitors',
  description:
    'Search visitors/guests. Residents see their flat only; admin/guard see society-wide.',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: { type: 'STRING', description: 'Visitor name or purpose keyword' },
      since_hours: { type: 'NUMBER', description: 'Lookback hours (default 48)' },
      status: {
        type: 'STRING',
        description: 'pending | approved | rejected | checked_in | checked_out',
      },
    },
  },
};

const TOOL_SEARCH_NOTICES: ToolDecl = {
  name: 'search_notices',
  description: 'Search society notices and broadcast alerts.',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: { type: 'STRING' },
      limit: { type: 'NUMBER', description: 'Max rows (default 5)' },
    },
  },
};

const TOOL_SEARCH_COMPLAINTS: ToolDecl = {
  name: 'search_complaints',
  description:
    'Search helpdesk complaints. Residents: own flat. Admin: society-wide. Guard: limited/society if allowed.',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: { type: 'STRING' },
      status: { type: 'STRING', description: 'open | in_progress | resolved | reopened' },
    },
  },
};

const TOOL_SEARCH_BOOKINGS: ToolDecl = {
  name: 'search_bookings',
  description:
    'Upcoming amenity bookings. Residents: own flat. Admin: society-wide upcoming bookings.',
  parameters: {
    type: 'OBJECT',
    properties: {
      amenity_name: { type: 'STRING' },
      limit: { type: 'NUMBER', description: 'Max rows (default 20)' },
    },
  },
};

const TOOL_SOCIETY_SNAPSHOT: ToolDecl = {
  name: 'get_society_snapshot',
  description:
    'Live society pulse: member counts, pending visitors, open complaints, polls, amenities, towers/flats, pinned notices. ALWAYS use this for overview / “how many members” / dashboard-style questions.',
  parameters: {
    type: 'OBJECT',
    properties: {
      include_pinned: { type: 'BOOLEAN', description: 'Include pinned notices (default true)' },
    },
  },
};

const TOOL_SEARCH_POLLS: ToolDecl = {
  name: 'search_polls',
  description: 'List active or recent society polls.',
  parameters: {
    type: 'OBJECT',
    properties: {
      include_expired: { type: 'BOOLEAN' },
      limit: { type: 'NUMBER' },
    },
  },
};

const TOOL_SEARCH_STAFF: ToolDecl = {
  name: 'search_staff',
  description: 'Search staff directory and service providers (security, plumber, etc.).',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: { type: 'STRING' },
      staff_type: { type: 'STRING', description: 'staff | service_provider' },
    },
  },
};

const TOOL_SEARCH_PAYMENTS: ToolDecl = {
  name: 'search_payments',
  description:
    'Payments / dues. Residents: own ledger. Admin: society payment overview.',
  parameters: {
    type: 'OBJECT',
    properties: {
      status: {
        type: 'STRING',
        description:
          'pending_payment | confirmed | expired | failed | partially_paid | refunded',
      },
      limit: { type: 'NUMBER' },
    },
  },
};

const TOOL_SEARCH_MEMBERS: ToolDecl = {
  name: 'search_members',
  description:
    'Admin tool: count and search society members (residents, admins, guards), pending join requests, and flat assignments. Use for “how many members/residents”.',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: { type: 'STRING', description: 'Name fragment to search' },
      role_filter: {
        type: 'STRING',
        description: 'resident | admin | guard | all (default all active)',
      },
      include_pending: {
        type: 'BOOLEAN',
        description: 'Include pending join requests (default true)',
      },
      limit: { type: 'NUMBER', description: 'Max named rows to list (default 15)' },
    },
  },
};

const TOOL_SEARCH_STRUCTURE: ToolDecl = {
  name: 'search_structure',
  description:
    'Admin tool: towers, flats counts, and optionally list tower names / flat numbers.',
  parameters: {
    type: 'OBJECT',
    properties: {
      list_towers: { type: 'BOOLEAN', description: 'Include tower list (default true)' },
    },
  },
};

const TOOL_APP_GUIDE: ToolDecl = {
  name: 'get_app_guide',
  description:
    'How-to for Portl screens. Use for “how do I…” questions. Topics vary by role.',
  parameters: {
    type: 'OBJECT',
    properties: {
      topic: {
        type: 'STRING',
        description:
          'pre_approve | visitors | amenities | payments | helpdesk | notices | polls | directory | profile | towers | flats | invites | residents | gates | broadcasts | register_visitor | verify_entry | scan_pass | logs | roles | ask_portl',
      },
    },
    required: ['topic'],
  },
};

const TOOLS_BY_ROLE: Record<UserRole, ToolDecl[]> = {
  resident: [
    TOOL_SOCIETY_SNAPSHOT,
    TOOL_SEARCH_VISITORS,
    TOOL_SEARCH_AMENITY_SLOTS,
    TOOL_LIST_AMENITIES,
    TOOL_SEARCH_BOOKINGS,
    TOOL_SEARCH_NOTICES,
    TOOL_SEARCH_COMPLAINTS,
    TOOL_SEARCH_POLLS,
    TOOL_SEARCH_STAFF,
    TOOL_SEARCH_PAYMENTS,
    TOOL_APP_GUIDE,
  ],
  admin: [
    TOOL_SOCIETY_SNAPSHOT,
    TOOL_SEARCH_MEMBERS,
    TOOL_SEARCH_STRUCTURE,
    TOOL_SEARCH_VISITORS,
    TOOL_SEARCH_COMPLAINTS,
    TOOL_SEARCH_NOTICES,
    TOOL_SEARCH_POLLS,
    TOOL_SEARCH_PAYMENTS,
    TOOL_SEARCH_AMENITY_SLOTS,
    TOOL_LIST_AMENITIES,
    TOOL_SEARCH_BOOKINGS,
    TOOL_SEARCH_STAFF,
    TOOL_APP_GUIDE,
  ],
  guard: [
    TOOL_SOCIETY_SNAPSHOT,
    TOOL_SEARCH_VISITORS,
    TOOL_SEARCH_NOTICES,
    TOOL_SEARCH_STAFF,
    TOOL_LIST_AMENITIES,
    TOOL_APP_GUIDE,
  ],
};

function appGuideFor(topic: string, role: UserRole): { title: string; steps: string[] } {
  const guides: Record<string, { title: string; steps: string[] }> = {
    pre_approve: {
      title: 'Pre-approve a guest',
      steps: [
        'Home → Invite (or Visitors → Pre-approve).',
        'Enter guest name, type, and expected time.',
        'Share the pass / QR with your guest before they arrive.',
      ],
    },
    visitors: {
      title: 'Manage visitors',
      steps:
        role === 'guard'
          ? [
              'Pending tab: queue awaiting resident approval.',
              'Register: create a new gate request for a flat.',
              'Entry / Scan QR: check in approved visitors.',
            ]
          : [
              'Open Visitors to see pending and recent guests.',
              'Approve or decline gate requests.',
              'Use Invite to pre-approve expected guests.',
            ],
    },
    amenities: {
      title: 'Book an amenity',
      steps: [
        'Open Amenities from Home or Quick actions.',
        'Pick a facility, date, and free slot, then confirm.',
        role === 'admin'
          ? 'Admin can manage facilities under Amenities in Manage.'
          : 'Upcoming bookings appear in Amenities.',
      ],
    },
    payments: {
      title: 'Payments & dues',
      steps:
        role === 'admin'
          ? [
              'More / Manage → payout setup for society collections.',
              'Residents pay dues from More → Payments.',
              'Ask Portl can summarize pending/failed payments.',
            ]
          : [
              'More → Payments for pending charges.',
              'Tap a due item and complete payment.',
              'Confirmed payments stay in your ledger.',
            ],
    },
    helpdesk: {
      title: 'Helpdesk / complaints',
      steps:
        role === 'admin'
          ? [
              'Manage → Complaints for the society queue.',
              'Update status (open → in progress → resolved).',
              'Ask Portl for open-ticket counts anytime.',
            ]
          : [
              'Home → Requests / Helpdesk.',
              'Tap New, describe the issue, submit.',
              'Track status in the same screen.',
            ],
    },
    notices: {
      title: 'Notices',
      steps:
        role === 'admin'
          ? [
              'Notices tab to post announcements.',
              'Pin important items; use Broadcasts for urgent alerts.',
            ]
          : [
              'Notices tab for society announcements.',
              'Pinned items appear first.',
            ],
    },
    polls: {
      title: 'Polls',
      steps:
        role === 'admin'
          ? ['Create/manage polls from community polls.', 'Publish results when ready.']
          : ['Open Polls from Around your society.', 'Vote before the poll expires.'],
    },
    directory: {
      title: 'Directory / staff',
      steps: [
        'Directory (or Staff for admins) lists contacts.',
        'Tap a phone number to call security or services.',
      ],
    },
    profile: {
      title: 'Profile & appearance',
      steps: [
        'Avatar / Profile for personal details.',
        'More → Appearance for Light / Dark (WhatsApp-style black).',
      ],
    },
    towers: {
      title: 'Towers (admin)',
      steps: ['Manage → Towers to add/rename buildings.', 'Flats are mapped under each tower.'],
    },
    flats: {
      title: 'Flats (admin)',
      steps: ['Manage → Flats to map units to towers.', 'Assign residents to flats under Residents.'],
    },
    invites: {
      title: 'Invite links (admin)',
      steps: [
        'Manage → Invite links to share resident/guard codes.',
        'Join requests appear under Members for approval.',
      ],
    },
    residents: {
      title: 'Residents (admin)',
      steps: [
        'Residents tab / Manage → Residents.',
        'Assign flats; approve joiners under Members.',
        'Ask Portl “how many members” for live counts.',
      ],
    },
    gates: {
      title: 'Gates (admin)',
      steps: ['Manage → Gates for multi-entry visitor logs.', 'Guards use Entry to check visitors in.'],
    },
    broadcasts: {
      title: 'Broadcasts (admin)',
      steps: ['Manage → Broadcasts for urgent society alerts.', 'Severity helps guards prioritize.'],
    },
    roles: {
      title: 'Roles (admin)',
      steps: ['Manage → Roles & escalation for committee permissions and visitor timers.'],
    },
    register_visitor: {
      title: 'Register visitor (guard)',
      steps: [
        'Register tab → enter guest + flat.',
        'Resident gets an approval request.',
        'After approval, use Entry / Scan QR to check in.',
      ],
    },
    verify_entry: {
      title: 'Entry & verify (guard)',
      steps: ['Entry tab for approved visitors.', 'Confirm identity and mark checked in.'],
    },
    scan_pass: {
      title: 'Scan QR (guard)',
      steps: ['Scan QR / Register on Home or Pending.', 'Validates pre-approved passes quickly.'],
    },
    logs: {
      title: 'Visitor logs (guard)',
      steps: ['Logs tab for entry/exit history.', 'Filter by recent activity when needed.'],
    },
    ask_portl: {
      title: 'Ask Portl',
      steps: [
        'Tap the Ask Portl orb on Home / Dashboard.',
        'Ask in plain language — Portl looks up live society data.',
        'Suggestions adapt to your role (resident, admin, or guard).',
      ],
    },
  };

  const key = topic.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return (
    guides[key] ?? {
      title: 'Portl basics',
      steps: [
        'Use Ask Portl for live lookups — guests, notices, complaints, members (admin).',
        'Home / Dashboard and More cover day-to-day screens.',
        'Try a concrete question like “pending visitors” or “how many residents”.',
      ],
    }
  );
}

function buildSystemPrompt(input: {
  role: UserRole;
  fullName: string;
  societyId: string;
  societyName: string | null;
  flatId: string | null;
}): string {
  const today = new Date().toISOString().slice(0, 10);
  const societyLabel = input.societyName ? `"${input.societyName}"` : input.societyId;
  const base = `You are Ask Portl — the in-app AI for the Portl society management app.

IDENTITY
- Caller: ${input.fullName} · role: ${input.role}
- Society: ${societyLabel}
- Flat id: ${input.flatId ?? 'none'}
- Today (UTC date): ${today}

RULES
- ALWAYS call tools for facts (counts, names, statuses, slots). Never invent data.
- If a tool returns empty, say you could not find it and suggest the right Portl screen.
- Lead with the answer in 1–2 sentences; then short bullets if needed.
- Prefer concrete numbers, names, times, and statuses.
- Money: paise ÷ 100 → ₹.
- Keep answers scannable (busy phone use). End with at most one tip OR one follow-up question.`;

  if (input.role === 'admin') {
    return `${base}

YOU ARE THE ADMIN OPS ASSISTANT
Help society managers run Portl day-to-day.

You know Portl admin surfaces:
- Dashboard (ops home + Ask Portl)
- Notices, Residents, Manage/More (towers, flats, gates, invites, join requests, complaints, amenities, staff, polls, broadcasts, roles, audit, payouts)

Typical questions you MUST answer with tools:
- “How many members/residents?” → get_society_snapshot and/or search_members
- Open complaints, pending visitors, polls, payments, notices, staff, amenities, towers/flats

Tone: crisp ops briefing. Offer the next admin action when useful (e.g. “Open Complaints to update status”).`;
  }

  if (input.role === 'guard') {
    return `${base}

YOU ARE THE GATE / SECURITY ASSISTANT
Help guards move the visitor queue quickly.

You know Portl guard surfaces:
- Pending queue, Register visitor, Entry & verify, Scan QR, Logs, More, Ask Portl

Focus on:
- Pending approvals, find guest by name, checked-in recently, notices/broadcasts, staff/security contacts
- How-tos: register_visitor, verify_entry, scan_pass, logs

Do NOT invent flat owners or approvals. Use search_visitors.
Tone: short desk-ready answers (often under 4 lines).`;
  }

  return `${base}

YOU ARE THE RESIDENT ASSISTANT
Help residents with their flat and daily society life.

You know Portl resident surfaces:
- Home (gate activity, Ask Portl, quick actions)
- Visitors / pre-approve, Notices, Amenities, Helpdesk/Requests, Polls, Directory, Payments, Profile, More

Focus on:
- Their guests (approve/pending), amenity slots & bookings, own complaints & payments, notices, staff contacts, how-tos

Tone: friendly and clear — like a helpful neighbor who knows the app.`;
}

function tomorrowIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function extractText(parts: GeminiPart[] | undefined): string {
  if (!parts?.length) return '';
  return parts
    .map((p) => ('text' in p ? p.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();
}

function extractFunctionCalls(parts: GeminiPart[] | undefined) {
  if (!parts?.length) return [];
  return parts
    .filter((p): p is { functionCall: { name: string; args?: Record<string, unknown> } } =>
      'functionCall' in p && Boolean(p.functionCall?.name),
    )
    .map((p) => p.functionCall);
}

function normalizeRole(role: string | null | undefined): UserRole {
  if (role === 'admin' || role === 'guard') return role;
  return 'resident';
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

    if (!supabaseUrl || !anonKey) {
      console.error('[ask-portl] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
      return jsonResponse(500, {
        error: 'Ask Portl is temporarily unavailable. Please try again later.',
      });
    }
    if (!geminiKey) {
      console.error('[ask-portl] GEMINI_API_KEY is not set');
      return jsonResponse(503, {
        error: 'Ask Portl is temporarily unavailable. Please try again later.',
      });
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

    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('id, role, full_name, flat_id, society_id, status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.society_id || profile.status !== 'active') {
      return jsonResponse(403, { error: 'Active society membership required' });
    }

    const role = normalizeRole(profile.role);
    const tools = TOOLS_BY_ROLE[role];

    const { data: societyRow } = await userClient
      .from('societies')
      .select('id, name')
      .eq('id', profile.society_id)
      .maybeSingle();

    const body = (await req.json()) as {
      message?: string;
      history?: ChatMessage[];
    };
    const message = body.message?.trim();
    if (!message) return jsonResponse(400, { error: 'message is required' });

    const history = (body.history ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-16);

    const systemPrompt = buildSystemPrompt({
      role,
      fullName: profile.full_name ?? 'member',
      societyId: profile.society_id,
      societyName: (societyRow as { name?: string } | null)?.name ?? null,
      flatId: profile.flat_id ?? null,
    });

    const contents: GeminiContent[] = [
      ...history.map((m) => ({
        role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
      // Role gate — ignore tools not in this role's set
      if (!tools.some((t) => t.name === name)) {
        return { error: `Tool "${name}" is not available for role ${role}` };
      }

      switch (name) {
        case 'list_amenities': {
          const { data, error } = await userClient
            .from('amenities')
            .select('id, name, location, description, slots')
            .eq('society_id', profile.society_id)
            .order('name', { ascending: true })
            .limit(30);
          if (error) return { amenities: [], error: error.message };
          return {
            amenities: (data ?? []).map((a) => ({
              id: a.id,
              name: a.name,
              location: a.location,
              description: a.description,
              slot_count: Array.isArray(a.slots) ? a.slots.length : 0,
            })),
          };
        }
        case 'search_amenity_slots': {
          const amenityName = String(args.amenity_name ?? '').trim();
          const date = String(args.date ?? tomorrowIsoDate());
          const { data: amenities } = await userClient
            .from('amenities')
            .select('id, name, slots, description, location')
            .eq('society_id', profile.society_id)
            .ilike('name', `%${amenityName}%`)
            .limit(5);
          if (!amenities?.length) return { date, amenities: [] };

          const results = [];
          for (const a of amenities) {
            const { data: bookings } = await userClient
              .from('amenity_bookings')
              .select('slot, status, flat_id')
              .eq('amenity_id', a.id)
              .eq('date', date)
              .neq('status', 'cancelled');
            const booked = new Set((bookings ?? []).map((b) => b.slot as string));
            const slots = ((a.slots as string[]) ?? []).map((slot) => ({
              slot,
              available: !booked.has(slot),
            }));
            results.push({
              id: a.id,
              name: a.name,
              location: a.location,
              date,
              slots,
            });
          }
          return { date, amenities: results };
        }
        case 'search_visitors': {
          const sinceHours = Number(args.since_hours ?? 48);
          const since = new Date(Date.now() - sinceHours * 3600_000).toISOString();
          let q = userClient
            .from('visitors')
            .select(
              'id, name, type, status, purpose, created_at, responded_at, reject_reason, flats(number, towers(name))',
            )
            .eq('society_id', profile.society_id)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(15);
          if (role === 'resident' && profile.flat_id) {
            q = q.eq('flat_id', profile.flat_id);
          }
          if (typeof args.status === 'string' && args.status) {
            q = q.eq('status', args.status);
          }
          if (typeof args.query === 'string' && args.query.trim()) {
            q = q.or(
              `name.ilike.%${args.query.trim()}%,purpose.ilike.%${args.query.trim()}%`,
            );
          }
          const { data } = await q;
          return { visitors: data ?? [] };
        }
        case 'search_notices': {
          const limit = Math.min(Number(args.limit ?? 5), 10);
          const query = typeof args.query === 'string' ? args.query.trim() : '';
          let nq = userClient
            .from('notices')
            .select('id, title, body, category, created_at, is_pinned')
            .eq('society_id', profile.society_id)
            .order('created_at', { ascending: false })
            .limit(limit);
          if (query) {
            nq = nq.or(`title.ilike.%${query}%,body.ilike.%${query}%`);
          }
          const { data: notices, error: noticesError } = await nq;
          if (noticesError) return { notices: [], broadcasts: [], error: noticesError.message };

          let bq = userClient
            .from('broadcasts')
            .select('id, title, body, severity, created_at')
            .eq('society_id', profile.society_id)
            .order('created_at', { ascending: false })
            .limit(limit);
          if (query) {
            bq = bq.or(`title.ilike.%${query}%,body.ilike.%${query}%`);
          }
          const { data: broadcasts, error: broadcastsError } = await bq;
          if (broadcastsError) {
            return { notices: notices ?? [], broadcasts: [], note: broadcastsError.message };
          }
          return { notices: notices ?? [], broadcasts: broadcasts ?? [] };
        }
        case 'search_complaints': {
          let cq = userClient
            .from('complaints')
            .select(
              'id, category, description, status, priority, created_at, sla_due_at, flats!inner(id, number, towers(name, society_id))',
            )
            .eq('flats.towers.society_id', profile.society_id)
            .order('created_at', { ascending: false })
            .limit(10);
          if (role === 'resident' && profile.flat_id) {
            cq = cq.eq('flat_id', profile.flat_id);
          }
          if (typeof args.status === 'string' && args.status) {
            cq = cq.eq('status', args.status);
          }
          const { data } = await cq;
          let rows = data ?? [];
          const query = typeof args.query === 'string' ? args.query.trim().toLowerCase() : '';
          if (query) {
            rows = rows.filter((r) =>
              `${r.category} ${r.description}`.toLowerCase().includes(query),
            );
          }
          return { complaints: rows };
        }
        case 'search_bookings': {
          const limit = Math.min(Number(args.limit ?? 20), 40);
          const amenityName =
            typeof args.amenity_name === 'string' ? args.amenity_name.trim() : '';
          const today = new Date().toISOString().slice(0, 10);

          if (role === 'admin') {
            const { data, error } = await userClient
              .from('amenity_bookings')
              .select('id, date, slot, status, flat_id, amenities!inner(name, society_id)')
              .eq('amenities.society_id', profile.society_id)
              .gte('date', today)
              .neq('status', 'cancelled')
              .order('date', { ascending: true })
              .limit(limit);
            if (error) return { bookings: [], error: error.message };
            let rows = data ?? [];
            if (amenityName) {
              rows = rows.filter((r) =>
                String((r.amenities as { name?: string } | null)?.name ?? '')
                  .toLowerCase()
                  .includes(amenityName.toLowerCase()),
              );
            }
            return { bookings: rows, scope: 'society' };
          }

          if (!profile.flat_id) return { bookings: [], note: 'No flat linked' };
          const { data } = await userClient
            .from('amenity_bookings')
            .select('id, date, slot, status, amenities(name, society_id)')
            .eq('flat_id', profile.flat_id)
            .gte('date', today)
            .neq('status', 'cancelled')
            .order('date', { ascending: true })
            .limit(limit);
          let rows = (data ?? []).filter(
            (r) =>
              (r.amenities as { society_id?: string } | null)?.society_id ===
              profile.society_id,
          );
          if (amenityName) {
            rows = rows.filter((r) =>
              String((r.amenities as { name?: string } | null)?.name ?? '')
                .toLowerCase()
                .includes(amenityName.toLowerCase()),
            );
          }
          return { bookings: rows, scope: 'flat' };
        }
        case 'get_society_snapshot': {
          const now = new Date().toISOString();
          const includePinned = args.include_pinned !== false;

          const [
            { count: residents },
            { count: admins },
            { count: guards },
            { count: pendingMembers },
            { count: openComplaints },
            { count: pendingVisitors },
            { count: checkedInToday },
            { count: activePolls },
            { count: amenities },
            { count: towers },
            { count: flats },
            { count: pendingPayments },
            pinnedRes,
          ] = await Promise.all([
            userClient
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('society_id', profile.society_id)
              .eq('role', 'resident')
              .eq('status', 'active'),
            userClient
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('society_id', profile.society_id)
              .eq('role', 'admin')
              .eq('status', 'active'),
            userClient
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('society_id', profile.society_id)
              .eq('role', 'guard')
              .eq('status', 'active'),
            userClient
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('society_id', profile.society_id)
              .eq('status', 'pending'),
            userClient
              .from('complaints')
              .select('id, flats!inner(towers!inner(society_id))', {
                count: 'exact',
                head: true,
              })
              .eq('flats.towers.society_id', profile.society_id)
              .in('status', ['open', 'in_progress', 'reopened']),
            userClient
              .from('visitors')
              .select('id', { count: 'exact', head: true })
              .eq('society_id', profile.society_id)
              .eq('status', 'pending'),
            userClient
              .from('visitors')
              .select('id', { count: 'exact', head: true })
              .eq('society_id', profile.society_id)
              .eq('status', 'checked_in')
              .gte('responded_at', new Date(Date.now() - 24 * 3600_000).toISOString()),
            userClient
              .from('polls')
              .select('id', { count: 'exact', head: true })
              .eq('society_id', profile.society_id)
              .or(`expires_at.is.null,expires_at.gt.${now}`),
            userClient
              .from('amenities')
              .select('id', { count: 'exact', head: true })
              .eq('society_id', profile.society_id),
            userClient
              .from('towers')
              .select('id', { count: 'exact', head: true })
              .eq('society_id', profile.society_id),
            userClient
              .from('flats')
              .select('id, towers!inner(society_id)', { count: 'exact', head: true })
              .eq('towers.society_id', profile.society_id),
            userClient
              .from('payments')
              .select('id', { count: 'exact', head: true })
              .eq('society_id', profile.society_id)
              .in('status', ['pending_payment', 'failed', 'partially_paid']),
            includePinned
              ? userClient
                  .from('notices')
                  .select('id, title, category')
                  .eq('society_id', profile.society_id)
                  .eq('is_pinned', true)
                  .limit(5)
              : Promise.resolve({ data: [] as unknown[] }),
          ]);

          const activeMembers =
            (residents ?? 0) + (admins ?? 0) + (guards ?? 0);

          const snapshot: Record<string, unknown> = {
            society_name: (societyRow as { name?: string } | null)?.name ?? null,
            as_of: now,
            members: {
              total_active: activeMembers,
              residents: residents ?? 0,
              admins: admins ?? 0,
              guards: guards ?? 0,
              pending_join_requests: pendingMembers ?? 0,
            },
            pending_visitors: pendingVisitors ?? 0,
            checked_in_recent_24h: checkedInToday ?? 0,
            open_complaints: openComplaints ?? 0,
            active_polls: activePolls ?? 0,
            amenities: amenities ?? 0,
            towers: towers ?? 0,
            flats: flats ?? 0,
            pending_or_failed_payments: pendingPayments ?? 0,
            pinned_notices: (pinnedRes as { data?: unknown[] }).data ?? [],
            viewer_role: role,
          };

          if (role === 'resident' && profile.flat_id) {
            const [{ count: myPending }, { count: myOpen }] = await Promise.all([
              userClient
                .from('visitors')
                .select('id', { count: 'exact', head: true })
                .eq('flat_id', profile.flat_id)
                .eq('status', 'pending'),
              userClient
                .from('complaints')
                .select('id', { count: 'exact', head: true })
                .eq('flat_id', profile.flat_id)
                .in('status', ['open', 'in_progress', 'reopened']),
            ]);
            snapshot.my_flat = {
              flat_id: profile.flat_id,
              pending_visitors: myPending ?? 0,
              open_complaints: myOpen ?? 0,
            };
          }

          return snapshot;
        }
        case 'search_members': {
          const limit = Math.min(Number(args.limit ?? 15), 40);
          const includePending = args.include_pending !== false;
          const roleFilter =
            typeof args.role_filter === 'string' ? args.role_filter.trim().toLowerCase() : 'all';
          const query = typeof args.query === 'string' ? args.query.trim() : '';

          const [
            { count: residents },
            { count: admins },
            { count: guards },
            { count: pending },
          ] = await Promise.all([
            userClient
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('society_id', profile.society_id)
              .eq('role', 'resident')
              .eq('status', 'active'),
            userClient
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('society_id', profile.society_id)
              .eq('role', 'admin')
              .eq('status', 'active'),
            userClient
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('society_id', profile.society_id)
              .eq('role', 'guard')
              .eq('status', 'active'),
            userClient
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('society_id', profile.society_id)
              .eq('status', 'pending'),
          ]);

          let mq = userClient
            .from('profiles')
            .select('id, full_name, role, status, flat_id, flats(number, towers(name))')
            .eq('society_id', profile.society_id)
            .order('full_name', { ascending: true })
            .limit(limit);

          if (roleFilter === 'resident' || roleFilter === 'admin' || roleFilter === 'guard') {
            mq = mq.eq('role', roleFilter).eq('status', 'active');
          } else if (includePending) {
            mq = mq.in('status', ['active', 'pending']);
          } else {
            mq = mq.eq('status', 'active');
          }

          if (query) {
            mq = mq.ilike('full_name', `%${query}%`);
          }

          const { data, error } = await mq;
          if (error) {
            return {
              counts: {
                residents: residents ?? 0,
                admins: admins ?? 0,
                guards: guards ?? 0,
                pending_join_requests: pending ?? 0,
                total_active: (residents ?? 0) + (admins ?? 0) + (guards ?? 0),
              },
              members: [],
              error: error.message,
            };
          }

          return {
            counts: {
              residents: residents ?? 0,
              admins: admins ?? 0,
              guards: guards ?? 0,
              pending_join_requests: pending ?? 0,
              total_active: (residents ?? 0) + (admins ?? 0) + (guards ?? 0),
            },
            members: data ?? [],
          };
        }
        case 'search_structure': {
          const listTowers = args.list_towers !== false;
          const [{ count: towerCount }, { count: flatCount }, towersRes] = await Promise.all([
            userClient
              .from('towers')
              .select('id', { count: 'exact', head: true })
              .eq('society_id', profile.society_id),
            userClient
              .from('flats')
              .select('id, towers!inner(society_id)', { count: 'exact', head: true })
              .eq('towers.society_id', profile.society_id),
            listTowers
              ? userClient
                  .from('towers')
                  .select('id, name')
                  .eq('society_id', profile.society_id)
                  .order('name', { ascending: true })
                  .limit(40)
              : Promise.resolve({ data: [] as unknown[] }),
          ]);
          return {
            towers: towerCount ?? 0,
            flats: flatCount ?? 0,
            tower_list: (towersRes as { data?: unknown[] }).data ?? [],
          };
        }
        case 'search_polls': {
          const limit = Math.min(Number(args.limit ?? 5), 10);
          const includeExpired = Boolean(args.include_expired);
          const now = new Date().toISOString();
          let pq = userClient
            .from('polls')
            .select('id, question, options, expires_at, results_published_at, created_at')
            .eq('society_id', profile.society_id)
            .order('created_at', { ascending: false })
            .limit(limit);
          if (!includeExpired) {
            pq = pq.or(`expires_at.is.null,expires_at.gt.${now}`);
          }
          const { data, error } = await pq;
          if (error) return { polls: [], error: error.message };
          return { polls: data ?? [], as_of: now };
        }
        case 'search_staff': {
          const query = typeof args.query === 'string' ? args.query.trim() : '';
          let sq = userClient
            .from('staff_directory')
            .select(
              'id, name, role, phone, staff_type, shift_start, shift_end, company_name, service_category, is_on_duty',
            )
            .eq('society_id', profile.society_id)
            .order('role', { ascending: true })
            .limit(20);
          if (typeof args.staff_type === 'string' && args.staff_type) {
            sq = sq.eq('staff_type', args.staff_type);
          }
          const { data, error } = await sq;
          if (error) return { staff: [], error: error.message };
          let rows = data ?? [];
          if (query) {
            const q = query.toLowerCase();
            rows = rows.filter((r) =>
              `${r.name} ${r.role} ${r.company_name ?? ''} ${r.service_category ?? ''}`
                .toLowerCase()
                .includes(q),
            );
          }
          return { staff: rows };
        }
        case 'search_payments': {
          const limit = Math.min(Number(args.limit ?? 8), 15);
          let payQ = userClient
            .from('payments')
            .select(
              'id, purpose, amount_paise, paid_paise, status, notes, created_at, expires_at',
            )
            .eq('society_id', profile.society_id)
            .order('created_at', { ascending: false })
            .limit(limit);
          if (role === 'resident') {
            payQ = payQ.eq('payer_id', profile.id);
          }
          if (typeof args.status === 'string' && args.status) {
            payQ = payQ.eq('status', args.status);
          }
          const { data, error } = await payQ;
          if (error) return { payments: [], error: error.message };
          const payments = (data ?? []).map((p) => ({
            ...p,
            amount_rupees: (Number(p.amount_paise) || 0) / 100,
            paid_rupees: (Number(p.paid_paise) || 0) / 100,
          }));
          return { payments };
        }
        case 'get_app_guide': {
          const topic = String(args.topic ?? 'ask_portl');
          return { guide: appGuideFor(topic, role) };
        }
        default:
          return { error: `Unknown tool: ${name}` };
      }
    }

    async function chat(contentsIn: GeminiContent[], modelName: string) {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey!,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: contentsIn,
          tools: [{ functionDeclarations: tools }],
          toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
          generationConfig: { temperature: 0.35, maxOutputTokens: 1200 },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini error (${modelName}): ${res.status} ${errText}`);
      }
      return (await res.json()) as {
        candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
      };
    }

    const modelCandidates = Array.from(
      new Set([
        Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.0-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-2.5-flash',
      ]),
    );

    let activeModel = modelCandidates[0]!;
    let reply: Awaited<ReturnType<typeof chat>> | null = null;
    let lastGeminiError = '';

    for (const candidate of modelCandidates) {
      try {
        reply = await chat(contents, candidate);
        activeModel = candidate;
        break;
      } catch (e) {
        lastGeminiError = e instanceof Error ? e.message : String(e);
        if (/API_KEY|PERMISSION|UNAUTHENTICATED|401|403/i.test(lastGeminiError)) {
          break;
        }
      }
    }

    if (!reply) {
      console.error('[ask-portl] Gemini unavailable:', lastGeminiError.slice(0, 800));
      const busy =
        /503|UNAVAILABLE|high demand|RESOURCE_EXHAUSTED|429|quota/i.test(lastGeminiError);
      return jsonResponse(502, {
        error: busy
          ? 'Ask Portl is busy right now. Please try again in a moment.'
          : 'Ask Portl could not answer right now. Please try again.',
      });
    }

    let parts = reply.candidates?.[0]?.content?.parts;
    let rounds = 0;

    while (extractFunctionCalls(parts).length > 0 && rounds < 6) {
      rounds += 1;
      const calls = extractFunctionCalls(parts);
      contents.push({ role: 'model', parts: parts ?? [] });

      const responseParts: GeminiPart[] = [];
      for (const call of calls) {
        const result = await runTool(call.name, (call.args ?? {}) as Record<string, unknown>);
        responseParts.push({
          functionResponse: {
            name: call.name,
            response: { result } as Record<string, unknown>,
          },
        });
      }
      contents.push({ role: 'user', parts: responseParts });

      reply = await chat(contents, activeModel);
      parts = reply.candidates?.[0]?.content?.parts;
    }

    const answer =
      extractText(parts) ||
      'I could not find an answer for that. Try rephrasing with a name, date, or amenity.';

    return jsonResponse(200, { answer, tools_used: rounds > 0, role });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[ask-portl] Unhandled error:', message);
    return jsonResponse(500, {
      error: 'Ask Portl could not answer right now. Please try again.',
    });
  }
});
