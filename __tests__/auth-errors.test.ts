import { authErrorMessage } from '@/lib/auth-errors';

describe('authErrorMessage', () => {
  it('returns generic copy when error is empty', () => {
    expect(authErrorMessage(null)).toMatch(/something went wrong/i);
    expect(authErrorMessage(undefined)).toMatch(/something went wrong/i);
    expect(authErrorMessage({ message: '' })).toMatch(/something went wrong/i);
  });

  it('maps SMTP / unexpected_failure dumps to actionable copy', () => {
    expect(authErrorMessage({ message: 'unexpected_failure', code: 'unexpected_failure' })).toMatch(
      /smtp/i,
    );
    expect(authErrorMessage({ message: 'ok', status: 500 })).toMatch(/smtp/i);
    expect(authErrorMessage({ message: '{"status":500,"error":"boom"}' })).toMatch(/smtp/i);
  });

  it('maps missing account and rate-limit cases', () => {
    expect(authErrorMessage({ message: 'Signups not allowed for otp' })).toMatch(/no account found/i);
    expect(authErrorMessage({ message: 'User not found' })).toMatch(/no account found/i);
    expect(authErrorMessage({ message: 'Email rate limit exceeded' })).toMatch(/too many emails/i);
  });

  it('truncates overlong raw messages', () => {
    const long = 'x'.repeat(200);
    expect(authErrorMessage({ message: long })).toMatch(/smtp/i);
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
