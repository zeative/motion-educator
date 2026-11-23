// "Kenapa ada musim?" in the Clay template. Built from storyboard.json: every time below is a shot's start or end,
// or a word of the take (voice/words.json). Stop motion: the template holds every pose for 1/12 s (template.json
// "stepped": 12) and clay.update() boils every lump once per held pose.
//
// One tabletop set, its places side by side, the camera moving between them as a camera on a little set does: it
// rises over the table and comes down on the next place, never through a thing on it.
//   the village and the beach (x -72, -46)        s01, s02, s15
//   the Sun, the orbit and the Earth (x 0)         s03 to s08, s10, s12
//   the torch over a slab (x 45), a clock (x 62)   s09, s09b, s11
//   two plates with clay suns (x 80)               s13, s13b
//   the recap card (x -22, in front)               s14
// The Sun is the set's lamp: in the solar close-ups the studio light dims, so the Earth has a day half and a night
// half. Every label is a paper flag on a toothpick. Numbers: f1, f2, f5, f7 in storyboard.json.
import { createFilm } from "../../kit/engine/motion.js";
import { createStage3D } from "../../kit/engine/stage3d.js";
import { createClay } from "../../kit/engine/clay.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, $, shots: s } = film;
const D = film.duration;
film.captions();
film.scene("#set", 0, D);

const space = createStage3D($("#space"), { rig: true, shadows: true, environment: 0.3, exposure: 0.95 });
const { THREE, scene, key, rim, fill } = space;
const clay = createClay(space, { stepped: film.look.stepped });
// A painted card backdrop in the template's peach, kept peach on camera (a low glow).
const { bounce } = clay.set({ backdrop: ["#ffdcc4", "#ffc3a1"], table: "#f3d3b2", width: 230, depth: 120, height: 140, glow: 0.16 });
space.fitShadow(80);
const deg = THREE.MathUtils.degToRad;
const TILT = 23.44, JAKARTA_LOW = 60, BERLIN_DEC = 14;
const VX = -72, BX = -46, QX = -52;
let seed = 3;
// Sixteen hand-marked surfaces, shared round the pieces: each new one costs a height map and a normal map to make.
const nextSeed = () => (seed++ % 16) + 1;
const lump = (geo, colour, opts = {}) => clay.lump(geo, colour, { seed: nextSeed(), ...opts });
const ball = (r, colour, opts) => lump(new THREE.SphereGeometry(r, 48, 32), colour, opts);
const rbox = (w, h, d, r, colour, opts) => lump(new RoundedBoxGeometry(w, h, d, 4, r), colour, opts);
const at = (o, x, y, z) => (o.position.set(x, y, z), o);
const add = (...o) => (scene.add(...o), o[0]);
const flag = (text, x, y, z, opts = {}) => add(at(clay.flag(text, { height: 5, size: 1.4, font: "600 120px Fredoka, sans-serif", ...opts }), x, y, z));
// Seen from high above, a flag would stand edge-on: its paper is turned to face the camera and leant back.
function topFlag(text, x, z, { az = 90, back = -1.1, ...opts } = {}) {
  const holder = add(at(new THREE.Group(), x, 0, z));
  holder.rotation.y = deg(az);
  const f = clay.flag(text, { height: 3, size: 1.3, font: "600 120px Fredoka, sans-serif", ...opts });
  f.rotation.x = back;
  holder.add(f);
  return holder;
}

// What the film does, logged as it is built (render.mjs --events writes it out) so cues.build.py can put a squish
// on every piece set down, a knock on every flag, a whoosh on every move of the camera.
const log = (window.__events = []);
const note = (kind, at, end = at) => log.push({ kind, at: +at.toFixed(3), end: +end.toFixed(3) });
// Things are set down like clay by a hand: scale up past their size, squash, settle.
function plop(o, t, size = 1, kind = "plop") {
  tl.fromTo(o.scale, { x: 0.001, y: 0.001, z: 0.001 }, { x: size * 1.15, y: size * 0.8, z: size * 1.15, duration: 0.17, ease: "power2.in", immediateRender: true }, t);
  tl.to(o.scale, { x: size * 0.94, y: size * 1.1, z: size * 0.94, duration: 0.12 }, t + 0.17);
  tl.to(o.scale, { x: size, y: size, z: size, duration: 0.2, ease: "back.out(2)" }, t + 0.29);
  note(kind, t + 0.17);
}
const stick = (o, t, size = 1) => plop(o, t, size, "flag");
// Taken away by a hand: lifted up and out over four drawings, not vanished.
function lift(o, t) {
  tl.to(o.position, { y: `+=3`, duration: 0.35, ease: "power2.in" }, t);
  tl.to(o.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.35, ease: "power3.in" }, t);
  note("lift", t);
}
const hidden = (...os) => os.forEach((o) => o.scale.setScalar(0.001));

// ── The studio light, and the Sun as a lamp ────────────────────────────────────────────────────────────────────
const studio = { k: 1, sun: 0 };
const KEY = key.intensity, BOUNCE = bounce.intensity, ENV = scene.environmentIntensity, RIM = rim.intensity, FILL = fill.intensity;

