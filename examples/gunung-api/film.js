// "Kenapa gunung api bisa meledak?" in the Low Poly template. Every time below is a shot's start or end from
// storyboard.json, or a beat of the bed (72 BPM, 0.833 s). Captions only; the picture carries the explanation.
//
// One WebGL canvas (kit/engine/stage3d.js) draws every set, one or two at a time:
//   MERAPI    the real terrain (terrain.json, SRTM) at true scale, 1 unit = 100 m; sliced along its west-east line
//             for the cut-away: layers parallel to the cone over basement rock, dikes, the conduit, the reservoir,
//             the crater and the lava dome
//   KILAUEA   the real terrain of Kīlauea's south flank and summit caldera, Mauna Loa behind, the sea, pāhoehoe
//             fields and lava from Mauna Ulu to the coast, steam where it enters the sea
//   MELT      the inside of the magma: molten facets, dissolved gas molecules, glassy bubbles
//   BOTTLE    a 1.5 L soda bottle in a pale studio (1 unit = 1 cm), closed, then opened: it fizzes
//   LAB       slices of the conduit as faceted columns (bubbles growing; runny Kīlauea against thick Merapi)
//   CHART     faceted bars at real heights (1 unit = 1 km)
//   CARD1-3   three tiny scenes for the recap, drawn into the cards' own canvases
// Numbers on screen and in the picture: storyboard.json facts f1 to f12.
import { createFilm } from "../../kit/engine/motion.js";
import { createStage3D } from "../../kit/engine/stage3d.js";
import * as L from "./lowpoly.js";

const { PAL, col, flat, unlit, triMesh, hash, rng, clamp, smooth, lerp, assembler } = L;
const storyboard = await (await fetch("storyboard.json")).json();
const TERRAIN = await (await fetch("terrain.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, shots: s } = film;
const D = film.duration;
const BEAT = 60 / 72;
film.captions();
film.scene("#ui", 0, D);
// The loop: the first caption is already up on frame 0, and the last one stays to the last frame, so the words
// change on the seam the way they change between any two groups.
{
  const first = $('.caption[data-shot="s01"]');
  for (const tw of tl.getTweensOf(first)) if (tw.startTime() < 0.5 && tw.vars.autoAlpha === 1) tw.kill();
  gsap.set(first, { autoAlpha: 1, scale: 1, y: 0 });
  const last = [...document.querySelectorAll('.caption[data-shot="s18"]')].at(-1);
  tl.set(last, { autoAlpha: 1 }, s.s18.end - 0.0995);
}

const space = createStage3D($("#space"), { rig: false, shadows: false, environment: 0, exposure: 1 });
const { THREE, scene, renderer, camera } = space;
renderer.toneMapping = THREE.NoToneMapping;
renderer.autoClear = false;
scene.environment = null;
for (const l of [space.key, space.rim, space.fill]) l.intensity = 0;
camera.near = 0.3;
camera.far = 6000;
scene.add(camera);
const deg = THREE.MathUtils.degToRad;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const G = () => new THREE.Group();
const at = (o, x, y, z) => (o.position.set(x, y, z), o);
const ease = (name) => gsap.parseEase(name);

// What the film does, logged as it is built (render.mjs --events), so cues.build.py puts sounds on it.
const log = (window.__events = []);
const note = (kind, t, end = t) => log.push({ kind, at: +t.toFixed(3), end: +end.toFixed(3) });

// ── Light, fog, sky: one palette per scene ─────────────────────────────────────────────────────────────────────────
const sun = new THREE.DirectionalLight("#ffe0b0", 2.1);
const hemi = new THREE.HemisphereLight("#ffd9b0", "#4a5468", 1.0);
scene.add(sun, sun.target, hemi);
scene.fog = new THREE.Fog("#cbf3f0", 200, 900);
const sky = L.createSky(scene);
// The sun sits where the opening orbit keeps it whole in frame (4.5° to 14.5° right of the view).
const DAWN = { top: "#ff9f1c", mid: "#ffbf69", low: "#f7ecd2", below: "#f7ecd2", midAt: 0.15, lowAt: 0.0, fog: "#f4e6c9", near: 120, far: 470, sun: 1, sunAz: 17.5, sunEl: 8.2, sunSize: 2.6,
  // a near-white sun and a cool sky light, so the teal stays teal and the cone slate under the orange sky (the template)
  light: { colour: "#fff0dc", i: 2.1, az: 64, el: 24 }, hemi: { sky: "#e4f4f0", ground: "#4a5870", i: 1.12 } };
const MIDDAY = { top: "#73cfc6", mid: "#b9ece6", low: "#eaf8f4", below: "#eaf8f4", midAt: 0.2, lowAt: 0.0, fog: "#e2f4f0", near: 380, far: 1500, sun: 1, sunAz: -10, sunEl: 21, sunSize: 2.4,
  light: { colour: "#fff6e6", i: 2.0, az: 120, el: 48 }, hemi: { sky: "#dcf6f2", ground: "#33405a", i: 1.1 } };
const PALETTES = {
  dawn: DAWN,
  // the split's long lens looks from 120 km away: the haze starts beyond the subject
  dawnFar: { ...DAWN, near: 1150, far: 2600 },
  midday: MIDDAY,
  middayFar: { ...MIDDAY, near: 1250, far: 2700 },
  ember: { top: "#5a2412", mid: "#8a3414", low: "#a8401a", below: "#7a2c12", fog: "#7c2e13", near: 40, far: 150, sun: 0,
    light: { colour: "#ffc27a", i: 1.5, az: 160, el: 50 }, hemi: { sky: "#ffbf8a", ground: "#5a1c10", i: 1.25 } },
  emberHot: { top: "#7a3010", mid: "#a8481a", low: "#c45a1c", below: "#9a3c14", fog: "#a8471a", near: 34, far: 130, sun: 0,
    light: { colour: "#ffe0a0", i: 1.7, az: 150, el: 70 }, hemi: { sky: "#ffd49a", ground: "#6a2410", i: 1.35 } },
  lab: { top: "#ff9f1c", mid: "#ffbf69", low: "#fde6c0", below: "#c9ece5", midAt: 0.3, lowAt: -0.04, fog: "#fde6c0", near: 260, far: 900, sun: 0,
    light: { colour: "#fff3e0", i: 1.6, az: 205, el: 46 }, hemi: { sky: "#f4fffd", ground: "#6f8fa0", i: 1.2 } },
  studio: { top: "#3fc5b6", mid: "#9fe2d8", low: "#dcf4ef", below: "#d2efe9", midAt: 0.3, lowAt: -0.04, fog: "#d2efe9", near: 260, far: 900, sun: 0,
    light: { colour: "#fff3e0", i: 1.6, az: 205, el: 46 }, hemi: { sky: "#f4fffd", ground: "#8796a8", i: 1.2 } },
  noon: { top: "#ffa733", mid: "#ffd08f", low: "#fdeacb", below: "#fdeacb", midAt: 0.42, lowAt: 0.0, fog: "#f8e6c6", near: 80, far: 420, sun: 1, sunAz: 40, sunEl: 20, sunSize: 3,
    light: { colour: "#fff1dc", i: 1.8, az: 150, el: 40 }, hemi: { sky: "#e6f7f3", ground: "#5b6478", i: 1.15 } },
};
// The cut-away is looked at from 20 km: the dawn haze thins while it is on screen (fogMix 0 to 1), never switches.
const fogMix = { k: 0 };
function usePalette(name) {
  const p = PALETTES[name];
  sky.set(p);
  scene.fog.color.set(p.fog);
  const thin = name === "dawn" ? 1 + 4 * fogMix.k : 1;
  scene.fog.near = p.near * thin;
  scene.fog.far = p.far * thin;
  sun.color.set(p.light.colour);
  sun.intensity = p.light.i;
  const az = deg(p.light.az), el = deg(p.light.el);
  sun.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).multiplyScalar(500);
  hemi.color.set(p.hemi.sky);
  hemi.groundColor.set(p.hemi.ground);
  hemi.intensity = p.hemi.i;
}

// ── Cameras: an orbit around a target (az from the south, + towards the east; el up; dist; fov; roll) ──────────────
const KEYS = ["az", "el", "dist", "tx", "ty", "tz", "fov", "roll"];
const camOf = (o = {}) => ({ az: 0, el: 0, dist: 100, tx: 0, ty: 0, tz: 0, fov: 30, roll: 0, ...o });
const mixCam = (a, b, k) => Object.fromEntries(KEYS.map((key) => [key, lerp(a[key], b[key], k)]));
function aim(c, aspect) {
  const az = deg(c.az), el = deg(c.el);
  camera.position.set(c.tx + c.dist * Math.cos(el) * Math.sin(az), c.ty + c.dist * Math.sin(el), c.tz + c.dist * Math.cos(el) * Math.cos(az));
  camera.up.set(Math.sin(deg(c.roll)), Math.cos(deg(c.roll)), 0);
  camera.lookAt(c.tx, c.ty, c.tz);
  camera.fov = c.fov;
  camera.aspect = aspect;
  camera.near = c.dist > 600 ? 20 : 0.3;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
const C = camOf(); // the main view
const CL = camOf(); // Merapi in the split's left half (s02, s03), then the cut-away (s04)
const cut = (cam, view, t) => tl.set(cam, { ...view }, t);
const move = (cam, view, t, d, e = "power2.inOut") => tl.to(cam, { ...view, duration: d, ease: e }, t);

// ── Molecules: a central atom and two (water bent, carbon dioxide straight, sulfur dioxide bent) ─────────────────────
// Oxygen is dark in every molecule, hydrogen pale, carbon grey, sulfur sand-yellow (f3: most are water). They turn
// only in the plane of the picture, so a straight CO₂ never shows end-on.
const ATOM = { O: ["#2b3342", 0.55], H: ["#f2fbfa", 0.34], C: ["#9aa3ad", 0.5], S: ["#ffd166", 0.68] };
const atomGeo = new THREE.IcosahedronGeometry(1, 1);
atomGeo.userData.shared = true;
const atomMat = Object.fromEntries(Object.entries(ATOM).map(([k, [c]]) => [k, new THREE.MeshLambertMaterial({ color: c, flatShading: true, emissive: k === "O" ? "#1b2230" : "#2a2a2a" })]));
function molecule(kind, k = 1) {
  const g = G();
  const [mid, side, angle] = kind === "H2O" ? ["O", "H", 104.5] : kind === "CO2" ? ["C", "O", 180] : ["S", "O", 119];
  const add = (el, x, y) => { const m = new THREE.Mesh(atomGeo, atomMat[el]); m.scale.setScalar(ATOM[el][1] * k); g.add(at(m, x, y, 0)); };
  add(mid, 0, 0);
  const bond = (ATOM[mid][1] + ATOM[side][1]) * 0.82 * k;
  for (const sg of [-1, 1]) { const a = deg(90 + (sg * angle) / 2); add(side, Math.cos(a) * bond, Math.sin(a) * bond); }
  g.userData.kind = kind;
  return g;
}
// Gas bubbles: faceted glass, clear in the middle, bright at the edge, a glint on top.
const bubbleGeo = new THREE.IcosahedronGeometry(1, 1);
bubbleGeo.userData.shared = true;
const GLASS = L.glassMat({ tint: "#e6fffb" });
const GLASS_K = L.glassMat({ tint: "#ffe6d6" });
const bubble = (mat = GLASS) => new THREE.Mesh(bubbleGeo, mat);

// ── Tags and notes ─────────────────────────────────────────────────────────────────────────────────────────────────
const tags = L.createTags($("#tags"), $("#tag-lines"));
const tag = (text, o) => tags.tag(text, o);
const showTag = (tg, t, d = 0.55) => { tl.to(tg, { show: 1, duration: d, ease: "power2.out" }, t); note("tag", t + d * 0.45); };
const hideTag = (tg, t, d = 0.25) => tl.to(tg, { show: 0, duration: d, ease: "power1.in" }, t);
const noteOn = (sel, t, d = 0.3) => tl.fromTo(sel, { autoAlpha: 0 }, { autoAlpha: 1, duration: d, immediateRender: false }, t);
const noteOff = (sel, t, d = 0.25) => tl.to(sel, { autoAlpha: 0, duration: d }, t);
gsap.set([".note", "#question", "#dim", "#split-line", ".card"], { autoAlpha: 0 });

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// MERAPI
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// The summit crater since 2010, open to the south-east (f11): the terrain tiles are from 2000, before it, so the
// crater is carved in: a floor about 240 m under its rim, 480 m across at the rim (the ring of vertices at 2.4 km... 240 m
// from the summit), the south-east rim cut down to a breach. Every other vertex is the tiles' elevation; the
// storyboard's 33 profile samples are vertices on the west-east line.
const FLOOR = 26.3, RIM = 28.75;
{
  const v = TERRAIN.merapi.v;
  for (let i = 0; i < v.length; i += 3) {
    const x = v[i], z = v[i + 2], r = Math.hypot(x, z);
    const breach = Math.abs(Math.atan2(z, x) - Math.PI / 4) < 0.5;
    if (r < 1.9) v[i + 1] = FLOOR + 0.25 * (r / 1.9) ** 2;
    else if (r < 3.0) v[i + 1] = breach ? FLOOR + 0.55 : Math.max(v[i + 1], RIM);
    else if (r < 4.3 && breach) v[i + 1] -= 0.5;
  }
}
const M = L.terrain(TERRAIN.merapi);
const MERAPI = G();
scene.add(MERAPI);
const CRATER = V3(0.3, FLOOR + 0.1, 0.3);
// The template's palette over the real ground: a slate cone (the concept's dark volcano), slate-teal below it,
// teal forest and teal fields with sand (rice in the dry season) on the plain, each facet a little different.
function merapiColour(c, n, k) {
  const y = c.y, r = hash(k, 3), steep = 1 - n.y;
  let hex;
  if (y > 26) hex = r < 0.5 ? "#3c4450" : "#47505c";
  else if (y > 20) hex = r < 0.33 ? "#525a66" : r < 0.66 ? "#5d6470" : "#4b535f";
  else if (y > 16.5) hex = r < 0.5 ? "#4b6466" : "#566e6e";
  else if (y > 11) hex = r < 0.4 ? "#1f7a6e" : r < 0.75 ? "#268577" : "#2f8f80";
  else hex = r < 0.3 ? "#3aa892" : r < 0.55 ? "#48b59e" : r < 0.72 ? "#2f9c86" : r < 0.86 ? "#5cbfa8" : "#e6c27c";
  const c0 = col(hex);
  if (steep > 0.35 && y < 16) c0.lerp(col("#2c5f5c"), 0.3);
  return c0.offsetHSL(0, 0, (hash(k, 9) - 0.5) * 0.05);
}
const MS = M.split();
function halfMesh(list) {
  const tris = [], colours = [];
  const n = V3(0, 0, 0), cen = V3(0, 0, 0);
  for (let [t, k] of list) {
    cen.copy(t[0]).add(t[1]).add(t[2]).multiplyScalar(1 / 3);
    n.copy(t[1]).sub(t[0]).cross(t[2].clone().sub(t[0])).normalize();
    if (n.y < 0) { t = [t[0], t[2], t[1]]; n.negate(); }
    tris.push(t);
    colours.push(merapiColour(cen, n, k));
  }
  return triMesh(tris, colours, flat());
}
const merapiN = halfMesh(MS.north);
// The near half: it sinks into the ground for the cut-away and rises back when the mountain closes (tween half.s).
const southHalf = G();
southHalf.add(halfMesh(MS.south));
MERAPI.add(merapiN, southHalf);
// The lowland beyond the tiles (the Yogyakarta plain), for the long lens of the split.
{
  const tris = [], colours = [];
  const r = rng(13);
  const nx = 24, nz = 16, x0 = -1400, x1 = 1400, z0 = 236, z1 = 2600;
  const P = (i, j) => {
    const x = lerp(x0, x1, i / nx) + (i % nx ? (r() - 0.5) * 60 : 0), z = j === 0 ? 228 : lerp(z0, z1, (j / nz) ** 1.3) + (j % nz ? (r() - 0.5) * 40 : 0);
    const edge = j === 0 && Math.abs(x) < 338 ? M.heightAt(x, 228) - 0.15 : 0.15 + r() * 0.6;
    return V3(x, j === 1 ? Math.min(edge, 1.2) : edge, z);
  };
  const grid = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) grid.push(P(i, j));
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = grid[j * (nx + 1) + i], b = grid[j * (nx + 1) + i + 1], c = grid[(j + 1) * (nx + 1) + i + 1], d = grid[(j + 1) * (nx + 1) + i];
    tris.push([a, d, c], [a, c, b]);
    colours.push(col(["#3aa892", "#48b59e", "#e6c27c", "#2f9c86"][Math.floor(hash(i * 31 + j, 4) * 4)]), col(["#48b59e", "#3aa892", "#5cbfa8"][Math.floor(hash(i * 17 + j, 5) * 3)]));
  }
  MERAPI.add(triMesh(tris, colours, flat()));
}
// A low faceted hill on the plain south of Merapi, which the last shot flies over (s18).
const HILL = V3(-33, 0, 171);
{
  const base = M.heightAt(HILL.x, HILL.z);
  const prof = [[0, 3.6], [1.6, 3.4], [3.4, 2.6], [5.2, 1.3], [7.4, 0.3], [8.6, -0.6]].map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(prof, 13);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = hash(Math.round(p.getX(i) * 7 + p.getZ(i) * 13), 5); p.setY(i, p.getY(i) + (k - 0.5) * 0.8); }
  // its crown is what fills the frame as the last shot skims over it (s18): lit teal facets, not one dark slab
  const hill = new THREE.Mesh(L.facets(geo, (i, c) => col(c.y > 2.2 ? ["#3aa892", "#2f9c86", "#48b59e", "#5cbfa8"][i % 4] : i % 3 ? "#3aa892" : "#48b59e").offsetHSL(0, 0, (hash(i, 77) - 0.5) * 0.12)), flat({ side: THREE.DoubleSide, emissive: "#1d4a40" }));
  hill.scale.set(1.3, 1, 1);
  MERAPI.add(at(hill, HILL.x, base, HILL.z));
}

