import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { sceneReady } from '@scenes/genkidama/registry';
import { initStory } from './story';
import { initHero } from './hero';
import { initReveals } from './reveals';
import { initRail } from './rail';

/**
 * Page-level choreography entry point. Waits for the stage to register, then
 * wires scroll to scene. DOM-only pieces (reveals, rail) start immediately.
 */
export async function initAnimations() {
  const reducedMotion = document.documentElement.classList.contains('reduced-motion');
  initReveals(reducedMotion);
  initRail();

  const scene = await sceneReady;
  initHero(scene, reducedMotion);
  initStory(scene, reducedMotion);
  ScrollTrigger.refresh();
}
