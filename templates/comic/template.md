# Comic

Ink and halftone · 2D · default portrait 9:16, voice-over · concept: no sample film yet

Comic book pages: bold ink, halftone dots, speech bubbles and a splash panel for the payoff.

Works for: history, science myths, stories with characters.

## The look, line by line

These are the lines the gallery's prompt carries for this template. The film follows every one of them, in every shot,
whatever the topic: the topic decides what is shown, the template decides how it looks.

- **Background and set:** comic book pages: panels with thick black borders on white, and full-bleed splash panels for the big moments.
- **Light:** flat colour with hard cel shadows and halftone dots for the mid-tones.
- **Colour:** bold flat colours (red #ff3b30, yellow #ffcc00, blue #007aff, ink #1c1c1e) on white paper, shaded with halftone dots.
- **Line:** confident black ink lines of varying weight, heavier on the outside of shapes.
- **How things are drawn:** dramatic comic illustration: real objects and people drawn recognisably, with action lines; insides revealed in a zoom panel.
- **Characters:** expressive comic characters with clear emotions; a narrator character can guide the story.
- **Type:** comic lettering: Bangers for sound words, a hand-lettered face (Comic Neue or Kalam) for speech and captions.
- **Captions:** narration in yellow caption boxes, dialogue in speech bubbles, the key word in bold.
- **Labels and numbers:** callouts in small boxes with pointers; numbers in bold block letters, at their real values.
- **Camera:** moves from panel to panel, zooms into a panel, and breaks out of the panels for the big moment.
- **Motion and transitions:** limited animation: panels slide in, characters hold strong poses, speed lines and impact bursts on action, sound words (POP, CLICK) popping up.
- **Composition:** two to four panels per screen in portrait, and one splash panel for the payoff.
- **Finish:** paper texture and a slight misregistration of the colours, like print.
- **Sound:** a punchy bed with comic stingers, whooshes and impacts.
- **Never:** 3D renders, soft gradients, photo backgrounds, or bubbles too small to read.

## With the kit

- In `storyboard.json`: `"template": "comic"`, and `look.accent` from the palette below. `kit/engine/look.js` then sets
  the stage (paper), the type, the caption skin (caption-box) and, when `stepped` is set, the frame rate the
  picture advances at (12 fps, held between).
- kit/engine/ink.js: halftone() for the dot shading, drawOn for the ink
- panels as HTML with thick borders; speech bubbles as SVG
- Palette: #fffdf6, #1c1c1e, #ff3b30, #ffcc00, #007aff.
- The render's finishing pass follows `template.json` `finish` (bloom 0, grain 3).
- Check the look against `golden/` with `node kit/tools/lookmatch.mjs films/NAME` before the full render
  (`references/templates.md`).

## Status

A concept: no sample film yet. `golden/concept.jpg` is a drawn still; `golden/proof-1.jpg` and `proof-2.jpg` are
frames of a short engine proof made with kit/engine/ink.js (inked panels with halftone shading, an impact burst and its sound word, held at 12 frames a second), which matches this template on every `lookmatch.mjs` measure.
The first real film made in this template is its sample: check it against these lines and the stills, then add its
frames to `golden/`.
