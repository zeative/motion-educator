# The look

The look is the same for every subject, which is why it holds up for any of them: a dark graphite stage, one accent
colour that belongs to the topic, light that behaves like light, panels of glass, type of metal. It reads as
expensive because every surface responds to the light and nothing is flat.

## The parts

- **The stage** (`kit/engine/stage.js`): one fragment shader behind everything. A slowly flowing field of light, a
  key light with an anamorphic streak, a floor in perspective, dust, shock rings, speed lines. The film moves its
  light and changes its colour; it has no clock of its own.
- **The accent**: set `--accent` (and `--accent-2` for a second voice) in the film's stylesheet and `look.accent`
  in the storyboard. One accent. It marks the words and things that carry the point.
- **Glass** (`.glass`, `.panel`, `.chip`): lit from above, a bright top edge, an accent-tinted bottom edge, a long
  soft shadow.
- **Metal type** (`.display`, with `.key` for accent words): every character is its own box so it can arrive on
  its own; the fill and the sheen are laid out in line coordinates so they read as one surface.
- **3D** (`kit/engine/stage3d.js`): physically based materials under a studio environment. Use it where the subject
  is physical or spatial (a planet, a molecule, a machine, a cell). Type, panels, diagrams and charts stay HTML,
  SVG and canvas, where they are crisp.
- **The finishing pass** (in the renderer): highlights bloom into their surroundings, then fine film grain that
  changes every frame.

## Let the light tell the story

The stage's light is the cheapest and strongest storytelling tool in the kit. In the worked example it is blue over
the Earth, turns white when sunlight arrives, red while the red ray passes, blue when the blue one scatters, and
orange as the film reaches dusk. Decide, per act, where the light sits and what colour it is, and write that in the
storyboard's `mood` and each shot's `motion`. Move it toward what the viewer should look at.

## Rules

- **Fill the frame.** In a feature shot the subject covers most of it. Frames that are mostly empty read as cheap;
  check the stills for this before anything else.
- **Sizes for a phone.** Captions 40 px, labels and chips 30 px or more, the smallest lettering 22 px, on a
  1920x1080 frame. Anything smaller will not be read.
- **Do not blow out.** Bright things bloom. A white beam should still be white, an accent node still the accent's
  colour: look at the finished still (`--stills` applies the bloom), not the raw page.
- **Depth without clutter.** Two or three depths (a blurred far layer, the subject, a near detail), a slow camera
  push on anything held longer than a second, and the stage moving with the camera on fast moves.
- **Colour that means something** stays the same all film (see `pedagogy.md`).
- **Nothing sits still for more than about 0.6 seconds** except the last frame, and even that breathes.
- **Lights that travel with a 3D object** must weaken as it is drawn smaller (a point light's reach shrinks with
  the object's scale: multiply its power by `scale ** 1.75`), or the object washes out at small sizes.
- **Tone mapping shifts colours.** Measure a rendered still when a brand colour has to match.

## Portrait

A short is 1080x1920 and is watched in an app that draws over it. Set `"format": "1080x1920"` in the storyboard and
the stage, the renderer and the board follow.

- **Safe areas.** The app covers about 230 px at the top, 430 px at the bottom and 150 px down the right. What must
  be read stays inside (`--safe-top`, `--safe-bottom`, `--safe-left`, `--safe-right` in CSS); the stage and
  pictures run to the edges. `render.mjs --stills ... --safe` shades the covered parts so you can see.
- **Stack, do not shrink.** A landscape layout scaled down is unreadable. Put the subject in the upper two thirds,
  the caption under it, one thing a screen. A diagram that ran left to right now runs top to bottom.
- **Bigger type.** Headings 100 px and up, labels 36 px or more, the smallest lettering 28 px.
- **Faster.** A new picture every two to three seconds, the question in the first second and a half, and the first
  frame already moving: the viewer decides whether to stay before the first cut.
- **Pop captions** by default: two or three large words at a time, in step with the voice (`voice.md`).
- **The last frame loops.** End on a frame that can cut back to the first without a jolt.

## A new subject

Pick the accent from the subject (sky blue for the sky, a leaf green for photosynthesis, amber for electricity).
Decide what the hero object is and whether it is 3D. Decide the stage's colour for each act. Everything else is
already there.
