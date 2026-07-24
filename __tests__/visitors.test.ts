import {
  flatLabel,
  flatTowerName,
  formatDateTime,
  formatRelativeTime,
  statusColor,
  statusLabel,
  typeLabel,
} from '@/lib/visitors';
import type { VisitorWithFlat } from '@/types/database';

describe('visitor display helpers', () => {
  it('formatRelativeTime covers just now, minutes, and hours', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('Just now');
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5m ago');
    expect(formatRelativeTime(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe('3h ago');
  });

  it('formatDateTime returns em dash for empty values', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatDateTime('2026-07-24T10:30:00.000Z')).toMatch(/Jul/);
  });

  it('maps status labels and colors', () => {
    expect(statusLabel('pending')).toBe('Pending');
    expect(statusLabel('approved')).toBe('Approved');
    expect(statusLabel('rejected')).toBe('Rejected');
    expect(statusLabel('checked_in')).toBe('Checked in');
    expect(statusLabel('checked_out')).toBe('Checked out');

    expect(statusColor('pending').icon).toBe('#D97706');
    expect(statusColor('approved').icon).toBe('#059669');
    expect(statusColor('rejected').icon).toBe('#DC2626');
    expect(statusColor('checked_in').icon).toBe('#2563EB');
  });

  it('typeLabel capitalizes visitor type', () => {
    expect(typeLabel('guest')).toBe('Guest');
    expect(typeLabel('delivery')).toBe('Delivery');
  });

  it('flatTowerName and flatLabel handle object/array tower shapes', () => {
    expect(flatTowerName(null)).toBeUndefined();
    expect(flatTowerName({ name: 'Oak' })).toBe('Oak');
    expect(flatTowerName([{ name: 'Pine' }])).toBe('Pine');

    const withTower = {
      flats: { number: '101', towers: { name: 'Maple' } },
    } as VisitorWithFlat;
    expect(flatLabel(withTower)).toBe('Maple · 101');

    const noTower = {
      flats: { number: '202', towers: null },
    } as VisitorWithFlat;
    expect(flatLabel(noTower)).toBe('Flat 202');

    const missing = { flats: null } as VisitorWithFlat;
    expect(flatLabel(missing)).toBe('Flat ?');
  });
});
