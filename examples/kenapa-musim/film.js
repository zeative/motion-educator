// "Kenapa ada musim?" in the Clay template. Built from storyboard.json: every time below is a shot's start or end
// from the narration take. Stop motion: the template holds every pose for 1/12 s (template.json "stepped": 12) and
// clay.update() boils every lump once per held pose.
//
// One tabletop set, five places on it, the camera moving between them like a camera on a little set:
//   the village and the beach (x -40)      s01, s02, s15
//   the Sun, the orbit and the Earth (x 0)  s03 to s08, s10, s12, s14
//   the torch over a slab, a clock (x 40)  s09, s09b, s11
//   two plates with clay suns (x 40, z 40) s13, s13b
// Every label is a paper flag on a toothpick. The orbit is redrawn by replacement (three clay ropes swapped on the
// twelves), as stop motion does it. Numbers: f1, f2, f7 in storyboard.json.
import { createFilm } from "../../kit/engine/motion.js";
import { createStage3D } from "../../kit/engine/stage3d.js";
import { createClay } from "../../kit/engine/clay.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, $, shots: s } = film;
const D = film.duration;
film.captions();
film.scene("#set", 0, D);

const space = createStage3D($("#space"), { rig: true, shadows: true, environment: 0.3, exposure: 0.95 });
const { THREE, scene } = space;
const clay = createClay(space, { stepped: film.look.stepped });
clay.set({ backdrop: ["#ffe3d2", "#ffc9ad"], table: "#e7b892", width: 220, depth: 120, height: 140 });
space.fitShadow(80);
const deg = THREE.MathUtils.degToRad;
const TILT = 23.44, JAKARTA_LOW = 60, BERLIN_DEC = 14;
// Where each place sits on the table: the village, the beach, the question mark.
const VX = -72, BX = -46, QX = -58;
let seed = 3;
const lump = (geo, colour, opts = {}) => clay.lump(geo, colour, { seed: seed++, ...opts });
const ball = (r, colour, opts) => lump(new THREE.SphereGeometry(r, 48, 32), colour, opts);
const at = (o, x, y, z) => (o.position.set(x, y, z), o);
const add = (...o) => (scene.add(...o), o[0]);
const flag = (text, x, y, z, opts = {}) => add(at(clay.flag(text, { height: 5, size: 1.4, font: "600 120px Fredoka, sans-serif", ...opts }), x, y, z));
// Things pop in like clay set down by a hand: scale up past their size, squash, settle.
function plop(o, t, s = 1) {
  tl.fromTo(o.scale, { x: 0.001, y: 0.001, z: 0.001 }, { x: s * 1.15, y: s * 0.8, z: s * 1.15, duration: 0.17, ease: "power2.in", immediateRender: true }, t);
  tl.to(o.scale, { x: s * 0.94, y: s * 1.1, z: s * 0.94, duration: 0.12 }, t + 0.17);
  tl.to(o.scale, { x: s, y: s, z: s, duration: 0.2, ease: "back.out(2)" }, t + 0.29);
}
const gone = (o, t) => tl.to(o.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.2, ease: "power2.in" }, t);
const hidden = (...os) => os.forEach((o) => o.scale.setScalar(0.001));

