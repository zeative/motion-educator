// The world of the film: the 22 cars of sim.py on their road, lit at night, drawn with the kit's 3D stage.
// Every car is where sim.json puts it at the model time the film asks for; nothing here moves on its own.
//
//   const world = await createWorld(canvas);           // loads sim.json
//   film.each(() => world.render());                   // draws world.W (the state the timeline tweens)
//
// world.W: vis, k (road curvature: 0 a straight road, 1 the closed ring), outer (the straight road's extra length
// and its second queue, 0..1), src (0 cars cruising evenly at 30 km/h, 1 the "jam" run, 2 the "absorb" run),
// simT (model time, s), anchor (the place on the ring, m, drawn at the front of the picture), cam (target tx ty tz,
// dist, elev, azim in degrees, fov), follow (a car to keep in view, -1 none), followMix, shiftX (px: the picture's
// centre moved right, to make room for a panel), mark (the car with the cyan ring), markA, you (the car painted
// cyan), youA, jamArc (the red band over the stopped cars), dim, brake (gain on brake lights).
import { createStage3D } from "../../kit/engine/stage3d.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export async function createWorld(canvas) {
  const sim = await (await fetch("sim.json")).json();
  const { L, N, rec } = sim;
  const R = L / (2 * Math.PI);
  const V0 = 30 / 3.6;
  const space = createStage3D(canvas, { distance: 100, fov: 30, exposure: 1.0, environment: 0.32 });
  const { THREE, scene, camera, renderer } = space;
  camera.far = 3000;
  scene.fog = new THREE.Fog(0x0b0b0e, 160, 520);
  space.key.color.set(0xb9c8ff);
  space.key.intensity = 1.1;
  space.key.position.set(-60, 120, 80);
  space.rim.color.set(0xffd2b0);
  space.rim.intensity = 0.9;
  const hemi = new THREE.HemisphereLight(0x8ea0c8, 0x101014, 0.55);
  scene.add(hemi);

  const W = {
    vis: 1, k: 0, outer: 1, src: 1, simT: 60, anchor: 0,
    cam: { tx: 0, ty: 0, tz: R, dist: 60, elev: 12, azim: 0, fov: 30 },
    follow: -1, followMix: 0, lead: 0, azFollow: 0, shiftX: 0, shiftY: 0,
    mark: -1, markA: 0, you: -1, youA: 0, jamArc: 0, dim: 0, brake: 1,
  };

  // ── The model, played back ──────────────────────────────────────────────
  const runs = [null, sim.jam, sim.absorb];
  const from = [0, 0, sim.absorb.from];
  function sample(src, i, t) {
    if (src === 0) return { s: (i * L) / N + V0 * t, v: V0, a: 0 };
    const run = runs[src];
    const n = run.x.length;
    let f = (t - from[src]) / rec;
    f = clamp(f, 0, n - 1.0001);
    const k = Math.floor(f);
    const u = f - k;
    const x0 = run.x[k][i], x1 = run.x[k + 1][i], v0 = run.v[k][i], v1 = run.v[k + 1][i];
    // Hermite between samples, using the speeds as slopes, so a car glides instead of stepping.
    const h = rec;
    const u2 = u * u, u3 = u2 * u;
    const s = (2 * u3 - 3 * u2 + 1) * x0 + (u3 - 2 * u2 + u) * h * v0 + (-2 * u3 + 3 * u2) * x1 + (u3 - u2) * h * v1;
    const v = v0 + (v1 - v0) * u;
    const kp = Math.max(0, k - 1), kn = Math.min(n - 1, k + 2);
    const a = (run.v[kn][i] - run.v[kp][i]) / ((kn - kp) * rec);
    return { s, v, a };
  }
  // How hard a car's brake lights glow: braking, or standing still on the brake.
  const brakeOf = (v, a) => Math.max(smooth(0.25, 1.2, -a), 1 - smooth(0.4, 1.6, v));

  // ── Where a place on the road is drawn ──────────────────────────────────
  // u: metres along the road from the anchor (0 at the front of the picture). The road bends with curvature k / R;
  // at k = 1 it is the ring, centred on the origin, the anchor at (0, 0, R), cars driving to +x there.
  function place(u, k, lane = 0) {
    const kap = Math.max(1e-5, k) / R;
    const th = kap * u;
    const x = Math.sin(th) / kap;
    const z = R - (1 - Math.cos(th)) / kap;
    const nx = Math.sin(th), nz = Math.cos(th);
    return { x: x + nx * lane, z: z + nz * lane, th };
  }
  const wrap = (u) => ((((u + L / 2) % L) + L) % L) - L / 2;

  // ── Ground and road ─────────────────────────────────────────────────────
  function texture(draw, w, h, repeatX = 1) {
    const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
    draw(c.getContext("2d"), w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, 1);
    tex.anisotropy = 8;
    return tex;
  }
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const asphalt = texture((g, w, h) => {
    g.fillStyle = "#3a3b40";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const l = 40 + rnd() * 50;
      g.fillStyle = `rgba(${l},${l},${l + 4},${0.25 + rnd() * 0.35})`;
      g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    // edge lines: solid white at both sides
    g.fillStyle = "#e9e9ee";
    g.fillRect(0, 6, w, 7);
    g.fillRect(0, h - 13, w, 7);
  }, 1024, 128, 230 / 24);
  const roadMat = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.86, metalness: 0.0, color: 0xb8b8c0 });
  const outerMat = roadMat.clone();
  outerMat.transparent = true;
  const LANE = 5.2;
  function ribbon(u0, u1, segs, material, width = LANE, lift = 0.02) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array((segs + 1) * 2 * 3);
    const uv = new Float32Array((segs + 1) * 2 * 2);
    const idx = [];
    for (let i = 0; i <= segs; i++) {
      uv.set([(u0 + ((u1 - u0) * i) / segs) / 24, 0, (u0 + ((u1 - u0) * i) / segs) / 24, 1], i * 4);
      if (i < segs) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    let last = null;
    mesh.userData.update = (k, a = u0, b = u1) => {
      const key = `${k.toFixed(5)}:${a.toFixed(3)}:${b.toFixed(3)}`;
      if (key === last) return;
      last = key;
      for (let i = 0; i <= segs; i++) {
        const u = a + ((b - a) * i) / segs;
        const p0 = place(u, k, -width / 2), p1 = place(u, k, width / 2);
        pos.set([p0.x, lift, p0.z, p1.x, lift, p1.z], i * 6);
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
    };
    scene.add(mesh);
    return mesh;
  }
  // The shoulder: a darker band each side, so the road reads as a road on the ground.
  const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: 0.95 });
  const shoulder = ribbon(-L / 2, L / 2, 360, shoulderMat, LANE + 7, 0.005);
  const road = ribbon(-L / 2, L / 2, 360, roadMat);
  const roadBack = ribbon(-L * 1.5, -L / 2, 200, outerMat);
  const roadFront = ribbon(L / 2, L * 1.5, 200, outerMat);
  const shoulderOuterMat = shoulderMat.clone();
  shoulderOuterMat.transparent = true;
  const shBack = ribbon(-L * 1.5, -L / 2, 200, shoulderOuterMat, LANE + 7, 0.005);
  const shFront = ribbon(L / 2, L * 1.5, 200, shoulderOuterMat, LANE + 7, 0.005);
  // The ground: a wide dark disc that fades into the stage at its edge.
  const groundTex = texture((g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(34,35,40,1)");
    grd.addColorStop(0.55, "rgba(24,25,29,0.95)");
    grd.addColorStop(1, "rgba(11,11,13,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14000; i++) {
      g.fillStyle = `rgba(255,255,255,${rnd() * 0.035})`;
      g.fillRect(rnd() * w, rnd() * h, 2, 2);
    }
  }, 1024, 1024);
  groundTex.wrapS = THREE.ClampToEdgeWrapping;
  groundTex.repeat.set(1, 1);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(520, 96), new THREE.MeshStandardMaterial({ map: groundTex, transparent: true, roughness: 0.95, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  scene.add(ground);

  // The red band laid over the road under the jam.
  const arcMat = new THREE.MeshBasicMaterial({ color: 0xff3b2a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const arc = ribbon(-10, 10, 80, arcMat, LANE + 1.6, 0.06);

  // ── Cars ────────────────────────────────────────────────────────────────
  const bodyGeo = new RoundedBoxGeometry(4.4, 0.78, 1.78, 4, 0.28);
  const cabinGeo = new RoundedBoxGeometry(2.3, 0.62, 1.56, 4, 0.26);
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 18);
  wheelGeo.rotateX(Math.PI / 2);
  const lampGeo = new RoundedBoxGeometry(0.1, 0.16, 0.42, 2, 0.04);
  const paints = [0xe9e9ec, 0x9aa1ab, 0x2c2f36, 0x41587a, 0xc9c2b4, 0x6c7480, 0xf1f1f3, 0x3b4048, 0x8b97a6, 0x5a6270, 0xd8dade];
  const paintMats = paints.map((c) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.45, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }));
  const youMat = new THREE.MeshPhysicalMaterial({ color: 0x4fd0ff, metalness: 0.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, emissive: 0x0a4a66, emissiveIntensity: 0.6 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x1c2533, metalness: 0.6, roughness: 0.12, clearcoat: 1 });
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x101012, roughness: 0.8 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xfff1d6, emissiveIntensity: 1.4 });
  const glowTex = texture((g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.25, "rgba(255,255,255,0.55)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  }, 128, 128);
  groundTex.needsUpdate = true;
  glowTex.wrapS = THREE.ClampToEdgeWrapping;
  glowTex.repeat.set(1, 1);
  const poolGeo = new THREE.PlaneGeometry(1, 1);
  poolGeo.rotateX(-Math.PI / 2);
  const ringGeo = new THREE.RingGeometry(3.3, 3.9, 64);
  ringGeo.rotateX(-Math.PI / 2);

  function makeCar(i, copy) {
    const g = new THREE.Group();
    const paint = paintMats[(i * 7 + 3) % paintMats.length];
    const body = new THREE.Mesh(bodyGeo, paint);
    body.position.y = 0.72;
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(-0.25, 1.36, 0);
    g.add(body, cabin);
    for (const [x, z] of [[1.4, 0.8], [1.4, -0.8], [-1.4, 0.8], [-1.4, -0.8]]) {
      const w = new THREE.Mesh(wheelGeo, tyreMat);
      w.position.set(x, 0.34, z);
      g.add(w);
    }
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x3a0806, emissive: 0xff1206, emissiveIntensity: 0.3 });
    for (const z of [0.62, -0.62]) {
      const t = new THREE.Mesh(lampGeo, tailMat);
      t.position.set(-2.2, 0.86, z);
      const h = new THREE.Mesh(lampGeo, headMat);
      h.position.set(2.2, 0.8, z);
      g.add(t, h);
    }
    // brake glow on the road behind the car, and the headlights' pool ahead of it
    const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0xff3020, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const glow = new THREE.Mesh(poolGeo, glowMat);
    glow.scale.set(7, 1, 5);
    glow.position.set(-4.4, 0.05, 0);
    const poolMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0xfff0d0, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.scale.set(9, 1, 4.2);
    pool.position.set(6.6, 0.04, 0);
    g.add(glow, pool);
    scene.add(g);
    return { g, body, paint, tailMat, glowMat, poolMat, copy, i };
  }
  const cars = [];
  for (const copy of [0, -1]) for (let i = 0; i < N; i++) cars.push(makeCar(i, copy));
  const markMat = new THREE.MeshBasicMaterial({ color: 0x4fd0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const marker = new THREE.Mesh(ringGeo, markMat);
  marker.position.y = 0.08;
  scene.add(marker);

  // ── Camera ──────────────────────────────────────────────────────────────
  const tmp = new THREE.Vector3();
  const look = new THREE.Vector3();
  const now = new Array(N);

  function carWorld(i) {
    const c = now[i];
    const p = place(c.u, W.k);
    return { x: p.x, z: p.z, th: p.th };
  }

  function render() {
    const vis = W.vis;
    if (vis <= 0.001) return space.render(0);
    const k = W.k;
    const src = Math.round(W.src);
    // every car's state now
    for (let i = 0; i < N; i++) {
      const c = sample(src, i, W.simT);
      now[i] = { ...c, u: wrap(c.s - W.anchor), brake: brakeOf(c.v, c.a) };
    }
    // the road
    road.userData.update(k);
    shoulder.userData.update(k);
    const outerA = clamp(W.outer) * (1 - smooth(0.02, 0.22, k));
    outerMat.opacity = outerA;
    shoulderOuterMat.opacity = outerA;
    for (const m of [roadBack, roadFront, shBack, shFront]) {
      m.visible = outerA > 0.002;
      if (m.visible) m.userData.update(k);
    }
    // cars (the second queue sits one ring-length behind, on the straight road only)
    for (const car of cars) {
      const c = now[car.i];
      const u = c.u + car.copy * L;
      const show = car.copy === 0 ? 1 : outerA;
      car.g.visible = show > 0.002;
      if (!car.g.visible) continue;
      const p = place(u, k);
      car.g.position.set(p.x, 0, p.z);
      car.g.rotation.y = p.th;
      const b = c.brake * W.brake;
      car.tailMat.emissiveIntensity = 0.3 + 2.4 * b;
      car.glowMat.opacity = 0.75 * b * show;
      car.poolMat.opacity = 0.16 * show;
      const you = car.i === W.you && car.copy === 0;
      car.body.material = you && W.youA > 0.5 ? youMat : car.paint;
    }
    // the cyan marker
    markMat.opacity = W.mark >= 0 ? clamp(W.markA) * 0.9 : 0;
    if (W.mark >= 0) {
      const p = carWorld(W.mark);
      marker.position.set(p.x, 0.08, p.z);
    }
    // the red band over the stopped cars: from the last stopped car to the first, along the road
    arcMat.opacity = 0;
    if (W.jamArc > 0.002) {
      const us = now.map((c) => c.u).filter((u, i) => now[i].v < 2.5);
      if (us.length) {
        // the stopped cars as one run: start from the largest gap between them
        const sorted = [...us].sort((a, b) => a - b);
        let gapAt = 0, gap = -1;
        for (let j = 0; j < sorted.length; j++) {
          const next = j + 1 < sorted.length ? sorted[j + 1] : sorted[0] + L;
          if (next - sorted[j] > gap) {
            gap = next - sorted[j];
            gapAt = j;
          }
        }
        const tail = gapAt + 1 < sorted.length ? sorted[gapAt + 1] : sorted[0];
        let head = sorted[gapAt];
        if (head < tail) head += L;
        arc.userData.update(k, tail - 4, head + 4);
        arcMat.opacity = 0.5 * clamp(W.jamArc);
        W.jamTail = tail;
        W.jamHead = head;
      }
    }
    // camera
    const cam = W.cam;
    look.set(cam.tx, cam.ty, cam.tz);
    if (W.follow >= 0 && W.followMix > 0) {
      const p = place(now[W.follow].u + W.lead, k);
      tmp.set(p.x, cam.ty, p.z);
      look.lerp(tmp, clamp(W.followMix));
    }
    let azDeg = cam.azim;
    if (W.follow >= 0 && W.azFollow) azDeg += (place(now[W.follow].u, k).th * 180 * W.azFollow) / Math.PI;
    const el = (cam.elev * Math.PI) / 180, az = (azDeg * Math.PI) / 180;
    camera.position.set(look.x + cam.dist * Math.cos(el) * Math.sin(az), look.y + cam.dist * Math.sin(el), look.z + cam.dist * Math.cos(el) * Math.cos(az));
    camera.fov = cam.fov;
    camera.lookAt(look);
    camera.setViewOffset(1920, 1080, -W.shiftX, -W.shiftY, 1920, 1080);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    renderer.toneMappingExposure = 1.0 * (1 - 0.55 * clamp(W.dim));
    space.render(vis);
  }

  // Where a point of the world lands on the frame, in px (after render() set the camera).
  const v3 = new THREE.Vector3();
  function project(x, y, z) {
    v3.set(x, y, z).project(camera);
    return { x: (v3.x * 0.5 + 0.5) * 1920, y: (-v3.y * 0.5 + 0.5) * 1080, behind: v3.z > 1 };
  }
  const carScreen = (i, y = 2.2) => {
    const p = carWorld(i);
    return project(p.x, y, p.z);
  };
  const roadScreen = (u, y = 0, lane = 0) => {
    const p = place(u, W.k, lane);
    return project(p.x, y, p.z);
  };
  // Where the jam is at a model time: the stopped cars' run, as places on the ring (m, s-coordinates), its tail
  // (upstream end) and head, and the car at its tail.
  function jamAt(src, t, slow = 2.5) {
    const cs = [];
    for (let i = 0; i < N; i++) {
      const c = sample(src, i, t);
      if (c.v < slow) cs.push({ i, s: ((c.s % L) + L) % L });
    }
    if (!cs.length) return null;
    cs.sort((a, b) => a.s - b.s);
    let gapAt = 0, gap = -1;
    for (let j = 0; j < cs.length; j++) {
      const next = j + 1 < cs.length ? cs[j + 1].s : cs[0].s + L;
      if (next - cs[j].s > gap) {
        gap = next - cs[j].s;
        gapAt = j;
      }
    }
    const tailCar = cs[(gapAt + 1) % cs.length];
    const headCar = cs[gapAt];
    let head = headCar.s;
    if (head < tailCar.s) head += L;
    return { tail: tailCar.s, head, mid: (tailCar.s + head) / 2, n: cs.length, tailCar: tailCar.i, headCar: headCar.i };
  }
  return { W, sim, now, render, project, carScreen, roadScreen, place, sample, jamAt, R, L, N };
}
