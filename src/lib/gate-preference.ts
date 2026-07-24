import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY_PREFIX = 'portl_guard_selected_gate';

/** SecureStore only allows [A-Za-z0-9._-] — never use ":" or empty keys. */
function preferenceKey(societyId: string): string | null {
  const id = societyId.trim();
  if (!id) return null;
  const safe = id.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${KEY_PREFIX}_${safe}`;
}

export async function getSelectedGateId(societyId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const key = preferenceKey(societyId);
  if (!key) return null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setSelectedGateId(societyId: string, gateId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const key = preferenceKey(societyId);
  if (!key || !gateId.trim()) return;
  try {
    await SecureStore.setItemAsync(key, gateId);
  } catch {
    // Preference is best-effort; gate can still be chosen in-session.
  }
}
