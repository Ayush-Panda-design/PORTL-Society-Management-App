import { requireOptionalNativeModule } from 'expo';

/**
 * True when the named Expo native module is linked in this binary.
 * Use before `import('expo-…')` so missing modules don't redbox.
 */
export function hasNativeModule(name: string): boolean {
  try {
    return requireOptionalNativeModule(name) != null;
  } catch {
    return false;
  }
}