// ── The village (Europe in December) and the beach (Australia in December) ──────────────────────────────────────
function house(x, z, w, h, wall, ry = 0) {
  const g = new THREE.Group();
  const body = at(rbox(w, h, w * 0.85, w * 0.12, wall, { uneven: 0.05 }), 0, h / 2, 0);
  // A gable roof: a rounded slab turned on its edge, half sunk into the walls.
  const roof = at(rbox(w * 0.86, w * 0.86, w * 1.02, w * 0.12, "#b5523b", { uneven: 0.05 }), 0, h, 0);
  roof.rotation.z = Math.PI / 4;
  roof.scale.set(1, 0.72, 1);
  const snow = at(lump(new THREE.SphereGeometry(w * 0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), "#fbfbf7", { uneven: 0.09 }), 0, h + w * 0.2, 0);
  snow.scale.set(1.05, 0.55, 0.95);
  const door = at(rbox(w * 0.26, h * 0.42, 0.4, 0.1, "#6b3f2a"), 0, h * 0.21, w * 0.43);
  const win = at(rbox(w * 0.22, w * 0.22, 0.4, 0.08, "#ffd166"), w * 0.26, h * 0.62, w * 0.43);
  g.add(body, roof, snow, door, win);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  return add(g);
}
add(at(lump(new THREE.CylinderGeometry(13, 14, 0.6, 48), "#f7f7f2", { uneven: 0.05 }), VX, 0.3, 0));
house(VX - 6, 1, 4.2, 3.6, "#f4d8a8", 0.3);
house(VX + 1, -2.5, 3.6, 4.4, "#cfe3f0", -0.2);
house(VX + 7.5, 1.5, 3.2, 3.2, "#f3b7a5", 0.15);
for (const [x, z, k] of [[VX - 10, -3, 1], [VX + 10, -4, 0.8], [VX - 3, -6, 0.9]]) {
  const tree = new THREE.Group();
  [[2.4, 3, 2.2], [1.8, 2.6, 4.2], [1.2, 2.2, 6]].forEach(([r, h, y]) => {
    tree.add(at(lump(new THREE.ConeGeometry(r, h, 18, 3), "#2f8f63", { uneven: 0.08 }), 0, y, 0));
    tree.add(at(lump(new THREE.ConeGeometry(r * 0.62, h * 0.4, 18, 2), "#fbfbf7", { uneven: 0.08 }), 0, y + h * 0.34, 0));
  });
  tree.add(at(lump(new THREE.CylinderGeometry(0.4, 0.5, 1.4, 12), "#7a4b2c"), 0, 0.7, 0));
  tree.position.set(x, 0, z);
  tree.scale.setScalar(k);
  add(tree);
}
// Snowflakes fall on the twelves; their motion repeats exactly 14 times over the film, so the last frame's snow is
// the first frame's (the loop).
const flakes = Array.from({ length: 22 }, (_, i) => {
  const f = add(ball(0.32, "#ffffff", { uneven: 0.2 }));
  f.userData = { x: VX - 12 + ((i * 37) % 24), z: -7 + ((i * 53) % 15), ph: (i * 0.137) % 1 };
  return f;
});
film.each((t) => {
  for (const f of flakes) {
    const u = ((t / D) * 14 + f.userData.ph) % 1;
    f.position.set(f.userData.x + Math.sin(u * 6.28 + f.userData.ph * 9) * 0.6, 16 - u * 16, f.userData.z);
  }
});
flag("Eropa · Desember", VX - 1, 0, 7, { lean: 0.08 });
// The beach, on the table in front of the village: sea, sand, a parasol, a towel and a clay sun on a wire.
add(at(rbox(16, 0.8, 5, 0.35, "#3aa6d8", { uneven: 0.06 }), BX, 0.4, -2));
add(at(rbox(16, 1.0, 10, 0.45, "#f2d398", { uneven: 0.05 }), BX, 0.5, 5.5));
const umbrella = new THREE.Group();
umbrella.add(at(lump(new THREE.CylinderGeometry(0.22, 0.22, 7, 10), "#f6f1e7"), 0, 3.5, 0));
umbrella.add(at(lump(new THREE.ConeGeometry(4.0, 2.0, 24, 2), "#e8574a", { uneven: 0.05 }), 0, 7.4, 0));
add(at(umbrella, BX - 4.5, 1, 5));
add(at(rbox(5, 0.3, 2.6, 0.12, "#ffd166"), BX + 1, 1.1, 7));
const beachSun = add(at(ball(1.9, "#ffb238"), BX + 5.5, 10, 1));
add(at(lump(new THREE.CylinderGeometry(0.08, 0.08, 9.5, 8), "#9a9a9a"), BX + 5.5, 5.2, 1));
flag("Australia · Desember", BX - 8.5, 1, 9.5, { lean: 0.04, size: 1.25 });

// ── The question mark (s02), on the table in front ─────────────────────────────────────────────────────────────
const qpts = [];
for (let i = 0; i <= 24; i++) { const a = Math.PI * (1.15 - (i / 24) * 1.45); qpts.push([Math.cos(a) * 2.6, 9 + Math.sin(a) * 2.6, 0]); }
qpts.push([0.2, 5.4, 0], [0, 4.2, 0]);
const qmark = add(at(clay.rope(qpts, 0.55, "#ff8a65", { seed: 41 }), QX, 0, 34));
qmark.add(at(ball(0.75, "#ff8a65"), 0, 2.4, 0));
hidden(qmark);

