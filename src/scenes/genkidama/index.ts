import { detectQuality, prefersReducedMotion, supportsWebGL } from './quality';
import { registerScene } from './registry';
import type { GenkidamaHandle } from './types';

export type { GenkidamaHandle } from './types';
export { sceneReady, getScene } from './registry';

/**
 * Mount the Genkidama stage into a container. Three.js is loaded lazily so
 * the rest of the page never pays for it; the 2D fallback is used when WebGL
 * is unavailable.
 */
export async function mountGenkidama(container: HTMLElement, labelsRoot?: HTMLElement | null): Promise<GenkidamaHandle> {
  const reducedMotion = prefersReducedMotion();
  let handle: GenkidamaHandle;

  if (supportsWebGL()) {
    const { GenkidamaScene } = await import('./GenkidamaScene');
    handle = new GenkidamaScene(container, {
      quality: detectQuality(),
      reducedMotion,
      labelsRoot: labelsRoot ?? null,
    });
    container.dataset.renderer = 'webgl';
  } else {
    const { FallbackScene } = await import('./fallback2d');
    handle = new FallbackScene(container);
    container.dataset.renderer = 'fallback';
  }

  registerScene(handle);
  container.classList.add('is-ready');
  return handle;
}
