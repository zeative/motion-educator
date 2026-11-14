// sky.tsx: the opening shot of "Kenapa langit berwarna biru?" (an Indonesian explainer), a proof for raea 0.1.3.
// 6 s = 180 frames at 30 fps, 1920x1080. Every number is derived from the frame; nothing is carried between frames.
// The Earth is procedural (a WGSL surface hook over Bevy's StandardMaterial): no texture files, no network.
import { AbsoluteFill, Composition, Easing, interpolate, registerRoot, useCurrentFrame, useVideoConfig } from "raea";
import { Canvas3D } from "raea/3d";
import { Camera3d } from "raea/camera";
import { LinearRgba, Srgba } from "raea/color";
import { AmbientLight, DirectionalLight } from "raea/light";
import { Mesh3d, Sphere } from "raea/mesh";
import { ExtendedMaterial, ShaderExtension, ShaderMesh, StandardMaterial } from "raea/pbr";
import { Bloom, DepthOfField, FramePass, Grade, MotionBlur, ToneMapping } from "raea/post_process";
import { Transform } from "raea/transform";

// ---------- the look ----------
const STAGE = "#0b0c10"; // graphite
const SKY = "#4da3ff";
const FACE = "'Inter Display', Inter, sans-serif";
const OUT = Easing.out(Easing.cubic);
const INOUT = Easing.inOut(Easing.cubic);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ---------- helpers ----------
/** a number in 0..1 that holds still for an index (Math.random() is re-seeded every frame) */
const rnd = (i: number, k = 0) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// ---------- data ----------
const SUN: [number, number, number] = [-0.86, 0.34, 0.38]; // the direction to the sun: left, a little up and forward
const TITLE: { text: string; blue?: boolean }[][] = [
  [{ text: "Kenapa" }, { text: "langit" }],
  [{ text: "berwarna" }, { text: "biru?", blue: true }],
];
const CAPTION = ["Cahaya Matahari terlihat putih.", "Jadi dari mana warna birunya?"];

// ---------- shaders ----------
const NOISE = /* wgsl */ `
fn hash3(p: vec3<f32>) -> f32 {
  var q = fract(p * 0.3183099 + vec3<f32>(0.71, 0.113, 0.419));
  q = q * 17.0;
  return fract(q.x * q.y * q.z * (q.x + q.y + q.z));
}
fn noise3(x: vec3<f32>) -> f32 {
  let i = floor(x);
  let f = fract(x);
  let u = f * f * (3.0 - 2.0 * f);
  let a = mix(hash3(i), hash3(i + vec3<f32>(1.0, 0.0, 0.0)), u.x);
  let b = mix(hash3(i + vec3<f32>(0.0, 1.0, 0.0)), hash3(i + vec3<f32>(1.0, 1.0, 0.0)), u.x);
  let c = mix(hash3(i + vec3<f32>(0.0, 0.0, 1.0)), hash3(i + vec3<f32>(1.0, 0.0, 1.0)), u.x);
  let d = mix(hash3(i + vec3<f32>(0.0, 1.0, 1.0)), hash3(i + vec3<f32>(1.0, 1.0, 1.0)), u.x);
  return mix(mix(a, b, u.y), mix(c, d, u.y), u.z);
}
fn fbm(p0: vec3<f32>, oct: i32) -> f32 {
  var p = p0;
  var a = 0.5;
  var s = 0.0;
  for (var i = 0; i < oct; i++) {
    s += a * noise3(p);
    p = p * 2.03 + vec3<f32>(11.7, 3.1, 7.3);
    a *= 0.5;
  }
  return s;
}
fn rot_y(p: vec3<f32>, a: f32) -> vec3<f32> {
  let c = cos(a);
  let s = sin(a);
  return vec3<f32>(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}
fn rot_z(p: vec3<f32>, a: f32) -> vec3<f32> {
  let c = cos(a);
  let s = sin(a);
  return vec3<f32>(c * p.x - s * p.y, s * p.x + c * p.y, p.z);
}
`;

