// "How do noise-cancelling headphones erase sound?" Portrait, 74 s, cut to one take (voice/).
// Every time comes from storyboard.json (the take's times) or from the take's word times (film.voiced).
// One 3D scene holds everything: the headphone and the head (models.js) in a dim room (set.js), the sound as light
// (light.js). On top: the framed captions at the top, thin instruments (the eardrum scope, rulers), three charts.
import { createFilm } from "../../kit/engine/motion.js";
import { createStage3D } from "../../kit/engine/stage3d.js";
import { createParts } from "../../kit/engine/parts3d.js";
import { createModels } from "./models.js";
import { createSet } from "./set.js";
import { cutaway, fxaa } from "./tools3d.js";
import { wave, shell } from "./light.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, $, $$, gsap, shots: s } = film;

// ── words ─────────────────────────────────────────────────────────────────────────────────────────────────
const said = (id, w) => {
  const norm = (x) => x.toLowerCase().replace(/[^a-z0-9'-]/g, "");
  const hit = film.voiced[id].words.find((x) => norm(x[2]) === norm(w));
  if (!hit) throw new Error(`${w} not in ${id}`);
  return hit; // [start, end, text]
};
const at = (id, w) => said(id, w)[0];
const after = (id, w) => said(id, w)[1];
const T = (id, f = 0) => s[id].start + f * s[id].dur;

// ── the space ─────────────────────────────────────────────────────────────────────────────────────────────
// Without multisampling: in software GL it costs more than the rest of the frame. (A context made first is the one
// three.js gets.) Edges are kept clean by rendering a little larger and letting the compositor filter it down.
if (!location.search.includes("msaa")) $("#space").getContext("webgl2", { alpha: true, antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: true, depth: true, stencil: false });
const space = createStage3D($("#space"), { rig: true, shadows: true, environment: 0.8, exposure: 1.08 });
const { THREE, camera, scene } = space;
const RATIO = Number(new URLSearchParams(location.search).get("ratio") ?? 1);
if (RATIO !== 1) space.renderer.setPixelRatio(RATIO);
if (!location.search.includes("msaa")) fxaa(space);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const P = createParts(space);
const set = createSet(space, P);
const Mo = createModels(space, P);
scene.add(Mo.phones, Mo.head);
// The key light warm, the rim a touch cool: a lamp in a room at night.
space.key.color.set(0xffe0bf);
space.key.intensity = 2.3;
space.rim.color.set(0xd8e6ff);
space.rim.intensity = 1.5;
space.fill.intensity = 0.3;
space.key.shadow.mapSize.set(1536, 1536);

const A = Mo.anchor;
const cupBase = Mo.right.position.clone();
const cupW = (x, y, z) => V(cupBase.x + z, cupBase.y + y, cupBase.z - x); // the cup's own axes to the world (worn)
const MOUTH = Mo.canalCurve.getPointAt(0);
const DRUM = A.drum;

// Software GL: standard materials (the physical extras cost more than they show at this size), plain PCF
// shadows, and only the parts big enough to matter cast them.
space.renderer.shadowMap.type = THREE.PCFShadowMap;
space.key.shadow.mapSize.set(1024, 1024);
{
  const keys = ["color", "map", "normalMap", "normalScale", "roughness", "roughnessMap", "metalness", "metalnessMap", "emissive", "emissiveIntensity", "emissiveMap", "alphaMap", "alphaTest", "alphaHash", "transparent", "opacity", "side", "vertexColors", "depthWrite", "blending", "envMapIntensity", "flatShading"];
  const swap = new Map();
  const toStd = (m) => {
    if (!m.isMeshPhysicalMaterial) return m;
    if (!swap.has(m)) {
      const n = new THREE.MeshStandardMaterial();
      for (const k of keys) if (m[k] !== undefined) n[k] = m[k]?.isColor || m[k]?.isVector2 ? m[k].clone() : m[k];
      n.userData = { ...m.userData };
      n.name = m.name;
      swap.set(m, n);
    }
    return swap.get(m);
  };
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  scene.traverse((o) => {
    if (!o.isMesh || o.material?.isShaderMaterial) return;
    o.material = Array.isArray(o.material) ? o.material.map(toStd) : toStd(o.material);
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    box.copy(o.geometry.boundingBox).getSize(size);
    const ws = new THREE.Vector3();
    o.getWorldScale(ws);
    if (Math.max(size.x * ws.x, size.y * ws.y, size.z * ws.z) < 9) o.userData.castShadow = false;
  });
}

// Cut planes: one level cut through head and cup at the canal's height, one through the cushion for its macro.
const cutH = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e5);
const cutC = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e5);
cutaway(space, Mo.phones, cutH);
cutaway(space, Mo.head, cutH);
cutaway(space, Mo.cushion, cutC);
const CUT_Y = 0.6;

// The cup's parts move along its axis (cup z) in two poses: "lift" (the shell off, upward) and "open" (all apart).
const LIFT = { "shell group": [0, 170, 30] };
const OPEN = {
  cushion: [0, 0, 34], "cushion ring": [0, 0, 37], "fabric cover": [0, 0, 49], "feedback mic": [0, 0, 62], baffle: [0, 0, 78], screws: [0, 0, 78], "driver (placed)": [0, 0, 78],
  battery: [0, -4, 100], "main board (placed)": [0, 0, 118], "shell group": [0, 0, 146], "feed-forward mic": [0, 0, 146], "ff flex": [0, 0, 146], "ff cable": [0, 0, 146],
};
const OPEN_RIGHT = { yoke: [0, 0, 146], pivots: [0, 0, 146], slider: [0, 0, 146] };
const moving = [];
for (const [name, out] of Object.entries({ ...OPEN, ...LIFT })) {
  const o = Mo.cup.getObjectByName(name);
  if (!o || moving.some((m) => m.o === o)) continue;
  moving.push({ o, base: o.position.clone(), open: V(...(OPEN[name] ?? [0, 0, 0])), lift: V(...(LIFT[name] ?? [0, 0, 0])) });
}
for (const [name, out] of Object.entries(OPEN_RIGHT)) {
  const o = Mo.right.getObjectByName(name);
  moving.push({ o, base: o.position.clone(), open: V(...out), lift: V(0, 0, 0) });
}

// Everything the timeline tweens that is not the camera.
const S = {
  vis: 1, head: 0, desk: 1, tower: 0, lift: 0, open: 0, cut: 1e5, cutC: 1e5, cone: 0, fabricGlow: 0, chipGlow: 0, grilleGlow: 0, cupGlow: 0,
  fogNear: 900, fogFar: 5200, scope: 0, slowNote: 0, scaleNote: 0, illus: 0,
};
const ffGrilleMesh = Mo.ffGrille.children[0];
const chipMarking = Mo.anc.getObjectByName("marking");
const shellMesh = Mo.cup.getObjectByName("shell");
const glowMats = {
  fabric: Mo.fabric.material,
  chip: chipMarking.material,
  grille: ffGrilleMesh.material,
  shell: shellMesh.material,
};
for (const m of Object.values(glowMats)) m.emissive = new THREE.Color(0x000000);

// ── light: the sound ──────────────────────────────────────────────────────────────────────────────────────
const AMBER = 0xffa53d;
const CYAN = 0x3fe0ff;
const WHITE = 0xffffff;
const TAU = Math.PI * 2;
const up = V(0, 1, 0);
const flatNormal = (p, u, curve) => null;
const travelling = (amp, lambda, f, phase = 0) => (x, t) => amp * Math.sin(TAU * (x / lambda - f * t) + phase);

// Motes that draw a sound: shells of dust travelling out from a source, or a field rocking along a direction.
function rings({ src, dir, spread = 0.9, lambda, speed, shells = 8, count = 2200, size = 2.2, color = 0xffc27a, jitter = 0.08 }) {
  const d = dir.clone().normalize();
  const side = new THREE.Vector3().crossVectors(d, Math.abs(d.y) > 0.9 ? V(1, 0, 0) : up).normalize();
  const side2 = new THREE.Vector3().crossVectors(d, side).normalize();
  const span = shells * lambda;
  const st = { on: 0 };
  const pts = P.dust({
    count,
    size,
    color,
    opacity: 0.9,
    place: (i, t, p, sd) => {
      const n = Math.floor(sd(3) * shells);
      const r = (((n * lambda + speed * t + sd(2) * lambda * jitter) % span) + span) % span;
      const a = (sd(0) - 0.5) * 2 * spread;
      const b = (sd(1) - 0.5) * 2 * spread;
      const k = Math.cos(Math.hypot(a, b));
      p.copy(src).addScaledVector(d, r * k).addScaledVector(side, r * Math.sin(a)).addScaledVector(side2, r * Math.sin(b));
    },
  });
  pts.userData.noCut = true;
  pts.visible = false;
  scene.add(pts);
  return { st, pts, update: (t) => ((pts.visible = st.on > 0.01), (pts.material.opacity = 0.9 * st.on), pts.visible && pts.update(t)) };
}
function field({ center, dir, size, lambda, amp, f, count = 3200, ps = 0.55 }) {
  const d = dir.clone().normalize();
  const side = new THREE.Vector3().crossVectors(d, up).normalize();
  const st = { on: 0 };
  const pts = P.dust({
    count,
    size: ps,
    color: 0xffd6a0,
    opacity: 1,
    place: (i, t, p, sd) => {
      const x = (sd(0) - 0.5) * size.x;
      const dx = amp * Math.sin(TAU * (x / lambda - f * t));
      p.copy(center).addScaledVector(d, x - dx).addScaledVector(up, (sd(1) - 0.5) * size.y).addScaledVector(side, (sd(2) - 0.5) * size.z);
    },
  });
  pts.userData.noCut = true;
  pts.material.depthWrite = true;
  pts.material.alphaTest = 0.25;
  pts.material.blending = THREE.NormalBlending;
  scene.add(pts);
  return { st, pts, update: (t) => ((pts.visible = st.on > 0.01), (pts.material.opacity = st.on), pts.visible && pts.update(t)) };
}
const lights = [];
const W = (o) => (lights.push(o), o);
const line = (a, b, color, extra = {}) => W(wave(space, { path: [a, b], normal: up, color, value: () => 0, samples: 24, width: 1.0, glow: 0.6, ...extra }));

