import { hasNativeModule } from '@/lib/native-module';

type SpeechModule = typeof import('expo-speech');

let speechModule: SpeechModule | null | undefined;

async function loadSpeech(): Promise<SpeechModule | null> {
  if (speechModule !== undefined) return speechModule;
  if (!hasNativeModule('ExpoSpeech')) {
    console.info('[speech] ExpoSpeech not in this build — run npx expo run:android');
    speechModule = null;
    return null;
  }
  try {
    speechModule = await import('expo-speech');
    return speechModule;
  } catch (e) {
    console.info('[speech] unavailable — rebuild the native app:', e);
    speechModule = null;
    return null;
  }
}

export async function speakText(text: string): Promise<boolean> {
  const Speech = await loadSpeech();
  if (!Speech) return false;
  try {
    Speech.stop();
    Speech.speak(text.slice(0, 600), { rate: 1.0, pitch: 1.0 });
    return true;
  } catch {
    return false;
  }
}

export async function stopSpeaking(): Promise<void> {
  const Speech = await loadSpeech();
  try {
    Speech?.stop();
  } catch {
    // ignore
  }
}
