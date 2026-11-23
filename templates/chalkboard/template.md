# Chalkboard

Chalk on board · 2D · default landscape 16:9, voice-over · concept: no sample film yet

A good teacher's board: chalk diagrams, formulas and graphs drawn as the voice explains.

Works for: maths, physics, chemistry, lessons.

## The look, line by line

These are the lines the gallery's prompt carries for this template. The film follows every one of them, in every shot,
whatever the topic: the topic decides what is shown, the template decides how it looks.

- **Background and set:** a dark green chalkboard (#1f3b2d) with faint smudges of old erased chalk and a wooden frame at the edges.
- **Light:** flat and even like a classroom, with a soft vignette.
- **Colour:** white chalk (#f2f2ea) for everything, plus at most two coloured chalks (yellow #f6d365, pink #f7a1b5 or blue #8fd3f4) for the key idea.
- **Line and texture:** chalk strokes with grainy edges and dust, drawn on stroke by stroke; erasing leaves a faint smear.
- **How things are drawn:** diagrams, formulas, graphs and quick sketches the way a good teacher draws them; real objects recognisable in a few lines.
- **Type:** hand-written chalk lettering (Cabin Sketch for headings, a neat chalk hand for the rest), written on as the voice says it; numbers large and neat.
- **Captions:** short lines written on the board as the words are said; the key word underlined in coloured chalk.
- **Labels and numbers:** arrows and labels drawn by hand; graphs with hand-drawn axes, plotted from the real numbers.
- **Camera:** a flat board; the camera slides and zooms across one large board as the lesson moves.
- **Motion and transitions:** everything appears by being drawn; corrections are crossed out; scenes change by wiping the board with a cloth or sliding to a clean section.
- **Composition:** landscape by default, like a real board; in portrait, one panel of the board at a time.
- **Finish:** chalk dust grain; no glow.
- **Sound:** a quiet bed with chalk scratches and taps and the soft wipe of the eraser.
- **Never:** type that looks typed, gradients, 3D, or bright neon colours.

## With the kit

- In `storyboard.json`: `"template": "chalkboard"`, and `look.accent` from the palette below. `kit/engine/look.js` then sets
  the stage (board), the type, the caption skin (chalk) and, when `stepped` is set, the frame rate the
  picture advances at (every frame).
- kit/engine/ink.js: drawOn with the chalk filter for every stroke and every letter
- the board is the stage: the camera slides along it (stage.camx)
- Palette: #1f3b2d, #f2f2ea, #f6d365, #f7a1b5, #8fd3f4.
- The render's finishing pass follows `template.json` `finish` (bloom 0, grain 4).
- Check the look against `golden/` with `node kit/tools/lookmatch.mjs films/NAME` before the full render
  (`references/templates.md`).

## Status

A concept: no sample film yet. `golden/concept.jpg` is a drawn still; `golden/proof-1.jpg` and `proof-2.jpg` are
frames of a short engine proof made with kit/engine/ink.js (chalk lines and lettering drawn on, on the board stage in its wooden frame), which matches this template on every `lookmatch.mjs` measure.
The first real film made in this template is its sample: check it against these lines and the stills, then add its
frames to `golden/`.