// Hook: noise rolling in toward the headphone on the desk; the driver answering.
const hookRings = rings({ src: V(-900, 260, 700), dir: V(1, -0.25, -0.8), spread: 0.32, lambda: 90, speed: 120, shells: 14, count: 2600, size: 2.6 });
const hookWave = W(wave(space, { path: new THREE.CatmullRomCurve3([V(-520, 230, 420), V(-200, 150, 220), V(40, 90, 60), cupW(-12, 18, 60)]), normal: up, color: AMBER, value: travelling(16, 90, 1.3), width: 1.6 }));
const driverWave = W(wave(space, { path: new THREE.CatmullRomCurve3([cupW(0, 2, 12), cupW(0, 0, -60), cupW(10, -14, -150), V(-40, -10, 120)]), normal: up, color: CYAN, value: (x, t) => 14 * Math.sin(TAU * (x / 90 - 1.3 * t) + Math.PI), width: 1.6 }));

// The air (s03, s04): a field of specks beside the right cup, travelling toward the head (-x).
const FIELD = V(196, 14, -12);
const air = field({ center: FIELD, dir: V(-1, 0, 0), size: V(130, 90, 50), lambda: 20, amp: 3.0, f: 0.85, count: 9000, ps: 1.5 });
const fieldWave = W(wave(space, { path: [FIELD.clone().add(V(55, 0, -14)), FIELD.clone().add(V(-55, 0, -14))], normal: up, color: AMBER, value: (x, t) => 13 * Math.cos(TAU * ((x - 55) / 20 - 0.85 * t)), width: 1.5 }));
// pins ride on a crest and a trough of the field's wave
const crest = new THREE.Object3D();
const trough = new THREE.Object3D();
scene.add(crest, trough);

// Toward the outside mic (s05): rings from far outside, a wave into the grille.
const GRILLE = cupW(-20.5, 31, 52.4);
const micRings = rings({ src: V(900, 120, 420), dir: V(-1, -0.1, -0.45), spread: 0.5, lambda: 70, speed: 110, shells: 16, count: 2600, size: 2.2 });
const inWave = W(wave(space, { path: new THREE.CatmullRomCurve3([GRILLE.clone().add(V(160, 30, 190)), GRILLE.clone().add(V(70, 14, 80)), GRILLE.clone().add(V(4, 0, 2))]), normal: up, color: AMBER, value: travelling(8, 40, 1.1), width: 1.5 }));

// The spark along the flex to the chip (s06), then the two waves over the board (s07).
const chipW = new THREE.Vector3();
Mo.anc.getWorldPosition(chipW);
const flexPts = [[-20.5, 28, 45.8], [-23, 22, 46], [-20, 15, 41], [-13, 10, 37.5]].map(([x, y, z]) => cupW(x, y, z + 0.8));
const spark = W(wave(space, { path: new THREE.CatmullRomCurve3([GRILLE.clone().add(V(-3, -1, 0)), ...flexPts, chipW.clone().add(V(1.2, 0, 0))]), normal: up, color: AMBER, value: () => 0, width: 2.4, glow: 1.6 }));
const OVER = chipW.clone().add(V(14, 0, 0)); // the plane over the board, toward the cup's back
const LANE = 9; // mm between the two lanes
const lane = (dy) => [OVER.clone().add(V(0, dy + 12, 17)), OVER.clone().add(V(0, dy + 12, -17))];
const W7 = { a: 0 };
const noise7 = W(wave(space, { path: lane(LANE), normal: up, color: AMBER, value: (x) => 3.2 * Math.sin(TAU * (x / 11.3) + W7.a), width: 1.5 }));
const flip7 = W(wave(space, { path: lane(-LANE), normal: up, color: CYAN, value: (x) => -3.2 * Math.sin(TAU * (x / 11.3) + W7.a), width: 1.5 }));
// crests of sin(2πx/λ) at x = λ/4 + nλ; the links drop from a crest to the trough under it
const xAt = (u) => OVER.clone().add(V(0, 12, 17 - u));
const link1 = line(xAt(11.3 * 0.25).add(V(0, LANE + 3.2, 0)), xAt(11.3 * 0.25).add(V(0, -LANE - 3.2, 0)), WHITE, { width: 0.8 });
const link2 = line(xAt(11.3 * 0.75).add(V(0, LANE - 3.2, 0)), xAt(11.3 * 0.75).add(V(0, -LANE + 3.2, 0)), WHITE, { width: 0.8 });
const pinCrest = new THREE.Object3D();
pinCrest.position.copy(xAt(11.3 * 0.25).add(V(0, LANE + 3.2, 0)));
const pinTrough = new THREE.Object3D();
pinTrough.position.copy(xAt(11.3 * 0.25).add(V(0, -LANE - 3.2, 0)));
const pinCrest2 = new THREE.Object3D();
pinCrest2.position.copy(xAt(11.3 * 0.75).add(V(0, LANE - 3.2, 0)));
const pinTrough2 = new THREE.Object3D();
pinTrough2.position.copy(xAt(11.3 * 0.75).add(V(0, -LANE + 3.2, 0)));
scene.add(pinCrest, pinTrough, pinCrest2, pinTrough2);

// The driver playing it (s08): cyan from the driver's face (opened out 44 mm) to the canal.
const DRV_OPEN = cupW(0, 2, 20.3 + 78 - 1);
const cyan8 = W(wave(space, { path: new THREE.CatmullRomCurve3([DRV_OPEN, DRV_OPEN.clone().lerp(MOUTH, 0.5).add(V(0, 1, 2)), MOUTH.clone().add(V(4, 0, 0))]), normal: up, color: CYAN, value: (x, t) => 4.2 * Math.sin(TAU * (x / 18 - 1.6 * t) + Math.PI), width: 1.6 }));
const driverRings = rings({ src: DRV_OPEN, dir: V(-1, 0, 0), spread: 0.55, lambda: 18, speed: 30, shells: 4, count: 900, size: 0.9, color: 0x9ff0ff });

// In the cut (s09, s20, s22): the noise leaks in past the cushion; the flipped wave from the driver; their sum.
const LV = CUT_Y - 0.5;
const flat = (p) => V(p.x, LV, p.z);
const canalPath = Mo.canalCurve.getSpacedPoints(24).map(flat);
const C0 = flat(cupW(-6, 0, 9));
const amberPath = new THREE.CatmullRomCurve3([V(330, LV, 150), V(190, LV, 80), cupW(-41, 0, 30), cupW(-40, 0, 3), cupW(-33, 0, 1.2), cupW(-22, 0, 3.5), C0, ...canalPath].map(flat));
const cyanPath = new THREE.CatmullRomCurve3([cupW(0, 0, 19.2), cupW(-3, 0, 14), C0, ...canalPath].map(flat));
const sumPath = new THREE.CatmullRomCurve3(canalPath);
const LA = amberPath.getLength();
const LC = cyanPath.getLength();
const LAM = 26;
const F9 = 1.1;
const sideNormal = (p, u) => V(0, 1, 0); // replaced below with the in-plane normal
const inPlane = (curve) => (p, u) => new THREE.Vector3().crossVectors(curve.getTangentAt(Math.min(0.999, Math.max(0.001, u))), up).normalize();
const leakAmp = (x) => (x < LA - Mo.canalCurve.getLength() - 30 ? 7 : 4.5); // weaker once it has squeezed past the cushion
const C9 = { amberGain: 1, residual: 0.03 };
const amber9 = W(wave(space, { path: amberPath, normal: inPlane(amberPath), color: AMBER, value: (x, t) => C9.amberGain * leakAmp(x) * Math.sin(TAU * ((x - LA) / LAM - F9 * t)), width: 1.6, samples: 520 }));
const cyan9 = W(wave(space, { path: cyanPath, normal: inPlane(cyanPath), color: CYAN, value: (x, t) => -4.5 * Math.sin(TAU * ((x - LC) / LAM - F9 * t)), width: 1.6 }));
const LS = sumPath.getLength();
const sum9 = W(wave(space, { path: sumPath, normal: inPlane(sumPath), color: WHITE, value: (x, t) => C9.residual * 4.5 * (1 - x / LS) * Math.sin(TAU * ((x - LS) / LAM - F9 * t)), width: 1.3 }));
const cutRings = rings({ src: V(900, LV, 260), dir: V(-1, 0, -0.32), spread: 0.38, lambda: 26, speed: 28, shells: 22, count: 2600, size: 1.6 });
cutRings.pts.material.depthTest = true;
// the squeak in the cut (s20): fast tight rings hitting the cup; a faint trace inside
const squeakCutRings = rings({ src: V(700, LV, 120), dir: V(-1, 0, -0.18), spread: 0.4, lambda: 8, speed: 40, shells: 60, count: 3200, size: 1.2 });
const C20 = { inside: 0.15 };
const faint20 = W(wave(space, { path: amberPath, normal: inPlane(amberPath), color: AMBER, value: (x, t) => (x < LA - Mo.canalCurve.getLength() - 30 ? 5 : 5 * C20.inside) * Math.sin(TAU * ((x - LA) / 8 - 5 * t)), width: 1.3, samples: 900 }));
// the ring that closes on the eardrum (s22)
const drumRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 12, 96), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
drumRing.position.copy(flat(DRUM)).add(V(0, 0.3, 0));
drumRing.rotation.x = Math.PI / 2;
drumRing.userData.noCut = true;
scene.add(drumRing);
const D22 = { r: 30, o: 0 };

