# Stickman

Hand-drawn 2D · 2D · default portrait 9:16, voice-over · ready

Black-ink stick figures on warm paper, drawn line by line, with one marker colour for the point.

Works for: everyday physics, habits, history, quick explainers.

## The look, line by line

These are the lines the gallery's prompt carries for this template. The film follows every one of them, in every shot,
whatever the topic: the topic decides what is shown, the template decides how it looks.

- **Background and set:** warm off-white paper (#f6f1e7) with a faint grain and a soft vignette; nothing on the page but what is being explained.
- **Line:** black ink (#1b1b1b), about 6 px on a 1080 px frame, slightly wobbly and boiling (each line redrawn with a tiny variation every 3 frames), round caps, drawn on stroke by stroke as it appears.
- **Colour:** black ink only, plus one marker colour taken from the subject (yellow #f2c14e, red #e4572e or blue #3a86ff) used as a flat highlighter on the one thing that matters.
- **Characters:** stick figures with a round head, a body and four limbs; two dot eyes and a line mouth that change with the emotion; they point, push, stumble and cheer in big, readable poses.
- **How things are drawn:** objects as simple outline drawings with a few hatch strokes for shade, recognisable rather than iconic; diagrams as hand-drawn arrows, circles, underlines and boxes.
- **Type:** a hand-lettered marker face (Caveat Brush or Permanent Marker) for headings and labels, written on as if by hand; numbers large and hand-written.
- **Captions:** two or three hand-lettered words at a time under the drawing, the key word underlined or circled in the marker colour.
- **Labels and numbers:** labels hand-written beside what they name with a curved arrow; numbers at their real value, and charts drawn by hand from them.
- **Camera:** a flat page; the camera pans and zooms across one big drawing as the story moves, like travelling along a sketchbook spread.
- **Motion and transitions:** anticipation before every action, squash and stretch, characters on twos (12 frames per second) while the lines boil; scenes change by flipping to a new page, wiping the page or sliding to fresh paper.
- **Composition:** plenty of paper around the drawing, one idea per page; in portrait, the drawing in the upper two thirds.
- **Finish:** paper grain and a faint pencil sketch under the ink; no gradients, no glow.
- **Sound:** a light acoustic bed (ukulele, pizzicato, claps) with pen scratches as lines are drawn, and pops and boings on actions.
- **Never:** clip art, vector-perfect lines, gradients, 3D, photo backgrounds, or more than one marker colour.

## With the kit

- In `storyboard.json`: `"template": "stickman"`, and `look.accent` from the palette below. `kit/engine/look.js` then sets
  the stage (paper), the type, the caption skin (hand) and, when `stepped` is set, the frame rate the
  picture advances at (12 fps, held between).
- kit/engine/ink.js: drawOn, boil and roughen for every line; marker() for the one highlight
- SVG for the figures and objects: one <path> per stroke, so each can be drawn on
- Palette: #f6f1e7, #1b1b1b, #f2c14e, #e4572e, #3a86ff.
- The render's finishing pass follows `template.json` `finish` (bloom 0, grain 3).
- Check the look against `golden/` with `node kit/tools/lookmatch.mjs films/NAME` before the full render
  (`references/templates.md`).

## Status

Ready: its first sample film is `examples/troli-penuh` (Why a full trolley is hard to push), made with the kit, checked by
`check.mjs` and `lookmatch.mjs`, reviewed twice by an independent critic and revised after each review before it was published. `golden/` holds
three of its frames beside the concept still and the engine proof, so later films are measured against a real one.

## Sample films

- `full-trolley`: Why a full trolley is hard to push (`examples/troli-penuh`)
