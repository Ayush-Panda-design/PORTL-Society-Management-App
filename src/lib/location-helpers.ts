import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { Gate } from '@/types/database';

export type Coords = { latitude: number; longitude: number };

type LocationModule = typeof import('expo-location');

let locationModule: LocationModule | null | undefined;

async function loadLocation(): Promise<LocationModule | null> {
  if (locationModule !== undefined) return locationModule;
  if (Platform.OS === 'web') {
    locationModule = null;
    return null;
  }
  try {
    locationModule = await import('expo-location');
    return locationModule;
  } catch (e) {
    console.info('[location] unavailable — rebuild the native app:', e);
    locationModule = null;
    return null;
  }
}

/** Haversine distance in meters. */
export function distanceMeters(a: Coords, b: Coords): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export async function ensureForegroundLocation(): Promise<boolean> {
  const Location = await loadLocation();
  if (!Location) return false;
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === 'granted') return true;
  const asked = await Location.requestForegroundPermissionsAsync();
  return asked.status === 'granted';
}

export async function getCurrentCoords(): Promise<Coords | null> {
  const Location = await loadLocation();
  if (!Location) return null;
  if (!(await ensureForegroundLocation())) return null;
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  } catch {
    return null;
  }
}

export async function watchPosition(
  onUpdate: (coords: Coords) => void,
): Promise<{ remove: () => void } | null> {
  const Location = await loadLocation();
  if (!Location) return null;
  if (!(await ensureForegroundLocation())) return null;

  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 50,
      timeInterval: 15_000,
    },
    (pos) => {
      onUpdate({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    },
  );
}

export async function fetchSocietyCoords(
  societyId: string,
): Promise<(Coords & { name: string | null }) | null> {
  const { data, error } = await supabase
    .from('societies')
    .select('latitude, longitude, name')
    .eq('id', societyId)
    .maybeSingle();

  if (error || data?.latitude == null || data?.longitude == null) return null;
  return {
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    name: (data.name as string | null) ?? null,
  };
}

/**
 * Pick the nearest gate that has coordinates; otherwise null
 * (caller should keep preference / first gate).
 */
export function nearestGate(
  gates: Gate[],
  here: Coords,
): { gate: Gate; meters: number } | null {
  let best: { gate: Gate; meters: number } | null = null;
  for (const gate of gates) {
    if (gate.latitude == null || gate.longitude == null) continue;
    const meters = distanceMeters(here, {
      latitude: Number(gate.latitude),
      longitude: Number(gate.longitude),
    });
    if (!best || meters < best.meters) best = { gate, meters };
  }
  return best;
}

/** Rough "5 minutes away" radius for walking/driving approach (~800m). */
export const NEAR_HOME_RADIUS_M = 800;

export async function isNearSocietyHome(societyId: string): Promise<{
  near: boolean;
  meters: number | null;
  societyName: string | null;
}> {
  const [here, home] = await Promise.all([
    getCurrentCoords(),
    fetchSocietyCoords(societyId),
  ]);
  if (!here || !home) return { near: false, meters: null, societyName: home?.name ?? null };
  const meters = distanceMeters(here, home);
  return {
    near: meters <= NEAR_HOME_RADIUS_M,
    meters,
    societyName: home.name,
  };
}

export async function isLocationAvailable(): Promise<boolean> {
  return (await loadLocation()) != null;
}
