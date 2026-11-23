# Neon Line

Glowing lines · Motion graphics · default portrait 9:16, captions only · concept: no sample film yet

Thin glowing lines on near-black: circuits, networks and signals as pulses of light.

Works for: AI, computing, electricity, networks.

## The look, line by line

These are the lines the gallery's prompt carries for this template. The film follows every one of them, in every shot,
whatever the topic: the topic decides what is shown, the template decides how it looks.

- **Background and set:** near-black (#07070c) with a faint perspective grid fading into the distance.
- **Light:** everything that matters gives off light: thin lines glow with a soft halo and light up what is around them.
- **Colour:** two neon colours with fixed meanings (cyan #00f5d4 and magenta #f15bb5) plus white; everything else stays dark.
- **Line:** single continuous glowing lines, 3 to 4 px wide with round caps; shapes drawn as outlines only.
- **How things are drawn:** systems, circuits, networks and flows as glowing line diagrams; signals as bright pulses travelling along the lines.
- **Type:** a wide geometric sans (Space Grotesk or Orbitron) in outline or glowing fill.
- **Captions:** two or three glowing words at a time, the key word in the second neon colour.
- **Labels and numbers:** thin lines out to labels; counters and charts as glowing outlines at their real values.
- **Camera:** smooth flights along the lines and the grid, push-ins toward the pulse, slow orbits around a wireframe object.
- **Motion and transitions:** lines draw on fast, pulses race along paths, a flicker on power-up. Cuts follow a pulse into the next scene.
- **Composition:** dark space around one bright diagram; in portrait, stacked top to bottom.
- **Finish:** strong bloom on the lines, a little chromatic aberration at the edges, fine grain.
- **Sound:** a synth bed with a pulsing bass, zaps and soft hums.
- **Never:** filled shapes, more than two neon colours, light backgrounds, or cluttered text.

## With the kit

- In `storyboard.json`: `"template": "neon"`, and `look.accent` from the palette below. `kit/engine/look.js` then sets
  the stage (neon), the type, the caption skin (glow) and, when `stepped` is set, the frame rate the
  picture advances at (every frame).
- kit/engine/ink.js: drawOn for the lines, glow() for the halo
- pulses as small circles travelling along a path (getPointAtLength)
- Palette: #07070c, #00f5d4, #f15bb5, #e9fffb.
- The render's finishing pass follows `template.json` `finish` (bloom 0.6, grain 4).
- Check the look against `golden/` with `node kit/tools/lookmatch.mjs films/NAME` before the full render
  (`references/templates.md`).

## Status

A concept: `golden/concept.jpg` is a drawn still, not a frame of a film. The first film made in this template is
its sample: check it against these lines and the still, then replace the still with its frames.
