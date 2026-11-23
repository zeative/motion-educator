# Isometric

Isometric diorama · 3D · default landscape 16:9, voice-over · concept: no sample film yet

A soft pastel miniature world at a fixed isometric angle, where systems run like little cities.

Works for: systems, the internet, economics, logistics.

## The look, line by line

These are the lines the gallery's prompt carries for this template. The film follows every one of them, in every shot,
whatever the topic: the topic decides what is shown, the template decides how it looks.

- **Background and set:** a small isometric diorama floating on a soft pastel background (#eef1ff), always seen from the same 30-degree isometric angle.
- **Light:** soft light from the upper left: each face of a block a step lighter or darker, a soft shadow under the diorama.
- **Colour:** a soft pastel palette (periwinkle #7b8cff, peach #ffb4a2, mint #9ee6c5, butter #ffe08a, ink #2d3047) with one saturated accent for the thing that matters.
- **Materials:** clean matte blocks with rounded edges; small details (windows, wires, pipes) as simple geometric shapes.
- **How things are drawn:** systems as miniature cities, factories or machines; flows as small cubes or dots moving along paths and pipes; insides revealed by lifting a roof or slicing a block.
- **Characters:** tiny simple figures without faces, at isometric scale.
- **Type:** a clean geometric sans (Manrope or Inter) in dark ink.
- **Captions:** two or three words at a time in a soft white pill, the key word in the accent.
- **Labels and numbers:** floating tags with a thin line down to the part; numbers at their real values; small charts as isometric bars.
- **Camera:** the angle never changes; the camera pans and zooms across the diorama, and new parts rise up out of the ground.
- **Motion and transitions:** blocks pop up with a slight overshoot, things flow along paths at a steady pace, everything snaps to the grid. Cuts by panning to the next diorama or turning it 90 degrees.
- **Composition:** the diorama fills the middle of the frame with calm space around it.
- **Finish:** very soft ambient occlusion; no grain, no bloom.
- **Sound:** a light electronic bed with soft clicks and pops as blocks appear.
- **Never:** a perspective camera, photoreal textures, dark backgrounds, or clutter.

## With the kit

- In `storyboard.json`: `"template": "isometric"`, and `look.accent` from the palette below. `kit/engine/look.js` then sets
  the stage (flat), the type, the caption skin (pill) and, when `stepped` is set, the frame rate the
  picture advances at (every frame).
- kit/engine/stage3d.js with an orthographic-looking camera (fov 8, far away) at az 45, el 35.26
- or SVG with the isometric projection; blocks pop up with back.out
- Palette: #eef1ff, #7b8cff, #ffb4a2, #9ee6c5, #ffe08a, #2d3047.
- The render's finishing pass follows `template.json` `finish` (bloom 0, grain 0).
- Check the look against `golden/` with `node kit/tools/lookmatch.mjs films/NAME` before the full render
  (`references/templates.md`).

## Status

A concept: no sample film yet. `golden/concept.jpg` is a drawn still; `golden/proof-1.jpg` and `proof-2.jpg` are
frames of a short engine proof made with SVG blocks in a fixed isometric projection (each face a step lighter or darker, popping up with overshoot, data flowing along a path), which matches this template on every `lookmatch.mjs` measure.
The first real film made in this template is its sample: check it against these lines and the stills, then add its
frames to `golden/`.
