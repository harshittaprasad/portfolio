/* ==========================================================================
   Work: the page opens on one folder in the middle. Clicking it opens the
   folder, the sheets inside rise out, and each one flies to its place in the
   grid and becomes that project's cover; then the names and tags fade in.
   ========================================================================== */
(function () {
  'use strict';

  const work = document.querySelector('.work');
  const desk = work && work.querySelector('.desk');
  const folder = desk && desk.querySelector('.desk__folder');
  if (!folder) return;

  const sheets = [...desk.querySelectorAll('.desk__sheet')];
  const projects = [...work.querySelectorAll('.proj')];
  const title = work.querySelector('.shelf__title');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let opened = false;

  async function open() {
    if (opened) return;
    opened = true;
    folder.setAttribute('aria-expanded', 'true');
    folder.classList.add('is-open');
    if (!reduce) await wait(540);

    // where each sheet is right now; its project's cover starts from there
    const from = sheets.map((s) => s.getBoundingClientRect());

    work.classList.add('is-open');   // the projects take their places, still hidden
    desk.classList.add('is-away');

    if (reduce) {
      work.classList.add('is-shown');
      desk.classList.add('is-gone');
      title.focus({ preventScroll: true });
      return;
    }

    const parts = projects.map((p) => [p.querySelector('.proj__media'), p.querySelector('.proj__meta')]);
    parts.forEach(([media, meta], i) => {
      const to = media.getBoundingClientRect(), f = from[i];
      if (f) {
        media.style.transformOrigin = '0 0';
        media.style.transform =
          'translate(' + (f.left - to.left) + 'px,' + (f.top - to.top) + 'px) ' +
          'scale(' + f.width / to.width + ',' + f.height / to.height + ')';
      } else {
        media.style.opacity = '0';   // more projects than sheets: these just fade in
      }
      meta.style.opacity = '0';
    });
    sheets.forEach((s) => { s.style.visibility = 'hidden'; });
    void work.offsetWidth;           // commit the starting positions before letting go
    work.classList.add('is-shown');

    parts.forEach(([media, meta], i) => {
      const d = i * 70;
      media.style.transition = 'transform 1s cubic-bezier(.16, 1, .3, 1) ' + d + 'ms, opacity .6s ease ' + d + 'ms';
      media.style.transform = '';
      media.style.opacity = '';
      meta.style.transition = 'opacity .6s ease ' + (d + 550) + 'ms';
      meta.style.opacity = '';
    });

    await wait(1000 + projects.length * 70 + 600);
    parts.forEach(([media, meta]) => { media.style.cssText = ''; meta.style.cssText = ''; });
    desk.classList.add('is-gone');
    title.focus({ preventScroll: true });
  }

  folder.addEventListener('click', open);

  // coming back from a project (work/#projects): already open, no folder
  if (location.hash === '#projects') {
    opened = true;
    folder.setAttribute('aria-expanded', 'true');
    work.classList.add('is-open', 'is-shown');
    desk.classList.add('is-gone');
  }
})();
