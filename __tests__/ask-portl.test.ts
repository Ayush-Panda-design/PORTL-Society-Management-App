import { toUserFriendlyAskPortlMessage } from '@/lib/ask-portl';

describe('toUserFriendlyAskPortlMessage', () => {
  it('returns fallback for empty input', () => {
    expect(toUserFriendlyAskPortlMessage('')).toMatch(/could not answer/i);
    expect(toUserFriendlyAskPortlMessage('   ')).toMatch(/could not answer/i);
  });

  it('maps busy / quota / rate-limit errors', () => {
    expect(toUserFriendlyAskPortlMessage('503 unavailable')).toMatch(/busy/i);
    expect(toUserFriendlyAskPortlMessage('RESOURCE_EXHAUSTED quota')).toMatch(/busy/i);
    expect(toUserFriendlyAskPortlMessage('429 rate limit')).toMatch(/busy/i);
  });

  it('maps config, network, and auth failures', () => {
    expect(toUserFriendlyAskPortlMessage('GEMINI_API_KEY not configured')).toMatch(
      /temporarily unavailable/i,
    );
    expect(toUserFriendlyAskPortlMessage('Edge Function returned a non-2xx status code')).toMatch(
      /check your connection/i,
    );
    expect(toUserFriendlyAskPortlMessage('Missing authorization')).toMatch(/sign in again/i);
    expect(toUserFriendlyAskPortlMessage('active society membership required')).toMatch(
      /active society membership/i,
    );
  });

  it('hides raw JSON / overlong dumps', () => {
    expect(toUserFriendlyAskPortlMessage('{"error":"boom","status":500}')).toMatch(
      /could not answer/i,
    );
    expect(toUserFriendlyAskPortlMessage('Internal provider dump: ' + 'x'.repeat(200))).toMatch(
      /could not answer/i,
    );
  });

  it('passes through short plain assistant errors', () => {
    expect(toUserFriendlyAskPortlMessage('Please type a shorter question.')).toBe(
      'Please type a shorter question.',
    );
  });
});
