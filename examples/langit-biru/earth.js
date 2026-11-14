// The Earth as the film's hero object. Its surface, its night lights and its water are NASA's maps (assets/, see
// assets/SOURCES.md); the clouds, the Sun's glint and the air are computed in the shader. The Sun is to the left.
// Drawn from plain state.
import { createStage3D } from "../../kit/engine/stage3d.js";

const NOISE = `
float hash(vec3 p){ p = fract(p * vec3(443.897, 441.423, 437.195)); p += dot(p, p.yzx + 19.19); return fract((p.x + p.y) * p.z); }
float noise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = .5, s = 0.; for(int i = 0; i < 6; i++){ s += a * noise(p); p = p * 2.02 + vec3(7.1, 3.3, 5.7); a *= .5; } return s; }
`;

export async function createEarth(canvas) {
  const space = createStage3D(canvas, { environment: 0 });
  const { THREE } = space;
  // The globe lights itself in its shader, so the stage's studio lights are not needed.
  space.scene.remove(space.key, space.rim);
  const R = 10;
  const sun = new THREE.Vector3(-1, 0.28, 0.42).normalize();
  // The maps are loaded before the film is ready, so no frame is ever drawn without them.
  const loader = new THREE.TextureLoader();
  const map = async (file) => {
    const texture = await loader.loadAsync(new URL(`assets/${file}`, import.meta.url).href);
    texture.anisotropy = 8;
    texture.wrapS = THREE.RepeatWrapping;
    return texture;
  };
  const [day, night, water] = await Promise.all([map("earth-day.jpg"), map("earth-night.jpg"), map("earth-water.jpg")]);
  const uniforms = { uSun: { value: sun }, uTime: { value: 0 }, uAir: { value: 1 }, uDay: { value: day }, uNight: { value: night }, uWater: { value: water } };

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(R, 160, 120),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec3 vObj; varying vec3 vNormal; varying vec3 vView; varying vec2 vUv;
        void main(){ vObj = normalize(position); vUv = uv; vec4 world = modelMatrix * vec4(position, 1.);
          vNormal = normalize(mat3(modelMatrix) * normal); vView = normalize(cameraPosition - world.xyz);
          gl_Position = projectionMatrix * viewMatrix * world; }`,
      fragmentShader: `
        precision highp float;
        uniform vec3 uSun; uniform float uTime; uniform float uAir;
        uniform sampler2D uDay; uniform sampler2D uNight; uniform sampler2D uWater;
        varying vec3 vObj; varying vec3 vNormal; varying vec3 vView; varying vec2 vUv;
        ${NOISE}
        void main(){
          vec3 n = normalize(vNormal);
          vec3 surface = texture2D(uDay, vUv).rgb;
          // The map is a little flat and green; deepen the sea and lift the land so it holds up under the key light.
          float sea = texture2D(uWater, vUv).r;
          surface = mix(surface * vec3(1.12, 1.08, .98), surface * vec3(.62, .84, 1.22) + vec3(0., .012, .05), sea);
          float cloud = smoothstep(.5, .76, fbm(vObj * 2.6 + vec3(uTime * .016, 0., uTime * .009)) + .14 * fbm(vObj * 9.));
          cloud *= .85;

          float ndl = dot(n, uSun);
          float day = smoothstep(-.14, .3, ndl);
          vec3 lit = surface * (.05 + 1.45 * max(ndl, 0.));
          // The Sun glinting off open water.
          vec3 h = normalize(uSun + vView);
          lit += vec3(1., .93, .8) * pow(max(dot(n, h), 0.), 70.) * sea * (1. - cloud) * .9 * day;
          lit = mix(lit, vec3(1.) * (.1 + .95 * max(ndl, 0.)), cloud * .8);
          // Cities on the night side.
          vec3 towns = texture2D(uNight, vUv).rgb;
          lit += vec3(1., .78, .5) * towns * towns * (1. - day) * (1. - cloud * .7) * 2.2;
          // The air seen edge on: blue over the day side, warm where day meets night.
          float rim = pow(1. - max(dot(n, vView), 0.), 2.6);
          vec3 air = mix(vec3(1., .46, .2), vec3(.3, .62, 1.), smoothstep(-.05, .38, ndl));
          lit += air * rim * (.2 + .85 * smoothstep(-.3, .25, ndl)) * uAir;
          lit = mix(lit, lit * vec3(.82, .9, 1.06) + vec3(.01, .03, .07) * day, .5 * uAir);
          gl_FragColor = vec4(lit, 1.);
        }`,
    }),
  );
  // The air as a shell around the globe, brightest at the edge, lit only where the Sun reaches it.
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(R, 96, 72),
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vNormal; varying vec3 vView;
        void main(){ vec4 world = modelMatrix * vec4(position, 1.); vNormal = normalize(mat3(modelMatrix) * normal);
          vView = normalize(cameraPosition - world.xyz); gl_Position = projectionMatrix * viewMatrix * world; }`,
      fragmentShader: `
        precision highp float;
        uniform vec3 uSun; uniform float uAir; varying vec3 vNormal; varying vec3 vView;
        void main(){
          vec3 n = normalize(vNormal);
          float glow = pow(clamp(1. + dot(n, vView), 0., 1.), 4.2);
          float ndl = dot(n, uSun);
          vec3 air = mix(vec3(1., .42, .16), vec3(.28, .6, 1.), smoothstep(-.1, .4, ndl));
          float reach = smoothstep(-.42, .3, ndl);
          gl_FragColor = vec4(air * glow * reach * 1.5 * uAir, 1.);
        }`,
    }),
  );
  const group = new THREE.Group();
  group.add(globe, shell);
  space.scene.add(group);

  return {
    space,
    R,
    // state: vis, x and y (pixels from the frame's centre), size (the globe's diameter in pixels), turn (its rotation),
    // tilt, air (how strong the atmosphere reads), thick (the air shell's size against the globe: 1.035 is honest,
    // more exaggerates it for a diagram).
    render(s, t) {
      if (s.vis > 0.001) {
        const scale = s.size / (2 * R * space.UNIT);
        group.position.copy(space.at(s.x, s.y));
        group.scale.setScalar(scale);
        globe.rotation.set(s.tilt, s.turn, 0);
        shell.scale.setScalar(s.thick);
        uniforms.uTime.value = t;
        uniforms.uAir.value = s.air;
      }
      space.render(s.vis);
    },
  };
}
