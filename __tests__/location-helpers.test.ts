import { distanceMeters, nearestGate, NEAR_HOME_RADIUS_M } from '@/lib/location-helpers';
import type { Gate } from '@/types/database';

function gate(overrides: Partial<Gate> = {}): Gate {
  return {
    id: 'g1',
    society_id: 'soc-1',
    name: 'Main Gate',
    is_active: true,
    sort_order: 0,
    created_at: '',
    latitude: 12.9716,
    longitude: 77.5946,
    ...overrides,
  };
}

describe('location-helpers', () => {
  it('distanceMeters is ~0 for identical points', () => {
    const p = { latitude: 12.97, longitude: 77.59 };
    expect(distanceMeters(p, p)).toBeLessThan(1);
  });

  it('distanceMeters grows for distant points', () => {
    const a = { latitude: 12.9716, longitude: 77.5946 };
    const b = { latitude: 13.0827, longitude: 80.2707 }; // ~Chennai
    const meters = distanceMeters(a, b);
    expect(meters).toBeGreaterThan(200_000);
    expect(meters).toBeLessThan(400_000);
  });

  it('nearestGate skips gates without coordinates', () => {
    const here = { latitude: 12.9716, longitude: 77.5946 };
    expect(nearestGate([gate({ latitude: null, longitude: null })], here)).toBeNull();
  });

  it('nearestGate picks the closest coordinated gate', () => {
    const here = { latitude: 12.9716, longitude: 77.5946 };
    const near = gate({ id: 'near', latitude: 12.972, longitude: 77.595, name: 'Near' });
    const far = gate({ id: 'far', latitude: 13.05, longitude: 77.7, name: 'Far' });
    const best = nearestGate([far, near], here);
    expect(best?.gate.id).toBe('near');
    expect(best?.meters).toBeLessThan(200);
  });

  it('exposes near-home radius used by delivery alerts', () => {
    expect(NEAR_HOME_RADIUS_M).toBe(800);
  });
});