// The sum, floating free (s10, s11): three lanes stacked down the frame, a time axis under them.
const FREE = V(0, 150, 760); // in the room, the head behind the camera
const SH = { shift: 0 }; // how late the copy is, in cycles (s11)
// seen from behind (az 180), screen-right is -x: the lanes run from +x (left on screen) to -x
const freeLane = (dy) => [FREE.clone().add(V(31, dy, 0)), FREE.clone().add(V(-28, dy, 0))];
const LAM10 = 22;
const lanes = {
  a: W(wave(space, { path: freeLane(17.3), normal: up, color: AMBER, value: (x) => 6.5 * Math.sin(TAU * (x / LAM10)), width: 1.6 })),
  b: W(wave(space, { path: freeLane(0), normal: up, color: CYAN, value: (x) => -6.5 * Math.sin(TAU * ((x / LAM10) - SH.shift)), width: 1.6 })),
  c: W(wave(space, { path: freeLane(-17.3), normal: up, color: WHITE, value: (x) => 6.5 * (Math.sin(TAU * (x / LAM10)) - Math.sin(TAU * (x / LAM10 - SH.shift))), width: 1.5 })),
};

// The hum, to scale (s12, s13): 343 / 100 = 3.43 m. It travels toward the head from the right (+x).
const HUM = 3430;
const humRings = rings({ src: V(9000, 0, 0), dir: V(-1, 0, 0), spread: 0.22, lambda: HUM, speed: 900, shells: 4, count: 3600, size: 14, jitter: 0.03 });
const humWave = W(wave(space, { path: [V(4200, 0, 420), V(-2600, 0, 420)], normal: V(0, 0, 1), color: AMBER, value: (x, t) => 140 * Math.sin(TAU * (x / HUM - 0.26 * t)), width: 1.6, samples: 600 }));
const H13 = { x0: 0 };
const ruler13 = W(wave(space, { path: [V(1100, 0, 640), V(1100 - HUM, 0, 640)], normal: V(0, 0, 1), color: WHITE, value: () => 0, width: 1.0, glow: 0.5, samples: 40 }));
const rulerEnd = new THREE.Object3D();
rulerEnd.position.set(1100 - HUM / 2, 0, 640);
scene.add(rulerEnd);
// The squeak, to scale (s15, s16): 343 / 5,000 = 6.86 cm, arriving from the front right.
const SQ = 68.6;
const squeakSrc = cupW(-260, 10, 330);
const squeakRings = rings({ src: squeakSrc, dir: cupW(-20, 6, 52).sub(squeakSrc), spread: 0.38, lambda: SQ, speed: 160, shells: 9, count: 3000, size: 2.2 });
const sqPathA = cupW(-40, 70, 330);
const sqPathB = cupW(-26, 34, 54);
const squeakWave = W(wave(space, { path: [sqPathA, sqPathB], normal: up, color: AMBER, value: (x, t) => 11 * Math.sin(TAU * (x / SQ - 2.2 * t)), width: 1.5 }));
// rulers: one wave beside the ribbon, and the cup's height
const sqDir = sqPathB.clone().sub(sqPathA).normalize();
const sqR0 = sqPathA.clone().addScaledVector(sqDir, 120).add(V(0, 26, 0));
const sqRuler = line(sqR0, sqR0.clone().addScaledVector(sqDir, SQ), WHITE);
const sqTick0 = line(sqR0.clone().add(V(0, -4, 0)), sqR0.clone().add(V(0, 4, 0)), WHITE);
const sqTick1 = line(sqR0.clone().addScaledVector(sqDir, SQ).add(V(0, -4, 0)), sqR0.clone().addScaledVector(sqDir, SQ).add(V(0, 4, 0)), WHITE);
const sqLabel = new THREE.Object3D();
sqLabel.position.copy(sqR0.clone().addScaledVector(sqDir, SQ / 2).add(V(0, 5, 0)));
const cupTop = cupW(-41, 47, 30);
const cupBot = cupW(-41, -47, 30);
const cupRuler = line(cupTop, cupBot, WHITE);
const cupLabel = new THREE.Object3D();
cupLabel.position.copy(cupTop.clone().lerp(cupBot, 0.5));
scene.add(sqLabel, cupLabel);
// The driver's size (s08): a ruler across its face.
const drvR0 = cupW(-20.4, -24, 20.3 + 78);
const drvR1 = cupW(20.4, -24, 20.3 + 78);
const drvRuler = line(drvR0, drvR1, WHITE);
const drvLabel = new THREE.Object3D();
drvLabel.position.copy(drvR0.clone().lerp(drvR1, 0.5));
scene.add(drvLabel);
// The clatter (s18): a bright shell from a point below and in front.
const clatter = shell(space, { color: 0xffc070 });
const CLAT = cupW(210, -150, 170);
clatter.mesh.position.copy(CLAT);

// ── pins ──────────────────────────────────────────────────────────────────────────────────────────────────
const pin = (target, text, o = {}) => space.pin(target, text, o);
const pins = {
  grille: pin(Mo.ffGrille, "FEED-FORWARD MIC<small>outside the cup</small>", { dx: -110, dy: -250 }),
  chip: pin(Mo.anc, "ANC CHIP<small>makes the flipped copy</small>", { dx: 170, dy: -330, at: V(0, 0.5, 0) }),
  squeezed: pin(crest, "SQUEEZED", { dx: 170, dy: -210 }),
  stretched: pin(trough, "STRETCHED", { dx: 170, dy: 210 }),
  noise7: pin(pinCrest, "<b class='am'>NOISE</b> · SQUEEZE", { dx: 110, dy: -170 }),
  flip7: pin(pinTrough, "<b>FLIPPED</b> · STRETCH", { dx: 110, dy: 240 }),
  noise7b: pin(pinCrest2, "STRETCH", { dx: 200, dy: -150 }),
  flip7b: pin(pinTrough2, "SQUEEZE", { dx: 200, dy: 150 }),
  driver: pin(Mo.drv, "40 MM DRIVER<small>plays the flipped wave</small>", { dx: -120, dy: -330, at: V(0, 20, 6) }),
  drvSize: pin(drvLabel, "40 mm", { dx: -90, dy: 130, className: "ruler" }),
  leak: pin(new THREE.Object3D(), "<b class='am'>NOISE</b> LEAKS IN<small>past the cushion</small>", { dx: -60, dy: 210 }),
  flipped: pin(new THREE.Object3D(), "<b>FLIPPED</b> WAVE<small>from the driver</small>", { dx: 120, dy: 260 }),
  drum: pin(Mo.eardrum, "EARDRUM<small>≈ silence</small>", { dx: 170, dy: -150 }),
  ear: pin(Mo.pinna, "YOUR EAR", { dx: -150, dy: 200, at: V(14, -10, 2) }),
  hum: pin(new THREE.Object3D(), "<b class='am'>100 HZ</b> HUM", { dx: -160, dy: -150 }),
  ruler13: pin(rulerEnd, "≈ 3.4 m<small>one wave · to scale</small>", { dx: 120, dy: 0, className: "ruler" }),
  squeak: pin(new THREE.Object3D(), "<b class='am'>5,000 HZ</b> SQUEAK", { dx: -170, dy: -200 }),
  sqRuler: pin(sqLabel, "≈ 7 cm<small>one wave</small>", { dx: -80, dy: -140, className: "ruler" }),
  cupSize: pin(cupLabel, "9.4 cm<small>the cup</small>", { dx: 120, dy: 80, className: "ruler" }),
  clatter: pin(new THREE.Object3D(), "SUDDEN CLATTER", { dx: -150, dy: -220 }),
  foam: pin(Mo.foam, "MEMORY FOAM", { dx: -200, dy: 150, at: V(-31, -6, 10) }),
  leather: pin(Mo.cover, "LEATHER COVER", { dx: -260, dy: -140, at: V(-31, 12, 19) }),
  blocks: pin(Mo.cover, "CUSHION<small>blocks the highs</small>", { dx: -150, dy: 230, at: V(-38, 0, 10) }),
  r1: pin(Mo.ffMic, "<b>1</b> HEAR<small>outside mic</small>", { dx: 200, dy: -90, className: "num" }),
  r2: pin(Mo.anc, "<b>2</b> FLIP<small>ANC chip</small>", { dx: -170, dy: -40, className: "num" }),
  r3: pin(Mo.drv, "<b>3</b> PLAY<small>40 mm driver</small>", { dx: 200, dy: 40, at: V(0, 20, 0), className: "num" }),
  r4: pin(Mo.cover, "<b>+</b> CUSHIONS<small>block the highs</small>", { dx: -170, dy: 90, at: V(30, 0, 10), className: "num" }),
};
// targets that are points in space
const leakAt = new THREE.Object3D();
leakAt.position.copy(flat(cupW(-40, 0, 6)));
const flipAt = new THREE.Object3D();
flipAt.position.copy(flat(cupW(-2, 0, 15)));
const humAt = new THREE.Object3D();
humAt.position.set(1500, 0, 420);
const squeakAt = new THREE.Object3D();
squeakAt.position.copy(sqPathA.clone().lerp(sqPathB, 0.45));
const clatterAt = new THREE.Object3D();
scene.add(leakAt, flipAt, humAt, squeakAt, clatterAt);
const retarget = (p, o) => (p.target = o);
retarget(pins.leak, leakAt);
retarget(pins.flipped, flipAt);
retarget(pins.hum, humAt);
retarget(pins.squeak, squeakAt);
retarget(pins.clatter, clatterAt);
const showPin = (p, from, to, d = 0.35) => {
  tl.to(p, { show: 1, duration: 0.5, ease: "power2.out" }, from);
  if (to != null) tl.to(p, { show: 0, duration: d, ease: "power1.in" }, to - d);
};

