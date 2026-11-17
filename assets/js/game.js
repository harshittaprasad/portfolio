/* ==========================================================================
   Home: a game of Fruit Ninja behind the "( Play now )" button.

   Fruit is thrown up from below the page; swipe through it to slice it.
   With a mouse a quick flick is enough (holding the button down makes it
   easier); on touch, drag a finger across. Three or more fruit in one swipe
   is a combo, worth that many extra points. Drop three fruit, or slice a
   bomb, and the game is over. Every 100 points wins back a dropped fruit.

   The fruit, halves, juice and blade are drawn on one canvas. The score,
   the strikes and the game-over card are HTML, so they use the site's type.
   ========================================================================== */
(function () {
  'use strict';

  const toggle = document.querySelector('[data-game-toggle]');
  if (!toggle) return;

  const doc = document.documentElement;
  const label = toggle.querySelector('.play__label');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const TAU = Math.PI * 2;
  const BONE = '#ECE7DE';
  const OCHRE = '#B08236';
  const STORE = 'hp-fruit-best';

  /* ---------- Markup ---------- */

  const root = document.createElement('div');
  root.className = 'game';
  root.innerHTML =
    '<canvas class="game__canvas" aria-hidden="true"></canvas>' +
    '<div class="game__hud" aria-hidden="true">' +
      '<p class="game__score">0</p>' +
      '<p class="game__best micro micro--quiet">Best <span>0</span></p>' +
      '<ol class="game__strikes">' +
        '<li><svg viewBox="0 0 20 20"><path d="M4 4l12 12M16 4L4 16"/></svg></li>'.repeat(3) +
      '</ol>' +
    '</div>' +
    '<p class="game__hint micro" aria-hidden="true">Swipe through the fruit&ensp;·&ensp;Mind the bombs</p>' +
    '<div class="game__over" role="status">' +
      '<p class="game__note micro micro--quiet"></p>' +
      '<p class="game__title">Game over</p>' +
      '<p class="game__result micro">Score <b class="game__final">0</b>&ensp;·&ensp;Best <b class="game__top">0</b>' +
        '<span class="game__new">&ensp;·&ensp;New best</span></p>' +
      '<p class="game__close micro micro--quiet">' + (fine.matches ? 'Click' : 'Tap') + ' anywhere to close</p>' +
    '</div>';
  document.body.appendChild(root);

  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const $ = (s) => root.querySelector(s);
  const ui = {
    score: $('.game__score'),
    best: $('.game__best span'),
    strikes: [...root.querySelectorAll('.game__strikes li')],
    note: $('.game__note'),
    final: $('.game__final'),
    top: $('.game__top'),
  };

  /* ---------- Drawing helpers (sprites are painted once, at load and on resize) ---------- */

  function seeded(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return () => {
      h = (h + 0x6D2B79F5) | 0;
      let t = Math.imul(h ^ (h >>> 15), 1 | h);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function disc(c, r, color, x = 0, y = 0) {
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = color; c.fill();
  }

  // a soft shade along the lower right: everything inside the clip that falls
  // outside a copy of the body nudged up and to the left
  function crescent(c, rx, ry, color, alpha) {
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.beginPath();
    c.rect(-rx * 3, -ry * 3, rx * 6, ry * 6);
    c.ellipse(-rx * .12, -ry * .14, rx * .98, ry * .98, 0, 0, TAU);
    c.fill('evenodd');
    c.restore();
  }

  // a short curved shine high on the left, following the body, and a dot after it
  function gloss(c, rx, ry, a) {
    const m = Math.min(rx, ry);
    c.save();
    c.globalAlpha = a;
    c.strokeStyle = c.fillStyle = '#fff';
    c.lineCap = 'round';
    c.lineWidth = m * .12;
    c.beginPath();
    c.arc(0, 0, m * .62, -2.6, -2.1);
    c.stroke();
    c.beginPath();
    c.arc(Math.cos(-1.82) * m * .6, Math.sin(-1.82) * m * .6, m * .062, 0, TAU);
    c.fill();
    c.restore();
  }

  // a plump little leaf
  function leaf(c, x, y, len, ang, fill, w = .5) {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(len * .3, -len * w, len * .85, -len * w * .7, len, 0);
    c.bezierCurveTo(len * .85, len * w * .7, len * .3, len * w, 0, 0);
    c.fillStyle = fill;
    c.fill();
    c.restore();
  }

  function stem(c, x0, y0, x1, y1, bend, w, color) {
    c.beginPath();
    c.moveTo(x0, y0);
    c.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1);
    c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round';
    c.stroke();
  }

  // a small teardrop, point first along +x before rotating
  function seedDrop(c, x, y, len, wid, ang, color) {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.beginPath();
    c.moveTo(len * .5, 0);
    c.bezierCurveTo(len * .1, wid * .9, -len * .5, wid, -len * .5, 0);
    c.bezierCurveTo(-len * .5, -wid, len * .1, -wid * .9, len * .5, 0);
    c.fillStyle = color;
    c.fill();
    c.restore();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // the inside of an orange or a lemon: rind, pith, and eight soft segments
  function citrus(c, r, rind, pith, flesh) {
    disc(c, r, rind);
    disc(c, r * .88, pith);
    const n = 8, gap = .1;
    c.fillStyle = c.strokeStyle = flesh;
    c.lineJoin = 'round';
    c.lineWidth = r * .07;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * TAU + gap, a1 = (i + 1) / n * TAU - gap;
      c.beginPath();
      c.arc(0, 0, r * .72, a0, a1);
      c.arc(0, 0, r * .16, a1, a0, true);
      c.closePath();
      c.fill();
      c.stroke();
    }
  }

  /* ---------- The fruit ----------
     Small, round and plain: a flat body in a soft muted colour, a gentle
     shade, one curved shine, a plump leaf. No texture, no faces. `inside` is
     the cut face that shows when a fruit is sliced. `axes` is the body's
     shape as a share of r. */

  const LEAF = '#88A868';

  const KINDS = {
    watermelon: {
      size: 1.14, axes: [1, .9], base: '#7BA26A', dark: '#557D4A', shade: .55, gloss: .3, juice: '#E8848C',
      pattern(c, r) {
        // four soft stripes from end to end, curving round the body
        c.strokeStyle = '#5E8853'; c.lineWidth = r * .15; c.lineCap = 'round';
        for (const k of [-1.5, -.5, .5, 1.5]) {
          c.beginPath();
          for (let i = 0; i <= 20; i++) {
            const u = i / 20 * 2 - 1, y = k * r * .38 * (.2 + .8 * Math.sqrt(1 - u * u));
            if (i) c.lineTo(u * r * 1.05, y); else c.moveTo(u * r * 1.05, y);
          }
          c.stroke();
        }
      },
      top(c, r) { stem(c, r * .95, -r * .04, r * 1.1, -r * .16, r * .03, r * .08, '#7A6648'); },
      inside(c, r) {
        disc(c, r, '#5E8853');
        disc(c, r * .9, '#EEF0D2');
        disc(c, r * .8, '#E8848C');
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * TAU - Math.PI / 2;
          seedDrop(c, Math.cos(a) * r * .46, Math.sin(a) * r * .46, r * .14, r * .065, a + Math.PI, '#3A2C28');
        }
      },
    },

    orange: {
      size: .96, axes: [1, .96], base: '#EC9B4B', dark: '#CF7E34', shade: .6, juice: '#F2A64F',
      top(c, r) {
        disc(c, r * .08, '#7C8A50', 0, -r * .93);
        leaf(c, r * .02, -r * .94, r * .5, -.55, LEAF);
      },
      inside(c, r) { citrus(c, r, '#EC9B4B', '#F8E9CC', '#F3AE5A'); },
    },

    lemon: {
      size: .9, axes: [1, .84], base: '#F0D46E', dark: '#D5B450', shade: .6, juice: '#F0DA78',
      shape(c, r) {
        c.beginPath();
        c.ellipse(0, 0, r, r * .84, 0, 0, TAU);
        c.moveTo(r * 1.11, 0);
        c.ellipse(r * .98, 0, r * .13, r * .11, 0, 0, TAU);
        c.moveTo(-r * .89, 0);
        c.ellipse(-r * .98, 0, r * .09, r * .08, 0, 0, TAU);
      },
      top(c, r) { leaf(c, r * 1.06, -r * .06, r * .42, -1, LEAF); },
      inside(c, r) { citrus(c, r, '#F0D46E', '#FAF3DA', '#F3E08E'); },
    },

    peach: {
      size: .96, axes: [1, .98], base: '#F3B699', dark: '#DE987D', shade: .6, juice: '#F5BE98',
      shape(c, r) {
        c.beginPath();
        c.moveTo(0, -r * .82);
        c.bezierCurveTo(r * .52, -r * 1.04, r * 1.02, -r * .58, r * .98, r * .06);
        c.bezierCurveTo(r * .95, r * .62, r * .5, r * .98, 0, r * .98);
        c.bezierCurveTo(-r * .5, r * .98, -r * .95, r * .62, -r * .98, r * .06);
        c.bezierCurveTo(-r * 1.02, -r * .58, -r * .52, -r * 1.04, 0, -r * .82);
        c.closePath();
      },
      pattern(c, r) {
        // a soft blush on one cheek and the gentle crease
        c.fillStyle = '#EE9886';
        for (const [s, a] of [[.8, .16], [.56, .2]]) {
          c.globalAlpha = a;
          c.beginPath(); c.arc(r * .32, r * .1, r * s, 0, TAU); c.fill();
        }
        c.globalAlpha = 1;
        c.beginPath();
        c.moveTo(0, -r * .8);
        c.bezierCurveTo(r * .2, -r * .4, r * .2, r * .2, r * .08, r * .6);
        c.strokeStyle = 'rgba(170,80,60,.22)'; c.lineWidth = r * .06; c.lineCap = 'round';
        c.stroke();
      },
      top(c, r) {
        stem(c, 0, -r * .8, r * .03, -r * .98, r * .02, r * .09, '#86664A');
        leaf(c, r * .04, -r * .95, r * .52, -.35, LEAF);
      },
      inside(c, r) {
        disc(c, r, '#EDA487');
        disc(c, r * .92, '#F7CC9A');
        c.beginPath(); c.ellipse(0, 0, r * .27, r * .34, 0, 0, TAU); c.fillStyle = '#B9774E'; c.fill();
      },
    },

    kiwi: {
      size: .86, axes: [1, .9], base: '#9C7B58', dark: '#795B3F', shade: .6, gloss: .22, juice: '#AECB66',
      pattern(c, r) {
        // a few faint freckles, so it reads as a kiwi before it is cut
        c.fillStyle = 'rgba(214,190,150,.32)';
        for (const [x, y] of [[-.5, .05], [-.2, .35], [.15, -.2], [.45, .2], [.1, .55], [-.35, -.42], [.55, -.3], [-.62, .4]]) {
          c.beginPath(); c.arc(x * r, y * r * .9, r * .035, 0, TAU); c.fill();
        }
      },
      top(c, r) { disc(c, r * .06, '#6E543A', r * .97, 0); },
      inside(c, r) {
        disc(c, r, '#9C7B58');
        disc(c, r * .92, '#AECB66');
        c.beginPath(); c.ellipse(0, 0, r * .26, r * .22, 0, 0, TAU); c.fillStyle = '#F1F3D6'; c.fill();
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * TAU;
          seedDrop(c, Math.cos(a) * r * .41, Math.sin(a) * r * .41, r * .1, r * .045, a, '#2E2A24');
        }
      },
    },

    plum: {
      size: .84, axes: [.97, 1], base: '#8A5C8E', dark: '#68406E', shade: .6, gloss: .38, juice: '#EDC573',
      pattern(c, r) {
        c.beginPath();
        c.moveTo(-r * .1, -r * .92);
        c.bezierCurveTo(r * .24, -r * .4, r * .22, r * .3, r * .02, r * .7);
        c.strokeStyle = 'rgba(40,15,45,.22)'; c.lineWidth = r * .06; c.lineCap = 'round';
        c.stroke();
      },
      top(c, r) {
        stem(c, -r * .06, -r * .94, r * .06, -r * 1.16, r * .04, r * .08, '#7A5C42');
        leaf(c, r * .04, -r * 1.08, r * .44, -.2, LEAF);
      },
      inside(c, r) {
        disc(c, r, '#8A5C8E');
        disc(c, r * .91, '#EDC573');
        c.beginPath(); c.ellipse(0, 0, r * .25, r * .33, 0, 0, TAU); c.fillStyle = '#C0844C'; c.fill();
      },
    },

    strawberry: {
      size: .88, axes: [.95, .95], base: '#E2676E', dark: '#C24E58', shade: .6, juice: '#EA7479',
      shape(c, r) {
        c.beginPath();
        c.moveTo(0, -r * .72);
        c.bezierCurveTo(r * .6, -r * .96, r * 1.06, -r * .55, r * .95, -r * .02);
        c.bezierCurveTo(r * .86, r * .5, r * .36, r * .92, 0, r * .98);
        c.bezierCurveTo(-r * .36, r * .92, -r * .86, r * .5, -r * .95, -r * .02);
        c.bezierCurveTo(-r * 1.06, -r * .55, -r * .6, -r * .96, 0, -r * .72);
        c.closePath();
      },
      pattern(c, r) {
        // a handful of seeds, not a field of them
        for (const [x, y] of [[-.42, -.28], [.08, -.36], [.5, -.18], [-.18, .08], [.3, .2], [-.48, .3], [.02, .52]]) {
          seedDrop(c, x * r, y * r, r * .11, r * .05, -Math.PI / 2 + x * .5, '#F7E1AE');
        }
      },
      top(c, r) {
        for (const [a, l] of [[2.8, .42], [-2.55, .4], [-.6, .4], [.34, .42]]) leaf(c, 0, -r * .72, r * l, a, '#7FA060', .4);
        stem(c, 0, -r * .74, r * .05, -r * .98, r * .03, r * .09, '#7C9A5C');
      },
      inside(c, r) {
        disc(c, r, '#E2676E');
        disc(c, r * .9, '#F2999C');
        c.beginPath(); c.ellipse(0, r * .02, r * .26, r * .36, 0, 0, TAU); c.fillStyle = '#FADAD3'; c.fill();
      },
    },

    apple: {
      size: .96, axes: [.98, .94], base: '#B3C772', dark: '#91A855', shade: .6, juice: '#F2EACB',
      shape(c, r) {
        c.beginPath();
        c.moveTo(0, -r * .64);
        c.bezierCurveTo(r * .38, -r * .96, r * 1.0, -r * .84, r * .98, -r * .1);
        c.bezierCurveTo(r * .96, r * .56, r * .56, r * .98, r * .24, r * .93);
        c.bezierCurveTo(r * .1, r * .91, -r * .1, r * .91, -r * .24, r * .93);
        c.bezierCurveTo(-r * .56, r * .98, -r * .96, r * .56, -r * .98, -r * .1);
        c.bezierCurveTo(-r * 1.0, -r * .84, -r * .38, -r * .96, 0, -r * .64);
        c.closePath();
      },
      top(c, r) {
        stem(c, 0, -r * .62, r * .08, -r * .98, -r * .05, r * .09, '#7A5C42');
        leaf(c, r * .07, -r * .84, r * .48, -.45, '#7FA060');
      },
      inside(c, r) {
        disc(c, r, '#B3C772');
        disc(c, r * .92, '#F6F0D6');
        c.beginPath(); c.ellipse(0, 0, r * .22, r * .3, 0, 0, TAU); c.fillStyle = '#EDE3BE'; c.fill();
        for (const s of [-1, 1]) seedDrop(c, s * r * .08, 0, r * .16, r * .06, Math.PI / 2, '#755036');
      },
    },

    bomb: { size: .88, axes: [.92, .92], bomb: true },
  };
  const FRUIT = Object.keys(KINDS).filter((k) => !KINDS[k].bomb);

  function paintSkin(c, f, r, rnd) {
    const ax = r * f.axes[0], ay = r * f.axes[1];
    const shape = () => {
      if (f.shape) f.shape(c, r);
      else { c.beginPath(); c.ellipse(0, 0, ax, ay, 0, 0, TAU); }
    };
    shape();
    c.fillStyle = f.base;
    c.fill();
    c.save();
    shape();
    c.clip();
    if (f.pattern) f.pattern(c, r, rnd, shape);
    crescent(c, ax, ay, f.dark, f.shade || .6);
    c.restore();
    gloss(c, ax, ay, f.gloss == null ? .45 : f.gloss);
    if (f.top) f.top(c, r, rnd);
  }

  function paintBomb(c, r) {
    // fuse, behind the cap
    c.beginPath();
    c.moveTo(0, -r * .98);
    c.bezierCurveTo(r * .02, -r * 1.22, r * .3, -r * 1.16, r * .34, -r * 1.38);
    c.strokeStyle = '#B9AB8E'; c.lineWidth = r * .09; c.lineCap = 'round';
    c.stroke();
    const b = r * .92;
    disc(c, b, '#2A2825');
    c.save();
    c.beginPath(); c.arc(0, 0, b, 0, TAU); c.clip();
    crescent(c, b, b, '#131210', .9);
    c.restore();
    c.beginPath(); c.arc(0, 0, b - r * .025, 0, TAU);
    c.strokeStyle = 'rgba(236,231,222,.5)'; c.lineWidth = r * .05; c.stroke();
    gloss(c, b, b, .5);
    roundRect(c, -r * .22, -r * 1.08, r * .44, r * .22, r * .07);
    c.fillStyle = '#5A554D';
    c.fill();
  }

  /* ---------- Size and sprites ---------- */

  let W = 0, H = 0, DPR = 0, R = 0;

  function paint(half, fn) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = Math.ceil(half * 2 * DPR);
    const c = cv.getContext('2d');
    c.setTransform(DPR, 0, 0, DPR, cv.width / 2, cv.height / 2);
    fn(c);
    return cv;
  }

  function build() {
    for (const name in KINDS) {
      const f = KINDS[name];
      f.r = R * f.size;
      f.half = f.r * 1.6;
      f.skinImg = paint(f.half, (c) => (f.bomb ? paintBomb(c, f.r) : paintSkin(c, f, f.r, seeded(name))));
      if (f.inside) {
        f.inHalf = f.r + 1;
        f.insideImg = paint(f.inHalf, (c) => f.inside(c, f.r, seeded(name + '/in')));
      }
    }
  }

  function resize() {
    const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    if (w === W && h === H && dpr === DPR) return;
    W = w; H = h;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const r = Math.max(24, Math.min(42, W * .068, H * .046));
    if (Math.abs(r - R) > .5 || dpr !== DPR) { R = r; DPR = dpr; build(); }
  }

  /* ---------- State ---------- */

  let state = 'idle';            // idle → playing → (boom | ending) → over
  let score = 0, strikes = 0, best = 0, nextLife = 100;
  let flying = [], halves = [], drops = [], stains = [], streaks = [], notes = [], marks = [];
  let queue = [], waves = 0, calm = 0, waveAge = 0;
  let boom = null, endIn = 0, endWhy = '', overAt = 0, hintTimer = 0;
  const swipe = { n: 0, t: 0, x: 0, y: 0 };
  const blade = { has: false, x: 0, y: 0, t: 0, live: false, liveT: 0, down: false, pts: [] };

  try { best = Number(localStorage.getItem(STORE)) || 0; } catch (e) { /* private mode */ }

  const difficulty = () => Math.min(1, waves / 26);
  const gravity = () => H * (1.15 + .4 * difficulty());
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /* ---------- Throwing ---------- */

  function spawnWave() {
    waves++;
    waveAge = 0;
    const d = difficulty();
    const pick = () => FRUIT[Math.random() * FRUIT.length | 0];
    const roll = Math.random();
    const mode = waves <= 2 ? 'volley' : roll < .25 - d * .1 ? 'single' : roll < .68 ? 'volley' : 'sequence';
    const n = mode === 'single' ? 1
      : mode === 'volley' ? (waves <= 2 ? waves : 2 + (Math.random() * (1.6 + d * 3) | 0))
      : 3 + (Math.random() * (2 + d * 3) | 0);
    const items = Array.from({ length: n }, pick);

    if (waves > 2) {
      const chance = .2 + d * .35;
      if (mode === 'single') {
        if (Math.random() < chance * .5) items[0] = 'bomb';
      } else {
        if (Math.random() < chance) items.splice(1 + (Math.random() * items.length | 0), 0, 'bomb');
        if (d > .5 && Math.random() < .3) items.splice(Math.random() * items.length | 0, 0, 'bomb');
      }
    }

    const dir = Math.random() < .5 ? 1 : -1, len = items.length;
    items.forEach((kind, i) => {
      const t = mode === 'sequence' ? i * (.34 - d * .14) : Math.random() * .12;
      const xf = mode === 'sequence'
        ? .5 + dir * (-.36 + .72 * (i / Math.max(1, len - 1)))
        : .15 + Math.random() * .7;
      queue.push({ t, kind, xf });
    });
  }

  function launch(kind, xf) {
    const f = KINDS[kind], g = gravity();
    const x = xf * W, y = H + f.r * 1.3;
    const apex = H * (.08 + Math.random() * .34);
    const vy = -Math.sqrt(2 * g * (y - apex));
    const flight = -vy / g * 2.05;
    const land = W * (.2 + Math.random() * .6);
    flying.push({
      kind, x, y, vy,
      vx: (land - x) / flight,
      rot: Math.random() * TAU,
      spin: (Math.random() - .5) * (f.bomb ? 2.4 : 5),
      seed: Math.random() * TAU,
    });
  }

  /* ---------- Slicing ---------- */

  function slice(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
    if (l2 < .5) return;
    const ang = Math.atan2(dy, dx);
    for (let i = flying.length - 1; i >= 0; i--) {
      const o = flying[i], f = KINDS[o.kind];
      const t = clamp(((o.x - x0) * dx + (o.y - y0) * dy) / l2, 0, 1);
      const px = x0 + dx * t - o.x, py = y0 + dy * t - o.y;
      const hit = f.r * (f.bomb ? .8 : 1.1);   // small fruit, so a forgiving edge
      if (px * px + py * py > hit * hit) continue;
      flying.splice(i, 1);
      if (f.bomb) { explode(o); return; }
      cut(o, f, ang);
    }
  }

  function cut(o, f, ang) {
    const nx = -Math.sin(ang), ny = Math.cos(ang), push = R * 4.2;
    for (const side of [-1, 1]) {
      halves.push({
        kind: o.kind, side, age: 0,
        x: o.x + nx * side * 2,
        y: o.y + ny * side * 2,
        vx: o.vx * .7 + nx * side * push + Math.cos(ang) * R * .8,
        vy: o.vy * .55 + ny * side * push,
        rot: ang,
        spin: side * (1.4 + Math.random() * 1.8) + o.spin * .3,
        skin: o.rot - ang,
      });
    }
    splash(o, f, ang);
    score += 1;
    bump();
    if (!swipe.n) { swipe.x = 0; swipe.y = 0; }
    swipe.n++;
    swipe.t = performance.now() / 1000;
    swipe.x += o.x;
    swipe.y += o.y;
    hideHint();
    lifeCheck();
  }

  function splash(o, f, ang) {
    const col = f.juice;
    for (let i = 0; i < 16; i++) {
      const a = ang + (Math.random() - .5) * 2.2 + (i % 2 ? Math.PI : 0);
      const s = R * (1.5 + Math.random() * 5.5);
      drops.push({
        x: o.x, y: o.y,
        vx: Math.cos(a) * s + o.vx * .3,
        vy: Math.sin(a) * s + o.vy * .2 - R * 1.4,
        r: R * (.035 + Math.random() * .065),
        color: col, life: 0, max: .45 + Math.random() * .5,
      });
    }
    const blobs = [[0, 0, f.r * .4]];
    const n = 6 + (Math.random() * 5 | 0);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, d = f.r * (.4 + Math.random() * .95);
      blobs.push([Math.cos(a) * d, Math.sin(a) * d, f.r * (.05 + Math.random() * .17)]);
    }
    stains.push({ x: o.x, y: o.y, blobs, color: col, life: 0, max: 1.6 });
    if (stains.length > 16) stains.shift();
    streaks.push({ x: o.x, y: o.y, ang, len: f.r * 1.5, life: 0, max: .2 });
  }

  function explode(o) {
    state = 'boom';
    const rays = [];
    for (let i = 0; i < 14; i++) rays.push([i / 14 * TAU + (Math.random() - .5) * .3, .03 + Math.random() * .07]);
    boom = { x: o.x, y: o.y, t: 0, o, rays, wiped: false };
    blade.live = false;
    blade.pts.length = 0;
    swipe.n = 0;
    queue.length = 0;
    hideHint();
  }

  function miss(o) {
    strikes++;
    drawStrikes();
    marks.push({ x: clamp(o.x, 24, W - 24), life: 0, max: 1.1 });
    if (strikes >= 3) { state = 'ending'; endIn = .9; endWhy = 'miss'; queue.length = 0; }
  }

  function lifeCheck() {
    while (score >= nextLife) {
      nextLife += 100;
      if (strikes > 0) { strikes--; drawStrikes(); }
    }
  }

  /* ---------- The blade ---------- */

  function feed(x, y, t) {
    if (!blade.has) { blade.has = true; blade.x = x; blade.y = y; blade.t = t; return; }
    const d = Math.hypot(x - blade.x, y - blade.y);
    if (d < .75) return;
    const v = d / Math.max(t - blade.t, .001);
    const x0 = blade.x, y0 = blade.y;
    blade.x = x; blade.y = y; blade.t = t;
    // fast enough to count as a swipe; a held button or a finger needs less
    let need = Math.min(W, H) * (blade.down ? .2 : .6);
    if (blade.live) need *= .55;
    if (v < need) {
      if (t - blade.liveT > .05) blade.live = false;
      return;
    }
    if (!blade.live) { blade.live = true; blade.pts.length = 0; blade.pts.push({ x: x0, y: y0, t }); }
    blade.liveT = t;
    blade.pts.push({ x, y, t });
    if (blade.pts.length > 64) blade.pts.shift();
    if (state === 'playing') slice(x0, y0, x, y);
  }

  addEventListener('pointermove', (e) => {
    if (state !== 'playing' && state !== 'ending') return;
    if (e.pointerType !== 'mouse' && !blade.down) return;
    const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ev of (list.length ? list : [e])) feed(ev.clientX, ev.clientY, ev.timeStamp / 1000);
  }, { passive: true });

  canvas.addEventListener('pointerdown', (e) => {
    if (state === 'over') {
      if (performance.now() - overAt > 700) stop();
      return;
    }
    blade.down = true;
    blade.has = false;
    feed(e.clientX, e.clientY, e.timeStamp / 1000);
  });

  const lift = (e) => {
    blade.down = false;
    if (!e || e.pointerType !== 'mouse') { blade.has = false; blade.live = false; }
  };
  addEventListener('pointerup', lift);
  addEventListener('pointercancel', lift);
  addEventListener('blur', () => lift());
  doc.addEventListener('pointerleave', () => { blade.has = false; blade.live = false; });

  /* ---------- Update ---------- */

  function update(dt, now) {
    if (boom) {
      boom.t += dt;
      if (boom.t > .62 && !boom.wiped) {
        boom.wiped = true;
        boom.o = null;
        flying = []; halves = []; drops = []; stains = []; streaks = []; notes = []; marks = [];
      }
      if (boom.t > 1 && state === 'boom') gameOver('bomb');
      if (boom.t > 1.3) boom = null;
      if (state === 'boom') return;   // everything holds still while it goes off
    }

    const g = gravity();

    if (state === 'playing') {
      for (let i = queue.length - 1; i >= 0; i--) {
        if ((queue[i].t -= dt) <= 0) { launch(queue[i].kind, queue[i].xf); queue.splice(i, 1); }
      }
      waveAge += dt;
      if (!queue.length) {
        if (!flying.length) {
          calm += dt;
          if (calm > .45) { calm = 0; spawnWave(); }
        } else {
          calm = 0;
          // later on, the next wave comes up while the last one is still falling
          if (difficulty() > .35 && waveAge > 1.4 && flying.every((o) => o.vy > 0) && Math.random() < dt * 2) spawnWave();
        }
      }
    }

    if (state === 'ending' && (endIn -= dt) <= 0) gameOver(endWhy);

    for (let i = flying.length - 1; i >= 0; i--) {
      const o = flying[i], f = KINDS[o.kind];
      o.vy += g * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.spin * dt;
      if (o.vy > 0 && o.y - f.r * 1.3 > H) {
        flying.splice(i, 1);
        if (!f.bomb && state === 'playing') miss(o);
      }
    }
    for (let i = halves.length - 1; i >= 0; i--) {
      const h = halves[i];
      h.vy += g * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.spin * dt; h.age += dt;
      if (h.y - KINDS[h.kind].r * 2 > H) halves.splice(i, 1);
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.vy += g * .8 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life += dt;
      if (d.life > d.max) drops.splice(i, 1);
    }
    for (const list of [stains, streaks, notes, marks]) {
      for (let i = list.length - 1; i >= 0; i--) if ((list[i].life += dt) > list[i].max) list.splice(i, 1);
    }

    // a combo is counted once the swipe that made it is over
    if (swipe.n && now - swipe.t > (blade.live ? .32 : .16)) {
      if (swipe.n >= 3 && state === 'playing') {
        score += swipe.n;
        bump();
        // over the middle of the fruit it came from, a little above
        notes.push({
          x: swipe.x / swipe.n, y: clamp(swipe.y / swipe.n - R * 2, H * .18, H * .8),
          text: swipe.n + ' fruit combo', sub: '+' + swipe.n, life: 0, max: 1.3,
        });
        lifeCheck();
      }
      swipe.n = 0;
    }
  }

  /* ---------- Draw ---------- */

  function sprite(img, half) { ctx.drawImage(img, -half, -half, half * 2, half * 2); }

  function drawWhole(o) {
    const f = KINDS[o.kind];
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot);
    sprite(f.skinImg, f.half);
    ctx.restore();
  }

  function drawHalf(h) {
    const f = KINDS[h.kind], big = f.r * 3;
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.rot);
    // this half of the skin
    ctx.save();
    ctx.beginPath();
    if (h.side > 0) ctx.rect(-big, 0, big * 2, big); else ctx.rect(-big, -big, big * 2, big);
    ctx.clip();
    ctx.rotate(h.skin);
    sprite(f.skinImg, f.half);
    ctx.restore();
    // the cut face, opening up as the half turns towards you
    const k = .1 + .4 * easeOut(Math.min(1, h.age / .22));
    const th = -h.skin, ax = f.axes[0], ay = f.axes[1];
    const chord = 1 / Math.sqrt(Math.cos(th) ** 2 / (ax * ax) + Math.sin(th) ** 2 / (ay * ay));
    ctx.scale(chord, k * chord);
    sprite(f.insideImg, f.inHalf);
    ctx.restore();
  }

  function drawBomb(o, now) {
    const f = KINDS.bomb, r = f.r;
    const p = .5 + .5 * Math.sin(now * 7 + o.seed);
    ctx.save();
    ctx.translate(o.x, o.y);
    // a slow warm pulse, so it reads as trouble against the dark
    ctx.beginPath();
    ctx.arc(0, 0, r * (1.18 + .1 * p), 0, TAU);
    ctx.fillStyle = 'rgba(214,96,58,' + (.1 + .08 * p).toFixed(3) + ')';
    ctx.fill();
    ctx.rotate(o.rot);
    sprite(f.skinImg, f.half);
    // the spark at the end of the fuse
    const s = r * (.16 + Math.random() * .08);
    ctx.translate(r * .34, -r * 1.38);
    ctx.rotate(Math.random() * TAU);
    ctx.strokeStyle = '#F2B24C';
    ctx.lineWidth = r * .045;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU, l = s * (.6 + Math.random() * .6);
      ctx.moveTo(Math.cos(a) * s * .25, Math.sin(a) * s * .25);
      ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s * .32, 0, TAU);
    ctx.fillStyle = '#FFF4DC';
    ctx.fill();
    ctx.restore();
  }

  function drawStain(s) {
    const k = s.life / s.max;
    ctx.globalAlpha = .42 * Math.pow(1 - k, 1.6);
    ctx.fillStyle = s.color;
    ctx.beginPath();
    for (const [x, y, r] of s.blobs) { ctx.moveTo(s.x + x + r, s.y + y); ctx.arc(s.x + x, s.y + y, r, 0, TAU); }
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawDrop(d) {
    const k = d.life / d.max, sp = Math.hypot(d.vx, d.vy);
    ctx.globalAlpha = k < .6 ? 1 : 1 - (k - .6) / .4;
    ctx.fillStyle = d.color;
    ctx.beginPath();
    const r = d.r * (1 - k * .4);
    ctx.ellipse(d.x, d.y, r * (1 + Math.min(1.6, sp / (R * 8))), r, Math.atan2(d.vy, d.vx), 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawStreak(s) {
    const k = s.life / s.max;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.ang);
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(0, 0, s.len * (.7 + .5 * k), Math.max(.6, R * .045 * (1 - k)), 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawBlade(now) {
    const pts = blade.pts;
    while (pts.length && now - pts[0].t > .1) pts.shift();
    if (pts.length < 2) return;
    const n = pts.length, wMax = clamp(R * .12, 3.5, 7) / 2, left = [], right = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b.x - a.x, ty = b.y - a.y;
      const l = Math.hypot(tx, ty) || 1;
      tx /= l; ty /= l;
      const w = wMax * Math.pow(i / (n - 1), .8);
      left.push([p.x - ty * w, p.y + tx * w]);
      right.push([p.x + ty * w, p.y - tx * w]);
    }
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i][0], left[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath();
    ctx.shadowColor = 'rgba(236,231,222,.55)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = BONE;
    ctx.fill();
    ctx.restore();
  }

  function drawNote(nt) {
    const k = nt.life / nt.max;
    const a = Math.min(1, nt.life / .12) * (k < .7 ? 1 : 1 - (k - .7) / .3);
    const y = nt.y - R * .5 * easeOut(k);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    // a soft dark halo keeps it readable over pale flesh
    ctx.shadowColor = 'rgba(12,12,11,.85)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = BONE;
    ctx.font = 'italic 300 ' + Math.max(24, Math.round(R * .9)) + 'px "Cormorant Garamond", Garamond, Georgia, serif';
    const half = ctx.measureText(nt.text).width / 2 + 16;
    const x = W > half * 2 ? clamp(nt.x, half, W - half) : W / 2;   // never off the edge
    ctx.fillText(nt.text, x, y);
    ctx.fillStyle = OCHRE;
    ctx.font = '500 12px Archivo, "Helvetica Neue", Arial, sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
    ctx.fillText(nt.sub, x, y + Math.round(R * .5));
    ctx.restore();
  }

  function drawMark(m) {
    const k = m.life / m.max, s = 6, y = H - 30 - 14 * easeOut(k);
    ctx.save();
    ctx.globalAlpha = k < .6 ? 1 : 1 - (k - .6) / .4;
    ctx.strokeStyle = OCHRE;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(m.x - s, y - s); ctx.lineTo(m.x + s, y + s);
    ctx.moveTo(m.x + s, y - s); ctx.lineTo(m.x - s, y + s);
    ctx.stroke();
    ctx.restore();
  }

  function drawBoom(now) {
    const t = boom.t;
    if (boom.o) {
      drawBomb(boom.o, now);
      ctx.globalAlpha = Math.min(1, t / .3);
      disc(ctx, KINDS.bomb.r * 1.1, BONE, boom.x, boom.y);
      ctx.globalAlpha = 1;
    }
    if (t < .62) {
      const e = easeOut(Math.min(1, t / .55)), len = Math.hypot(W, H) * (.15 + .95 * e);
      ctx.save();
      ctx.translate(boom.x, boom.y);
      ctx.rotate(t * .5);
      ctx.fillStyle = BONE;
      ctx.globalAlpha = .9;
      for (const [a, w] of boom.rays) {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, len, a - w, a + w); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    const flash = t < .38 ? 0 : t < .62 ? (t - .38) / .24 : Math.max(0, 1 - (t - .62) / .6);
    if (flash > 0) {
      ctx.globalAlpha = flash * .92;
      ctx.fillStyle = BONE;
      ctx.fillRect(-20, -20, W + 40, H + 40);
      ctx.globalAlpha = 1;
    }
  }

  function draw(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (boom && boom.t < .5 && !reduce.matches) {
      const s = 8 * (1 - boom.t / .5);
      ctx.translate((Math.random() - .5) * s, (Math.random() - .5) * s);
    }
    stains.forEach(drawStain);
    halves.forEach(drawHalf);
    for (const o of flying) { if (KINDS[o.kind].bomb) drawBomb(o, now); else drawWhole(o); }
    drops.forEach(drawDrop);
    streaks.forEach(drawStreak);
    drawBlade(now);
    notes.forEach(drawNote);
    marks.forEach(drawMark);
    if (boom) drawBoom(now);
  }

  /* ---------- Loop ---------- */

  let raf = 0, last = 0;

  const busy = () => flying.length || halves.length || drops.length || stains.length ||
    streaks.length || notes.length || marks.length || boom || blade.pts.length;

  function frame(ts) {
    raf = 0;
    if (state === 'idle') return;
    const dt = last ? Math.min((ts - last) / 1000, 1 / 30) : 1 / 60;
    last = ts;
    const now = performance.now() / 1000;
    update(dt, now);
    draw(now);
    if (state === 'over' && !busy()) { last = 0; return; }   // nothing left moving
    raf = requestAnimationFrame(frame);
  }
  function run() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }

  /* ---------- HUD ---------- */

  function bump() {
    ui.score.textContent = String(score);
    ui.score.classList.remove('is-bump');
    void ui.score.offsetWidth;
    ui.score.classList.add('is-bump');
  }

  function drawStrikes() {
    ui.strikes.forEach((li, i) => li.classList.toggle('is-lost', i < strikes));
  }

  function hideHint() {
    clearTimeout(hintTimer);
    root.classList.remove('is-hint');
  }

  function setButton(text, on) {
    label.textContent = text;
    toggle.classList.toggle('is-on', on);
  }

  function keepBest() {
    if (score <= best) return false;
    best = score;
    try { localStorage.setItem(STORE, String(best)); } catch (e) { /* private mode */ }
    return true;
  }

  /* ---------- Start, stop, game over ---------- */

  function start() {
    resize();
    score = 0; strikes = 0; nextLife = 100;
    waves = 0; calm = 0; waveAge = 0;
    flying = []; halves = []; drops = []; stains = []; streaks = []; notes = []; marks = []; queue = [];
    boom = null; swipe.n = 0;
    blade.pts.length = 0; blade.live = false; blade.has = false; blade.down = false;
    ui.score.textContent = '0';
    ui.best.textContent = String(best);
    drawStrikes();
    root.classList.remove('is-over', 'is-best');
    doc.classList.add('is-game', 'has-played');
    root.classList.add('is-hint');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(hideHint, 3200);
    state = 'playing';
    setButton('Stop', true);
    run();
  }

  function stop() {
    if (state === 'idle') return;
    keepBest();
    state = 'idle';
    hideHint();
    doc.classList.remove('is-game');
    setButton('Play now', false);
    setTimeout(() => {
      if (state !== 'idle') return;
      root.classList.remove('is-over', 'is-best');
      flying = []; halves = []; drops = []; stains = []; streaks = []; notes = []; marks = [];
      boom = null;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 650);
  }

  function gameOver(why) {
    state = 'over';
    overAt = performance.now();
    const isBest = keepBest();
    ui.note.textContent = '( ' + (why === 'bomb' ? 'Bomb' : 'Three dropped') + ' )';
    ui.final.textContent = String(score);
    ui.top.textContent = String(best);
    root.classList.toggle('is-best', isBest);
    root.classList.add('is-over');
    setButton('Play again', false);
  }

  toggle.addEventListener('click', () => {
    if (state === 'idle' || state === 'over') start(); else stop();
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && state !== 'idle') stop(); });
  addEventListener('resize', () => { if (state !== 'idle') resize(); });
  addEventListener('pagehide', stop);
})();
