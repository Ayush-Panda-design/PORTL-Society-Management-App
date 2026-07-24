import { getSelectedGateId, setSelectedGateId } from '@/lib/gate-preference';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => {
    if (/[^a-zA-Z0-9._-]/.test(key) || !key) {
      throw new Error(
        'Invalid key provided to SecureStore. Keys must not be empty and contain only alphanumeric characters, ".", "-", and "_".',
      );
    }
    return null;
  }),
  setItemAsync: jest.fn(async (key: string) => {
    if (/[^a-zA-Z0-9._-]/.test(key) || !key) {
      throw new Error(
        'Invalid key provided to SecureStore. Keys must not be empty and contain only alphanumeric characters, ".", "-", and "_".',
      );
    }
  }),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

describe('gate-preference', () => {
  it('uses SecureStore-safe keys for UUID society ids', async () => {
    const societyId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    await expect(getSelectedGateId(societyId)).resolves.toBeNull();
    await expect(setSelectedGateId(societyId, 'gate-1')).resolves.toBeUndefined();
  });

  it('no-ops on empty society id', async () => {
    await expect(getSelectedGateId('')).resolves.toBeNull();
    await expect(setSelectedGateId('  ', 'gate-1')).resolves.toBeUndefined();
  });
});
