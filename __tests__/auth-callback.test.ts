import { authParamsFromUrl, isAuthSessionMissingError } from '@/lib/auth-callback';

describe('authParamsFromUrl', () => {
  it('reads implicit tokens from the hash fragment', () => {
    const params = authParamsFromUrl(
      'portl://callback#access_token=aaa&refresh_token=bbb&type=signup',
    );
    expect(params.access_token).toBe('aaa');
    expect(params.refresh_token).toBe('bbb');
    expect(params.type).toBe('signup');
  });

  it('reads PKCE code from the query string', () => {
    const params = authParamsFromUrl('portl://callback?code=abc123&type=signup');
    expect(params.code).toBe('abc123');
    expect(params.type).toBe('signup');
  });

  it('reads token_hash from the query string', () => {
    const params = authParamsFromUrl(
      'portl://callback?token_hash=hashvalue&type=signup',
    );
    expect(params.token_hash).toBe('hashvalue');
    expect(params.type).toBe('signup');
  });
});

describe('isAuthSessionMissingError', () => {
  it('detects the classic Supabase message', () => {
    expect(isAuthSessionMissingError({ message: 'Auth session missing!' })).toBe(true);
    expect(isAuthSessionMissingError(new Error('network'))).toBe(false);
  });
});
