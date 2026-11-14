# Rendering with raea

[raea](https://raea.io) ("Render Anything Engine") renders React/TSX compositions with a native engine (Bevy and
wgpu) instead of a browser. It has a real CSS layout engine for the page, a PBR 3D layer, post effects, audio and
its own checks. This page is what was learned from one trial of raea 0.1.3 on Linux, and when to choose it.

`examples/raea-proof/` holds that trial: `sky.tsx` (the opening shot of the worked example, written for raea), its
script file and two rendered frames.

## The verdict

- **It reaches about 70% of the kit's look** on the shot tried: gradient type arriving through blur, a glass panel,
  a lit procedural Earth with a blue rim, bloom, depth of field, motion blur and grain, all rendered headless with
  no errors.
- **What is missing is finish**: motion blur and depth of field touch only the 3D layer (page type needs CSS blur),
  there is no grain primitive, text stroke has no working form, and the built-in Linux encoder (H.264 Constrained
  Baseline) blotches near-blacks.
- **On a machine with no GPU it is slower than the browser path**: about 2.1 to 3.3 s per 1080p frame through
  software Vulkan, against about 0.5 s for the kit's renderer. raea is built for a GPU; that case was not measured.
- **Its own taste rules oppose this look.** raea's layout guide lists "glow, gradient text, glass panels or drop
  shadows as decoration" as things to refuse. Nothing blocks them, but its defaults and checks pull towards plain.

So: the kit's browser engine stays the default. Choose raea when a GPU is available and the film is mostly 3D, or
when a project is already React. The storyboard, the pedagogy, the sound and the review loop of this skill apply
unchanged; only steps 4 to 6 (build, stills, render) change.

## Getting it

A release is one archive per platform with `bin/raea` inside; no install step is needed to render. On Linux without
a GPU it runs on Mesa's software Vulkan (`mesa-vulkan-drivers`). Check the archive's SHA-256 against the release
before running it.

## A composition

```tsx
import { AbsoluteFill, Composition, registerRoot, useCurrentFrame, interpolate, Easing } from "raea";

function Shot() {
  const f = useCurrentFrame();
  const o = interpolate(f, [10, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return <AbsoluteFill style={{ background: "#0b0c10", opacity: o }}>...</AbsoluteFill>;
}

registerRoot(() => <Composition id="sky" component={Shot} width={1920} height={1080} fps={30} durationInFrames={180} />);
```

- One root; several `<Composition>` are allowed. Ids take letters, digits and hyphens.
- **Frame-pure**: no state, no effects. Every value is a function of `useCurrentFrame()`. `Math.random()` is
  re-seeded every frame, so use a hash of an index for anything that must hold still.
- This is the same rule as the kit's "never read the clock", so a storyboard counted in beats ports directly: a
  shot's start in frames is `Math.round(start * fps)`.

## Time

| Tool | Use |
| --- | --- |
| `interpolate(f, [a, b], [x, y], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing })` | every tween |
| `Easing.out(Easing.cubic)`, `Easing.inOut(...)`, `Easing.bezier(...)` | eases |
| `spring({ frame, fps, config: { damping, stiffness, mass } })`, `measureSpring` | landings with overshoot |
| `<Sequence from durationInFrames layout="none">`, `<Series><Series.Sequence>` | a shot's window |
| `<Animate enter="rise" at exit exitAt animate={{ ... track({0: a, 20: b}, "in-out-cubic") }}>` | declared moves |
| `<Stagger each enter>` | a row arriving one by one (it wraps its children, which can break a flex row) |

## The page (2D)

Worked in the trial: flex, grid, absolute positioning, linear, radial and conic gradients, `box-shadow` with
`inset`, `text-shadow`, `filter: blur() / drop-shadow() / brightness()`, `backdropFilter`, `backgroundClip: "text"`
with `color: "transparent"` (the metal and gradient type), `maskImage`, `clipPath`, `mixBlendMode`, 3D transforms
with `perspective()`, and inline SVG including `feTurbulence`.

- Use the unprefixed properties. `-webkit-text-fill-color`, `-webkit-backdrop-filter` and `-webkit-text-stroke` are
  reported as not applied.
- Always set `fontFamily`. System fonts are found by name; loading a font file was not tried.

## 3D

