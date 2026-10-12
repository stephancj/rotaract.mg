/* Motion — Rotaract Madagascar.
 * Révélations au scroll, stagger de groupes, compteurs, parallax doux,
 * état scrollé du header. Vanilla, une seule écoute scroll en rAF passif.
 * Sans JS ou avec `prefers-reduced-motion` : contenu affiché tel quel.
 */
(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Révélations ------------------------------------------------ */
  const revealEls = [...document.querySelectorAll('[data-reveal]')];
  // Délai en cascade au sein d'un groupe (plafonné pour rester nerveux).
  revealEls.forEach((el) => {
    const group = el.closest('[data-reveal-group]');
    if (!group) return;
    const siblings = [...group.querySelectorAll('[data-reveal]')];
    const index = siblings.indexOf(el);
    if (index > 0) el.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-in'));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  /* --- Compteurs --------------------------------------------------- */
  const counters = [...document.querySelectorAll('[data-count]')];
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

  const renderCount = (el, done) => {
    const target = Number(el.getAttribute('data-count'));
    if (!Number.isFinite(target)) return;
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';
    const value = done ? target : Math.round(target * (1 - Math.pow(1 - done, 4)));
    el.textContent = `${prefix}${formatter.format(value)}${suffix}`;
  };

  const runCounter = (el) => {
    if (reduceMotion) {
      renderCount(el, 1);
      return;
    }
    const duration = 1600;
    let start = 0;
    const tick = (now) => {
      if (!start) start = now;
      const progress = Math.min((now - start) / duration, 1);
      renderCount(el, progress);
      if (progress < 1) window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  };

  if (!('IntersectionObserver' in window)) {
    counters.forEach(runCounter);
  } else {
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          countObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((el) => countObserver.observe(el));
  }

  /* --- Header + parallax (une seule boucle scroll) ----------------- */
  const headers = [...document.querySelectorAll('.site-header, .t-header')];
  const parallaxEls = reduceMotion
    ? []
    : [...document.querySelectorAll('[data-parallax]')].map((el) => ({
        el,
        speed: Number(el.getAttribute('data-parallax')) || 0.1,
      }));

  if (!headers.length && !parallaxEls.length) return;

  let ticking = false;
  const viewport = () => window.innerHeight || 800;

  const update = () => {
    ticking = false;
    const y = window.scrollY || 0;
    headers.forEach((header) => header.classList.toggle('is-scrolled', y > 10));
    const vh = viewport();
    parallaxEls.forEach(({ el, speed }) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -100 || rect.top > vh + 100) return;
      const offset = (rect.top + rect.height / 2 - vh / 2) * speed;
      el.style.translate = `0 ${offset.toFixed(1)}px`;
    });
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  update();
})();
