// The coin world of "Kok uang bisa beranak?": 3D gold coins on the kit's stage, drawn only from a state the timeline
// tweens. One coin is Rp1 juta; a slice a tenth of a coin's thickness is the 10% a coin earns in a year.
//
// Layout is in frame pixels (the storyboard's drawn frames): a stack "stands at (x, base)" means the front of its
// lowest coin's bottom edge is at that point on screen when the view is at rest. The camera looks slightly down
// (TILT), so a coin's top face reads as an ellipse a third as tall as it is wide, as the board draws it.
import { createStage3D } from "../../kit/engine/stage3d.js";

export const TILT = 0.33;
export const R_PX = 120; // a coin's radius on screen
export const T_PX = 26; // its thickness on screen
const COS = Math.cos(TILT);

export async function createCoins(canvas) {
  const space = createStage3D(canvas, { environment: 0.95, exposure: 1.0 });
  const { THREE, UNIT } = space;
  const R = R_PX / UNIT;
  const H = T_PX / UNIT / COS;
  // A frame pixel to the tilted world: x across, y up the stack.
  const lx = (x) => (x - 960) / UNIT;
  const ly = (y) => -(y - 540) / UNIT / COS;

  // ── Light: the kit's key and rim, warmed, and a near light that draws a falloff across the stack ───────────
  space.key.color.set(0xfff1dc);
  space.key.intensity = 2.3;
  space.rim.color.set(0xffd9a0);
  space.rim.intensity = 2.0;
  const near = new THREE.PointLight(0xffd8a0, 900, 0, 2);
  near.position.set(-6, 14, 22);
  space.scene.add(near);
  const cool = new THREE.PointLight(0x9cc8ff, 0, 0, 2);
  cool.position.set(26, 8, 18);
  space.scene.add(cool);

  // ── The coin: a lathe for the rim and the reeded edge, two discs for the faces ───────────────────────────
  const rimPts = [
    [0.84, 0.07], [0.87, 0.0], [0.965, 0.0], [1.0, 0.05], [1.0, 0.95], [0.965, 1.0], [0.87, 1.0], [0.84, 0.93],
  ].map(([r, y]) => new THREE.Vector2(r * R, y * H));
  const lathe = (segments, reeds) => {
    const g = new THREE.LatheGeometry(rimPts, segments);
    if (reeds) {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const z = p.getZ(i);
        const y = p.getY(i);
        const r = Math.hypot(x, z);
        if (r > 0.995 * R && y > 0.04 * H && y < 0.96 * H) {
          const a = Math.atan2(z, x);
          const k = 1 + 0.009 * Math.cos(a * reeds);
          p.setX(i, x * k);
          p.setZ(i, z * k);
        }
      }
      g.computeVertexNormals();
    }
    return g;
  };
  const rimGeo = lathe(720, 180);
  const rimLow = lathe(96, 0);

  // The face: a bump map of fine rings, a beaded border and "1 JUTA" in relief.
  const faceTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d");
    g.fillStyle = "#808080";
    g.fillRect(0, 0, 512, 512);
    g.translate(256, 256);
    for (let r = 40; r < 200; r += 7) {
      g.strokeStyle = r % 14 ? "#8c8c8c" : "#747474";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.stroke();
    }
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      g.fillStyle = "#d8d8d8";
      g.beginPath();
      g.arc(Math.cos(a) * 226, Math.sin(a) * 226, 5.5, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = "#e0e0e0";
    g.lineWidth = 6;
    g.beginPath();
    g.arc(0, 0, 208, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "#f2f2f2";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "700 210px 'Sora Variable', sans-serif";
    g.fillText("1", 0, -18);
    g.font = "700 62px 'Sora Variable', sans-serif";
    g.fillText("JUTA", 0, 112);
    g.font = "600 46px 'Sora Variable', sans-serif";
    g.fillText("Rp", 0, -146);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  })();
  const faceGeo = new THREE.CircleGeometry(0.845 * R, 96);
  faceGeo.rotateX(-Math.PI / 2);
  const backGeo = new THREE.CircleGeometry(0.845 * R, 48);
  backGeo.rotateX(Math.PI / 2);

  const metal = (color, rough = 0.27) => {
    const m = new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: rough, clearcoat: 0.5, clearcoatRoughness: 0.18, side: THREE.DoubleSide });
    return m;
  };
  const faceMat = (m) => {
    const f = m.clone();
    f.bumpMap = faceTex;
    f.bumpScale = 2.2;
    f.clearcoat = 0.15;
    f.roughness = 0.34;
    f.side = THREE.FrontSide;
    return f;
  };
  const GOLD = new THREE.Color(0xd49a2c);
  const BUNGA = new THREE.Color(0xf7b832);
  const BLUE = new THREE.Color(0x8fb9ff);
  const ember = new THREE.Color(0x8a4c00);

  // A coin is a group; its material is its own so it can change colour on its way (gold to blue).
  const makeCoin = (kind = "gold", detail = true) => {
    const mat = metal(kind === "bunga" ? BUNGA : kind === "blue" ? BLUE : GOLD, kind === "bunga" ? 0.2 : 0.28);
    const fm = faceMat(mat);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(detail ? rimGeo : rimLow, mat));
    const face = new THREE.Mesh(faceGeo, fm);
    face.position.y = 0.93 * H;
    g.add(face);
    const back = new THREE.Mesh(backGeo, mat);
    back.position.y = 0.07 * H;
    g.add(back);
    g.userData = { mat, fm };
    return g;
  };
  const tint = (c, colour, glow = 0) => {
    for (const m of [c.userData.mat, c.userData.fm]) {
      m.color.copy(colour);
      m.emissive.copy(ember).multiplyScalar(glow);
    }
  };

  // ── Slices: the tenth each coin earns ───────────────────────────────────────────────────────────────────
  const sliceGeo = new THREE.CylinderGeometry(0.985 * R, 0.985 * R, H / 10, 96);
  sliceGeo.translate(0, H / 20, 0);
  const sliceMat = () => new THREE.MeshPhysicalMaterial({ color: 0xf7b832, metalness: 1, roughness: 0.3, emissive: 0x8a4c00, emissiveIntensity: 0.4 });

  // ── Contact shadows ─────────────────────────────────────────────────────────────────────────────────────
  const shadowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(0,0,0,0.85)");
    grad.addColorStop(0.45, "rgba(0,0,0,0.5)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = (w = 3.0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(R * w, R * w), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.7 }));
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = -1;
    return m;
  };

  // ── The world: outer group = the camera's travel and zoom, inner = the tilt and a slow orbit ─────────────
  const outer = new THREE.Group();
  const world = new THREE.Group();
  world.rotation.x = TILT;
  outer.add(world);
  space.scene.add(outer);

  const at = (obj, x, base) => obj.position.set(lx(x), ly(base) , 0);

  // The pokok stack, at (820, 860) in the layout: ten gold coins and up to two more on top.
  const STACK = { x: 820, base: 860 };
  const BUNGA_AT = { x: 1360, base: 860 };
  const BLUE_AT = { x: 1660, base: 860 };
  const pokok = [];
  for (let i = 0; i < 10; i++) {
    const c = makeCoin("gold");
    world.add(c);
    pokok.push(c);
  }
  const stackShadow = shadow();
  world.add(stackShadow);
  const bungaShadow = shadow();
  world.add(bungaShadow);
  const blueShadow = shadow();
  world.add(blueShadow);

  // Movers: coins that are born, fly and land. Each has a state the timeline tweens: x, base (frame pixels), lift
  // (extra height in coin thicknesses), vis (0..1 scale-in), blue (0 gold .. 1 blue), glow, spin.
  const mover = (kind = "bunga") => {
    const c = makeCoin(kind);
    world.add(c);
    const s = { x: 0, base: 860, lift: 0, vis: 0, blue: 0, glow: 0.35, spin: 0, tilt: 0 };
    return { c, s };
  };
  const child = mover(); // the hook's newborn, and the year-1 bunga that is taken or kept
  const blues = Array.from({ length: 5 }, () => mover());
  const top2 = mover(); // year 2's bunga (Rp1 juta part)

  // Slices: eleven, one per coin of the stack (the 11th belongs to the bunga coin on top).
  const slices = Array.from({ length: 11 }, () => {
    const m = new THREE.Mesh(sliceGeo, sliceMat());
    world.add(m);
    return { m, s: { k: 0, out: 0, fly: 0, x: 0, base: 860, vis: 0, hot: 0 } };
  });

  // ── The skyline: a column of coins for every year, 0 to 30 (4 px a juta), for the answer ────────────────
  const SKY = { x0: 300, step: 40, base: 900, px: 3.9, r: 15 };
  const stripeTex = (() => {
    const c = document.createElement("canvas");
    c.width = 8;
    c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 8, 64);
    g.fillStyle = "#6a6a6a";
    g.fillRect(0, 56, 8, 8);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const sky = new THREE.Group();
  world.add(sky);
  const colMat = new THREE.MeshPhysicalMaterial({ color: GOLD, metalness: 1, roughness: 0.3, clearcoat: 0.4, map: stripeTex });
  const topMat = faceMat(metal(BUNGA, 0.22));
  const columns = [];
  const rc = SKY.r / UNIT;
  for (let y = 0; y <= 30; y++) {
    const value = 10 * 1.1 ** y;
    const hp = value * SKY.px; // pixels on screen
    const h = hp / UNIT / COS;
    const coinsTall = value; // one coin per Rp1 juta
    const geo = new THREE.CylinderGeometry(rc, rc, 1, 48, 1, true);
    geo.translate(0, 0.5, 0);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * coinsTall);
    const col = new THREE.Mesh(geo, colMat);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(rc, 40).rotateX(-Math.PI / 2), topMat);
    const g = new THREE.Group();
    g.add(col, cap);
    g.position.set(lx(SKY.x0 + y * SKY.step), ly(SKY.base), 0);
    sky.add(g);
    columns.push({ g, col, cap, h });
  }
  // The simple-interest heights as a thin cool line across the columns: 10 + t juta.
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x8cc8ff, transparent: true, opacity: 0, depthTest: false });
  const blueLine = (() => {
    const a = new THREE.Vector3(lx(SKY.x0), ly(SKY.base) + (10 * SKY.px) / UNIT / COS, 0.9);
    const b = new THREE.Vector3(lx(SKY.x0 + 30 * SKY.step), ly(SKY.base) + (40 * SKY.px) / UNIT / COS, 0.9);
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, len, 8), lineMat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return m;
  })();
  sky.add(blueLine);

  // ── The state the timeline tweens ───────────────────────────────────────────────────────────────────────
  const S = {
    vis: 1,
    view: { px: 960, py: 540, zoom: 1, orbit: 0 },
    stack: 1, // the pokok stack (0 hides it)
    top: 0, // 0..1: the year-1 bunga sits on top of the stack (s07 on)
    sky: 0, // the skyline is shown instead of the stack
    grow: 0, // 0..31: how many columns have risen
    blueLine: 0,
    near: 1,
    cool: 0,
    bungaShadow: 0,
    blueShadow: 0,
  };

  const place = (obj, x, base, lift = 0) => obj.position.set(lx(x), ly(base) + lift * H, 0);

  function render(t) {
    const v = S.view;
    // screen = (layout - view.p) * zoom + centre
    outer.scale.setScalar(v.zoom);
    outer.position.set(-lx(v.px) * v.zoom, -ly(v.py) * COS * v.zoom, 0);
    world.rotation.y = v.orbit;
    near.intensity = 900 * S.near;
    cool.intensity = 700 * S.cool;

    const coinsOn = S.sky < 1;
    for (let i = 0; i < 10; i++) {
      pokok[i].visible = coinsOn && S.stack > 0;
      place(pokok[i], STACK.x, STACK.base, i);
    }
    place(stackShadow, STACK.x, STACK.base, -0.02);
    stackShadow.visible = coinsOn && S.stack > 0;
    place(bungaShadow, BUNGA_AT.x, BUNGA_AT.base, -0.02);
    bungaShadow.material.opacity = 0.7 * S.bungaShadow;
    bungaShadow.visible = coinsOn && S.bungaShadow > 0.01;
    place(blueShadow, BLUE_AT.x, BLUE_AT.base, -0.02);
    blueShadow.material.opacity = 0.7 * S.blueShadow;
    blueShadow.visible = coinsOn && S.blueShadow > 0.01;

    for (const m of [child, ...blues, top2]) {
      const { c, s } = m;
      c.visible = coinsOn && s.vis > 0.001;
      if (!c.visible) continue;
      place(c, s.x, s.base, s.lift);
      c.scale.setScalar(Math.max(0.001, s.vis));
      c.rotation.set(s.tilt, s.spin, 0);
      const col = BUNGA.clone().lerp(BLUE, s.blue);
      tint(c, col, s.glow * (1 - s.blue));
    }
    for (const { m, s } of slices) {
      m.visible = coinsOn && s.vis > 0.001;
      if (!m.visible) continue;
      // From inside coin k of the stack, out to the right by `out` px, then flying to its place in a column.
      const fromX = STACK.x + s.out;
      const fromY = s.k + 0.45;
      const x = fromX + (s.x - fromX) * s.fly;
      const lift = fromY + (s.base - fromY) * s.fly + Math.sin(Math.PI * s.fly) * 1.4;
      place(m, x, STACK.base, lift);
      m.scale.set(1, Math.max(0.001, s.vis), 1);
      m.material.emissiveIntensity = 0.4 + 1.6 * s.hot;
      m.material.emissive.setRGB(0.54 + 0.46 * s.hot, 0.3 + 0.62 * s.hot, 0.0 + 0.62 * s.hot);
    }

    sky.visible = S.sky > 0;
    if (sky.visible) {
      columns.forEach(({ g, h }, y) => {
        const p = Math.min(1, Math.max(0, S.grow - y));
        const e = 1 - (1 - p) ** 3;
        g.visible = p > 0;
        g.scale.set(1, 1, 1);
        g.children[0].scale.y = Math.max(0.001, h * e);
        g.children[1].position.y = h * e;
      });
      lineMat.opacity = 0.85 * S.blueLine;
      blueLine.visible = S.blueLine > 0.01;
    }
    space.render(S.vis);
  }

  return { S, child, blues, top2, slices, render, H_PX: T_PX, STACK, BUNGA_AT, BLUE_AT, SKY, UNIT };
}