// The ash column (s01, s02, s15, s18): out of the crater to 17 km (f10), spreading into an umbrella from 13.5 km.
const ash = L.createColumn({ count: 300, height: 170, base: CRATER.clone(), colours: ["#c2bcb3", "#b0aaa2", "#d2cbc0", "#a19c96", "#b9b1a7"], emissive: "#4f4b48", seed: 21, size: 1.5, grow: 0.07, spread: 0.2, drift: 0.04, power: 1.7, umbrellaAt: 135, umbrella: 1.9, share: 0.3 });
MERAPI.add(ash.group);
// A pyroclastic flow (wedus gembel) down the south-east flank, as on 4-5 November 2010 down the Gendol valley:
// ash puffs that hug the ground and grow as they run downhill.
const pyroPath = L.downhill(M.heightAt, 2.4, 2.6, { bias: [0.18, 0.6], stop: -99, max: 120, step: 1.0, seed: 5, inertia: 0.75 });
const pyroLen = pyroPath.length - 1;
const pyro = { on: 1, front: 1 };
const pyroPuffs = [];
{
  const r = rng(19);
  const mats = ["#c4bcb1", "#b0a89e", "#d2cabe", "#a39b91"].map((c) => new THREE.MeshLambertMaterial({ color: c, emissive: "#5a554f", flatShading: true }));
  for (let i = 0; i < 110; i++) {
    const m = new THREE.Mesh(bubbleGeo, mats[i % 4]);
    m.userData = { ph: i / 110 + (r() - 0.5) / 110, side: (r() - 0.5) * 2, k: 0.8 + r() * 0.5, rz: r() * 6, up: r() };
    pyroPuffs.push(m);
    MERAPI.add(m);
  }
}
const PYRO_PERIOD = D / 6;
function updatePyro(t) {
  for (const m of pyroPuffs) {
    const u = (((t / PYRO_PERIOD + m.userData.ph) % 1) + 1) % 1;
    const d = (1 - Math.pow(1 - u, 1.5)) * pyroLen;
    const i = Math.min(pyroLen - 1, Math.floor(d)), f = d - i;
    const p = pyroPath[i].clone().lerp(pyroPath[i + 1], f);
    const sz = (1.1 + 2.6 * u) * m.userData.k * smooth(0, 0.04, u) * (1 - smooth(0.8, 1, u));
    const shown = pyro.on > 0.5 && d <= pyro.front * pyroLen;
    m.visible = shown && sz > 0.02;
    if (!m.visible) continue;
    const a = pyroPath[Math.min(pyroLen, i + 1)].clone().sub(pyroPath[i]).normalize();
    m.position.set(p.x - a.z * m.userData.side * sz * 0.9, M.heightAt(p.x, p.z) + sz * (0.45 + m.userData.up * 0.8), p.z + a.x * m.userData.side * sz * 0.9);
    m.scale.set(sz * 1.2, sz * 0.85, sz * 1.15);
    m.rotation.set(0, m.userData.rz + t * 0.3, 0);
  }
}