// ── The village (Europe in December) and the beach (Australia in December) ──────────────────────────────────────
function house(x, z, w, h, wall, ry = 0) {
  const g = new THREE.Group();
  const body = at(lump(new THREE.BoxGeometry(w, h, w * 0.85, 6, 6, 6), wall, { uneven: 0.04 }), 0, h / 2, 0);
  const roof = at(lump(new THREE.ConeGeometry(w * 0.82, h * 0.62, 4, 3), "#b5523b", { uneven: 0.04 }), 0, h + h * 0.31, 0);
  roof.rotation.y = Math.PI / 4;
  const snow = at(lump(new THREE.SphereGeometry(w * 0.62, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), "#fbfbf7", { uneven: 0.08 }), 0, h + h * 0.22, 0);
  snow.scale.set(1, 0.62, 0.9);
  const door = at(lump(new THREE.BoxGeometry(w * 0.26, h * 0.42, 0.3), "#6b3f2a"), 0, h * 0.21, w * 0.43);
  const win = at(lump(new THREE.BoxGeometry(w * 0.22, w * 0.22, 0.3), "#ffd166"), w * 0.26, h * 0.62, w * 0.43);
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
    tree.add(at(lump(new THREE.ConeGeometry(r, h, 9, 2), "#2f8f63", { uneven: 0.06 }), 0, y, 0));
    tree.add(at(lump(new THREE.ConeGeometry(r * 0.62, h * 0.4, 9, 1), "#fbfbf7", { uneven: 0.06 }), 0, y + h * 0.34, 0));
  });
  tree.add(at(lump(new THREE.CylinderGeometry(0.4, 0.5, 1.4, 8), "#7a4b2c"), 0, 0.7, 0));
  tree.position.set(x, 0, z);
  tree.scale.setScalar(k);
  add(tree);
}
// Snowflakes fall on the twelves; their motion repeats exactly 14 times over the film, so the last frame's snow
// is the first frame's (the loop).
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
// The beach, on the table in front of the village.
add(at(lump(new THREE.BoxGeometry(22, 0.8, 5, 12, 2, 4), "#3aa6d8", { uneven: 0.06 }), BX, 0.4, -2));
add(at(lump(new THREE.BoxGeometry(22, 1.0, 10, 12, 2, 6), "#f2d398", { uneven: 0.05 }), BX, 0.5, 5.5));
const umbrella = new THREE.Group();
umbrella.add(at(lump(new THREE.CylinderGeometry(0.22, 0.22, 7, 8), "#f6f1e7"), 0, 3.5, 0));
umbrella.add(at(lump(new THREE.ConeGeometry(4.2, 2.2, 12, 2), "#e8574a", { uneven: 0.05 }), 0, 7.4, 0));
umbrella.add(at(lump(new THREE.ConeGeometry(4.25, 2.21, 12, 1, true, 0, Math.PI / 3), "#fff6ea", { uneven: 0.02 }), 0, 7.41, 0));
add(at(umbrella, BX - 5, 1, 5));
add(at(lump(new THREE.BoxGeometry(5, 0.3, 2.6), "#ffd166"), BX + 1, 1.1, 7));
const beachSun = add(at(ball(1.9, "#ffb238"), BX + 7, 10, 1));
add(at(lump(new THREE.CylinderGeometry(0.08, 0.08, 9.5, 6), "#9a9a9a"), BX + 7, 5.2, 1));
flag("Australia · Desember", BX - 1, 1, 9.5, { lean: 0.06 });

// ── The question mark (s02), on the table in front ─────────────────────────────────────────────────────────────
const qpts = [];
for (let i = 0; i <= 24; i++) { const a = Math.PI * (1.15 - (i / 24) * 1.45); qpts.push([Math.cos(a) * 2.6, 9 + Math.sin(a) * 2.6, 0]); }
qpts.push([0.2, 5.4, 0], [0, 4.2, 0]);
const qmark = add(at(clay.rope(qpts, 0.55, "#ff8a65", { seed: 41 }), QX, 0, 28));
qmark.add(at(ball(0.75, "#ff8a65"), 0, 2.4, 0));
hidden(qmark);