// The Earth's surface before lighting: land, sea, ice and cloud as colour and roughness, city lights and a thin blue
// haze as emissive. The sphere itself doesn't turn; the map turns under it (u_spin), on a tilted axis.
const EARTH = NOISE + /* wgsl */ `
fn surface(in: VertexOutput, pbr: ptr<function, PbrInput>) {
  let n = normalize(in.world_position.xyz - u_centre().xyz);
  let sun = normalize(u_sun().xyz);
  let v = normalize(view.world_position.xyz - in.world_position.xyz);
  let p = rot_y(rot_z(n, -0.41), -u_spin());

  // continents: warped fbm, a threshold with a narrow shore
  let warp = vec3<f32>(fbm(p * 2.1 + vec3<f32>(3.0, 1.0, 5.0), 3), fbm(p * 2.1 + vec3<f32>(9.0, 4.0, 2.0), 3), fbm(p * 2.1, 3)) - vec3<f32>(0.45);
  let h = fbm(p * 1.55 + warp * 0.9 + vec3<f32>(1.3, 7.7, 4.2), 8);
  let land = smoothstep(0.476, 0.494, h);
  let shore = smoothstep(0.425, 0.482, h);
  let lat = abs(p.y);

  // land: green lowlands, tan dry belts, grey-brown high ground
  let dry = smoothstep(0.42, 0.62, fbm(p * 3.3 + vec3<f32>(5.0), 4)) * (1.0 - smoothstep(0.45, 0.75, lat));
  var ground = mix(vec3<f32>(0.035, 0.11, 0.03), vec3<f32>(0.33, 0.25, 0.13), dry);
  ground = mix(ground, vec3<f32>(0.20, 0.17, 0.14), smoothstep(0.58, 0.70, h));
  ground *= 0.70 + 0.6 * fbm(p * 22.0, 4);
  // sea: deep blue, lighter on the shelf
  let sea = mix(vec3<f32>(0.004, 0.022, 0.085), vec3<f32>(0.008, 0.055, 0.13), shore * shore);
  var col = mix(sea, ground, land);
  // ice at the poles
  let ice = smoothstep(0.80, 0.88, lat + 0.10 * fbm(p * 6.0, 3));
  col = mix(col, vec3<f32>(0.80, 0.86, 0.92), ice);

  // cloud: a second map turning a little faster, in streaks along the latitude
  let pc = rot_y(p, -u_cloud());
  let cw = fbm(pc * vec3<f32>(2.2, 4.4, 2.2) + vec3<f32>(20.0), 3) - 0.5;
  let cl = fbm(pc * vec3<f32>(3.2, 5.2, 3.2) + vec3<f32>(cw * 2.2, 0.0, cw * 2.2) + vec3<f32>(40.0), 8);
  let cloud = smoothstep(0.50, 0.70, cl) * 0.92;
  col = mix(col, vec3<f32>(0.90, 0.92, 0.95), cloud);

  let ndl = dot(n, sun);
  let day = smoothstep(-0.12, 0.30, ndl);
  let night = 1.0 - smoothstep(-0.25, 0.05, ndl);

  (*pbr).material.base_color = vec4<f32>(col, 1.0);
  (*pbr).material.perceptual_roughness = mix(mix(0.32, 0.92, max(land, ice)), 1.0, cloud);
  (*pbr).material.metallic = 0.0;

  // city lights on the night side: clustered points on land, under gaps in the cloud
  let towns = smoothstep(0.50, 0.66, fbm(p * 5.0 + vec3<f32>(77.0), 4));
  let dots = smoothstep(0.62, 0.90, noise3(p * 95.0)) * smoothstep(0.35, 0.8, noise3(p * 31.0));
  let city = towns * dots * land * (1.0 - ice) * (1.0 - cloud) * night;
  // the air seen edge-on: blue on the day limb, a warm line at the terminator
  let fres = pow(1.0 - max(dot(n, v), 0.0), 3.2);
  let twilight = smoothstep(-0.25, 0.0, ndl) * (1.0 - smoothstep(0.0, 0.35, ndl));
  let haze = vec3<f32>(0.16, 0.42, 1.0) * fres * day * u_haze() + vec3<f32>(1.0, 0.35, 0.12) * fres * twilight * 0.35 * u_haze()
    + vec3<f32>(0.10, 0.28, 0.75) * day * 0.035;
  (*pbr).material.emissive = vec4<f32>(vec3<f32>(1.0, 0.62, 0.28) * city * u_city() + haze, 0.0);
}`;

