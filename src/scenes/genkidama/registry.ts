import type { GenkidamaHandle } from './types';

/**
 * A tiny rendezvous point between the visual island and the scroll
 * choreography. Both are separate Astro scripts; whichever runs first waits
 * for the other through this promise.
 */
let resolveHandle: ((h: GenkidamaHandle) => void) | null = null;
let current: GenkidamaHandle | null = null;

export const sceneReady: Promise<GenkidamaHandle> = new Promise((resolve) => {
  resolveHandle = resolve;
});

export function registerScene(handle: GenkidamaHandle) {
  current = handle;
  resolveHandle?.(handle);
  // Handy for tuning from the console during art direction.
  (window as unknown as { genkidama?: GenkidamaHandle }).genkidama = handle;
}

export function getScene(): GenkidamaHandle | null {
  return current;
}
