import {
  idsForSocietyMembers,
  notifyUsers,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import type { Broadcast, BroadcastSeverity } from '@/types/database';

export async function fetchBroadcasts(societyId: string): Promise<Broadcast[]> {
  const { data, error } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('society_id', societyId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as Broadcast[];
}

export async function createBroadcast(input: {
  societyId: string;
  title: string;
  body: string;
  severity: BroadcastSeverity;
  createdBy: string;
}): Promise<Broadcast> {
  const { data, error } = await supabase
    .from('broadcasts')
    .insert({
      society_id: input.societyId,
      title: input.title.trim(),
      body: input.body.trim(),
      severity: input.severity,
      created_by: input.createdBy,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  const broadcast = data as Broadcast;
  const members = await idsForSocietyMembers(input.societyId);

  const prefix =
    input.severity === 'critical'
      ? 'Critical'
      : input.severity === 'urgent'
        ? 'Alert'
        : 'Broadcast';

  await notifyUsers({
    userIds: members,
    title: `${prefix}: ${input.title.trim()}`,
    body: input.body.trim(),
    data: {
      type: 'broadcast',
      societyId: input.societyId,
      broadcastId: broadcast.id,
    },
    excludeUserId: input.createdBy,
  });

  return broadcast;
}

export async function deleteBroadcast(id: string): Promise<void> {
  const { error } = await supabase.from('broadcasts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
