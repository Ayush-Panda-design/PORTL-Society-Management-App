import { supabase } from '@/lib/supabase';
import type { Gate } from '@/types/database';

export async function fetchGates(societyId: string): Promise<Gate[]> {
  const { data, error } = await supabase
    .from('gates')
    .select('*')
    .eq('society_id', societyId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Gate[];
}

export async function fetchActiveGates(societyId: string): Promise<Gate[]> {
  const gates = await fetchGates(societyId);
  return gates.filter((g) => g.is_active);
}

export async function upsertGate(input: {
  id?: string;
  societyId: string;
  name: string;
  isActive?: boolean;
  sortOrder?: number;
}): Promise<Gate> {
  if (input.id) {
    const { data, error } = await supabase
      .from('gates')
      .update({
        name: input.name.trim(),
        is_active: input.isActive ?? true,
        sort_order: input.sortOrder ?? 0,
      })
      .eq('id', input.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as Gate;
  }

  const { data, error } = await supabase
    .from('gates')
    .insert({
      society_id: input.societyId,
      name: input.name.trim(),
      is_active: input.isActive ?? true,
      sort_order: input.sortOrder ?? 0,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Gate;
}

export async function deleteGate(id: string): Promise<void> {
  const { error } = await supabase.from('gates').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
