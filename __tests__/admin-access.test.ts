import {
  canAccessAdminRoute,
  committeeHomeHref,
  filterLinksByAdminAccess,
  isCommitteeMember,
  isFullAdmin,
} from '@/lib/admin-access';

describe('admin-access', () => {
  it('treats role=admin as full admin', () => {
    expect(isFullAdmin('admin')).toBe(true);
    expect(isFullAdmin('resident')).toBe(false);
    expect(isCommitteeMember('resident', ['notices.manage'])).toBe(true);
    expect(isCommitteeMember('resident', [])).toBe(false);
  });

  it('gates admin-only routes for committee', () => {
    expect(canAccessAdminRoute('roles', 'resident', ['notices.manage'])).toBe(false);
    expect(canAccessAdminRoute('notices', 'resident', ['notices.manage'])).toBe(true);
    expect(canAccessAdminRoute('escalated-visitors', 'resident', ['visitors.manage'])).toBe(
      true,
    );
    expect(canAccessAdminRoute('residents', 'admin', [])).toBe(true);
  });

  it('filters settings links by permission', () => {
    const links = [
      { href: '/(admin)/notices' },
      { href: '/(admin)/roles' },
      { href: '/(admin)/complaints' },
    ];
    const filtered = filterLinksByAdminAccess(links, 'resident', [
      'notices.manage',
      'complaints.manage',
    ]);
    expect(filtered.map((l) => l.href)).toEqual([
      '/(admin)/notices',
      '/(admin)/complaints',
    ]);
  });

  it('picks a useful committee home', () => {
    expect(String(committeeHomeHref(['visitors.manage']))).toContain('escalated-visitors');
    expect(String(committeeHomeHref(['audit.view']))).toContain('audit-log');
  });
});
