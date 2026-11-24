// The Low Poly kit of this film: flat-shaded facets, a gradient sky with a faceted sun, terrain from real elevations,
// floating tags, things that assemble facet by facet, a rising column of faceted puffs. Built on kit/engine/stage3d.js
// (its renderer, scene and camera); every value is a function of the film's time.
import * as THREE from "three";

export const PAL = {
  orange: "#ff9f1c", sand: "#ffbf69", sky: "#cbf3f0", teal: "#2ec4b6", dark: "#293241",
  coral: "#e4572e", ember: "#d9531e", kental: "#c2410c", gas: "#e9fbf8",
};
export const col = (hex) => new THREE.Color(hex);

// Seeded numbers: the same on every render, whatever order things are built in.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash = (i, s = 0) => {
  let h = Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s | 0, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const smooth = (a, b, v) => { const x = clamp((v - a) / (b - a)); return x * x * (3 - 2 * x); };
export const lerp = (a, b, k) => a + (b - a) * k;
const backOut = (x, s = 1.6) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);

// ── Facets ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// A flat-shaded material whose colour is per facet (vertex colours, the same on a facet's three corners).
export const flat = (opts = {}) => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, ...opts });
export const unlit = (opts = {}) => new THREE.MeshBasicMaterial({ vertexColors: true, ...opts });

// Any geometry as separate facets, each coloured by colourOf(i, centroid, normal) (a THREE.Color).
export function facets(geometry, colourOf) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const p = g.attributes.position;
  const n = p.count / 3;
  const c = new Float32Array(p.count * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), cen = new THREE.Vector3(), nor = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    a.fromBufferAttribute(p, i * 3); b.fromBufferAttribute(p, i * 3 + 1); d.fromBufferAttribute(p, i * 3 + 2);
    cen.copy(a).add(b).add(d).multiplyScalar(1 / 3);
    nor.copy(b).sub(a).cross(d.clone().sub(a)).normalize();
    const k = colourOf(i, cen, nor);
    for (let j = 0; j < 3; j++) c.set([k.r, k.g, k.b], (i * 3 + j) * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  return g;
}
// One colour, a little different on every facet (so facets that face the same way still read as facets).
export const tone = (hex, amount = 0.05, seed = 0) => (i) => col(hex).offsetHSL(0, 0, (hash(i, seed) - 0.5) * amount);
export const mesh = (geometry, colourOf, material = flat()) => new THREE.Mesh(facets(geometry, colourOf), material);

