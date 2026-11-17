/* ==========================================================================
   Shared behaviour for every page:
   1. Folder links keep working when the site is opened straight from disk.
   2. Star cursor with default / link / grab / grabbing states.
   3. A soft lamp that trails the pointer across the dark.
   4. Navigation hook so a page can play an exit animation before leaving.
   ========================================================================== */
(function () {
  'use strict';

  const doc = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* 1. Clean URLs ("work/") need a server to resolve index.html; on file:// add it. */
  if (location.protocol === 'file:') {
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      const m = href.match(/^(.*\/)(#.*)?$/);
      if (!/^[a-z]+:|^\/\/|^#/i.test(href) && m) a.setAttribute('href', m[1] + 'index.html' + (m[2] || ''));
    });
  }

  /* 2. Star cursor: a small sharp star. Grows over interactive things, spins while
        dragging, and is drawn slightly towards elements marked [data-magnet]. */
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  if (fine.matches) {
    const el = document.createElement('div');
    el.className = 'cursor';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<span class="cursor__magnet"><span class="cursor__star"><svg viewBox="0 0 24 24">' +
      '<polygon points="12,.5 14.12,9.09 22.94,8.45 15.42,13.11 18.76,21.3 12,15.6 5.24,21.3 8.58,13.11 1.06,8.45 9.88,9.09"/>' +
      '</svg></span></span>';
    document.body.appendChild(el);
    doc.classList.add('has-cursor');

    const magnet = el.querySelector('.cursor__magnet');
    const magnets = document.querySelectorAll('[data-magnet]');
    let state = null;

    const resolve = (target) => {
      if (doc.classList.contains('is-grabbing')) return 'grabbing';
      if (!target || !target.closest) return '';
      if (target.closest('[data-cursor="grab"]')) return 'grab';
      if (target.closest('a, button, [role="button"], label, summary')) return 'link';
      return '';
    };
    const setState = (s) => {
      if (s === state) return;
      state = s;
      el.dataset.state = s;
    };

    // within ~90px of a magnet the star leans towards it; over it, a little towards its centre
    const pull = (x, y) => {
      if (state === 'grabbing' || reduce.matches) return [0, 0];
      for (const m of magnets) {
        const r = m.getBoundingClientRect();
        const dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom);
        const dist = Math.hypot(dx, dy);
        if (dist > 90) continue;
        const f = 1 - dist / 90;
        const k = dist === 0 ? 3 : 10 * f * f;
        const vx = r.left + r.width / 2 - x, vy = r.top + r.height / 2 - y, l = Math.hypot(vx, vy) || 1;
        return [vx / l * k, vy / l * k];
      }
      return [0, 0];
    };

    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') { el.classList.remove('is-visible'); return; }
      el.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
      el.classList.add('is-visible');
      setState(resolve(e.target));
      const o = pull(e.clientX, e.clientY);
      magnet.style.transform = 'translate(' + o[0].toFixed(1) + 'px,' + o[1].toFixed(1) + 'px)';
    }, { passive: true });

    addEventListener('pointerdown', (e) => setState(resolve(e.target)), { passive: true });
    addEventListener('pointerup', (e) => {
      // pointer capture may still point at the card; re-check what is under the pointer
      requestAnimationFrame(() => setState(resolve(document.elementFromPoint(e.clientX, e.clientY))));
    }, { passive: true });

    doc.addEventListener('pointerleave', () => el.classList.remove('is-visible'));
    addEventListener('blur', () => el.classList.remove('is-visible'));
  }

  /* 3. Lamp: a soft pool of light drifts after the pointer. It lags behind on
        purpose, so it reads as a lamp rather than a cursor. */
  if (fine.matches && !reduce.matches) {
    const lamp = document.createElement('div');
    lamp.className = 'lamp';
    lamp.setAttribute('aria-hidden', 'true');
    document.body.appendChild(lamp);

    let tx = 50, ty = 38, lx = tx, ly = ty, raf = 0;   // target and current, in % of the viewport
    const tick = () => {
      lx += (tx - lx) * .06;
      ly += (ty - ly) * .06;
      lamp.style.setProperty('--mx', lx.toFixed(2) + '%');
      lamp.style.setProperty('--my', ly.toFixed(2) + '%');
      raf = Math.abs(tx - lx) + Math.abs(ty - ly) > .05 ? requestAnimationFrame(tick) : 0;
    };
    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      tx = e.clientX / innerWidth * 100;
      ty = e.clientY / innerHeight * 100;
      lamp.classList.add('is-lit');
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    doc.addEventListener('pointerleave', () => lamp.classList.remove('is-lit'));
  }

  /* Pages can style the header differently once something has scrolled under it. */
  const onScroll = () => doc.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* 4. Page exit hook. A page may define window.__pageExit() returning a Promise. */
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-nav]');
    if (!a || e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    if (a.getAttribute('aria-current') === 'page') { e.preventDefault(); return; }
    if (typeof window.__pageExit !== 'function' || reduce.matches) return;
    e.preventDefault();
    const href = a.href;
    Promise.resolve(window.__pageExit()).then(() => { location.href = href; });
  });
})();
