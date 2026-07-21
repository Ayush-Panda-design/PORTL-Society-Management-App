import type { Href } from 'expo-router';

/** Runtime-valid paths; typed routes omit many stack/tab URLs in generated unions. */
export function href(path: string): Href {
  return path as Href;
}