// ── The Sun, the orbit, the Earth ───────────────────────────────────────────────────────────────────────────────
const SUN = new THREE.Vector3(0, 3.2, 20);
const sun = add(at(ball(3, "#ffb238", { uneven: 0.04 }), SUN.x, SUN.y, SUN.z));
const sunLight = new THREE.PointLight("#fff1cc", 0, 0, 0);
sunLight.position.copy(SUN);
scene.add(sunLight);
const ring = (rx, rz) => {
  const pts = [];
  for (let i = 0; i < 64; i++) pts.push([SUN.x + Math.cos((i / 64) * Math.PI * 2) * rx, 0.45, SUN.z + Math.sin((i / 64) * Math.PI * 2) * rz]);
  return add(clay.rope(pts, 0.3, "#d98a66", { seed: 5 + rx, closed: true }));
};
// The stretched oval runs along z, the frame's height when seen from above; the real orbit is round.
const OVAL = [6, 14], MID = [8, 12], R = 10;
const oval = ring(...OVAL), mid = ring(...MID), round = ring(R, R);
for (const o of [oval, mid, round]) o.visible = false;
// The Earth: a blue lump with green land, a toothpick through its poles. earthG moves round the orbit; tiltG holds
// the tilt (fixed in the world, so the axis keeps pointing the same way); spinG turns it.
const earthG = add(new THREE.Group()), tiltG = new THREE.Group(), spinG = new THREE.Group();
earthG.add(tiltG);
tiltG.add(spinG);
const ER = 1.6;
spinG.add(ball(ER, "#2f86c9", { uneven: 0.04 }));
for (const [lat, lon, r] of [[0.75, 0.2, 0.62], [0.55, 1.1, 0.55], [-0.45, 0.9, 0.48], [0.15, 2.5, 0.45], [-0.6, 3.6, 0.4], [0.6, 4.4, 0.5]]) {
  const land = lump(new THREE.SphereGeometry(r, 24, 16), "#3fc37a");
  land.scale.set(1, 1, 0.26);
  const n = new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
  land.position.copy(n.clone().multiplyScalar(ER * 0.96));
  land.lookAt(n.clone().multiplyScalar(10));
  spinG.add(land);
}
const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, ER * 2.7, 10), new THREE.MeshStandardMaterial({ color: "#c99b6b", roughness: 0.8 }));
pick.castShadow = true;
tiltG.add(pick);
// Winter on the north: white clay pressed over the top (s05), and on the south's turn nothing changes on screen.
const snowCap = lump(new THREE.SphereGeometry(ER * 1.04, 40, 20, 0, Math.PI * 2, 0, 0.62), "#fbfbf7", { uneven: 0.05 });
tiltG.add(snowCap);
hidden(snowCap);
// The equator band and Indonesia's flag on it (s12).
const band = lump(new THREE.TorusGeometry(ER * 1.02, 0.16, 10, 64), "#e8574a", { size: 0.4 });
band.rotation.x = Math.PI / 2;
tiltG.add(band);
hidden(band);
const indo = clay.flag("Indonesia", { height: 1.9, size: 0.42, font: "600 120px Fredoka, sans-serif", lean: -0.2 });
indo.position.set(0.3, 0, ER * 0.98);
indo.rotation.x = 0.5;
tiltG.add(indo);
hidden(indo);
// A paper arrow along the axis, above the north pole (s07): it stays parallel as the Earth goes round.
const axisArrow = new THREE.Group();
axisArrow.add(at(lump(new THREE.CylinderGeometry(0.16, 0.16, 2.4, 8), "#e8574a"), 0, 1.2, 0));
axisArrow.add(at(lump(new THREE.ConeGeometry(0.5, 1, 10), "#e8574a"), 0, 2.8, 0));
axisArrow.position.y = ER * 1.7;
tiltG.add(axisArrow);
hidden(axisArrow);
// The paper protractor behind the Earth (s06b): the upright, the tilted line and the angle, drawn on card.
const protractor = (() => {
  const c = Object.assign(document.createElement("canvas"), { width: 1024, height: 1024 }), g = c.getContext("2d");
  g.fillStyle = "#fff8ea";
  g.beginPath(); g.arc(512, 640, 480, Math.PI, 0); g.lineTo(992, 700); g.lineTo(32, 700); g.closePath(); g.fill();
  g.strokeStyle = "#5a3a28"; g.lineWidth = 6;
  for (let a = 0; a <= 180; a += 10) { const r0 = a % 30 ? 440 : 410; g.beginPath(); g.moveTo(512 + Math.cos(deg(a)) * r0 * -1, 640 - Math.sin(deg(a)) * r0); g.lineTo(512 - Math.cos(deg(a)) * 470, 640 - Math.sin(deg(a)) * 470); g.stroke(); }
  g.setLineDash([22, 16]); g.beginPath(); g.moveTo(512, 640); g.lineTo(512, 120); g.stroke(); g.setLineDash([]);
  g.strokeStyle = "#e8574a"; g.lineWidth = 12;
  g.beginPath(); g.moveTo(512, 640); g.lineTo(512 - Math.sin(deg(TILT)) * 520, 640 - Math.cos(deg(TILT)) * 520); g.stroke();
  g.lineWidth = 8; g.beginPath(); g.arc(512, 640, 300, -Math.PI / 2 - deg(TILT), -Math.PI / 2); g.stroke();
  g.fillStyle = "#e8574a"; g.font = "700 120px Fredoka, sans-serif"; g.textAlign = "center"; g.fillText("23,4°", 250, 200);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, roughness: 0.9, side: THREE.DoubleSide }));
  m.receiveShadow = true;
  return m;
})();
earthG.add(protractor);
protractor.position.set(0, 0.6, -2.4);
hidden(protractor);
// Ghosts of the Earth at four places (s07b): small pale lumps with parallel toothpicks.
const ghost = (x, z) => {
  const g = new THREE.Group();
  const b = ball(1.0, "#9cc6e6", { uneven: 0.05 });
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.4, 8), new THREE.MeshStandardMaterial({ color: "#c99b6b" }));
  p.rotation.z = deg(TILT);
  g.add(b, p);
  g.position.set(x, 1.8, z);
  return add(g);
};
const orbitAt = (theta, rx = R, rz = R) => new THREE.Vector3(SUN.x + Math.cos(theta) * rx, 2.0, SUN.z - Math.sin(theta) * rz);
const ghosts = [Math.PI, (3 * Math.PI) / 2, Math.PI / 2].map((th) => { const p = orbitAt(th); return ghost(p.x, p.z); });
hidden(...ghosts);
// The Earth's place: on the stretched oval (phi) in s03 and s03b, on the round orbit (theta) after.
const E = { phi: 0, theta: Math.PI, onOval: 1, tilt: 0, spin: 0, hide: 1 };
film.each((t) => {
  const p = E.onOval > 0.5 ? new THREE.Vector3(SUN.x + Math.cos(E.phi) * OVAL[0], 2.0, SUN.z + Math.sin(E.phi) * OVAL[1]) : orbitAt(E.theta);
  earthG.position.copy(p);
  earthG.scale.setScalar(E.hide > 0.5 ? 0.001 : 1);
  tiltG.rotation.z = deg(E.tilt);
  spinG.rotation.y = E.spin + t * 0.5;
});
// The solar set's flags.
const fHot = flag("panas?", 4.5, 0, 25, { side: 1, size: 1.3, height: 3 });
const fCold = flag("dingin?", 2, 0, 7.5, { side: 1, size: 1.3, height: 3 });
const fScale = flag("bukan skala", -9.5, 0, 33, { side: 1, size: 1.1, height: 3 });
const fJan = flag("Januari · 147 juta km", -10.5, 0, 24, { side: 1, size: 1.1, height: 3 });
const fJul = flag("Juli · 152 juta km", 9.5, 0, 17, { side: -1, size: 1.1, height: 3 });
const fJune = flag("Juni", 11.8, 0, 23, { side: -1, size: 1.1 });
const fNorth = flag("utara condong", 8.5, 4.6, 19.5, { side: -1, height: 2.6, size: 0.8 });
const fDec = flag("Desember", -9, 0, 23.5, { side: 1, size: 1.7, height: 3.6 });
const fSouth = flag("selatan condong", -7.2, 0, 26.5, { side: 1, height: 2.4, size: 1.3 });
const fTilt = flag("miring ✓", -8.6, 0, 23.8, { side: 1, ink: "#e8574a", size: 2.0, height: 4 });
const fDist = flag("jarak ✗", 2.5, 0, 30, { side: 1, size: 2.0, height: 4 });
const fWinter = flag("Eropa: musim dingin", -0.3, ER * 0.9, 0.4, { height: 1.5, size: 0.36, side: 1, lean: 0.35 });
earthG.add(fWinter);
// Seen from above (s03 to s04b), a flag stands edge-on to the lens: those lean back, paper up, to face it.
for (const f of [fHot, fCold, fScale, fJan, fJul]) f.rotation.x = -1.1;
const solarFlags = [fHot, fCold, fScale, fJan, fJul, fJune, fNorth, fDec, fSouth, fTilt, fDist, fWinter];
hidden(...solarFlags);

