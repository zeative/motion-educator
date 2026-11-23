# Visual templates

A visual template is a look, never a topic: Stickman, Clay, Chalkboard, Blueprint. Any subject can be made in any
template. The person's prompt names one (a gallery prompt spells out its lines); the film is then made in that
look from the first drawn frame to the last.

```
templates/
  catalog.json            every template: key, name, medium, mode, status
  stickman/
    template.md           the look, line by line, in words: what every shot must be
    template.json         what the engine needs: stage, paper, ink, palette, stepped, finish, type, captions
    look.css              the type, colour tokens and caption skin, applied under :root[data-look=stickman]
    golden/               stills of the look done right: what the film is measured against
    reference/            (made by reference.mjs study) the reference's frames, sheet and numbers, when it had one
```

`status` is `ready` (sample films exist, and their frames are the golden stills) or `concept` (the golden still is
its concept poster; the first film made in it becomes its sample).

## Making a film in a template

1. **Read `templates/<key>/template.md`** and follow every line in every shot. Where it differs from `look.md` (the
   house look), the template wins. Its "With the kit" notes say how each line is built.
2. **Start the film in it**: `node kit/tools/new.mjs <workspace> <film> --template <key>` writes `"template"` and
   the accent into the storyboard and takes the template's format (`--portrait` / `--landscape` override it).
3. **Draw the board in its terms.** `screen`, `motion` and the drawn frames describe the template's medium: a line
   drawn on and boiling, clay pressed and plopping, chalk written on. `storyboard.mjs` warns when the format or
   status do not match.
4. **Build with what the engine hands you.** `createFilm({ storyboard })` applies the look before anything is drawn
   (`engine.md`): the stage, the fonts, the caption skin, `film.look` (`paper`, `ink`, `palette`, `stepped`) and
   `film.held(t)`. Draw with `film.look.ink` and the palette, never the house greys; in CSS use `var(--ink)`,
   `var(--paper)`, `var(--accent)`. A stepped template (Stickman, Clay, Paper, Pixel, Comic) advances its picture
   `stepped` times a second: the renderer seeks the timeline to the held time (`film.finish()` installs it) and
   reuses each held frame, so every tween steps on its own. An `each()` job draws from the time it is given; a value
   worked out apart from the timeline uses `film.held(t)`. The 2D and clay looks are drawn with `kit/engine/ink.js`
   and `kit/engine/clay.js`.
5. **Check the look on the first stills**, before the rest is built:

   ```sh
   node kit/tools/render.mjs films/NAME --stills 1,4,7
   node kit/tools/lookmatch.mjs films/NAME
   ```

   | Measure | Drifts when |
   | --- | --- |
   | background | ΔE over 10 from the golden stills' stage |
   | ink | ΔE over 18 from their darkest (or lightest) lines |
   | palette | under 65 % of their colours (by area) appear in the film |
   | foreign colours | colours they do not have cover over 25 % of the film |
   | lightness, colourfulness | more than 14 or 10 apart (CIELAB L and C) |
   | line | the share of the frame that is edge is under 0.45x or over 2.2x theirs |
   | grain | the texture of the flat parts is more than 0.15 apart |
   | drawing rate (rendered picture only) | a stepped template's picture does not change `stepped` times a second (within 2); a smooth one moves in steps |

   Then look at `out/lookmatch/lookmatch.png`, the golden stills over the film's. A film can match every number and
   still miss a line of `template.md`; the numbers catch the drifts the eye gets used to. `check.mjs` runs the same
   check on the finished picture.

## Making a new template from a reference

The method is reanimate's ([NiazMorshed2007/reanimate](https://github.com/NiazMorshed2007/reanimate), MIT): **capture
the reference, write down what it is made of, build, capture what you built, compare, repeat.** Its tools are ported
to `kit/tools/reference.mjs` (frames, labelled contact sheets, pixel and timing comparison) with additions for looks:
the palette, the ink, the texture and the drawing rate.

A template takes a look, not a work. Study a style (cut paper, chalk, claymation, risograph), never to reproduce a
particular film, character, artwork or brand. No footage, logo or character from the reference goes into a template
or a film, and only references the person may use are studied.

### 1. The reference

A clip of 5 to 15 seconds that shows the look moving (a screen recording or GIF is fine), or a folder of stills
when it does not move. Trim to the part that shows the look, not titles or credits.

### 2. Study it

