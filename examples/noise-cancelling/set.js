// The set: a dim room at night. A walnut desk (P.desk) with a keyboard and a mug, a far wall, warm lamps all round
// that read as out-of-focus discs at any angle (soft sprites, so they need no depth-of-field pass), dust in the air,
// and a warm dark sweep behind everything. The desk is for the headphone on its own; the head shots keep the room.
//
//   const set = createSet(space, P);
//   set.state: wash (the wall's glow), r g b (its colour), desk (0/1), dust (0..1), lamps (0..1)
//   film.each((t) => set.update(t, camera));
import { rng } from "../../kit/engine/parts3d.js";

export function createSet(space, P, { deskY = -42 } = {}) {
  const { THREE, scene } = space;
  const state = { wash: 0.6, r: 1, g: 0.62, b: 0.3, desk: 1, dust: 1, lamps: 1, sweep: 1 };

  // The sweep: a sphere seen from inside, warm and dark, lighter toward the horizon.
  const sweep = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { tint: { value: new THREE.Color(1, 0.62, 0.3) }, wash: { value: 0.6 } },
      vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `
        uniform vec3 tint; uniform float wash; varying vec3 vDir;
        float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        void main(){
          float y = vDir.y;
          vec3 base = mix(vec3(0.012, 0.009, 0.008), vec3(0.05, 0.034, 0.024), smoothstep(-0.45, 0.02, y));
          base = mix(base, vec3(0.016, 0.012, 0.011), smoothstep(0.05, 0.85, y));
          base += tint * wash * 0.07 * exp(-pow((y - 0.05) * 3.2, 2.0)) * (0.6 + 0.4 * sin(atan(vDir.z, vDir.x) * 3.0 + 1.0));
          base *= 0.97 + 0.06 * hash(floor(vDir * 900.0));
          gl_FragColor = vec4(base, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  sweep.name = "sweep";
  sweep.renderOrder = -10;
  sweep.frustumCulled = false;
  sweep.userData.shadow = false;
  sweep.userData.noCut = true;
  scene.add(sweep);

  // The desk, from the kit: walnut top, far wall, a few warm lamps behind.
  const desk = P.desk({ w: 1100, d: 620, y: deskY, color: 0x4a2a1a, lights: 0 });
  desk.traverse((o) => (o.userData.noCut = true));
  scene.add(desk);
  // A keyboard on the desk: an aluminium plate and keys in rows, each a soft-cornered cap.
  const keyboard = new THREE.Group();
  keyboard.name = "keyboard";
  const plate = P.mesh(P.roundedBox(290, 9, 110, 3), P.M.metal(0x9a9da3, { rough: 0.32 }), "keyboard plate");
  plate.position.y = 4.5;
  keyboard.add(plate);
  const capMat = P.M.plastic(0x1c1d20, { rough: 0.55 });
  const capGeo = P.roundedBox(16.5, 5, 16.5, 2.2, 2);
  const rows = [14, 14, 13, 12, 11];
  rows.forEach((n, r) => {
    for (let i = 0; i < n; i++) {
      const cap = new THREE.Mesh(capGeo, capMat);
      const pitch = 19;
      cap.position.set(-((n - 1) * pitch) / 2 + i * pitch + r * 2.5, 11, -40 + r * 19.5);
      if (r === 4 && i === 5) cap.scale.x = 5.6;
      keyboard.add(cap);
    }
  });
  keyboard.position.set(-60, deskY, 210);
  keyboard.rotation.y = 0.32;
  keyboard.userData.noCut = true;
  scene.add(keyboard);
  // A mug.
  const mug = new THREE.Group();
  mug.name = "mug";
  const mugBody = P.mesh(P.lathe(P.smoothProfile([[0, 0], [38, 0], [40, 4], [41, 92], [37.5, 92], [36.5, 8], [0, 8]], 1.6)), space.materials.ceramic(0xe9e4da), "mug body");
  const handle = P.mesh(new THREE.TorusGeometry(19, 5.5, 18, 48, Math.PI * 1.25), space.materials.ceramic(0xe9e4da), "mug handle");
  handle.rotation.z = -Math.PI * 0.62;
  handle.position.set(42, 48, 0);
  mug.add(mugBody, handle);
  mug.position.set(-230, deskY, -160);
  scene.add(mug);

  // Lamps all round, far off: soft warm discs with a brighter rim, the look of a lens wide open.
  const disc = (() => {
    const c = P.canvasOf(128);
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 62);
    g.addColorStop(0, "rgba(255,255,255,0.55)");
    g.addColorStop(0.78, "rgba(255,255,255,0.7)");
    g.addColorStop(0.9, "rgba(255,255,255,0.95)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return P.texture(c, { color: true });
  })();
  const lamps = new THREE.Group();
  lamps.name = "lamps";
  const r = rng(52);
  const warm = [0xffa24a, 0xffb866, 0xff8a3a, 0xffd29a];
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2;
    const rad = 1700 + r() * 1500;
    const m = new THREE.SpriteMaterial({ map: disc, color: new THREE.Color(warm[i % 4]).multiplyScalar(0.6 + r() * 1.1), transparent: true, opacity: 0.55 + r() * 0.4, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false });
    const s = new THREE.Sprite(m);
    s.position.set(Math.cos(a) * rad, -80 + r() * 700, Math.sin(a) * rad);
    s.scale.setScalar(70 + r() * 190);
    s.userData.shadow = false;
    s.userData.noCut = true;
    lamps.add(s);
  }
  scene.add(lamps);

  // Dust, catching the light round the subject.
  const motes = P.dust({ count: 700, size: 2.4, color: 0xffc27a, opacity: 0.55, box: [900, 500, 900] });
  motes.userData.noCut = true;
  scene.add(motes);
  scene.fog = new THREE.Fog(0x0b0806, 900, 5200);

  function update(t, camera) {
    const u = sweep.material.uniforms;
    u.tint.value.setRGB(state.r, state.g, state.b);
    u.wash.value = state.wash;
    sweep.position.copy(camera.position);
    sweep.scale.setScalar(camera.far * 0.9);
    desk.visible = keyboard.visible = mug.visible = state.desk > 0.5;
    lamps.visible = state.lamps > 0.01;
    for (const s of lamps.children) s.material.opacity = s.userData.o ??= s.material.opacity;
    lamps.children.forEach((s) => (s.material.opacity = s.userData.o * state.lamps));
    motes.visible = state.dust > 0.01;
    motes.material.opacity = 0.55 * state.dust;
    if (motes.visible) motes.update(t);
  }
  return { state, sweep, desk, keyboard, mug, lamps, motes, update };
}