// ── The torch over a slab, and a clock card (s09, s09b, s11) ────────────────────────────────────────────────────
const PIV = new THREE.Vector3(45, 1.05, 18);
add(at(lump(new THREE.BoxGeometry(13, 1, 9, 8, 2, 6), "#f6f1e7", { uneven: 0.03 }), 45, 0.5, 18));
const torch = add(at(new THREE.Group(), PIV.x, PIV.y, PIV.z));
torch.add(at(lump(new THREE.CylinderGeometry(1.3, 1.3, 4, 24), "#5c6f8a", { uneven: 0.04 }), 0, 11, 0));
torch.add(at(lump(new THREE.CylinderGeometry(2.0, 1.4, 1.4, 24), "#4a5a73", { uneven: 0.04 }), 0, 8.4, 0));
const beam = new THREE.Mesh(new THREE.ConeGeometry(2.6, 7.7, 32, 1, true), new THREE.MeshBasicMaterial({ color: "#fff1a8", transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
beam.position.y = 3.85;
torch.add(beam);
const patch = add(new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), new THREE.MeshBasicMaterial({ color: "#ffd84d", transparent: true, opacity: 0.95 })));
patch.rotation.x = -Math.PI / 2;
patch.position.set(PIV.x, PIV.y + 0.02, PIV.z);
const T = { tilt: 0, on: 0 };
film.each(() => {
  torch.rotation.z = -deg(T.tilt);
  beam.visible = patch.visible = T.on > 0.5;
  // The same light over a longer patch: stretched by 1 / cos(tilt), each bit of it dimmer by cos(tilt).
  const k = Math.cos(deg(T.tilt));
  patch.scale.set(1 / k, 1, 1);
  patch.position.x = PIV.x + Math.tan(deg(T.tilt)) * 1.2;
  patch.material.opacity = 0.95 * k;
});
const fNarrow = flag("sempit = panas", 46.5, 0, 23, { side: 1, size: 1.1, height: 4.5 });
const fWide = flag("lebar = dingin", 46.5, 0, 23, { side: 1, size: 1.1, height: 4.5 });
// The clock card: a clay disc on a stand, its day arc pressed on bead by bead.
const clock = add(at(new THREE.Group(), 35.5, 0, 21));
const face = at(lump(new THREE.CylinderGeometry(3.4, 3.4, 0.6, 40), "#fff6ea"), 0, 4.6, 0);
face.rotation.x = Math.PI / 2;
clock.add(face, at(lump(new THREE.BoxGeometry(1, 1.4, 1), "#d98a66"), 0, 0.7, 0));
const beads = Array.from({ length: 16 }, (_, i) => {
  const a = deg(-115 + (230 * i) / 15) - Math.PI / 2;
  return at(ball(0.42, "#ffb238"), Math.cos(a) * 2.5, 4.6 - Math.sin(a) * 2.5, 0.45);
});
clock.add(...beads);
const fDay = flag("siang lebih panjang", 38, 0, 25, { side: 1, size: 1.0 });
hidden(fNarrow, fWide, fDay, ...beads);

// ── Two plates: the noon Sun in Jakarta and in Berlin (s13, s13b) ───────────────────────────────────────────────
function plate(x, z, body) {
  const g = add(at(new THREE.Group(), x, 0, z));
  g.add(at(lump(new THREE.CylinderGeometry(4.4, 4.7, 0.6, 40), "#fff6ea"), 0, 0.3, 0));
  g.add(at(lump(new THREE.CapsuleGeometry(0.75, 1.6, 6, 12), body), 0, 2.0, 0));
  g.add(at(ball(0.85, "#ffd8c2"), 0, 3.7, 0));
  const arm = new THREE.Group();
  arm.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 8, 6), new THREE.MeshStandardMaterial({ color: "#c99b6b" })), 0, 4, 0));
  arm.add(at(ball(1.1, "#ffb238"), 0, 8.2, 0));
  arm.position.set(0, 0.6, 0);
  g.add(arm);
  return { g, arm };
}
const jkt = plate(39.5, 45, "#118ab2"), ber = plate(50.5, 45, "#ff8a65");
const sunsUp = { jkt: 0, ber: 0 };
film.each(() => {
  // The stick tips from the horizon (0) towards overhead (90): its angle is the Sun's height at noon.
  jkt.arm.rotation.z = -deg(90 - sunsUp.jkt);
  ber.arm.rotation.z = -deg(90 - sunsUp.ber);
});
const berSnow = [[-2.4, 1.6], [2, -2], [2.6, 1.8], [-1.6, -2.4]].map(([x, z]) => at(lump(new THREE.SphereGeometry(0.9, 20, 12), "#fbfbf7"), x, 0.7, z));
berSnow.forEach((b) => (b.scale.y = 0.5, ber.g.add(b)));
const fJkt = flag(`Jakarta · ≥ ${JAKARTA_LOW}°`, 36.5, 0, 50, { side: 1, size: 1.0, height: 3.4 });
const fBer = flag(`Berlin, Des · ${BERLIN_DEC}°`, 47.5, 0, 50, { side: 1, size: 1.0, height: 3.4 });
hidden(fJkt, fBer, ...berSnow);

