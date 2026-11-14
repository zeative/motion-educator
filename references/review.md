# Review

You built it, so you cannot see what is wrong with it. Three layers catch what you miss: looking at stills as you
build, measuring the render, and a reviewer who did not build it.

## While building: stills

After each shot, render a still from its middle and one from each transition, and look at them:

```sh
node kit/tools/render.mjs films/NAME --stills 1.5,4.2,7.9
```

Compare each with its drawn frame in the storyboard. Check: is the subject where the frame put it; is anything
clipped, overlapping or unreadable; is the frame mostly empty; did a bright thing blow out; is the lettering the
right size. Do not start a full render with a shot you have not looked at.

## After rendering: measurements

```sh
node kit/tools/check.mjs films/NAME
```

It writes contact sheets (a frame every half second) to `out/sheets/`, counts frozen time (stretches where nothing
moves) and, when the mixed film exists, reads its loudness. Look at every sheet.

| Check | Target |
| --- | --- |
| Frozen time | none over 0.6 s, except the last frame |
| Frame count and length | exactly duration x fps; the file decodes without errors |
| Loudness | about -14 LUFS integrated, true peak under -1 dBFS, measured on the encoded file |
| Sounds on events | each lands within a frame or two of its picture; each lifts at least about 5 dB over the half second before it |
| Captions | readable at phone size; never over the subject of the shot |
| Facts | every number on screen matches the fact sheet |

## The reviewer who did not build it

Give a fresh agent the rendered film, the storyboard and the person's own words, and nothing of your reasoning. It
extracts its own frames. Fix the largest gaps, re-render only the segments that changed, then give a **new**
reviewer the new cut and the old report to verify item by item. Two rounds is usual. Stop when the remaining items
are cosmetic.

### First review

```
You are an independent, harsh critic. You did NOT build this; judge rendered pixels and measurable audio, not
intentions. Do not edit any file; work in a scratch folder. Return the report as your final message.

Artifact: <path> (<seconds> s, 1920x1080, 60 fps, with audio). An educational film that answers: "<question>".
Promise: <the storyboard's promise>. Audience: <audience>. Storyboard: <path to storyboard.json> (the plan and the
fact sheet). Scene map: <shot ids with start times>.
The person's criteria, in their words: <verbatim>.
Benchmark: premium explainers and launch films: rich lighting, real material detail, a confident camera, motion blur
on fast moves, no wasted space, type as choreography, sound that lands on the picture.

Method: contact sheets every 0.25 s that you can read; native frames at the middle of every shot; dense windows at
1/30 s around every cut. Frame differences for frozen stretches. Audio by measurement (you cannot listen: say so):
loudness, true peak, and whether an onset sits on each visual event.

Report (under 900 words):
1. Teaching: could a first-time viewer, on mute, say the promise afterwards? Where does the explanation skip a step,
   state something unsupported, or disagree with the fact sheet?
2. Per shot: what is on screen, how much of the frame is empty, premium or ordinary and exactly why, defects with
   timestamps and screen regions.
3. Per transition: intended or cheap; any defect frames (pops, overlaps, half-drawn states).
4. Audio findings with numbers.
5. The top eight changes, ranked by impact, each concrete and implementable.
Be blunt. No praise for its own sake.
```

### Verification

```
You are an independent critic doing a verification pass on a film you did not build. Do not edit any file.
New cut: <path>. The previous report: <paste it>. Timings that moved: <list>.
For each item of that report: FIXED / PARTLY / STILL PRESENT, with a timestamp and what you see.
Then NEW defects, which matter most: glitch or pop frames, text over text, clipped elements, half-drawn states.
Audio: loudness, true peak, the lift of each named event.
Under 500 words. End with SHIP or ONE MORE PASS (at most three fixes, each concrete).
```

### Storyboard review (before building, when the stakes justify it)

```
Review this storyboard for a <seconds> s educational film answering "<question>" for <audience>. You did not write
it. Storyboard: <path to storyboard.json and its pages>. Check: is every claim in the fact sheet true and is its
source real; does the explanation go in an order a newcomer can follow, with no step skipped; does each shot teach
one thing; is the objection a sharp viewer would raise answered; which shots are filler; is the recap complete.
Return a ranked list of problems with one concrete fix each.
```

## Keep a record

For each round: what was reviewed, the top findings, what changed, and the measured result. It goes in the delivery
note, and it is how the next film starts better than this one did.
