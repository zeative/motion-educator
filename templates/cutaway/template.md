# Studio Cutaway

Photoreal 3D · 3D · default portrait 9:16, voice-over · ready: made in sample films

Real objects rebuilt as photoreal 3D replicas, lit like a product shot and cut open so you watch the inside work.

Works for: machines, gadgets, the body, anything with parts.

## The look, line by line

These are the lines the gallery's prompt carries for this template. The film follows every one of them, in every shot,
whatever the topic: the topic decides what is shown, the template decides how it looks.

- **Background and set:** a dark graphite studio (#0b0b0c to #19191b) with a floor in perspective and soft reflections. For something used at home, a dim room behind it instead: a desk, warm lamps as soft out-of-focus discs, dust in the light. Never a flat colour backdrop.
- **Light:** a key light from the upper side, a rim light from behind and a soft fill, like a product shot. The stage light moves to the part that matters and takes on the accent colour while that part works.
- **Colour:** true material colours for the object. One accent colour taken from the subject marks the part doing the work and the words that name it; a second colour only for the opposing force (for example amber for the noise, cyan for the fix). Each colour keeps its meaning for the whole film.
- **Materials:** physically based materials that read as what they are: cast and brushed metal with fine wear, rubber, moulded plastic with its parting lines, glass, fabric. Proportions measured from patents, technical drawings and teardown photos of the version people actually use.
- **How things are drawn:** the object is the hero and fills most of the frame. Cutaways slice it along a clean plane with the cut face tinted; exploded views slide the real parts apart along their real axis. Bodies and organs use real anatomy meshes, and skin can turn to glass. Never a box, an icon or a flat shape standing in for a part.
- **Type:** Sora for headings, in a brushed-metal fill that arrives letter by letter or slams in by line (scale 1.5 to 1, blur to sharp) on the beat, with one sheen after it lands; Inter for captions and labels; JetBrains Mono, large, for every number. Portrait: headings 100 px or more, labels 36 px or more, nothing under 28 px. Landscape: captions 40 px, labels 30 px or more.
- **Captions:** two or three big words at a time in step with the voice (or the reading pace when there is no voice), the word being said lit, the key word in the accent colour; a dark plate fades in behind them wherever the picture is light. Everything that must be read stays inside the app's safe area.
- **Labels and numbers:** glass chips pinned to parts with a thin leader line drawn out from the part; the camera goes to each part as the voice names it. Numbers appear at their real value and lock with a small tick.
- **Camera:** every shot has a deliberate move: slow orbits, push-ins that ease into place, macro with shallow focus on small parts, a crane to reveal. Never a static view of a 3D object.
- **Motion and transitions:** mechanisms move at believable speeds with weight: springs compress, valves snap shut with a small flash and a ring. Cuts are dives into a part, whips with motion blur where the set travels too, or the cutaway itself; something carries across every cut. Nothing sits still for more than about 0.6 seconds.
- **Composition:** in portrait, the object in the upper two thirds and the caption under it; in landscape, the object fills the frame. Two or three depths: a blurred far layer, the object, a near detail.
- **Finish:** soft bloom on highlights and fine film grain that changes every frame; colours checked on the finished still, not the raw page.
- **Sound:** a light music bed composed for the film and cut on its beats, with small mechanical sounds on every click, slide and snap, mixed under the voice.
- **Never:** cartoon shading, flat icons, stock 3D models, clip art, empty frames, or text over busy detail without a plate.

## With the kit

- In `storyboard.json`: `"template": "cutaway"`, and `look.accent` from the palette below. `kit/engine/look.js` then sets
  the stage (graphite), the type, the caption skin (house) and, when `stepped` is set, the frame rate the
  picture advances at (every frame).
- kit/engine/stage3d.js and kit/engine/parts3d.js for the replica, cutaways, exploded views and pinned labels
- kit/engine/body3d.js and kit/engine/tissue3d.js for bodies, organs and tissue
- Palette: #0b0b0c, #19191b, #ededf0, #ffb90e, #3fe0ff.
- The render's finishing pass follows `template.json` `finish` (bloom 0.34, grain 5).
- Check the look against `golden/` with `node kit/tools/lookmatch.mjs films/NAME` before the full render
  (`references/templates.md`).

## Sample films

- `fuel-nozzle`: Why a fuel nozzle stops by itself
- `noise-cancelling`: How noise-cancelling headphones work
- `arm-model`: Arm model test, no narration
