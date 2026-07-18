/** Map PostgREST / RPC messages to clearer invite & join copy. */
export function friendlyInviteError(raw: string | null | undefined, fallback: string): string {
  const message = (raw ?? '').trim();
  if (!message) return fallback;

  const lower = message.toLowerCase();

  if (lower.includes('expired')) {
    return 'This invite code has expired. Ask your society admin to regenerate it and share the new code.';
  }
  if (lower.includes('no longer valid') || lower.includes('revoked')) {
    return 'This invite code is no longer valid. Ask your society admin for a fresh code.';
  }
  if (lower.includes('invalid invite')) {
    return 'That invite code doesn’t match any society. Check for typos, or search for your society instead.';
  }
  if (lower.includes('already belong')) {
    return 'You’re already a member of a society. Sign out and use a different account to join another one.';
  }
  if (lower.includes('already pending')) {
    return 'Your join request is already waiting for admin approval. You’ll get access once they approve it.';
  }
  if (lower.includes('select a flat')) {
    return 'Pick your flat before requesting to join as a resident.';
  }
  if (lower.includes('no flats') || lower.includes('flat does not belong')) {
    return 'This society isn’t set up with flats yet, or the flat is invalid. Ask the admin to add towers and flats.';
  }
  if (lower.includes('not open for discovery') || lower.includes('society not found')) {
    return 'That society isn’t available to join from search. Try an invite code, or ask the office for help.';
  }
  if (lower.includes('not authenticated')) {
    return 'Your session expired. Sign in again, then try joining.';
  }

  // Strip PostgREST noise like "PGRST..." prefixes when present
  const cleaned = message.replace(/^.*?:\s*/, '').trim();
  return cleaned || fallback;
}

export function inviteErrorKind(
  raw: string | null | undefined,
): 'expired' | 'invalid' | 'already_member' | 'pending' | 'other' {
  const lower = (raw ?? '').toLowerCase();
  if (lower.includes('expired')) return 'expired';
  if (lower.includes('invalid') || lower.includes('no longer valid')) return 'invalid';
  if (lower.includes('already belong')) return 'already_member';
  if (lower.includes('already pending')) return 'pending';
  return 'other';
}