// A mesh from plain triangles: tris = [[a, b, c], ...] of Vector3, colours = [Color, ...].
export function triMesh(tris, colours, material = flat()) {
  const pos = new Float32Array(tris.length * 9), c = new Float32Array(tris.length * 9);
  tris.forEach((t, i) => {
    t.forEach((v, j) => pos.set([v.x, v.y, v.z], i * 9 + j * 3));
    const k = colours[i];
    for (let j = 0; j < 3; j++) c.set([k.r, k.g, k.b], i * 9 + j * 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return new THREE.Mesh(g, material);
}

// Facet by facet: each triangle grows out of its own middle in the order key(centroid, i) gives (low first), as
// state.p goes 0 to 1. Call update() every frame; a finished mesh costs nothing.
export function assembler(object, key = (c) => c.y, { spread = 0.35, lift = 0 } = {}) {
  const parts = [], skipped = [];
  object.traverse((o) => {
    if (!o.isMesh) return;
    // a geometry shared with other meshes (an atom, say) is never rewritten: it only appears with the rest
    if (o.geometry.userData.shared || o.geometry.index) { skipped.push(o); return; }
    const p = o.geometry.attributes.position;
    const base = p.array.slice();
    const n = p.count / 3;
    const keys = new Float32Array(n), cen = new Float32Array(n * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0, z = 0;
      for (let j = 0; j < 3; j++) { x += base[(i * 3 + j) * 3]; y += base[(i * 3 + j) * 3 + 1]; z += base[(i * 3 + j) * 3 + 2]; }
      cen.set([x / 3, y / 3, z / 3], i * 3);
      v.set(x / 3, y / 3, z / 3);
      o.localToWorld(v);
      keys[i] = key(v, i);
    }
    parts.push({ o, p, base, keys, cen, n });
  });
  let lo = Infinity, hi = -Infinity;
  for (const { keys } of parts) for (const k of keys) { lo = Math.min(lo, k); hi = Math.max(hi, k); }
  for (const part of parts) for (let i = 0; i < part.n; i++) part.keys[i] = (part.keys[i] - lo) / (hi - lo || 1);
  const state = { p: 1, last: -1 };
  state.update = () => {
    const P = clamp(state.p);
    if (P === state.last) return;
    state.last = P;
    for (const o of skipped) o.visible = P > 0.5;
    for (const { o, p, base, keys, cen, n } of parts) {
      o.visible = P > 0;
      const arr = p.array;
      if (P >= 1) arr.set(base);
      else {
        for (let i = 0; i < n; i++) {
          const local = clamp((P * (1 + spread) - keys[i]) / spread);
          const s = local <= 0 ? 0 : backOut(local);
          const cx = cen[i * 3], cy = cen[i * 3 + 1], cz = cen[i * 3 + 2];
          for (let j = 0; j < 3; j++) {
            const q = (i * 3 + j) * 3;
            arr[q] = cx + (base[q] - cx) * s;
            arr[q + 1] = cy + (base[q + 1] - cy) * s - (1 - local) * lift;
            arr[q + 2] = cz + (base[q + 2] - cz) * s;
          }
        }
      }
      p.needsUpdate = true;
    }
  };
  return state;
}

// Faceted glass (a gas bubble): each facet clear in the middle of the shape and bright at its edge, one glint facet
// towards the light. Flat per facet (the normal comes from the facet itself), so it stays low poly.
export function glassMat({ tint = "#dffcf7", opacity = 1, glint = [-0.45, 0.75, 0.5] } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(tint) }, opacity: { value: opacity }, glint: { value: new THREE.Vector3(...glint).normalize() } },
    vertexShader: "varying vec3 vPos; void main(){ vec4 p = modelViewMatrix * vec4(position, 1.0); vPos = p.xyz; gl_Position = projectionMatrix * p; }",
    fragmentShader: `uniform vec3 tint; uniform float opacity; uniform vec3 glint; varying vec3 vPos;
      void main(){
        vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
        float f = 1.0 - abs(dot(n, normalize(-vPos)));
        float a = 0.1 + 0.8 * pow(f, 2.0);
        vec3 c = mix(tint * 0.9, vec3(1.0), pow(f, 1.4));
        float g = pow(max(dot(n, glint), 0.0), 18.0);
        c = mix(c, vec3(1.0), g);
        a = max(a, g * 0.95);
        gl_FragColor = vec4(c, a * opacity);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, fog: false,
  });
}

// A path downhill on a terrain (lava, a pyroclastic flow): steepest descent with a little inertia and a bias.
export function downhill(heightAt, x, z, { step = 1.1, bias = [0, 0.12], stop = -1.2, max = 400, seed = 1, inertia = 0.65 } = {}) {
  const pts = [];
  let dx = bias[0], dz = bias[1] || 1;
  const r = rng(seed);
  for (let i = 0; i < max; i++) {
    const y = heightAt(x, z);
    pts.push(new THREE.Vector3(x, y, z));
    if (y < stop) break;
    const e = 1.2;
    const gx = -(heightAt(x + e, z) - heightAt(x - e, z)) + bias[0], gz = -(heightAt(x, z + e) - heightAt(x, z - e)) + bias[1];
    const l = Math.hypot(gx, gz) || 1;
    dx = dx * inertia + (gx / l) * (1 - inertia) + (r() - 0.5) * 0.12;
    dz = dz * inertia + (gz / l) * (1 - inertia);
    const m = Math.hypot(dx, dz) || 1;
    x += (dx / m) * step;
    z += (dz / m) * step;
  }
  return pts;
}

// ── Sky ────────────────────────────────────────────────────────────────────────────────────────────────────────────
// A soft gradient (horizon, middle, top) on a dome that travels with the camera, and the sun as a faceted disc.
export function createSky(scene) {
  const uniforms = {
    top: { value: col(PAL.orange) }, mid: { value: col(PAL.sand) }, low: { value: col(PAL.sky) },
    midAt: { value: 0.22 }, lowAt: { value: 0.02 }, below: { value: col(PAL.sky) },
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(3000, 32, 16),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 top, mid, low, below; uniform float midAt, lowAt; varying vec3 vDir;
        void main(){
          float h = normalize(vDir).y;
          vec3 c = mix(low, mid, smoothstep(lowAt, midAt, h));
          c = mix(c, top, smoothstep(midAt, 0.75, h));
          c = mix(below, c, smoothstep(-0.04, lowAt, h));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    }),
  );
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  const sun = new THREE.Mesh(new THREE.CircleGeometry(1, 10), new THREE.MeshBasicMaterial({ color: "#fff4dc", fog: false, depthWrite: false, transparent: true }));
  sun.renderOrder = -9;
  sun.frustumCulled = false;
  scene.add(dome, sun);
  const state = { sunAz: 16, sunEl: 9, sunSize: 2.3, sunOn: 1 };
  return {
    uniforms, dome, sun, state,
    set(p) {
      uniforms.top.value.set(p.top); uniforms.mid.value.set(p.mid); uniforms.low.value.set(p.low); uniforms.below.value.set(p.below ?? p.low);
      uniforms.midAt.value = p.midAt ?? 0.22; uniforms.lowAt.value = p.lowAt ?? 0.02;
      state.sunOn = p.sun ?? 1;
      if (p.sunAz !== undefined) Object.assign(state, { sunAz: p.sunAz, sunEl: p.sunEl, sunSize: p.sunSize ?? 2.3 });
    },
    follow(camera) {
      dome.position.copy(camera.position);
      const az = THREE.MathUtils.degToRad(state.sunAz), el = THREE.MathUtils.degToRad(state.sunEl);
      const d = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
      sun.visible = state.sunOn > 0.01;
      sun.position.copy(camera.position).addScaledVector(d, 2500);
      sun.scale.setScalar(2500 * Math.tan(THREE.MathUtils.degToRad(state.sunSize / 2)));
      sun.lookAt(camera.position);
      // a sun cut by the frame's edge reads as a mistake: it shows only once it is mostly in, and is whole by then
      const v = sun.position.clone().project(camera);
      const ry = Math.tan(THREE.MathUtils.degToRad(state.sunSize / 2)) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), rx = ry / camera.aspect;
      const inside = Math.min((1 - Math.abs(v.y)) / ry, (1 - Math.abs(v.x)) / rx); // in radii from the nearest edge
      sun.material.opacity = v.z < 1 ? clamp((inside - 0.15) / 0.85) ** 2 : 0;
    },
  };
}

// ── Terrain from terrain.json (terrain.build.py) ───────────────────────────────────────────────────────────────────
// Triangles of a world, its height anywhere (barycentric on the triangles), and for a cut-away the two halves either
// side of the plane z = 0 and the line the plane draws through the ground.
export function terrain(data) {
  const V = data.v, T = data.t;
  const P = (i) => new THREE.Vector3(V[i * 3], V[i * 3 + 1], V[i * 3 + 2]);
  const tris = [];
  for (let i = 0; i < T.length; i += 3) tris.push([P(T[i]), P(T[i + 1]), P(T[i + 2])]);
  // buckets for heightAt
  const cell = 10, buckets = new Map();
  tris.forEach((t, k) => {
    const xs = t.map((v) => v.x), zs = t.map((v) => v.z);
    for (let i = Math.floor(Math.min(...xs) / cell); i <= Math.floor(Math.max(...xs) / cell); i++)
      for (let j = Math.floor(Math.min(...zs) / cell); j <= Math.floor(Math.max(...zs) / cell); j++) {
        const key = `${i},${j}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(k);
      }
  });
  function heightAt(x, z) {
    for (const k of buckets.get(`${Math.floor(x / cell)},${Math.floor(z / cell)}`) ?? []) {
      const [a, b, c] = tris[k];
      const d = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
      const l1 = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / d;
      const l2 = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / d;
      const l3 = 1 - l1 - l2;
      if (l1 >= -1e-6 && l2 >= -1e-6 && l3 >= -1e-6) return l1 * a.y + l2 * b.y + l3 * c.y;
    }
    return 0;
  }
  // Split every triangle by the plane z = 0 into the part north (z <= 0) and the part south (z >= 0).
  function split() {
    const north = [], south = [], cuts = [];
    const ix = (a, b) => { const k = a.z / (a.z - b.z); return new THREE.Vector3(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, 0); };
    tris.forEach((t, k) => {
      const s = t.map((v) => (Math.abs(v.z) < 1e-9 ? 0 : Math.sign(v.z)));
      if (s.every((x) => x <= 0)) { north.push([t, k]); if (s.filter((x) => x === 0).length === 2) cuts.push(t.filter((_, i) => s[i] === 0)); return; }
      if (s.every((x) => x >= 0)) { south.push([t, k]); return; }
      // the polygon on each side, walked round the triangle
      const side = (sg) => {
        const poly = [];
        for (let i = 0; i < 3; i++) {
          const a = t[i], b = t[(i + 1) % 3], sa = s[i], sb = s[(i + 1) % 3];
          if (sa === sg || sa === 0) poly.push(a.clone());
          if (sa !== 0 && sb !== 0 && sa !== sb) poly.push(ix(a, b));
        }
        return poly;
      };
      const pn = side(-1), ps = side(1);
      for (let i = 1; i < pn.length - 1; i++) north.push([[pn[0], pn[i], pn[i + 1]], k]);
      for (let i = 1; i < ps.length - 1; i++) south.push([[ps[0], ps[i], ps[i + 1]], k]);
      const on = pn.filter((v) => Math.abs(v.z) < 1e-9);
      if (on.length === 2) cuts.push(on);
    });
    // the line through the ground: every cut segment's ends, west to east
    const pts = [];
    for (const [a, b] of cuts) pts.push([a.x, a.y], [b.x, b.y]);
    pts.sort((p, q) => p[0] - q[0]);
    const line = [];
    for (const p of pts) if (!line.length || p[0] - line.at(-1)[0] > 0.05) line.push(p);
    return { north, south, line };
  }
  return { tris, heightAt, split };
}

