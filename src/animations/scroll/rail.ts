import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Highlight the current section in the left rail and the top nav. */
export function initRail() {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-section-link]'));
  if (!links.length) return;

  const setCurrent = (id: string | null) => {
    for (const a of links) {
      const on = a.dataset.sectionLink === id;
      a.classList.toggle('is-current', on);
      if (on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    }
  };

  const ids = Array.from(new Set(links.map((a) => a.dataset.sectionLink!)));
  for (const id of ids) {
    const section = document.getElementById(id);
    if (!section) continue;
    ScrollTrigger.create({
      trigger: section,
      start: 'top center',
      end: 'bottom center',
      onEnter: () => setCurrent(id),
      onEnterBack: () => setCurrent(id),
      onLeaveBack: () => setCurrent(null),
    });
  }
}
