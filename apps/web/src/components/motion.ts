import { useEffect, type RefObject } from 'react';
/** HunpeoLabs site-header scroll loop, adapted to a fixed Manager header. */
export function useHeaderMotion(ref: RefObject<HTMLElement | null>, menuOpen: boolean) {
  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const update = () => {
      frame = 0;
      if (menuOpen) return;
      const progress = Math.max(0, Math.min(1, (window.scrollY - 20) / 120));
      header.style.setProperty('--header-scroll-progress', String(reduced.matches ? Number(progress > 0) : progress));
      header.dataset.scrolled = String(window.scrollY > 20);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update(); window.addEventListener('scroll', scroll, { passive: true }); reduced.addEventListener('change', scroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', scroll); reduced.removeEventListener('change', scroll); };
  }, [ref, menuOpen]);
}
