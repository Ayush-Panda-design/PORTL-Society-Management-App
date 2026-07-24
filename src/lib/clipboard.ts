import Toast from 'react-native-toast-message';

import { hasNativeModule } from '@/lib/native-module';

type ClipboardModule = typeof import('expo-clipboard');

let clipboardModule: ClipboardModule | null | undefined;

async function loadClipboard(): Promise<ClipboardModule | null> {
  if (clipboardModule !== undefined) return clipboardModule;
  if (!hasNativeModule('ExpoClipboard')) {
    console.info('[clipboard] ExpoClipboard not in this build — run npx expo run:android');
    clipboardModule = null;
    return null;
  }
  try {
    clipboardModule = await import('expo-clipboard');
    return clipboardModule;
  } catch (e) {
    console.info('[clipboard] unavailable:', e);
    clipboardModule = null;
    return null;
  }
}

/** Copy text to the clipboard and show a short toast. */
export async function copyToClipboard(
  text: string,
  label = 'Copied',
): Promise<boolean> {
  const value = text.trim();
  if (!value) return false;

  const Clipboard = await loadClipboard();
  if (!Clipboard) {
    Toast.show({
      type: 'error',
      text1: 'Could not copy',
      text2: 'Clipboard needs a rebuilt Portl app.',
    });
    return false;
  }

  try {
    await Clipboard.setStringAsync(value);
    Toast.show({ type: 'success', text1: label, visibilityTime: 1800 });
    return true;
  } catch (e) {
    Toast.show({
      type: 'error',
      text1: 'Could not copy',
      text2: e instanceof Error ? e.message : undefined,
    });
    return false;
  }
}
