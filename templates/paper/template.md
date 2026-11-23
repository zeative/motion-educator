# Paper Cut-out

Layered paper · 2D · default portrait 9:16, voice-over · concept: no sample film yet

Layers of cut craft paper with soft shadows between them, opening like a pop-up book.

Works for: nature, geography, biology, stories.

## The look, line by line

These are the lines the gallery's prompt carries for this template. The film follows every one of them, in every shot,
whatever the topic: the topic decides what is shown, the template decides how it looks.

- **Background and set:** layers of coloured craft paper cut out and stacked with small gaps, on a textured card backdrop.
- **Light:** one soft light from above, so every layer casts a small drop shadow on the one behind and the depth reads.
- **Colour:** a limited palette of five craft papers chosen for the subject (for example deep teal #264653, green #2a9d8f, yellow #e9c46a, orange #f4a261, red #e76f51) on cream #f8f1e5.
- **Texture:** visible paper fibre, slightly rough cut edges, the odd fold line.
- **How things are drawn:** everything is built from flat cut shapes: hills, organs, machines. Insides are revealed by lifting a flap or peeling back a layer.
- **Characters:** simple cut-out figures with jointed limbs that turn at split-pin joints.
- **Type:** a warm serif or bold grotesk (Fraunces or DM Sans Bold) printed on paper strips.
- **Captions:** two or three words at a time on a paper strip, the key word on a coloured tab.
- **Labels and numbers:** paper tags tied with thread to the part; numbers on stamped tags, at their real values.
- **Camera:** a top-down or slightly tilted rostrum camera with parallax between layers; slow pans and push-ins.
- **Motion and transitions:** shapes slide, flip, fold and pop up like a pop-up book, stepped at 12 frames per second. Cuts by a paper layer sliding across the frame.
- **Composition:** the scene fills the frame in three layers: background, middle and foreground.
- **Finish:** paper texture, soft shadows, gentle grain.
- **Sound:** a gentle acoustic bed with paper rustles, snips and soft taps.
- **Never:** vector gradients, glow, 3D renders, or perfectly clean edges.

## With the kit

- In `storyboard.json`: `"template": "paper"`, and `look.accent` from the palette below. `kit/engine/look.js` then sets
  the stage (paper), the type, the caption skin (strip) and, when `stepped` is set, the frame rate the
  picture advances at (12 fps, held between).
- kit/engine/ink.js: paper() for the fibre texture, and its cut-shadow filter for the layers
- SVG or HTML layers, each with a drop shadow; parallax from the camera
- Palette: #f8f1e5, #264653, #2a9d8f, #e9c46a, #f4a261, #e76f51.
- The render's finishing pass follows `template.json` `finish` (bloom 0, grain 3).
- Check the look against `golden/` with `node kit/tools/lookmatch.mjs films/NAME` before the full render
  (`references/templates.md`).

## Status

A concept: no sample film yet. `golden/concept.jpg` is a drawn still; `golden/proof-1.jpg` and `proof-2.jpg` are
frames of a short engine proof made with kit/engine/ink.js's cut-paper filter (craft-paper layers with a soft cut shadow, popping up at 12 frames a second), which matches this template on every `lookmatch.mjs` measure.
The first real film made in this template is its sample: check it against these lines and the stills, then add its
frames to `golden/`.
