import { supabase } from '@/lib/supabase';
import { notifyFlatOfVisitorEntry } from '@/lib/visitors';

type MarkVisitorEntryParams = {
  visitorId: string;
  guardId: string;
  societyId: string;
  flatId: string | null;
  visitorName: string;
  entryGateId: string | null;
  /** When set, updates visitors.photo_url before check-in (pre-approved guests). */
  photoUrl?: string | null;
};

/**
 * Shared guard check-in: write visitor_logs then status=checked_in, with error surfacing.
 */
export async function markVisitorEntry(
  params: MarkVisitorEntryParams,
): Promise<{ error: string | null }> {
  const {
    visitorId,
    guardId,
    societyId,
    flatId,
    visitorName,
    entryGateId,
    photoUrl,
  } = params;

  if (photoUrl) {
    const { error: photoError } = await supabase
      .from('visitors')
      .update({ photo_url: photoUrl })
      .eq('id', visitorId)
      .eq('society_id', societyId);
    if (photoError) return { error: photoError.message };
  }

  const { error: logError } = await supabase.from('visitor_logs').insert({
    visitor_id: visitorId,
    entry_time: new Date().toISOString(),
    guard_id: guardId,
    entry_gate_id: entryGateId,
  });
  if (logError) return { error: logError.message };

  const { error: updateError } = await supabase
    .from('visitors')
    .update({ status: 'checked_in' })
    .eq('id', visitorId)
    .eq('society_id', societyId);
  if (updateError) return { error: updateError.message };

  if (flatId) {
    void notifyFlatOfVisitorEntry({
      flatId,
      societyId,
      visitorName,
      visitorId,
    });
  }

  return { error: null };
}

export function isVisitorPassExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}
