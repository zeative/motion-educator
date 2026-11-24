# Kit fixes reported by the sample-film builders (apply after all films are rendered; kit is shared)

## ink.js
- drawOn/erase: GSAP rounds strokeDashoffset (pathLength=1) -> stroke pops at half time. Tween {off} per path, write style in film.each (like film.draw). Workaround in examples/phone-battery/film.js inkOn/inkOff. Affects troli-penuh too. (phone-battery)
- drawOn with duration: gap and min not scaled (34 dashes in 0.34 s took 1.5 s; 70 buds took 10 s). min = min(0.12, duration/strokes), shrink gap. (phone-battery, madu-lebah)
- erase on a list of HTML elements erases all at once from each one's end; add "as one line" option. (phone-battery)
- vector-effect: non-scaling-stroke breaks draw-on (dash in screen space): note in references/engine.md. (madu-lebah)
- Wash filter cost ~7 s/frame: build a bake cache into ink.js/look.js (see examples/madu-lebah/bake.mjs). (madu-lebah)
## motion.js
- "written" caption style: ink.write per word at its spoken time; pill captions at 80 px don't fit a voiced landscape whiteboard film. (phone-battery)
## backdrops
- whiteboard backdrop can't follow a long tracked board (moves 1/5, clamps 12%): 1:1 tiling mode. (phone-battery)
## render.mjs
- events.json in fingerprint forces full re-render after --events; skip it. (phone-battery)
- readiness waits only HTML <img>, not SVG <image>. (madu-lebah)
- compare timeline length with storyboard before rendering. (madu-lebah)
## lookmatch.mjs
- grain counts small drawn detail as grain at 320 px: measure only large flat areas or higher res. (phone-battery, madu-lebah)
## mix.py
- lift measure includes narrator syllable peaks; measure against bed+effects or add foley class. (madu-lebah)
## templates
- watercolour golden stills are cartoon posters: add madu-lebah frames, recalibrate line/grain. (madu-lebah)
## brief/process
- per-film log names in the shared scratchpad. (madu-lebah)
- (pythagoras) board backdrop: same 1/5 parallax clamp problem; also no wooden frame though chalkboard template.md asks for one -> parallax:1 / long-board mode + frame overlay.
- (pythagoras) chalk caption style in motion.js (ink.write per word + coloured underline).
- (pythagoras) mix.py lift: same complaint; short transients within 0.5 s of other effects.
- (pythagoras) render lock not first-come; scratchpad shared -> per-film names.
- (pythagoras) storyboard look.mood stale accent (#9bd3ae vs #f6d365) in chalkboard template? check template.md / storyboard.
- Board PNG pages show pre-retime times for several films: regenerate all with storyboard.mjs --png at publish.
- (internet-dns) templates/isometric/template.json captions "pill" contradicts template.md ("two or three words") -> "pop"; .caption.pop bottom:0 in isometric look.css.
- (internet-dns, madu-lebah) ElevenLabs bed fades out despite prompt: music.mjs detect end fade and splice bars over it (see examples/*/bed.loop.py, internet-dns music/bed-loop.mp3).
- (internet-dns) mix.py sfx_db -4 default: wall-to-wall narration -> effects fail lift; document in sound.md.
- (internet-dns) render.mjs fingerprint: add ^events\.json$ to skip pattern.
- (pythagoras critic) templates/chalkboard: template.md says grain 4, template.json says 2; template.md wants a separate chalk hand for body text, template.json body font = Cabin Sketch. Reconcile.
- (internet-dns critic) make.mjs "<name>-music-only.mp4" actually holds voice + music (no SFX): the name misleads; rename to -no-sfx (as older films) or make it truly music-only; update docs/website refs.
- (gunung-api) kit/css/film.css: `canvas {position:absolute; inset:0; ...}` hits every canvas -> scope to #root > canvas.
- (gunung-api) stage3d.js: one camera/viewport; render(opacity,t,{rect,cam}) + pins per view for split screens/cards.
- (gunung-api) stage3d.js: ACES + room env always on; flat:true option; note in lowpoly template.md.
- (gunung-api) reference.mjs/lookmatch: background = mode of exact hex, meaningless for 3D; ink catches caption panels -> cluster by dE / median.
- (gunung-api) templates/lowpoly/look.css key word #ff9f1c on white panel ~2:1 contrast -> #f08700.
- (gunung-api) GSAP tl.set(...,0) not applied when first seek is exactly t=0 -> note in engine.md (or render.mjs seeks 0.0001 first / tl.progress(1).progress(0)?).
- (popcorn) ink.js drawOn: same GSAP rounding bug (or autoRound:false).
- (popcorn) lavapipe: SVG under non-rect clip-path/mask leaves 1 px hairlines on tile edges, varies per render -> ink.js halftone: compute dots inside shape on CPU (see examples/popcorn/comic.js dotPath); note in engine.md.
- (popcorn) mix.py lift: measure around aligned time t (align:"peak" whooshes measured before peak).
- (popcorn) comic template.md: Bangers/Kalam lack ≈ → ✓.
- (popcorn) foley: comic stingers synthesized in examples/popcorn/sfx.build.py; consider adding after a listen.
- (fotosintesis) analysis.mjs looks() background = per-channel median of frame edge; misreads compositions with ground bands -> most common colour, or compare with template.json paper.
- (fotosintesis) Fraunces/DM Sans subset lacks subscript digits, ≈, → : helper in ink.js (see examples/fotosintesis/film.js printed()).
- (fotosintesis) motion.js film.each job order: add `late` option / compute-then-draw phase.
- (fotosintesis) ink.js url(#cut): add edge roughness + pop-up variant with higher shadow.
- (fotosintesis) templates/paper/look.css: key word should sit on a coloured tab (film.css has it).
- (fotosintesis, madu-lebah) render.mjs: clamp/warn when timeline length > storyboard duration at render time.
- (fotosintesis) mix.py loop check runs before ride is applied.
- (gears) music.mjs: measure tempo vs storyboard.music.bpm (bed came 70 vs 75), warn/fit; detect end fade.
- (gears) ink.js: erase starting during a write is overridden by later letter tweens -> erase kills letter tweens from its start.
- (gears) ink.letters jitter always on -> `straight` option.
- (gears) captions "title-block" in blueprint template.json not implemented in motion.js; add it or no-blur option.
- (gears) blueprint template.md says 10/100 px grid; backdrops.js paints 20/200 (goldens) -> fix text.
- (gears, gunung-api) tl.set at time 0 not rendered by paused tl at 0 -> finish() forces render at 0 (tl.invalidate / tl.seek(0.0001).seek(0)?).
- (gears) candidates: examples/gears/draft.js as a Blueprint helper; drafting/mechanical foley into kit/audio/foley.py.
- (gears) storyboard.json music stale (says not generated, 75 BPM).
- (SYSTEMIC, fotosintesis critic) the 5 dB lift target pushes builders to make effects louder than the narration (fotosintesis effects -15.8 LUFS vs voice+music -16.7; loudest moments are paper slides). mix.py needs a ceiling check: report effects-vs-voice level (e.g. % of windows where effects > voice, max momentary of effects layer) and warn; sound.md: lift is measured against bed+effects in voiced films, never by raising effects over the voice.
- (fotosintesis critic) "music-only" mix normalised on its own (-14.0) -> fine as a deliverable but name it honestly.
- (jantung-berlari) pixel captions off-grid: templates/pixel/look.css 44 px Press Start 2P (5.5 px/font px); motion.js pop scales 0.86->1 and dims unsaid words 38% -> "dialog" caption style (32/64 px, no scale, typed) or render hook for film-drawn captions.
- (jantung-berlari) pixel look.css #vignette opacity .7 = gradient on a no-gradient template; golden proofs carry it -> hide vignette for pixel, replace proof stills.
- (jantung-berlari, popcorn, gears, madu-lebah, fotosintesis) foley lib lacks 8-bit/chip, comic stingers, paper, drafting, water sounds; builders synthesised in examples/*/sfx.build.py -> generator in kit/audio/foley.py (after a listen).
- (jantung-berlari) lookmatch.mjs decodes fps=8/span -> samples shifted ~3 s; use explicit seeks/select by frame, ~24 samples.
- (phone-battery r1) ink.wipe: soft-edged eraser mask + smear (examples/phone-battery/film.js wipe).
- (phone-battery r1) world-space captions mode for tracking templates (whiteboard/chalkboard).
- (phone-battery r1) mix.py --keep-wav / --stems; add effects-vs-voice report (see scratchpad/pb/layers.py).
- (neural-network) render.mjs finish: no chromatic aberration though neon template asks; add finish.chroma (R +0.3%, B −0.3% scale about centre).
- (neural-network) backdrops.js neon floor horizon at 62% height (portrait y1190, behind captions), static -> portrait ~76% and scrolling travel.
- (neural-network) ink.glow = 3 drop-shadows/element, costly -> canvas glow helper (downsample, blur, add).
- (neural-network) Space Grotesk subset lacks →.
- (neural-network) mix rule for captions-only films: state relative to the main layer (voice, else bed); my "≤ −20 LUFS momentary" note was for voiced films.
- (neural-network) render lock not FIFO (flock): use a ticket queue (e.g. a queue dir with mtime order) in make.mjs/render.mjs.
- (pythagoras r1) music.mjs bar-repeat option to lengthen a bed (see examples/pythagoras/music/bed.build.py).
- (fotosintesis r2) kit/audio levels.py: per-cue level vs voice+music at its own window (see examples/fotosintesis/levels.py); mix.txt should report it.
- (fotosintesis r2) mix.py true peak: if encoded TP > −1 dBFS, lower the ceiling by the overshoot and re-encode.
- (fotosintesis r2) render.mjs: a cue()-only change in film.js forces full re-render (fingerprint) -> exclude audio-only calls / separate cue file.
- (fotosintesis verify) lookmatch golden reference for paper: background should be the cream #efe9dd (golden edges are hills #a6c5a2) -> fix reference/golden stills for paper; verifier confirmed film stage = template paper.
- (gunung-api r1) lookmatch: background from sky's top rows for 3D; print palette with one decimal; lowpoly golden lacks an interior/underground still -> add one (e.g. gunung-api cut-away) or allow ember palette.
- (gunung-api r1) lowpoly template.md: sun near-white + cool sky light (warm sun turns teal ground green, slate cone brown).
- (gunung-api r1) mix.py: report loudest momentary; option to keep headroom for a planned peak moment.
- (madu-lebah r1) mix.py loop films: voice duck opens before first word -> hole at seam; compute talking envelope circularly when loop; np.roll(talking, -k) wraps opening onto last 140 ms (likely bug).
- (madu-lebah r1) SVG filters on groups inside scale(): filter units scale (6 px displacement -> ~200 px) -> references note: filter on an unscaled parent.
- (madu-lebah r1) watercolour golden: add a dense plate (madu-lebah) or loosen line tolerance.
- (neural-network r1) neon template: caption key word always magenta (second neon) conflicts with "magenta = error" in a teaching film -> template.md: key word takes the colour of what it names, magenta only when no colour meaning is in play.
- (neural-network r1) mix.py: `eq` list on music (per-band gain points over time), see examples/neural-network/bed.build.py; report effects-over-bed from stems.
