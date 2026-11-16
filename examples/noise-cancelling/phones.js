// A pair of generic over-ear headphones in lit 3D: oval graphite cups with a brushed metal ring, soft dark cushions,
// a small microphone grille on each cup's outside, forked yokes and a padded band. No logo, no real product.
//
//   const phones = createPhones(canvas);
//   phones.render({ x, y, size, turn, tilt, vis, glow, glowColor }, t)   x, y: pixels from the frame's centre
import { createStage3D } from "../../kit/engine/stage3d.js";

export function createPhones(canvas) {
  const space = createStage3D(canvas, { exposure: 1.1, environment: 0.5 });
  const { THREE, scene, materials } = space;
  const group = new THREE.Group();
  scene.add(group);

  const shell = new THREE.MeshPhysicalMaterial({ color: 0x232328, metalness: 0.25, roughness: 0.42, clearcoat: 0.8, clearcoatRoughness: 0.35 });
  const ringMetal = new THREE.MeshPhysicalMaterial({ color: 0xbfc3cb, metalness: 1, roughness: 0.3, clearcoat: 0.4 });
  const leather = new THREE.MeshPhysicalMaterial({ color: 0x18181b, metalness: 0, roughness: 0.62, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x55555f) });
  const grille = new THREE.MeshStandardMaterial({ color: 0x050506, metalness: 0.4, roughness: 0.8 });
  const glowMat = materials.glow(0x3fe0ff, 0);

  // One cup: a rounded oval puck (a lathe turned about its axis, then squashed to an oval), facing +x for the right cup.
  const cupProfile = [];
  const R = 7.2;
  const D = 5.2;
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 0.5;
    cupProfile.push(new THREE.Vector2(R - 1.6 + Math.sin(a) * 1.6, D - 1.6 + Math.cos(a) * 1.6));
  }
  cupProfile.push(new THREE.Vector2(R, 0));
  cupProfile.unshift(new THREE.Vector2(0, D));
  const cupGeo = new THREE.LatheGeometry(cupProfile, 96);
  shell.side = THREE.DoubleSide;
  const ringGeo = new THREE.TorusGeometry(R - 1.05, 0.22, 16, 120);
  const capGeo = new THREE.CircleGeometry(R - 1.25, 96);
  const cushionGeo = new THREE.TorusGeometry(R - 1.3, 1.55, 28, 120);
  const holeGeo = new THREE.CircleGeometry(0.11, 12);
  const glowGeo = new THREE.TorusGeometry(R - 0.2, 0.12, 8, 120);

  const halos = [];
  function cup(side) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(cupGeo, shell);
    body.rotation.z = (-side * Math.PI) / 2; // lathe axis is y; turn it to x
    body.position.x = side * 0.4;
    g.add(body);
    // The outer cap: a darker disc inset in a brushed ring.
    const cap = new THREE.Mesh(capGeo, new THREE.MeshPhysicalMaterial({ color: 0x1d1d22, metalness: 0.35, roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.4 }));
    cap.rotation.y = (side * Math.PI) / 2;
    cap.position.x = side * (D + 0.42);
    g.add(cap);
    const ring = new THREE.Mesh(ringGeo, ringMetal);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = side * (D + 0.4);
    g.add(ring);
    // The microphone: a small grille of holes near the cap's lower front edge.
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const h = new THREE.Mesh(holeGeo, grille);
        h.rotation.y = (side * Math.PI) / 2;
        h.position.set(side * (D + 0.44), -3.9 + r * 0.32, 2.6 + c * 0.32 - 0.32);
        g.add(h);
      }
    }
    const cushion = new THREE.Mesh(cushionGeo, leather);
    cushion.rotation.y = Math.PI / 2;
    cushion.scale.set(1, 1, 0.72);
    cushion.position.x = -side * 0.9;
    g.add(cushion);
    // The speaker cloth inside the cushion: dark fabric, so the cup reads as closed.
    const cloth = new THREE.Mesh(new THREE.CircleGeometry(R - 1.2, 64), new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.95, side: THREE.DoubleSide }));
    cloth.rotation.y = Math.PI / 2;
    cloth.position.x = side * 0.1;
    g.add(cloth);
    const halo = new THREE.Mesh(glowGeo, glowMat);
    halos.push(halo);
    halo.rotation.y = Math.PI / 2;
    halo.position.x = side * (D * 0.5);
    g.add(halo);
    g.scale.set(1, 1.28, 1);
    return g;
  }
  const SPAN = 9.6;
  const left = cup(-1);
  left.position.set(-SPAN, -4, 0);
  const right = cup(1);
  right.position.set(SPAN, -4, 0);
  group.add(left, right);

  // The yokes: a half-ring fork over each cup's top, front to back, meeting the band.
  for (const side of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const a = Math.PI * (i / 40);
      pts.push(new THREE.Vector3(side * SPAN, -4 + Math.sin(a) * 9.9, Math.cos(a) * 7.9));
    }
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.38, 14, false), ringMetal));
  }
  // The band: a brushed outer arc and a padded inner one, from fork top to fork top.
  const arc = (radius, y0) => {
    const pts = [];
    for (let i = 0; i <= 48; i++) {
      const a = Math.PI * (i / 48);
      pts.push(new THREE.Vector3(-Math.cos(a) * radius, y0 + Math.sin(a) * radius * 1.12, 0));
    }
    return new THREE.CatmullRomCurve3(pts);
  };
  group.add(new THREE.Mesh(new THREE.TubeGeometry(arc(SPAN, 5.9), 120, 0.5, 16, false), ringMetal));
  const pad = new THREE.Mesh(new THREE.TubeGeometry(arc(SPAN - 1.1, 5.9), 120, 0.95, 18, false), leather);
  pad.scale.set(1, 1, 1.9);
  group.add(pad);

  // A warm point light that travels with the story (amber noise, cyan answer).
  const tint = new THREE.PointLight(0xffb547, 0, 120, 1.4);
  tint.position.set(-30, 10, 30);
  scene.add(tint);

  return {
    render(P, t) {
      if (!P.vis || P.vis <= 0.001) {
        space.render(0);
        return;
      }
      const k = P.size / (29.6 * space.UNIT); // P.size: the height of the whole pair in pixels
      group.scale.setScalar(k);
      group.position.copy(space.at(P.x, P.y));
      group.rotation.set(P.tilt ?? 0.12, P.turn ?? 0, 0);
      glowMat.emissiveIntensity = (P.glow ?? 0) * 3;
      for (const h of halos) h.visible = (P.glow ?? 0) > 0.01;
      glowMat.color.set(P.glowColor ?? 0x3fe0ff);
      glowMat.emissive.set(P.glowColor ?? 0x3fe0ff);
      tint.color.set(P.tintColor ?? 0xffb547);
      tint.intensity = (P.tint ?? 0) * 2600 * k ** 1.75;
      canvas.style.filter = P.blur > 0.05 ? `blur(${P.blur.toFixed(2)}px)` : "";
      space.render(P.vis);
    },
  };
}
