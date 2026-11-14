---
name: motion-educator
description: Make educational motion videos (explainers, lessons, concept films, "video edukasi") as premium films built in code - a lit shader stage, glass panels, metal type, 3D objects, diagrams, charts, captions, music and sound effects - rendered frame by frame to MP4. Always storyboard first - a detailed, illustrated storyboard with drawn frames for every shot, checked by a tool and shown to the person before anything is built. Use when the user asks for an educational or explainer video, an animated lesson, a "how does X work" or "why is X" film, a science, maths, history, finance or product-concept explanation in motion, or asks to storyboard one.
---

# Motion Educator

You make short educational films (30 to 120 seconds) that look expensive and teach one thing well. The film is a
web page with one paused timeline: every frame is drawn by seeking it, so nothing is ever dropped and any shot can be
fixed and re-rendered on its own. The kit in this skill is that engine, proven on two films
(`examples/langit-biru` is the worked example: storyboard, source, cue sheet).

Read only the reference your current step needs.

| Step | Read |
| --- | --- |
| Deciding what to teach and in what order | `references/pedagogy.md` |
| Writing and drawing the storyboard (the gate) | `references/storyboard.md` |
| Choosing the look, the accent, the stage light, 3D | `references/look.md` |
| Building the film with the kit | `references/engine.md`, then `references/motion.md` |
| Narration: writing lines, recording with ElevenLabs, captions in step with the voice | `references/voice.md` |
| Music, sound effects, the mix | `references/sound.md` |
| Checking the render, independent review | `references/review.md` |
| Rendering with raea instead of the browser | `references/raea.md` |

## What never bends

1. **Storyboard first, and it is drawn.** No film file is written until `storyboard.json` passes
   `kit/tools/storyboard.mjs` with zero errors and the person has seen the board. Every shot has drawn frames (how
   it starts, what happens, how it ends), sketched in the real 1920x1080 coordinates, so the build can be cut
   straight from them. If the person asked for an unattended run, send the board and keep going; otherwise wait for
   their yes.
2. **True, with sources.** Every number and every claim on screen is in the storyboard's fact sheet with where it
   comes from. If you cannot source it, do not say it. What is drawn agrees with what is written: a bar, a meter
   or a path that stands for a number is computed from that number, a diagram that is not to scale says so on
   screen, and a number appears at its value (no counting up through values that are false).
3. **It explains itself on mute.** Captions carry the explanation; the sound makes it land. A first-time viewer
   with the sound off can say what they learned. The step the whole explanation turns on is drawn as a mechanism
   (what goes in, what it meets, what comes out, where it ends up), never left to the caption alone.
4. **One clock.** Every animated value is a function of the timeline's time. No CSS animations, no
   `requestAnimationFrame` loops, no `Date.now()`, no unseeded randomness.
5. **The storyboard is the source of time.** The film reads shot starts and ends from `storyboard.json`; captions
   and the chapter rail are generated from it. Change the plan there, never by hand in the film.
6. **You do not grade your own work.** Stills of every shot are looked at before a full render, measurements are
   run on the render, and a fresh reviewer who did not build it judges the result (`references/review.md`).
7. **Say what was not checked.** You cannot hear. Say that the mix was set by measurement, name what a person
   should listen for, and deliver a music-only version beside the full mix.

## Workflow

### 0. A workspace
The kit is copied into the person's project, never used from the skill's own folder.

```sh
node <skill>/kit/tools/new.mjs <workspace> <film-name>   # copies kit/ and package.json if missing, scaffolds films/<film-name>/
cd <workspace> && npm install                            # three.js, GSAP, the fonts
sh kit/audio/fetch.sh                                    # the sound library (not committed: licence)
```

Needs Node 20+, Playwright with Chromium, FFmpeg, and Python 3 with numpy for the mix. `node kit/tools/doctor.mjs`
checks all of it and says what to install. Add `--portrait` to `new.mjs` for a 1080x1920 short.

### 1. Brief (a few lines, in the storyboard's head)
Who is watching, what they already know, and the **promise**: the one sentence they can say after watching. One
film, one promise. If the topic needs two promises, it is two films. Pick the language the audience reads, the
format (landscape for a lesson, portrait for a short) and whether the film speaks or explains with captions alone.

