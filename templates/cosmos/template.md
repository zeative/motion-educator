# Cosmos

3D and light · 3D · default landscape 16:9, captions only · ready: made in sample films

Earth, Sun, sky and space as real places, with light drawn the way light behaves.

Works for: astronomy, geography, weather, light and sound.

## The look, line by line

These are the lines the gallery's prompt carries for this template. The film follows every one of them, in every shot,
whatever the topic: the topic decides what is shown, the template decides how it looks.

- **Background and set:** deep space, or a night sky over the dark graphite floor. Stars sparse and faint. For weather, a sky of drifting clouds lit from inside.
- **Light:** the Sun is one strong light from one side, so the day and night sides read. Beams are white with a soft glow and split into their real colours. The stage light changes colour with the story: white sunlight, sky blue, dusk orange, storm violet.
- **Colour:** true colours for the Earth and the sky. One accent for the thing that travels (a signal, a ray, a sound front) and a second for the viewer's own place. Each colour keeps its meaning for the whole film.
- **Materials:** the real Earth from NASA imagery, with clouds and a thin glowing atmosphere; satellites in gold foil and dark solar cells; planets and moons in true colour.
- **How things are drawn:** orbits, rays, shells and waves as thin glowing lines computed from the real geometry; distances as measures with their values; the viewer's place as one dot that keeps its colour. True scale, or 'not to scale' written on screen.
- **Type:** Sora for headings, in a brushed-metal fill that arrives letter by letter or slams in by line (scale 1.5 to 1, blur to sharp) on the beat, with one sheen after it lands; Inter for captions and labels; JetBrains Mono, large, for every number. Portrait: headings 100 px or more, labels 36 px or more, nothing under 28 px. Landscape: captions 40 px, labels 30 px or more.
- **Captions:** two or three big words at a time in step with the voice (or the reading pace when there is no voice), the word being said lit, the key word in the accent colour; a dark plate fades in behind them wherever the picture is light. Everything that must be read stays inside the app's safe area.
- **Labels and numbers:** labels pinned to what they name; clocks and counters run in real time whenever timing is the point.
- **Camera:** slow orbits and long push-ins, from far out in space down to the viewer's place; the camera follows the light from where it starts to where it lands.
- **Motion and transitions:** light travels at a readable speed, waves keep moving, the Earth turns slowly. Cuts are long pull-backs, dives toward the surface and whips through space; something carries across every cut.
- **Composition:** the Earth or the sky fills most of the frame, one subject at a time.
- **Finish:** soft bloom on highlights and fine film grain that changes every frame; colours checked on the finished still, not the raw page.
- **Sound:** a wide, calm bed with soft swells on each reveal; thunder and other natural sounds placed where they happen.
- **Never:** cartoon planets, lens-flare clichés, glowing space wallpaper, or a wrong scale that is not marked.

## With the kit

- In `storyboard.json`: `"template": "cosmos"`, and `look.accent` from the palette below. `kit/engine/look.js` then sets
  the stage (graphite), the type, the caption skin (house) and, when `stepped` is set, the frame rate the
  picture advances at (every frame).
- kit/engine/stage3d.js with a directed camera for the Earth, satellites and orbits
- the stage light (film.light, film.tintTo) carries the colour of the story
- Palette: #05060a, #0b0b0c, #ededf0, #4da3ff, #ffb21a.
- The render's finishing pass follows `template.json` `finish` (bloom 0.34, grain 5).
- Check the look against `golden/` with `node kit/tools/lookmatch.mjs films/NAME` before the full render
  (`references/templates.md`).

## Sample films

- `blue-sky`: Why the sky is blue
- `how-gps-works`: How GPS works
- `seasons`: Why we have seasons
- `lightning`: Why you see lightning before thunder
