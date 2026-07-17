import { supabase } from '@/lib/supabase';
import type {
  CreateSocietyResult,
  InviteCode,
  InviteRole,
  JoinSocietyResult,
  ProfileWithFlat,
  ResolvedInvite,
} from '@/types/database';

function rpcError(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message ?? fallback);
}

export async function createSociety(input: {
  name: string;
  address: string;
}): Promise<CreateSocietyResult> {
  const { data, error } = await supabase.rpc('create_society', {
    p_name: input.name,
    p_address: input.address,
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
  return data as JoinSocietyResult;
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
  const { data, error } = await supabase.rpc('review_join_request', {
    p_user_id: input.userId,
    p_approve: input.approve,
  });
  if (error) rpcError(error, 'Could not update join request');
  return data as { user_id: string; status: 'active' | 'rejected' };
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
