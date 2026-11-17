/* ==========================================================================
   Every page: wait for the fonts, then let [data-reveal] elements surface.
   Elements inside a [data-stagger] parent get an increasing delay (--d),
   one step per child, starting from the parent's data-stagger-start.
   Also: sections that reveal on scroll, and the menu underline following
   the section on screen.
   ========================================================================== */
(function () {
  'use strict';

  const doc = document.documentElement;

  document.querySelectorAll('[data-stagger]').forEach((group) => {
    const step = Number(group.dataset.stagger) || 60;
    const start = Number(group.dataset.staggerStart) || 0;
    group.querySelectorAll(':scope > [data-reveal], :scope > * > [data-reveal]').forEach((el, i) => {
      el.style.setProperty('--d', String(start + i * step));
    });
  });

  const fonts = document.fonts && document.fonts.ready
    ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))])
    : Promise.resolve();

  let done = false;
  const ready = () => {
    if (done) return;
    done = true;
    doc.classList.add('is-ready');
  };
  // two frames so the hidden state is painted before the transition starts;
  // the timer covers tabs that open in the background, where frames wait
  fonts.then(() => {
    requestAnimationFrame(() => requestAnimationFrame(ready));
    setTimeout(ready, 150);
  });

  // coming back through the history cache: show everything at once
  addEventListener('pageshow', (e) => { if (e.persisted) doc.classList.add('is-ready'); });

  /* Sections marked [data-view] hold their entrance until they scroll into view. */
  const views = document.querySelectorAll('[data-view]');
  if (!('IntersectionObserver' in window)) {
    views.forEach((v) => v.classList.add('is-in'));
  } else if (views.length) {
    // in view once 18% of it shows, or, for sections taller than the screen,
    // once it fills a third of the screen
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      const seen = e.intersectionRatio >= .18 || e.intersectionRect.height >= innerHeight / 3;
      if (e.isIntersecting && seen) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { threshold: [0, .01, .02, .04, .08, .12, .18] });
    views.forEach((v) => io.observe(v));
  }

  /* A section with an id that has its own menu link (href ending in #id) takes
     the underline while it fills the middle of the screen; otherwise the
     page's own link keeps it. */
  const nav = document.querySelector('.site-nav');
  const home = nav && nav.querySelector('[aria-current="page"]');
  const linked = [...document.querySelectorAll('main > section[id]')]
    .map((s) => ({ s, a: nav && nav.querySelector('a[href$="#' + s.id + '"]') }))
    .filter((x) => x.a);
  if (home && linked.length && 'IntersectionObserver' in window) {
    const mark = (a) => nav.querySelectorAll('a').forEach((l) => {
      if (l === a) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current');
    });
    const inView = new Set();
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) inView.add(e.target); else inView.delete(e.target); });
      const hit = linked.find((x) => inView.has(x.s));
      mark(hit ? hit.a : home);
    }, { rootMargin: '-50% 0px -50% 0px' });
    linked.forEach((x) => spy.observe(x.s));
  }
})();
