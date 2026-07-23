import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'portl_guard_selected_gate';

export async function getSelectedGateId(societyId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(`${KEY}:${societyId}`);
}

export async function setSelectedGateId(societyId: string, gateId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(`${KEY}:${societyId}`, gateId);
}
