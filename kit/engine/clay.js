// Claymation for the Clay template: a little tabletop set, plasticine that shows the hand that shaped it, and the
// frame-to-frame boil of stop motion. Built on kit/engine/stage3d.js; the template's stepped 12 holds each pose.
//
//   import { createStage3D } from "../../kit/engine/stage3d.js";
//   import { createClay } from "../../kit/engine/clay.js";
//   const space = createStage3D($("#space"), { rig: true, shadows: true, environment: 0.35 });
//   const clay = createClay(space);
//   clay.set({ backdrop: ["#ffe1cc", "#ffb69a"], table: "#e8c39e" });  // the card backdrop, the table, the lights
//   const sun = clay.lump(new THREE.SphereGeometry(4, 96, 64), "#ffd166", { seed: 3 });
//   const stem = clay.rope([[0, 0, 0], [0.3, 3, 0], [0, 6, 0.2]], 0.35, "#06d6a0");   // { closed: true } for a ring
//   const flag = clay.flag("akar", { at: [2, 1, 0] });                  // a paper flag on a toothpick
//   film.each((t) => { clay.update(t); space.render(1, t); });           // boil, then draw
//
// Each lump is a mesh whose material is plasticine: matte with a slight sheen, fingerprints and tool marks in its
// surface, never perfectly smooth. clay.update(t) moves every surface a little per held frame, as clay re-handled
// between exposures does. Squash, stretch, plop and wobble are plain tweens of scale and position.
import * as THREE from "three";

const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const canvasOf = (w, h = w) => Object.assign(document.createElement("canvas"), { width: w, height: h });