// The atmosphere: a shell larger than the planet, added over it. For each pixel it works out how close the line of
// sight passes to the planet: outside the limb the air thins with height, inside it is a faint veil. Day side only.
const AIR = /* wgsl */ `
fn shade(in: VertexOutput) -> vec4<f32> {
  let n = normalize(in.world_normal);
  let v = normalize(view.world_position.xyz - in.world_position.xyz);
  let sun = normalize(u_sun().xyz);
  let ndv = clamp(dot(n, v), 0.0, 1.0);
  let d = u_shell() * sqrt(1.0 - ndv * ndv);
  let outside = exp(-max(d - 1.0, 0.0) / u_height());
  let inside = exp(-max(1.0 - d, 0.0) / (u_height() * 2.2));
  let glow = select(inside * 0.55, outside, d > 1.0);
  let ndl = dot(n, sun);
  let lit = smoothstep(-0.28, 0.45, ndl);
  let warm = smoothstep(-0.28, -0.05, ndl) * (1.0 - smoothstep(-0.05, 0.35, ndl));
  let c = mix(vec3<f32>(0.09, 0.36, 1.0), vec3<f32>(1.0, 0.42, 0.20), warm * 0.55) * glow * lit * u_gain();
  return vec4<f32>(c, clamp(glow * lit, 0.0, 1.0));
}`;

// Grain over the 3D, after tone mapping: a hash of the pixel and the frame, stronger in the mids than in the blacks.
const GRAIN = /* wgsl */ `
fn shade(in: FullscreenVertexOutput) -> vec4<f32> {
  let c = frame(in.uv);
  let q = in.position.xy + vec2<f32>(u_seed() * 37.0, u_seed() * 91.0);
  let g = fract(sin(dot(q, vec2<f32>(12.9898, 78.233))) * 43758.5453) - 0.5;
  let l = dot(c.rgb, vec3<f32>(0.299, 0.587, 0.114));
  return vec4<f32>(c.rgb + vec3<f32>(g) * u_amount() * c.a * (0.35 + 0.65 * (1.0 - abs(2.0 * l - 1.0))), c.a);
}`;

// ---------- parts ----------
/** The soft light field behind everything: three large blurred pools drifting on the graphite. */
function LightField() {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const t = f / 30;
  const pool = (x: number, y: number, r: number, colour: string, o: number) => (
    <div style={{
      position: "absolute", left: x * W - r * W, top: y * H - r * W, width: 2 * r * W, height: 2 * r * W,
      background: `radial-gradient(circle at 50% 50%, ${colour} 0%, transparent 68%)`, opacity: o,
    }} />
  );
  const up = interpolate(f, [0, 30], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, #101218 0%, ${STAGE} 55%, #07080b 100%)`, overflow: "hidden" }}>
      {pool(0.02 + 0.03 * Math.sin(t * 0.5), 0.18 + 0.03 * Math.cos(t * 0.4), 0.42, "rgba(255,196,128,0.22)", up)}
      {pool(0.74 + 0.02 * Math.cos(t * 0.45), 0.52 + 0.02 * Math.sin(t * 0.6), 0.46, "rgba(40,110,255,0.24)", up)}
      {pool(0.36 + 0.04 * Math.sin(t * 0.35 + 1), 1.02, 0.36, "rgba(90,120,170,0.16)", up)}
    </AbsoluteFill>
  );
}

