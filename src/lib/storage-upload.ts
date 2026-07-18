import { supabase } from '@/lib/supabase';

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);

export function guessImageExt(uri: string, mimeType?: string | null): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/heic' || mimeType === 'image/heif') return 'heic';

  const fromUri = uri.split('?')[0]?.split('.').pop()?.toLowerCase();
  if (fromUri && IMAGE_EXT.has(fromUri)) {
    return fromUri === 'jpeg' ? 'jpg' : fromUri;
  }
  return 'jpg';
}

export function guessImageContentType(ext: string, mimeType?: string | null): string {
  if (mimeType?.startsWith('image/')) return mimeType;
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
    case 'heif':
      return 'image/heic';
    default:
      return 'image/jpeg';
  }
}

/** Decode ImagePicker / FileSystem base64 into an ArrayBuffer for Supabase Storage. */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const cleaned = base64.includes(',') ? base64.split(',')[1]! : base64;
  const binary = globalThis.atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function readLocalImageBase64(uri: string): Promise<string> {
  // Prefer expo-file-system — fetch(file://) / fetch(content://) often fails on Android
  // with "Network request failed".
  try {
    const FileSystem = await import('expo-file-system/legacy');
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (base64) return base64;
  } catch {
    // Fall through to fetch for web / environments without the native module.
  }

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Could not read image (${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return globalThis.btoa(binary);
}

/**
 * Upload a local ImagePicker image to a public Supabase Storage bucket.
 * Prefer passing `base64` from ImagePicker (`base64: true`) — most reliable on Android.
 */
export async function uploadLocalImage(params: {
  bucket: string;
  /** Folder prefix — society id, or `pending/{userId}` before join. */
  societyId: string;
  uri: string;
  mimeType?: string | null;
  /** Raw base64 from ImagePicker (no data: prefix required). */
  base64?: string | null;
}): Promise<{ publicUrl: string | null; error: string | null }> {
  const { bucket, societyId, uri, mimeType, base64 } = params;

  try {
    const ext = guessImageExt(uri, mimeType);
    const contentType = guessImageContentType(ext, mimeType);
    const path = `${societyId}/${Date.now()}.${ext}`;

    const rawBase64 = base64?.trim() ? base64 : await readLocalImageBase64(uri);
    const arrayBuffer = base64ToArrayBuffer(rawBase64);

    if (arrayBuffer.byteLength === 0) {
      return { publicUrl: null, error: 'Image file is empty' };
    }

    const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

    if (error) {
      return { publicUrl: null, error: error.message };
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { publicUrl: data.publicUrl, error: null };
  } catch (e) {
    return {
      publicUrl: null,
      error: e instanceof Error ? e.message : 'Photo upload failed',
    };
  }
}
