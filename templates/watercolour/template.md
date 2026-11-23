# Watercolour

Painted · 2D · default portrait 9:16, voice-over · concept: no sample film yet

Soft washes and fine ink on textured paper, accurate like a natural history plate.

Works for: nature, animals, plants, the body.

## The look, line by line

These are the lines the gallery's prompt carries for this template. The film follows every one of them, in every shot,
whatever the topic: the topic decides what is shown, the template decides how it looks.

- **Background and set:** cold-pressed watercolour paper (#fbf8f1) with visible grain and a deckled edge.
- **Light:** soft daylight; the washes are lighter where the light falls.
- **Colour:** soft transparent washes in a natural palette chosen for the subject (sap green #5fb49c, ultramarine #3d5a98, burnt sienna #c0703f, rose #d77a8b), pigment pooling at the edges, with one stronger accent for the point.
- **Line:** fine ink outlines (#2b2b2b) over the washes, slightly broken.
- **How things are drawn:** natural-history illustration: plants, animals, landscapes and the body, drawn accurately like a field guide; cross-sections painted like a botanical plate.
- **Type:** an elegant serif (Cormorant Garamond or Fraunces) in ink, with italic labels.
- **Captions:** a short line at a time in ink, the key word in the accent wash.
- **Labels and numbers:** thin ink leader lines to italic labels, like a scientific plate; numbers in serif figures, at their real values.
- **Camera:** slow pans and gentle zooms over the painting, with parallax between painted layers.
- **Motion and transitions:** washes bloom and spread as they appear, ink lines draw on, things move slowly and gently. Cuts by a new wash flooding the page.
- **Composition:** plenty of paper, the subject centred like a plate.
- **Finish:** paper texture and soft edges; no glow and no hard shadows.
- **Sound:** a calm acoustic bed (piano, strings) with soft brush and water sounds.
- **Never:** hard vector edges, neon colours, 3D, or busy backgrounds.

## With the kit

- In `storyboard.json`: `"template": "watercolour"`, and `look.accent` from the palette below. `kit/engine/look.js` then sets
  the stage (paper), the type, the caption skin (ink) and, when `stepped` is set, the frame rate the
  picture advances at (every frame).
- kit/engine/ink.js: wash() for watercolour washes that bloom in, drawOn for the ink lines
- paper() for cold-pressed grain
- Palette: #fbf8f1, #2b2b2b, #5fb49c, #3d5a98, #c0703f, #d77a8b.
- The render's finishing pass follows `template.json` `finish` (bloom 0, grain 3).
- Check the look against `golden/` with `node kit/tools/lookmatch.mjs films/NAME` before the full render
  (`references/templates.md`).

## Status

A concept: no sample film yet. `golden/concept.jpg` is a drawn still; `golden/proof-1.jpg` and `proof-2.jpg` are
frames of a short engine proof made with kit/engine/ink.js (washes that bloom in, with fine ink lines drawn over them), which matches this template on every `lookmatch.mjs` measure.
The first real film made in this template is its sample: check it against these lines and the stills, then add its
frames to `golden/`.
