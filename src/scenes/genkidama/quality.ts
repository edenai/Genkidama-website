import { qualityProfiles, type QualityProfile } from '@config/visual';

/** Whether a WebGL2 (or WebGL1) context can be created at all. */
export function supportsWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Choose a quality profile from cheap device signals. This is a starting
 * point; the scene also measures frame time and steps down if needed.
 */
export function detectQuality(): QualityProfile {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const mobileUA = /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent);
  const width = window.innerWidth;
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 8;

  if (mobileUA || width < 640) return qualityProfiles.low;
  if (coarse || width < 1024 || cores <= 4 || memory <= 4) return qualityProfiles.medium;
  return qualityProfiles.high;
}
