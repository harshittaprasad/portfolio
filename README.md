# Harshita Prasad: portfolio

Static site, no build step. Plain HTML, CSS and JavaScript.

One dark look across every page: near-black background, warm light type,
film grain, a soft lamp that follows the pointer, and a small star cursor.
Display type is Cormorant Garamond (upright + italic), the small print is
Archivo in uppercase, and the only accent is ochre, taken from the star in
the portrait.

```
index.html            Home: "welcome to my / portfolio", small print in three corners
work/index.html       Work + About on one page: a "Projects" folder that opens into the
                      projects grid, then About me below it at #about
work/flowledger/      The FlowLedger case study (project 1); the live app it links to is
                      flowledger-ai.vercel.app
work/zineps/          The Zineps case study (project 2); site/ inside it is the live
                      redesign itself, copied from claude projects/zineps-redesign
work/inclusivity/     Redesigning Inclusivity (project 3), a summary of the research
                      paper; the full PDF is assets/docs/redesigning-inclusivity.pdf
work/companions/      Emotionally Responsible AI Companions (project 4), a summary of the
                      NTCC research paper; the full PDF is
                      assets/docs/emotionally-responsible-ai-companions.pdf
about/index.html      Only forwards to work/#about, so old About links keep working
assets/css/base.css   Shared tokens, small print, header, grain, lamp, cursor, entrances
assets/css/home.css   Home layout
assets/css/work.css   Work layout
assets/css/about.css  The About me section (on the Work page)
assets/css/case.css   The older case study layout; no page uses it now (kept for reference)
assets/css/study.css  The case study pages (FlowLedger, Zineps, Redesigning Inclusivity) and their mockups
assets/js/site.js     Star cursor, lamp, file:// link fix (all pages)
assets/js/page.js     Fades things in once the fonts are ready, and About once it scrolls
                      into view; moves the menu underline to the section on screen
assets/js/game.js     Home: the Fruit Ninja game behind "( Play now )" in the footer
assets/js/work.js     Work: opens the folder and flies the projects out into the grid
assets/img/           favicon.svg, portrait.jpg, projects/ (the project covers);
                      art/ holds unused pictures from the archived v3
_posters/             poster.html (one poster at 1320 x 750) and render.sh, which turns each
                      poster's still into assets/img/projects/project-1..4.jpg (needs Chrome)
assets/js/posters.js  The halftone project posters on the Work page, played on hover
assets/css/posters.css  Their look
_archive/             Earlier versions, zipped: the ID-card site, two older Work pages,
                      the separate About page, and portfolio-v3-heat-folder.zip (the
                      light-grey picture-scroll version with the Projects folder)
```

## Run locally

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173. Opening `index.html` directly from disk also works.

## Things to fill in

- **Email and LinkedIn**: `harshittaprasad@gmail.com` and `linkedin.com/in/harshita-prasad-6304032a7`
  are live. They appear in `index.html` (footer) and `work/index.html` (About, top left).
