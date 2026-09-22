import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { dom } from '@config/animation';
import type { GenkidamaHandle } from '@scenes/genkidama/types';

gsap.registerPlugin(ScrollTrigger);

/**
 * Hero choreography.
 *  - Wordmark letters converge from dispersed positions into the word: the
 *    first Genkidama gesture the visitor sees.
 *  - On scroll the letters disperse again as the energy takes over.
 *  - The live readout mirrors scene state.
 */
export function initHero(scene: GenkidamaHandle, reducedMotion: boolean) {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;
  const letters = Array.from(hero.querySelectorAll<HTMLElement>('.wordmark__letter'));
  const reveals = Array.from(hero.querySelectorAll<HTMLElement>('[data-reveal]'));
  const mid = (letters.length - 1) / 2;

  if (!reducedMotion && letters.length) {
    const intro = gsap.timeline({ defaults: { ease: 'power4.out' }, paused: true });
    intro.fromTo(
      letters,
      {
        opacity: 0,
        x: (i) => (i - mid) * 46,
        y: (i) => Math.sin(i * 1.7) * 28,
        filter: 'blur(6px)',
      },
      {
        opacity: 1,
        x: 0,
        y: 0,
        filter: 'blur(0px)',
        duration: dom.wordmarkConverge,
        stagger: { each: dom.wordmarkStagger, from: 'center' },
      },
    );
    intro.to(reveals, { opacity: 1, duration: 0.9, stagger: 0.12, ease: 'power2.out' }, '-=0.9');
    // Wait for the display face so letters do not reflow mid-flight, but never
    // hold the intro hostage to font loading.
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    const timeout = new Promise<void>((r) => setTimeout(r, 1200));
    Promise.race([fontsReady, timeout]).then(() => intro.play(), () => intro.play());

    // Disperse on scroll: the word gives way to the system.
    gsap.to(letters, {
      x: (i) => (i - mid) * 34,
      opacity: 0.08,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.4 },
    });
    gsap.to(reveals, {
      opacity: 0,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: '60% top', scrub: 0.4 },
    });
  } else {
    gsap.set(letters, { opacity: 1 });
    gsap.set(reveals, { opacity: 1 });
  }

  // Live readout ------------------------------------------------------------
  const out = {
    energy: hero.querySelector<HTMLElement>('[data-readout="energy"]'),
    phase: hero.querySelector<HTMLElement>('[data-readout="phase"]'),
    streams: hero.querySelector<HTMLElement>('[data-readout="streams"]'),
    fps: hero.querySelector<HTMLElement>('[data-readout="fps"]'),
    renderer: hero.querySelector<HTMLElement>('[data-readout="renderer"]'),
  };
  if (out.renderer) out.renderer.textContent = scene.kind === 'webgl' ? 'WEBGL' : '2D';
  // The WebGL scene ticks every frame, so the readout is throttled; the 2D
  // fallback only ticks on scroll and must not be.
  const every = scene.kind === 'webgl' ? 6 : 1;
  let frame = 0;
  scene.onTick((info) => {
    if (frame++ % every) return;
    if (out.energy) out.energy.textContent = info.energy.toFixed(2);
    if (out.phase) out.phase.textContent = info.phase.toUpperCase();
    if (out.streams) out.streams.textContent = info.activeStreams.toFixed(1);
    if (out.fps) out.fps.textContent = info.fps ? String(Math.round(info.fps)).padStart(2, '0') : '--';
  });
}
