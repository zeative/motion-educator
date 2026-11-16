// Array-safe versions (and a flag for thin sheets) of stage3d.js's cutaway: the kit's clones `o.material`, which fails on a mesh with a list of
// materials (the kit's own P.pcb has one). Same look: cut faces solid in each material's userData.cut, faintly hatched.
export function cutaway(space, group, plane) {
  const { THREE } = space;
  plane ??= new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e5);
  const prep = (m0) => {
    const m = m0.clone();
    m.clippingPlanes = [...(m0.clippingPlanes ?? []), plane];
    m.clipShadows = true; // what is cut away casts no shadow into the cut
    const thin = m.userData.thin; // a sheet (fabric, a cone, a lining): clipped, but its back is not a section
    if (!thin) m.side = THREE.DoubleSide;
    const cut = new THREE.Color(m.userData.cut ?? m.color ?? 0x888888);
    if (thin) {
      m.customProgramCacheKey = () => `thin-${m.clippingPlanes.length}`;
      return m;
    }
    m.onBeforeCompile = (shader) => {
      shader.uniforms.cutColor = { value: cut };
      shader.fragmentShader = shader.fragmentShader
        .replace("void main() {", "uniform vec3 cutColor;\nvoid main() {")
        .replace("#include <dithering_fragment>", "#include <dithering_fragment>\n if (!gl_FrontFacing) { float hatch = step(0.82, fract((gl_FragCoord.x + gl_FragCoord.y) / 16.0)); gl_FragColor = vec4(cutColor * (0.8 + 0.12 * hatch), 1.0); }");
    };
    m.customProgramCacheKey = () => `cut-${cut.getHexString()}-${m.clippingPlanes.length}`;
    return m;
  };
  group.traverse((o) => {
    if (!o.isMesh || o.userData.noCut) return;
    o.material = Array.isArray(o.material) ? o.material.map(prep) : prep(o.material);
  });
  return plane;
}

// FXAA instead of multisampling (which costs more than the rest of a frame in software GL): every draw the kit
// makes to the screen goes into a half-float target instead, and one full-screen pass tone-maps it, smooths its
// edges and writes it out. Call once, after createStage3D on a canvas whose context was made without antialias.
export function fxaa(space) {
  const { THREE, renderer, W, H } = space;
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: true });
  const mat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: rt.texture }, px: { value: new THREE.Vector2(1 / W, 1 / H) }, exposure: { value: renderer.toneMappingExposure } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `
      uniform sampler2D tex; uniform vec2 px; uniform float exposure; varying vec2 vUv;
      vec3 aces(vec3 c){ c *= exposure / 0.6;
        const mat3 A = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
        const mat3 B = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
        c = A * c; vec3 a = c * (c + 0.0245786) - 0.000090537; vec3 b = c * (0.983729 * c + 0.4329510) + 0.238081; c = B * (a / b);
        return clamp(c, 0.0, 1.0); }
      vec4 S(vec2 uv){ vec4 c = texture2D(tex, uv); return vec4(aces(c.rgb), c.a); }
      float L(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
      void main(){
        vec4 m = S(vUv);
        vec3 nw = S(vUv + vec2(-1.0, -1.0) * px).rgb, ne = S(vUv + vec2(1.0, -1.0) * px).rgb;
        vec3 sw = S(vUv + vec2(-1.0, 1.0) * px).rgb, se = S(vUv + vec2(1.0, 1.0) * px).rgb;
        float lM = L(m.rgb), lNW = L(nw), lNE = L(ne), lSW = L(sw), lSE = L(se);
        float lo = min(lM, min(min(lNW, lNE), min(lSW, lSE))), hi = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
        vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
        float red = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
        dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + red), -8.0, 8.0) * px;
        vec4 a = 0.5 * (S(vUv + dir * (1.0 / 3.0 - 0.5)) + S(vUv + dir * (2.0 / 3.0 - 0.5)));
        vec4 b = a * 0.5 + 0.25 * (S(vUv - dir * 0.5) + S(vUv + dir * 0.5));
        float lB = L(b.rgb);
        vec4 c = (lB < lo || lB > hi) ? a : b;
        gl_FragColor = vec4(pow(c.rgb, vec3(1.0 / 2.2)), m.a);
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const post = new THREE.Scene();
  post.add(quad);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const draw = renderer.render.bind(renderer);
  let busy = false;
  renderer.render = (scene, camera) => {
    if (busy || renderer.getRenderTarget() !== null) return draw(scene, camera);
    renderer.setRenderTarget(rt);
    draw(scene, camera);
    renderer.setRenderTarget(null);
    busy = true;
    mat.uniforms.exposure.value = renderer.toneMappingExposure;
    renderer.clear();
    draw(post, ortho);
    busy = false;
  };
  return rt;
}
