// The film's 3D world: langit-biru's real Earth, with GPS satellites, their signals and the spheres made from them.
// Every position is in Earth radii from geometry.json (written by storyboard.build.py), so the film draws the same
// numbers the board was drawn from: the orbit at 4.17 Earth radii, each sphere's radius the true range to you, the
// circles and points solved by trilateration every frame. Drawn from plain state, called from film.each.
import { createEarth } from "../langit-biru/earth.js";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

// ── Vectors (plain arrays) ───────────────────────────────────────────────────
export const add = (a, b) => a.map((x, i) => x + b[i]);
export const sub = (a, b) => a.map((x, i) => x - b[i]);
export const mul = (a, k) => a.map((x) => x * k);
export const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a) => Math.sqrt(dot(a, a));
export const unit = (a) => mul(a, 1 / norm(a));
export const lerp = (a, b, k) => a.map((x, i) => x + (b[i] - x) * k);

// The two points at the given distances from three centres (the same solver as storyboard.build.py).
export function trilaterate([s0, s1, s2], [r0, r1, r2]) {
  const ex = unit(sub(s1, s0));
  const d = norm(sub(s1, s0));
  const i = dot(ex, sub(s2, s0));
  const ey = unit(sub(sub(s2, s0), mul(ex, i)));
  const ez = cross(ex, ey);
  const j = dot(ey, sub(s2, s0));
  const x = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const y = (r0 * r0 - r2 * r2 + i * i + j * j) / (2 * j) - (i / j) * x;
  const z = Math.sqrt(Math.max(0, r0 * r0 - x * x - y * y));
  const base = add(s0, add(mul(ex, x), mul(ey, y)));
  return [add(base, mul(ez, z)), add(base, mul(ez, -z))];
}

// The circle where two spheres cross: its centre, its axis and its radius.
export function crossing(ci, ri, cj, rj) {
  const d = norm(sub(cj, ci));
  const ex = unit(sub(cj, ci));
  const a = (ri * ri - rj * rj + d * d) / (2 * d);
  return { centre: add(ci, mul(ex, a)), axis: ex, radius: Math.sqrt(Math.max(0, ri * ri - a * a)) };
}

const CYAN = 0x38e1ff;
const AMBER = 0xffb547;
const RED = 0xff5a4e;

