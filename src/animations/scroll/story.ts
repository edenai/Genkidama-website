import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PHASE_COUNT, dom } from '@config/animation';
import type { GenkidamaHandle } from '@scenes/genkidama/types';

gsap.registerPlugin(ScrollTrigger);

/**
 * Synchronise the story blocks with the scene. Each phase block owns a slice
 * of the 0..1 progress range; unequal block heights are fine because every
 * block reports its own local progress. The scene does the interpolation.
 */
export function initStory(scene: GenkidamaHandle, reducedMotion: boolean) {
  const story = document.querySelector<HTMLElement>('[data-story]');
  const stage = document.querySelector<HTMLElement>('[data-stage]');
  if (!story) return;

  const blocks = Array.from(story.querySelectorAll<HTMLElement>('[data-phase]'));

  blocks.forEach((block, i) => {
    ScrollTrigger.create({
      trigger: block,
      start: 'top center',
      end: 'bottom center',
      onUpdate: (self) => scene.setProgress((i + self.progress) / PHASE_COUNT),
      onEnter: () => block.classList.add('is-active'),
      onEnterBack: () => block.classList.add('is-active'),
      onLeave: () => block.classList.remove('is-active'),
      onLeaveBack: () => block.classList.remove('is-active'),
    });

    // Text "gathers": tracking tightens from dispersed to set as the block
    // arrives. Reversed when scrolling back so the story stays reversible.
    const title = block.querySelector<HTMLElement>('.phase__title');
    const body = block.querySelectorAll<HTMLElement>('.phase__body, .phase__signals, .phase__marker');
    if (!reducedMotion && title) {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: block,
          start: 'top 70%',
          end: 'bottom 30%',
          toggleActions: 'play reverse play reverse',
        },
      });
      tl.fromTo(
        title,
        { letterSpacing: '0.28em', opacity: 0 },
        { letterSpacing: '0.02em', opacity: 1, duration: dom.phaseTitle, ease: 'power4.out' },
      ).fromTo(
        body,
        { opacity: 0, x: -12 },
        { opacity: 1, x: 0, duration: dom.phaseBody, ease: 'power3.out', stagger: 0.08 },
        '-=0.6',
      );
    }
  });

  // The first block starts the story from the hero state.
  ScrollTrigger.create({
    trigger: story,
    start: 'top bottom',
    end: 'top center',
    onLeaveBack: () => scene.setProgress(0),
  });

  // Afterglow: once content takes over, the stage recedes and the system
  // settles into a low-traffic idle.
  const content = document.querySelector<HTMLElement>('[data-content]');
  if (content) {
    ScrollTrigger.create({
      trigger: content,
      start: 'top bottom',
      end: 'top 20%',
      onUpdate: (self) => {
        scene.setDim(self.progress);
        if (stage) stage.style.setProperty('--stage-dim', self.progress.toFixed(3));
      },
      onLeaveBack: () => {
        scene.setDim(0);
        stage?.style.setProperty('--stage-dim', '0');
      },
    });
  }
}