// ── The cut-away (schematic, f12): the north half's cut face, as in the USGS drawing of a composite volcano ────────
// Layers of lava and ash parallel to the cone, thinning out at its foot; solid basement rock under the old ground;
// the reservoir deep in the basement; the conduit up to the crater floor; dikes fanning out from it.
const BOT = -80;
const RES = { x: 0, y: -13.6, rx: 16, ry: 4.2 };
const CUTSET = G(); // what is only seen while the near half is down
MERAPI.add(CUTSET);
const topAt = (x) => {
  const line = MS.line;
  for (let i = 0; i < line.length - 1; i++) if (x >= line[i][0] && x <= line[i + 1][0]) {
    const k = (x - line[i][0]) / (line[i + 1][0] - line[i][0] || 1);
    return lerp(line[i][1], line[i + 1][1], k);
  }
  return line[0][1];
};
let cutFace; // the face of the cut (tinted into shadow while the near half rises back, s15)
// the ground the volcano was built on: the cone's layers thin out towards its foot and end about 4.5 km from the summit
const groundAt = (x) => Math.min(topAt(x) - 0.04, 6.0 + 0.0032 * x * x);
{
  const cols = [];
  for (const [x, y] of MS.line) {
    const need = Math.abs(x) < 40 ? 1.9 : Math.abs(x) < 100 ? 6 : 16;
    if (!cols.length || x - cols.at(-1)[0] >= need) cols.push([x, y]);
  }
  const last = MS.line.at(-1);
  if (cols.at(-1)[0] < last[0]) cols.push(last);
  const NK = 8, NB = 3;
  const rows = cols.map(([x, top], i) => {
    const r = [];
    const yb = groundAt(x);
    for (let k = 0; k <= NK; k++) {
      let y = top - (top - yb) * Math.pow(k / NK, 0.92);
      if (k > 0 && k < NK) y += (hash(i * 31 + k, 4) - 0.5) * ((top - yb) / NK) * 0.4;
      r.push(V3(x, y, 0.02));
    }
    for (let j = 1; j <= NB; j++) {
      let y = yb + (BOT - yb) * (j / NB) ** 1.1;
      if (j < NB) y += (hash(i * 13 + j, 6) - 0.5) * 2.2;
      r.push(V3(x, y, 0.02));
    }
    return r;
  });
  const CONE = ["#e2b77e", "#626c7c", "#d4a56c", "#6f7888", "#e8c290", "#58616f", "#dcae74", "#69727f"];
  const BASE = ["#3d4554", "#363e4c", "#424a59"];
  const tris = [], colours = [];
  for (let i = 0; i < rows.length - 1; i++)
    for (let j = 0; j < NK + NB; j++) {
      const a = rows[i][j], b = rows[i + 1][j], c = rows[i + 1][j + 1], d = rows[i][j + 1];
      const band = (k) => (j < NK ? col(CONE[j % CONE.length]) : col(BASE[(j - NK + Math.floor(i / 3)) % 3])).offsetHSL(0, 0, (hash(i * 97 + j * 7 + k, 6) - 0.5) * (j < NK ? 0.05 : 0.035));
      if ((i + j) % 2) tris.push([a, d, c], [a, c, b]); else tris.push([a, d, b], [d, c, b]);
      colours.push(band(0), band(1));
    }
  cutFace = triMesh(tris, colours, unlit({ side: THREE.DoubleSide }));
  CUTSET.add(cutFace);
}
// The conduit: a dark channel from the reservoir up to the crater floor (magma rises through it in s08).
const CONDUIT = { y0: RES.y + RES.ry * 0.5, y1: FLOOR + 0.05, w0: 2.2, w1: 1.9 };
const conduitW = (y) => lerp(CONDUIT.w0, CONDUIT.w1, (y - CONDUIT.y0) / (CONDUIT.y1 - CONDUIT.y0));
function strip(y0, y1, z, shades, n, seed, mat) {
  const tris = [], colours = [];
  const pt = (i, side) => {
    const y = lerp(y0, y1, i / n);
    const j = i > 0 && i < n ? (hash(i * 3 + (side > 0 ? 1 : 0), seed) - 0.5) * 0.35 : 0;
    return V3((side * conduitW(y)) / 2 + j, y, z);
  };
  for (let i = 0; i < n; i++) {
    const a = pt(i, -1), b = pt(i, 1), c = pt(i + 1, 1), d = pt(i + 1, -1);
    tris.push([a, b, c], [a, c, d]);
    colours.push(col(shades[i % shades.length]), col(shades[(i + 2) % shades.length]));
  }
  return triMesh(tris, colours, mat);
}
CUTSET.add(strip(CONDUIT.y0, CONDUIT.y1, 0.06, ["#5a2216", "#6b2a18", "#4e1d14", "#74301b", "#622617"], 16, 8, unlit({ side: THREE.DoubleSide })));
// Merapi's thick magma filling the upper conduit under the dome (s13 to s15)
const kentalFill = strip(10, CONDUIT.y1, 0.07, ["#c2410c", "#b23a0e", "#cf4f17", "#a8340d"], 9, 12, unlit({ side: THREE.DoubleSide }));
kentalFill.visible = false;
CUTSET.add(kentalFill);
// Dikes: sheets of magma that set solid in cracks fanning out from the conduit (USGS composite-volcano drawing).
[[-1, 6, 38, 10], [1, 11, 30, 8], [-1, 17, 52, 7], [1, 21, 44, 6], [-1, 2, 22, 9]].forEach(([side, y, ang, len], i) => {
  const a = deg(ang), w = 0.42;
  const p0 = V3(side * conduitW(y) / 2, y, 0.05), p1 = p0.clone().add(V3(side * Math.cos(a) * len, Math.sin(a) * len, 0));
  const nrm = V3(-Math.sin(a) * side, Math.cos(a), 0).multiplyScalar(w / 2);
  const q = [p0.clone().add(nrm), p0.clone().sub(nrm), p1.clone().sub(nrm.clone().multiplyScalar(0.3)), p1.clone().add(nrm.clone().multiplyScalar(0.3))];
  CUTSET.add(triMesh([[q[0], q[1], q[2]], [q[0], q[2], q[3]]], [col("#8a3b22"), col("#7a3420")], unlit({ side: THREE.DoubleSide })));
});
// The reservoir: a faceted lens of magma deep in the basement, glowing.
const reservoir = G();
at(reservoir, RES.x, RES.y, 0.1);
{
  const r = rng(31);
  const outer = [], inner = [];
  const N = 14;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2;
    const j = 0.86 + r() * 0.22;
    outer.push(V3(Math.cos(a) * RES.rx * j, Math.sin(a) * RES.ry * j * (Math.sin(a) > 0 ? 0.9 : 1.1), 0));
    inner.push(V3(Math.cos(a + 0.2) * RES.rx * 0.52 * (0.9 + r() * 0.2), Math.sin(a + 0.2) * RES.ry * 0.5, 0.01));
  }
  const tris = [], colours = [];
  const hot = ["#ffc24a", "#ffb534", "#ffcf63"], warm = ["#ff9f1c", "#f78a19", "#ffab30", "#ee7b16"];
  for (let k = 0; k < N; k++) {
    const k1 = (k + 1) % N;
    tris.push([outer[k], outer[k1], inner[k1]], [outer[k], inner[k1], inner[k]], [V3(0, 0, 0.02), inner[k], inner[k1]]);
    colours.push(col(warm[k % 4]), col(warm[(k + 2) % 4]), col(hot[k % 3]));
  }
  const body = triMesh(tris, colours, unlit({ side: THREE.DoubleSide }));
  const halo = triMesh(tris.map((t) => t.map((v) => v.clone().multiplyScalar(1.22).setZ(-0.02))), colours.map(() => col("#ff9f1c")), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
  reservoir.add(halo, body);
}
CUTSET.add(reservoir);
const resBuild = assembler(reservoir, (c) => Math.hypot(c.x - RES.x, (c.y - RES.y) * 3), { spread: 0.5 });
// Dissolved gas in the reservoir (s07): molecules, mostly water.
const resMols = G();
["H2O", "H2O", "CO2", "H2O", "H2O", "SO2", "H2O"].forEach((k, i) => {
  const m = molecule(k, 1.3);
  at(m, -11.5 + i * 3.8, RES.y + (i % 2 ? 1.2 : -1.0), 1.2);
  resMols.add(m);
});
CUTSET.add(resMols);
// Arrows: the weight of the rock above pressing on the reservoir (s07).
function arrowMesh(len, colour = PAL.coral, w = 1.1) {
  const g = G();
  const mat = new THREE.MeshLambertMaterial({ color: colour, flatShading: true, emissive: col(colour).multiplyScalar(0.55) });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.32, w * 0.32, len, 6), mat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(w, w * 1.6, 6), mat);
  g.add(at(shaft, 0, len / 2 + w * 1.6, 0), at(head, 0, w * 0.8, 0));
  head.rotation.x = Math.PI;
  return g;
}
const arrows = [-19, -7, 6, 17].map((x) => { const a = arrowMesh(7, PAL.coral, 1.6); at(a, x, RES.y + RES.ry + 1, 1.4); a.visible = false; CUTSET.add(a); return a; });
// The rising blob (s08): hot, bright magma in the dark conduit, with its gas still dissolved in it.
const blob = G();
{
  const core = new THREE.Mesh(L.facets(new THREE.IcosahedronGeometry(1.45, 1), (i) => col(["#ffe28a", "#ffd35a", "#fff0b8", "#ffc94a"][i % 4])), unlit());
  core.scale.set(1, 1.3, 1);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(2.9, 10), new THREE.MeshBasicMaterial({ color: "#ffb347", transparent: true, opacity: 0.4, depthWrite: false }));
  glow.scale.set(1, 1.35, 1);
  glow.position.z = -0.4;
  blob.add(glow, core);
  [[-0.5, 0.5, "H2O"], [0.45, -0.3, "H2O"], [0.0, -0.9, "CO2"]].forEach(([x, y, k]) => blob.add(at(molecule(k, 0.42), x, y, 1.5)));
}
blob.visible = false;
CUTSET.add(blob);
// Merapi's lava dome in the crater (s13 to s15), cut in half like the mountain: its section shows on the cut face.
const DOME = G();
at(DOME, 0, FLOOR - 0.05, 0);
CUTSET.add(DOME);
// a mound of blocky lava, widest at its foot on the crater floor, its top under the rim (not a cap on the conduit)
const DPROF = [[0.01, 1.9], [0.5, 1.84], [1.05, 1.58], [1.5, 1.12], [1.8, 0.55], [1.92, 0.0]];
const domeGeo = new THREE.LatheGeometry(DPROF.map(([r, y]) => new THREE.Vector2(r, y)), 10, Math.PI / 2, Math.PI);
{
  // lumps: every vertex off the cut plane and off the foot moves in or out a little, so the facets read as blocks
  const p = domeGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (Math.abs(z) < 1e-4 || y < 0.01) continue;
    const k = hash(Math.round(x * 37 + y * 53 + z * 71), 19), kk = 1 + (k - 0.5) * 0.24;
    p.setXYZ(i, x * kk, y + (hash(Math.round(x * 41 + z * 29), 23) - 0.5) * 0.22, z * kk);
  }
}
const domeShell = new THREE.Mesh(L.facets(domeGeo, (i) => col(["#6b635c", "#7d746b", "#5a544f", "#8a8077", "#4f4a46"][Math.floor(hash(i, 17) * 5)])), flat({ side: THREE.DoubleSide }));
const domeCut = (() => {
  // its section: blocks of lava in rough courses (a jittered grid inside the profile), each block its own grey
  const R = 4, Cn = 5, H = DPROF[0][1];
  const rAt = (y) => { // the profile's radius at height y
    for (let i = 0; i < DPROF.length - 1; i++) { const [r0, y0] = DPROF[i], [r1, y1] = DPROF[i + 1]; if (y <= y0 && y >= y1) return lerp(r0, r1, (y0 - y) / (y0 - y1 || 1)); }
    return DPROF.at(-1)[0];
  };
  const rows = [];
  for (let j = 0; j <= R; j++) {
    const y = j === R ? H : H * (j / R) * (j ? 1 + (hash(j, 31) - 0.5) * 0.12 : 1), w = j === R ? 0 : rAt(y);
    rows.push(Array.from({ length: Cn + 1 }, (_, i) => {
      const edge = i === 0 || i === Cn;
      const jx = edge || j === R ? 0 : (hash(j * 13 + i, 37) - 0.5) * (w * 2 / Cn) * 0.5;
      const jy = edge || j === 0 || j === R ? 0 : (hash(j * 17 + i, 41) - 0.5) * 0.18;
      return V3(lerp(-w, w, i / Cn) + jx, y + jy, 0.03);
    }));
  }
  const greys = ["#5f5852", "#6e665f", "#4f4a45", "#7a7168", "#57514b", "#686059"];
  const tris = [], colours = [];
  for (let j = 0; j < R; j++)
    for (let i = 0; i < Cn; i++) {
      const a = rows[j][i], b = rows[j][i + 1], c = rows[j + 1][i + 1], d = rows[j + 1][i];
      const g = col(greys[Math.floor(hash(j * 7 + i * 3, 43) * greys.length)]);
      tris.push([a, b, c], [a, c, d]);
      colours.push(g, g);
    }
  return triMesh(tris, colours, unlit({ side: THREE.DoubleSide }));
})();
DOME.add(domeShell, domeCut);
// Cracks across the dome's section (s14): thin glowing lines drawn on it.
const cracks = [];
{
  const r = rng(71);
  for (let c = 0; c < 4; c++) {
    const pts = [];
    let x = -1.3 + c * 0.85 + r() * 0.25, y = 1.55 - Math.abs(-1.3 + c * 0.85) * 0.3;
    for (let i = 0; i < 5; i++) { pts.push(V3(x, y, 0.06)); x += (r() - 0.45) * 0.45; y -= 0.3 + r() * 0.1; }
    const tris = [], colours = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], w = 0.07;
      tris.push([V3(a.x - w, a.y, a.z), V3(b.x - w, b.y, b.z), V3(b.x + w, b.y, b.z)], [V3(a.x - w, a.y, a.z), V3(b.x + w, b.y, b.z), V3(a.x + w, a.y, a.z)]);
      colours.push(col("#ffb534"), col("#ff8a14"));
    }
    const m = triMesh(tris, colours, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    m.geometry.setDrawRange(0, 0);
    m.userData.n = tris.length * 3;
    cracks.push(m);
    DOME.add(m);
  }
}
// Blocks that tumble onto the dome as it grows (s13): one lands with each knock.
const settleBlocks = [[-0.9, 0.55], [0.75, 0.5], [-0.1, 0.6]].map(([x, s], i) => {
  const m = new THREE.Mesh(L.facets(new THREE.DodecahedronGeometry(1, 0), (k) => col(["#7d746b", "#5a544f", "#8a8077", "#6b635c"][(k + i) % 4])), flat());
  m.scale.set(s, s * 0.75, s);
  m.userData = { x, s };
  m.visible = false;
  CUTSET.add(m);
  return m;
});
const domeY = (x) => { // the dome's height above its foot at x (full size), from its profile
  const r = Math.abs(x);
  for (let i = 0; i < DPROF.length - 1; i++) if (r >= DPROF[i][0] && r <= DPROF[i + 1][0]) return lerp(DPROF[i][1], DPROF[i + 1][1], (r - DPROF[i][0]) / (DPROF[i + 1][0] - DPROF[i][0]));
  return 0;
};
// Its blocks, for the burst (s15).
const domeBlocks = [];
{
  const r = rng(53);
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const shades = ["#8a7f76", "#9b8f84", "#7a7069", "#a39689"];
  for (let i = 0; i < 13; i++) {
    const a = Math.PI + r() * Math.PI, rr = 0.4 + r() * 1.5;
    const m = new THREE.Mesh(L.facets(geo.clone(), (k) => col(shades[(k + i) % 4])), flat());
    m.scale.set(0.6 + r() * 0.5, 0.45 + r() * 0.35, 0.6 + r() * 0.5);
    m.userData = { p0: V3(Math.cos(a) * rr, FLOOR + 0.4 + (2.0 - rr) * 0.6 + r() * 0.3, Math.sin(a) * rr * 0.7), v: V3((r() - 0.5) * 14, 10 + r() * 12, 2 + r() * 6), spin: V3(r() * 6, r() * 6, r() * 6) };
    m.visible = false;
    domeBlocks.push(m);
    CUTSET.add(m);
  }
}
// Gas trapped under the dome (s13), then froth (s14): the thick magma fills with bubbles packed together.
const trapped = [];
{
  const r = rng(61);
  for (let i = 0; i < 10; i++) {
    const m = bubble(GLASS);
    const y = CONDUIT.y1 - 1.3 - i * 1.3 - r() * 0.4;
    m.userData = { x: (r() - 0.5) * 1.0, y, s0: 0.4 + (i < 4 ? 0.22 : 0.08) + r() * 0.1, ph: r() * 6 };
    trapped.push(m);
    CUTSET.add(m);
  }
}
const froth = [];
{
  const r = rng(63);
  for (let i = 0; i < 42; i++) {
    const m = bubble(GLASS);
    m.userData = { x: (r() - 0.5) * 2.0, y: CONDUIT.y1 - 0.5 - r() * 7.5, s0: 0.14 + r() * 0.16, ph: r() * 6, at: r() };
    m.visible = false;
    froth.push(m);
    CUTSET.add(m);
  }
}
// The burst (s15): the froth's bubble walls shatter into fine ash, carried up out of the crater by the gas (f7).
const shards = [];
{
  const r = rng(83);
  const mats = ["#cfcbc4", "#b9b5ae", "#e0dbd2", "#a8a49e"].map((c) => new THREE.MeshLambertMaterial({ color: c, emissive: "#55524e", flatShading: true, side: THREE.DoubleSide }));
  const tri = new THREE.BufferGeometry().setFromPoints([V3(0, 0.8, 0), V3(-0.6, -0.5, 0.1), V3(0.7, -0.4, -0.1)]);
  for (let i = 0; i < 460; i++) {
    const m = new THREE.Mesh(tri, mats[i % 4]);
    m.userData = { x: (r() - 0.5) * 2, y: CONDUIT.y1 - r() * 6, a: r() * Math.PI * 2, sp: 0.4 + r() * 2.4, up: 6 + r() * 13, s: 0.06 + r() * 0.12, d: r() * 0.55, spin: V3(r() * 12, r() * 12, r() * 12) };
    m.visible = false;
    shards.push(m);
    MERAPI.add(m);
  }
}
// A shock ring of pale facets round the summit (s15)
const shock = G();
shock.material = new THREE.MeshBasicMaterial({ color: "#fff3dc", transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false });
for (let i = 0; i < 20; i++) {
  const a = (i / 20) * Math.PI * 2, w = 0.06 + hash(i, 3) * 0.04;
  const g = new THREE.BufferGeometry().setFromPoints([V3(Math.cos(a - w), Math.sin(a - w), 0), V3(Math.cos(a + w), Math.sin(a + w), 0), V3(Math.cos(a) * (0.88 - hash(i, 4) * 0.06), Math.sin(a) * (0.88 - hash(i, 4) * 0.06), 0)]);
  shock.add(new THREE.Mesh(g, shock.material));
}
shock.visible = false;
MERAPI.add(shock);
// The slicing line (s04): a bright edge sweeping down the plane of the cut.
const slice = G();
{
  const core = new THREE.Mesh(new THREE.PlaneGeometry(170, 0.32), new THREE.MeshBasicMaterial({ color: "#fffaf0", depthTest: false, transparent: true, fog: false }));
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(170, 1.8), new THREE.MeshBasicMaterial({ color: "#fff1c9", transparent: true, opacity: 0.35, depthTest: false, fog: false }));
  core.renderOrder = glow.renderOrder = 6;
  slice.add(glow, core);
  slice.visible = false;
  MERAPI.add(at(slice, 0, 45, 6));
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// KĪLAUEA: the south flank from Mauna Ulu to the sea, the summit caldera, Mauna Loa behind (midday palette)
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const KIL = G();
scene.add(KIL);
const K = L.terrain(TERRAIN.kilauea);
const MU = V3(TERRAIN.kilauea.mauna_ulu[0], 0, TERRAIN.kilauea.mauna_ulu[1]);
const MLOA = V3(TERRAIN.kilauea.mauna_loa[0], 0, TERRAIN.kilauea.mauna_loa[1]);
MU.y = K.heightAt(MU.x, MU.z);
MLOA.y = K.heightAt(MLOA.x, MLOA.z);
const HMM = V3(TERRAIN.kilauea.halemaumau[0], 0, TERRAIN.kilauea.halemaumau[1]);
HMM.y = K.heightAt(HMM.x, HMM.z);
// Lava from the vent (Mauna Ulu, 1969-74), downhill to the coast on the real ground.
const flows = [L.downhill(K.heightAt, MU.x + 0.6, MU.z + 1.0, { seed: 3, bias: [0.05, 0.12] }), L.downhill(K.heightAt, MU.x - 1.6, MU.z + 1.4, { seed: 4, bias: [-0.09, 0.12] })];
const nearFlow = (x, z) => Math.min(...flows.map((f) => Math.min(...f.filter((_, i) => i % 2 === 0).map((p) => Math.hypot(p.x - x, p.z - z)))));
{
  const tris = [], colours = [];
  const n = V3(0, 0, 0), cen = V3(0, 0, 0);
  K.tris.forEach(([a, b, c], k) => {
    let t = [a, b, c];
    n.copy(b).sub(a).cross(c.clone().sub(a)).normalize();
    if (n.y < 0) { t = [a, c, b]; n.negate(); }
    cen.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    const r = hash(k, 13);
    const dCal = Math.hypot(cen.x + 4, cen.z + 2), dH = Math.hypot(cen.x - HMM.x, cen.z - HMM.z);
    let hex;
    if (cen.y < 0.3) hex = "#3c4a55";
    else if (dH < 5) hex = r < 0.5 ? "#26292f" : "#2e3238";
    else if (dCal < 32 && cen.y > 9) hex = r < 0.5 ? "#3d4149" : r < 0.8 ? "#464a52" : "#353941";
    else if (nearFlow(cen.x, cen.z) < 13) hex = r < 0.45 ? "#1c2027" : r < 0.8 ? "#252a32" : r < 0.93 ? "#30353e" : "#4a5466";
    else if (cen.y > 15 && cen.x < -40) hex = r < 0.4 ? "#5e5c63" : r < 0.75 ? "#6c6870" : "#545760"; // Mauna Loa's bare upper slopes
    else if (cen.y > 4) hex = r < 0.3 ? "#4a5866" : r < 0.6 ? "#2f8f7f" : r < 0.85 ? "#3a9a87" : "#277a6d";
    else hex = r < 0.45 ? "#45505e" : r < 0.75 ? "#2f8f7f" : "#3f8270";
    tris.push(t);
    colours.push(col(hex).offsetHSL(0, 0, (hash(k, 19) - 0.5) * 0.05));
  });
  KIL.add(triMesh(tris, colours, flat()));
}
// Lava rivers: a hot channel down the middle of each flow, dark crust either side, the hot facets sliding downhill.
const ribbons = flows.map((pts, f) => {
  const w = 3.6 + f * 0.6;
  const tris = [], colours = [], along = [], hotFaces = [];
  let s0 = 0;
  const off = [-0.5, -0.17, 0.17, 0.5];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const d = V3(b.x - a.x, 0, b.z - a.z).normalize();
    const p = V3(-d.z, 0, d.x);
    const wa = w * (0.8 + 0.4 * hash(i, 41 + f)), wb = w * (0.8 + 0.4 * hash(i + 1, 41 + f));
    const A = off.map((o) => a.clone().addScaledVector(p, o * wa)), B = off.map((o) => b.clone().addScaledVector(p, o * wb));
    for (const v of [...A, ...B]) v.y = Math.max(K.heightAt(v.x, v.z), -0.3) + 0.22;
    for (let k = 0; k < 3; k++) {
      tris.push([A[k], B[k], B[k + 1]], [A[k], B[k + 1], A[k + 1]]);
      const hot = k === 1;
      const crust = col(hash(i * 3 + k, 50 + f) < 0.8 ? "#2b2226" : "#5a2a1c");
      colours.push(hot ? col("#ff9f1c") : crust, hot ? col("#ff9f1c") : crust);
      if (hot) hotFaces.push(tris.length - 2, tris.length - 1);
      along.push(s0, s0);
    }
    s0 += a.distanceTo(b);
  }
  const m = triMesh(tris, colours, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  KIL.add(m);
  return { m, along, hotFaces, end: pts.at(-1), mid: pts[Math.floor(pts.length * 0.55)] };
});
const lavaHot = col("#ffd35a"), lavaWarm = col("#ff8a14"), lavaDark = col("#d9531e");
function flowLava(t) {
  for (const { m, along, hotFaces } of ribbons) {
    const c = m.geometry.attributes.color;
    for (const i of hotFaces) {
      const ph = Math.sin(along[i] * 0.55 - t * 2.6) * 0.5 + 0.5;
      const k = ph > 0.6 ? lavaHot.clone().lerp(lavaWarm, (1 - ph) * 1.5) : lavaWarm.clone().lerp(lavaDark, (0.6 - ph) * 1.2);
      for (let j = 0; j < 3; j++) c.setXYZ(i * 3 + j, k.r, k.g, k.b);
    }
    c.needsUpdate = true;
  }
}
// The sea: a faceted teal surface that rises and falls a little (out to where the split's long lens stands).
const sea = (() => {
  const nx = 40, nz = 44, x0 = -700, x1 = 700, z0 = -60, z1 = 1600;
  const grid = [];
  const r = rng(7);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) grid.push([lerp(x0, x1, i / nx) + (i % nx ? (r() - 0.5) * 12 : 0), lerp(z0, z1, (j / nz) ** 1.4) + (j % nz && j ? (r() - 0.5) * 8 : 0), r() * 6]);
  const idx = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 2, d = a + nx + 1;
    if ((i + j) % 2) idx.push(a, d, c, a, c, b); else idx.push(a, d, b, b, d, c);
  }
  const pos = new Float32Array(idx.length * 3), c = new Float32Array(idx.length * 3);
  const shades = ["#2ec4b6", "#35cbbd", "#27b5a8", "#3fd0c3"];
  for (let f = 0; f < idx.length / 3; f++) { const k = col(shades[Math.floor(hash(f, 23) * 4)]); for (let j = 0; j < 3; j++) c.set([k.r, k.g, k.b], (f * 3 + j) * 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const m = new THREE.Mesh(g, flat({ transparent: true, opacity: 0.9 }));
  m.frustumCulled = false;
  KIL.add(m);
  return { update(t) { for (let q = 0; q < idx.length; q++) { const [x, z, ph] = grid[idx[q]]; pos[q * 3] = x; pos[q * 3 + 1] = 0.12 * Math.sin(t * 1.3 + ph); pos[q * 3 + 2] = z; } g.attributes.position.needsUpdate = true; } };
})();
// The fountain at the vent.
const fountain = [];
{
  const r = rng(17);
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const mats = ["#ffd35a", "#ffb534", "#ff8a14"].map((c) => new THREE.MeshBasicMaterial({ color: c }));
  for (let i = 0; i < 70; i++) {
    const m = new THREE.Mesh(geo, mats[i % 3]);
    m.userData = { ph: r(), a: r() * Math.PI * 2, sp: 0.3 + r() * 1.0, h: 2.4 + r() * 1.8, s: 0.36 + r() * 0.34 };
    fountain.push(m);
    KIL.add(m);
  }
}
const FOUNT_PERIOD = D / 40;
function updateFountain(t) {
  const pulse = 0.85 + 0.15 * Math.sin(t * 2.1);
  for (const m of fountain) {
    const u = (((t / FOUNT_PERIOD + m.userData.ph) % 1) + 1) % 1;
    const { a, sp, h, s: sz } = m.userData;
    m.position.set(MU.x + Math.cos(a) * sp * u * 1.6, MU.y + 0.2 + 4 * h * pulse * u * (1 - u), MU.z + Math.sin(a) * sp * u * 1.6);
    m.scale.setScalar(sz * (1 - 0.4 * u));
  }
}
// Steam plumes where the lava enters the sea, and the gas plume and lava lake of Halemaʻumaʻu in the caldera.
const plumes = ribbons.map(({ end }, i) => {
  const c = L.createColumn({ count: 22, height: 9, period: D / 12, base: V3(end.x, 0.3, end.z), colours: ["#ffffff", "#f3f7f6", "#e9efed"], emissive: "#9aa3a3", seed: 40 + i, size: 0.45, grow: 0.16, spread: 0.18, drift: 0.5, power: 1 });
  KIL.add(c.group);
  return c;
});
const hmmPlume = L.createColumn({ count: 34, height: 22, period: D / 8, base: HMM.clone().setY(HMM.y + 0.2), colours: ["#f4f1ea", "#e4e2dc", "#d8d6d0"], emissive: "#8f908c", seed: 52, size: 0.45, grow: 0.12, spread: 0.12, drift: 0.6, power: 1 });
KIL.add(hmmPlume.group);
{
  const lake = new THREE.Mesh(L.facets(new THREE.CircleGeometry(1.5, 7), (i) => col(i % 2 ? "#ff9f1c" : "#ffb534")), unlit());
  lake.rotation.x = -Math.PI / 2;
  KIL.add(at(lake, HMM.x, HMM.y + 0.25, HMM.z));
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// The cloud the camera flies through (s01 into s02, s15 into s16): faceted puffs that close over the lens, turn
// from ash to white while they cover it, and part past the edges of the frame before they go.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const wipe = { k: 0, white: 0, parting: 0 };
const wipeGroup = G();
const wipeMat = new THREE.MeshLambertMaterial({ color: "#b4aea6", emissive: "#5c5854", flatShading: true, transparent: true });
const wipePuffs = [];
{
  const r = rng(91);
  for (let i = 0; i < 48; i++) {
    const m = new THREE.Mesh(bubbleGeo, wipeMat);
    const gx = (i % 8) / 7 - 0.5, gy = Math.floor(i / 8) / 5 - 0.5;
    m.userData = { x: gx * 2.3 + (r() - 0.5) * 0.35, y: gy * 2.2 + (r() - 0.5) * 0.35, z: -6 - r() * 5, s: 0.3 + r() * 0.2 };
    m.rotation.set(r() * 6, r() * 6, r() * 6);
    wipePuffs.push(m);
    wipeGroup.add(m);
  }
  camera.add(wipeGroup);
}
function updateWipe() {
  wipeGroup.visible = wipe.k > 0.001;
  if (!wipeGroup.visible) return;
  wipeMat.color.set("#b4aea6").lerp(col("#ffffff"), wipe.white);
  wipeMat.emissive.set("#5c5854").lerp(col("#c3cdcb"), wipe.white);
  wipeMat.opacity = clamp(wipe.k * 3.2);
  wipeMat.transparent = wipeMat.opacity < 0.999;
  const hh = Math.tan(deg(camera.fov / 2)), hw = hh * camera.aspect;
  for (const m of wipePuffs) {
    const { x, y, z: z0, s: sz } = m.userData;
    // closing: in from far and from the edges; parting: out past the edges and past the lens
    const z = wipe.parting ? z0 * (0.3 + 0.7 * wipe.k) : z0 * (1 + (1 - wipe.k) * 0.8);
    const d = -z;
    const out = 1 + (1 - wipe.k) * (wipe.parting ? 2.6 : 0.9);
    m.position.set(x * hw * d * out, y * hh * d * 1.15 * out, z);
    m.scale.setScalar(sz * hh * d * 1.3);
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// MELT: inside the magma (s05, s09). Molten facets all round, gas molecules dissolved in it, then bubbles.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const MELT = G();
scene.add(MELT);
const melt = { flow: 0, rise: 0, hot: 0 };
const meltWall = (() => {
  const geo = new THREE.IcosahedronGeometry(70, 3);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = V3(p.getX(i), p.getY(i), p.getZ(i));
    const k = 1 + (hash(Math.round(v.x * 3) * 7 + Math.round(v.y * 3) * 131 + Math.round(v.z * 3) * 17, 2) - 0.5) * 0.12;
    p.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  const shades = ["#ff9f1c", "#f7861b", "#ffb347", "#e46f17", "#ffa62b", "#d9531e", "#c4441a"];
  const m = new THREE.Mesh(L.facets(geo, (i) => col(shades[Math.floor(hash(i, 3) * shades.length)])), unlit({ side: THREE.BackSide }));
  MELT.add(m);
  const base = m.geometry.attributes.color.array.slice();
  const hot = col("#ffe08a");
  return { m, update(t) {
    const c = m.geometry.attributes.color, arr = c.array, n = arr.length / 9;
    for (let f = 0; f < n; f++) {
      const k = 0.88 + 0.14 * Math.sin(t * (0.7 + hash(f, 5) * 1.3) + hash(f, 6) * 6.28);
      for (let j = 0; j < 3; j++) {
        const q = f * 9 + j * 3;
        // the rising blob (s09) is hotter: its melt runs yellower
        arr[q] = Math.min(1, lerp(base[q], hot.r, melt.hot * 0.35) * k);
        arr[q + 1] = Math.min(1, lerp(base[q + 1], hot.g, melt.hot * 0.35) * k);
        arr[q + 2] = Math.min(1, lerp(base[q + 2], hot.b, melt.hot * 0.35) * k);
      }
    }
    c.needsUpdate = true;
  } };
})();
// Big translucent shards of melt drifting between the camera and the wall (s05): the melt has depth.
const meltShards = [];
{
  const r = rng(29);
  for (let i = 0; i < 12; i++) {
    const t3 = [V3(0, 0, 0), V3(4 + r() * 6, r() * 3, 0), V3(r() * 4, 4 + r() * 5, 0)];
    const m = triMesh([t3], [col(["#ffb347", "#ff9f1c", "#ffc15e"][i % 3])], new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
    m.userData = { p: V3((r() - 0.5) * 60, (r() - 0.5) * 34, -16 - r() * 22), rot: r() * 3, w: r() - 0.5 };
    meltShards.push(m);
    MELT.add(m);
  }
}
const meltMols = [];
{
  const r = rng(37);
  const kinds = ["H2O", "H2O", "H2O", "CO2", "H2O", "H2O", "H2O", "H2O", "SO2", "H2O", "H2O", "H2O", "CO2", "H2O", "H2O", "H2O", "H2O", "H2O", "H2O", "H2O"];
  kinds.forEach((kind, i) => {
    const m = molecule(kind);
    const p = V3(((i % 5) - 2) * 6.4 + (r() - 0.5) * 3, (Math.floor(i / 5) - 1.5) * 4.6 + (r() - 0.5) * 2, (r() - 0.5) * 9);
    m.userData.p0 = p;
    m.userData.rz = r() * 6;
    m.userData.w = (r() - 0.5) * 0.8;
    m.userData.ry = (r() - 0.5) * 0.5;
    meltMols.push(m);
    MELT.add(m);
  });
}
// the three tagged ones: a water molecule, carbon dioxide, sulfur dioxide
const molH2O = meltMols[6], molCO2 = meltMols[12], molSO2 = meltMols[8];
// Bubbles forming out of the molecules (s09): each site pulls three molecules in, then inflates as glass.
const SITES = [[1, 6, 11], [7, 12, 2], [13, 18, 17], [10, 15, 16], [4, 9, 14]];
const sites = SITES.map((ids, b) => {
  const c = ids.reduce((p, i) => p.add(meltMols[i].userData.p0), V3(0, 0, 0)).multiplyScalar(1 / 3);
  const m = bubble(GLASS);
  m.visible = false;
  MELT.add(m);
  return { ids, c, m, k: 0, grow: 0, size: 1.7 + hash(b, 3) * 0.8 };
});
function updateMelt(t) {
  meltWall.update(t);
  for (const m of meltShards) {
    m.visible = melt.hot < 0.5;
    const { p, rot, w } = m.userData;
    m.position.set(p.x + t * 0.8 * (0.5 + w), p.y - melt.rise * 0.6, p.z);
    m.rotation.set(0, 0, rot + t * w * 0.2);
  }
  meltMols.forEach((m, i) => {
    const { p0, rz, w, ry } = m.userData;
    const pos = V3(p0.x + melt.flow, p0.y - melt.rise, p0.z);
    let sc = 1;
    for (const st of sites) if (st.ids.includes(i)) {
      const off = V3(Math.cos(i * 2.1), Math.sin(i * 2.1), 0).multiplyScalar(0.9);
      const tgt = st.c.clone().add(V3(melt.flow, -melt.rise, 0)).add(off);
      pos.lerp(tgt, ease("power2.inOut")(st.k));
      sc = 1 - smooth(0.25, 0.8, st.grow);
    }
    m.position.copy(pos);
    m.scale.setScalar(Math.max(sc, 0.001));
    m.visible = sc > 0.01;
    m.rotation.set(0, ry, rz + w * t);
  });
  for (const st of sites) {
    st.m.visible = st.grow > 0.001;
    st.m.position.copy(st.c).add(V3(melt.flow, -melt.rise, 0));
    st.m.scale.setScalar(st.size * (0.2 + 0.8 * ease("back.out(1.6)")(clamp(st.grow))));
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// BOTTLE: a 1.5 litre PET soft-drink bottle, closed, CO₂ dissolved in the drink; opened, it fizzes (f4). 1 unit = 1 cm.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const BOTTLE = G();
scene.add(BOTTLE);
const bottleGroup = G();
BOTTLE.add(bottleGroup);
{
  const floor = new THREE.Mesh(L.facets(new THREE.CircleGeometry(260, 16), (i) => col(i % 2 ? "#bfe8e1" : "#b2e0d8")), flat());
  floor.rotation.x = -Math.PI / 2;
  BOTTLE.add(at(floor, 0, -18, 0));
  const top = new THREE.Mesh(L.facets(new THREE.BoxGeometry(96, 3, 40, 4, 1, 2), (i) => col(i % 3 ? "#e9c79a" : "#ddb889").offsetHSL(0, 0, (hash(i, 4) - 0.5) * 0.04)), flat());
  BOTTLE.add(at(top, 14, -1.5, -4));
  for (const [x, z] of [[-30, -20], [-30, 12], [58, -20], [58, 12]]) BOTTLE.add(at(new THREE.Mesh(L.facets(new THREE.CylinderGeometry(1.6, 1.4, 15, 6), () => col("#c9a57a")), flat()), x, -10.5, z));
}
const BPROF = [[0.01, 0.25], [2.2, 0], [3.6, 0.6], [4.5, 1.8], [4.65, 3.2], [4.65, 8], [4.4, 9], [4.65, 10], [4.65, 19], [4.4, 21.5], [3.6, 24], [2.4, 26.3], [1.55, 27.6], [1.45, 28.6], [1.95, 28.8], [1.95, 29.25], [1.45, 29.45], [1.45, 30.3]];
const bottleShell = new THREE.Mesh(L.facets(new THREE.LatheGeometry(BPROF.map(([r, y]) => new THREE.Vector2(r, y)), 12), (i) => col(i % 2 ? "#eafbf8" : "#d6f4ef")), flat({ transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }));
const LPROF = [[0.01, 0.6], [2.0, 0.35], [3.4, 0.9], [4.25, 2.0], [4.4, 3.2], [4.4, 8], [4.15, 9], [4.4, 10], [4.4, 19], [4.15, 21.3], [3.7, 22.8], [0.01, 22.8]];
const liquid = new THREE.Mesh(L.facets(new THREE.LatheGeometry(LPROF.map(([r, y]) => new THREE.Vector2(r, y)), 12), (i) => col(i % 2 ? "#84dccb" : "#9be4d5")), flat({ transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
const capMesh = new THREE.Mesh(L.facets(new THREE.CylinderGeometry(1.68, 1.68, 2.1, 16, 1), (i) => col(i % 2 ? PAL.orange : "#f08c10")), flat({ emissive: "#8a4a00" }));
at(capMesh, 0, 31.1, 0);
bottleGroup.add(liquid, bottleShell, capMesh);
const bottleMols = [];
{
  // scattered through the soda, not in a line: a jittered 3 x 4 grid across the bottle, front to back
  const r = rng(47);
  for (let i = 0; i < 12; i++) {
    const m = molecule("CO2", 0.95);
    const col3 = i % 3, row = Math.floor(i / 3);
    at(m, (col3 - 1) * 2.5 + (r() - 0.5) * 1.1, 3.2 + row * 4.6 + (col3 === 1 ? 2.2 : 0) + (r() - 0.5) * 1.4, (r() - 0.5) * 2.2 + 0.6);
    m.userData = { p0: m.position.clone(), rz: r() * 6, w: (r() - 0.5) * 0.6 };
    bottleMols.push(m);
    bottleGroup.add(m);
  }
}
const BMATCH = bottleMols[4]; // the molecule the cut from the melt lands on (the middle of the bottle)
// Opened: bubbles nucleate where the gas was dissolved and rise to the top (the fizz)
const fizz = [];
{
  const r = rng(49);
  for (let i = 0; i < 40; i++) {
    const m = bubble(GLASS);
    const src = bottleMols[i % bottleMols.length].userData.p0;
    m.userData = { x: src.x + (r() - 0.5) * 1.6, y0: i < 9 ? src.y : 1 + r() * 18, z: src.z + (r() - 0.5) * 0.8 + 1.2, d: (i < 9 ? 0 : 0.12) + r() * 0.55, sp: 14 + r() * 12, s: 0.38 + r() * 0.34 };
    m.visible = false;
    fizz.push(m);
    bottleGroup.add(m);
  }
}
const bottle = { open: 0, fizz: 0 };
// on the right, small: the reservoir again, 'the same as magma'
const miniRes = G();
{
  const geo = new THREE.IcosahedronGeometry(5.2, 1);
  const blobM = new THREE.Mesh(L.facets(geo, (i) => col(["#ff9f1c", "#ffb534", "#f58a19", "#ffc24a"][i % 4])), unlit());
  blobM.scale.set(1.6, 0.62, 1);
  miniRes.add(blobM);
  ["H2O", "CO2", "H2O"].forEach((k, i) => { const m = molecule(k, 0.7); at(m, -4 + i * 4, 0.6 * (i % 2 ? 1 : -1), 5.6); miniRes.add(m); });
  at(miniRes, 40, 16, -4);
  BOTTLE.add(miniRes);
}
const miniResBuild = assembler(miniRes, (c) => c.x, { spread: 0.5 });

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// LAB: the conduit as faceted columns (s10 to s12): runny like Kīlauea's, thick like Merapi's
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const LAB = G();
scene.add(LAB);
{
  const floor = new THREE.Mesh(L.facets(new THREE.CircleGeometry(300, 18), (i) => col(i % 2 ? "#3cc2b2" : "#32b8a8")), flat());
  floor.rotation.x = -Math.PI / 2;
  LAB.add(floor);
}
const COLH = 30;
function conduitColumn(shades, seed) {
  const g = G();
  const magmaGeo = new THREE.BoxGeometry(6, COLH, 1.6, 3, 10, 1);
  const p = magmaGeo.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0 && Math.abs(p.getX(i)) < 2.99 && p.getY(i) > -COLH / 2 + 0.01 && p.getY(i) < COLH / 2 - 0.01) p.setZ(i, p.getZ(i) + (hash(i, seed) - 0.5) * 0.5);
  const mat = unlit();
  const magma = new THREE.Mesh(L.facets(magmaGeo, (i) => col(shades[Math.floor(hash(i, seed + 1) * shades.length)])), mat);
  g.add(at(magma, 0, COLH / 2, 0));
  const rockMat = flat();
  for (const sx of [-1, 1]) {
    const wall = new THREE.Mesh(L.facets(new THREE.BoxGeometry(2.4, COLH + 0.6, 3.4, 1, 6, 1), (i) => col(["#4b4f5c", "#5a5f6b", "#434754", "#646875"][Math.floor(hash(i, seed + sx) * 4)])), rockMat);
    g.add(at(wall, sx * 4.2, COLH / 2, 0.2));
  }
  g.add(at(new THREE.Mesh(L.facets(new THREE.BoxGeometry(11, 1.2, 3.6, 3, 1, 1), (i) => col(["#4b4f5c", "#5a5f6b"][i % 2])), rockMat), 0, 0.6, 0.2));
  g.userData = { mat, rockMat };
  return g;
}
const colA = conduitColumn(["#ff9f1c", "#ffb13d", "#ff8f17", "#ffc04d", "#f7861b"], 5);
const colB = conduitColumn(["#c2410c", "#b23a0e", "#cf4f17", "#a8340d", "#bd4513"], 9);
LAB.add(colA, colB);
colB.visible = false;
const crust = new THREE.Mesh(L.facets(new THREE.BoxGeometry(7.2, 1.3, 2.6, 4, 1, 1), (i) => col(["#3b3d44", "#4d4f57", "#2f3138"][i % 3])), flat());
at(crust, 0, COLH - 0.3, 0.5);
colB.add(crust);
const labBubbles = (n, seed) => Array.from({ length: n }, (_, i) => { const m = bubble(GLASS); m.userData = { i, r: hash(i, seed), x: (hash(i, seed + 1) - 0.5) * 3.4 }; return m; });
const bubA = labBubbles(9, 3), bubB = labBubbles(11, 7);
bubA.forEach((m) => colA.add(m));
bubB.forEach((m) => colB.add(m));
const pops = Array.from({ length: 9 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 8), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, side: THREE.DoubleSide, depthWrite: false })); m.visible = false; colA.add(m); return m; });
const gasA = L.createColumn({ count: 16, height: 14, period: D / 18, base: V3(0, COLH + 0.6, 0.6), colours: ["#ffffff", "#eef6f4", "#e3efec"], emissive: "#9aa8a6", seed: 12, size: 0.5, grow: 0.12, spread: 0.3, drift: -0.35, power: 1 });
gasA.opacity = 0;
colA.add(gasA.group);
const spill = (() => {
  const pts = [V3(2.4, COLH + 0.15, 1.2), V3(3.6, COLH + 0.25, 1.4), V3(5.4, COLH - 0.4, 1.9), V3(5.7, COLH - 3, 2.0), V3(5.8, COLH - 6.5, 2.0), V3(5.7, COLH - 10, 2.0)];
  const tris = [], colours = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], w = 0.55;
    tris.push([V3(a.x - w, a.y, a.z), V3(b.x - w, b.y, b.z), V3(b.x + w, b.y, b.z)], [V3(a.x - w, a.y, a.z), V3(b.x + w, b.y, b.z), V3(a.x + w, a.y, a.z)]);
    colours.push(col("#ffb534"), col("#ff9f1c"));
  }
  const m = triMesh(tris, colours, unlit({ side: THREE.DoubleSide }));
  m.geometry.setDrawRange(0, 0);
  colA.add(m);
  return { m, n: tris.length * 3, k: 0 };
})();
const upArrows = [-1.8, 0.4, 2.2].map((x, i) => { const a = arrowMesh(1.4, PAL.coral, 0.45); a.rotation.z = Math.PI; at(a, x, COLH - 3.6 - (i % 2) * 0.8, 2.2); a.visible = false; colB.add(a); return a; });
const BARS = [["dalam", 6, 3.2, "#b9b0a2"], ["tengah", 15, 6.4, "#9aa3ad"], ["dekat permukaan", 24, 10.5, PAL.orange]];
const sizeBars = BARS.map(([, y, len, c], i) => {
  const geo = new THREE.CylinderGeometry(0.95, 0.95, len, 6, Math.max(1, Math.round(len / 1.4)));
  geo.rotateZ(-Math.PI / 2);
  geo.translate(len / 2, 0, 0);
  const m = new THREE.Mesh(L.facets(geo, (k) => col(c).offsetHSL(0, 0, (hash(k, i) - 0.5) * 0.06)), flat({ emissive: col(c).multiplyScalar(0.35) }));
  m.scale.x = 0.001;
  LAB.add(at(m, 7.2, y, 0.5));
  return m;
});
const lab = { split: 0, stall: 0, mode: 1, dimA: 0, dimB: 1 };

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// CHART: Merapi 2.9 km, Everest 8.8 km, the ash column of 4 November 2010 17 km, on one scale (f9, f10). 1 unit = 1 km.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const CHART = G();
scene.add(CHART);
{
  const ground = new THREE.Mesh(L.facets(new THREE.CircleGeometry(400, 24), (i) => col(i % 3 ? "#5cbfa8" : "#48b59e").offsetHSL(0, 0, (hash(i, 3) - 0.5) * 0.05)), flat());
  ground.rotation.x = -Math.PI / 2;
  CHART.add(ground);
  const r = rng(101);
  for (let i = 0; i < 9; i++) {
    const h = 6 + r() * 10, w = 25 + r() * 30;
    const hill = new THREE.Mesh(L.facets(new THREE.ConeGeometry(w, h, 7, 2), (k) => col(["#7fc2a0", "#6fb394", "#8ecfaa"][k % 3])), flat());
    CHART.add(at(hill, -150 + i * 40 + r() * 15, h / 2 - 0.5, -140 - r() * 80));
  }
  const base = new THREE.Mesh(L.facets(new THREE.BoxGeometry(30, 0.25, 5.4, 6, 1, 1), (i) => col(i % 2 ? "#f2efe2" : "#e6e2d2")), flat({ emissive: "#5c5a52" }));
  CHART.add(at(base, 0, 0.12, 0));
}
// Faceted bars: each a rough five-sided prism stacked in layers, its top level at its value.
const CHART_BARS = [["Merapi", 2.91, "#4b535f", -8], ["Everest", 8.849, "#e8f3f2", 0], ["abu Merapi, 2010", 17, PAL.orange, 8]];
const chartBars = CHART_BARS.map(([, h, c, x], i) => {
  const layers = Math.max(2, Math.round(h / 1.1));
  const geo = new THREE.CylinderGeometry(2.0, 2.15, h, 5, layers);
  geo.translate(0, h / 2, 0);
  const p = geo.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const y = p.getY(k);
    if (y < 0.01 || y > h - 0.01) continue;
    const key = Math.round(p.getX(k) * 50) * 7 + Math.round(y * 50) * 131 + Math.round(p.getZ(k) * 50) * 17;
    const sc = 1 + (hash(key, i + 3) - 0.5) * 0.22;
    p.setXYZ(k, p.getX(k) * sc, y + (hash(key, i + 9) - 0.5) * 0.25, p.getZ(k) * sc);
  }
  const m = new THREE.Mesh(L.facets(geo, (k) => col(c).offsetHSL(0, 0, (hash(k, i + 7) - 0.5) * 0.1)), flat());
  CHART.add(at(m, x, 0, 0));
  return { m, h, x, build: assembler(m, (cc) => cc.y, { spread: 0.08, lift: 0 }) };
});
const chartFold = { k: 0 };

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// CARDS: three tiny scenes for the recap (s17), each drawn into its card's canvas
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const CARD1 = G(), CARD2 = G(), CARD3 = G();
scene.add(CARD1, CARD2, CARD3);
const c1 = { arrow: arrowMesh(3.2, PAL.coral, 0.9), mols: [] };
{
  const geo = new THREE.IcosahedronGeometry(4.2, 1);
  const b = new THREE.Mesh(L.facets(geo, (i) => col(["#ff9f1c", "#ffb534", "#f58a19", "#ffc24a"][i % 4])), unlit());
  b.scale.set(1.7, 0.62, 1);
  CARD1.add(b);
  ["H2O", "CO2", "H2O", "SO2"].forEach((k, i) => { const m = molecule(k, 0.85); at(m, -4.4 + i * 3, (i % 2 ? 0.7 : -0.6), 4.2); c1.mols.push(m); CARD1.add(m); });
  CARD1.add(at(c1.arrow, 0, 3.2, 1.5));
}
const c2 = { col: conduitColumn(["#ff9f1c", "#ffb13d", "#ff8f17", "#ffc04d"], 15), bub: labBubbles(6, 23) };
c2.bub.forEach((m) => c2.col.add(m));
CARD2.add(c2.col);
const c3 = { blocks: [], col: null };
{
  const prof = [];
  for (let d = 0; d <= 7.5; d += 0.5) prof.push(new THREE.Vector2(d * 10, d < 0.3 ? FLOOR : (topAt(-d * 10) + topAt(d * 10)) / 2));
  prof.push(new THREE.Vector2(80, 0));
  const geo = new THREE.LatheGeometry(prof.reverse(), 9);
  const m = new THREE.Mesh(L.facets(geo, (i, c) => col(c.y > 20 ? "#4b535f" : c.y > 11 ? "#268577" : "#48b59e").offsetHSL(0, 0, (hash(i, 9) - 0.5) * 0.06)), flat({ side: THREE.DoubleSide }));
  CARD3.add(m);
  const r = rng(5);
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(L.facets(new THREE.DodecahedronGeometry(1.4, 0), (k) => col(["#5a5862", "#6b6871", "#4f4d57"][k % 3])), flat());
    b.userData = { p0: V3((r() - 0.5) * 3, 27.8 + r() * 1.2, (r() - 0.5) * 2), v: V3((r() - 0.5) * 30, 14 + r() * 14, (r() - 0.5) * 10) };
    c3.blocks.push(b);
    CARD3.add(b);
  }
  c3.col = L.createColumn({ count: 60, height: 70, period: 57.5 / 6, base: V3(0, 27, 0), seed: 33, size: 2.0, grow: 0.12, spread: 0.24, drift: 0.02, power: 1.4 });
  CARD3.add(c3.col.group);
}
const cards = { burst: 0, press: 0, k1: 0, k2: 0, k3: 0 };

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// The pressure gauge (s07, s08, s14): a faceted dial that floats beside what it measures, no numbers (f4)
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const gauge = { v: 0, show: 0, x: 1590, y: 330, r: 100 };
const gaugeGroup = G();
const needle = G();
{
  const face = new THREE.Mesh(L.facets(new THREE.CircleGeometry(1, 18), () => col("#f8fcfb")), unlit());
  const rim = new THREE.Mesh(L.facets(new THREE.RingGeometry(1, 1.16, 18), (i) => col(i % 2 ? "#293241" : "#3a4456")), unlit());
  const back = new THREE.Mesh(L.facets(new THREE.CylinderGeometry(1.16, 1.2, 0.3, 18), (i) => col(i % 2 ? "#293241" : "#3a4456")), flat());
  back.rotation.x = Math.PI / 2;
  back.position.z = -0.16;
  gaugeGroup.add(back, face, rim);
  for (const [a0, a1, c] of [[0, 0.45, PAL.teal], [0.45, 0.7, PAL.sand], [0.7, 1, PAL.coral]]) {
    const tris = [], colours = [];
    const n = Math.max(2, Math.round((a1 - a0) * 12));
    for (let i = 0; i < n; i++) {
      const u0 = lerp(a0, a1, i / n), u1 = lerp(a0, a1, (i + 1) / n);
      const A = (u) => deg(210 - 240 * u);
      const p = (u, r) => V3(Math.cos(A(u)) * r, Math.sin(A(u)) * r, 0.01);
      tris.push([p(u0, 0.66), p(u0, 0.9), p(u1, 0.9)], [p(u0, 0.66), p(u1, 0.9), p(u1, 0.66)]);
      colours.push(col(c), col(c).offsetHSL(0, 0, -0.04));
    }
    gaugeGroup.add(triMesh(tris, colours, unlit({ side: THREE.DoubleSide })));
  }
  const nm = triMesh([[V3(0, -0.08, 0.03), V3(0.86, 0, 0.03), V3(0, 0.08, 0.03)], [V3(0, -0.08, 0.03), V3(-0.18, 0, 0.03), V3(0, 0.08, 0.03)]], [col("#293241"), col("#293241")], unlit({ side: THREE.DoubleSide }));
  needle.add(nm);
  needle.add(at(new THREE.Mesh(L.facets(new THREE.CircleGeometry(0.13, 8), () => col("#e4572e")), unlit()), 0, 0, 0.05));
  gaugeGroup.add(needle);
  let order = 8;
  gaugeGroup.traverse((o) => { if (o.material) { o.material.depthTest = false; o.material.fog = false; o.renderOrder = order++; } });
  camera.add(gaugeGroup);
}
const gaugeLabel = tag("tekanan", { at: () => V3(0, 0, 0), bare: true, cls: "small", view: "manual" });
function updateGauge() {
  gaugeGroup.visible = gauge.show > 0.01;
  if (!gaugeGroup.visible) return;
  const d = 10, hh = d * Math.tan(deg(camera.fov / 2)), hw = hh * camera.aspect;
  gaugeGroup.position.set(((gauge.x - 960) / 960) * hw, ((540 - gauge.y) / 540) * hh, -d);
  gaugeGroup.scale.setScalar((gauge.r / 540) * hh * ease("back.out(1.7)")(clamp(gauge.show)));
  needle.rotation.z = deg(210 - 240 * clamp(gauge.v));
}