export async function createSpace(canvas, G) {
  const earth = await createEarth(canvas);
  const { space } = earth;
  const { THREE, scene, camera, UNIT } = space;
  const W = canvas.width;
  const H = canvas.height;
  // Stand the camera further back with a longer lens: the same pixels per unit at the Earth's plane, less distortion
  // on satellites four Earth radii out (storyboard.build.py projects with the same camera).
  camera.position.z = G.CAM;
  camera.fov = (2 * Math.atan(Math.tan((15 * Math.PI) / 180) / (G.CAM / 100)) * 180) / Math.PI;
  camera.far = 4000;
  camera.updateProjectionMatrix();
  // Sunlight for the satellites (the globe lights itself): the same direction as earth.js's Sun.
  const sun = new THREE.DirectionalLight(0xfff2de, 3.2);
  sun.position.set(-1, 0.28, 0.42).multiplyScalar(100);
  const fill = new THREE.HemisphereLight(0x8fb8ff, 0x101018, 0.55);
  scene.add(sun, fill);
  scene.environmentIntensity = 0.5;

  const world = new THREE.Group();
  scene.add(world);
  const K = 10; // Earth radii to the globe's units (earth.js draws a radius of 10)
  const v3 = (w) => new THREE.Vector3(w[0] * K, w[1] * K, w[2] * K);

  // ── A GPS satellite: a gold-foil body, two wings of solar cells, a dish toward the Earth ──────────────────
  const gold0 = new THREE.MeshPhysicalMaterial({ color: 0xe0a83a, metalness: 1, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const cells0 = new THREE.MeshPhysicalMaterial({ color: 0x14245e, metalness: 0.4, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1, emissive: 0x0a1630, emissiveIntensity: 0.6 });
  const frame0 = new THREE.MeshStandardMaterial({ color: 0xb8bcc8, metalness: 0.9, roughness: 0.35 });
  const white0 = new THREE.MeshStandardMaterial({ color: 0xf2f2f4, metalness: 0.1, roughness: 0.5 });
  const haloTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.45)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  function makeSatellite() {
    // Each satellite has its own materials, so one can fade without the others.
    const gold = gold0.clone();
    const cells = cells0.clone();
    const frameMat = frame0.clone();
    const white = white0.clone();
    const sat = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1.25), gold);
    sat.add(body);
    for (const side of [-1, 1]) {
      const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), frameMat);
      boom.rotation.z = Math.PI / 2;
      boom.position.x = side * 0.85;
      const wing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 0.95), cells);
      wing.position.x = side * 2.4;
      // a frame line across the wing so it reads as panels
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.97), frameMat);
      bar.position.x = side * 2.4;
      sat.add(boom, wing, bar);
    }
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.18, 0.22, 20), white);
    dish.rotation.x = Math.PI / 2;
    dish.position.z = 0.72;
    sat.add(dish);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: 0xbfefff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
    halo.scale.setScalar(3.2);
    sat.add(halo);
    sat.userData.halo = halo;
    return sat;
  }

  // ── Spheres: a glassy shell, bright at its rim, with faint rings around the satellite so it reads as round ──
  const sphereGeo = new THREE.SphereGeometry(1, 128, 96);
  function makeSphere(colour) {
    const uniforms = { uColor: { value: new THREE.Color(colour) }, uOpacity: { value: 0 }, uAxis: { value: new THREE.Vector3(0, -1, 0) }, uLines: { value: 1 }, uFill: { value: 0.05 } };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.);
          vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `
        precision highp float;
        uniform vec3 uColor; uniform float uOpacity; uniform vec3 uAxis; uniform float uLines; uniform float uFill;
        varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){
          float facing = abs(dot(normalize(vN), normalize(vV)));
          float rim = pow(1. - facing, 3.0);
          float lat = dot(normalize(vP), uAxis);
          float band = abs(fract(lat * 7. + .5) - .5);
          float lines = (1. - smoothstep(0.0, 0.03, band)) * (0.35 + 0.65 * (1. - facing));
          float a = uOpacity * (uFill + 0.95 * rim + 0.22 * lines * uLines);
          gl_FragColor = vec4(uColor * a, a);
        }`,
    });
    const mesh = new THREE.Mesh(sphereGeo, mat);
    mesh.renderOrder = 2;
    mesh.userData.u = uniforms;
    return mesh;
  }

  // ── Fat lines (orbits, circles, measures, threads) ─────────────────────────
  const lineMats = [];
  function makeLine(colour, width, { depthTest = true, opacity = 1, dashed = false } = {}) {
    const mat = new LineMaterial({ color: colour, linewidth: width, transparent: true, opacity, depthTest, depthWrite: false, dashed, dashSize: 3, gapSize: 2 });
    mat.resolution.set(W, H);
    lineMats.push(mat);
    const line = new Line2(new LineGeometry(), mat);
    line.renderOrder = 3;
    line.frustumCulled = false;
    return line;
  }
  const setLine = (line, points) => {
    const flat = [];
    for (const p of points) flat.push(p[0] * K, p[1] * K, p[2] * K);
    line.geometry.dispose();
    line.geometry = new LineGeometry();
    line.geometry.setPositions(flat);
    if (line.material.dashed) line.computeLineDistances();
  };

  // ── Markers: small glowing balls that always show (you, the points) ────────
  function makeMarker(colour) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: colour, transparent: true, depthTest: false }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: colour, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(5);
    g.add(core, halo);
    g.renderOrder = 10;
    core.renderOrder = 10;
    halo.renderOrder = 10;
    g.userData = { core, halo };
    return g;
  }

  // The four satellites of the mechanism, and the constellation.
  const heroes = G.sats.map(() => makeSatellite());
  for (const h of heroes) world.add(h);
  const fleet = [];
  for (const plane of G.planes) for (let k = 0; k < plane.n; k++) fleet.push({ plane, k, sat: makeSatellite() });
  for (const f of fleet) world.add(f.sat);
  const orbitLines = G.planes.map(() => makeLine(0x9fb4d8, 1.6, { opacity: 0.5 }));
  for (const l of orbitLines) world.add(l);
  const orbitPoint = (plane, angle) => {
    let x = G.A * Math.cos(angle);
    let z = G.A * Math.sin(angle);
    const y = z * Math.sin(plane.inc);
    z *= Math.cos(plane.inc);
    const cr = Math.cos(plane.raan);
    const sr = Math.sin(plane.raan);
    return [x * cr + z * sr, y, -x * sr + z * cr];
  };
  G.planes.forEach((plane, i) => setLine(orbitLines[i], Array.from({ length: 121 }, (_, k) => orbitPoint(plane, (2 * Math.PI * k) / 120))));
  // The shell all orbits share (seen side on: a ring at 4.17 Earth radii).
  const shellRing = makeLine(CYAN, 2.4, { opacity: 0.8, dashed: true });
  world.add(shellRing);

  const spheres = G.sats.map(() => makeSphere(CYAN));
  for (const s of spheres) world.add(s);
  // Signal shells that travel (several per satellite), separate from the spheres that stay.
  const pulses = Array.from({ length: 12 }, () => makeSphere(CYAN));
  for (const p of pulses) world.add(p);
  // Circles where pairs cross: (0,1) first, then the rest.
  const PAIRS = [[0, 1], [0, 2], [1, 2], [0, 3], [1, 3], [2, 3]];
  const circles = PAIRS.map(() => makeLine(AMBER, 3.4, { depthTest: false }));
  for (const c of circles) world.add(c);
  const measure = makeLine(CYAN, 5, { depthTest: false });
  const altitude = makeLine(CYAN, 5, { depthTest: false });
  const threads = G.sats.map(() => makeLine(CYAN, 2.6, { depthTest: false, opacity: 0.9 }));
  world.add(measure, altitude, ...threads);
  const youMark = makeMarker(AMBER);
  const otherMark = makeMarker(AMBER);
  const wrongMarks = G.wrong.map(() => makeMarker(RED));
  world.add(youMark, otherMark, ...wrongMarks);
  const pulseDots = G.sats.map(() => makeMarker(CYAN));
  world.add(...pulseDots);

  // A close-up satellite for s03, with its own shells, in the scene (not the world).
  const close = makeSatellite();
  const closeShells = Array.from({ length: 4 }, () => makeSphere(CYAN));
  scene.add(close, ...closeShells);
  // A satellite gliding past near the camera in the hook.
  const flyby = makeSatellite();
  scene.add(flyby);

  const S = G.sats;
  const P = G.P;
  const tmp = new THREE.Vector3();
  // A world point (Earth radii) to screen pixels.
  const toScreen = (w) => {
    tmp.set(w[0] * K, w[1] * K, w[2] * K).applyMatrix4(world.matrixWorld).project(camera);
    return [((tmp.x + 1) / 2) * W, ((1 - tmp.y) / 2) * H];
  };
  // How many world units one screen pixel is at the Earth's plane.
  let pxUnit = 1;

  const placeSat = (sat, w, px, vis) => {
    sat.visible = vis > 0.01;
    if (!sat.visible) return;
    sat.position.copy(v3(w));
    sat.lookAt(world.position);
    sat.scale.setScalar(px * pxUnit * 0.22);
    sat.userData.halo.material.opacity = 0.45 * vis;
    sat.traverse((o) => {
      if (o.material && o.material !== sat.userData.halo.material) {
        o.material.transparent = vis < 0.999;
        o.material.opacity = vis;
      }
    });
  };
  const placeMarker = (m, w, px, a, depth = false) => {
    m.visible = a > 0.01;
    if (!m.visible) return;
    m.position.copy(v3(w));
    m.scale.setScalar(px * pxUnit);
    m.userData.core.material.opacity = a;
    m.userData.halo.material.opacity = a * 0.8;
    m.userData.core.material.depthTest = depth;
  };
  const sphereAt = (mesh, centre, radius, a, axisTo = P, lines = 1, fill = 0.05) => {
    mesh.visible = a > 0.002 && radius > 0.001;
    if (!mesh.visible) return;
    mesh.position.copy(v3(centre));
    mesh.scale.setScalar(radius * K);
    mesh.userData.u.uOpacity.value = a;
    mesh.userData.u.uAxis.value.set(...unit(sub(axisTo, centre)));
    mesh.userData.u.uLines.value = lines;
    mesh.userData.u.uFill.value = fill;
  };
  const circlePoints = (c, part = 1, start = 0) => {
    const u1 = unit(cross(c.axis, Math.abs(c.axis[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
    const u2 = cross(c.axis, u1);
    const n = 160;
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const t = start + 2 * Math.PI * part * (k / n);
      pts.push(add(c.centre, add(mul(u1, c.radius * Math.cos(t)), mul(u2, c.radius * Math.sin(t)))));
    }
    return pts;
  };
  // The angle on a circle where P lies, so a circle draws itself starting from you.
  const angleOf = (c, p) => {
    const u1 = unit(cross(c.axis, Math.abs(c.axis[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
    const u2 = cross(c.axis, u1);
    const d = sub(p, c.centre);
    return Math.atan2(dot(d, u2), dot(d, u1));
  };

  return {
    earth,
    space,
    toScreen,
    PAIRS,
    // Draws one frame from the film's state. E: the Earth's framing and look. W: everything in the world.
    render(E, M, t) {
      const scale = E.size / (2 * 10 * UNIT);
      world.position.copy(space.at(E.x, E.y));
      world.scale.setScalar(scale);
      world.updateMatrixWorld(true);
      pxUnit = 1 / (UNIT * scale);
      const satPx = M.satPx;

      // Constellation
      fleet.forEach(({ plane, k, sat }) => {
        const angle = plane.phase + (2 * Math.PI * k) / plane.n + M.orbitTurn;
        placeSat(sat, orbitPoint(plane, angle), satPx * 0.9, M.fleet);
      });
      orbitLines.forEach((l) => {
        l.visible = M.orbits > 0.01;
        l.material.opacity = 0.55 * M.orbits;
      });
      shellRing.visible = M.shell > 0.01;
      if (shellRing.visible) {
        shellRing.material.opacity = 0.85 * M.shell;
        setLine(shellRing, Array.from({ length: 181 }, (_, k) => [G.A * Math.cos((2 * Math.PI * k) / 180), G.A * Math.sin((2 * Math.PI * k) / 180), 0]));
      }
      // The four satellites
      heroes.forEach((h, i) => placeSat(h, S[i], satPx * M.heroSize[i], M.hero[i]));

      // Spheres: radius = range + clock bias, grown by g
      const radii = G.ranges.map((r) => r + M.bias);
      spheres.forEach((m, i) => sphereAt(m, S[i], radii[i] * M.grow[i], M.sphere[i] * M.sphereAll));
      // Travelling pulses: [satellite, radius fraction, opacity]
      pulses.forEach((m, k) => {
        const p = M.pulses[k];
        if (!p || p[2] <= 0.002) return (m.visible = false);
        sphereAt(m, S[p[0]], G.ranges[p[0]] * p[1], p[2], P, 0, 0.02);
      });
      // Circles of pairs
      circles.forEach((line, k) => {
        const [i, j] = PAIRS[k];
        const a = M.circle[k];
        line.visible = a > 0.01 && M.draw[k] > 0.001;
        if (!line.visible) return;
        const c = crossing(S[i], radii[i], S[j], radii[j]);
        setLine(line, circlePoints(c, M.draw[k], angleOf(c, P)));
        line.material.opacity = a;
        line.material.linewidth = M.circleW;
      });
      // A measure from satellite 1 down to you, drawn by part
      measure.visible = M.measure > 0.001;
      if (measure.visible) setLine(measure, [S[0], lerp(S[0], P, M.measure)]);
      altitude.visible = M.alt > 0.001;
      if (altitude.visible) {
        const foot = [0.0, 1.0, 0.0];
        const a0 = [0.62, 0.785, 0];
        const base = mul(unit(a0), 1);
        setLine(altitude, [base, mul(unit(a0), 1 + (G.A - 1) * M.alt)]);
        void foot;
      }
      threads.forEach((line, i) => {
        line.visible = M.thread[i] > 0.001;
        if (line.visible) setLine(line, [S[i], lerp(S[i], P, M.thread[i])]);
      });
      // Pulses running down the threads
      pulseDots.forEach((m, i) => {
        const ph = M.threadPulse >= 0 ? (M.threadPulse * 1.0 + i * 0.27) % 1 : -1;
        placeMarker(m, lerp(S[i], P, Math.max(0, ph)), 5, ph >= 0 ? M.thread[i] * Math.sin(Math.PI * ph) : 0);
      });

      // You, the other point, the wrong points (solved from the clock error every frame)
      placeMarker(youMark, P, M.youPx, M.you);
      placeMarker(otherMark, G.other, 7, M.other);
      const wrong = G.triples.map((tr) => {
        const two = trilaterate(tr.map((k) => S[k]), tr.map((k) => radii[k]));
        return norm(sub(two[0], P)) < norm(sub(two[1], P)) ? two[0] : two[1];
      });
      wrongMarks.forEach((m, k) => placeMarker(m, wrong[k], M.wrongPx, M.wrong[k]));
      this.wrongNow = wrong;

      // The close-up satellite
      close.visible = M.close > 0.01;
      if (close.visible) {
        close.position.copy(space.at(M.closeX, M.closeY, 0));
        close.rotation.set(0.35 + 0.08 * Math.sin(t * 0.4), M.closeTurn, 0.12);
        close.scale.setScalar(M.closeSize / UNIT);
        close.userData.halo.material.opacity = 0;
      }
      closeShells.forEach((m, k) => {
        const p = M.closeShells[k];
        m.visible = close.visible && p && p[1] > 0.002;
        if (!m.visible) return;
        m.position.copy(space.at(M.closeX, M.closeY, 0));
        m.scale.setScalar((p[0] * 1) / UNIT);
        m.userData.u.uOpacity.value = p[1];
        m.userData.u.uLines.value = 0;
        m.userData.u.uFill.value = 0.01;
      });
      flyby.visible = M.flyby > 0.01;
      if (flyby.visible) {
        flyby.position.set(...M.flybyAt);
        flyby.rotation.set(0.5, M.flybyTurn, 0.2);
        flyby.scale.setScalar(M.flybySize / UNIT);
        flyby.userData.halo.material.opacity = 0.15;
      }

      earth.render(E, t);
    },
  };
}
