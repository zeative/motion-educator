// The lit 3D layer of this film: a red onion on a wooden board (whole, or cut in two with its ringed face to the
// camera), a chef's knife, and the gas molecule (syn-propanethial-S-oxide) in ball and stick. All of it is drawn
// from plain state the timeline tweens; nothing reads a clock.
//
//   const k = createKitchen(canvas);  film.each((t) => k.render(K, t));
//
// K: vis (layer opacity), cam (x, y, z: where the camera is; tx, ty, tz: what it looks at), onion (x, y, z, s,
//    turn), front (0: in place .. 1: fallen away), whole (1 shows the uncut onion, 0 the cut back half),
//    knife (x, y, z, rx, ry, rz, vis), board (vis), sun (0..1: the key light's swing, for days passing),
//    mol (vis, x, y, s, turn, tilt, glow).
import { createStage3D } from "../../kit/engine/stage3d.js";

const TAU = Math.PI * 2;
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The bulb's outline: round, drawn up into a neck, flattened at the root. Points (r, y), r >= 0, bottom to top.
export function profile(n = 64) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / n;
    let r = Math.cos(a);
    let y = Math.sin(a);
    // a round bulb, a little wider than tall, drawn up into a short neck and flattened at the root
    if (y > 0) {
      y *= 1 + 0.22 * y ** 4;
      r *= 1 - 0.18 * y ** 6;
    } else {
      y *= 0.94;
    }
    y = Math.max(y, -0.86);
    pts.push([Math.max(0.0005, r * 1.08), y]);
  }
  return pts;
}