// The timeline is in timeline.js: the shots, one after another, and the frame loop.
const ctx = {
  film, tl, gsap, $, s, D, BEAT, THREE, scene, renderer, camera, deg, V3, G, at, ease, note, sky, usePalette, fogMix, camOf, mixCam, aim, C, CL, cut, move,
  molecule, bubble, tags, tag, showTag, hideTag, noteOn, noteOff, col, clamp, smooth, lerp, hash,
  MERAPI, M, MS, CRATER, FLOOR, southHalf, HILL, ash, pyro, updatePyro, CUTSET, cutFace, RES, CONDUIT, topAt, reservoir, resBuild, resMols, arrows, blob, kentalFill, DOME, domeShell, domeCut, cracks, domeBlocks, settleBlocks, domeY, trapped, froth, shards, shock, slice,
  KIL, K, MU, MLOA, HMM, ribbons, flowLava, sea, updateFountain, fountain, plumes, hmmPlume,
  wipe, updateWipe, MELT, melt, updateMelt, molH2O, molCO2, molSO2, sites, meltMols,
  BOTTLE, bottleGroup, bottleShell, liquid, capMesh, bottleMols, BMATCH, fizz, bottle, miniRes, miniResBuild,
  LAB, COLH, colA, colB, crust, bubA, bubB, pops, gasA, spill, upArrows, BARS, sizeBars, lab,
  CHART, CHART_BARS, chartBars, chartFold, CARD1, CARD2, CARD3, c1, c2, c3, cards, gauge, updateGauge, gaugeLabel,
};
(await import("./timeline.js")).timeline(ctx);
