# Blueprint

Technical drawing · 2D · default landscape 16:9, captions only · concept: no sample film yet

White technical drawing on a blueprint grid: sections, exploded views and real dimensions.

Works for: engineering, machines, architecture.

## The look, line by line

These are the lines the gallery's prompt carries for this template. The film follows every one of them, in every shot,
whatever the topic: the topic decides what is shown, the template decides how it looks.

- **Background and set:** a blueprint sheet (#0d3b66 to #134e8a) with a fine 10 px grid, a heavier grid every 100 px and a title block in the corner.
- **Light:** flat, with a faint paper texture and a slight vignette.
- **Colour:** white lines (#e8f1ff) at two weights, plus one accent (#ffd166) for the part or value that matters.
- **Line:** precise technical lines: thick for outlines, thin dashed for hidden edges, dash-dot for centre lines, hatching on cut faces.
- **How things are drawn:** orthographic views, sections and exploded isometric drawings of the real object at true proportions, taken from its drawings or patents; the drawing builds line by line, as a draughtsman would.
- **Type:** a technical face in capitals (IBM Plex Mono or Share Tech Mono), small and spaced like drawing annotations.
- **Captions:** one short line at a time in the title block or along the bottom, the key word in the accent.
- **Labels and numbers:** dimension lines with arrows and real measurements, leader lines to part numbers in callout circles.
- **Camera:** a flat sheet; slow pans and zooms to the detail being explained, as if leaning over the drawing.
- **Motion and transitions:** lines draw on at a steady pen speed, parts slide apart along their axis in the exploded view, sections are cut by a sweeping line.
- **Composition:** landscape by default with generous margins, one view per screen.
- **Finish:** paper grain and a slight ink bleed; no glow.
- **Sound:** a calm, minimal bed with soft pen and ruler sounds.
- **Never:** colour fills, 3D shading, decorative illustration, or wrong proportions.

## With the kit

- In `storyboard.json`: `"template": "blueprint"`, and `look.accent` from the palette below. `kit/engine/look.js` then sets
  the stage (blueprint), the type, the caption skin (title-block) and, when `stepped` is set, the frame rate the
  picture advances at (every frame).
- kit/engine/ink.js: drawOn at pen speed; dashed and dash-dot lines are plain SVG dasharrays
- parts and proportions from kit/engine/parts3d.js drawings or the patent figures
- Palette: #0d3b66, #134e8a, #e8f1ff, #ffd166.
- The render's finishing pass follows `template.json` `finish` (bloom 0, grain 3).
- Check the look against `golden/` with `node kit/tools/lookmatch.mjs films/NAME` before the full render
  (`references/templates.md`).

## Status

A concept: `golden/concept.jpg` is a drawn still, not a frame of a film. The first film made in this template is
its sample: check it against these lines and the still, then replace the still with its frames.
