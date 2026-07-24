import { backFallbackForSegments } from '@/lib/navigation-back';

describe('backFallbackForSegments', () => {
  it('returns null outside role groups', () => {
    expect(backFallbackForSegments([])).toBeNull();
    expect(backFallbackForSegments(['(auth)', 'login'])).toBeNull();
  });

  it('sends profile back to role home', () => {
    expect(backFallbackForSegments(['(resident)', 'profile'])).toBe('/(resident)');
    expect(backFallbackForSegments(['(admin)', 'profile'])).toBe('/(admin)');
    expect(backFallbackForSegments(['(guard)', 'profile'])).toBe('/(guard)');
  });

  it('routes resident aux tabs to visitors / more', () => {
    expect(backFallbackForSegments(['(resident)', '(tabs)', 'pre-approve'])).toBe(
      '/(resident)/visitors',
    );
    expect(backFallbackForSegments(['(resident)', '(tabs)', 'amenities'])).toBe(
      '/(resident)/more',
    );
    expect(backFallbackForSegments(['(resident)', '(tabs)', 'index'])).toBeNull();
  });

  it('routes admin aux tabs to dashboard or settings', () => {
    expect(backFallbackForSegments(['(admin)', '(tabs)', 'polls'])).toBe('/(admin)');
    expect(backFallbackForSegments(['(admin)', '(tabs)', 'audit-log'])).toBe('/(admin)/settings');
    // href() preserves the group segment string from segments[0] (no leading slash).
    expect(backFallbackForSegments(['(admin)', '(tabs)', 'polls', 'abc'])).toBe('(admin)/polls');
  });

  it('routes guard scan-pass and index fallbacks', () => {
    expect(backFallbackForSegments(['(guard)', '(tabs)', 'scan-pass'])).toBe('/(guard)/verify');
    expect(backFallbackForSegments(['(guard)', '(tabs)', 'index'])).toBe('/(guard)/dashboard');
  });
});