```sh
node kit/tools/reference.mjs study ref.mp4 --out templates/KEY/reference [--start 3 --end 12]
```

It extracts a still every half second, lays them on a labelled sheet with the palette, and writes `study.md`:
the colours by area, the background, the ink, the accent, lightness and colourfulness, how much of the frame is
line, the grain of its flat parts, and its timing (cuts, holds, and how often the picture really changes: drawn and
stop-motion work holds each drawing two or three frames, which shows as 12 or 8 at 24 fps). It also drafts a
`template.json` from the numbers. **Look at the sheet first.** The numbers are a guess about a look; the sheet is
the look.

| Number | Reads as |
| --- | --- |
| edges | soft clay and watercolour about 3 to 4 %; line art and type 4 to 13 %; halftone print 30 % or more |
| grain | under 0.1 clean vector or pixel art; 0.2 to 0.3 film grain or paper; more is chalk or heavy texture |
| drawing rate | the fps, smooth; half of it, on twos; a third, on threes |

### 3. Write the spec

Write the template as three files, every line read from the sheet, none imagined:

- **`template.md`**: a one-line summary, then **the look, line by line**: stage, line, fill, type, colour, motion,
  camera, transitions, captions, sound. Each line says what is done and how much, so it can be checked: "the line
  is 3 px black ink, slightly wobbly, drawn on over 0.3 s and boiling on twos", not "hand-drawn feel". Then **With
  the kit** (which engine parts build each line) and the samples.
- **`template.json`**: start from the draft in `study.md` and correct it by eye: `stage` (graphite, paper, board,
  whiteboard, blueprint, flat, neon, none), `paper`, `ink`, `palette` (the reference's colours, the stage first),
  `stepped` (0 for smooth), `finish` (bloom and grain of the finishing pass), `type` (faces from the
  `@fontsource` packages in `package.json`; add one if none fits), `captions`, `defaults` (format, narration,
  accent).
- **`look.css`**: the `@font-face` rules, the tokens under `:root[data-look=KEY]` (`--accent`, `--ink`, `--paper`,
  `--brand`, `--sans`), the caption skin, and any rule the look needs (a marker under `.key`, a chalk filter).
  Copy the shape of an existing template's.

Add the template to `templates/catalog.json` with `"status": "concept"`.

### 4. Build a proof

A film of 4 to 6 seconds in the new template (`new.mjs ... --template KEY`) that rebuilds one moment of the reference:
the same framing, the same kind of thing on screen, the same motion. It exists only to be compared, so it copies the
reference's composition; nothing of the reference's content ships.

### 5. Capture both and compare

Capture both at the same rate and size, over the same moment:

```sh
node kit/tools/reference.mjs frames ref.mp4 --out templates/KEY/reference/ref --fps 12 --start 3 --end 8 --width 960
node kit/tools/render.mjs films/proof --fps 30
node kit/tools/reference.mjs frames films/proof/out/picture.mp4 --out templates/KEY/reference/proof --fps 12 --width 960
node kit/tools/reference.mjs compare --ref templates/KEY/reference/ref --clone templates/KEY/reference/proof --out templates/KEY/reference/compare --blur 6
node kit/tools/reference.mjs sheet --ref templates/KEY/reference/ref --clone templates/KEY/reference/proof --diff templates/KEY/reference/compare/diff --out templates/KEY/reference/compare
node kit/tools/reference.mjs palette films/proof/out/picture.mp4
node kit/tools/reference.mjs motion films/proof/out/picture.mp4
```

`compare` aligns the two (the offset that matches their first frames best), reports the mean pixel mismatch and
whether motion starts, peaks and ends at the same moments, and writes red difference images. `--blur 6` stops grain
and texture placed differently from counting as a difference. Pixel mismatch only means something for a proof that
rebuilds the same composition; the palette, line, grain and drawing rate say whether the look is right in any
composition.

### 6. Repeat

Look at the compare sheet, fix the largest difference (the stage, the line, the colour, then the timing), render, and
compare again. **At most five rounds.** Stop when the sheet and the numbers agree, or when the rest is a difference
you choose to keep; write down which.

### 7. Golden stills

Pick three frames **from the proof** (never the reference) that show the look done right: the stage alone, a drawn
thing, a type card. Save them to `templates/KEY/golden/` and list them in `template.json`'s `golden`. From then on
`lookmatch.mjs` holds every film in the template to them. The first real film made in it becomes its sample, and
the template's status becomes `ready`.
