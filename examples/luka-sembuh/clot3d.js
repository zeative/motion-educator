// The close-up inside the blood (s05): red cells as lit, glossy biconcave discs tumbling in warm plasma, a few
// platelets, and fibrin strands spinning across until they are a net that the cells catch on. Drawn with the kit's
// 3D stage; every value is a function of the state and the time it is given.
//
// state: { vis (opacity), net (0..1: how far the strands have grown), t0 (the shot's start), orbit (camera turn) }
import { createStage3D } from "../../kit/engine/stage3d.js";

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createClot(canvas) {
  const space = createStage3D(canvas, { distance: 100, fov: 32, exposure: 1.1, environment: 0.55 });
  const { THREE, scene, camera } = space;
  const rand = rng(21);
  scene.fog = new THREE.Fog(0x3a0508, 70, 170);
  space.key.color.set(0xfff0e6);
  space.key.intensity = 2.6;
  space.rim.color.set(0xff9c8c);
  space.rim.intensity = 2.2;
  const fill = new THREE.PointLight(0x7fe3da, 900, 160, 2);
  fill.position.set(30, -40, 40);
  scene.add(fill);

  // A red cell: a disc about 7.5 µm across and 2 µm thick at its rim, thinner in the middle (a lathe of that profile).
  const profile = [];
  for (let i = 0; i <= 40; i++) {
    const r = (i / 40) * 4;
    const u = r / 4;
    // Evans and Fung's shape for a red cell: thickness against radius.
    const h = 0.5 * Math.sqrt(Math.max(0, 1 - u * u)) * (0.81 + 7.83 * u * u - 4.39 * u ** 4) * 0.62;
    profile.push(new THREE.Vector2(Math.max(0.001, r), h));
  }
  for (let i = 40; i >= 0; i--) profile.push(new THREE.Vector2(Math.max(0.001, profile[i].x), -profile[i].y));
  const rbcGeo = new THREE.LatheGeometry(profile, 72);
  rbcGeo.computeVertexNormals();
  {
    const p = rbcGeo.attributes.position;
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const r = Math.hypot(p.getX(i), p.getZ(i)) / 4;
      const k = 0.42 + 0.58 * Math.min(1, Math.pow(r / 0.72, 1.6));
      col.set([k, k * 0.92, k * 0.92], i * 3);
    }
    rbcGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  }
  const rbcMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, color: 0xd0161f, roughness: 0.32, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.25, sheen: 1, sheenColor: new THREE.Color(0xff8a7a), sheenRoughness: 0.4 });
  const cells = [];
  for (let i = 0; i < 34; i++) {
    const m = new THREE.Mesh(rbcGeo, rbcMat);
    const s = 0.95 + rand() * 0.35;
    m.scale.setScalar(s);
    const c = {
      mesh: m,
      p0: new THREE.Vector3((rand() - 0.5) * 44, (rand() - 0.5) * 80, -50 + rand() * 75),
      v: new THREE.Vector3((rand() - 0.5) * 7, 4 + rand() * 6, (rand() - 0.5) * 3),
      r0: new THREE.Euler(0.6 + rand() * 0.5, rand() * TAU, (rand() - 0.5) * 0.8),
      w: new THREE.Vector3((rand() - 0.5) * 0.25, (rand() - 0.5) * 0.6, (rand() - 0.5) * 0.25),
      catchAt: 0.25 + rand() * 0.65,
    };
    cells.push(c);
    scene.add(m);
  }
  // Platelets: small, pale gold, a little irregular.
  const plGeo = new THREE.IcosahedronGeometry(0.9, 2);
  const pos = plGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) * 0.45);
  plGeo.computeVertexNormals();
  const plMat = new THREE.MeshPhysicalMaterial({ color: 0xf0c878, roughness: 0.45, clearcoat: 0.5, emissive: 0x3a2508, emissiveIntensity: 0.6 });
  const plates = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(plGeo, plMat);
    m.scale.setScalar(0.7 + rand() * 0.3);
    plates.push({ mesh: m, p0: new THREE.Vector3((rand() - 0.5) * 50, (rand() - 0.5) * 90, -20 + rand() * 50), v: new THREE.Vector3((rand() - 0.5) * 4, 3 + rand() * 4, 0), r: rand() * TAU });
    scene.add(m);
  }
  // Fibrin: long pale strands across the frame, each grown from one end.
  const fibMat = new THREE.MeshStandardMaterial({ color: 0xfff1de, emissive: 0xffd9b8, emissiveIntensity: 0.55, roughness: 0.5, transparent: true, opacity: 0.92 });
  const strands = [];
  for (let i = 0; i < 28; i++) {
    const a = new THREE.Vector3(-45 + rand() * 12, -60 + rand() * 120, -25 + rand() * 45);
    const b = new THREE.Vector3(45 - rand() * 12, -60 + rand() * 120, -25 + rand() * 45);
    if (rand() < 0.5) [a.x, b.x] = [b.x, a.x];
    if (i % 3 === 2) {
      a.set(-30 + rand() * 60, 62, -20 + rand() * 30);
      b.set(-30 + rand() * 60, -62, -20 + rand() * 30);
    }
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3((rand() - 0.5) * 16, (rand() - 0.5) * 16, (rand() - 0.5) * 16));
    const curve = new THREE.CatmullRomCurve3([a, a.clone().lerp(mid, 0.5).add(new THREE.Vector3(0, (rand() - 0.5) * 6, 0)), mid, mid.clone().lerp(b, 0.5), b]);
    const geo = new THREE.TubeGeometry(curve, 90, 0.11 + rand() * 0.1, 8, false);
    const m = new THREE.Mesh(geo, fibMat);
    m.visible = false;
    scene.add(m);
    strands.push({ mesh: m, total: geo.index.count, at: (i / 28) * 0.75 });
  }
  const group = { THREE };
  camera.position.set(0, 0, 100);

  // Time travelled: steady until the cell is caught, then it stops within a quarter of a second.
  const travel = (x, T) => (x < T ? x : T + 0.25 * (1 - Math.exp(-(x - T) / 0.25)));

  return {
    render(state, t) {
      if (state.vis <= 0.001) {
        space.render(0);
        return;
      }
      const tau = t - state.t0;
      const turn = state.orbit;
      camera.position.set(Math.sin(turn) * 100, Math.sin(turn * 0.5) * 8, Math.cos(turn) * 100);
      camera.lookAt(0, 0, 0);
      for (const c of cells) {
        // The moment the growing net reaches this cell, in the shot's own time.
        const caught = state.net >= c.catchAt;
        const T = caught ? Math.max(0, state.catchTime(c.catchAt) - state.t0) : tau + 10;
        const k = travel(Math.max(0, tau + 1.2), T + 1.2);
        c.mesh.position.copy(c.p0).addScaledVector(c.v, k);
        c.mesh.rotation.set(c.r0.x + c.w.x * k, c.r0.y + c.w.y * k, c.r0.z + c.w.z * k);
      }
      for (const p of plates) {
        const k = Math.max(0, tau + 1.2);
        p.mesh.position.copy(p.p0).addScaledVector(p.v, k);
        p.mesh.rotation.set(p.r + k * 0.8, p.r * 0.5 + k * 0.6, 0);
      }
      for (const s of strands) {
        const u = clamp((state.net - s.at) / 0.25);
        s.mesh.visible = u > 0.002;
        // Grow from one end: draw the first part of the tube's faces (6 indices a quad, a ring of 8 quads a step).
        const count = Math.floor((u * s.total) / 48) * 48;
        s.mesh.geometry.setDrawRange(0, count);
      }
      space.render(state.vis);
    },
  };
}