/** The 3D: the Earth, its air, a sun from the left, far specks for the lens to blur. */
function Earth() {
  const f = useCurrentFrame();
  const t = f / 30;
  // the camera whips in over the first 20 frames, then keeps drifting: it never stops
  const arrive = interpolate(f, [0, 22], [0, 1], { ...clamp, easing: OUT });
  const orbit = interpolate(arrive, [0, 1], [-0.95, -0.06]) + 0.012 * t;
  const dist = interpolate(arrive, [0, 1], [9.5, 6.6]) - 0.035 * t;
  const cx = Math.sin(orbit) * dist;
  const cz = Math.cos(orbit) * dist;
  const look: [number, number, number] = [-1.64, 0.02, 0];
  const cam = Transform.fromXyz(cx + look[0] * 0.2, 0.35 + 0.02 * t, cz).lookingAt(look);
  const focus = Math.hypot(cx + look[0] * 0.2, 0.35, cz) - 0.45;
  return (
    <Canvas3D layered>
      <Camera3d transform={cam} projection={{ Perspective: { fov: (30 * Math.PI) / 180 } }}>
        <DepthOfField focal_distance={focus} aperture_f_stops={1.6} max_circle_of_confusion_diameter={18} mode="gaussian" />
      </Camera3d>
      <ToneMapping mode="agx" exposure={0.2} />
      <Bloom intensity={0.55} threshold={0.75} />
      <MotionBlur shutterAngle={0.6} samples={4} />
      <Grade vignette={{ intensity: 0.32, radius: 0.8, smoothness: 4 }} aberration={0.0016} />
      <FramePass wgsl={GRAIN} uniforms={{ seed: f % 61, amount: 0.018 }} />

      <AmbientLight brightness={6} color="#6f8fd0" />
      <DirectionalLight color="#fff0dc" illuminance={16000} transform={Transform.fromXyz(SUN[0] * 20, SUN[1] * 20, SUN[2] * 20).lookingAt([0, 0, 0])} />

      <Mesh3d name="earth">
        <Sphere radius={1} ico={24} />
        <ExtendedMaterial
          base={<StandardMaterial base_color="#204070" perceptual_roughness={0.6} reflectance={0.4} opaque_render_method="Forward" />}
          extension={<ShaderExtension wgsl={EARTH} uniforms={{ centre: [0, 0, 0], sun: SUN, spin: 1.2 + t * 0.05, cloud: t * 0.012, haze: 1.1, city: 3.2 }} />}
        />
      </Mesh3d>
      <ShaderMesh name="air" shape="sphere(1.16)" wgsl={AIR} uniforms={{ sun: SUN, gain: 2.1, shell: 1.16, height: 0.034 }} alpha="add" />

      {/* specks far behind and a few near the lens: out of focus, they are the depth of field's proof */}
      {Array.from({ length: 38 }, (_, i) => {
        const near = i < 5;
        const x = near ? -2.6 + rnd(i, 1) * 2.4 : -9 + rnd(i, 1) * 18;
        const y = near ? -0.9 + rnd(i, 2) * 1.8 : -4.5 + rnd(i, 2) * 9;
        const z = near ? 3.4 + rnd(i, 3) * 1.2 : -5 - rnd(i, 3) * 14;
        const r = near ? 0.004 + rnd(i, 4) * 0.004 : 0.010 + rnd(i, 4) * 0.018;
        const warm = rnd(i, 5) > 0.6;
        return (
          <Mesh3d key={i} name={`speck${i}`} transform={Transform.fromXyz(x, y, z)} shadow={false}>
            <Sphere radius={r} ico={3} />
            <StandardMaterial base_color="#000000" unlit={false} emissive={LinearRgba.from(Srgba.hex(warm ? "#ffd9a8" : "#bcd6ff")).mul(near ? 1.6 : 2.5 + rnd(i, 6) * 4)} />
          </Mesh3d>
        );
      })}
    </Canvas3D>
  );
}

