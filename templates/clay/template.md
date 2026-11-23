# Clay

Claymation · 3D · default portrait 9:16, voice-over · concept: no sample film yet

A handmade plasticine world on a little tabletop set, animated in stop motion.

Works for: kids' science, nature, friendly explainers.

## The look, line by line

These are the lines the gallery's prompt carries for this template. The film follows every one of them, in every shot,
whatever the topic: the topic decides what is shown, the template decides how it looks.

- **Background and set:** a small handmade set on a tabletop: a painted card backdrop in a soft colour gradient, the table surface out of focus at the front.
- **Light:** a big soft key light from the upper left, a warm bounce from below and soft contact shadows, like a small stop-motion studio.
- **Colour:** saturated but soft plasticine colours (coral #ff8a65, yellow #ffd166, mint #06d6a0, blue #118ab2, cream #f6f1e7), with one accent for the thing that matters.
- **Materials:** everything is plasticine: matte with a slight sheen, fingerprints and tool marks, rounded edges, slightly uneven surfaces; props of card, felt and wire.
- **Characters:** chunky clay characters with big eyes and mouths swapped per expression; real objects modelled in clay at sensible proportions, still recognisable.
- **How things are drawn:** a cutaway is a clay object sliced with a knife to show its coloured layers; a flow is clay balls or ropes rolling along a groove.
- **Type:** chunky rounded type (Fredoka or Baloo 2) that looks cut from clay or card, with a soft shadow.
- **Captions:** two or three words at a time on a small card or clay plate, the key word in the accent colour.
- **Labels and numbers:** paper flags on toothpicks stuck into the parts; numbers on little cards, at their real values.
- **Camera:** a real camera on a small set: slow dolly moves, gentle push-ins, shallow depth of field.
- **Motion and transitions:** stop motion at 12 frames per second with a little frame-to-frame boil in the clay; squash and stretch; things roll, plop and wobble into place. Cuts are camera moves across the set or a clay piece rolling into the next scene.
- **Composition:** the set fills the frame, the subject in the middle third.
- **Finish:** light film grain and a soft vignette; no bloom.
- **Sound:** a playful bed (marimba, plucks) with squishes, plops and small wooden knocks.
- **Never:** glossy CG plastic, perfectly smooth surfaces, flat 2D graphics or glowing effects.

## With the kit

- In `storyboard.json`: `"template": "clay"`, and `look.accent` from the palette below. `kit/engine/look.js` then sets
  the stage (none), the type, the caption skin (card) and, when `stepped` is set, the frame rate the
  picture advances at (12 fps, held between).
- kit/engine/clay.js: claySet() for the tabletop set and its lights, clay() for plasticine, boil() for stop-motion
- kit/engine/stage3d.js for the camera (rig: true) and pinned paper flags
- Palette: #ffd8c2, #ff8a65, #ffd166, #06d6a0, #118ab2, #f6f1e7.
- The render's finishing pass follows `template.json` `finish` (bloom 0, grain 3).
- Check the look against `golden/` with `node kit/tools/lookmatch.mjs films/NAME` before the full render
  (`references/templates.md`).

## Status

A concept: no sample film yet. `golden/concept.jpg` is a drawn still; `golden/proof-1.jpg` and `proof-2.jpg` are
frames of a five-second engine proof made with kit/engine/clay.js (the tabletop set, plasticine with the hand's marks, the boil on every held pose, a paper flag), which matches this template on every
`lookmatch.mjs` measure, the held 12 drawings a second included. The first real film made in this template is its
sample: check it against these lines and the stills, then add its frames to `golden/`.