// ── the camera, shot by shot ──────────────────────────────────────────────────────────────────────────────
const cam = space.cam;
const move = (from, d, vars, ease = "power2.inOut") => tl.to(cam, { ...vars, duration: d, ease }, from);
const place = (when, vars) => tl.set(cam, { roll: 0, sway: 0, blur: 0, focus: 0, ...vars }, when);
const go = (when, vars, d = 0.6, ease = "power2.inOut") => tl.to(S, { ...vars, duration: d, ease }, when);
const snap = (when, vars) => tl.set(S, vars, when);
const on = (o, from, to, { fade = 0.4, opacity = 1 } = {}) => {
  tl.fromTo(o.state ?? o.st, { [o.state ? "opacity" : "on"]: 0 }, { [o.state ? "opacity" : "on"]: opacity, duration: fade, ease: "power1.out", immediateRender: false }, from);
  if (to != null) tl.to(o.state ?? o.st, { [o.state ? "opacity" : "on"]: 0, duration: Math.min(fade, 0.3), ease: "power1.in" }, to - Math.min(fade, 0.3));
};
const tint = (when, rgb, wash = 0.6, d = 1) => tl.to(set.state, { r: rgb[0], g: rgb[1], b: rgb[2], wash, duration: d, ease: "power2.inOut" }, when);
const WARM = [1, 0.62, 0.3];
const COOL = [0.35, 0.85, 1];
const PALE = [0.85, 0.85, 0.9];
const HERO = V(30, 32, -12); // the middle of the headphone standing on the desk

// s01: establish on the desk, the noise rolling in.
Object.assign(cam, { az: 58, el: 14, dist: 760, tx: HERO.x, ty: HERO.y + 34, tz: HERO.z, fov: 30, sway: 0.5 });
snap(0, { head: 0, desk: 1 });
hookRings.st.on = 1;
hookWave.state.opacity = 1;
tl.to(hookRings.st, { on: 0, duration: 0.3 }, s.s03.start - 0.3);
tl.to(hookWave.state, { opacity: 0, duration: 0.3 }, s.s03.start - 0.3);
tl.set(hookWave.state, { head: 0.55 }, 0);
tl.to(hookWave.state, { head: 1, duration: 1.4, ease: "power1.out" }, 0);
move(0, s.s01.dur + 0.2, { az: 30, el: 16, dist: 640, ty: HERO.y + 40 }, "power1.inOut");
// s02: the orbit carries on round to the inside of the right cup; the driver answers in cyan.
const CUSH_IN = cupW(0, 2, 6);
move(T("s02") + 0.15, 2.4, { az: -42, el: 9, dist: 250, tx: CUSH_IN.x, ty: CUSH_IN.y, tz: CUSH_IN.z, fov: 27 });
go(at("s02", "adding") - 0.15, { fabricGlow: 1 }, 0.5);
on(driverWave, at("s02", "adding"), s.s03.start, { fade: 0.4 });
tl.fromTo(driverWave.state, { head: 0 }, { head: 1, duration: 0.9, ease: "power2.out", immediateRender: false }, at("s02", "adding"));
move(T("s02", 1) - 0.65, 0.65, { dist: 130, fov: 22 }, "power2.in");
tint(T("s02"), WARM, 0.7);

// s03: inside the air.
snap(T("s03"), { head: 1 });
place(T("s03"), { az: 198, el: 6, dist: 320, tx: 152, ty: FIELD.y, tz: FIELD.z, fov: 26, sway: 0.6 });
snap(T("s03"), { fabricGlow: 0, desk: 0 });
on(air, T("s03"), T("s05") + 0.6, { fade: 0.3 });
move(T("s03"), s.s03.dur, { tx: 148, dist: 340, az: 194 }, "power1.inOut");
go(T("s03"), { slowNote: 1 }, 0.4);
// s04: the line draws; pull back to the head.
move(T("s04"), 2.1, { dist: 420, az: 190, el: 8, fov: 28, tx: 150 }, "power2.inOut");
tl.to(set.state, { lamps: 0.3, duration: 0.3 }, T("s03"));
tl.to(set.state, { lamps: 1, duration: 0.6 }, T("s04", 0.6));
on(fieldWave, at("s04", "air"), T("s05") - 0.2, { fade: 0.2 });
tl.fromTo(fieldWave.state, { head: 0 }, { head: 1, duration: 0.9, ease: "power1.inOut", immediateRender: false }, at("s04", "air"));
showPin(pins.squeezed, at("s04", "squeezed"), at("s04", "over") + 0.1);
showPin(pins.stretched, at("s04", "stretched"), at("s04", "over") + 0.1);
move(T("s04", 0.6), s.s04.dur * 0.4 + 0.1, { az: 150, el: 16, dist: 380, tx: cupBase.x + 40, ty: cupBase.y + 16, tz: cupBase.z, fov: 28 }, "power2.inOut");
go(T("s04", 0.9), { slowNote: 0 }, 0.3);

// s05: approach the outside mic.
move(T("s05"), 0.95, { az: 110, el: 22, dist: 118, tx: GRILLE.x, ty: GRILLE.y, tz: GRILLE.z, fov: 22, sway: 0.6 }, "power2.inOut");
move(T("s05") + 0.95, s.s05.dur - 0.95, { dist: 92, az: 104 }, "power1.inOut");
on(micRings, T("s05"), T("s06") + 0.6, { fade: 0.4 });
on(inWave, T("s05") + 0.2, T("s06") + 0.4);
tl.fromTo(inWave.state, { head: 0 }, { head: 1, duration: 2.6, ease: "power1.inOut", immediateRender: false }, T("s05") + 0.2);
showPin(pins.grille, at("s05", "microphone") - 0.1, T("s06") + 0.2);
go(at("s05", "hears"), { grilleGlow: 1 }, 0.35);
go(at("s05", "in."), { grilleGlow: 0.3 }, 0.5);
go(T("s05"), { scope: 1 }, 0.5);

// s06: the shell lifts off; down the flex to the chip.
go(T("s06") - 0.05, { lift: 1 }, 1.0, "power2.inOut");
move(T("s06"), 1.25, { az: 112, el: 30, dist: 70, tx: chipW.x, ty: chipW.y, tz: chipW.z, focus: 70, blur: 0.7, fov: 20 }, "power2.inOut");
move(T("s06") + 1.25, s.s06.dur - 1.25, { dist: 58, az: 104, focus: 58 }, "power1.inOut");
on(spark, T("s06") + 0.3, T("s07") + 0.2, { fade: 0.15 });
tl.fromTo(spark.state, { head: 0, tail: 0 }, { head: 1.05, tail: 0.85, duration: 0.9, ease: "power1.in", immediateRender: false }, T("s06") + 0.3);
showPin(pins.chip, at("s06", "chip") - 0.05, T("s07") + 0.1);
go(at("s06", "upside-down") - 0.2, { chipGlow: 1 }, 0.4);
go(T("s06", 1), { grilleGlow: 0 }, 0.2);

// s07: rise over the board; the two waves.
move(T("s07"), 1.8, { az: 86, el: 16, dist: 175, tx: OVER.x, ty: OVER.y + 6, tz: OVER.z, blur: 0, fov: 24 }, "power2.inOut");
move(T("s07") + 1.8, s.s07.dur - 1.8, { az: 76, el: 8 }, "power1.inOut");
on(noise7, T("s07") + 0.1, T("s08") + 0.3);
on(flip7, T("s07") + 0.35, T("s08") + 0.3);
tl.fromTo(noise7.state, { head: 0 }, { head: 1, duration: 0.8, ease: "power1.out", immediateRender: false }, T("s07") + 0.1);
tl.fromTo(flip7.state, { head: 0 }, { head: 1, duration: 0.8, ease: "power1.out", immediateRender: false }, T("s07") + 0.35);
on(link1, at("s07", "stretch"), T("s08") + 0.2, { fade: 0.25, opacity: 0.8 });
on(link2, at("s07", "squeeze"), T("s08") + 0.2, { fade: 0.25, opacity: 0.8 });
showPin(pins.noise7, at("s07", "squeezes,") - 0.05, T("s08"));
showPin(pins.flip7, at("s07", "stretch") - 0.05, T("s08"));
showPin(pins.noise7b, at("s07", "stretches.") - 0.05, T("s08"));
showPin(pins.flip7b, at("s07", "squeeze") - 0.05, T("s08"));
go(T("s07", 0.9), { chipGlow: 0 }, 0.4);

// s08: the cup opens along its axis; close on the driver; it plays the flipped wave toward the ear.
go(T("s08") - 0.1, { lift: 0, open: 1 }, 1.1, "power2.inOut");
const DRV_C = cupW(0, 2, 28 + 78);
const EAR_DRV = A.ear.clone().lerp(DRV_OPEN, 0.6).add(V(0, 4, -6));
move(T("s08"), 1.0, { az: 18, el: 14, dist: 470, tx: EAR_DRV.x, ty: EAR_DRV.y, tz: EAR_DRV.z, fov: 26, blur: 0 }, "power2.inOut");
move(T("s08") + 1.0, s.s08.dur - 1.0, { az: 26, el: 10, dist: 420 }, "power1.inOut");
go(T("s06"), { scope: 0 }, 0.3);
go(T("s09"), { scope: 1 }, 0.3);
showPin(pins.driver, at("s08", "speaker") - 0.05, T("s09") + 0.1);
showPin(pins.ear, at("s08", "ear,") - 0.1, T("s09") + 0.1);
showPin(pins.drvSize, at("s08", "speaker") + 0.3, T("s09") + 0.1);
on(drvRuler, at("s08", "speaker") + 0.3, T("s09") + 0.1, { opacity: 0.9 });
on(cyan8, at("s08", "flipped") - 0.1, T("s09") + 0.3);
tl.fromTo(cyan8.state, { head: 0 }, { head: 1, duration: 1.0, ease: "power1.out", immediateRender: false }, at("s08", "flipped") - 0.1);
on(driverRings, at("s08", "flipped") - 0.1, T("s09") + 0.2, { opacity: 0.8 });
go(at("s08", "flipped") - 0.3, { cone: 1 }, 0.3);
go(T("s09") + 0.6, { cone: 0 }, 0.4);
tint(T("s08"), COOL, 0.7);

