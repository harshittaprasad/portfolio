/* ==========================================================================
   Project posters: halftone fields, played on hover (styles in posters.css).

   Each poster is built from an entry in POSTERS below into any element
   marked [data-poster="<name>"]. On the Work page that is each project's
   .proj__media; in _posters/poster.html it is a 1320 x 750 frame that
   render.sh turns into the still assets/img/projects/project-N.jpg.

   The graphic is a halftone: a grid of dots drawn on a canvas, thick enough
   in a band across the middle to merge into colour with pale holes, thinning
   out into scattered specks towards the top and bottom. Over it sit the
   project's title in a contrast colour, small labels in the corners and a
   list scrolling up the right edge. At rest it is a still. Pointing at the
   card plays it: the field drifts and breathes, and the title types itself
   out again. Leaving brings it back to the still.

   To change a poster, edit its entry:
     title  : the heading, one string per line
     bg     : the pale paper colour
     dots   : the colour of the dots
     head   : the colour of the title, chosen to contrast with the dots
     text   : the colour of the small labels and the list (a deep shade of dots)
     seed   : changes the shape of the band
     list   : what scrolls up the right edge
     tl, tr, bl, br : the small labels (use \n for a line break)
   ========================================================================== */
(function () {
  'use strict';

  const POSTERS = {
    flowledger: {
      n: 1, title: ['FlowLedger'], bg: '#E4ECFF', dots: '#1746FF', head: '#E4FF3A', text: '#0B2BB8', seed: 11,
      list: ['Net liquidity', 'AI forecast', 'Smart alerts', 'Budgets', 'Savings pots', 'Upcoming bills', 'Transactions', 'Search', 'Split', 'Remind', 'Settle up', 'AI report', 'Heatmap', 'Subscriptions', 'Privacy mode', 'Export CSV'],
      tl: '01', tr: '2026', bl: 'Mobile app\nFintech · AI', br: 'UX/UI\ncase study',
    },
    zineps: {
      n: 2, title: ['Zineps'], bg: '#FCE2EC', dots: '#EC1376', head: '#3EF2C6', text: '#A0004F', seed: 23,
      list: ['Orders', 'Labels', 'Rates', 'Tracking', 'Returns', 'Analytics', 'Shipping AI', 'DHL', 'UPS', 'DPD', 'FedEx', 'PostNL', 'Amsterdam', 'Milan', 'Berlin', '200+ countries'],
      tl: '02', tr: '2026', bl: 'Website\nredesign', br: 'Product UI\nresponsive',
    },
    inclusivity: {
      n: 3, title: ['Redesigning', 'Inclusivity'], bg: '#FFF5D6', dots: '#FFC20A', head: '#5B2BE0', text: '#7A5200', seed: 37,
      list: ['Autism', 'ADHD', 'OCD', 'Tourette’s', 'Dyspraxia', 'Sensory processing', 'Anxiety', 'Interviews', 'Card sorting', 'Co-design', 'NASA-TLX', 'Overload scale', 'Pacing', 'Sanctuary', 'Density', 'E-DUX'],
      tl: '03', tr: '2026', bl: 'Research\npaper', br: 'Neuroinclusive\nUX',
    },
    companions: {
      n: 4, title: ['Emotionally', 'Responsible', 'AI Companions'], bg: '#FFE8DD', dots: '#FF5418', head: '#1B2CFF', text: '#B83208', seed: 53,
      list: ['Honest presence', 'Healthy attachment', 'Safe escalation', 'Data dignity', 'Goodbyes', 'Distress', 'Feelings', 'Memory', 'Loneliness', 'Wellbeing', 'Dependency index', 'Conversation audit', 'Co-design', 'Field study', '40 adults', '4 weeks'],
      tl: '04', tr: '2026', bl: 'Research\npaper', br: 'AI\ncompanions',
    },
  };

  /* ---------- the halftone ----------
     Drawn at 1320 x 750 and scaled to the card. paint(t, a): t is time in
     seconds, a is how alive it is, from 0 (the still) to 1 (hovered). At
     a = 0 every frame is the same still. */

  const W = 1320, H = 750, S = 12.5;            // S: the spacing of the grid
  const COLS = Math.ceil(W / S) + 1, ROWS = Math.ceil(H / S) + 1;

  function field(seed) {
    // value noise from a fixed table, so a poster always draws the same way
    let s = seed * 9973 + 7;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const tab = Float32Array.from({ length: 65536 }, rnd);
    const h2 = (i, j) => tab[((i * 374761) ^ (j * 668265)) & 65535];
    const fade = (f) => f * f * (3 - 2 * f);
    const n2 = (x, y) => {
      const i = Math.floor(x), j = Math.floor(y), fx = fade(x - i), fy = fade(y - j);
      const a = h2(i, j), b = h2(i + 1, j), c = h2(i, j + 1), d = h2(i + 1, j + 1);
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    };
    const n1 = (x) => n2(x, 17.3);
    const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

    // the parts of the field that never move, worked out once per dot
    const base = new Float32Array(COLS * ROWS), cy0 = new Float32Array(COLS), hh = new Float32Array(COLS);
    const thin = new Float32Array(COLS);   // the band dissolves into specks by the right edge, under the list
    for (let c = 0; c < COLS; c++) {
      const x = c * S;
      thin[c] = 1 - .95 * smooth(.66, .8, x / W);
      cy0[c] = H * .5 + (n1(x * .0032 + 3) - .5) * 120;                       // the band's centre line wanders
      hh[c] = H * (.25 + (n1(x * .0055 + 41) - .5) * .14);                    // and so does its thickness
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * S, y = r * S;
        const d = Math.abs(y - cy0[c]) / hh[c];
        let v = .84 * (1 - smooth(.05, 1.35, d));
        const edge = v * (1 - v) * 4;                                         // texture only where it thins out
        v += (n2(x * .028, y * .028) - .5) * .5 * edge + (h2(c + 911, r + 377) - .5) * .16 * edge;
        base[r * COLS + c] = Math.min(1, Math.max(0, v * thin[c]));
      }
    }
    return { base, n2, cy0, hh, thin };
  }

  function halftone(cv, p) {
    const f = field(p.seed);
    const g = cv.getContext('2d');
    let t = 0, a = 0, target = 0, raf = 0, last = 0;
    const v = new Float32Array(COLS * ROWS);

    const paint = () => {
      const k = cv.width / W;
      g.setTransform(k, 0, 0, k, 0, 0);
      g.fillStyle = p.bg; g.fillRect(0, 0, W, H);
      // the field for this frame: the still, plus a drift while alive
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          let x = base(r, c);
          if (a) {
            const px = c * S, py = r * S;
            x += a * ((f.n2(px * .009 + t * .35, py * .011 - t * .22) - .5) * .5
              + Math.sin(px * .006 + t * 1.1) * .07 * (1 - Math.abs(py - f.cy0[c]) / (f.hh[c] * 2)));
            x = Math.min(1, Math.max(0, x * (f.thin[c] < 1 ? .5 + .5 * f.thin[c] : 1)));
          }
          v[r * COLS + c] = x;
        }
      }
      // dark dots on the grid, growing until they merge
      g.fillStyle = p.dots;
      g.beginPath();
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = v[r * COLS + c];
          if (x < .025) continue;
          const rad = S * (.07 + .66 * x);
          g.moveTo(c * S + rad, r * S); g.arc(c * S, r * S, rad, 0, Math.PI * 2);
        }
      }
      g.fill();
      // where they have merged, round pale holes between them
      g.fillStyle = p.bg;
      g.beginPath();
      for (let r = 0; r < ROWS - 1; r++) {
        for (let c = 0; c < COLS - 1; c++) {
          const x = (v[r * COLS + c] + v[r * COLS + c + 1] + v[(r + 1) * COLS + c] + v[(r + 1) * COLS + c + 1]) / 4;
          if (x < .62) continue;
          const rad = S * .34 * Math.min(1, (1 - x) / .38);
          if (rad < .4) continue;
          const hx = c * S + S / 2, hy = r * S + S / 2;
          g.moveTo(hx + rad, hy); g.arc(hx, hy, rad, 0, Math.PI * 2);
        }
      }
      g.fill();
    };
    const base = (r, c) => f.base[r * COLS + c];

    const size = () => {
      // the layout size, not the on-screen box: in the folder the card is
      // scaled down while it flies, and the canvas must not be drawn that small
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
      if (!w || (w === cv.width && h === cv.height)) return;
      cv.width = w; cv.height = h; paint();
    };
    new ResizeObserver(size).observe(cv);
    const tick = (now) => {
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
      t += dt;
      a += (target - a) * Math.min(1, dt * 2.6);             // ease in and out of life
      if (!target && a < .004) { a = 0; t = 0; raf = 0; last = 0; paint(); return; }   // back to the still
      paint();
      raf = requestAnimationFrame(tick);
    };
    return {
      play() { target = 1; if (!raf) { last = 0; raf = requestAnimationFrame(tick); } },
      rest() { target = 0; if (!raf && a) raf = requestAnimationFrame(tick); },
    };
  }

  /* ---------- the title, typed out on hover ---------- */

  const TYPE_MS = 55;          // per letter

  function typer(head) {
    const chars = [...head.querySelectorAll('.poster__ch')];
    const caret = head.querySelector('.poster__caret');
    let timer = 0;
    // show the first n letters, with the caret right after the last one
    const show = (n) => {
      chars.forEach((c, i) => c.classList.toggle('is-off', i >= n));
      if (n) chars[n - 1].after(caret); else chars[0].before(caret);
    };
    return {
      play() {
        clearInterval(timer);
        let n = 0; show(0);
        head.classList.add('is-typing');
        timer = setInterval(() => {
          show(++n);
          if (n >= chars.length) { clearInterval(timer); setTimeout(() => head.classList.remove('is-typing'), 900); }
        }, TYPE_MS);
      },
      rest() { clearInterval(timer); show(chars.length); head.classList.remove('is-typing'); },
    };
  }

  // one size for every title: the longest line of any poster fills the
  // room a title has (70% of the width, the list has the right edge), and
  // the poster with the most lines still fits in 52% of the height. Measured
  // once at 100px, off-screen (the posters may still be hidden in the folder).
  let shared = null;
  function titleSize() {
    if (shared) return shared;
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute; left:-9999px; top:0; white-space:nowrap; visibility:hidden;' +
      'font: 700 100px "Archivo", "Helvetica Neue", Arial, sans-serif; letter-spacing:-.025em; text-transform:uppercase';
    document.body.appendChild(probe);
    let em = 0, most = 1;
    Object.values(POSTERS).forEach((p) => {
      most = Math.max(most, p.title.length);
      p.title.forEach((line) => { probe.textContent = line; em = Math.max(em, probe.getBoundingClientRect().width / 100); });
    });
    probe.remove();
    if (!em) return null;
    shared = 'min(' + (52 / (most * .86)).toFixed(2) + 'cqh, ' + (70 / em).toFixed(3) + 'cqw)';
    return shared;
  }
  function fit(head) {
    const run = () => { const fs = titleSize(); if (fs) head.style.setProperty('--fs', fs); };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(run);
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lines = (s) => esc(s).replace(/\n/g, '<br>');

  function build(host, name) {
    const p = POSTERS[name];
    if (!p) return null;
    const list = '<ul>' + p.list.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>';
    const title = p.title.map((line) =>
      '<span class="poster__line">' + Array.from(line).map((c) => '<span class="poster__ch">' + (c === ' ' ? '&nbsp;' : esc(c)) + '</span>').join('') + '</span>').join('');

    const el = document.createElement('div');
    el.className = 'poster';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = '--bg:' + p.bg + '; --dots:' + p.dots + '; --head:' + p.head + '; --text:' + p.text;
    el.innerHTML =
      '<canvas class="poster__art"></canvas>' +
      '<p class="poster__head">' + title + '<span class="poster__caret"></span></p>' +
      '<div class="poster__list"><div class="poster__track">' + list + list + '</div></div>' +
      '<p class="poster__lbl poster__lbl--tl">' + lines(p.tl) + '</p>' +
      '<p class="poster__lbl poster__lbl--tr">' + lines(p.tr) + '</p>' +
      '<p class="poster__lbl poster__lbl--bl">' + lines(p.bl) + '</p>' +
      '<p class="poster__lbl poster__lbl--br">' + lines(p.br) + '</p>';
    host.appendChild(el);
    host.classList.add('has-poster');
    const head = el.querySelector('.poster__head');
    fit(head);
    el.art = halftone(el.querySelector('.poster__art'), p);
    el.typer = typer(head);
    return el;
  }

  /* ---------- play on hover, settle back on leave ---------- */

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const canHover = matchMedia('(hover: hover)');

  function control(el, trigger) {
    const anims = () => el.getAnimations({ subtree: true }).filter((a) => /poster-scroll/.test(a.animationName || ''));
    const play = () => {
      if (reduce.matches) return;
      anims().forEach((a) => a.play());
      el.art.play();
      el.typer.play();
    };
    const rest = () => {
      anims().forEach((a) => { a.pause(); a.currentTime = 0; });
      el.art.rest();
      el.typer.rest();
    };
    trigger.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch' && canHover.matches) play(); });
    trigger.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') rest(); });
    trigger.addEventListener('focus', play);
    trigger.addEventListener('blur', rest);
    return { play, rest };
  }

  document.querySelectorAll('[data-poster]').forEach((host) => {
    const el = build(host, host.dataset.poster);
    if (el) el.ctl = control(el, host.closest('a, button') || host);
  });
  window.Posters = { build, control, list: POSTERS };
})();