/** The title: two lines of heavy type, each character arriving out of a blur; "biru?" in sky blue. */
function Title({ at }: { at: number }) {
  const f = useCurrentFrame();
  const { width: W } = useVideoConfig();
  const u = W / 1920;
  let k = 0;
  return (
    <div style={{ position: "absolute", left: 128 * u, top: 250 * u, width: 1100 * u, fontFamily: FACE, fontWeight: 900, fontSize: 138 * u, lineHeight: 1.02, letterSpacing: "-0.035em" }}>
      {TITLE.map((line, li) => (
        <div key={li} style={{ display: "flex", flexDirection: "row", whiteSpace: "nowrap", gap: 0.24 * 138 * u }}>
          {line.map((w, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "row" }}>
              {[...w.text].map((ch, ci) => {
                const s = at + k++ * 1.6 + li * 4;
                const p = interpolate(f, [s, s + 14], [0, 1], { ...clamp, easing: OUT });
                const fill = w.blue
                  ? `linear-gradient(180deg, #9fd0ff 0%, ${SKY} 46%, #1f6fe0 100%)`
                  : "linear-gradient(180deg, #ffffff 0%, #f6f8fb 34%, #b4bbc8 60%, #e3e7ee 74%, #8791a2 100%)";
                return (
                  <span key={ci} style={{
                    display: "inline-block", background: fill, backgroundClip: "text", color: "transparent",
                    opacity: p, transform: `translateY(${(1 - p) * 46 * u}px) scale(${1.12 - 0.12 * p})`,
                    filter: `blur(${(1 - p) * 18 * u}px)`,
                  }}>{ch}</span>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** The caption: a glass panel under the title, a bright top edge and a long soft shadow. */
function Caption({ at }: { at: number }) {
  const f = useCurrentFrame();
  const { width: W } = useVideoConfig();
  const u = W / 1920;
  const p = interpolate(f, [at, at + 16], [0, 1], { ...clamp, easing: OUT });
  return (
    <div style={{
      position: "absolute", left: 128 * u, top: 610 * u, boxSizing: "border-box", padding: `${30 * u}px ${40 * u}px ${32 * u}px`,
      borderRadius: 28 * u, opacity: p, transform: `translateY(${(1 - p) * 34 * u}px)`,
      background: "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 100%)",
      backdropFilter: `blur(${22 * u}px)`,
      border: `${Math.max(1, u)}px solid rgba(255,255,255,0.14)`,
      boxShadow: `inset 0 ${1.5 * u}px 0 rgba(255,255,255,0.55), 0 ${60 * u}px ${110 * u}px rgba(0,0,0,0.55), 0 ${14 * u}px ${30 * u}px rgba(0,0,0,0.35)`,
      fontFamily: FACE, fontWeight: 500, fontSize: 46 * u, lineHeight: 1.3, letterSpacing: "-0.01em", color: "#e9edf5",
    }}>
      <div style={{ whiteSpace: "nowrap" }}>{CAPTION[0]}</div>
      <div style={{ whiteSpace: "nowrap", color: "#ffffff", fontWeight: 700 }}>{CAPTION[1]}</div>
    </div>
  );
}

/** Fine grain over the whole frame (the page's own; the 3D has its own pass). */
function PageGrain() {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0, opacity: 0.07, mixBlendMode: "overlay" }}>
      <defs>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f + 1} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect width={W} height={H} filter="url(#grain)" />
    </svg>
  );
}

// ---------- the shot ----------
export default function Sky({ three = true }: { three?: boolean }) {
  return (
    <AbsoluteFill style={{ background: STAGE }}>
      <LightField />
      {three ? <Earth /> : null}
      <Title at={18} />
      <Caption at={84} />
      <PageGrain />
    </AbsoluteFill>
  );
}

// "sky" is the piece. The others are the same shot for testing: half size, and the page alone (no 3D) to time it.
registerRoot(() => (
  <>
    <Composition id="sky" component={Sky} width={1920} height={1080} fps={30} durationInFrames={180} />
    <Composition id="sky-540" component={Sky} width={960} height={540} fps={30} durationInFrames={180} />
    <Composition id="sky-2d" component={Sky} width={1920} height={1080} fps={30} durationInFrames={180} defaultProps={{ three: false }} />
    <Composition id="sky-2d-540" component={Sky} width={960} height={540} fps={30} durationInFrames={180} defaultProps={{ three: false }} />
  </>
));