// ── The Sun, the orbits, the Earth ───────────────────────────────────────────────────────────────────────────────
const SUN = new THREE.Vector3(0, 2.6, 20), SUNR = 2.2, EY = 2.6, ER = 1.4;
const sun = add(at(ball(SUNR, "#ffb238", { uneven: 0.04 }), SUN.x, SUN.y, SUN.z));
sun.castShadow = false;
sun.material.emissive = new THREE.Color("#ff9f1c");
const sunLight = new THREE.PointLight("#fff1cc", 0, 0, 0);
sunLight.position.copy(SUN);
sunLight.castShadow = false;
scene.add(sunLight);
add(at(lump(new THREE.CylinderGeometry(0.12, 0.12, SUN.y - SUNR + 0.2, 8), "#9a9a9a"), SUN.x, (SUN.y - SUNR) / 2, SUN.z));
const ropeAt = (cx, a, b, sd) => {
  const pts = [];
  for (let i = 0; i < 72; i++) pts.push([cx + Math.cos((i / 72) * Math.PI * 2) * a, 0.45, SUN.z + Math.sin((i / 72) * Math.PI * 2) * b]);
  return add(clay.rope(pts, 0.3, "#d98a66", { seed: sd, closed: true }));
};
// s03's misconception: a stretched oval with the Sun at one focus, so the Earth passes very near and far away.
const OA = 13.5, OB = 9.5, OC = Math.sqrt(OA * OA - OB * OB); // the Sun sits OC from the oval's middle
const OVX = SUN.x + OC;
const ovalAt = (phi) => new THREE.Vector3(OVX + Math.cos(phi) * OA, EY, SUN.z + Math.sin(phi) * OB);
// The real orbit is round to the eye: 147.1 to 152.1 million km (f2), so the Sun is 0.17 of 10 off its middle,
// towards January.
const R = 10, OFF = R * (152.1 - 147.1) / (152.1 + 147.1);
const orbitAt = (theta) => new THREE.Vector3(SUN.x + OFF + Math.cos(theta) * R, EY, SUN.z - Math.sin(theta) * R);
const oval = ropeAt(OVX, OA, OB, 6), mid = ropeAt(SUN.x + (OC + OFF) / 2, (OA + R) / 2, (OB + R) / 2, 7), round = ropeAt(SUN.x + OFF, R, R, 8);
for (const o of [oval, mid, round]) o.visible = false;
// The Earth: a blue lump with green land, on a wire stand, a toothpick through its poles. earthG moves round the
// orbit; tiltG holds the tilt (fixed in the world, so the axis keeps pointing the same way); spinG turns it.
const earthG = add(new THREE.Group()), tiltG = new THREE.Group(), spinG = new THREE.Group();
earthG.add(tiltG);
tiltG.add(spinG);
function globe(group, r, sd) {
  group.add(ball(r, "#2f86c9", { uneven: 0.04 }));
  for (const [lat, lon, k] of [[0.75, 0.2, 0.44], [0.55, 1.1, 0.39], [-0.45, 0.9, 0.34], [0.15, 2.5, 0.32], [-0.6, 3.6, 0.29], [0.6, 4.4, 0.36]]) {
    const land = lump(new THREE.SphereGeometry(r * k, 24, 16), "#3fc37a", { seed: (sd++ % 16) + 1 });
    land.scale.set(1, 1, 0.26);
    const n = new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
    land.position.copy(n.clone().multiplyScalar(r * 0.96));
    land.lookAt(n.clone().multiplyScalar(10));
    group.add(land);
  }
}
globe(spinG, ER, 60);
const toothpick = (len, r = 0.075) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), new THREE.MeshStandardMaterial({ color: "#c99b6b", roughness: 0.8 }));
  m.castShadow = true;
  return m;
};
tiltG.add(toothpick(ER * 2.7));
earthG.add(at(toothpick(EY - 0.45 - ER + 0.1, 0.09), 0, -(ER + (EY - 0.45 - ER) / 2) + 0.05, 0)); // its stand
// Winter on the north: white clay pressed over the top (s05).
const snowCap = lump(new THREE.SphereGeometry(ER * 1.04, 40, 20, 0, Math.PI * 2, 0, 0.62), "#fbfbf7", { uneven: 0.05 });
tiltG.add(snowCap);
hidden(snowCap);
// The equator: a thin strip of red clay pressed flat round its middle (s12), and Indonesia's flag stuck in it.
const band = lump(new THREE.TorusGeometry(ER * 0.985, 0.09, 10, 72), "#e8574a", { size: 0.3 });
band.rotation.x = Math.PI / 2;
band.scale.set(1, 1, 0.55);
tiltG.add(band);
hidden(band);
const indo = clay.flag("Indonesia", { height: 1.6, size: 0.5, font: "600 120px Fredoka, sans-serif", lean: 0.1 });
indo.position.set(0, 0, ER * 0.98);
indo.rotation.x = 0.35;
tiltG.add(indo);
hidden(indo);
// A coral arrow along the axis, out of the north pole (s07 to s11): it keeps pointing the same way round the orbit.
const arrowUp = (len, r = 0.14) => {
  const g = new THREE.Group();
  g.add(at(lump(new THREE.CylinderGeometry(r, r, len, 10), "#ff8a65"), 0, len / 2, 0));
  g.add(at(lump(new THREE.ConeGeometry(r * 3, r * 6, 14), "#ff8a65"), 0, len + r * 2.6, 0));
  return g;
};
const axisArrow = at(arrowUp(1.9), 0, ER * 1.3, 0);
tiltG.add(axisArrow);
hidden(axisArrow);
// The paper protractor behind the Earth (s06b): a card with its edge showing, the upright and the tilted line both
// meeting at the Earth's middle.
const protractor = (() => {
  const c = Object.assign(document.createElement("canvas"), { width: 1024, height: 1024 }), g = c.getContext("2d");
  g.fillStyle = "#fff8ea";
  g.beginPath(); g.arc(512, 640, 480, Math.PI, 0); g.lineTo(992, 700); g.lineTo(32, 700); g.closePath(); g.fill();
  g.strokeStyle = "#5a3a28"; g.lineWidth = 6;
  for (let a = 0; a <= 180; a += 10) { const r0 = a % 30 ? 440 : 410; g.beginPath(); g.moveTo(512 - Math.cos(deg(a)) * r0, 640 - Math.sin(deg(a)) * r0); g.lineTo(512 - Math.cos(deg(a)) * 470, 640 - Math.sin(deg(a)) * 470); g.stroke(); }
  g.setLineDash([22, 16]); g.beginPath(); g.moveTo(512, 640); g.lineTo(512, 120); g.stroke(); g.setLineDash([]);
  g.strokeStyle = "#e8574a"; g.lineWidth = 12;
  g.beginPath(); g.moveTo(512, 640); g.lineTo(512 - Math.sin(deg(TILT)) * 520, 640 - Math.cos(deg(TILT)) * 520); g.stroke();
  g.lineWidth = 8; g.beginPath(); g.arc(512, 640, 300, -Math.PI / 2 - deg(TILT), -Math.PI / 2); g.stroke();
  g.fillStyle = "#e8574a"; g.font = "700 130px Fredoka, sans-serif"; g.textAlign = "center"; g.fillText("23,4°", 770, 300);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const front = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, roughness: 0.92 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), front);
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, color: "#c9b79c", roughness: 0.95 }));
  edge.position.z = -0.08;
  const g2 = new THREE.Group();
  g2.add(edge, m);
  m.receiveShadow = true;
  return g2;
})();
earthG.add(protractor);
// The card's corner (512, 640 of 1024) is the Earth's middle: 6 * (0.5 - 640 / 1024) below the card's centre.
protractor.position.set(0, 6 * (640 / 1024 - 0.5), -2.2);
hidden(protractor);
// Ghosts of the Earth where it has been (s07b): pale lumps on stands, with the same toothpick and arrow.
function ghost(theta) {
  const g = new THREE.Group(), p = orbitAt(theta), r = 1.0;
  const t = new THREE.Group();
  t.add(ball(r, "#9cc6e6", { uneven: 0.05 }), toothpick(r * 2.9, 0.07), at(arrowUp(1.5, 0.12), 0, r * 1.35, 0));
  t.rotation.z = deg(TILT);
  g.add(t, at(toothpick(EY - 0.45 - r + 0.1, 0.08), 0, -(r + (EY - 0.45 - r) / 2) + 0.05, 0));
  g.position.copy(p);
  return add(g);
}
const ghostDec = ghost(Math.PI), ghostMar = ghost(1.5 * Math.PI), ghostJul = ghost(0);
hidden(ghostDec, ghostMar, ghostJul);
// The two distances of s04b: rods from the Sun's middle to January's Earth and to July's place.
const rod = (x0, x1) => add(clay.rope([[x0, EY, SUN.z], [x1, EY, SUN.z]], 0.13, "#ffd166", { seed: nextSeed() }));
const rodJan = rod(SUN.x - SUNR * 0.6, orbitAt(Math.PI).x + ER * 0.6), rodJul = rod(SUN.x + SUNR * 0.6, orbitAt(0).x - 0.6);
hidden(rodJan, rodJul);
// The Earth's place: on the oval (phi) in s03, s03b; on the round orbit (theta) after.
// (mix: 0 on the oval, 1 on the orbit; between, as the rope is pressed round, the Earth goes with it.)
const E = { phi: Math.PI / 2, theta: 0, mix: 0, tilt: 0, spin: 0, hide: 1 };
film.each((t) => {
  earthG.position.copy(ovalAt(E.phi).lerp(orbitAt(E.theta), E.mix));
  earthG.scale.setScalar(E.hide > 0.5 ? 0.001 : 1);
  tiltG.rotation.z = deg(E.tilt);
  spinG.rotation.y = E.spin + t * 0.5;
});
// The solar set's flags. Seen from high above (s03 to s04b) they face up; in the close-ups they stand.
const fScale = topFlag("bukan skala", OVX + 11, SUN.z + 10.5, { size: 2.0, height: 2.6 });
const fHot = topFlag("panas?", ovalAt(Math.PI).x - 1.5, SUN.z + 4.2, { size: 2.6, height: 3.4 });
const fCold = topFlag("dingin?", ovalAt(0).x - 1.5, SUN.z + 4.2, { size: 2.6, height: 3.4 });
const fJan = topFlag("Januari · 147 juta km", -5.6, SUN.z + 1.6, { size: 1.7, height: 2.2 });
const fJul = topFlag("Juli · 152 juta km", 6.2, SUN.z + 1.6, { size: 1.7, height: 2.2 });
const fWinter = clay.flag("Eropa: musim dingin", { height: 1.5, size: 0.4, font: "600 120px Fredoka, sans-serif", side: 1, lean: 0.12 });
fWinter.position.set(-1.0, ER * 0.55, ER * 0.83);
earthG.add(fWinter);
const fJune = flag("Juni", 4.9, 0, SUN.z + 4.5, { side: -1, size: 1.2, height: 5.8, lean: 0.03 });
const fNorth = clay.flag("utara condong", { height: 2.6, size: 0.95, font: "600 120px Fredoka, sans-serif", side: -1, lean: 0.05 });
fNorth.position.set(0.2, ER * 0.8, ER * 0.55);
earthG.add(fNorth);
const fDec = flag("Desember", -4.9, 0, SUN.z + 4.5, { side: 1, size: 1.2, height: 5.8, lean: 0.03 });
const fSouth = flag("selatan condong", orbitAt(Math.PI).x + 1.3, 0, SUN.z + 1.6, { side: 1, size: 0.95, height: 1.9, lean: 0.05 });
hidden(fScale, fHot, fCold, fJan, fJul, fWinter, fJune, fNorth, fDec, fSouth);

