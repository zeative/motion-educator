# Low Poly

Faceted 3D · 3D · default landscape 16:9, captions only · concept: no sample film yet

A faceted 3D world of flat-shaded triangles under a soft gradient sky.

Works for: earth science, geography, ecosystems.

## The look, line by line

These are the lines the gallery's prompt carries for this template. The film follows every one of them, in every shot,
whatever the topic: the topic decides what is shown, the template decides how it looks.

- **Background and set:** a faceted 3D world (hills, sky, objects built from flat triangles) under a soft gradient sky.
- **Light:** one directional sun, so every facet has its own flat shade, and soft fog toward the horizon.
- **Colour:** one harmonious palette per scene (for example dawn: orange #ff9f1c, sand #ffbf69, sky #cbf3f0, teal #2ec4b6, dark #293241), flat on every facet.
- **Materials:** flat-shaded facets with no textures; water and glass slightly transparent.
- **How things are drawn:** landscapes, planets, animals and machines built from a few hundred triangles each, recognisable from their silhouette; a cross-section is a sliced faceted model.
- **Type:** a clean rounded sans (Nunito or Poppins) with a slight drop shadow.
- **Captions:** two or three words at a time on a soft translucent panel, the key word in the accent.
- **Labels and numbers:** floating tags with lines to the object; numbers at their real values; charts as faceted bars.
- **Camera:** slow drone-like orbits and fly-throughs, push-ins with gentle easing.
- **Motion and transitions:** objects assemble facet by facet and the world reshapes smoothly (mountains rise, water flows as moving facets). Cuts by flying through a cloud or over a hill.
- **Composition:** landscape by default; the world fills the frame with a clear horizon.
- **Finish:** soft fog and a very light bloom on the sun; no grain.
- **Sound:** an ambient bed with soft wind and gentle chimes.
- **Never:** smooth high-poly models, photo textures, or cluttered scenes.

## With the kit

- In `storyboard.json`: `"template": "lowpoly"`, and `look.accent` from the palette below. `kit/engine/look.js` then sets
  the stage (none), the type, the caption skin (panel) and, when `stepped` is set, the frame rate the
  picture advances at (every frame).
- kit/engine/stage3d.js with flatShading: true materials and a gradient sky
- geometry with few triangles (IcosahedronGeometry detail 1, a noise-displaced plane with 40x40 segments)
- Palette: #ff9f1c, #ffbf69, #cbf3f0, #2ec4b6, #293241.
- The render's finishing pass follows `template.json` `finish` (bloom 0.18, grain 0).
- Check the look against `golden/` with `node kit/tools/lookmatch.mjs films/NAME` before the full render
  (`references/templates.md`).

## Status

A concept: no sample film yet. `golden/concept.jpg` is a drawn still; `golden/proof-1.jpg` and `proof-2.jpg` are
frames of a short engine proof made with kit/engine/stage3d.js with flat-shaded geometry (a faceted sea, mountains and a volcano under one sun), which matches this template on every `lookmatch.mjs` measure.
The first real film made in this template is its sample: check it against these lines and the stills, then add its
frames to `golden/`.
