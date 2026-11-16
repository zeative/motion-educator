// Sound drawn as light, in the 3D scene where it happens.
//
//   wave(space, { path, normal, color, value })   a glowing line along a path, displaced by value(s, t) in mm
//                                                 (s = distance along the path in mm). It always faces the camera.
//   bands(space, { from, dir, length, size, color, pressure })
//                                                 sheets of light across the air: bright where the air is squeezed
//   air(space, { box, value })                    specks of air that move back and forth with the wave
//   shell(space, { color })                       a thin bright sphere (a sudden clatter's front)
// Each returns an object with update(t, camera) and plain numbers the timeline tweens (opacity, head, tail...).
import { rng } from "../../kit/engine/parts3d.js";

export function wave(space, { path, normal, color = 0xffb547, value = () => 0, width = 1.6, samples = 420, glow = 1 }) {
  const { THREE } = space;
  const curve = path.isCurve ? path : new THREE.LineCurve3(path[0], path[1]);
  const L = curve.getLength();
  const pts = curve.getSpacedPoints(samples - 1);
  const tans = pts.map((_, i) => curve.getTangentAt(i / (samples - 1)));
  const nrm = pts.map((p, i) => {
    const n = (typeof normal === "function" ? normal(p, i / (samples - 1)) : normal).clone();
    return n.addScaledVector(tans[i], -n.dot(tans[i])).normalize();
  });
  const pos = new Float32Array(samples * 2 * 3);
  const side = new Float32Array(samples * 2);
  const along = new Float32Array(samples * 2);
  for (let i = 0; i < samples; i++) {
    side[i * 2] = -1;
    side[i * 2 + 1] = 1;
    along[i * 2] = along[i * 2 + 1] = i / (samples - 1);
  }
  const idx = [];
  for (let i = 0; i < samples - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("side", new THREE.BufferAttribute(side, 1));
  g.setAttribute("along", new THREE.BufferAttribute(along, 1));
  g.setIndex(idx);
  const state = { opacity: 0, head: 1, tail: 0, width, glow, fade: 0.04, fadeOut: null };
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: 0 }, head: { value: 1 }, tail: { value: 0 }, glow: { value: 1 }, fade: { value: 0.04 } },
    vertexShader: `attribute float side; attribute float along; varying float vSide; varying float vAlong;
      void main(){ vSide = side; vAlong = along; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 color; uniform float opacity, head, tail, glow, fade; varying float vSide; varying float vAlong;
      void main(){
        float core = exp(-vSide * vSide * 46.0);
        float halo = exp(-vSide * vSide * 4.0) * 0.32 * glow;
        float a = smoothstep(tail, tail + fade, vAlong) * (1.0 - smoothstep(head - fade, head, vAlong));
        vec3 c = mix(color, vec3(1.0), core * 0.55);
        gl_FragColor = vec4(c * (core * 1.6 + halo) * opacity * a, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.userData.shadow = false;
  mesh.userData.noCut = true;
  mesh.renderOrder = 5;
  space.scene.add(mesh);
  const P = new THREE.Vector3();
  const Pn = new THREE.Vector3();
  const T = new THREE.Vector3();
  const view = new THREE.Vector3();
  const off = new THREE.Vector3();
  const disp = new Float32Array(samples);
  function update(t, camera) {
    mesh.visible = state.opacity > 0.002;
    if (!mesh.visible) return;
    const u = m.uniforms;
    u.opacity.value = state.opacity;
    u.head.value = state.head;
    u.tail.value = state.tail;
    u.glow.value = state.glow;
    u.fade.value = state.fade;
    for (let i = 0; i < samples; i++) disp[i] = value((i / (samples - 1)) * L, t, i / (samples - 1));
    // the width in mm that looks the same on screen at this distance
    for (let i = 0; i < samples; i++) {
      P.copy(pts[i]).addScaledVector(nrm[i], disp[i]);
      const j = Math.min(samples - 1, i + 1);
      const k = Math.max(0, i - 1);
      Pn.copy(pts[j]).addScaledVector(nrm[j], disp[j]);
      T.copy(pts[k]).addScaledVector(nrm[k], disp[k]);
      T.subVectors(Pn, T).normalize();
      view.subVectors(camera.position, P);
      const dist = view.length();
      view.normalize();
      off.crossVectors(T, view).normalize().multiplyScalar(state.width * dist * 0.0021);
      pos[i * 6] = P.x - off.x;
      pos[i * 6 + 1] = P.y - off.y;
      pos[i * 6 + 2] = P.z - off.z;
      pos[i * 6 + 3] = P.x + off.x;
      pos[i * 6 + 4] = P.y + off.y;
      pos[i * 6 + 5] = P.z + off.z;
    }
    g.attributes.position.needsUpdate = true;
  }
  return { state, mesh, update, length: L, curve, material: m };
}

// Sheets of light across the air, one every `step` mm along `dir` from `from`, each a soft disc `size` across;
// pressure(s, t) in -1..1 sets how bright each is (bright = squeezed). Seen edge-on they read as bands.
export function bands(space, { from, dir, length, size = 120, step = 6, color = 0xffb547, pressure = () => 0, aspect = 1 }) {
  const { THREE } = space;
  const n = Math.floor(length / step);
  const geo = new THREE.PlaneGeometry(size * aspect, size);
  const alpha = new Float32Array(n);
  geo.setAttribute("alpha", new THREE.InstancedBufferAttribute(alpha, 1));
  const state = { opacity: 0, head: length, tail: 0 };
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: 0 } },
    vertexShader: `attribute float alpha; varying float vA; varying vec2 vUv;
      void main(){ vA = alpha; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 color; uniform float opacity; varying float vA; varying vec2 vUv;
      void main(){ vec2 q = vUv * 2.0 - 1.0; float r = dot(q, q); float a = exp(-r * 2.6) * (1.0 - smoothstep(0.8, 1.0, r));
        gl_FragColor = vec4(color * a * vA * opacity * 0.22, 1.0); }`,
  });
  const mesh = new THREE.InstancedMesh(geo, m, n);
  mesh.frustumCulled = false;
  mesh.userData.shadow = false;
  mesh.userData.noCut = true;
  mesh.renderOrder = 4;
  const d = dir.clone().normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
  const mat = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    mat.compose(from.clone().addScaledVector(d, i * step), q, new THREE.Vector3(1, 1, 1));
    mesh.setMatrixAt(i, mat);
  }
  space.scene.add(mesh);
  function update(t) {
    mesh.visible = state.opacity > 0.002;
    if (!mesh.visible) return;
    m.uniforms.opacity.value = state.opacity;
    for (let i = 0; i < n; i++) {
      const s = i * step;
      const p = pressure(s, t);
      const edge = Math.min(1, Math.max(0, (state.head - s) / 20)) * Math.min(1, Math.max(0, (s - state.tail) / 20));
      alpha[i] = Math.max(0, p) ** 2 * edge;
    }
    geo.attributes.alpha.needsUpdate = true;
  }
  return { state, mesh, update };
}

// Specks of air in a box: each sits at its rest place plus value(x, t) along the travel direction (+x of the box).
export function air(space, { center, size, count = 2400, color = 0xffd9a0, value = () => 0, seed = 4, dir = null }) {
  const { THREE } = space;
  const r = rng(seed);
  const geo = new THREE.IcosahedronGeometry(0.42, 1);
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const mesh = new THREE.InstancedMesh(geo, m, count);
  mesh.frustumCulled = false;
  mesh.userData.shadow = false;
  mesh.userData.noCut = true;
  const rest = [];
  for (let i = 0; i < count; i++) rest.push([(r() - 0.5) * size.x, (r() - 0.5) * size.y, (r() - 0.5) * size.z, 0.6 + r() * 0.9]);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), (dir ?? new THREE.Vector3(1, 0, 0)).clone().normalize());
  const mat = new THREE.Matrix4();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const state = { opacity: 0 };
  space.scene.add(mesh);
  function update(t) {
    mesh.visible = state.opacity > 0.002;
    if (!mesh.visible) return;
    m.opacity = state.opacity;
    for (let i = 0; i < count; i++) {
      const [x, y, z, s] = rest[i];
      const dx = value(x + size.x / 2, t);
      v.set(x + dx, y, z).applyQuaternion(q).add(center);
      sc.setScalar(s);
      mat.compose(v, new THREE.Quaternion(), sc);
      mesh.setMatrixAt(i, mat);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { state, mesh, update };
}

// A thin bright sphere: the front of a sudden sound, growing from a point.
export function shell(space, { color = 0xffb547 } = {}) {
  const { THREE } = space;
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 color; uniform float opacity; varying vec3 vN; varying vec3 vV;
      void main(){ float f = 1.0 - abs(dot(vN, vV)); float a = pow(f, 5.0) * 1.4 + 0.03; gl_FragColor = vec4(color * a * opacity, 1.0); }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), m);
  mesh.userData.shadow = false;
  mesh.userData.noCut = true;
  mesh.renderOrder = 6;
  const state = { opacity: 0, r: 1 };
  space.scene.add(mesh);
  function update() {
    mesh.visible = state.opacity > 0.002 && state.r > 0.1;
    m.uniforms.opacity.value = state.opacity;
    mesh.scale.setScalar(state.r);
  }
  return { state, mesh, update };
}
