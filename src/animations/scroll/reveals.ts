import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Content reveals for sections after the story. Deliberately sparse: text
 * appears, hairlines charge from the left. No sliding cards. One exception,
 * `afterimage`: the first statement after the Gathering arrives carrying the
 * core's light and cools to the page colour, so the hand-off from stage to
 * content is a transfer of energy rather than a panel sliding over it.
 * DOM-only (colour and text-shadow on one element); the canvas is untouched.
 */
export function initReveals(reducedMotion: boolean) {
  const content = document.querySelector<HTMLElement>('[data-content]');
  if (!content) return;
  const items = Array.from(content.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (reducedMotion) {
    gsap.set(items, { opacity: 1, scaleX: 1 });
    return;
  }

  const css = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const hot = token('--energy-100', '#b6f6ff');
  const cool = token('--fg-0', '#eef2f4');

  for (const el of items) {
    const kind = el.dataset.reveal;
    if (kind === 'rule') {
      gsap.to(el, {
        scaleX: 1,
        duration: 1.1,
        ease: 'power3.inOut',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    } else if (kind === 'afterimage') {
      gsap
        .timeline({
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          // Hand the final colours back to the stylesheet.
          onComplete: () => gsap.set(el, { clearProps: 'color,textShadow' }),
        })
        .fromTo(
          el,
          { opacity: 0, color: hot, textShadow: '0 0 24px rgba(92, 236, 255, 0.65)' },
          { opacity: 1, duration: 0.9, ease: 'power2.out' },
        )
        .to(el, { color: cool, textShadow: '0 0 24px rgba(92, 236, 255, 0)', duration: 1.8, ease: 'power2.out' }, '-=0.3');
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