// ── Tags: a chip, a line, a dot on the thing ───────────────────────────────────────────────────────────────────────
export function createTags(box, svg, W = 1920, H = 1080) {
  const NS = "http://www.w3.org/2000/svg";
  const list = [];
  const v = new THREE.Vector3();
  function tag(html, { at, view = "main", dx = 160, dy = -100, cls = "", margin = 84, bottom = 846, bare = false } = {}) {
    const el = document.createElement("div");
    el.className = `tag ${cls}`.trim();
    el.innerHTML = html;
    box.appendChild(el);
    const line = document.createElementNS(NS, "polyline");
    line.setAttribute("class", "tag-line");
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("class", "tag-dot");
    svg.append(line, dot);
    if (bare) el.classList.add("bare");
    const state = { show: 0, at, view, dx, dy, el, line, dot, margin, bottom, bare, x: null, y: null, placed: false };
    list.push(state);
    return state;
  }
  // Places the tags of one view, after that view's camera is set; rect is its viewport in frame pixels.
  function place(view, camera, rect = { x: 0, y: 0, w: W, h: H }) {
    for (const s of list) {
      if (s.view !== view) continue;
      s.placed = true;
      const on = s.show > 0.001;
      s.el.style.visibility = on ? "visible" : "hidden";
      s.line.style.display = s.dot.style.display = on ? "" : "none";
      if (!on) continue;
      const p = typeof s.at === "function" ? s.at() : s.at;
      v.copy(p).project(camera);
      const x = rect.x + (v.x * 0.5 + 0.5) * rect.w, y = rect.y + (-v.y * 0.5 + 0.5) * rect.h;
      const k = Math.min(1, s.show * 1.4);
      const w = s.el.offsetWidth, h = s.el.offsetHeight;
      if (s.bare) {
        // a label with no line: centred on the point, offset by (dx, dy)
        s.line.style.display = s.dot.style.display = "none";
        const a = clamp(s.show);
        const left = clamp(x + s.dx - w / 2, s.margin, W - s.margin - w), top = clamp(y + s.dy - h / 2, 40, s.bottom - h);
        s.el.style.opacity = a.toFixed(3);
        s.el.style.transform = `translate(${left.toFixed(1)}px, ${(top + (1 - a) * 12).toFixed(1)}px)`;
        s.x = x; s.y = y;
        continue;
      }
      let cx = x + s.dx, cy = y + s.dy;
      // keep the chip inside the frame and above the caption band
      const left0 = s.dx >= 0 ? cx : cx - w;
      const left = clamp(left0, s.margin, W - s.margin - w);
      const top = clamp(cy - h / 2, 40, s.bottom - h);
      cx = s.dx >= 0 ? left : left + w;
      cy = top + h / 2;
      const ex = x + (cx - x) * k, ey = y + (cy - y) * k;
      s.line.setAttribute("points", `${x.toFixed(1)},${y.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`);
      s.dot.setAttribute("cx", x.toFixed(1));
      s.dot.setAttribute("cy", y.toFixed(1));
      s.dot.setAttribute("r", (8 * Math.min(1, s.show * 3)).toFixed(2));
      const a = clamp((s.show - 0.45) / 0.55);
      s.el.style.opacity = a.toFixed(3);
      s.el.style.transform = `translate(${left.toFixed(1)}px, ${(top + (1 - a) * 12).toFixed(1)}px)`;
      s.x = x; s.y = y;
    }
  }
  // Each frame: begin(), place() for every view drawn, end() hides the tags of views not drawn this frame.
  const begin = () => list.forEach((s) => (s.placed = false));
  const end = () => list.forEach((s) => {
    if (s.placed) return;
    s.el.style.visibility = "hidden";
    s.line.style.display = s.dot.style.display = "none";
  });
  return { tag, place, list, begin, end };
}