// The surface of handled clay as a height field: fingerprint whorls, a few tool drags, fine pits, a soft lumpiness.
function clayHeight(seed, size = 512) {
  const rand = rng(seed);
  const c = canvasOf(size);
  const g = c.getContext("2d");
  g.fillStyle = "rgb(128,128,128)";
  g.fillRect(0, 0, size, size);
  g.filter = "blur(18px)";
  for (let i = 0; i < 26; i++) {
    const v = 100 + rand() * 56;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.beginPath();
    g.arc(rand() * size, rand() * size, 30 + rand() * 90, 0, Math.PI * 2);
    g.fill();
  }
  g.filter = "blur(0.6px)";
  // Fingerprints: sets of close concentric ellipse arcs, pressed in.
  for (let f = 0; f < 5; f++) {
    const x = rand() * size, y = rand() * size, r0 = 4 + rand() * 6, rot = rand() * Math.PI, sq = 0.55 + rand() * 0.3;
    for (let k = 0; k < 13; k++) {
      g.strokeStyle = `rgba(${k % 2 ? 150 : 104},${k % 2 ? 150 : 104},${k % 2 ? 150 : 104},0.55)`;
      g.lineWidth = 1.6;
      g.beginPath();
      g.ellipse(x, y, r0 + k * 3.2, (r0 + k * 3.2) * sq, rot, rand() * 0.8, Math.PI * (1.4 + rand() * 0.5));
      g.stroke();
    }
  }
  // Tool marks: a few long shallow drags.
  for (let i = 0; i < 6; i++) {
    const x = rand() * size, y = rand() * size, a = rand() * Math.PI, l = 60 + rand() * 140;
    g.strokeStyle = "rgba(96,96,96,0.5)";
    g.lineWidth = 2 + rand() * 3;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (rand() - 0.5) * 30, y + Math.sin(a) * l * 0.5 + (rand() - 0.5) * 30, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  // Pits and grit.
  const img = g.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 14 + (rand() < 0.004 ? -40 : 0);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, img.data[i] + n));
  }
  g.putImageData(img, 0, 0);
  return c;
}
function normalFrom(height, strength = 2.4) {
  const w = height.width, h = height.height;
  const src = height.getContext("2d").getImageData(0, 0, w, h).data;
  const out = canvasOf(w, h);
  const ctx = out.getContext("2d");
  const img = ctx.createImageData(w, h);
  const at = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const len = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    img.data[i] = (-dx / len) * 127.5 + 127.5;
    img.data[i + 1] = (dy / len) * 127.5 + 127.5;
    img.data[i + 2] = (1 / len) * 127.5 + 127.5;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

export function createClay(space, { stepped = 12 } = {}) {
  const { scene, renderer, key, rim, fill } = space;
  const boilers = [];
  const shared = new Map();
  const surface = (seed) => {
    if (!shared.has(seed)) {
      const t = new THREE.CanvasTexture(normalFrom(clayHeight(seed)));
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      shared.set(seed, t);
    }
    return shared.get(seed);
  };

  // Plasticine: matte, a soft sheen at grazing angles, the hand's marks in the normal map, and a vertex boil that
  // changes once per held frame (uBoil), smooth over the surface, so the lump breathes like re-handled clay.
  function material(colour, { seed = 1, boil = 0.05, marks = 0.9, repeat = 1.4, size = 1 } = {}) {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(colour),
      roughness: 0.58,
      metalness: 0,
      sheen: 0.5,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color(colour).lerp(new THREE.Color("#ffffff"), 0.55),
      clearcoat: 0.06,
      clearcoatRoughness: 0.6,
      normalMap: surface(seed),
      normalScale: new THREE.Vector2(marks, marks),
    });
    m.normalMap = m.normalMap.clone();
    m.normalMap.needsUpdate = true;
    m.normalMap.repeat.set(repeat, repeat);
    // The boil's waves are sized to the piece (`size`, its radius or thickness): two or three across it, never ripples.
    const uniforms = { uBoil: { value: 0 }, uBoilAmount: { value: boil * size }, uSeed: { value: seed * 1.37 }, uFreq: { value: 1 / size } };
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>
          uniform float uBoil; uniform float uBoilAmount; uniform float uSeed; uniform float uFreq;
          float clayBoil(vec3 p) {
            p *= uFreq;
            float a = uBoil * 2.399 + uSeed, b = uBoil * 1.618 + uSeed * 2.1, c = uBoil * 0.937 + uSeed * 0.7;
            return sin(p.x * 1.9 + a) * sin(p.y * 2.1 + b) * sin(p.z * 1.8 + c) + 0.35 * sin(p.x * 3.1 + c) * sin(p.z * 2.9 + a);
          }`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>
          transformed += normal * clayBoil(position) * uBoilAmount;`);
    };
    m.customProgramCacheKey = () => "clay";
    m.userData.boil = uniforms;
    boilers.push(uniforms);
    return m;
  }

  // A shaped lump: the geometry pushed in and out a little (no clay is a perfect sphere), with the clay material.
  // `size` is the piece's own scale (a ball's radius, a rope's thickness); it defaults to the bounding radius.
  function lump(geometry, colour, { seed = 1, uneven = 0.06, boil = 0.025, marks = 0.9, size } = {}) {
    const g = geometry;
    const pos = g.attributes.position, nor = g.attributes.normal;
    const rand = rng(seed * 131);
    const ph = [rand() * 6.28, rand() * 6.28, rand() * 6.28];
    g.computeBoundingSphere();
    const r = size ?? (g.boundingSphere.radius || 1);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const n = Math.sin((x / r) * 2.3 + ph[0]) * Math.sin((y / r) * 2.1 + ph[1]) * Math.sin((z / r) * 2.6 + ph[2]) + 0.4 * Math.sin((x / r) * 5.1 + ph[1]) * Math.sin((z / r) * 4.7 + ph[0]);
      const k = n * uneven * r;
      pos.setXYZ(i, x + nor.getX(i) * k, y + nor.getY(i) * k, z + nor.getZ(i) * k);
    }
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, material(colour, { seed, boil, marks, size: r }));
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }

  // A rolled rope of clay along points, slightly uneven in thickness, with rounded ends.
  function rope(points, radius, colour, { seed = 2, segments = 160, boil = 0.04, closed = false } = {}) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed);
    const group = new THREE.Group();
    // Uneven along its length at the scale of its thickness, as a rope rolled between the palms is.
    const tube = lump(new THREE.TubeGeometry(curve, segments, radius, 24, closed), colour, { seed, uneven: 0.1, boil, size: radius * 2.5 });
    group.add(tube);
    for (const end of closed ? [] : [0, 1]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), tube.material);
      cap.position.copy(curve.getPoint(end));
      cap.castShadow = cap.receiveShadow = true;
      group.add(cap);
    }
    group.userData.curve = curve;
    return group;
  }

  // The tabletop set: a card backdrop bent into the table (a cyclorama, so there is no seam), painted in a soft
  // vertical gradient; the table's card surface; a soft key from the upper left, a warm bounce from below.
  function set({ backdrop = ["#ffe1cc", "#ffb69a"], table = "#e8c39e", width = 80, depth = 50, height = 60, warm = "#ffcf9e", glow = 0.32 } = {}) {
    const c = canvasOf(64, 512), g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, backdrop[0]);
    grad.addColorStop(0.62, backdrop[1] ?? backdrop[0]);
    grad.addColorStop(1, table);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 512);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    // A plane bent through a quarter circle from upright (the backdrop) to flat (the table).
    const geo = new THREE.PlaneGeometry(width, height + depth, 1, 80);
    const p = geo.attributes.position, bend = 14;
    for (let i = 0; i < p.count; i++) {
      const s = (p.getY(i) + (height + depth) / 2); // 0 at the front edge of the table, height+depth at the top
      let y, z;
      if (s < depth - bend) { y = 0; z = depth - bend - s; }
      else if (s < depth - bend + (Math.PI / 2) * bend) {
        const a = (s - (depth - bend)) / bend;
        y = bend - Math.cos(a) * bend;
        z = -Math.sin(a) * bend;
      } else { y = bend + (s - (depth - bend + (Math.PI / 2) * bend)); z = -bend; }
      p.setY(i, y);
      p.setZ(i, z);
    }
    geo.computeVertexNormals();
    // Painted card keeps its paint: lit, shadowed, but not pulled grey by the tone curve, and lifted a little from
    // within (`glow`), as a well-lit small set reads on camera. Lower it when the paint must keep its colour on camera.
    const card = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: glow, roughness: 0.92, metalness: 0, normalMap: surface(91), normalScale: new THREE.Vector2(0.15, 0.15), toneMapped: false }));
    card.material.normalMap.repeat.set(6, 6);
    card.receiveShadow = true;
    card.userData.castShadow = false;
    scene.add(card);
    // The studio: one big soft key from the upper left, a warm bounce from below, the rim low.
    key.intensity = 2.3;
    key.position.set(-40, 70, 60);
    rim.intensity = 0.5;
    fill.intensity = 0.2;
    const bounce = new THREE.HemisphereLight("#fff4ea", warm, 0.55);
    scene.add(bounce);
    if (key.shadow) {
      key.shadow.radius = 10;
      key.shadow.blurSamples = 16;
    }
    return { card, bounce };
  }

  // A paper flag on a toothpick, stuck into a part: the label as a clay film labels things.
  // `side: -1` hangs the paper to the left of the pick (toward the middle of the frame when the part sits on the right).
  // `size` is the paper's height in world units; its width follows the words, so a long label is never cut. The
  // canvas is sized to the text (measured), and the paper keeps the canvas's shape.
  function flag(text, { at = [0, 0, 0], height = 4, size = 1.2, colour = "#fffaf0", ink = "#2b2b2b", font = "600 120px Fredoka, sans-serif", lean = 0.12, side = 1 } = {}) {
    const group = new THREE.Group();
    const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * size, 0.06 * size, height, 10), new THREE.MeshStandardMaterial({ color: "#d9b48a", roughness: 0.8 }));
    pick.position.y = height / 2;
    const probe = canvasOf(8, 8).getContext("2d");
    probe.font = font;
    const tw = Math.ceil(probe.measureText(text).width), H = 200, W = Math.max(260, tw + 90);
    const c = canvasOf(W, H), g = c.getContext("2d");
    g.fillStyle = colour;
    g.fillRect(0, 0, W, H);
    g.fillStyle = ink;
    g.font = font;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, W / 2, H / 2 + 8);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const h = size, w = (size * W) / H;
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 12, 1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }));
    // A slight curl, as paper does.
    const pp = paper.geometry.attributes.position;
    for (let i = 0; i < pp.count; i++) pp.setZ(i, Math.sin((pp.getX(i) / w + 0.5) * Math.PI) * 0.06 * w);
    paper.geometry.computeVertexNormals();
    paper.position.set(side * (w / 2 + 0.05 * size), height - h / 2 - 0.05 * size, 0);
    group.add(pick, paper);
    group.rotation.z = -lean * side;
    group.position.set(...at);
    group.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    group.userData.paper = paper;
    return group;
  }

  // Once per frame, before rendering: the boil moves to the next held pose.
  function update(t) {
    const k = Math.floor(t * stepped + 1e-6);
    for (const u of boilers) u.uBoil.value = k;
  }

  return { THREE, material, lump, rope, set, flag, update };
}