- **Résumé**: the About page links to `assets/resume.pdf` (Harshita's one-page CV). Replace that file
  to update it, keeping the name.
- **The photo**: `assets/img/portrait.jpg`. To change it, replace the file and bump
  the `?v=` on its `<img>` in `work/index.html`.

## Editing the About text

The text lives in the About section of `work/index.html`, one line per `<span class="ln">`. Each line is
spread to the full column width, so short lines get wide gaps, which is the look.
Keep lines under about 40 characters so they fit on phones. Add `ln--para` to the
first line of a new paragraph for a small gap above it.

## The Work page

It opens on one blue "Projects" folder in the middle of the page. Click it and it
opens: four sheets rise out and each flies to its place in the grid as that
project's cover, under a big "projects" title. About me follows below.

Each project is one `<li class="proj">` in `work/index.html`: a picture, a name and
a few tags: FlowLedger, Zineps, Redesigning Inclusivity and Emotionally
Responsible AI Companions, each linking to its case study.

- **Picture**: replace `assets/img/projects/project-1.jpg` (and 2, 3, 4) with your
  own, keeping the names, or point the `src` at a new file. Pictures are cropped
  to a wide 660 × 375 frame. The sheets in the folder use the same files.
- **Name and tags**: edit the `proj__name` and `proj__tags` text.
- **Linking**: give the project's `<a class="proj__link">` an `href`.
- **More projects**: copy an `<li class="proj">`. Only the first four come out of
  the folder; any after that fade in.

## Case studies

Each project can have its own page in `work/<name>/`. There are four so far.

**FlowLedger** (`work/flowledger/`), **Zineps** (`work/zineps/`) and **Redesigning
Inclusivity** (`work/inclusivity/`) are laid out like a Behance case study, in the
site's dark theme, with `assets/css/study.css`:
a hero of device mockups with tag pills in the corners, then Problem Statement,
About Project (with the project facts), a big headline with a device rising into
it, Pain Points, a centred statement, a Project Timeline, a Design Foundation ring
diagram, Key Components, Typography, Color Palette, the Information Architecture,
and a walkthrough where each screen is joined by a line to a note on what it does.
Zineps also has Brand Identity, a laptop-and-phones "every screen" scene and its
two themes side by side.

- **Mockups** are drawn in CSS around real screenshots: `.phone`, `.laptop` and
  `.browser` (see the comments in `study.css` for the markup). Swap a screenshot by
  changing the `src` inside one.
- **Floating UI cards** (the white FlowLedger cards, the navy Zineps cards) are
  rebuilt in HTML with each product's own numbers, as `.fl-*` and `.zn-*` in
  `study.css`. Edit their text right in the page.
- **Placing things in a hero**: each `.hero__layer` takes `--x` / `--y` (left and
  top) and, on phones, `--mx` / `--my`; phones inside take `--pw` (and `--mpw`),
  cards a font size `--f` (and `--mf`). Add `hide-m` to drop a layer on phones.
- **Screenshots**: FlowLedger's phone screens are in `assets/img/projects/flowledger/`
  (from the live app). Zineps' desktop screenshots and `mobile-*.jpg` phone captures
  are in `assets/img/projects/zineps/`, taken from the redesign in `work/zineps/site/`.
  Its logo is `logo.svg` (and `logo-mark.svg`, the mark alone) in the same folder.
- **Wording**: the timeline steps and the design principles are a best reading of
  the projects; correct them if they're not right. Role, type and year are in the
  About Project facts.
- **The live redesign**: `work/zineps/site/` is a copy of
  `claude projects/zineps-redesign`. If you change the original, copy its
  `index.html` and `img/` over again.

**Redesigning Inclusivity** is a research paper rather than a product, so its
mockups are the paper itself: its pages fanned out in the hero, on a tablet, open
in a PDF viewer on a laptop, and one by one in the walkthrough. The pages are
`assets/img/projects/inclusivity/page-1.jpg` to `page-8.jpg`, rendered from
`assets/docs/redesigning-inclusivity.pdf`; if the PDF changes, render them again.
Its sections follow the paper: The Gap, the study in numbers, Research Phases,
the three measures, the findings, the E-DUX framework, E-DUX as interface and what
comes next. The calm interface cards (`.ed-*`) draw the three principles as
examples; the page says they are illustrations, not the study's own prototype.
The paper describes expected results, and so does the page.

**Emotionally Responsible AI Companions** (`work/companions/`, project 4) is the
NTCC research paper, laid out the same way. Its pages are
`assets/img/projects/companions/page-1.jpg` to `page-14.jpg` (US Letter, so the page
sets `--sheet-ar` for their shape), rendered from
`assets/docs/emotionally-responsible-ai-companions.pdf`. Its sections follow the
paper: Why Now (three figures from the studies it cites), regulation, The Gap, the
study in numbers, Research Phases, the measures and the Companion Dependency Index,
the expected findings, the goodbye moment, needs by relationship, the Responsible
Companion Framework, RCF as interface, limits and next steps. The companion chats
and cards (`.co-*`) are illustrations; the two manipulative goodbye lines are the
paper's own examples. Like the paper, the page describes expected results.

A case study's "Back to projects" link (`../#projects`) brings people back to the
Work page with the folder already open.

## The project posters

Each project's cover is a halftone poster: a grid of dots drawn in code, thick
enough in a wandering band across the middle to merge into solid colour with
pale holes, thinning into scattered specks towards the top and bottom and
dissolving under the list on the right. Over it sit the project's title in a
contrast colour, small labels in the corners and a list scrolling up the right
edge, in a deep shade of the dots. Each project has its own colours: cobalt dots
with a lime title (FlowLedger), teal with pink (Zineps), violet with amber
(Inclusivity) and orange with blue (Companions). The title is on the poster, so
only the tags sit under each card (the name is still there for screen readers).

At rest each poster is still. Pointing at a card plays it: the field of dots
drifts and breathes, the list scrolls, and the title types itself out again
behind a blinking cursor. Leaving brings it back to the still. It never plays on
touch screens or with reduced motion.

- **Editing a poster**: everything is in the `POSTERS` list at the top of
  `assets/js/posters.js`: the title (one string per line), the paper colour
  (`bg`), the dots, the title colour (`head`), the small text colour (`text`),
  `seed` (changes the shape of the band), the list and the corner labels. The
  look is in `assets/css/posters.css`.
- **The stills**: the folder sheets and the picture under each live poster are
  `assets/img/projects/project-1..4.jpg`, rendered from `_posters/poster.html`.
  After changing a poster, run `sh render.sh` in `_posters/` (or
  `ONLY=companions sh render.sh` for one), then bump the `?v=` on its
  `project-N.jpg` images in `work/index.html`. Open `_posters/poster.html?p=zineps&play`
  in a browser to watch one move.
- Earlier versions are in `_archive/`: `posters-v1-line-art.zip` and
  `posters-v2-scenes-and-art.zip` (the full-bleed pictures and the line art).

## The game

"( Play now )" at the bottom of the Home page opens a round of Fruit Ninja over
the cover; the button reads "( ● Stop )" while it runs, and Esc also stops it.
Fruit is thrown up from below: swipe through it (a quick flick with the mouse,
or drag a finger). Three or more in one swipe is a combo worth that many extra
points; three dropped fruit, or one sliced bomb, ends the game; every 100 points
wins back a dropped fruit. The best score is kept in the visitor's browser.
Everything lives in `assets/js/game.js` (the fruit are drawn in code, near the
top, under "The fruit") and the end of `assets/css/home.css`.

## After editing CSS or JS

Bump the `?v=` number on the `<link>` / `<script>` tags in all three HTML files so
browsers load the new file instead of a cached one.

## Deploying

Any static host works (Vercel, Netlify, GitHub Pages). Links use folder URLs
(`work/`, `about/`), which these hosts resolve to `index.html` automatically.