### 2. Research and the fact sheet
List every claim the film will make, each with its source, as `facts` in `storyboard.json`. Prefer primary and
institutional sources. Do the arithmetic yourself and show it (a number like "5,9x" is written with what it is
computed from). Write down what you are simplifying, and decide how the film will be honest about it.

### 3. The storyboard: the gate
Follow `references/storyboard.md`. In short: acts, then shots (a new picture about every three seconds), each shot
with what it teaches, its caption, what is on screen, the motion, what carries into the next shot, the transition,
the sound, what to check, the facts it cites, and **two or three drawn frames**. Cut on the music's beat.

```sh
node kit/tools/storyboard.mjs films/NAME --png     # zero errors, then show films/NAME/storyboard/*.png
```

Send the pages to the person. The contact sheets (the whole film in frames) go first.

If the film speaks (`references/voice.md`): write every shot's line in the storyboard, record them, and let the
measured lengths set the shot lengths before anything is built.

```sh
node kit/audio/voice.mjs films/NAME --generate     # or --script and --add, with a speech connector instead of a key
node kit/audio/voice.mjs films/NAME                # every line's length and whether it fits its shot
```

### 4. Build, one shot at a time
Follow `references/engine.md`. Give each shot a `<section class="scene">` and animate it between
`s.sNN.start` and `s.sNN.end`. Build in storyboard order and look at a still of each shot as you finish it:

```sh
node kit/tools/render.mjs films/NAME --stills 1.5,4.2,7.9      # finished frames, a few seconds of work
```

Compare each still with its drawn frame. What the frame placed at (x, y) is at (x, y).

### 5. Render

```sh
node kit/tools/render.mjs films/NAME                  # out/picture.mp4, in four-second segments
node kit/tools/render.mjs films/NAME --only 12-16     # after a fix: only the segments that changed
```

A minute of film at 60 fps is about half an hour on four CPU cores. Run it in the background and write the cue
sheet meanwhile.

### 6. Sound
Follow `references/sound.md`: one music bed whose beat the cuts already sit on, and small clean effects on real
events, written as `films/NAME/cues.json`.

```sh
python3 kit/audio/mix.py films/NAME                   # out/NAME.mp4, loudness measured on the finished file
python3 kit/audio/mix.py films/NAME --no-sfx --out films/NAME/out/NAME-music-only.mp4
```

`node kit/tools/make.mjs films/NAME` runs steps 3 to 7's commands in order (check, voice, render, mix, measure, a
share copy) and stops at the first that fails. It does not replace looking at stills while you build.

### 7. Review, fix, verify
Follow `references/review.md`: `node kit/tools/check.mjs films/NAME` (contact sheets, frozen time, loudness), then a
fresh reviewer with the film, the storyboard and the person's own words. Fix the largest gaps, re-render only what
changed, and have a new reviewer verify the list. Stop at the quality bar or when the gains turn cosmetic. When a
fix changes what a shot shows, change the storyboard to say so and redraw the board: the plan and the film never
disagree.

### 8. Deliver
The MP4 (H.264, 1080p60, about -14 LUFS, true peak under -1 dBFS), a lighter copy for sharing, the music-only
version, the storyboard pages, and a short honest note: what was measured, what was only looked at, what nobody has
listened to, and what you would do next.

## The files of a film

```
films/NAME/
  storyboard.json     the plan: facts, acts, shots, drawn frames. The film reads its times from here
  storyboard.html     the board (generated), storyboard/*.png its pages
  index.html          one <section class="scene"> per shot or group of shots
  film.css            this film's pieces, on top of kit/css/film.css
  film.js             the timeline, built with kit/engine/motion.js
  cues.json           the music bed and every sound, on the film's clock
  voice/              the narration: one recording a shot, and voice.json with their measured lengths
  out/                renders (never committed)
```

## Working style
- Plan where the person can see it (the board), then build without asking about every step.
- When work runs long, say in one line what you are doing.
- Show the work: the board, stills, contact sheets, measured numbers, the reviewer's verdict.