// ── The torch over a slab (s09, s11), its light a bright patch on the clay ─────────────────────────────────────
const PIV = new THREE.Vector3(58, 1.05, 18);
add(at(rbox(13, 1, 9, 0.4, "#a08a76", { uneven: 0.004 }), PIV.x, 0.5, PIV.z));
const torch = add(at(new THREE.Group(), PIV.x, PIV.y, PIV.z));
torch.add(at(lump(new THREE.CapsuleGeometry(1.25, 2.6, 8, 24), "#118ab2", { uneven: 0.05 }), 0, 9.3, 0));
torch.add(at(lump(new THREE.CylinderGeometry(1.9, 1.35, 1.8, 28, 2), "#ffd166", { uneven: 0.05 }), 0, 7.4, 0));
const beam = new THREE.Mesh(new THREE.ConeGeometry(2.6, 6.5, 32, 1, true), new THREE.MeshBasicMaterial({ color: "#fff1a8", transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }));
beam.position.y = 3.25;
torch.add(beam);
// The patch adds light to the clay under it, so it is the brightest thing on the slab.
const patch = add(new THREE.Mesh(new THREE.CircleGeometry(2.6, 56), new THREE.MeshBasicMaterial({ color: "#fff2b8", transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
patch.rotation.x = -Math.PI / 2;
patch.position.set(PIV.x, PIV.y + 0.09, PIV.z);
const T = { tilt: 0, on: 0 };
film.each(() => {
  torch.rotation.z = -deg(T.tilt);
  beam.visible = patch.visible = T.on > 0.5;
  // The same light over a longer patch: stretched by 1 / cos(tilt), each bit of it dimmer by cos(tilt) (f5).
  const k = Math.cos(deg(T.tilt));
  patch.scale.set(1 / k, 1, 1);
  patch.material.opacity = 0.52 * k;
});
const fNarrow = flag("sempit = panas", PIV.x - 5.6, 0, 14.5, { side: 1, size: 1.15, height: 6.2, lean: 0.03 });
const fWide = flag("lebar = dingin", PIV.x - 5.6, 0, 14.5, { side: 1, size: 1.15, height: 6.2, lean: 0.03 });
hidden(fNarrow, fWide);

// ── The clock card (s09b): a day of 24 hours in beads, more than half of it daylight in a June in Europe ───────────
const CK = new THREE.Vector3(76, 0, 22);
const clock = add(at(new THREE.Group(), CK.x, CK.y, CK.z));
const dial = new THREE.Group();
dial.position.y = 4.8;
clock.add(dial, at(rbox(2.2, 1.4, 1.6, 0.4, "#d98a66"), 0, 0.7, 0), at(toothpick(1.6, 0.25), 0, 2.2, -0.2));
dial.add(at(lump(new THREE.CylinderGeometry(3.4, 3.4, 0.6, 48), "#fff6ea"), 0, 0, 0));
dial.children[0].rotation.x = Math.PI / 2;
const hourAt = (h, r) => { const a = deg(90 - (h - 12) * 15); return [Math.cos(a) * r, Math.sin(a) * r]; };
for (let h = 0; h < 24; h++) { const [x, y] = hourAt(h, 3.0); dial.add(at(ball(h % 6 ? 0.1 : 0.17, "#5a3a28"), x, y, 0.32)); }
// The half: a line from 6 to 18 o'clock. Daylight in beads from 4 to 20 (about 16 hours), night in blue.
const halfLine = at(clay.rope([[hourAt(6, 2.6)[0], hourAt(6, 2.6)[1], 0.35], [hourAt(18, 2.6)[0], hourAt(18, 2.6)[1], 0.35]], 0.07, "#e8574a", { seed: 77 }), 0, 0, 0);
dial.add(halfLine);
const DAY = [4, 20];
const beads = Array.from({ length: 24 }, (_, i) => {
  const h = (DAY[0] + i + 0.5) % 24, day = i < DAY[1] - DAY[0];
  const [x, y] = hourAt(h, 2.35);
  const b = at(ball(0.36, day ? "#ffd166" : "#118ab2"), x, y, 0.42);
  dial.add(b);
  return b;
});
dial.add(at(lump(new THREE.CapsuleGeometry(0.11, 1.6, 4, 8), "#5a3a28"), 0, 0.85, 0.5), at(ball(0.22, "#5a3a28"), 0, 0, 0.5));
const fDay = flag("siang lebih panjang", CK.x + 2.6, 0, CK.z - 1, { side: -1, size: 0.95, height: 10.1, lean: 0.02 });
hidden(fDay, ...beads);

// ── Two plates: the noon Sun in Jakarta and in Berlin (s13, s13b), one behind the other ─────────────────────────
function plate(x, z, body, mood) {
  const g = add(at(new THREE.Group(), x, 0, z));
  g.add(at(lump(new THREE.CylinderGeometry(4.4, 4.7, 0.6, 48), "#fff6ea"), 0, 0.3, 0));
  // the horizon: the plate's edge, marked by a line of clay through where the angle is measured
  g.add(clay.rope([[-4.1, 0.66, 0.6], [4.1, 0.66, 0.6]], 0.07, "#5a3a28", { seed: nextSeed() }));
  const who = at(new THREE.Group(), -2.2, 0, 0.3);
  who.add(at(lump(new THREE.CapsuleGeometry(0.72, 1.5, 6, 14), body), 0, 1.95, 0), at(ball(0.82, "#ffd8c2"), 0, 3.6, 0));
  for (const ex of [-0.28, 0.28]) who.add(at(ball(0.12, "#2b2b2b"), ex, 3.72, 0.74));
  const smile = [];
  for (let i = 0; i <= 8; i++) { const a = Math.PI * (1.15 + (i / 8) * 0.7); smile.push([Math.cos(a) * 0.32, 3.42 + (mood === "happy" ? 1 : -1) * (Math.sin(a) * 0.14 + 0.1), 0.78]); }
  who.add(clay.rope(smile, 0.045, "#2b2b2b", { seed: nextSeed() }));
  g.add(who);
  const arm = new THREE.Group();
  arm.add(at(toothpick(5, 0.07), 2.5, 0, 0));
  arm.children[0].rotation.z = Math.PI / 2;
  arm.add(at(ball(0.9, "#ffb238"), 5.2, 0, 0));
  arm.position.set(0, 0.66, 0.6);
  g.add(arm);
  return { g, arm };
}
const PX = 96, JZ = 38, BZ = 26;
const jkt = plate(PX, JZ, "#118ab2", "happy"), ber = plate(PX, BZ, "#ff8a65", "cold");
const sunsUp = { jkt: 0, ber: 0 };
film.each(() => {
  // The stick turns up from the horizon: its angle is the Sun's height at noon (f7).
  jkt.arm.rotation.z = deg(sunsUp.jkt);
  ber.arm.rotation.z = deg(sunsUp.ber);
});
// The angles, as arcs of clay from the horizon to the stick, each with its number on a card.
const arc = (deg0, r) => { const pts = []; for (let i = 0; i <= 16; i++) { const a = deg((deg0 * i) / 16); pts.push([Math.cos(a) * r, Math.sin(a) * r, 0]); } return clay.rope(pts, 0.08, "#e8574a", { seed: nextSeed() }); };
const arcJ = at(arc(JAKARTA_LOW, 2.0), 0, 0.66, 0.75), arcB = at(arc(BERLIN_DEC, 2.6), 0, 0.66, 0.75);
jkt.g.add(arcJ);
ber.g.add(arcB);
const cardJ = clay.flag(`≥ ${JAKARTA_LOW}°`, { height: 1.4, size: 0.8, ink: "#e8574a", font: "700 120px Fredoka, sans-serif", side: 1, lean: 0 });
const cardB = clay.flag(`${BERLIN_DEC}°`, { height: 1.4, size: 0.8, ink: "#e8574a", font: "700 120px Fredoka, sans-serif", side: 1, lean: 0 });
jkt.g.add(at(cardJ, 2.2, 0.6, 2.2));
ber.g.add(at(cardB, 2.9, 0.6, 2.2));
const berSnow = [[-3.4, 1.2], [2.2, -2.4], [3.0, -1.0], [-1.0, -2.8]].map(([x, z]) => at(lump(new THREE.SphereGeometry(0.85, 20, 12), "#fbfbf7"), x, 0.62, z));
berSnow.forEach((b) => (b.scale.y = 0.5, ber.g.add(b)));
const fJkt = flag("Jakarta", PX - 3.4, 0, JZ - 1, { side: 1, size: 1.0, height: 6.1, lean: 0.02 });
const fBer = flag("Berlin, Desember", PX - 3.4, 0, BZ - 1, { side: 1, size: 1.0, height: 6.1, lean: 0.02 });
hidden(fJkt, fBer, arcJ, arcB, cardJ, cardB, ...berSnow);

// ── The recap card (s14): the tilt, a little orbit with 'jarak' crossed out, June and December ───────────────────
const RC = new THREE.Vector3(-22, 0, 46);
const recap = add(at(new THREE.Group(), RC.x, RC.y, RC.z));
recap.add(at(rbox(15, 0.7, 25, 0.3, "#fff6ea", { uneven: 0.02 }), 0, 0.35, 0));
const back = (o) => (o.rotation.x = -0.75, o); // flags on the card lean back to the camera above it
// the tilted Earth with its 23,4° arc
const rTilt = at(new THREE.Group(), -3.2, 2.5, -8);
const rTiltT = new THREE.Group();
globe(rTiltT, 1.5, 90);
rTiltT.add(toothpick(1.5 * 3, 0.07));
rTiltT.rotation.z = deg(TILT);
rTilt.add(rTiltT, at(arc(TILT, 2.6), 0, 0, 0.2));
rTilt.children[1].rotation.z = deg(90);
recap.add(rTilt);
const fMiring = back(clay.flag("miring ✓", { height: 3.6, size: 1.9, ink: "#e8574a", font: "700 120px Fredoka, sans-serif", side: 1, lean: 0 }));
recap.add(at(fMiring, 0.4, 0.7, -8.6));
// a little orbit, and 'jarak' with a clay cross over it
const rOrbit = at(new THREE.Group(), -3.6, 0.7, 0.4);
rOrbit.add(at(ball(0.85, "#ffb238"), 0, 0.85, 0), at(ball(0.45, "#2f86c9"), 2.8, 0.45, 0));
const ringPts = []; for (let i = 0; i < 48; i++) ringPts.push([Math.cos((i / 48) * 6.283) * 2.8, 0.1, Math.sin((i / 48) * 6.283) * 2.8]);
rOrbit.add(clay.rope(ringPts, 0.12, "#d98a66", { seed: 91, closed: true }));
recap.add(rOrbit);
const fJarak = back(clay.flag("jarak", { height: 3.0, size: 1.9, font: "700 120px Fredoka, sans-serif", side: 1, lean: 0 }));
recap.add(at(fJarak, 0.6, 0.7, 0.2));
const cross = new THREE.Group();
{
  const p = fJarak.userData.paper.position, w = 4.4;
  for (const sgn of [1, -1]) cross.add(clay.rope([[-w / 2, -0.55 * sgn, 0], [w / 2, 0.55 * sgn, 0]], 0.08, "#e8574a", { seed: nextSeed() }));
  cross.position.set(p.x, p.y, 0.25);
  fJarak.add(cross);
}
// June: the north lit; December: the south lit (a yellow half of clay pressed on).
function season(x, north) {
  const g = at(new THREE.Group(), x, 1.9, 8);
  const t = new THREE.Group();
  globe(t, 1.15, north ? 120 : 140);
  t.add(toothpick(1.15 * 2.8, 0.06));
  // June: the north leans towards the little sun on the right; December: away, so the south leans in.
  t.rotation.z = deg(north ? -TILT : TILT);
  // the day half, facing the sun, as a thin yellow shell of clay
  const lit = lump(new THREE.SphereGeometry(1.2, 32, 16, Math.PI / 2, Math.PI), "#ffd166", { uneven: 0.03 });
  lit.material.transparent = true;
  lit.material.opacity = 0.55;
  g.add(t, lit, at(ball(0.5, "#ffb238"), 2.4, 0.4, 0));
  recap.add(g);
  return g;
}
const rJune = season(-3.6, true), rDec = season(3.0, false);
const fRJ = back(clay.flag("Juni", { height: 1.6, size: 1.2, side: 1, lean: 0 })), fRD = back(clay.flag("Desember", { height: 1.6, size: 1.2, side: 1, lean: 0 }));
recap.add(at(fRJ, -6.2, 0.7, 10.6), at(fRD, 0.6, 0.7, 10.6));
hidden(rTilt, fMiring, rOrbit, fJarak, cross, rJune, rDec, fRJ, fRD);

// ── The camera ───────────────────────────────────────────────────────────────────────────────────────────────────
const VIEW = {
  village: { az: 0, el: 14, dist: 52, tx: VX + 1.5, ty: 5, tz: 1, fov: 32 },
  beach: { az: 0, el: 16, dist: 54, tx: BX, ty: 4.5, tz: 3, fov: 32 },
  qmark: { az: 0, el: 10, dist: 40, tx: QX, ty: 3.6, tz: 34, fov: 32 },
  // high above, the camera on the January side: the Sun at the top of the frame, the far side above the captions
  oval: { az: 90, el: 82, dist: 100, tx: 14.7, ty: 0, tz: SUN.z, fov: 32 },
  orbitTop: { az: 90, el: 82, dist: 80, tx: 3.95, ty: 0, tz: SUN.z, fov: 32 },
  wide: { az: 0, el: 24, dist: 78, tx: SUN.x, ty: 1, tz: SUN.z, fov: 32 },
  june: { az: 0, el: 6, dist: 48, tx: (SUN.x + orbitAt(0).x) / 2, ty: 3.0, tz: SUN.z, fov: 32 },
  dec: { az: 0, el: 6, dist: 48, tx: (SUN.x + orbitAt(Math.PI).x) / 2, ty: 3.0, tz: SUN.z, fov: 32 },
  torch: { az: 0, el: 30, dist: 40, tx: PIV.x, ty: 2.4, tz: PIV.z, fov: 32 },
  torchWide: { az: 0, el: 30, dist: 51, tx: PIV.x + 1.8, ty: 3.4, tz: PIV.z, fov: 32 },
  clock: { az: 0, el: 10, dist: 36, tx: CK.x, ty: 5.2, tz: CK.z, fov: 32 },
  jakarta: { az: 0, el: 22, dist: 28, tx: PX + 1, ty: 3.2, tz: JZ, fov: 32 },
  plates: { az: 0, el: 34, dist: 44, tx: PX + 1, ty: 2.0, tz: (JZ + BZ) / 2 + 1, fov: 32 },
  recap: { az: 0, el: 56, dist: 47, tx: RC.x, ty: 0, tz: RC.z + 2.5, fov: 32 },
};
const earthView = (theta, dist = 15, el = 12) => { const p = orbitAt(theta); return { az: 0, el, dist, tx: p.x, ty: p.y + 0.3, tz: p.z, fov: 32 }; };
Object.assign(space.cam, VIEW.village);
let cur = VIEW.village;
// A slow move within one place.
function move(to, t, d = 0.9, ease = "power2.inOut") {
  tl.to(space.cam, { ...to, duration: d, ease }, t);
  note("move", t, t + d);
  cur = to;
}
// From one place to another: the camera rises over the table and comes down on the next place.
function travel(to, t, d = 1.1) {
  const span = Math.hypot(to.tx - cur.tx, to.tz - cur.tz);
  const up = { az: (cur.az + to.az) / 2, el: Math.max(cur.el, to.el, 52), dist: Math.max(cur.dist, to.dist, 40 + span * 0.6), tx: (cur.tx + to.tx) / 2, ty: 0, tz: (cur.tz + to.tz) / 2, fov: 32 };
  tl.to(space.cam, { keyframes: [{ ...up, duration: d / 2, ease: "power2.in" }, { ...to, duration: d / 2, ease: "power2.out" }] }, t);
  note("travel", t, t + d);
  cur = to;
}
// The studio light: k 1 is the full studio; lower, the Sun is the lamp that lights the Earth.
const light = (k, sunOn, t, d = 0.4) => tl.to(studio, { k, sun: sunOn ? 1 : 0, duration: d, ease: "power1.inOut" }, t);
film.each(() => {
  key.intensity = KEY * studio.k;
  rim.intensity = RIM * studio.k;
  fill.intensity = FILL * studio.k;
  bounce.intensity = BOUNCE * (0.25 + 0.75 * studio.k);
  scene.environmentIntensity = ENV * (0.2 + 0.8 * studio.k);
  sunLight.intensity = 7 * studio.sun;
  sun.material.emissiveIntensity = 0.9 * studio.sun;
});

// s01: the village in falling snow, then the camera dollies down to the beach.
move(VIEW.beach, 1.7, 2.0, "sine.inOut");
tl.to(beachSun.scale, { x: 1.12, y: 1.12, z: 1.12, duration: 0.4, repeat: 3, yoyo: true }, 2.6);
// s02: a clay question mark is set on the table in front.
move(VIEW.qmark, s.s02.start - 0.25, 0.8);
plop(qmark, s.s02.start + 0.15);
// s03: high over the Sun and a stretched oval with the Sun at one end; the Earth is set on it.
travel(VIEW.oval, s.s03.start - 0.35, 1.2);
lift(qmark, s.s03.start - 0.3);
tl.set(oval, { visible: true }, s.s03.start + 0.2);
note("plop", s.s03.start + 0.2);
tl.set(E, { hide: 0 }, s.s03.start + 0.5);
note("plop", s.s03.start + 0.5);
stick(fScale, 7.9);
// s03b: near the Sun 'panas?', far 'dingin?': the Earth goes round to each.
tl.to(E, { phi: Math.PI, duration: 0.7, ease: "power1.inOut" }, 8.85);
stick(fHot, 9.55);
tl.to(E, { phi: 2 * Math.PI, duration: 1.0, ease: "power1.inOut" }, 10.1);
stick(fCold, 10.95);
// s04: the oval is pressed round (replacement: oval, middle, round); the Earth goes round to January, closest.
[fHot, fCold, fScale].forEach((f) => lift(f, s.s04.start - 0.05));
move(VIEW.orbitTop, s.s04.start + 0.1, 0.8);
tl.set(oval, { visible: false }, s.s04.start + 0.3);
tl.set(mid, { visible: true }, s.s04.start + 0.3);
tl.set(mid, { visible: false }, s.s04.start + 0.55);
tl.set(round, { visible: true }, s.s04.start + 0.55);
note("plop", s.s04.start + 0.3);
note("plop", s.s04.start + 0.55);
tl.set(E, { mix: 0.5 }, s.s04.start + 0.3);
tl.set(E, { mix: 1 }, s.s04.start + 0.55);
tl.to(E, { theta: Math.PI, duration: 1.3, ease: "power1.inOut" }, 12.4);
// s04b: the two distances, nearly the same, and January the shorter.
plop(rodJan, 14.55);
stick(fJan, 14.85);
plop(ghostJul, 15.15);
plop(rodJul, 15.3);
stick(fJul, 15.55);
// s05: down to January's Earth: the studio dims, the Sun lights it; winter snow pressed on the north.
[fJan, fJul, rodJan, rodJul, ghostJul].forEach((f) => lift(f, s.s05.start - 0.1));
travel(earthView(Math.PI), s.s05.start - 0.05, 1.0);
light(0.2, true, s.s05.start);
plop(snowCap, 17.0);
stick(fWinter, 17.5);
// s06: closer; the Earth turns to show its toothpick.
lift(fWinter, s.s06.start);
move(earthView(Math.PI, 11), s.s06.start, 0.8);
tl.to(E, { spin: "+=1.6", duration: 1.2, ease: "power1.inOut" }, s.s06.start + 0.2);
// s06b: the toothpick tips to 23.4 degrees on 'miring'; the protractor card is set behind it on the number.
move(earthView(Math.PI, 22, 4), s.s06b.start + 0.05, 0.8);
tl.to(E, { tilt: TILT, duration: 0.8, ease: "power2.inOut" }, 21.2);
plop(protractor, 22.95);
// s07: pull back over the whole orbit; the coral arrow along the axis.
lift(protractor, s.s07.start);
lift(snowCap, s.s07.start);
move(VIEW.wide, s.s07.start + 0.05, 1.1);
light(0.45, true, s.s07.start + 0.1);
plop(axisArrow, 26.3);
// s07b: round the orbit from December through March to June; where it has been, a pale Earth with the same arrow.
plop(ghostDec, 27.5);
tl.to(E, { theta: 2 * Math.PI, duration: 2.3, ease: "power1.inOut" }, 27.6);
plop(ghostMar, 28.7);
// s08: June: the Sun on the left, the Earth on the right, its north leaning into the light.
travel(VIEW.june, s.s08.start - 0.05, 0.9);
[ghostDec, ghostMar].forEach((g) => lift(g, s.s08.start));
light(0.18, true, s.s08.start + 0.2);
stick(fJune, 30.8);
stick(fNorth, 32.1);
// s09: the torch: straight down, a small bright patch.
travel(VIEW.torch, s.s09.start - 0.2, 1.1);
light(1, false, s.s09.start + 0.1);
lift(fJune, s.s09.start);
lift(fNorth, s.s09.start);
tl.set(T, { on: 1 }, 34.9);
note("click", 34.9);
stick(fNarrow, 36.9);
// s09b: the clock card: the day in beads, more than half of the 24 hours.
travel(VIEW.clock, s.s09b.start - 0.25, 0.8);
beads.forEach((b, i) => plop(b, 38.75 + i * 0.045, 1, i % 4 ? "bead" : "plop"));
stick(fDay, 39.85);
// s10: back to the orbit; half a turn to December; then down to it, mirrored: the south leans in now.
travel(VIEW.wide, s.s10.start - 0.15, 1.0);
light(0.45, true, s.s10.start);
lift(fDay, s.s10.start + 0.3);
tl.to(E, { theta: 3 * Math.PI, duration: 1.4, ease: "power1.inOut" }, 41.0);
move(VIEW.dec, 42.35, 0.75);
light(0.18, true, 42.4);
stick(fDec, 43.0);
stick(fSouth, 43.55);
// s11: the torch tips: the same light over a long, dimmer patch.
travel(VIEW.torchWide, s.s11.start - 0.2, 1.1);
light(1, false, s.s11.start + 0.2);
lift(fNarrow, s.s11.start + 0.2);
[fDec, fSouth].forEach((f) => lift(f, s.s11.start));
tl.to(T, { tilt: 52, duration: 1.1, ease: "power2.inOut" }, 45.4);
stick(fWide, 47.4);
// s12: close on the Earth: the equator strip and Indonesia's flag.
travel(earthView(Math.PI, 12, 10), s.s12.start - 0.2, 1.2);
tl.set(T, { on: 0 }, s.s12.start + 0.4);
light(0.4, true, s.s12.start + 0.3);
lift(axisArrow, s.s12.start);
plop(band, 51.7);
stick(indo, 52.2);
// s13: the Jakarta plate: the noon Sun overhead and never below 60 degrees all year.
travel(VIEW.jakarta, s.s13.start - 0.2, 1.3);
light(1, false, s.s13.start);
tl.to(sunsUp, { jkt: 90, duration: 0.7, ease: "power2.out" }, 53.9);
tl.to(sunsUp, { jkt: JAKARTA_LOW, duration: 0.8, ease: "power1.inOut" }, 54.6);
stick(fJkt, 54.3);
plop(arcJ, 55.35);
stick(cardJ, 55.5);
// s13b: Berlin in December in front of it: the Sun only 14 degrees up, snow on the plate.
move(VIEW.plates, s.s13b.start, 0.8);
tl.to(sunsUp, { ber: BERLIN_DEC, duration: 0.8, ease: "power2.out" }, 56.3);
berSnow.forEach((b, i) => plop(b, 56.9 + i * 0.12, 1));
stick(fBer, 57.2);
plop(arcB, 57.6);
stick(cardB, 57.75);
// s14: the recap card: tilt yes, distance no; June and December.
travel(VIEW.recap, s.s14.start - 0.2, 1.3);
plop(rTilt, 59.4);
stick(fMiring, 59.95);
plop(rOrbit, 60.35);
stick(fJarak, 60.7);
plop(cross, 61.1);
plop(rJune, 61.55);
stick(fRJ, 61.7);
plop(rDec, 61.8);
stick(fRD, 61.95);
// s15: the camera cranes back over the table to the snowy village, the framing of frame 0.
travel(VIEW.village, s.s15.start + 0.05, D - s.s15.start - 0.35);

film.each((t) => {
  clay.update(t);
  space.render(1, t);
});
film.finish();
