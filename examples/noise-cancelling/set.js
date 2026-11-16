// The set the models stand in: a graphite cyclorama all round (a sphere seen from inside, lighter toward the
// horizon, with a soft wash of the act's colour where the key light falls), a dark satin floor that fades into it,
// and dust in the air catching the light, far out of focus.
//
//   const set = createSet(space, P);
//   set.state.wash = 0.6; set.state.tint = [1, 0.7, 0.28];     tweened by the film
//   film.each((t) => set.update(t));
import { rng } from "../../kit/engine/parts3d.js";

export function createSet(space, P, { floorY = -120 } = {}) {
  const { THREE, scene } = space;
  const state = { wash: 0.5, r: 1, g: 0.72, b: 0.3, horizon: 1, floor: 1, dust: 1, washAz: 35 };

  const cyc = new THREE.Mesh(
    new THREE.SphereGeometry(5000, 64, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { tint: { value: new THREE.Color(1, 0.72, 0.3) }, wash: { value: 0.5 }, horizon: { value: 1 }, washDir: { value: new THREE.Vector3(0.4, 0.3, 0.8).normalize() } },
      vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `
        uniform vec3 tint; uniform float wash, horizon; uniform vec3 washDir; varying vec3 vDir;
        float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        void main(){
          float y = vDir.y;
          vec3 base = mix(vec3(0.016, 0.017, 0.02), vec3(0.05, 0.052, 0.058), smoothstep(-0.35, 0.05, y));
          base = mix(base, vec3(0.022, 0.023, 0.027), smoothstep(0.05, 0.9, y));
          // the bright band where the floor meets the wall
          base += vec3(0.05, 0.05, 0.056) * horizon * exp(-pow((y + 0.04) * 9.0, 2.0));
          // the act's colour, where the key light falls on the wall
          float w = pow(max(dot(normalize(vDir), washDir), 0.0), 6.0);
          base += tint * wash * (0.16 * w + 0.03 * exp(-pow((y + 0.02) * 6.0, 2.0)));
          // a little grain in the paint, so it is not a digital gradient
          base *= 0.97 + 0.06 * hash(floor(vDir * 900.0));
          gl_FragColor = vec4(base, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  cyc.name = "cyclorama";
  cyc.renderOrder = -10;
  cyc.userData.shadow = false;
  scene.add(cyc);

  // The floor: satin dark grey with a faint brushed grain, receiving the key light's shadows, fading into the wall.
  const grain = P.texture(P.normalFrom(P.noise(256, 64, 13, 2), 0.8), { repeat: 40 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.42, metalness: 0.2, normalMap: grain, normalScale: new THREE.Vector2(0.2, 0.2) });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4200, 96), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = floorY;
  floor.receiveShadow = true;
  floor.userData.castShadow = false;
  floor.name = "floor";
  scene.add(floor);
  scene.fog = new THREE.Fog(0x0c0d10, 700, 4200);

  // Dust: specks scattered far round the subject, lit, out of focus in close shots.
  const r = rng(91);
  const N = 420;
  const dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, fog: false }), N);
  const m = new THREE.Matrix4();
  const seeds = [];
  for (let i = 0; i < N; i++) {
    const a = r() * Math.PI * 2;
    const rad = 260 + r() * 1300;
    const y = -60 + r() * 520;
    seeds.push([Math.cos(a) * rad, y, Math.sin(a) * rad, 0.5 + r() * 1.6, r() * 6.28]);
  }
  dust.name = "dust";
  dust.userData.shadow = false;
  dust.castShadow = false;
  scene.add(dust);

  function update(t) {
    const u = cyc.material.uniforms;
    u.tint.value.setRGB(state.r, state.g, state.b);
    u.wash.value = state.wash;
    u.horizon.value = state.horizon;
    const a = THREE.MathUtils.degToRad(state.washAz);
    u.washDir.value.set(Math.sin(a), 0.25, Math.cos(a)).normalize();
    floor.visible = state.floor > 0.01;
    dust.visible = state.dust > 0.01;
    dust.material.opacity = 0.45 * state.dust;
    dust.material.color.setRGB(0.6 + 0.4 * state.r, 0.6 + 0.4 * state.g, 0.6 + 0.4 * state.b);
    for (let i = 0; i < N; i++) {
      const [x, y, z, s, ph] = seeds[i];
      m.makeScale(s, s, s);
      m.setPosition(x + Math.sin(t * 0.13 + ph) * 12, y + Math.sin(t * 0.21 + ph * 1.7) * 9, z + Math.cos(t * 0.11 + ph) * 12);
      dust.setMatrixAt(i, m);
    }
    dust.instanceMatrix.needsUpdate = true;
  }
  return { state, cyc, floor, dust, update };
}