export function createKitchen(canvas) {
  const space = createStage3D(canvas, { distance: 100, fov: 30, exposure: 1.08, environment: 0.5 });
  const { THREE, scene, camera, renderer } = space;
  const rand = rng(7);
  space.key.color.set(0xffe7cc);
  space.key.intensity = 2.5;
  space.rim.color.set(0xb7c8ff);
  space.rim.intensity = 1.9;
  const fill = new THREE.PointLight(0xffb070, 700, 160, 2);
  fill.position.set(-40, 10, 60);
  scene.add(fill);
  const gasLight = new THREE.PointLight(0xb6f03a, 0, 120, 2);
  scene.add(gasLight);

  // ── Textures, painted once ─────────────────────────────────────────────
  const paint = (w, h, fn) => {
    const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
    fn(c.getContext("2d"), w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  };
  // The skin: deep red-violet with fine veins running from root to neck, and a few papery patches.
  const skinMap = paint(1024, 512, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#3c0b26");
    grad.addColorStop(0.18, "#5e1740");
    grad.addColorStop(0.55, "#7a2253");
    grad.addColorStop(0.9, "#5a1638");
    grad.addColorStop(1, "#d9c2a6");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 190; i++) {
      const x = rand() * w;
      const light = rand() < 0.5;
      g.strokeStyle = light ? `rgba(196, 92, 150, ${0.14 + rand() * 0.22})` : `rgba(32, 4, 20, ${0.18 + rand() * 0.25})`;
      g.lineWidth = 0.8 + rand() * 2.4;
      g.beginPath();
      let px = x;
      g.moveTo(px, 0);
      for (let y = 0; y <= h; y += 16) {
        px += (rand() - 0.5) * 3;
        g.lineTo(px, y);
      }
      g.stroke();
    }
    for (let i = 0; i < 9; i++) {
      g.fillStyle = `rgba(230, 196, 170, ${0.06 + rand() * 0.08})`;
      g.beginPath();
      g.ellipse(rand() * w, h * (0.2 + rand() * 0.6), 30 + rand() * 80, 60 + rand() * 120, 0, 0, TAU);
      g.fill();
    }
  });
  // The cut face: concentric layers, each a thin violet rim around white-pink flesh, in the bulb's own shape.
  const P = profile(96);
  const yMin = -0.86;
  const yMax = Math.max(...P.map(([, y]) => y));
  const faceMap = paint(1024, 1024, (g, w, h) => {
    const sx = (x) => w / 2 + (x * w) / 2.1;
    const sy = (y) => h - ((y - yMin) / (yMax - yMin)) * h * 0.98 - h * 0.01;
    g.fillStyle = "#3c0b26";
    g.fillRect(0, 0, w, h);
    const outline = (k, cy) => {
      g.beginPath();
      P.forEach(([r, y], i) => {
        const yy = cy + (y - cy) * k;
        const fn = i ? "lineTo" : "moveTo";
        g[fn](sx(r * k), sy(yy));
      });
      for (let i = P.length - 1; i >= 0; i--) {
        const [r, y] = P[i];
        g.lineTo(sx(-r * k), sy(cy + (y - cy) * k));
      }
      g.closePath();
    };
    const cy = -0.3; // the layers centre a little below the middle, toward the root
    const layers = 12;
    for (let i = 0; i < layers; i++) {
      const k = 1 - (i / layers) * 0.93;
      const rim = i === 0 ? 0.03 : 0.007 + rand() * 0.012;
      outline(k, cy);
      g.fillStyle = i === 0 ? "#4a0f33" : "#8e2a6a";
      g.fill();
      outline(k - rim * 0.5, cy);
      g.fillStyle = "#c2589a";
      g.fill();
      outline(k - rim, cy);
      const fg = g.createRadialGradient(sx(0), sy(cy), 10, sx(0), sy(cy), w * 0.52 * k);
      fg.addColorStop(0, "#fff8fb");
      fg.addColorStop(0.7, "#f6e8f0");
      fg.addColorStop(0.93, "#ecd2e2");
      fg.addColorStop(1, "#dcb2cc");
      g.fillStyle = fg;
      g.fill();
    }
    // fine streaks along the layers, and wet glints
    g.globalAlpha = 0.18;
    for (let i = 0; i < 160; i++) {
      g.strokeStyle = rand() < 0.5 ? "#c77aa6" : "#ffffff";
      g.lineWidth = 1 + rand() * 1.5;
      const x = sx((rand() - 0.5) * 1.6);
      const y0 = sy(-0.7 + rand() * 1.3);
      g.beginPath();
      g.moveTo(x, y0);
      g.lineTo(x + (rand() - 0.5) * 10, y0 - 40 - rand() * 80);
      g.stroke();
    }
    g.globalAlpha = 1;
    // the core
    g.fillStyle = "#e9d6a8";
    g.beginPath();
    g.ellipse(sx(0), sy(cy - 0.1), w * 0.025, h * 0.05, 0, 0, TAU);
    g.fill();
  });
  const woodMap = paint(1024, 256, (g, w, h) => {
    g.fillStyle = "#7a4a26";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const y = rand() * h;
      g.strokeStyle = rand() < 0.5 ? `rgba(60, 30, 12, ${0.2 + rand() * 0.3})` : `rgba(190, 130, 80, ${0.12 + rand() * 0.2})`;
      g.lineWidth = 1 + rand() * 4;
      g.beginPath();
      for (let x = 0; x <= w; x += 20) g.lineTo(x, y + Math.sin(x / 90 + i) * 4 + (rand() - 0.5) * 2);
      g.stroke();
    }
  });

  // ── The onion ───────────────────────────────────────────────────────────
  const R = 13;
  const pts = P.map(([r, y]) => new THREE.Vector2(r * R, y * R));
  const skin = new THREE.MeshPhysicalMaterial({ map: skinMap, roughness: 0.5, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.26, envMapIntensity: 0.6 });
  const faceMat = new THREE.MeshPhysicalMaterial({ map: faceMap, roughness: 0.28, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, side: THREE.DoubleSide });
  // A flat section through the axis, in the plane z = 0, facing +z (its uv from its own position).
  const section = () => {
    const shape = new THREE.Shape();
    P.forEach(([r, y], i) => (i ? shape.lineTo(r * R, y * R) : shape.moveTo(r * R, y * R)));
    for (let i = P.length - 1; i >= 0; i--) shape.lineTo(-P[i][0] * R, P[i][1] * R);
    const geo = new THREE.ShapeGeometry(shape, 24);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2.1 * R), 0.01 + (0.98 * (pos.getY(i) / R - yMin)) / (yMax - yMin));
    return geo;
  };
  const back = new THREE.Group(); // z <= 0: its cut face looks at the camera
  const backSkin = new THREE.Mesh(new THREE.LatheGeometry(pts, 96, Math.PI / 2, Math.PI), skin);
  const backFace = new THREE.Mesh(section(), faceMat);
  backFace.position.z = 0.02;
  back.add(backSkin, backFace);
  const front = new THREE.Group(); // z >= 0
  const frontSkin = new THREE.Mesh(new THREE.LatheGeometry(pts, 96, -Math.PI / 2, Math.PI), skin);
  const frontFace = new THREE.Mesh(section(), faceMat);
  frontFace.rotation.y = Math.PI;
  frontFace.position.z = -0.02;
  front.add(frontSkin, frontFace);
  // The dry tip of the neck and the root.
  const papery = new THREE.MeshPhysicalMaterial({ color: 0xb99470, roughness: 0.8 });
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.5, 16, 1, true), papery);
  tip.position.y = yMax * R + 1.6;
  const root = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.2, 0.6, 24), new THREE.MeshPhysicalMaterial({ color: 0xcdb48e, roughness: 0.9 }));
  root.position.y = yMin * R - 0.2;
  const bulb = new THREE.Group();
  const frontPivot = new THREE.Group(); // the front half falls about its front-bottom edge
  frontPivot.position.set(0, yMin * R, R * 0.95);
  front.position.set(0, -yMin * R, -R * 0.95);
  frontPivot.add(front);
  const tipGroup = new THREE.Group();
  tipGroup.add(tip, root);
  bulb.add(back, frontPivot, tipGroup);
  scene.add(bulb);

  // ── The board ───────────────────────────────────────────────────────────
  const boardMat = new THREE.MeshStandardMaterial({ map: woodMap, roughness: 0.55 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(120, 4, 60, 1, 1, 1), boardMat);
  scene.add(board);

  // ── The knife: a chef's blade with a curved edge, a bevel that catches the light, and a dark handle ─────────
  const knife = new THREE.Group();
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(30, 0);
  bladeShape.quadraticCurveTo(40, 0.4, 44, 3.6);
  bladeShape.quadraticCurveTo(34, 6.6, 20, 7.4);
  bladeShape.lineTo(0, 7.6);
  bladeShape.closePath();
  const steel = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.17 });
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.22, bevelSegments: 3, curveSegments: 24 });
  bladeGeo.translate(-22, 0, -0.08);
  const blade = new THREE.Mesh(bladeGeo, steel);
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 15, 6, 16), new THREE.MeshStandardMaterial({ color: 0x1b1414, roughness: 0.3 }));
  handle.rotation.z = Math.PI / 2;
  handle.position.set(-31, 5.6, 0);
  const bolster = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.2, 20), steel);
  bolster.rotation.z = Math.PI / 2;
  bolster.position.set(-22.6, 5.6, 0);
  knife.add(blade, handle, bolster);
  scene.add(knife);

  // ── The molecule: syn-propanethial-S-oxide, CH3-CH2-CH=S=O, oxygen on the ethyl side (syn) ─────────────────
  const mol = new THREE.Group();
  const A = 11; // world units an angstrom
  const C1 = new THREE.Vector3(-2.55, -0.55, 0);
  const C2 = new THREE.Vector3(-1.3, 0.3, 0);
  const C3 = new THREE.Vector3(0, -0.45, 0);
  const S = new THREE.Vector3(1.38, 0.35, 0);
  // O: 1.48 A from S at about 113 degrees from the S->C3 bond, on the same side as C2 (syn).
  const sc = C3.clone().sub(S).normalize();
  const turnZ = (v, a) => new THREE.Vector3(v.x * Math.cos(a) - v.y * Math.sin(a), v.x * Math.sin(a) + v.y * Math.cos(a), 0);
  const cand = [turnZ(sc, (113 * Math.PI) / 180), turnZ(sc, (-113 * Math.PI) / 180)];
  const side = (p) => (S.x - C3.x) * (p.y - C3.y) - (S.y - C3.y) * (p.x - C3.x);
  const O = S.clone().add(cand.find((d) => Math.sign(side(S.clone().add(d))) === Math.sign(side(C2))).multiplyScalar(1.48));
  const H = [];
  const hAt = (c, dir, z) => H.push([c, c.clone().add(new THREE.Vector3(dir[0], dir[1], z).normalize().multiplyScalar(1.05))]);
  hAt(C1, [-0.6, -0.7], 0.0);
  hAt(C1, [-0.2, 0.25], 0.95);
  hAt(C1, [-0.2, 0.25], -0.95);
  hAt(C2, [0, 0.55], 0.85);
  hAt(C2, [0, 0.55], -0.85);
  hAt(C3, [0.15, -1], 0);
  const atom = (r, material) => new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), material);
  const carbonMat = new THREE.MeshPhysicalMaterial({ color: 0x2a2a30, metalness: 0.2, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 });
  const hydMat = new THREE.MeshPhysicalMaterial({ color: 0xf3f3f6, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1 });
  const sulMat = new THREE.MeshPhysicalMaterial({ color: 0xf5c62c, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12, emissive: 0x3a2a00, emissiveIntensity: 0.4 });
  const oxMat = new THREE.MeshPhysicalMaterial({ color: 0xe23a2e, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12 });
  const bondMat = new THREE.MeshPhysicalMaterial({ color: 0xcfd3da, metalness: 0.6, roughness: 0.3 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xb6f03a, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending });
  const bond = (a, b, offset = 0, r = 0.12) => {
    const d = b.clone().sub(a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * A, r * A, d.length() * A, 16), bondMat);
    m.position.copy(a.clone().add(b).multiplyScalar(0.5 * A));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    if (offset) m.position.add(new THREE.Vector3(0, 0, offset * A));
    mol.add(m);
  };
  bond(C1, C2);
  bond(C2, C3);
  bond(C3, S, 0.13, 0.085);
  bond(C3, S, -0.13, 0.085);
  bond(S, O, 0.13, 0.085);
  bond(S, O, -0.13, 0.085);
  for (const [c, h] of H) bond(c, h, 0, 0.09);
  const place = (v, r, m) => {
    const a = atom(r * A, m);
    a.position.copy(v).multiplyScalar(A);
    mol.add(a);
    return a;
  };
  [C1, C2, C3].forEach((c) => place(c, 0.42, carbonMat));
  place(S, 0.56, sulMat);
  place(O, 0.46, oxMat);
  H.forEach(([, h]) => place(h, 0.27, hydMat));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(3.2 * A, 32, 24), glowMat);
  mol.add(halo);
  // centre it
  const centre = new THREE.Vector3();
  [C1, C2, C3, S, O].forEach((v) => centre.add(v));
  centre.multiplyScalar(A / 5);
  mol.children.forEach((c) => c.position.sub(centre));
  const molWrap = new THREE.Group();
  molWrap.add(mol);
  scene.add(molWrap);

  const look = new THREE.Vector3();
  return {
    space,
    R,
    render(K, t) {
      if (K.vis <= 0.001) {
        space.render(0);
        return;
      }
      camera.position.set(K.cam.x, K.cam.y, K.cam.z);
      look.set(K.cam.tx, K.cam.ty, K.cam.tz);
      camera.lookAt(look);
      camera.updateProjectionMatrix();
      // The key light swings over the bulb when days pass.
      const sw = K.sun * TAU;
      space.key.position.set(-40 * Math.cos(sw) - 10 * Math.sin(sw), 60, 90 * Math.cos(sw * 0.5) + 10);
      space.key.intensity = 2.5 * (0.75 + 0.25 * Math.cos(sw));

      const o = K.onion;
      bulb.visible = o.vis > 0.001;
      bulb.position.set(o.x, o.y, o.z);
      bulb.scale.setScalar(o.s);
      bulb.rotation.set(0, o.turn, 0);
      tipGroup.visible = K.whole > 0.5;
      // The front half: in place (whole) or fallen away toward the camera.
      frontPivot.visible = K.front < 0.999;
      frontPivot.rotation.x = K.front * 1.6;
      frontPivot.position.y = yMin * R - K.front * K.front * 14;
      frontPivot.position.x = -K.front * 9;
      board.visible = K.board > 0.001;
      board.position.set(K.boardPos.x, K.boardPos.y, K.boardPos.z);

      knife.visible = K.knife.vis > 0.001;
      knife.position.set(K.knife.x, K.knife.y, K.knife.z);
      knife.rotation.set(K.knife.rx, K.knife.ry, K.knife.rz);

      const m = K.mol;
      molWrap.visible = m.vis > 0.001;
      molWrap.position.set(m.x, m.y, m.z ?? 0);
      molWrap.scale.setScalar(m.s);
      mol.rotation.set(m.tilt, m.turn, 0.12);
      glowMat.opacity = 0;
      gasLight.intensity = 1400 * m.glow * m.vis;
      gasLight.position.set(m.x, m.y + 4, 30);
      space.render(K.vis);
    },
  };
}
