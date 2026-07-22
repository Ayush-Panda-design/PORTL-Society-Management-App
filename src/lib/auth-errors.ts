/**
 * Turn Supabase Auth error payloads into short UI copy.
 * 500 / unexpected_failure on OTP is almost always SMTP misconfiguration.
 */
export function authErrorMessage(error: { message?: string; code?: string; status?: number } | null | undefined): string {
  if (!error?.message) return 'Something went wrong. Try again.';

  const raw = error.message.trim();
  const lower = raw.toLowerCase();
  const code = (error.code ?? '').toLowerCase();

  const looksLikeServerDump =
    raw.startsWith('{') ||
    lower.includes('unexpected_failure') ||
    lower.includes('"status":500') ||
    error.status === 500;

  if (looksLikeServerDump || code === 'unexpected_failure') {
    return 'Could not send email. Check Supabase SMTP settings (sender address, host, and API key), then try again.';
  }

  if (lower.includes('signups not allowed') || lower.includes('user not found')) {
    return 'No account found for this email. Create an account first, or use password sign-in.';
  }

  if (lower.includes('rate limit') || lower.includes('email rate')) {
    return 'Too many emails sent. Wait a minute and try again.';
  }

  // Keep normal Auth messages (invalid login, wrong OTP, etc.)
  if (raw.length > 180) {
    return 'Something went wrong sending the email. Check SMTP in Supabase and try again.';
  }

  return raw;
}
