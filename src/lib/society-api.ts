import { supabase } from '@/lib/supabase';
import { friendlyInviteError } from '@/lib/invite-errors';
import { notifyJoinRequest, notifyJoinReviewed } from '@/lib/notifications';
import type {
  CreateSocietyResult,
  DiscoverableSociety,
  InviteCode,
  InviteFlatOption,
  InviteRole,
  JoinSocietyResult,
  ProfileWithFlat,
  ResolvedInvite,
} from '@/types/database';

function rpcError(error: { message: string } | null, fallback: string): never {
  throw new Error(friendlyInviteError(error?.message, fallback));
}

/** PostgREST jsonb RPCs sometimes return a parsed array, sometimes a JSON string. */
function asJsonArray<T>(data: unknown): T[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === 'string') {
    try {
      const parsed: unknown = JSON.parse(data);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asJsonObject(data: unknown): Record<string, unknown> | null {
  if (data == null) return null;
  if (typeof data === 'string') {
    try {
      const parsed: unknown = JSON.parse(data);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  if (typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return null;
}

function cleanUuid(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function createSociety(input: {
  name: string;
  address: string;
  city?: string | null;
  area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<CreateSocietyResult> {
  const { data, error } = await supabase.rpc('create_society', {
    p_name: input.name,
    p_address: input.address,
    p_city: input.city ?? null,
    p_area: input.area ?? null,
    p_latitude: input.latitude ?? null,
    p_longitude: input.longitude ?? null,
  });
  if (error) rpcError(error, 'Could not create society');
  return data as CreateSocietyResult;
}

export async function resolveInviteCode(code: string): Promise<ResolvedInvite> {
  const { data, error } = await supabase.rpc('resolve_invite_code', {
    p_code: code.trim(),
  });
  if (error) rpcError(error, 'Invalid invite code');
  const resolved = data as ResolvedInvite;
  return {
    ...resolved,
    flats: resolved.flats ?? [],
  };
}

export async function joinSociety(input: {
  code: string;
  flatId?: string | null;
}): Promise<JoinSocietyResult> {
  const { data, error } = await supabase.rpc('join_society', {
    p_code: input.code.trim(),
    p_flat_id: input.flatId ?? null,
  });
  if (error) rpcError(error, 'Could not join society');
  const result = data as JoinSocietyResult;

  void (async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = user
        ? await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
        : { data: null };
      const name = profile?.full_name?.trim() || user?.email || 'Someone';
      await notifyJoinRequest({
        societyId: result.society_id,
        requesterName: name,
        role: result.role,
      });
    } catch (e) {
      console.warn('[push] joinSociety notify failed:', e);
    }
  })();

  return result;
}

export async function searchSocieties(query: string): Promise<DiscoverableSociety[]> {
  const { data, error } = await supabase.rpc('search_societies', {
    p_query: query.trim(),
    p_limit: 25,
  });
  if (error) rpcError(error, 'Could not search societies');
  return asJsonArray<DiscoverableSociety>(data);
}

export async function getSocietyFlats(societyId: string): Promise<InviteFlatOption[]> {
  const { data, error } = await supabase.rpc('get_society_flats', {
    p_society_id: societyId,
  });
  if (error) rpcError(error, 'Could not load flats');
  return asJsonArray<InviteFlatOption>(data);
}

export async function requestJoinSociety(input: {
  societyId: string;
  role: InviteRole;
  flatId?: string | null;
}): Promise<JoinSocietyResult> {
  const societyId = cleanUuid(input.societyId);
  if (!societyId) {
    throw new Error('Select a society from the search results');
  }

  const flatId =
    input.role === 'resident' ? cleanUuid(input.flatId) : null;

  if (input.role === 'resident' && !flatId) {
    throw new Error('Select a flat to join as a resident');
  }

  const { data, error } = await supabase.rpc('request_join_society', {
    p_society_id: societyId,
    p_role: input.role,
    p_flat_id: flatId,
  });
  if (error) rpcError(error, 'Could not request to join');

  const result = asJsonObject(data) as JoinSocietyResult | null;
  if (!result?.society_id || result.status !== 'pending') {
    throw new Error(
      'Join request did not complete. Ask your admin to confirm the society is open for discovery, then try again.',
    );
  }

  void (async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = user
        ? await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
        : { data: null };
      const name = profile?.full_name?.trim() || user?.email || 'Someone';
      await notifyJoinRequest({
        societyId: result.society_id,
        requesterName: name,
        role: result.role ?? input.role,
      });
    } catch (e) {
      console.warn('[push] requestJoinSociety notify failed:', e);
    }
  })();

  return result;
}

export async function listSocietyInviteCodes(): Promise<InviteCode[]> {
  const { data, error } = await supabase.rpc('list_society_invite_codes');
  if (error) rpcError(error, 'Could not load invite codes');
  return (data as InviteCode[]) ?? [];
}

export async function regenerateInviteCode(role: InviteRole): Promise<{ role: InviteRole; code: string }> {
  const { data, error } = await supabase.rpc('regenerate_invite_code', {
    p_role: role,
  });
  if (error) rpcError(error, 'Could not regenerate invite code');
  return data as { role: InviteRole; code: string };
}

export async function reviewJoinRequest(input: {
  userId: string;
  approve: boolean;
}): Promise<{ user_id: string; status: 'active' | 'rejected' }> {
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();
  let societyName: string | null = null;
  if (adminUser) {
    const { data: admin } = await supabase
      .from('profiles')
      .select('society_id')
      .eq('id', adminUser.id)
      .maybeSingle();
    if (admin?.society_id) {
      societyName = await fetchSocietyName(admin.society_id);
    }
  }

  const { data, error } = await supabase.rpc('review_join_request', {
    p_user_id: input.userId,
    p_approve: input.approve,
  });
  if (error) rpcError(error, 'Could not update join request');
  const result = data as { user_id: string; status: 'active' | 'rejected' };

  void notifyJoinReviewed({
    userId: input.userId,
    approve: input.approve,
    societyName,
  });

  return result;
}

export async function fetchPendingMembers(societyId: string): Promise<ProfileWithFlat[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      *,
      flats (
        id,
        number,
        towers (
          id,
          name
        )
      )
    `,
    )
    .eq('society_id', societyId)
    .eq('status', 'pending')
    .in('role', ['resident', 'guard'])
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  return ((data as ProfileWithFlat[]) ?? []).map((row) => {
    const flats = row.flats;
    if (!flats) return row;
    const towers = Array.isArray(flats.towers) ? flats.towers[0] ?? null : flats.towers;
    return { ...row, flats: { ...flats, towers } };
  });
}

export async function fetchSocietyName(societyId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('societies')
    .select('name')
    .eq('id', societyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.name ?? null;
}
