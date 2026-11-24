# Handoff: sample films for the 10 concept templates (WIP branch)

This branch (`wip/sample-films`) saves work in progress. `main` is untouched by it.

## Status per film

Published on `main` (template marked ready):
- `internet-dns` (Isometric), commit 33bba79
- `jantung-berlari` (Pixel), commit 7ff07ee

Not yet published. Every film below had an independent review and a second verifying review. The last full
render in `examples/<film>/out/` (not in git) is the reviewed cut. The builders were stopped mid-edit, so the
source may be ahead of that render: re-render once and check the frames before publishing.

| Film | Template | State | Remaining fixes (from the verifier) |
| --- | --- | --- | --- |
| phone-battery | whiteboard | verified, 3 small fixes in progress | "home" label off the wire (32–44 s); 4–6 dots on the wire 39.1–41.8; s19 camera settles by 49.0 |
| pythagoras | chalkboard | verified, 3 fixes in progress | strokes popping in one frame (kit `ink.drawOn` rounding bug); caption over b² 0.6–2.3; hold "area = a × a" and s18 formula |
| fotosintesis | paper | verified, 3 fixes in progress | panel edge at 25.25 and flat flap 28.42; hard cuts 23.42/32.50/42.58; balance set 80 px right, page turns −4 dB |
| gunung-api | lowpoly | verified, 3 fixes in progress | one-frame swaps 11.8, 4.333, 47.467, 55.25; bars half-folded at 50.80; "botol tertutup." over the opened bottle, dome knocks |
| popcorn | comic | verified, 3 fixes in progress | caption boxes over labels (recap equation 45.8–47.9, PATI LEMBUT, TEKANAN NAIK, SSSS); labels clipped during moves; whistle −5 dB, foam face |
| madu-lebah | watercolour | verified, 3 fixes in progress | things crossing captions/labels, label holds; s03/s04 flower details; comb plates end on paper, s10b bees |
| neural-network | neon | verified, 3 fixes not started | labels clipped by the camera 21.5–28.4; s12 note off the right edge, ghost tick; 2–8 kHz content for the bed |
| gears | blueprint | round-1 fixes in progress, not verified | see `handoff/reviews/gears-r1.md` |

Full first-round reviews: `handoff/reviews/<film>-r1.md`. Kit problems the builders reported (apply after the
films, the kit is shared): `handoff/KIT-FIXES.md`. Publishing one film: `handoff/publish_one.py KEY FILM T1 T2 T3`
(golden frames, template.json, template.md, catalog.json), then commit the film folder and template.

## Rules that held

- No ElevenLabs credits: takes and beds are fixed. Pauses can be cut into a take with the kit's `hold`.
- Effects never louder than the voice; named cues about 4–8 dB under voice+music at onset (captions-only films:
  6–10 dB over the bed).
- Render one film at a time: `node kit/tools/make.mjs examples/<film> [--only a-b]`.

## After all films

Re-run `docs/media/readme.mjs` and the gallery, rebuild and deploy the website, then apply `handoff/KIT-FIXES.md`.
Work one film at a time, without parallel subagents: the parallel run used most of a week's usage limit.