// s09: close up, cut through; the two add up to almost nothing.
go(T("s09") - 0.05, { open: 0 }, 0.8, "power2.inOut");
snap(T("s09"), { head: 1 });
place(T("s09"), { az: 90, el: 80, dist: 270, tx: MOUTH.x + 16, ty: CUT_Y, tz: -8, fov: 26 });
tl.set(S, { cut: 60 }, T("s09"));
go(T("s09"), { cut: CUT_Y }, 0.9, "power2.out");
move(T("s09"), s.s09.dur, { el: 84, dist: 235, az: 86 }, "power1.inOut");
on(cutRings, T("s09"), T("s10"), { fade: 0.4, opacity: 0.9 });
on(amber9, T("s09") + 0.1, T("s10") + 0.1);
tl.fromTo(amber9.state, { head: 0.35 }, { head: 1, duration: 1.1, ease: "power1.inOut", immediateRender: false }, T("s09") + 0.1);
on(cyan9, at("s09", "two") - 0.1, T("s10") + 0.1);
tl.fromTo(cyan9.state, { head: 0 }, { head: 1, duration: 0.8, ease: "power1.out", immediateRender: false }, at("s09", "two") - 0.1);
on(sum9, at("s09", "almost") - 0.1, T("s10") + 0.1);
tl.fromTo(C9, { residual: 0.6 }, { residual: 0.03, duration: 0.8, ease: "power2.out", immediateRender: false }, at("s09", "almost") - 0.1);
// once both are there, the parts of them inside the canal give way to their sum
tl.to(amber9.state, { head: 1 - (Mo.canalCurve.getLength() + 4) / LA, duration: 0.5 }, at("s09", "almost"));
tl.to(cyan9.state, { head: 1 - (Mo.canalCurve.getLength() + 4) / LC, duration: 0.5 }, at("s09", "almost"));
showPin(pins.leak, T("s09") + 0.45, T("s10") + 0.05);
showPin(pins.flipped, at("s09", "two"), T("s10") + 0.05);
showPin(pins.drum, after("s09", "nothing.") - 0.1, T("s10") + 0.05);
go(T("s09") + 0.3, { illus: 1 }, 0.3);
go(T("s10") - 0.2, { illus: 0 }, 0.2);
tint(at("s09", "almost"), PALE, 0.35, 0.8);

// s10: the three lanes float free; the name.
snap(T("s10"), { cut: 1e5 });
place(T("s10"), { az: 172, el: 4, dist: 300, tx: FREE.x, ty: FREE.y + 6, tz: FREE.z, fov: 26, sway: 0.3 });
tl.to(set.state, { lamps: 0.35, duration: 0.3 }, T("s10"));
tl.to(set.state, { lamps: 1, duration: 0.3 }, T("s12"));
move(T("s10"), s.s10.dur, { az: 186 }, "power1.inOut");
go(T("s10") - 0.1, { scope: 0 }, 0.2);
snap(T("s12"), { scope: 1 });
for (const [k, o] of Object.entries(lanes)) {
  on(o, T("s10") + 0.1 + "abc".indexOf(k) * 0.12, T("s12"));
  tl.fromTo(o.state, { head: 0 }, { head: 1, duration: 0.7, ease: "power1.out", immediateRender: false }, T("s10") + 0.1 + "abc".indexOf(k) * 0.12);
}
// s11: the copy slips late (to the right, along the time arrow) and comes back.
move(T("s11"), s.s11.dur, { az: 180, el: 2, dist: 290, ty: FREE.y + 6 }, "power1.inOut");
tl.to(SH, { shift: 1 / 6, duration: 0.7, ease: "power2.inOut" }, at("s11", "copy"));
tl.to(SH, { shift: 0, duration: 0.6, ease: "power2.inOut" }, at("s11", "in") - 0.35);
tint(T("s11"), WARM, 0.6, 0.6);

// s12: the head whole; then the crane up to see the hum to scale.
snap(T("s12"), { fogNear: 4000, fogFar: 26000 });
place(T("s12"), { az: 128, el: 12, dist: 980, tx: 0, ty: 10, tz: -14, fov: 30 });
move(T("s12") + 0.25, 3.3, { az: 92, el: 88, dist: 7400, tx: -760, ty: 0, tz: 0 }, "power2.inOut");
on(humRings, T("s12"), T("s14"), { fade: 0.5, opacity: 0.85 });
on(humWave, T("s12") + 1.2, T("s14"), { fade: 0.8 });
showPin(pins.hum, at("s12", "hum,"), T("s13"));
go(at("s12", "easy.") - 0.1, { cupGlow: 1 }, 0.25);
go(at("s12", "easy.") + 0.45, { cupGlow: 0 }, 0.6);
// s13: the ruler.
move(T("s13"), s.s13.dur, { tx: -700, az: 91 }, "power1.inOut");
on(ruler13, at("s13", "metres") - 0.1, T("s14"));
tl.fromTo(ruler13.state, { head: 0 }, { head: 1, duration: 0.9, ease: "power2.inOut", immediateRender: false }, at("s13", "metres") - 0.1);
showPin(pins.ruler13, at("s13", "long") - 0.1, T("s14"));
go(T("s12") + 0.8, { scaleNote: 1 }, 0.4);
go(T("s14"), { scaleNote: 0 }, 0.2);
// s14: the chart over the dimmed scene.
go(T("s14") - 0.05, { vis: 0.32, scope: 0 }, 0.4);
move(T("s14"), s.s14.dur, { tx: -650 }, "none");

// s15: back down at the head, to scale; the squeak.
snap(T("s15"), { vis: 1, fogNear: 900, fogFar: 5200, scope: 1 });
place(T("s15"), { az: 34, el: 10, dist: 560, tx: cupBase.x - 10, ty: 16, tz: -2, fov: 28 });
move(T("s15"), s.s15.dur, { az: 40, dist: 470, tx: cupBase.x + 6 }, "power2.inOut");
on(squeakRings, T("s15"), T("s17"), { fade: 0.3 });
on(squeakWave, T("s15") + 0.15, T("s17"));
tl.fromTo(squeakWave.state, { head: 0 }, { head: 1, duration: 0.8, ease: "power1.out", immediateRender: false }, T("s15") + 0.15);
showPin(pins.squeak, at("s15", "squeak") - 0.05, T("s16"));
go(T("s15") + 0.4, { scaleNote: 1 }, 0.3);
// s16: push in; the rulers.
move(T("s16"), s.s16.dur, { az: 56, el: 8, dist: 300, tx: cupBase.x + 20, ty: 22, tz: 4, fov: 24 }, "power2.inOut");
for (const o of [sqRuler, sqTick0, sqTick1]) on(o, at("s16", "few") - 0.2, T("s17"), { opacity: 0.9 });
showPin(pins.sqRuler, at("s16", "centimetres") - 0.1, T("s17"));
on(cupRuler, at("s16", "centimetres") + 0.2, T("s17"), { opacity: 0.8 });
showPin(pins.cupSize, at("s16", "centimetres") + 0.25, T("s17"));
go(T("s17") - 0.2, { scaleNote: 0 }, 0.2);
// s17: the chart again.
go(T("s17") - 0.05, { vis: 0.32, scope: 0 }, 0.4);

// s18: the clatter.
snap(T("s18"), { vis: 1, scope: 1 });
place(T("s18"), { az: 128, el: 6, dist: 600, tx: cupBase.x - 30, ty: -10, tz: -20, fov: 28, sway: 0.4 });
move(T("s18"), s.s18.dur, { az: 118, el: 10, dist: 520 }, "power1.inOut");
const CLAT_HIT = at("s18", "harder");
const clatDist = CLAT.distanceTo(cupW(0, 0, 30));
tl.set(clatter.state, { r: 0.1, opacity: 0 }, T("s18") + 0.2);
tl.to(clatter.state, { opacity: 1, duration: 0.15 }, T("s18") + 0.2);
tl.to(clatter.state, { r: clatDist, duration: CLAT_HIT - T("s18") - 0.2, ease: "none" }, T("s18") + 0.2);
tl.to(clatter.state, { r: clatDist * 2.4, opacity: 0, duration: 1.0, ease: "power1.out" }, CLAT_HIT);
showPin(pins.clatter, at("s18", "clatter") - 0.1, T("s18b"));
film.hit(CLAT_HIT, 0.6, 0);
// s18b: the chart.
go(T("s18b") - 0.05, { vis: 0.32, scope: 0 }, 0.4);

