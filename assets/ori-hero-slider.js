/* ORI redesign — hero slider (sections/ori-hero-slider.liquid).
   Cross-fades stacked slides. Arrows, dots, swipe and arrow keys move
   between them; autoplay pauses on hover, while anything inside has focus,
   while the tab is hidden, and stops for good once the visitor pauses it.
   No autoplay for visitors who prefer reduced motion. In the theme editor,
   selecting a slide block shows that slide and stops autoplay. */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const initSlider = (root) => {
    if (root.dataset.ready) return;
    root.dataset.ready = '1';
    const slides = [...root.querySelectorAll('[data-ori-hslide]')];
    if (slides.length < 2) return;

    const dots = [...root.querySelectorAll('[data-ori-hslider-dot]')];
    const pauseBtn = root.querySelector('[data-ori-hslider-pause]');
    const delay = Number(root.dataset.autoplay) * 1000;
    let index = 0;
    let timer = null;
    let hovered = false;
    let focused = false;
    let stopped = !delay || reduceMotion.matches;

    const show = (next) => {
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        const on = i === index;
        slide.classList.toggle('is-active', on);
        slide.inert = !on;
        if (on) slide.removeAttribute('aria-hidden');
        else slide.setAttribute('aria-hidden', 'true');
      });
      dots.forEach((dot, i) => {
        if (i === index) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
    };

    const schedule = () => {
      clearTimeout(timer);
      if (stopped || hovered || focused || document.hidden) return;
      timer = setTimeout(() => {
        show(index + 1);
        schedule();
      }, delay);
    };

    const go = (next) => {
      show(next);
      schedule();
    };

    root.querySelector('[data-ori-hslider-prev]')?.addEventListener('click', () => go(index - 1));
    root.querySelector('[data-ori-hslider-next]')?.addEventListener('click', () => go(index + 1));
    dots.forEach((dot) => dot.addEventListener('click', () => go(Number(dot.dataset.oriHsliderDot))));

    if (pauseBtn) {
      if (stopped) pauseBtn.hidden = true;
      pauseBtn.addEventListener('click', () => {
        stopped = !stopped;
        pauseBtn.setAttribute('aria-pressed', stopped);
        pauseBtn.setAttribute('aria-label', stopped ? 'Play slides' : 'Pause slides');
        schedule();
      });
    }

    root.addEventListener('mouseenter', () => {
      hovered = true;
      schedule();
    });
    root.addEventListener('mouseleave', () => {
      hovered = false;
      schedule();
    });
    root.addEventListener('focusin', () => {
      focused = true;
      schedule();
    });
    root.addEventListener('focusout', (event) => {
      if (root.contains(event.relatedTarget)) return;
      focused = false;
      schedule();
    });
    document.addEventListener('visibilitychange', schedule);

    root.addEventListener('keydown', (event) => {
      if (event.target.closest('input, select, textarea')) return;
      if (event.key === 'ArrowLeft') go(index - 1);
      else if (event.key === 'ArrowRight') go(index + 1);
    });

    // Horizontal swipe on touch screens; vertical drags still scroll the page.
    let startX = null;
    let startY = null;
    root.addEventListener(
      'touchstart',
      (event) => {
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
      },
      { passive: true }
    );
    root.addEventListener(
      'touchend',
      (event) => {
        if (startX === null) return;
        const dx = event.changedTouches[0].clientX - startX;
        const dy = event.changedTouches[0].clientY - startY;
        startX = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? index + 1 : index - 1);
      },
      { passive: true }
    );

    // Theme editor: show the selected slide and stop autoplay.
    root.addEventListener('shopify:block:select', (event) => {
      const i = slides.indexOf(event.target.closest('[data-ori-hslide]'));
      if (i < 0) return;
      stopped = true;
      show(i);
      schedule();
    });

    schedule();
  };

  const init = (scope = document) => scope.querySelectorAll('[data-ori-hslider]').forEach(initSlider);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