// ── A column of faceted puffs (an ash column, steam) ───────────────────────────────────────────────────────────────
// Each puff rises once per `period` seconds from the vent, slowing as it climbs and widening; `front` hides what is
// above a height (a column still building), `opacity` fades the whole column.
export function createColumn({ count = 70, height = 150, period = 57.5, base = new THREE.Vector3(), colours = ["#b9b3ab", "#a7a29c", "#cbc4b9", "#958f8b", "#ada69c"], emissive = "#3d3b3c", seed = 5, size = 1.6, grow = 0.075, spread = 0.2, drift = 0.06, power = 1.8, detail = 1, umbrellaAt = 0, umbrella = 1.6, share = 0.35 } = {}) {
  const r = rng(seed);
  const group = new THREE.Group();
  const geo = [new THREE.IcosahedronGeometry(1, 0), new THREE.IcosahedronGeometry(1, 1)];
  const mats = colours.map((c) => new THREE.MeshLambertMaterial({ color: c, emissive, flatShading: true, transparent: true, opacity: 1 }));
  const puffs = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo[i % 4 === 0 ? 0 : detail], mats[i % mats.length]);
    m.rotation.set(r() * 6, r() * 6, r() * 6);
    const p = { m, ph: i / count + (r() - 0.5) / count, a: r() * Math.PI * 2, rr: Math.sqrt(r()), k: 0.75 + r() * 0.6, spin: (r() - 0.5) * 0.5, rz: r() * 6 };
    puffs.push(p);
    group.add(m);
  }
  // Rising slowly near the vent and faster above (h = height * u^power), so the part in frame is dense.
  const state = { front: Infinity, opacity: 1, base, height, size, grow, spread, drift, power, materials: mats };
  state.group = group;
  // with an umbrella: a share of each puff's life is spent spreading out sideways at the top of the column
  const hu = umbrellaAt;
  state.heightAt = (u) => {
    if (!hu) return state.height * Math.pow(u, state.power);
    const k = 1 - share;
    return u < k ? hu * Math.pow(u / k, state.power) : hu + (state.height - hu) * Math.sqrt((u - k) / share);
  };
  state.update = (t) => {
    for (const m of mats) { m.opacity = state.opacity; m.transparent = state.opacity < 0.999; m.depthWrite = state.opacity > 0.5; }
    group.visible = state.opacity > 0.002;
    for (const p of puffs) {
      const u = (((t / period + p.ph) % 1) + 1) % 1;
      const h = state.heightAt(u);
      const top = hu && h > hu ? h - hu : 0;
      const R = 0.9 + Math.min(h, hu || h) * state.spread + top * umbrella;
      const appear = smooth(0, 0.03, u) * (1 - smooth(0.94, 1, u));
      const s = (state.size + h * state.grow + top * 0.12) * p.k * appear * (h <= state.front ? 1 : 0);
      p.m.visible = s > 0.01;
      p.m.scale.set(Math.max(s, 0.001), Math.max(s * (top ? 0.62 : 1), 0.001), Math.max(s, 0.001));
      const y = hu && h > hu ? hu + top * 0.32 : h;
      p.m.position.set(state.base.x + Math.cos(p.a) * R * p.rr - h * state.drift, state.base.y + y, state.base.z + Math.sin(p.a) * R * p.rr * 0.8);
      p.m.rotation.z = p.rz + p.spin * t;
    }
  };
  return state;
}
