# Micro

Illustrated 3D · 3D · default portrait 9:16, voice-over · ready: made in sample films

The world too small to see: cells, tissue and molecules, magnified and lit so they look alive.

Works for: biology, health, chemistry, states of matter.

## The look, line by line

These are the lines the gallery's prompt carries for this template. The film follows every one of them, in every shot,
whatever the topic: the topic decides what is shown, the template decides how it looks.

- **Background and set:** start on the everyday thing (a finger, a glass of water), then a lens opens over it and dives in. Inside: a lit cross-section of the tissue, or a clear liquid with depth.
- **Light:** soft light from the upper left, with gentle highlights and shadows on every cell and molecule. The stage light sits where the work is happening and changes colour at the key change (water blue to ice cyan, warm pink while tissue heals).
- **Colour:** one colour per actor, kept for the whole film (for example blood red, a healing cyan for white cells, pale ivory for skin cells, a sickly yellow-green for germs; deep blue for liquid water, cyan for ice). Warm and organic for the body, cold and clean for chemistry.
- **Materials:** translucent cells with soft rims and a visible nucleus; tissue layers with real thickness and texture; molecules as glossy shaded spheres with bonds, in their true geometry.
- **How things are drawn:** real shapes and behaviour from histology and chemistry: cells squeeze, crawl and engulf; molecules jiggle, bond and settle into their lattice. A time bar or a scale bar says how long or how small.
- **Type:** Sora for headings, in a brushed-metal fill that arrives letter by letter or slams in by line (scale 1.5 to 1, blur to sharp) on the beat, with one sheen after it lands; Inter for captions and labels; JetBrains Mono, large, for every number. Portrait: headings 100 px or more, labels 36 px or more, nothing under 28 px. Landscape: captions 40 px, labels 30 px or more.
- **Captions:** two or three big words at a time in step with the voice (or the reading pace when there is no voice), the word being said lit, the key word in the accent colour; a dark plate fades in behind them wherever the picture is light. Everything that must be read stays inside the app's safe area.
- **Labels and numbers:** glass chips on structures with their real names; numbers at their true values, with bars drawn from them; the magnification written on screen.
- **Camera:** a lens dive from the familiar object into the small world, then slow drifts and orbits that follow one cell or one molecule; a pull back out at the end.
- **Motion and transitions:** organic easing: things swell, squash and settle; a slow jiggle for liquids, stillness for solids; the cause of every change is visible. Something carries across every cut.
- **Composition:** the action fills the frame; in portrait, the caption sits under it.
- **Finish:** soft bloom on highlights and fine film grain that changes every frame; colours checked on the finished still, not the raw page.
- **Sound:** a soft bed with gentle organic sounds (pops, squelches, glassy ticks) on each step.
- **Never:** textbook clip art, flat diagrams with only arrows, neon outlines, or faces on cells.

## With the kit

- In `storyboard.json`: `"template": "micro"`, and `look.accent` from the palette below. `kit/engine/look.js` then sets
  the stage (graphite), the type, the caption skin (house) and, when `stepped` is set, the frame rate the
  picture advances at (every frame).
- kit/engine/tissue3d.js for tissue at measured sizes
- kit/engine/stage3d.js for molecules as lit spheres
- Palette: #0b0b0c, #e8463d, #7fe3da, #f3ead8, #7fe6ff.
- The render's finishing pass follows `template.json` `finish` (bloom 0.34, grain 5).
- Check the look against `golden/` with `node kit/tools/lookmatch.mjs films/NAME` before the full render
  (`references/templates.md`).

## Sample films

- `wound-healing`: How a wound closes by itself
- `floating-ice`: Why ice floats
