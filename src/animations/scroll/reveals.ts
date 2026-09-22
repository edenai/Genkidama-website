import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Content reveals for sections after the story. Deliberately sparse: text
 * appears, hairlines charge from the left. No sliding cards.
 */
export function initReveals(reducedMotion: boolean) {
  const content = document.querySelector<HTMLElement>('[data-content]');
  if (!content) return;
  const items = Array.from(content.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (reducedMotion) {
    gsap.set(items, { opacity: 1, scaleX: 1 });
    return;
  }

  for (const el of items) {
    const kind = el.dataset.reveal;
    if (kind === 'rule') {
      gsap.to(el, {
        scaleX: 1,
        duration: 1.1,
        ease: 'power3.inOut',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    } else {
      gsap.to(el, {
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out',
        delay: Number(el.dataset.revealDelay ?? 0),
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    }
  }
}
