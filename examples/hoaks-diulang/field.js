// The path through the grass: a picture of processing fluency, not of a brain. A lit field of instanced grass
// blades; a path runs from the near edge to the far one. Every time the walker passes, the blades it has gone over
// bend further down and the path's ground warms: the more it is walked, the smoother it is.
//
// All state lives in F (tweened by the timeline). field.render(t) draws the frame from F alone.
import { createStage3D } from "../../kit/engine/stage3d.js";

const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => {
  const u = clamp((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};

// The path, in the world: z runs from NEAR (in front of the camera) to FAR (the end, where the sign stands).
export const NEAR = 9;
export const FAR = -30;
export const pathX = (z) => 1.1 * Math.sin(z * 0.11 + 0.4);

export async function createField(canvas) {
  const space = createStage3D(canvas, { environment: 0.32, exposure: 1.0, fov: 38 });
  const { THREE, scene, camera } = space;
  camera.near = 0.1;
  camera.far = 200;
  camera.updateProjectionMatrix();
  scene.fog = new THREE.Fog(0x0b0b0c, 24, 62);

  // Light: a cool key from far left, a warm walker light that travels the path.
  space.key.color.set(0xc8d6ff);
  space.key.intensity = 1.2;
  space.key.position.set(-30, 40, -20);
  space.rim.color.set(0xffc27a);
  space.rim.intensity = 1.4;
  space.rim.position.set(10, 12, -40);
  const hemi = new THREE.HemisphereLight(0x5a6a7a, 0x0c0a08, 0.55);
  scene.add(hemi);
  const lamp = new THREE.PointLight(0xffb02e, 0, 9, 1.6);
  scene.add(lamp);

  // The ground, and the warm wash of the path on it (a strip whose brightness follows the wear).
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x16140f, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -10;
  scene.add(ground);
  const stripGeo = (() => {
    const seg = 120;
    const pos = [];
    const uv = [];
    const idx = [];
    for (let i = 0; i <= seg; i++) {
      const z = NEAR + 2 - (i / seg) * (NEAR + 2 - FAR + 1);
      const x = pathX(z);
      pos.push(x - 0.8, 0.01, z, x + 0.8, 0.01, z);
      uv.push(0, i / seg, 1, i / seg);
      if (i < seg) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  })();
  // Soft across its width: a texture that is bright in the middle and fades to nothing at the edges.
  const stripTex = (() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 4;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 64, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 4);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const stripMat = new THREE.MeshBasicMaterial({ color: 0xffb02e, map: stripTex, transparent: true, opacity: 0, depthWrite: false, fog: true });
  const strip = new THREE.Mesh(stripGeo, stripMat);
  scene.add(strip);

  // The blades: a tapered quad in five rows, its base at y = 0.
  const blade = new THREE.PlaneGeometry(0.075, 1, 1, 5);
  blade.translate(0, 0.5, 0);
  {
    const p = blade.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      p.setX(i, p.getX(i) * (1 - 0.85 * y));
      p.setZ(i, p.getZ(i) - 0.12 * y * y); // a little curve
    }
    blade.computeVertexNormals();
  }
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.0, side: THREE.DoubleSide });
  const rand = rng(11);
  const blades = [];
  // Only what the camera can see: the field widens with distance, and thins out where blades are small on screen.
  for (let z = NEAR + 2.5; z > FAR - 4; ) {
    const far = Math.max(0, 13 - z);
    const step = 0.07 * (1 + far * 0.045);
    const W = 2.6 + far * 0.27;
    for (let x = -W; x < W; x += step) {
      const bx = x + (rand() - 0.5) * step * 1.6;
      const bz = z + (rand() - 0.5) * step * 1.4;
      blades.push({ x: bx, z: bz, h: 0.5 + rand() * 0.5, yaw: rand() * Math.PI * 2, lean: (rand() - 0.5) * 0.4, leanDir: rand() * Math.PI * 2, tone: rand() });
    }
    z -= step;
  }
  const N = blades.length;
  const mesh = new THREE.InstancedMesh(blade, bladeMat, N);
  const colour = new THREE.Color();
  const straw = new THREE.Color(0.86, 0.6, 0.28);
  const near = []; // the blades close enough to the path to be trodden
  blades.forEach((b, i) => {
    b.d = b.x - pathX(b.z);
    b.c = new THREE.Color(0.07 + 0.06 * b.tone, 0.19 + 0.13 * b.tone, 0.08 + 0.04 * b.tone);
    mesh.setColorAt(i, b.c);
    if (Math.abs(b.d) < 2.2) near.push(i);
  });
  scene.add(mesh);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  const v = new THREE.Vector3();
  const place = (i, bend) => {
    const b = blades[i];
    // Standing: a small random lean. Trodden: laid down along the path, away from the camera.
    const lean = b.lean * (1 - bend) + bend * 1.35;
    e.set(Math.cos(b.leanDir) * lean * (1 - bend) - bend * 1.35, b.yaw * (1 - bend), Math.sin(b.leanDir) * lean * (1 - bend) + bend * 0.25 * Math.sign(b.d), "YXZ");
    q.setFromEuler(e);
    s.set(1 + bend * 0.6, b.h * (1 - 0.35 * bend), 1);
    v.set(b.x, 0, b.z);
    m.compose(v, q, s);
    mesh.setMatrixAt(i, m);
  };
  for (let i = 0; i < N; i++) place(i, 0);

  // The walker: a small warm light that runs the path.
  const walker = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), space.materials.glow(0xffc46a, 2.4));
  scene.add(walker);

  // State, all tweened by the film.
  // wear: how trodden the path is (0..1) over its whole length; head: where the current pass has reached (0..1 from
  // NEAR to FAR) and the wear it is laying down (next); cam: where the camera is and what it looks at.
  const F = { vis: 0, wear: 0, next: 0, head: 0, walk: 0, cx: 0, cy: 3.2, cz: 12, lx: 0, ly: 0, lz: -8, dim: 1 };
  const look = new THREE.Vector3();
  let last = "";

  return {
    F,
    count: N,
    // Where a world point lands in the frame (1080 x 1920).
    project(x, y, z) {
      v.set(x, y, z).project(camera);
      return [(v.x * 0.5 + 0.5) * 1080, (-v.y * 0.5 + 0.5) * 1920];
    },
    render() {
      if (F.vis <= 0.001) {
        space.render(0);
        return;
      }
      camera.position.set(F.cx, F.cy, F.cz);
      look.set(F.lx, F.ly, F.lz);
      camera.lookAt(look);
      // The walker, and the wear: behind the head of the pass the path has F.next, ahead of it F.wear.
      const zHead = NEAR + 1.5 - F.head * (NEAR + 1.5 - FAR);
      walker.position.set(pathX(zHead), 0.22, zHead);
      walker.visible = F.walk > 0.01;
      walker.scale.setScalar(F.walk);
      lamp.position.set(pathX(zHead), 0.9, zHead);
      lamp.intensity = 6 * F.walk;
      const key = `${F.wear.toFixed(4)} ${F.next.toFixed(4)} ${F.head.toFixed(4)}`;
      if (key !== last) {
        last = key;
        for (const i of near) {
          const b = blades[i];
          const passed = b.z > zHead + 0.3 ? 1 : smooth(zHead - 0.4, zHead + 0.3, b.z);
          const w = F.wear + (F.next - F.wear) * passed;
          // The width of the path grows with wear; at its middle the blades lie flat.
          const half = 0.14 + 0.5 * w;
          const bend = w * (1 - smooth(half * 0.55, half * 1.25, Math.abs(b.d)));
          place(i, clamp(bend * 1.05));
          colour.copy(b.c).lerp(straw, 0.4 * clamp(bend));
          mesh.setColorAt(i, colour);
        }
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor.needsUpdate = true;
      }
      stripMat.opacity = 0.04 + 0.24 * F.wear;
      strip.scale.x = 1;
      bladeMat.color.setScalar(F.dim);
      space.render(F.vis);
    },
  };
}
