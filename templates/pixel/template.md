# Pixel

Pixel art · 2D · default portrait 9:16, voice-over · concept: no sample film yet

A retro game screen: sprites, a 16-colour palette, a HUD and dialogue boxes.

Works for: biology, computing, games, young audiences.

## The look, line by line

These are the lines the gallery's prompt carries for this template. The film follows every one of them, in every shot,
whatever the topic: the topic decides what is shown, the template decides how it looks.

- **Background and set:** pixel art at low resolution (270 by 480 for portrait, 480 by 270 for landscape) scaled up four times with hard edges, over a simple layered background (sky, hills or a room).
- **Light:** flat colours with two or three shade steps each, lit from the top left; dithering instead of gradients.
- **Colour:** one fixed 16-colour palette in the PICO-8 style (navy #1d2b53, plum #7e2553, green #008751, brown #ab5236, red #ff004d, orange #ffa300, yellow #ffec27, lime #00e436, sky #29adff, cream #fff1e8 and the greys), with one accent for the point.
- **How things are drawn:** everything as sprites: objects, machines, cells; inside views as a cutaway sprite; flows as moving pixel particles.
- **Characters:** small sprite characters, 16 to 32 pixels tall, with walk and action cycles of two to four frames.
- **Type:** a pixel font (Press Start 2P or a 5 by 7 bitmap face), crisp, never anti-aliased.
- **Captions:** two or three words at a time in a game dialogue box, typed on letter by letter, the key word in the accent.
- **Labels and numbers:** pixel arrows and tags; numbers as a game HUD (score, health bars, counters) at their real values.
- **Camera:** a side-scrolling or top-down game camera that moves in whole pixels; no rotation and no zoom between pixel sizes.
- **Motion and transitions:** sprite animation at 8 to 12 frames per second, stepped movement, a screen shake on impact. Scenes change with a pixel dissolve or a screen wipe.
- **Composition:** a game screen: the action in the middle, the HUD at the top and the dialogue box at the bottom, inside the safe area.
- **Finish:** crisp pixels with optional faint scanlines; no blur, no bloom.
- **Sound:** a chiptune bed with 8-bit blips, jumps and coin sounds on actions.
- **Never:** smooth scaling, anti-aliased edges, gradients, or mixed pixel sizes.

## With the kit

- In `storyboard.json`: `"template": "pixel"`, and `look.accent` from the palette below. `kit/engine/look.js` then sets
  the stage (none), the type, the caption skin (dialog) and, when `stepped` is set, the frame rate the
  picture advances at (12 fps, held between).
- a <canvas> at 270x480 (or 480x270) drawn with whole pixels and scaled 4x with image-rendering: pixelated
- sprites as small arrays of palette indices; no anti-aliasing anywhere
- Palette: #1d2b53, #7e2553, #008751, #ab5236, #5f574f, #c2c3c7, #fff1e8, #ff004d, #ffa300, #ffec27, #00e436, #29adff, #83769c, #ff77a8, #ffccaa, #000000.
- The render's finishing pass follows `template.json` `finish` (bloom 0, grain 0).
- Check the look against `golden/` with `node kit/tools/lookmatch.mjs films/NAME` before the full render
  (`references/templates.md`).

## Status

A concept: `golden/concept.jpg` is a drawn still, not a frame of a film. The first film made in this template is
its sample: check it against these lines and the still, then replace the still with its frames.
