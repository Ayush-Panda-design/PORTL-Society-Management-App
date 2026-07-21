import { friendlyInviteError, inviteErrorKind } from '@/lib/invite-errors';

describe('invite-errors', () => {
  it('maps expired and invalid invite messages', () => {
    expect(inviteErrorKind('Invite expired')).toBe('expired');
    expect(friendlyInviteError('Invite expired', 'fallback')).toMatch(/expired/i);

    expect(inviteErrorKind('invalid invite code')).toBe('invalid');
    expect(friendlyInviteError('invalid invite', 'fallback')).toMatch(/doesn’t match/i);
  });

  it('maps membership conflicts', () => {
    expect(inviteErrorKind('You already belong to a society')).toBe('already_member');
    expect(inviteErrorKind('already pending approval')).toBe('pending');
  });

  it('falls back when message empty', () => {
    expect(friendlyInviteError('', 'Try again')).toBe('Try again');
    expect(friendlyInviteError(null, 'Try again')).toBe('Try again');
  });
});
