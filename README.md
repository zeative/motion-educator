# Motion Educator

A skill for coding agents, and the film engine it uses, for making educational motion videos: explainers, lessons,
"why is X" and "how does X work" films. The films look expensive (a lit shader stage, glass, metal type, 3D,
diagrams, charts, captions, music and sound effects) and they are built in code, so every frame is exact and any
shot can be fixed on its own.

The skill's rule is **storyboard first**: a detailed, illustrated storyboard, with drawn frames for every shot in
the real frame's coordinates, checked by a tool and shown to the person before anything is built.

- `SKILL.md`: the skill. Start here.
- `references/`: how to teach on screen, the storyboard standard, the look, the engine, motion, sound, review.
- `kit/`: the engine and its tools. Copied into each workspace.
- `templates/film/`: what a new film starts from.
- `examples/langit-biru/`: a complete film made with the skill, "Kenapa langit berwarna biru?" (67 s, Indonesian):
  its storyboard (22 shots, 63 drawn frames, 9 sourced facts), source, cue sheet and the Earth maps it uses.

## Install as a skill

Copy or clone this folder to where your agent reads skills, for Claude Code:

```sh
git clone git@github.com:zeative/motion-educator.git ~/.claude/skills/motion-educator
```

Then ask for an educational video. The agent scaffolds a workspace in your project and works there.

## Use by hand

```sh
node kit/tools/new.mjs ~/films my-first-film      # a workspace with the kit, and films/my-first-film
cd ~/films && npm install && sh kit/audio/fetch.sh

# 1. Write films/my-first-film/storyboard.json, then check it and draw the board:
node kit/tools/storyboard.mjs films/my-first-film --png

# 2. Build the film (index.html, film.css, film.js), looking at stills as you go:
node kit/tools/render.mjs films/my-first-film --stills 1.5,4.2
node kit/tools/render.mjs films/my-first-film --serve          # watch it live

# 3. Render, mix, measure:
node kit/tools/render.mjs films/my-first-film                  # out/picture.mp4
python3 kit/audio/mix.py films/my-first-film                   # out/my-first-film.mp4
node kit/tools/check.mjs films/my-first-film
```

To render the worked example in this repository: `npm install && sh kit/audio/fetch.sh`, then the same three
commands with `examples/langit-biru`.

Needs Node 20 or newer, Playwright with Chromium (`npx playwright install chromium`), FFmpeg, and Python 3 with
numpy.

## What is in the kit

| File | What it is |
| --- | --- |
| `kit/engine/motion.js` | the film engine: one paused timeline, scenes, type, captions, chapters, whips, hits |
| `kit/engine/stage.js` | the stage: one fragment shader of flowing light, a floor, dust, shock rings |
| `kit/engine/stage3d.js` | a three.js layer with a studio environment and materials that read as real |
| `kit/css/film.css` | the look: tokens, glass, metal type, captions, panels, chips |
| `kit/tools/storyboard.mjs`, `sketch.mjs` | the storyboard check and the pencil-sketch board |
| `kit/tools/render.mjs` | frame-by-frame render in segments, stills, live preview |
| `kit/tools/check.mjs` | contact sheets, frozen time, loudness |
| `kit/audio/mix.py`, `fetch.sh`, `sources.json`, `screen.py` | the mixer and the sound library's list |

## Other people's work in here

- [GSAP](https://gsap.com) (its standard licence), [three.js](https://threejs.org) (MIT), and the fonts Sora,
  Inter, JetBrains Mono, Instrument Serif and Patrick Hand (SIL Open Font License), all installed from npm.
- The Earth in the worked example uses NASA's Blue Marble and Earth at Night maps, which are not copyrighted
  (`examples/langit-biru/assets/SOURCES.md`).
- Music and sound effects from [Mixkit](https://mixkit.co) under its free licences. They may be used inside a video
  but not passed on as files, so they are downloaded by `kit/audio/fetch.sh` and never committed.
- The composition shape (a fixed-size root and one paused timeline exposed as `window.__timelines.root`) follows
  [Null Motion](https://github.com/blixvip/NullMotion)'s HyperFrames convention.
- `references/raea.md` covers rendering with [raea](https://raea.io) instead of the browser, and
  `examples/raea-proof/` is one shot of the worked example written for it, with two rendered frames.
