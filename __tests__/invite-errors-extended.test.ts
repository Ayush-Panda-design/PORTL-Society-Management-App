import { friendlyInviteError, inviteErrorKind } from '@/lib/invite-errors';

describe('invite-errors (extended)', () => {
  it('maps revoked / invalid / flat setup messages', () => {
    expect(inviteErrorKind('Invite no longer valid')).toBe('invalid');
    expect(friendlyInviteError('Invite revoked by admin', 'x')).toMatch(/no longer valid/i);
    expect(friendlyInviteError('Please select a flat', 'x')).toMatch(/pick your flat/i);
    expect(friendlyInviteError('Society has no flats configured', 'x')).toMatch(/towers and flats/i);
  });

  it('maps discovery, auth, and migration/schema failures', () => {
    expect(friendlyInviteError('Society not open for discovery', 'x')).toMatch(/invite code/i);
    expect(friendlyInviteError('Not authenticated', 'x')).toMatch(/session expired/i);
    expect(friendlyInviteError('Could not find the function in the schema cache', 'x')).toMatch(
      /database migration/i,
    );
    expect(friendlyInviteError('invalid input syntax for type uuid', 'x')).toMatch(
      /pick your society/i,
    );
  });

  it('strips PostgREST prefixes and falls back for unknown noise', () => {
    expect(friendlyInviteError('PGRST202: Something specific happened', 'x')).toBe(
      'Something specific happened',
    );
    expect(inviteErrorKind('totally unrelated')).toBe('other');
  });
});
