import { authErrorMessage } from '@/lib/auth-errors';

describe('authErrorMessage', () => {
  it('returns generic copy when error is empty', () => {
    expect(authErrorMessage(null)).toMatch(/something went wrong/i);
    expect(authErrorMessage(undefined)).toMatch(/something went wrong/i);
    expect(authErrorMessage({ message: '' })).toMatch(/something went wrong/i);
  });

  it('maps unexpected_failure dumps to friendly copy', () => {
    expect(authErrorMessage({ message: 'unexpected_failure', code: 'unexpected_failure' })).toMatch(
      /couldn’t send the email|could not send the email|try again/i,
    );
    expect(authErrorMessage({ message: 'ok', status: 500 })).toMatch(/try again/i);
    expect(authErrorMessage({ message: '{"status":500,"error":"boom"}' })).toMatch(/try again/i);
  });

  it('maps missing account and rate-limit cases', () => {
    expect(authErrorMessage({ message: 'Signups not allowed for otp' })).toMatch(/no account found/i);
    expect(authErrorMessage({ message: 'User not found' })).toMatch(/no account found/i);
    expect(authErrorMessage({ message: 'Email rate limit exceeded' })).toMatch(/too many emails/i);
  });

  it('hides developer / redirect wording from users', () => {
    expect(authErrorMessage({ message: 'Redirect URI mismatch: http://localhost:8081' })).toMatch(
      /try again|new email/i,
    );
    expect(authErrorMessage({ message: 'Check Supabase SMTP settings' })).toMatch(/try again|new email/i);
  });

  it('truncates overlong raw messages', () => {
    const long = 'x'.repeat(200);
    expect(authErrorMessage({ message: long })).toMatch(/try again/i);
  });

  it('passes through normal auth messages', () => {
    expect(authErrorMessage({ message: 'Invalid login credentials' })).toBe(
      'Invalid login credentials',
    );
    expect(authErrorMessage({ message: 'Token has expired or is invalid' })).toBe(
      'Token has expired or is invalid',
    );
  });
});