```tsx
import { Canvas3D } from "raea/3d";
<Canvas3D layered>   {/* transparent: page elements before it sit behind, positioned elements after sit over */}
  <Camera3d transform={Transform.fromXyz(0, 0, 6).lookingAt([0, 0, 0])} projection={{ Perspective: { fov: (30 * Math.PI) / 180 } }}>
    <DepthOfField focal_distance={6} aperture_f_stops={1.6} max_circle_of_confusion_diameter={18} mode="gaussian" />
  </Camera3d>
  <ToneMapping mode="agx" exposure={0.2} />
  <Bloom intensity={0.55} threshold={0.75} />
  <MotionBlur shutterAngle={0.6} samples={4} />
  <Grade vignette={{ intensity: 0.32, radius: 0.8, smoothness: 4 }} aberration={0.0016} />
  <AmbientLight brightness={6} color="#6f8fd0" />
  <DirectionalLight color="#fff0dc" illuminance={16000} transform={Transform.fromXyz(-17, 7, 8).lookingAt([0, 0, 0])} />
  <Mesh3d name="earth">
    <Sphere radius={1} ico={24} />
    <StandardMaterial base_color="#204070" perceptual_roughness={0.6} reflectance={0.4} />
  </Mesh3d>
</Canvas3D>
```

- Shaders are WGSL. A surface hook over the standard material:
  `<ExtendedMaterial base={<StandardMaterial opaque_render_method="Forward" />} extension={<ShaderExtension wgsl uniforms />} />`
  with `fn surface(in: VertexOutput, pbr: ptr<function, PbrInput>)`. A free shader on a shape:
  `<ShaderMesh shape="sphere(1.16)" wgsl uniforms alpha="add" />` with `fn shade(in: VertexOutput) -> vec4<f32>`.
  Uniforms are read as `u_name()`.
- A full-frame pass: `<FramePass wgsl uniforms />`. On a layered canvas, multiply what you add by the pixel's alpha,
  or the whole page posterises.
- The kit's GLSL shaders (the stage, the Earth) have to be rewritten in WGSL; the maths ports line by line.
- Not tried, from the docs only: HDRI environments, glTF models, 3D text. The docs say a texture on a `Sphere` is
  box-projected and smears, which is why the proof's Earth is procedural.

## What went wrong, so you do not repeat it

- Depth of field in `bokeh` mode turns small bright spheres into hexagons; `gaussian` is safer.
- Motion blur ghosts an additive shell (the atmosphere) during a whip. Fade the shell during the move.
- `--w` and `--h` do nothing when the file declares a `<Composition>`; add a second, half-size composition for
  drafts.
- `--frames N` did not shorten a render.
- The built-in MP4 fails raea's own check for blotching in the darks. Render frames and encode with FFmpeg:

```sh
RAEA_READBACK=rgba raea render sky.tsx --composition sky -o frames/
ffmpeg -framerate 30 -pattern_type glob -i 'frames/*.png' -c:v libx264 -crf 14 -pix_fmt yuv420p sky.mp4
```

## Commands

```sh
raea render sky.tsx --composition sky --frame 110 -o still.png     # one still
raea render sky.tsx --composition sky --at 8,46,120 -o stills/     # several
raea render sky.tsx --composition sky -o out.mp4 --manifest out.render.json
raea check --quick sky.tsx                                         # before rendering
raea check out.mp4 --manifest out.render.json --shape 16:9 -o check.json
raea media sheet out.mp4                                           # a contact sheet
```

`raea check` on a finished file looks for frozen stretches, flashing, stray black or white frames, blotching,
clipped text, text in UI zones, reading time and contrast. Run it as well as `kit/tools/check.mjs`, not instead:
it knows what text is on screen, which the kit's check does not.

## Measured speed (four cores, software Vulkan, no GPU)

| What | 960x540 | 1920x1080 |
| --- | --- | --- |
| Page only, video | about 0.24 s a frame | 3.3 s a frame (one run; a single still took 0.9 s) |
| With 3D and post, video | about 0.63 s a frame | 2.1 s a frame |
| With 3D, written as PNG frames | | 6.7 s a frame |

## Sound

raea has `<Audio src={staticFile("x.wav")} gainDb fadeOut />`, synth tones and a `<Mix lufs={-14} ceiling={-1.5} />`
master, and writes Opus audio. For this skill, render the picture silent and mix with `kit/audio/mix.py --picture`,
so the cue sheet, the measurements and the music-only version stay the same on both engines.

## raea's own script format

raea plans a film in `NAME.script.ts` (`script({ title, logline, scenes: [{ heading, payoff, beats: [{ onScreen,
camera, cut, lines, cues, seconds, onWord }] }] })`). Its rules for explainers agree with this skill's: say who it
is for and the one thing they can do afterwards, one step per scene, say only what is on screen, the last scene is
the payoff, and the storyboard is approved before anything renders. This skill's `storyboard.json` stays the source
of truth because it carries the facts, the drawn frames and the beat grid; a `script.ts` can be written from it
when raea's tooling wants one.