// s19: low and close on the cushion; it cuts open to show the foam.
snap(T("s19"), { vis: 1, scope: 1 });
const CUSH = cupW(-30, -4, 9);
place(T("s19"), { az: 24, el: 10, dist: 260, tx: CUSH.x, ty: CUSH.y, tz: CUSH.z + 4, fov: 22, sway: 0.6 });
move(T("s19"), s.s19.dur, { az: 34, el: 6, dist: 215 }, "power1.inOut");
tl.set(S, { cutC: 80 }, T("s19"));
go(at("s19", "cushions") - 0.2, { cutC: CUSH.z + 1.5 }, 0.9, "power2.inOut");
showPin(pins.foam, at("s19", "cushions") + 0.5, T("s20"));
showPin(pins.leather, at("s19", "still"), T("s20"));
// s20: from above, the cut; the highs bounce off.
snap(T("s20"), { cutC: 1e5 });
place(T("s20"), { az: 80, el: 80, dist: 290, tx: MOUTH.x + 18, ty: CUT_Y, tz: -8, fov: 26 });
tl.set(S, { cut: 60 }, T("s20"));
go(T("s20"), { cut: CUT_Y }, 0.8, "power2.out");
move(T("s20"), s.s20.dur, { az: 96, el: 84, dist: 260 }, "power1.inOut");
on(squeakCutRings, T("s20"), T("s21"), { fade: 0.3 });
on(faint20, T("s20") + 0.2, T("s21"));
tl.fromTo(faint20.state, { head: 0.2 }, { head: 1, duration: 1.4, ease: "power1.inOut", immediateRender: false }, T("s20") + 0.2);
tl.fromTo(C20, { inside: 0.6 }, { inside: 0.12, duration: 0.6, ease: "power2.out", immediateRender: false }, at("s20", "block"));
showPin(pins.blocks, at("s20", "block") - 0.05, T("s21"));
go(T("s20") + 0.3, { illus: 1 }, 0.3);
go(T("s21") - 0.2, { illus: 0 }, 0.2);
tint(T("s19"), WARM, 0.6);

// s21: the recap: the right cup alone, standing on the desk, opened into a tower; the four pins.
snap(T("s21"), { cut: 1e5, head: 0, desk: 1, tower: 1, scope: 0 });
const TOWER = V(-8, 40, -12);
place(T("s21"), { az: 34, el: 16, dist: 640, tx: TOWER.x, ty: TOWER.y + 6, tz: TOWER.z, fov: 28, sway: 0.4 });
move(T("s21"), s.s21.dur, { az: 52, el: 14, dist: 600 }, "power1.inOut");
go(T("s21") + 0.05, { open: 1 }, 1.1, "power2.inOut");
showPin(pins.r1, at("s21", "answer:") - 0.05, T("s22") - 0.1);
showPin(pins.r2, at("s21", "headphones") - 0.05, T("s22") - 0.1);
showPin(pins.r3, at("s21", "noise"), T("s22") - 0.1);
showPin(pins.r4, at("s21", "own") - 0.1, T("s22") - 0.1);
tint(T("s21"), COOL, 0.55);
// s22: back to the ear, cut open: they meet, exactly opposite, and vanish.
snap(T("s22"), { tower: 0, head: 1, desk: 0, open: 0, scope: 1 });
place(T("s22"), { az: 92, el: 84, dist: 215, tx: MOUTH.x + 14, ty: CUT_Y, tz: -8, fov: 26 });
tl.set(S, { cut: CUT_Y }, T("s22"));
move(T("s22"), s.s22.dur, { el: 78, dist: 320, az: 88 }, "power2.inOut");
on(cutRings, T("s22"), T("s23"), { fade: 0.3, opacity: 0.8 });
on(amber9, T("s22") + 0.05, T("s23"));
on(cyan9, T("s22") + 0.05, T("s23"));
tl.set(amber9.state, { head: 1 - (Mo.canalCurve.getLength() + 4) / LA }, T("s22"));
tl.set(cyan9.state, { head: 1 - (Mo.canalCurve.getLength() + 4) / LC }, T("s22"));
on(sum9, T("s22") + 0.05, T("s23"));
tl.set(C9, { residual: 0.25 }, T("s22"));
const RINGS = after("s22", "time.") + 0.12;
tl.to(C9, { residual: 0, duration: 0.5, ease: "power2.out" }, at("s22", "right"));
tl.set(D22, { r: 26, o: 0 }, at("s22", "right"));
tl.to(D22, { o: 1, duration: 0.2 }, at("s22", "right"));
tl.to(D22, { r: 0.5, duration: RINGS - at("s22", "right"), ease: "power2.in" }, at("s22", "right"));
tl.to(D22, { o: 0, duration: 0.25 }, RINGS);
tl.to([amber9.state, cyan9.state, sum9.state, cutRings.st], { opacity: 0, on: 0, duration: 0.5, ease: "power1.in" }, RINGS);
film.hit(RINGS, 0.7, 0);
go(T("s22") + 0.3, { illus: 1 }, 0.3);
go(T("s23") - 0.2, { illus: 0, scope: 0 }, 0.2);
tint(T("s22"), PALE, 0.35, 0.6);
// s23: the poster, the headphone on the desk as in the first frame.
snap(T("s23"), { cut: 1e5, head: 0, desk: 1 });
place(T("s23"), { az: 44, el: 16, dist: 700, tx: HERO.x, ty: HERO.y + 34, tz: HERO.z, fov: 30, sway: 0.5 });
move(T("s23"), s.s23.dur, { az: 58, el: 14, dist: 760 }, "power1.inOut");
on(hookRings, T("s23") + 0.5, null, { fade: 1.2, opacity: 0.6 });
tint(T("s23"), WARM, 0.7, 1.2);

// ── HTML: title, notes, the sum's lanes, charts, poster ──────────────────────────────────────────────────
film.captions();
// kit bug: in the "frame" style a word group shorter than its 0.24 s rise never hides again (the rise ends after
// the fall). Every caption is hidden outside its own shot, whatever the tweens left.
const capEls = [...document.querySelectorAll("#captions .caption")];
film.each((t) => {
  for (const el of capEls) {
    const sh = s[el.dataset.shot];
    if (sh && (t < sh.start - 0.3 || t >= sh.end)) el.style.visibility = "hidden";
  }
});
film.scene("#hook", 0, s.s02.start + 0.4);
const tchars = film.split("#title");
const lines = $$("#title .ln");
// frame 0 is finished: the first line already set; the other two type in as they are said
tl.set(lines[0].querySelectorAll(".ch"), { opacity: 1 }, 0);
film.typeIn([...lines[1].querySelectorAll(".ch")], at("s01", "headphones") - 0.1);
film.typeIn([...lines[2].querySelectorAll(".ch")], at("s01", "a") - 0.05);
film.sheen("#title", at("s01", "disappear?") + 0.4);
film.typeOut(tchars, s.s02.start + 0.05);

film.scene("#notes", s.s03.start, s.s17.start);
tl.set(["#note-slow", "#note-scale"], { autoAlpha: 0 }, 0);
film.each(() => {
  $("#note-slow").style.opacity = S.slowNote;
  $("#note-slow").style.visibility = S.slowNote > 0.01 ? "visible" : "hidden";
  $("#note-scale").style.opacity = S.scaleNote;
  $("#note-scale").style.visibility = S.scaleNote > 0.01 ? "visible" : "hidden";
});

film.scene("#sum", s.s10.start, s.s12.start);
gsap.set(["#lane-a", "#lane-b", "#lane-c", "#sign-plus", "#sign-eq"], { opacity: 0 });
for (const [i, sel] of ["#lane-a", "#sign-plus", "#lane-b", "#sign-eq", "#lane-c"].entries()) tl.to(sel, { opacity: 1, duration: 0.3 }, T("s10") + 0.15 + i * 0.08);
gsap.set("#timeaxis", { opacity: 0 });
tl.to("#timeaxis", { opacity: 1, duration: 0.3 }, T("s11") + 0.1);
// the lanes' labels sit by the lanes: placed from the 3D each frame
const laneEls = { a: [$("#lane-a"), 17.3], b: [$("#lane-b"), 0], c: [$("#lane-c"), -17.3] };
const signEls = [[$("#sign-plus"), 8.6], [$("#sign-eq"), -8.6]];
const proj = (p) => {
  const v = p.clone().project(camera);
  return [(v.x * 0.5 + 0.5) * film.W, (-v.y * 0.5 + 0.5) * film.H];
};