// ── The camera, set by set (stop motion: it moves on the twelves too) ──────────────────────────────────────────
const VIEW = {
  village: { az: 0, el: 14, dist: 52, tx: VX + 1.5, ty: 5, tz: 1, fov: 32 },
  beach: { az: 0, el: 16, dist: 58, tx: BX, ty: 4.5, tz: 3, fov: 32 },
  qmark: { az: 0, el: 10, dist: 34, tx: QX, ty: 5.5, tz: 28, fov: 32 },
  top: { az: 0, el: 82, dist: 70, tx: 0, ty: 0, tz: 21, fov: 32 },
  front: { az: 0, el: 40, dist: 84, tx: 0, ty: 0, tz: 21, fov: 32 },
  june: { az: 0, el: 10, dist: 50, tx: 5, ty: 2.6, tz: 20, fov: 32 },
  torch: { az: 6, el: 16, dist: 44, tx: 45, ty: 7, tz: 18, fov: 32 },
  clock: { az: -6, el: 14, dist: 40, tx: 39, ty: 4.5, tz: 21, fov: 32 },
  plates: { az: 0, el: 16, dist: 62, tx: 45, ty: 4.5, tz: 45, fov: 32 },
};
const earthView = (theta, dist = 15) => { const p = orbitAt(theta); return { az: 0, el: 20, dist, tx: p.x, ty: p.y + 0.9, tz: p.z, fov: 32 }; };
Object.assign(space.cam, VIEW.village);
const move = (to, t, d = 0.8, ease = "power2.inOut") => tl.to(space.cam, { ...to, duration: d, ease }, t);
// The Sun lights the Earth while we are at the solar set; the studio key dims a little there.
const lightSolar = (t, on) => tl.to(sunLight, { intensity: on ? 2.2 : 0, duration: 0.3 }, t);

