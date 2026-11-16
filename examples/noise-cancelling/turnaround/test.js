import { createFilm } from "../../../kit/engine/motion.js";
import { createStage3D } from "../../../kit/engine/stage3d.js";
import { createParts } from "../../../kit/engine/parts3d.js";
import { createModels } from "../models.js";
import { createSet } from "../set.js";
import { cutaway } from "../tools3d.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, $ } = film;
const space = createStage3D($("#space"), { rig: true, shadows: true, environment: 0.75 });
const P = createParts(space);
const set = createSet(space, P, { floorY: -140 });
const Mo = createModels(space, P);
space.scene.add(Mo.phones, Mo.head);
const ex = space.explode(Mo.cup);
const exD = space.explode(Mo.drv);
const cut = cutaway(space, Mo.cup);
const cutHead = new space.THREE.Plane(new space.THREE.Vector3(0, -1, 0), 1000);
cutaway(space, Mo.head, cutHead);
const A = Mo.anchor;
const poses = [
  ["phones 3/4", { head: 0, az: 35, el: 16, dist: 620, tx: 0, ty: 40, tz: -10, fov: 30 }],
  ["phones side", { head: 0, az: 90, el: 4, dist: 620, tx: 0, ty: 40, tz: -10, fov: 30 }],
  ["phones back 3/4", { head: 0, az: 150, el: 20, dist: 620, tx: 0, ty: 40, tz: -10, fov: 30 }],
  ["phones top", { head: 0, az: 60, el: 70, dist: 620, tx: 0, ty: 40, tz: -10, fov: 30 }],
  ["cup outside macro", { head: 0, az: 100, el: 20, dist: 150, tx: A.ffMic.x, ty: A.ffMic.y, tz: A.ffMic.z, fov: 22 }],
  ["cup exploded", { head: 0, ex: 1, az: 140, el: 18, dist: 420, tx: 110, ty: 10, tz: -12, fov: 26 }],
  ["cup cutaway", { head: 0, cut: -12, az: 60, el: 50, dist: 300, tx: 100, ty: 6, tz: -12, fov: 26 }],
  ["driver exploded", { head: 0, ex: 1, exD: 1, az: 40, el: 18, dist: 230, tx: 80, ty: 8, tz: -12, fov: 24 }],
  ["board macro", { head: 0, ex: 1, az: 95, el: 30, dist: 120, tx: 152, ty: 14, tz: -10, fov: 22 }],
  ["cushion macro", { head: 0, az: 70, el: 10, dist: 150, tx: 75, ty: -20, tz: 10, fov: 22 }],
  ["head side, ear", { head: 1, phones: 0, az: 90, el: 6, dist: 330, tx: 70, ty: 5, tz: -8, fov: 24 }],
  ["ear back 3/4", { head: 1, phones: 0, az: 135, el: 12, dist: 220, tx: 75, ty: 5, tz: -10, fov: 24 }],
  ["ear front 3/4", { head: 1, phones: 0, az: 55, el: 10, dist: 220, tx: 75, ty: 5, tz: -8, fov: 24 }],
  ["ear close", { head: 1, phones: 0, az: 100, el: 14, dist: 110, tx: 78, ty: 2, tz: -6, fov: 22 }],
  ["worn wide", { head: 1, phones: 1, az: 120, el: 14, dist: 820, tx: 0, ty: 10, tz: -10, fov: 30 }],
  ["canal cutaway", { head: 1, phones: 0, headCut: 0.5, az: 90, el: 62, dist: 170, tx: 62, ty: 0, tz: -4, fov: 26 }],
  ["worn cutaway", { head: 1, phones: 1, headCut: 0.5, cut: -12, az: 90, el: 58, dist: 300, tx: 75, ty: 0, tz: -8, fov: 26 }],
  ["head back 3/4", { head: 1, phones: 0, az: 160, el: 10, dist: 700, tx: 0, ty: 0, tz: -10, fov: 30 }],
];
const st = { i: 0 };
tl.to(st, { i: poses.length - 1, duration: poses.length - 1, ease: "none" }, 0);
film.each((t) => {
  const [name, p] = poses[Math.round(st.i)];
  $("#tag").textContent = name;
  Object.assign(space.cam, { roll: 0, sway: 0, blur: 0, focus: 0 }, p);
  Mo.head.visible = !!p.head;
  Mo.phones.visible = p.phones !== 0;
  ex.explode = p.ex ?? 0;
  exD.explode = p.exD ?? 0;
  cut.constant = p.cut ?? 1e5;
  cutHead.constant = p.headCut ?? 1000;
  set.state.floor = p.head ? 0 : 1;
  set.update(t);
  space.fitShadow(p.dist * 0.5);
  space.render(1, t);
});
film.finish();
