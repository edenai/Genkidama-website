import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { gathering as cfg } from '@config/animation';

gsap.registerPlugin(ScrollTrigger);

/**
 * DOM side of the Gathering (story phase 06). The scene side lives in
 * config/animation `gathering` + scenes/genkidama/state; this module only
 * choreographs the sticky block's text:
 *  - the phase marker appears as the silence begins,
 *  - the wordmark re-forms during the convergence, letters drawn in from far
 *    out like the particles (a cousin of the hero gesture, not a copy: the
 *    hero's own timeline in hero.ts is untouched and scoped to [data-hero]),
 *  - the signals settle in once the system holds.
 * One scrubbed timeline whose 0..1 is the same progress the scene receives
 * for this block (same trigger, same start/end), so DOM and scene agree.
 */
export function initGathering(reducedMotion: boolean) {
  const block = document.querySelector<HTMLElement>('[data-gathering]');
  if (!block) return;
  const marker = block.querySelector<HTMLElement>('[data-gathering-marker]');
  const word = block.querySelector<HTMLElement>('[data-gathering-word] .wordmark');
  const letters = Array.from(block.querySelectorAll<HTMLElement>('.wordmark__letter'));
  const signals = block.querySelector<HTMLElement>('[data-gathering-signals]');

  if (reducedMotion || !letters.length) {
    // Everything present and charged; the scene settles toward its end state.
    gsap.set([marker, signals, ...letters].filter(Boolean), { opacity: 1 });
    word?.classList.add('is-charged');
    return;
  }

  const mid = (letters.length - 1) / 2;
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: block,
      start: 'top center',
      end: 'bottom center',
      scrub: 0.5,
      onUpdate: (self) => word?.classList.toggle('is-charged', self.progress >= cfg.surgeAt),
    },
  });

  // A scrubbed timeline maps scroll progress onto its *duration*, which GSAP
  // takes from the last child. Pin the duration to exactly 1 so the positions
  // below are the same fractions the scene's `gathering` schedule uses.
  tl.set({}, {}, 1);

  // Silence: only the marker, so the visitor knows where they are.
  if (marker) tl.fromTo(marker, { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.02);

  // Convergence: the name gathers. Letters arrive from far out, large and
  // unfocused, and lock into the word as the core reaches its maximum.
  const converge = cfg.convergeEnd - cfg.silenceEnd;
  tl.fromTo(
    letters,
    {
      opacity: 0,
      x: (i: number) => (i - mid) * 72,
      y: (i: number) => Math.sin(i * 2.3) * 40,
      scale: 1.35,
      filter: 'blur(10px)',
    },
    {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      duration: converge,
      ease: 'power3.out',
      stagger: { each: 0.008, from: 'center' },
    },
    cfg.silenceEnd + 0.02,
  );

  // Hold: the readings settle under the name; the marker steps back.
  if (signals) tl.fromTo(signals, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.1, ease: 'power2.out' }, cfg.convergeEnd);
  if (marker) tl.to(marker, { opacity: 0.4, duration: 0.1 }, cfg.convergeEnd);
}
