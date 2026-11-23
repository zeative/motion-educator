# Graphite Glass

Motion graphics · Motion graphics · default portrait 9:16, voice-over · ready: made in sample films

Ideas drawn as crisp motion graphics on a dark graphite stage: glass panels, metal type, charts and counters.

Works for: money, data, code, psychology, how apps work.

## The look, line by line

These are the lines the gallery's prompt carries for this template. The film follows every one of them, in every shot,
whatever the topic: the topic decides what is shown, the template decides how it looks.

- **Background and set:** a dark graphite stage (#0b0b0c) with a slowly flowing field of light, a floor in perspective with a faint grid, and dust in the light. Never pure black, a gradient wallpaper or a bright background.
- **Light:** a key light with a soft anamorphic streak sits behind whatever matters and travels with it. It changes colour with the story: warm while the problem builds, cool when the answer lands.
- **Colour:** one accent colour taken from the subject (amber for a warning, terminal green for code, gold for money, cyan for data) and at most one second colour for its opposite. Text #ededf0, secondary #a9a9b0. Each colour keeps one meaning for the whole film.
- **Materials:** panels of glass lit from above: a bright top edge, an accent-tinted bottom edge, a long soft shadow. Chips and cards are cut from the same glass. When a thing stands for a number (coins, a phone, a chip), it is a simple 3D object in real materials.
- **How things are drawn:** the everyday things the viewer knows, rebuilt cleanly: a chat thread, a phone screen, a terminal, a stack of coins. The effect is made physical: a meter that fills, a path worn down by repetition, memory blocks filling up.
- **Type:** Sora for headings, in a brushed-metal fill that arrives letter by letter or slams in by line (scale 1.5 to 1, blur to sharp) on the beat, with one sheen after it lands; Inter for captions and labels; JetBrains Mono, large, for every number. Portrait: headings 100 px or more, labels 36 px or more, nothing under 28 px. Landscape: captions 40 px, labels 30 px or more.
- **Captions:** two or three big words at a time in step with the voice (or the reading pace when there is no voice), the word being said lit, the key word in the accent colour; a dark plate fades in behind them wherever the picture is light. Everything that must be read stays inside the app's safe area.
- **Charts and numbers:** charts drawn crisp and computed from the real numbers. Axes rescale smoothly and are never stretched; a number appears at its value and locks with a tick, never counting up through false values; brackets and measures draw from point to point.
- **Camera:** a slow 3 to 5 percent push on every hold; whips that move the stage with the scene, with motion blur; dives into a number or an object.
- **Motion and transitions:** things land with an expo or back ease and leave fast. Every action visibly produces something: a ring, a glow, a tick. Vary the cut (a horizontal whip, a vertical whip, a dive, a flash); something survives every cut. Nothing sits still for more than about 0.6 seconds.
- **Composition:** one idea per screen, filling the frame. In portrait, stacked top to bottom inside the safe area; a diagram that would run left to right runs top to bottom.
- **Finish:** soft bloom on highlights and fine film grain that changes every frame; colours checked on the finished still, not the raw page.
- **Sound:** a bed composed for the film and cut on its beats, with soft ticks, clicks and whooshes on every landing.
- **Never:** flat vector illustration, stock icons, emoji, bright backgrounds, more than two accent colours, or a chart that is not drawn from its numbers.

## With the kit

- In `storyboard.json`: `"template": "glass"`, and `look.accent` from the palette below. `kit/engine/look.js` then sets
  the stage (graphite), the type, the caption skin (house) and, when `stepped` is set, the frame rate the
  picture advances at (every frame).
- kit/css/film.css: .glass, .panel, .chip, .display (metal type)
- kit/engine/motion.js: typeIn, sheen, count, draw, whip, hit
- Palette: #0b0b0c, #19191b, #ededf0, #ffb02e, #4ee68f.
- The render's finishing pass follows `template.json` `finish` (bloom 0.34, grain 5).
- Check the look against `golden/` with `node kit/tools/lookmatch.mjs films/NAME` before the full render
  (`references/templates.md`).

## Sample films

- `slow-phone`: Why phones get slower
- `compound-interest`: How savings grow on their own
- `float-math`: Why doesn't 0.1 + 0.2 equal 0.3?
- `repeated-hoaxes`: Why repeated hoaxes feel true