// The charts: one panel, the same 10 ms of time on each, the traces computed from the facts.
film.scene("#charts", s.s14.start, s.s19.start);
const plot = $("#plot");
const svgNS = "http://www.w3.org/2000/svg";
const el = (tag, attrs, parent = plot) => {
  const e = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent.appendChild(e);
  return e;
};
const X0 = 40;
const X1 = 826;
const MS = 10; // ms across
const xOf = (ms) => X0 + ((X1 - X0) * ms) / MS;
const DELAY = 1 / 30; // ms (1/30,000 s)
const trace = (g, f, y0, amp, color, n = 2400, w = 3) => {
  let d = "";
  for (let i = 0; i <= n; i++) {
    const ms = (i / n) * MS;
    d += `${i ? "L" : "M"}${xOf(ms).toFixed(2)} ${(y0 - amp * f(ms)).toFixed(2)}`;
  }
  return el("path", { d, fill: "none", stroke: color, "stroke-width": w, "stroke-linejoin": "round", pathLength: 1 }, g);
};
const label = (g, x, y, text, color = "rgba(255,255,255,0.75)", size = 30, anchor = "start", weight = 600) => {
  const t = el("text", { x, y, fill: color, "font-size": size, "font-weight": weight, "text-anchor": anchor, "letter-spacing": "0.06em" }, g);
  t.textContent = text;
  return t;
};
const axis = (g, y) => {
  el("line", { x1: X0, y1: y, x2: X1, y2: y, stroke: "rgba(255,255,255,0.18)", "stroke-width": 2 }, g);
};
const bar = (g, x, top, h, pct, color, name) => {
  el("rect", { x, y: top + (1 - pct) * h, width: 150, height: Math.max(3, pct * h), rx: 6, fill: color }, g);
  label(g, x + 75, top + h + 44, name, "rgba(255,255,255,0.85)", 30, "middle");
};
const ROWS = [150, 330, 510];
function chart(id, f, { bars, zoom } = {}) {
  const g = el("g", { id, opacity: 0 });
  const names = [["NOISE", "#ffb547"], ["FLIPPED COPY, LATE", "#3fe0ff"], ["WHAT IS LEFT", "#ffffff"]];
  const fs = [f, (ms) => -f(ms - DELAY), (ms) => f(ms) - f(ms - DELAY)];
  const paths = [];
  ROWS.forEach((y, i) => {
    label(g, X0, y - 78, names[i][0], names[i][1], 30);
    axis(g, y);
    paths.push(trace(g, fs[i], y, 62, names[i][1], 2400, i === 2 ? 3.5 : 3));
  });
  // the time axis
  el("line", { x1: X0, y1: 600, x2: X1 - 20, y2: 600, stroke: "rgba(255,255,255,0.55)", "stroke-width": 2 }, g);
  el("path", { d: `M${X1 - 20} 592 L${X1} 600 L${X1 - 20} 608 Z`, fill: "rgba(255,255,255,0.55)" }, g);
  label(g, X0, 644, "0", "rgba(255,255,255,0.6)", 30);
  label(g, X1, 644, "10 ms →", "rgba(255,255,255,0.6)", 30, "end");
  label(g, (X0 + X1) / 2, 644, "TIME", "rgba(255,255,255,0.6)", 30, "middle");
  if (bars) {
    const bg = el("g", { class: "bars" }, g);
    bar(bg, 190, 680, 120, 1, "#ffb547", "noise 100%");
    bar(bg, 520, 680, 120, bars, "#ffffff", `left over ${Math.round(bars * 100)}%`);
  }
  return { g, paths };
}
const hum = (ms) => Math.sin(TAU * 0.1 * ms + 0.4); // 100 Hz: 0.1 cycles a ms
const sq = (ms) => Math.sin(TAU * 5 * ms + 0.4); // 5,000 Hz: 5 cycles a ms
const leftHum = 2 * Math.sin(Math.PI * 100 / 30000);
const leftSq = 2 * Math.sin(Math.PI * 5000 / 30000);
// the clatter: a burst at 2.5 ms ringing away; the chip's copy is the burst smoothed (it cannot follow faster
// than about a millisecond) and late by the same 0.033 ms (f10)
const burst = (ms) => (ms < 2.5 ? 0 : Math.exp(-(ms - 2.5) / 1.3) * (0.75 * Math.sin(TAU * 3.1 * (ms - 2.5)) + 0.45 * Math.sin(TAU * 7.3 * (ms - 2.5) + 1) + 0.3 * Math.sin(TAU * 1.7 * (ms - 2.5))));
const smoothBurst = (() => {
  const n = 4000;
  const out = new Float32Array(n + 1);
  let y = 0;
  const dt = MS / n;
  const tau = 0.9;
  for (let i = 0; i <= n; i++) {
    y += ((burst(i * dt) - y) * dt) / tau;
    out[i] = y * 2.2;
  }
  return (ms) => (ms <= 0 ? 0 : out[Math.min(n, Math.round((ms / MS) * n))]);
})();
const cHum = chart("c-hum", hum, { bars: leftHum });
const cSq = chart("c-sq", sq, { bars: leftSq });
const cCl = (() => {
  const g = el("g", { id: "c-cl", opacity: 0 });
  const names = [["CLATTER", "#ffb547"], ["THE CHIP'S COPY", "#3fe0ff"], ["WHAT IS LEFT", "#ffffff"]];
  const fs = [burst, (ms) => -smoothBurst(ms - DELAY), (ms) => burst(ms) - smoothBurst(ms - DELAY)];
  const paths = [];
  ROWS.forEach((y, i) => {
    label(g, X0, y - 78, names[i][0], names[i][1], 30);
    axis(g, y);
    paths.push(trace(g, fs[i], y, 62, names[i][1], 2400, 3));
  });
  el("line", { x1: X0, y1: 600, x2: X1 - 20, y2: 600, stroke: "rgba(255,255,255,0.55)", "stroke-width": 2 }, g);
  el("path", { d: `M${X1 - 20} 592 L${X1} 600 L${X1 - 20} 608 Z`, fill: "rgba(255,255,255,0.55)" }, g);
  label(g, X0, 644, "0", "rgba(255,255,255,0.6)", 30);
  label(g, X1, 644, "10 ms →", "rgba(255,255,255,0.6)", 30, "end");
  label(g, (X0 + X1) / 2, 644, "TIME", "rgba(255,255,255,0.6)", 30, "middle");
  label(g, X0, 740, "its sharp front gets through", "rgba(255,255,255,0.85)", 34);
  return { g, paths };
})();
// the squeak's magnifier: two cycles, ten times wider, the copy one sixth of a cycle late
const mag = el("g", { id: "mag", opacity: 0 });
{
  const cx = 600;
  const cy = 330;
  const r = 150;
  el("clipPath", { id: "magclip" }, mag).appendChild(Object.assign(document.createElementNS(svgNS, "circle"), {})).setAttribute("r", r);
  mag.querySelector("#magclip circle").setAttribute("cx", cx);
  mag.querySelector("#magclip circle").setAttribute("cy", cy);
  el("circle", { cx, cy, r, fill: "rgba(10,11,14,0.92)", stroke: "rgba(255,255,255,0.85)", "stroke-width": 2.5 }, mag);
  const inner = el("g", { "clip-path": "url(#magclip)" }, mag);
  const z = (ms) => cx - r + ((ms - 3) / 0.4) * (2 * r); // 0.4 ms across the lens
  const tr = (f, y, color) => {
    let d = "";
    for (let i = 0; i <= 300; i++) {
      const ms = 3 + (i / 300) * 0.4;
      d += `${i ? "L" : "M"}${z(ms).toFixed(1)} ${(y - 46 * f(ms)).toFixed(1)}`;
    }
    el("path", { d, fill: "none", stroke: color, "stroke-width": 3.5 }, inner);
  };
  tr(sq, cy - 60, "#ffb547");
  tr((ms) => -sq(ms - DELAY), cy + 60, "#3fe0ff");
  label(mag, cx, cy + r + 44, "ZOOM ×10", "rgba(255,255,255,0.85)", 30, "middle");
}
// the panel's titles and notes
gsap.set(["#pt-hum", "#pt-squeak", "#pt-clatter", "#pn-delay", "#pn-ill"], { autoAlpha: 0 });
gsap.set("#panel", { autoAlpha: 0, y: 40 });
const panelIn = (t) => tl.to("#panel", { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out" }, t);
const panelOut = (t) => tl.to("#panel", { autoAlpha: 0, y: 30, duration: 0.25, ease: "power1.in" }, t - 0.25);
const drawPaths = (paths, t0) => paths.forEach((p, i) => {
  const st = { off: 1 };
  p.style.strokeDasharray = "1";
  film.each(() => (p.style.strokeDashoffset = st.off.toFixed(4)));
  tl.fromTo(st, { off: 1 }, { off: 0, duration: 0.7, ease: "power1.inOut", immediateRender: false }, t0 + i * 0.22);
});
const showG = (g, a, b) => {
  tl.set(g, { attr: { opacity: 1 } }, a);
  tl.set(g, { attr: { opacity: 0 } }, b);
};
// s14
panelIn(T("s14"));
tl.set("#pt-hum", { autoAlpha: 1 }, T("s14"));
tl.set("#pt-hum", { autoAlpha: 0 }, T("s15"));
tl.set("#pn-delay", { autoAlpha: 1 }, T("s14"));
showG(cHum.g, T("s14"), T("s15"));
drawPaths(cHum.paths, T("s14") + 0.15);
const barsIn = (g, t) => {
  const b = g.querySelector(".bars");
  gsap.set(b, { opacity: 0 });
  tl.to(b, { opacity: 1, duration: 0.35 }, t);
};
barsIn(cHum.g, at("s14", "match") - 0.1);
panelOut(T("s15"));
// s17
panelIn(T("s17"));
tl.set("#pt-squeak", { autoAlpha: 1 }, T("s17"));
tl.set("#pt-squeak", { autoAlpha: 0 }, T("s18"));
showG(cSq.g, T("s17"), T("s18"));
drawPaths(cSq.paths, T("s17") + 0.1);
showG(mag, at("s17", "delay") - 0.1, T("s18"));
barsIn(cSq.g, at("s17", "out") - 0.15);
panelOut(T("s18"));
// s18b
panelIn(T("s18b"));
tl.set("#pn-delay", { autoAlpha: 0 }, T("s18b"));
tl.set(["#pt-clatter", "#pn-ill"], { autoAlpha: 1 }, T("s18b"));
showG(cCl.g, T("s18b"), T("s19"));
drawPaths(cCl.paths, T("s18b") + 0.1);
panelOut(T("s19"));

film.scene("#end", s.s23.start, film.duration);
const posterChars = film.split("#poster");
film.typeIn(posterChars, T("s23") + 0.15, { stagger: 0.025 });
film.sheen("#poster", T("s23") + 1.3);

// ── instruments: the eardrum scope, the "illustrative" tag, the "slowed" tag ─────────────────────────────────
// What reaches the eardrum, as a pure function of time: the noise there (after the cushion), minus what the
// flipped wave cancels. The trace is slowed down (its time axis is a second and a half wide).
const scope = Object.assign(document.createElement("canvas"), { id: "scope", width: 900, height: 230 });
$("#root").insertBefore(scope, $("#captions"));
const sctx = scope.getContext("2d");
const lerpKeys = (keys) => (x) => {
  if (x <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (x <= keys[i][0]) {
    const [a, va] = keys[i - 1];
    const [b, vb] = keys[i];
    const u = (x - a) / (b - a);
    return va + (vb - va) * u * u * (3 - 2 * u);
  }
  return keys.at(-1)[1];
};
// how much hum reaches the eardrum (0..1), and how much of it the flipped wave leaves (1 = none cancelled)
const humIn = lerpKeys([[0, 0.8], [s.s15.start - 0.2, 0.8], [s.s15.start, 0], [s.s22.start - 0.1, 0], [s.s22.start, 0.8]]);
const leftOver = lerpKeys([
  [0, 1], [at("s09", "two"), 1], [after("s09", "nothing."), 0.03], [at("s11", "copy"), 0.03], [at("s11", "copy") + 0.7, 1], [at("s11", "in") - 0.35, 1], [at("s11", "in") + 0.25, 0.03],
  [s.s12.start, 0.03], [s.s22.start - 0.1, 0.03], [s.s22.start, 0.5], [at("s22", "right"), 0.5], [RINGS, 0],
]);
const squeakIn = lerpKeys([[0, 0], [s.s15.start, 0], [s.s15.start + 0.4, 0.7], [s.s18.start - 0.1, 0.7], [s.s18.start, 0], [s.s20.start, 0], [s.s20.start + 0.3, 0.7], [at("s20", "block"), 0.7], [at("s20", "block") + 0.5, 0.12], [s.s21.start, 0.12]]);
const clatterIn = (x) => (x > CLAT_HIT && x < CLAT_HIT + 0.8 ? Math.exp(-(x - CLAT_HIT) / 0.12) * Math.sin(TAU * 21 * (x - CLAT_HIT)) * 1.1 : 0);
const atDrum = (x) => humIn(x) * leftOver(x) * Math.sin(TAU * 3 * x) + squeakIn(x) * Math.sin(TAU * 26 * x) * 0.8 + clatterIn(x);
gsap.set(scope, { autoAlpha: 0 });
film.each((t) => {
  scope.style.opacity = S.scope;
  scope.style.visibility = S.scope > 0.01 ? "visible" : "hidden";
  if (S.scope <= 0.01) return;
  const w = scope.width;
  const h = scope.height;
  sctx.clearRect(0, 0, w, h);
  sctx.font = '600 30px "JetBrains Mono Variable", monospace';
  sctx.fillStyle = "rgba(255,255,255,0.78)";
  sctx.fillText("SOUND AT THE EARDRUM", 0, 32);
  sctx.fillStyle = "rgba(255,255,255,0.45)";
  sctx.textAlign = "right";
  sctx.fillText("SLOWED", w - 10, 32);
  sctx.textAlign = "left";
  const mid = 132;
  sctx.strokeStyle = "rgba(255,255,255,0.16)";
  sctx.lineWidth = 1.5;
  sctx.beginPath();
  sctx.moveTo(0, mid);
  sctx.lineTo(w, mid);
  sctx.stroke();
  for (let i = 0; i <= 10; i++) {
    sctx.beginPath();
    sctx.moveTo((i / 10) * (w - 20), mid - 6);
    sctx.lineTo((i / 10) * (w - 20), mid + 6);
    sctx.stroke();
  }
  const n = 420;
  const span = 1.5;
  const live = Math.min(1, Math.abs(atDrum(t)) + 0.0);
  sctx.strokeStyle = leftOver(t) < 0.2 && squeakIn(t) < 0.2 && humIn(t) > 0.2 ? "#3fe0ff" : "#ffb547";
  sctx.lineWidth = 2.5;
  sctx.shadowColor = sctx.strokeStyle;
  sctx.shadowBlur = 10;
  sctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const x = t - span + (i / n) * span;
    const y = mid - 68 * Math.max(-1.2, Math.min(1.2, atDrum(x)));
    const px = (i / n) * (w - 20);
    i ? sctx.lineTo(px, y) : sctx.moveTo(px, y);
  }
  sctx.stroke();
  sctx.shadowBlur = 0;
  sctx.fillStyle = sctx.strokeStyle;
  sctx.beginPath();
  sctx.arc(w - 20, mid - 68 * Math.max(-1.2, Math.min(1.2, atDrum(t))), 6, 0, TAU);
  sctx.fill();
  void live;
});
const shade = Object.assign(document.createElement("div"), { id: "topshade" });
$("#space").after(shade);
const tag = Object.assign(document.createElement("p"), { id: "illus", className: "tag", textContent: "ILLUSTRATIVE CUTAWAY · NOT TO SCALE" });
$("#root").insertBefore(tag, $("#captions"));
film.each(() => {
  tag.style.opacity = S.illus;
  tag.style.visibility = S.illus > 0.01 ? "visible" : "hidden";
});

// ── each frame ────────────────────────────────────────────────────────────────────────────────────────────
const eye = new THREE.Object3D();
const crestAt = (t, want) => {
  // the field wave: 13 cos(-(2π((x-55)/20 + 0.85 t))); its value at path distance u; the travelling bands move -x
  // place the pin's dummy on the first crest (or trough) past the middle of the field
  const k = (u) => 13 * Math.cos(TAU * ((u - 55) / 20 - 0.85 * t));
  let best = 44;
  let bestV = -1e9;
  for (let u = 44; u <= 66; u += 0.25) {
    const v = want * k(u);
    if (v > bestV) (bestV = v), (best = u);
  }
  return FIELD.clone().add(V(55 - best, want * 13, -14));
};
film.each((t) => {
  // the whole layer
  Mo.head.visible = S.head > 0.5;
  set.state.desk = S.desk;
  if (S.tower > 0.5) {
    Mo.phones.rotation.set(0, 0, Math.PI / 2);
    Mo.phones.position.set(0, -110, 0);
  } else {
    Mo.phones.rotation.set(0, 0, 0);
    Mo.phones.position.set(0, 0, 0);
  }
  // the parts' poses
  for (const m of moving) m.o.position.copy(m.base).addScaledVector(m.open, S.open).addScaledVector(m.lift, S.lift);
  Mo.fabric.visible = !(S.open > 0.05 && S.tower < 0.5); // out of the way while the driver plays to the ear
  Mo.setCone(S.cone * 0.9 * Math.sin(TAU * 1.6 * t));
  glowMats.fabric.emissive.setRGB(0.05 * S.fabricGlow, 0.5 * S.fabricGlow, 0.62 * S.fabricGlow);
  glowMats.chip.emissive.setRGB(0.04 * S.chipGlow, 0.55 * S.chipGlow, 0.7 * S.chipGlow);
  glowMats.grille.emissive.setRGB(1.1 * S.grilleGlow, 0.6 * S.grilleGlow, 0.18 * S.grilleGlow);
  glowMats.shell.emissive.setRGB(0.03 * S.cupGlow, 0.3 * S.cupGlow, 0.4 * S.cupGlow);
  cutH.constant = S.cut;
  cutC.constant = S.cutC;
  const cutting = S.cut < 1e4 || S.cutC < 1e4;
  cutaway.active(cutting);
  // the canal glows in the accent colour only when it is cut open
  Mo.canal.material.emissiveIntensity = S.cut < 1e4 ? 0.9 : 0;
  // what lies wholly above the level cut is not drawn at all
  const above = S.cut < 1e4;
  Mo.slider.visible = !above;
  Mo.band.visible = !above && S.tower < 0.5;
  Mo.left.visible = !above && S.tower < 0.5;
  scene.fog.near = S.fogNear;
  scene.fog.far = S.fogFar;
  // the lens: near and far from the distance, so a macro keeps its depth precision and a crane keeps its far wall
  camera.near = Math.max(0.5, cam.dist * 0.04);
  camera.far = Math.max(6000, cam.dist * 6);
  camera.updateProjectionMatrix();
  // pins that ride on the travelling field
  crest.position.copy(crestAt(t, 1));
  trough.position.copy(crestAt(t, -1));
  drumRing.scale.setScalar(D22.r);
  drumRing.material.opacity = D22.o;
  drumRing.visible = D22.o > 0.01;
  space.fitShadow(Math.min(900, Math.max(60, cam.dist * 0.7)));
  set.state.dust = cam.dist > 260 ? 1 : 0; // close up, motes would be huge discs
  set.update(t, camera);
  // the light faces the camera: place a stand-in where the rig will put the camera this frame
  const sw = cam.sway;
  const az = THREE.MathUtils.degToRad(cam.az + sw * (0.9 * Math.sin(t * 0.41) + 0.4 * Math.sin(t * 1.13 + 1.7)));
  const elv = THREE.MathUtils.degToRad(cam.el + sw * (0.6 * Math.sin(t * 0.53 + 0.6) + 0.25 * Math.sin(t * 1.31 + 2.9)));
  eye.position.set(cam.tx + cam.dist * Math.cos(elv) * Math.sin(az), cam.ty + cam.dist * Math.sin(elv), cam.tz + cam.dist * Math.cos(elv) * Math.cos(az));
  for (const o of lights) o.update(t, eye);
  for (const o of [hookRings, air, micRings, driverRings, cutRings, squeakCutRings, humRings, squeakRings]) o.update(t);
  clatter.update();
  space.render(S.vis, t);
  // the lanes' labels sit by their lanes (s10, s11), placed with this frame's camera
  if (t >= s.s10.start && t < s.s12.start) {
    for (const [el, dy] of Object.values(laneEls)) el.style.top = `${proj(FREE.clone().add(V(0, dy + 7.5, 0)))[1] - 44}px`;
    for (const [el, dy] of signEls) el.style.top = `${proj(FREE.clone().add(V(0, dy, 0)))[1] - 40}px`;
    $("#timeaxis").style.top = `${proj(FREE.clone().add(V(0, -27, 0)))[1]}px`;
  }
});
window.__dbg = { space, scene, THREE, S, set, Mo, lights, hookWave, noise7, eye, cam };
film.finish();
