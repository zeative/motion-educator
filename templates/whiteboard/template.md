# Whiteboard

Marker sketch · 2D · default landscape 16:9, voice-over · concept: no sample film yet

Marker sketches drawn live on a white board, from drawing to drawing as the story goes.

Works for: business, science, step-by-step processes.

## The look, line by line

These are the lines the gallery's prompt carries for this template. The film follows every one of them, in every shot,
whatever the topic: the topic decides what is shown, the template decides how it looks.

- **Background and set:** a clean white board (#fbfbf8) with a faint shine and a few ghost marks of old ink.
- **Light:** flat and bright, with a slight vignette.
- **Colour:** black marker (#1e1e1e) for most lines, blue (#2f80ed) for the key idea and red (#eb5757) for warnings.
- **Line:** marker strokes of even weight with rounded ends and a slightly dry edge, drawn on stroke by stroke.
- **How things are drawn:** sketched explanations: simple drawings, arrows, boxes, flow charts and quick graphs, the way a good presenter draws live. A hand holding the marker may draw the key strokes.
- **Type:** hand-written marker lettering (Patrick Hand or Kalam), written on as it is said.
- **Captions:** short hand-written lines beside the drawing, the key word boxed or underlined in colour.
- **Labels and numbers:** hand-drawn arrows and labels; graphs drawn by hand from the real numbers.
- **Camera:** the camera tracks along one long board from drawing to drawing as the story unfolds.
- **Motion and transitions:** everything is drawn on at writing speed and erased with a quick wipe; apart from a few elements that slide to show a change, nothing moves except by being drawn.
- **Composition:** landscape by default, with wide white space and one drawing at a time.
- **Finish:** clean, with no grain and no glow.
- **Sound:** a light, upbeat bed with marker squeaks and taps.
- **Never:** typed fonts, large colour fills, 3D, or photo backgrounds.

## With the kit

- In `storyboard.json`: `"template": "whiteboard"`, and `look.accent` from the palette below. `kit/engine/look.js` then sets
  the stage (whiteboard), the type, the caption skin (marker) and, when `stepped` is set, the frame rate the
  picture advances at (every frame).
- kit/engine/ink.js: drawOn at writing speed with the marker filter
- the board is the stage: the camera tracks along it (stage.camx)
- Palette: #fbfbf8, #1e1e1e, #2f80ed, #eb5757.
- The render's finishing pass follows `template.json` `finish` (bloom 0, grain 0).
- Check the look against `golden/` with `node kit/tools/lookmatch.mjs films/NAME` before the full render
  (`references/templates.md`).

## Status

A concept: no sample film yet. `golden/concept.jpg` is a drawn still; `golden/proof-1.jpg` and `proof-2.jpg` are
frames of a short engine proof made with kit/engine/ink.js (marker strokes and lettering drawn on at writing speed), which matches this template on every `lookmatch.mjs` measure.
The first real film made in this template is its sample: check it against these lines and the stills, then add its
frames to `golden/`.