// s01: the village in falling snow, then the camera tilts down to the beach.
move(VIEW.beach, 1.7, 2.0, "sine.inOut");
tl.to(beachSun.scale, { x: 1.12, y: 1.12, z: 1.12, duration: 0.4, repeat: 3, yoyo: true }, 2.6);
// s02: a clay question mark is set on the table.
move(VIEW.qmark, s.s02.start - 0.15, 0.6);
plop(qmark, s.s02.start + 0.15);
// s03: top-down on the Sun and a stretched oval; the Earth is set on it.
move(VIEW.top, s.s03.start - 0.2, 0.9);
lightSolar(s.s03.start, true);
tl.set(oval, { visible: true }, s.s03.start);
tl.set(E, { hide: 0 }, s.s03.start + 0.5);
plop(fScale, s.s03.start + 1.4, 1);
// s03b: near the Sun 'panas?', far 'dingin?'.
plop(fHot, s.s03b.start + 0.2);
tl.to(E, { phi: -Math.PI / 2, duration: 1.4, ease: "power1.inOut" }, s.s03b.start + 0.6);
plop(fCold, s.s03b.start + 2.0);
// s04: the oval is pressed round (replacement: oval, middle, round), the Earth to its January place.
[fHot, fCold, fScale].forEach((f) => gone(f, s.s04.start));
tl.set(oval, { visible: false }, s.s04.start + 0.25);
tl.set(mid, { visible: true }, s.s04.start + 0.25);
tl.set(mid, { visible: false }, s.s04.start + 0.5);
tl.set(round, { visible: true }, s.s04.start + 0.5);
tl.set(E, { onOval: 0, theta: Math.PI }, s.s04.start + 0.5);
// s04b: the two distances.
plop(fJan, s.s04b.start + 0.1);
plop(fJul, s.s04b.start + 0.5);
// s05: close on the January Earth; winter snow pressed on the north.
move(earthView(Math.PI), s.s05.start - 0.1, 0.8);
[fJan, fJul].forEach((f) => gone(f, s.s05.start));
plop(snowCap, s.s05.start + 0.6);
plop(fWinter, s.s05.start + 1.3, 1);
// s06: closer; the Earth turns to show its toothpick.
gone(fWinter, s.s06.start);
move(earthView(Math.PI, 12), s.s06.start, 0.7);
tl.to(E, { spin: "+=1.6", duration: 1.2, ease: "power1.inOut" }, s.s06.start + 0.2);
// s06b: the toothpick tips to 23.4 degrees; the paper protractor behind it.
move(earthView(Math.PI, 19), s.s06b.start + 0.1, 0.7);
tl.to(E, { tilt: TILT, duration: 0.9, ease: "power2.inOut" }, s.s06b.start + 0.3);
plop(protractor, s.s06b.start + 1.3);
// s07: pull back; a paper arrow along the axis.
gone(protractor, s.s07.start);
gone(snowCap, s.s07.start);
move(VIEW.front, s.s07.start, 1.0);
plop(axisArrow, s.s07.start + 0.9);
// s07b: round the orbit, leaving pale ghosts with parallel toothpicks; it stops at June.
plop(ghosts[0], s.s07b.start + 0.1, 1);
tl.to(E, { theta: 2 * Math.PI, duration: s.s07b.end - s.s07b.start - 0.2, ease: "power1.inOut" }, s.s07b.start + 0.1);
plop(ghosts[1], s.s07b.start + 1.1, 1);
plop(ghosts[2], s.s07b.start + 1.5, 1);
// s08: June: the Sun on the left, the Earth on the right, its north leaning in.
move(VIEW.june, s.s08.start - 0.1, 0.9);
[...ghosts, axisArrow].forEach((g) => gone(g, s.s08.start));
tl.set(E, { theta: 0 }, s.s08.start);
plop(fJune, s.s08.start + 0.9);
plop(fNorth, s.s08.start + 1.7, 1);
// s09: the torch: straight down, a small bright patch.
move(VIEW.torch, s.s09.start - 0.15, 0.9);
tl.set(T, { on: 1 }, s.s09.start + 0.6);
plop(fNarrow, s.s09.start + 1.6);
// s09b: the clock card: the day arc pressed on, longer than half.
move(VIEW.clock, s.s09b.start - 0.1, 0.6);
beads.forEach((b, i) => plop(b, s.s09b.start + 0.2 + i * 0.06, 1));
plop(fDay, s.s09b.start + 1.2);
// s10: back to the orbit; half a turn round the back to December; the south leans in now.
move(VIEW.front, s.s10.start - 0.1, 0.9);
[fJune, fNorth, fDay].forEach((f) => gone(f, s.s10.start));
tl.to(E, { theta: Math.PI, duration: 2.0, ease: "power1.inOut" }, s.s10.start + 0.3);
plop(fDec, s.s10.start + 2.4);
plop(fSouth, s.s10.start + 2.9, 1);
// s11: the torch tips: the same light, a long dim patch.
move({ ...VIEW.torch, dist: 52, tx: 48, ty: 6.5 }, s.s11.start - 0.1, 0.9);
gone(fNarrow, s.s11.start);
tl.to(T, { tilt: 52, duration: 1.3, ease: "power2.inOut" }, s.s11.start + 0.5);
plop(fWide, s.s11.start + 2.2);
// s12: close on the Earth: the equator band and Indonesia's flag.
move(earthView(Math.PI, 12.5), s.s12.start - 0.1, 0.9);
[fDec, fSouth, fWide].forEach((f) => gone(f, s.s12.start));
tl.set(T, { on: 0 }, s.s12.start);
plop(band, s.s12.start + 1.4);
plop(indo, s.s12.start + 2.5);
// s13: the Jakarta plate: the noon Sun rises overhead and never drops below 60 degrees.
move({ ...VIEW.plates, tx: 39.5, dist: 40 }, s.s13.start - 0.1, 0.9);
tl.to(sunsUp, { jkt: 90, duration: 0.9, ease: "power2.out" }, s.s13.start + 0.4);
tl.to(sunsUp, { jkt: JAKARTA_LOW, duration: 0.9, ease: "power1.inOut" }, s.s13.start + 1.4);
plop(fJkt, s.s13.start + 2.0);
// s13b: Berlin in December beside it: the Sun only 14 degrees up, snow on the plate.
move(VIEW.plates, s.s13b.start - 0.1, 0.7);
tl.to(sunsUp, { ber: BERLIN_DEC, duration: 0.9, ease: "power2.out" }, s.s13b.start + 0.3);
berSnow.forEach((b, i) => plop(b, s.s13b.start + 0.9 + i * 0.12, 1));
plop(fBer, s.s13b.start + 1.3);
// s14: the answer: tilt, not distance.
move(VIEW.front, s.s14.start - 0.1, 0.9);
plop(fTilt, s.s14.start + 0.8);
plop(fDist, s.s14.start + 1.8);
// s15: the camera cranes back up to the snowy village, the framing of frame 0.
move(VIEW.village, s.s15.start + 0.1, D - s.s15.start - 0.3, "power2.inOut");
lightSolar(s.s15.start + 0.4, false);

film.each((t) => {
  clay.update(t);
  space.render(1, t);
});
film.finish();
