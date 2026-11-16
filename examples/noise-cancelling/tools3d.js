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
