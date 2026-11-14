# The engine

A film is a page (`index.html`) with one paused GSAP timeline. The renderer seeks that timeline frame by frame in
headless Chromium and encodes what it sees. `examples/langit-biru/film.js` is a whole film written this way.

## The skeleton

```html
<link rel="stylesheet" href="../../kit/css/film.css" />
<link rel="stylesheet" href="film.css" />
<script type="importmap">
  { "imports": { "three": "../../node_modules/three/build/three.module.min.js", "three/addons/": "../../node_modules/three/examples/jsm/" } }
</script>
<script src="../../node_modules/gsap/dist/gsap.min.js"></script>
<div id="root">
  <section class="scene" id="s01">...</section>
</div>
<script type="module" src="film.js"></script>
```

```js
import { createFilm } from "../../kit/engine/motion.js";
const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, $$, stage, shots: s } = film;

film.captions();                                   // every shot's caption, from the storyboard
film.chapters({ from: s.s05.start, until: s.s20.end });

film.scene("#s01", 0, s.s02.start);                // visible only in that window
film.typeIn(film.split("#title"), 0.12);
film.finish();                                     // always last
```

## What `createFilm` gives you

| Helper | Does |
| --- | --- |
| `shots` | every storyboard shot by id, with `start`, `end`, `dur` |
| `W`, `H`, `portrait` | the frame's size, from the storyboard's `format` |
| `scene(sel, start, end)` | shows a `.scene` for that window |
| `show`, `hide`, `land(sel, at)`, `pop(sel, at)` | fade; rise into place; pop in with overshoot |
| `split(sel)`, `typeIn(chars, at)`, `typeOut(chars, at)` | a heading as characters that arrive and leave one by one |
| `sheen(sel, at)` | a band of light across a `.display` heading |
| `motionBlur(sceneSel)` -> `blur(at, dur, x, y)` | directional blur for a whole scene during a fast move |
| `hit(at, strength, ring)` | a flash and a shock ring, for the moments the sound lands on |
| `whip(from, to, at, { vertical, blur })` | a whip pan between two scenes; the stage travels too |
| `light({ lx, ly, glow, floor, ... }, at, dur)`, `tintTo("#hex", at, dur)` | move and recolour the stage's light |
| `draw(pathSel, at, dur)` | draws SVG paths from their start (give the path `pathLength="1"`) |
| `count(sel, from, to, at, dur, format)` | counts a number in an element |
| `captions({ style })`, `chapters({ from, until })` | generated from the storyboard; captions keep time with the narration when there is one (`voice.md`) |
| `each(fn)` | a job run on every frame, after the timeline: draw canvases and anything GSAP cannot hold |
| `stage` | the stage's state: `lx ly glow r g b floor horizon camx camy pr ps flash streak silk` |

`tl` is the timeline itself: use `tl.to(...)`, `tl.set(...)`, `tl.fromTo(...)` for everything else.

## Canvases and 3D

Anything drawn in a canvas keeps its state in a plain object the timeline tweens, and draws it in `film.each`:

```js
const lab = createLab($("#lab"));                  // a 2D canvas: lab.L is its state, lab.draw(t) draws a frame
film.each((t) => lab.draw(t));
tl.to(lab.L.beam, { x1: 1300, duration: 1.1 }, s.s03.start + 0.65);
```

3D uses `kit/engine/stage3d.js`: a three.js canvas with a studio environment, materials that read as real
(`ceramic`, `gold`, `graphite`, `glass`, `glow`) and a camera set so one world unit is `UNIT` pixels at the plane
the subject sits on, so things can be placed by pixels with `space.at(x, y)`. `examples/langit-biru/earth.js` is a
globe with NASA's maps for its surface and a shader for its clouds, glint and air; `earth.render(state, t)` is
called from `film.each`.

Anything loaded from a file (a texture, a font, data) must be loaded before `film.finish()`: `await` it, as
`createEarth` does. A frame drawn before its texture arrived is a frame that renders differently each time.

## Rules that keep a film seekable

- **Never read the clock.** No CSS animation, `requestAnimationFrame`, `setTimeout`, `Date.now()`,
  `performance.now()` or unseeded `Math.random()`. A value is a function of `tl.time()`.
- **GSAP rounds some values.** A dash offset in px is rounded to whole numbers, so a drawn line jumps. Use
  `film.draw`, or keep the value in a state object and write it in `film.each`.
- **`fromTo` and `from` apply their start values the moment they are created.** If an earlier tween animates the
  same property, the later one's start value leaks backwards in time. Pass `immediateRender: false`, or use
  `tl.set` then `tl.to`.
- **Show a thing on the frame its tween starts**, not a frame earlier, or it flashes in its previous pose.
- **A CSS filter flattens 3D.** Put `perspective` and 3D transforms inside the element that gets the blur, not on it.
- **Stacked labels** (a counter that changes, a state that swaps) are several elements cross-faded, not text
  rewritten by a callback.
- **Give every part a home in the page**: scenes are siblings inside `#root`, later ones on top; the kit adds the
  stage canvas first and the flash and vignette last.

## Rendering

```sh
node kit/tools/render.mjs films/NAME --stills 1.5,4.2      # finished PNG stills (bloom and grain applied)
node kit/tools/render.mjs films/NAME                       # the picture, in four-second segments
node kit/tools/render.mjs films/NAME --only 12-16          # re-render only the segments touching 12 s to 16 s
node kit/tools/render.mjs films/NAME --serve               # watch it live: open the printed URL
node kit/tools/render.mjs films/NAME --fps 30              # a faster draft
node kit/tools/render.mjs films/NAME --stills 3 --safe     # a still with the app-covered areas shaded
node kit/tools/make.mjs films/NAME                         # everything in order: check, voice, render, mix, measure
```

What was learned about speed on a machine with no GPU (four cores, software WebGL):

- A frame costs about half a second all told. A minute at 60 fps is roughly half an hour.
- Chromium encodes a grainy 1080p PNG in over a second and a near-lossless JPEG in under a tenth; the renderer
  captures JPEG at quality 98.
- Pages in one browser take turns, so each job runs its own browser.
- The bloom is blurred at quarter size: same look, a fraction of the cost.
- Segments are what make review affordable: fix a shot, re-render its segments, and the rest are reused.
  A change that moves every later shot (a retime) invalidates everything after it.

`references/raea.md` covers rendering with raea on a machine with a GPU.
