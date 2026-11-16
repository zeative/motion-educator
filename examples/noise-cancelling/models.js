// The film's two hero models, 1 unit = 1 mm, built from kit/engine/parts3d.js pieces and three.js shapes.
//
//   const M = createModels(space, P);
//   M.phones      the whole headphone (band, sliders, yokes, two cups), placed as worn on the head below
//   M.cup         the right ear cup, every part a named child (explodable along the cup's own axis)
//   M.head        the side of a head: skin, hair, the pinna, the ear canal and the eardrum
//   M.anchor      where things are: canal entrance, eardrum, cup centre, driver face, mics (world points)
//
// References (see storyboard.json "models"): teardowns of 40 mm over-ear ANC headphones (feed-forward mic behind a
// grille on the outside of the cup, feedback MEMS mic in front of the driver, driver held to a sub-baffle by four
// screws, board and battery behind the baffle); textbook ear anatomy (pinna about 62 mm tall and 34 mm wide, ear canal
// about 25 mm long and 7 mm across, an oval eardrum about 9 mm across, set at a slant).
//
// World axes: +x out of the right side of the head, +y up, +z toward the face. The cup's own axes: +z out of the head,
// +x toward the back of the head, +y up.
import { rng } from "../../kit/engine/parts3d.js";

export function createModels(space, P) {
  const { THREE } = space;
  const { M } = P;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const named = (o, name) => ((o.name = name), o);
  // P.extrude mirrors y with a negative scale, which turns its triangles inside out (kit bug): turn them back.
  const extrude = (...a) => {
    const g = P.extrude(...a);
    for (const name of Object.keys(g.attributes)) {
      const at = g.attributes[name];
      const k = at.itemSize;
      for (let t = 0; t < at.count; t += 3)
        for (let c = 0; c < k; c++) {
          const i1 = (t + 1) * k + c;
          const i2 = (t + 2) * k + c;
          [at.array[i1], at.array[i2]] = [at.array[i2], at.array[i1]];
        }
    }
    g.computeVertexNormals();
    return g;
  };
  const smooth = (e0, e1, x) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };

  // ── materials, tuned for this film ──────────────────────────────────────────────────────────────────────
  const mat = {
    shell: M.plastic(0x24262b, { rough: 0.5, gloss: 0.35 }),
    shellIn: M.plastic(0x191a1e, { rough: 0.7 }),
    trim: M.metal(0xb9bec6, { rough: 0.26 }),
    gun: M.metal(0x6b7079, { rough: 0.34 }),
    yoke: M.metal(0x8f949c, { rough: 0.3 }),
    leather: M.leather(0x1e1f23),
    foam: M.foam(0x55565c),
    fabric: M.fabric(0x5d616c),
    baffle: M.plastic(0x15161a, { rough: 0.6 }),
    battery: M.metal(0xc9ccd1, { rough: 0.42, brushed: false }),
    flex: M.copper(0xc8841e),
    rubber: M.rubber(0x141416),
  };
  mat.flex.roughness = 0.45;
  mat.flex.metalness = 0.35;
  mat.shell.userData.cut = 0x3a3c42;
  mat.leather.userData.cut = 0x2c2d32;
  mat.foam.userData.cut = 0x8a8b8f;
  mat.baffle.userData.cut = 0x34363c;

  // The bust: matte clay, the way headphones are shown in product photography (no skin tone, no hair), with a fine
  // cast-clay grain. Its cut section is a paler clay, hatched.
  const grain = P.texture(P.normalFrom(P.noise(512, 90, 77, 2), 1.2), { repeat: 5 });
  const skinMat = (color = 0x8e8b86) => {
    const m = M.plastic(color, { rough: 0.82 });
    m.normalMap = grain;
    m.normalScale = new THREE.Vector2(0.18, 0.18);
    m.userData.cut = 0xc9c5bd;
    return m;
  };

  // ── an oval ring swept around the cup's axis (cushions, trims) ───────────────────────────────────────
  // center(θ) on an oval of half-sizes ax, ay; a cross-section prof(j) = [n, z] (n outward from the path).
  function ovalSweep({ ax, ay, section, segments = 128, uvRepeat = 8, pleat = null }) {
    const ring = section.length;
    const pos = [];
    const uv = [];
    const idx = [];
    for (let i = 0; i <= segments; i++) {
      const th = (i / segments) * Math.PI * 2;
      const c = V(ax * Math.cos(th), ay * Math.sin(th), 0);
      const n = V(Math.cos(th) / ax, Math.sin(th) / ay, 0).normalize();
      for (let j = 0; j < ring; j++) {
        let [rn, z] = section[j];
        if (pleat) rn += pleat(th, j / (ring - 1), rn, z);
        pos.push(c.x + n.x * rn, c.y + n.y * rn, z);
        uv.push((i / segments) * uvRepeat, j / (ring - 1));
      }
    }
    for (let i = 0; i < segments; i++)
      for (let j = 0; j < ring - 1; j++) {
        const a = i * ring + j;
        const b = (i + 1) * ring + j;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  // A rounded, pillowy closed cross-section: half-width w (in n), height h (in z), from z0.
  function pillow(w, h, z0 = 0, { steps = 32, bulge = 0.35, flat = 0.25 } = {}) {
    const out = [];
    for (let k = 0; k <= steps; k++) {
      const a = (k / steps) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const n = Math.sign(c) * Math.abs(c) ** bulge * w;
      // the face against the head (low z) is flatter than the face against the baffle
      const zz = Math.sign(s) * Math.abs(s) ** (s < 0 ? flat : bulge) * (h / 2) + h / 2 + z0;
      out.push([n, zz]);
    }
    return out;
  }
  // A lathe about the cup's z axis, squashed to the cup's oval.
  const OVAL = 38 / 47;
  function ovalLathe(profile, segments = 128) {
    const g = P.lathe(profile, segments);
    g.rotateX(Math.PI / 2);
    g.scale(OVAL, 1, 1);
    g.computeVertexNormals();
    return g;
  }

  // ── the right ear cup ────────────────────────────────────────────────────────────────────────────────────
  // Along its axis (z, out of the head): cushion 0..22, cushion ring 21..23, baffle 20..23, shell 22..52.
  const cup = new THREE.Group();
  cup.name = "ear cup";

  // Shell: a dished oval, 76 x 94 mm, 30 mm deep, 2 mm wall.
  const shellProfile = P.smoothProfile(
    [[0, 50], [30, 49.4], [42, 46.5], [45, 40], [45, 24.5], [46.9, 22.6], [47, 22], [47, 23.2], [47.2, 36], [45.4, 46.8], [40, 50.6], [30, 51.9], [0, 52.4]],
    1.4,
  );
  const shellOuter = P.mesh(ovalLathe(shellProfile), mat.shell, "shell");
  // Back panel: a slightly recessed oval with a fine matte grain (the touch surface), framed by a brushed trim.
  const panel = P.mesh(ovalLathe(P.smoothProfile([[0, 52.6], [30, 52.1], [36.2, 51.3], [36.4, 50.6]], 0.6)), M.plastic(0x1d1e22, { rough: 0.62 }), "back panel");
  const trim = P.mesh(new THREE.TorusGeometry(38.2, 1.05, 18, 160), mat.trim, "trim ring");
  trim.scale.set(OVAL, 1, 0.7);
  trim.position.z = 50.4;
  const seam = P.mesh(new THREE.TorusGeometry(47.05, 0.32, 8, 180), M.plastic(0x050506, { rough: 0.9 }), "parting line");
  seam.scale.set(OVAL, 1, 1);
  seam.position.z = 30.5;
  // Feed-forward mic: a small oval grille in the back panel, near the top front edge, with the mic behind it.
  const ffGrille = P.grille({ r: 3.4, t: 0.5, hole: 0.16, name: "ff grille", color: 0x8d929a });
  ffGrille.rotation.x = Math.PI / 2;
  ffGrille.position.set(-20.5, 31, 51.55);
  ffGrille.scale.set(1.2, 1, 0.75);
  // the holes about 0.6 mm across, with dark acoustic mesh behind them
  ffGrille.traverse((o) => {
    if (!o.isMesh) return;
    o.material.alphaMap.repeat.set(0.5, 0.5);
    o.material.color.set(0xa9aeb6);
    o.material.roughness = 0.28;
  });
  const ffBacking = P.mesh(new THREE.CircleGeometry(3.4, 48), M.fabric(0x0c0c0e), "ff mesh");
  ffBacking.scale.set(1.2, 0.75, 1);
  ffBacking.position.set(-20.5, 31, 51.35);
  const ffBezel = P.mesh(new THREE.TorusGeometry(3.7, 0.45, 12, 48), mat.trim, "ff bezel");
  ffBezel.scale.set(1.2 * 1.06, 0.78, 1);
  ffBezel.position.set(-20.5, 31, 51.6);
  const ffMic = P.mic({ w: 3.5, d: 2.65, h: 1, name: "feed-forward mic" });
  ffMic.rotation.x = Math.PI / 2; // port faces +z, out through the grille
  ffMic.position.set(-20.5, 31, 48.2);
  const ffMount = P.mesh(P.roundedBox(7, 6, 1.2, 0.4), mat.flex, "ff flex");
  ffMount.position.set(-20.5, 31, 47.8);
  // Buttons and the charging port on the lower edge.
  const buttons = new THREE.Group();
  buttons.name = "buttons";
  for (const [k, ang] of [[0, -1.95], [1, -2.2]]) {
    const b = P.mesh(P.roundedBox(7, 2.4, 3.4, 1.1), mat.rubber, "button");
    const r = 47.3;
    b.position.set(Math.cos(ang) * r * OVAL, Math.sin(ang) * r, 33);
    b.rotation.z = ang + Math.PI / 2;
    buttons.add(b);
  }
  const usb = P.usbC({ name: "usb-c" });
  usb.scale.setScalar(0.85);
  usb.rotation.set(Math.PI / 2, 0, 0);
  usb.position.set(8, -46.4, 33);
  const led = P.mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.4, 20), M.glow(0x3fe0ff, 1.4), "status light");
  led.rotation.x = 0;
  led.position.set(-13, -46.2, 33);
  panel.material.side = THREE.DoubleSide;
  panel.material.userData.thin = true;
  const shell = new THREE.Group();
  shell.name = "shell group";
  shell.add(shellOuter, panel, trim, seam, ffGrille, ffBacking, ffBezel, buttons, usb, led);
  // the inner wall, so a cut shows a hollow shell
  const shellIn = P.mesh(ovalLathe([[45, 24], [44.6, 40], [42, 46], [30, 48.9], [0, 49.6]]), mat.shellIn, "shell inside");
  shellIn.material.side = THREE.BackSide;
  shell.add(shellIn);
  shellIn.material.userData.thin = true;

  // Baffle: the plate the driver is screwed to, with its hole and four screws.
  const ovalPath = (rx, ry, cx = 0, cy = 0, ccw = true) => {
    const n = 64;
    let d = "";
    for (let i = 0; i <= n; i++) {
      const a = ((ccw ? i : -i) / n) * Math.PI * 2;
      d += `${i ? "L" : "M"}${(cx + rx * Math.cos(a)).toFixed(2)} ${(-(cy + ry * Math.sin(a))).toFixed(2)} `;
    }
    return d + "Z ";
  };
  const baffleGeo = extrude(ovalPath(44.6 * OVAL, 44.6) + ovalPath(20.6, 20.6, 0, 2, false), 2.2, { bevel: 0.5, curveSegments: 48 });
  const baffle = P.mesh(baffleGeo, mat.baffle, "baffle");
  baffle.position.z = 20.3;
  const screws = new THREE.Group();
  screws.name = "screws";
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const s = P.screw({ r: 0.75, length: 4 });
    s.rotation.x = -Math.PI / 2; // head toward the ear
    s.position.set(Math.cos(a) * 24.5, 2 + Math.sin(a) * 24.5, 20.1);
    screws.add(s);
  }
  // Cushion mounting ring.
  const ringGeo = ovalSweep({ ax: 30, ay: 40, section: pillow(9.5, 2.2, 21.2, { bulge: 0.2, flat: 0.2 }) });
  const cushionRing = P.mesh(ringGeo, M.plastic(0x101114, { rough: 0.55 }), "cushion ring");

  // Driver: the kit's dynamic driver, 40 mm across, scaled to a headphone driver's depth, facing the ear (-z).
  const drv = P.driver({ r: 19.6, name: "driver", coneColor: 0x2a2b31 });
  const driver = new THREE.Group();
  driver.name = "driver (placed)";
  drv.scale.set(1, 0.55, 1);
  drv.rotation.x = -Math.PI / 2;
  driver.add(drv);
  driver.position.set(0, 2, 20.3 + 0.55 * 19.6 * 1.05 + 0.2);
  // The cone in the driver, for the push: tween drv.userData.push (mm along the axis, toward the ear).
  const cone = drv.getObjectByName("cone");
  const dust = drv.getObjectByName("dust cap");
  const surround = drv.getObjectByName("surround");
  const coil = drv.getObjectByName("voice coil");
  const winding = drv.getObjectByName("winding");
  for (const n of ["cone", "spider", "dust cap", "voice coil", "winding"]) drv.getObjectByName(n).material.userData.thin = true;
  ffGrille.traverse((o) => o.isMesh && (o.material.userData.thin = true));
  const coneBase = { cone: cone.position.y, dust: dust.position.y, coil: coil.position.y, winding: winding.position.y };

  // Feedback mic: in front of the driver, on a small bracket over the cone's edge, its port facing the ear.
  const fbMic = new THREE.Group();
  fbMic.name = "feedback mic";
  const fbBody = P.mic({ w: 3.5, d: 2.65, h: 1, name: "feedback mic body" });
  fbBody.rotation.x = -Math.PI / 2;
  const fbBracket = P.mesh(P.roundedBox(8, 4.2, 1.2, 0.4), M.plastic(0x202126, { rough: 0.5 }), "mic bracket");
  fbBracket.position.z = 0.7;
  const fbFlex = P.mesh(P.tube([[-2.5, -1.5, 0.8], [-8, -6, 1.5], [-12, -10, 2.4], [-14, -13, 2.6]], 0.55), mat.flex, "mic flex");
  fbFlex.scale.set(1, 1, 0.35);
  fbMic.add(fbBracket, fbBody, fbFlex);
  fbMic.position.set(-11, -11, 18.6);

  // Fabric baffle cover across the cushion's opening.
  const fabricGeo = new THREE.CircleGeometry(1, 96);
  const fabric = P.mesh(fabricGeo, mat.fabric, "fabric cover");
  fabric.material.side = THREE.DoubleSide;
  fabric.scale.set(23, 34, 1);
  fabric.position.z = 19.2;
  fabric.material.map = null;
  fabric.material.userData.thin = true;

  // Cushion: memory foam in a protein-leather cover, the cover pleated on its inner wall.
  const pleat = (th, u, rn) => (rn < 0 ? 0.35 * Math.sin(th * 70) * Math.max(0, -rn / 8) : 0);
  const cushion = new THREE.Group();
  cushion.name = "cushion";
  const cover = P.mesh(ovalSweep({ ax: 30, ay: 40.5, section: pillow(8.4, 21, 0, { bulge: 0.42, flat: 0.3 }), uvRepeat: 14, pleat }), mat.leather, "leather cover");
  const foam = P.mesh(ovalSweep({ ax: 30, ay: 40.5, section: pillow(7.3, 18.6, 1.2, { bulge: 0.4, flat: 0.3 }), uvRepeat: 10 }), mat.foam, "memory foam");
  const piping = P.mesh(ovalSweep({ ax: 30, ay: 40.5, section: pillow(0.55, 1.1, 20.3, { bulge: 1 }).map(([n, z]) => [n + 8.0, z]) }), M.leather(0x141518), "seam");
  cushion.add(foam, cover, piping);

  // Board: behind the driver, components facing the back of the cup.
  const board = new THREE.Group();
  board.name = "main board (placed)";
  const pcb = P.pcb({ w: 34, d: 20, t: 1, seed: 9, traces: 70, holes: false, name: "main board" });
  const anc = P.ic({ w: 5, d: 5, h: 0.8, pins: "qfn", count: 32, text: "ANC", sub: "DSP", name: "anc chip" });
  P.at(anc, -6.5, pcb.userData.top, 1.5);
  pcb.add(anc);
  const bt = P.shield({ w: 9, d: 8, h: 1.6, name: "radio shield" });
  P.at(bt, 8.5, pcb.userData.top, -2.5);
  pcb.add(bt);
  const r = rng(31);
  for (let i = 0; i < 26; i++) {
    const kind = r() < 0.5 ? "resistor" : "capacitor";
    const part = P.smd({ kind, l: 1.0, w: 0.5, h: 0.35 });
    let x;
    let z;
    do {
      x = (r() - 0.5) * 30;
      z = (r() - 0.5) * 17;
    } while ((Math.abs(x + 6.5) < 4.2 && Math.abs(z - 1.5) < 4.2) || (Math.abs(x - 8.5) < 5.6 && Math.abs(z + 2.5) < 5.2));
    P.at(part, x, pcb.userData.top, z, r() < 0.5 ? 0 : Math.PI / 2);
    pcb.add(part);
  }
  const crystal = P.mesh(P.roundedBox(3.2, 0.8, 2.5, 0.3), M.metal(0xd3d6db, { rough: 0.2, brushed: false }), "crystal");
  crystal.position.set(-1, pcb.userData.top + 0.4, -6);
  pcb.add(crystal);
  const conn = P.mesh(P.roundedBox(8, 1.2, 3, 0.3), M.plastic(0xe8e2d0, { rough: 0.5 }), "flex connector");
  conn.position.set(-12, pcb.userData.top + 0.6, -7);
  pcb.add(conn);
  pcb.rotation.x = Math.PI / 2; // board top faces +z (the back of the cup)
  board.add(pcb);
  board.position.set(0, 4, 35.2);

  // Battery: a lithium-polymer pouch with its protection board and leads.
  const battery = new THREE.Group();
  battery.name = "battery";
  const pouch = P.mesh(P.roundedBox(36, 15, 5.2, 1.6), mat.battery, "pouch");
  const label = (() => {
    const c = P.canvasOf(512, 214);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#2e3a4a";
    ctx.fillRect(0, 0, 512, 214);
    ctx.fillStyle = "rgba(230,236,244,0.85)";
    ctx.font = '600 44px "Inter Variable", sans-serif';
    ctx.fillText("Li-Po 3.7 V", 34, 84);
    ctx.font = '400 30px "JetBrains Mono Variable", monospace';
    ctx.fillText("rechargeable cell", 34, 140);
    ctx.fillRect(34, 166, 260, 6);
    const t = P.texture(c, { color: true });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.5, clearcoat: 0.3 });
  })();
  const sticker = P.mesh(new THREE.PlaneGeometry(26, 10.8), label, "battery label");
  sticker.position.z = 2.62;
  const pcm = P.mesh(P.roundedBox(4, 13, 5.6, 0.6), M.plastic(0x1f3a2a, { rough: 0.4 }), "protection board");
  pcm.position.x = 19.5;
  const leadR = P.mesh(P.tube([[20, 3, 0], [23, 6, 2], [22, 14, 6]], 0.45), M.plastic(0xc0262a, { rough: 0.4 }), "lead");
  const leadB = P.mesh(P.tube([[20, -1, 0], [24.5, 4, 2], [23.5, 14, 6]], 0.45), M.plastic(0x111111, { rough: 0.4 }), "lead");
  battery.add(pouch, sticker, pcm, leadR, leadB);
  battery.position.set(-2, -25, 34.2);
  battery.rotation.z = 0.0;

  // Flex from the feed-forward mic down the inside of the shell to the board.
  const ffFlex = P.mesh(P.tube([[-20.5, 28, 47.6], [-23, 22, 46], [-20, 15, 41], [-13, 10, 37.5]], 0.6), mat.flex, "ff cable");
  ffFlex.scale.set(1, 1, 1);

  cup.add(shell, baffle, screws, cushionRing, driver, fbMic, fabric, cushion, board, battery, ffMount, ffMic, ffFlex);
  // How far each part flies when the cup comes apart: along the axis, the ear side toward the ear.
  P.explodable(cup, {
    "shell group": [0, 0, 74],
    "ff mic": [0, 0, 62],
    "feed-forward mic": [0, 0, 60],
    "ff flex": [0, 0, 60],
    "ff cable": [0, 0, 48],
    "main board (placed)": [0, 6, 40],
    battery: [0, -14, 26],
    baffle: [0, 0, 8],
    screws: [0, 0, -6],
    "driver (placed)": [0, 0, 0],
    "feedback mic": [0, 0, -22],
    "fabric cover": [0, 0, -40],
    "cushion ring": [0, 0, -46],
    cushion: [0, 0, -62],
  });

  // ── yoke, slider, band ───────────────────────────────────────────────────────────────────────────────────
  // The yoke: a fork whose arms hold the cup at its front and back, at mid-height, with a stem to the slider.
  const yokeD = (() => {
    // outer contour then inner, in the cup's x-y plane (SVG y down)
    const o = [];
    const ax = 42.6;
    const ix = 39.3;
    o.push(`M${-ax} 2 L${-ax} -40`);
    o.push(`Q${-ax} -58 -18 -60 L-3.2 -60.5 L-3.2 -74 L3.2 -74 L3.2 -60.5 L18 -60 Q${ax} -58 ${ax} -40 L${ax} 2`);
    o.push(`Q${ax} 5.5 ${(ax + ix) / 2} 5.5 Q${ix} 5.5 ${ix} 2 L${ix} -39 Q${ix} -54.5 17 -56.6 L-17 -56.6 Q${-ix} -54.5 ${-ix} -39 L${-ix} 2 Q${-ix} 5.5 ${-(ax + ix) / 2} 5.5 Q${-ax} 5.5 ${-ax} 2 Z`);
    return o.join(" ");
  })();
  const yoke = P.mesh(extrude(yokeD, 4.6, { bevel: 1.1, curveSegments: 20 }), mat.yoke, "yoke");
  yoke.position.z = 34;
  const pivots = new THREE.Group();
  pivots.name = "pivots";
  for (const sx of [-1, 1]) {
    const pin = P.mesh(new THREE.CylinderGeometry(2.4, 2.4, 4.4, 32), mat.trim, "pivot");
    pin.rotation.z = Math.PI / 2;
    pin.position.set(sx * 43.4, 0, 36.3);
    const cap = P.mesh(new THREE.SphereGeometry(2.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat.trim, "pivot cap");
    cap.rotation.z = (-sx * Math.PI) / 2;
    cap.position.set(sx * 45.6, 0, 36.3);
    pivots.add(pin, cap);
  }
  // The slider: a brushed strip out of the band's end, with its size marks, into a hinge block on the yoke.
  const slider = new THREE.Group();
  slider.name = "slider";
  const strip = P.mesh(P.roundedBox(7.2, 34, 1.4, 0.5), M.metal(0xc4c8cf, { rough: 0.2 }), "slider strip");
  strip.position.y = 17;
  slider.add(strip);
  for (let i = 0; i < 6; i++) {
    const tick = P.mesh(new THREE.BoxGeometry(3.4, 0.45, 0.3), M.plastic(0x3a3c42), "size mark");
    tick.position.set(-0.8, 10 + i * 3.4, 0.75);
    slider.add(tick);
  }
  const hinge = P.mesh(P.roundedBox(10, 8, 7, 2.2), mat.shell, "hinge");
  hinge.position.y = -2;
  slider.add(hinge);
  slider.position.set(0, 76, 36.3);

  const right = new THREE.Group();
  right.name = "right side";
  right.add(cup, yoke, pivots, slider);

  // Placed as worn: the cup's axis out of the right side of the head.
  const EAR = V(73.6, 0, 0); // refined below from the head's surface
  right.rotation.y = Math.PI / 2;

  // The band: an arc over the head, a plastic outer and a leather pad under it.
  const bandCurve = (rx, ry, cy, a0, a1) =>
    new (class extends THREE.Curve {
      getPoint(t, target = new THREE.Vector3()) {
        const a = a0 + (a1 - a0) * t;
        return target.set(rx * Math.cos(a), cy + ry * Math.sin(a), 0);
      }
    })();
  const rrect = (w, h, r) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  };
  const band = new THREE.Group();
  band.name = "headband";

  const phones = new THREE.Group();
  phones.name = "headphones";
  const left = new THREE.Group();
  left.name = "left side";

  function placeSides(ear) {
    right.position.set(ear.x - 0.6, ear.y + 6, ear.z - 12);
    // the left side: the same parts, mirrored through the head's middle
    left.clear();
    const copy = right.clone(true);
    copy.position.set(-right.position.x, right.position.y, right.position.z);
    copy.rotation.y = -Math.PI / 2;
    copy.scale.x = 1;
    // what is inside the left cup is never seen: keep its outside only
    const inner = ["driver (placed)", "main board (placed)", "battery", "feedback mic", "feed-forward mic", "ff flex", "ff cable", "screws", "baffle"];
    for (const n of inner) copy.getObjectByName(n)?.removeFromParent();
    left.add(copy);
    // band from slider top to slider top
    const top = new THREE.Vector3(0, 110, 36.3);
    right.updateMatrixWorld(true);
    const p = top.clone().applyMatrix4(right.matrixWorld);
    band.clear();
    const rx = p.x;
    const cy = p.y - 6;
    const ry = 160 - cy;
    const outer = new THREE.ExtrudeGeometry(rrect(34, 7.5, 3.2), { steps: 160, bevelEnabled: false, extrudePath: bandCurve(rx + 2, ry + 2, cy, 0.02, Math.PI - 0.02) });
    const shellMesh = P.mesh(outer, M.plastic(0x232429, { rough: 0.45, gloss: 0.3 }), "band");
    const pad = new THREE.ExtrudeGeometry(rrect(27, 10, 4.6), { steps: 140, bevelEnabled: false, extrudePath: bandCurve(rx - 7, ry - 7, cy, 0.42, Math.PI - 0.42) });
    const padMesh = P.mesh(pad, M.leather(0x1b1c20), "band pad");
    const ends = new THREE.Group();
    for (const sx of [-1, 1]) {
      const cap = P.mesh(P.roundedBox(12, 16, 36, 3), M.plastic(0x1c1d21, { rough: 0.5 }), "band end");
      cap.position.set(sx * (rx + 1), cy + 8, 0);
      ends.add(cap);
    }
    band.add(shellMesh, padMesh, ends);
    band.position.z = p.z;
  }
  phones.add(right, left, band);

  // ── the head: skin, hair, the pinna, the canal, the eardrum ──────────────────────────────────────────────
  // One surface from a smooth union of a cranium, the jaw and the neck, found along rays from inside.
  const ell = (p, c, s) => {
    const q = V((p.x - c.x) / s.x, (p.y - c.y) / s.y, (p.z - c.z) / s.z);
    const k = q.length();
    return (k - 1) * Math.min(s.x, s.y, s.z);
  };
  const smin = (a, b, k) => {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  };
  const neckD = (p) => {
    const q = Math.hypot(p.x / 52, (p.z + 22) / 58) - 1;
    const below = Math.max(p.y - -70, 0);
    return Math.max(q * 52, -1) + below * 0.6;
  };
  const headSDF = (p) => {
    const cran = ell(p, V(0, 30, -16), V(77, 110, 99));
    const jaw = ell(p, V(0, -42, 24), V(60, 66, 74));
    let d = smin(cran, jaw, 28);
    d = smin(d, neckD(p), 30);
    return d;
  };
  const C = V(0, 0, -8);
  function surfaceAlong(dir) {
    let lo = 0;
    let hi = 400;
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2;
      if (headSDF(C.clone().addScaledVector(dir, m)) < 0) lo = m;
      else hi = m;
    }
    return C.clone().addScaledVector(dir, lo);
  }
  const ear = surfaceAlong(V(1, 0, 0.0).normalize());
  EAR.copy(ear);

  const head = new THREE.Group();
  head.name = "head";
  const sphere = new THREE.SphereGeometry(1, 190, 136);
  const sp = sphere.attributes.position;
  const hairMask = [];
  const nz = rng(5);
  const bumps = Array.from({ length: 24 }, () => [V(nz() - 0.5, nz() - 0.5, nz() - 0.5).normalize(), 0.6 + nz() * 1.2, 0.3 + nz() * 0.5]);
  for (let i = 0; i < sp.count; i++) {
    const d = V(sp.getX(i), sp.getY(i), sp.getZ(i)).normalize();
    if (d.y < -0.93) d.set(d.x * 0.3, -1, d.z * 0.3).normalize();
    const p = surfaceAlong(d);
    // gentle unevenness, so it is not a perfect ellipsoid
    let e = 0;
    for (const [b, a, w] of bumps) e += a * Math.exp(-(1 - d.dot(b)) / (w * 0.05));
    p.addScaledVector(d, e * 0.6);
    sp.setXYZ(i, p.x, p.y, p.z);
    // Hair: above the temples, down behind the ear to the nape; a sideburn in front of the ear. Not under the ear.
    // the hairline's height at this point's z: high at the forehead, above the ear, falling steeply behind it
    const z = p.z;
    // the hairline: high at the forehead, curving down round the top of the ear, falling steeply behind it,
    // a little ragged so it is not a drawn line
    const rag = 1.6 * Math.sin(z * 0.9 + p.y * 0.3) + 1.1 * Math.sin(z * 2.3 + 1.7) + 0.8 * Math.sin(p.y * 1.9 + z * 0.4);
    const overEar = 46 + 9 * smooth(-10, 18, z) + 10 * smooth(18, 45, z);
    const hairline = z > -34 ? overEar : Math.max(-95, 46 - (-34 - z) * 4.4);
    let m = smooth(hairline - 7, hairline + 3, p.y + rag);
    if (z > 55 && p.y < 80) m *= smooth(75, 55, z); // no hair on the face
    if (p.y < -60 && z > -40) m = 0;
    hairMask.push(m);
  }
  sphere.computeVertexNormals();
  {
    const keepSkin = [];
    const ix = sphere.index.array;
    const under = (i) => {
      const x = sp.getX(i);
      const y = sp.getY(i);
      const z = sp.getZ(i);
      return x > 40 && ((y - 0.3) / 3.7) ** 2 + ((z + 2.6) / 3.7) ** 2 < 1;
    };
    for (let i = 0; i < ix.length; i += 3) if (!(under(ix[i]) && under(ix[i + 1]) && under(ix[i + 2]))) keepSkin.push(ix[i], ix[i + 1], ix[i + 2]);
    sphere.setIndex(keepSkin);
  }
  const skin = P.mesh(sphere, skinMat(), "skin");
  head.add(skin);

  // Hair shell: the same surface pushed out where the mask says hair, its edge dithered to strands.
  const hairGeo = sphere.clone();
  const hp = hairGeo.attributes.position;
  const hn = hairGeo.attributes.normal;
  const alpha = [];
  for (let i = 0; i < hp.count; i++) {
    const m = hairMask[i];
    const k = 0.25 + 2.6 * m;
    hp.setXYZ(i, hp.getX(i) + hn.getX(i) * k, hp.getY(i) + hn.getY(i) * k, hp.getZ(i) + hn.getZ(i) * k);
    alpha.push(1, 1, 1, Math.min(1, m * 1.6));
  }
  hairGeo.setAttribute("color", new THREE.Float32BufferAttribute(alpha, 4));
  const keep = [];
  const idx = hairGeo.index.array;
  for (let i = 0; i < idx.length; i += 3) if (hairMask[idx[i]] + hairMask[idx[i + 1]] + hairMask[idx[i + 2]] > 0.05) keep.push(idx[i], idx[i + 1], idx[i + 2]);
  hairGeo.setIndex(keep);
  hairGeo.computeVertexNormals();
  const strands = (() => {
    const c = P.canvasOf(512);
    const ctx = c.getContext("2d");
    const rr = rng(71);
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5000; i++) {
      const x = rr() * 512;
      const y = rr() * 512;
      ctx.strokeStyle = rr() < 0.5 ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.25)";
      ctx.lineWidth = 0.6 + rr() * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rr() - 0.5) * 6, y + 30 + rr() * 40);
      ctx.stroke();
    }
    return c;
  })();
  const hairMat = new THREE.MeshPhysicalMaterial({
    color: 0x5a3c26,
    map: (() => {
      const t = P.texture(strands, { repeat: 10, color: true });
      return t;
    })(),
    roughness: 0.48,
    normalMap: P.texture(P.normalFrom(strands, 2.5), { repeat: 10 }),
    normalScale: new THREE.Vector2(0.9, 0.9),
    sheen: 0.8,
    sheenColor: new THREE.Color(0x8a6a50),
    sheenRoughness: 0.35,
    vertexColors: true,
    alphaHash: true,
  });
  hairMat.userData.cut = 0x3a2a20;
  const hair = P.mesh(hairGeo, hairMat, "hair");

  // The pinna (the outer ear), right ear, seen from the side. Local x points to the back of the head, y up,
  // z out of the head; origin at the ear canal's entrance. The outline is traced from a side-view anatomy plate:
  // helix root at the front top, the rim round the top and back, the lobe, the intertragic notch, the tragus.
  const outline = [
    [-6, 10], [-3, 20], [2, 29], [8, 35.5], [15, 38.5], [21, 37], [25, 31], [26.8, 22], [27, 12], [26, 2], [24, -7], [20.5, -15], [17, -21], [13, -26.5], [8, -29], [2.5, -27.5], [-0.5, -22], [-2, -15], [-4, -10], [-9, -6], [-10.6, 0], [-10, 5], [-8, 8.5],
  ];
  const outlineCurve = new THREE.CatmullRomCurve3(outline.map(([x, y]) => V(x, y * 0.93, 0)), true, "centripetal");
  const outlinePts = outlineCurve.getSpacedPoints(260).slice(0, -1).map((p) => [p.x, p.y]);
  const signedArea = (pts) => pts.reduce((s, [x0, y0], i) => s + x0 * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * y0, 0) / 2;
  const ccw = signedArea(outlinePts) > 0;
  const BEVEL = 2.6;
  // the outline moved inward by the bevel: the body's cap, which the bevel then rounds back out to the outline
  const insetPts = outlinePts.map(([x, y], i, a) => {
    const [px, py] = a[(i - 1 + a.length) % a.length];
    const [nx, ny] = a[(i + 1) % a.length];
    const l = Math.hypot(nx - px, ny - py);
    const tx = (nx - px) / l;
    const ty = (ny - py) / l;
    const s = ccw ? 1 : -1;
    return [x - s * ty * BEVEL * 0.9, y + s * tx * BEVEL * 0.9];
  });
  const svgOf = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${(-y).toFixed(2)}`).join(" ") + " Z";
  // the canal's mouth through the body, wound against the outline so it is a hole
  const mouth = [];
  for (let i = 0; i < 64; i++) {
    const a = ((ccw ? -i : i) / 64) * Math.PI * 2;
    mouth.push([0.5 + 5.8 * Math.cos(a), 0.3 + 5.8 * Math.sin(a)]);
  }
  const DEPTH = 1.4;
  const BACK = -6; // the body's front cap sits under the relief, which rolls down to it at the rim
  const body = P.mesh(extrude(svgOf(insetPts) + " " + svgOf(mouth), DEPTH, { bevel: BEVEL, curveSegments: 6 }), skinMat(), "pinna body");
  body.position.z = BACK - DEPTH - BEVEL;
  const CAP = 0;
  const conchaC = [7, -1.5];
  const conchaR = [11, 13];

  // The relief: helix rim, scapha, antihelix and its two crura, triangular fossa, concha, tragus, antitragus, lobe.
  const distTo = (x, y, pts, closed) => {
    let best = 1e9;
    const n = pts.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % n];
      const dx = bx - ax;
      const dy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
      best = Math.min(best, Math.hypot(x - ax - dx * t, y - ay - dy * t));
    }
    return best;
  };
  const inside = (x, y, pts) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const antihelix = [[13, -13], [17, -4], [18.8, 6], [18, 15], [15.5, 22]];
  const superiorCrus = [[15.5, 22], [15, 28], [13, 32.5]];
  const inferiorCrus = [[15.5, 22], [10, 24.5], [3.5, 25]];
  const crusHelicis = [[-5, 12], [0.5, 10], [6, 8.5]];
  const relief = (x, y0) => {
    const d = distTo(x, y0, insetPts, true);
    const y = y0 / 0.93;
    // how much of the rim rolls over: all round the top and back, none at the front where the ear joins the face
    const backness = smooth(-4, 4, x) * (1 - smooth(-12, -20, y) * smooth(10, 2, x));
    const roll = 3.4 * Math.exp(-(((d - 2.3) / 1.8) ** 2)) * backness;
    const scapha = -1.5 * Math.exp(-(((d - 5.8) / 1.9) ** 2)) * backness * smooth(-12, -2, y);
    let h = 1.2 + roll + scapha;
    const ridge = (pts, height, w) => height * Math.exp(-((distTo(x, y, pts, false) / w) ** 2));
    h += ridge(antihelix, 3.2, 2.5) + ridge(superiorCrus, 2.4, 1.9) + ridge(inferiorCrus, 2.2, 1.7);
    h += ridge(crusHelicis, 2.6, 1.6) * smooth(-7, -3, x);
    // triangular fossa: the hollow between the two crura
    h -= 1.4 * Math.exp(-(((x - 10.5) / 3.2) ** 2 + ((y - 28.5) / 2.8) ** 2));
    // concha: a bowl that runs down into the canal's mouth at the origin
    const cr = Math.hypot((x - conchaC[0]) / conchaR[0], (y - conchaC[1]) / conchaR[1]);
    h -= 5.6 * (1 - smooth(0.5, 1.0, cr)) * (1 - ridge(crusHelicis, 0.5, 2.2));
    h -= 4.8 * Math.exp(-((Math.hypot(x - 0.5, y - 0.3) / 3.8) ** 2));
    // tragus: a flap in front of the canal; antitragus below the antihelix
    h += 5.0 * Math.exp(-(((x + 5.5) / 2.8) ** 2 + ((y + 1) / 4.6) ** 2));
    h += 3.0 * Math.exp(-(((x - 10) / 2.9) ** 2 + ((y + 14.5) / 2.5) ** 2));
    // the lobe: soft and full
    h += 2.4 * Math.exp(-(((x - 7) / 6) ** 2 + ((y + 22) / 5) ** 2));
    // the rim curls back to the body at the edge
    return h * smooth(0, 1.6, d) + (BACK - 1.8) * (1 - smooth(0, 2.4, d)); // the edge tucks under the body's cap
  };
  // A grid laid over the cap, raised by the relief; the cells round the canal's mouth are left open.
  const STEP = 0.42;
  const xs = [];
  for (let x = -11; x <= 28; x += STEP) xs.push(x);
  const ys = [];
  for (let y = -31; y <= 40; y += STEP) ys.push(y);
  const vid = new Map();
  const rpos = [];
  const ruv = [];
  const rid = [];
  const vert = (i, j) => {
    const key = i * 10000 + j;
    if (vid.has(key)) return vid.get(key);
    const x = xs[i];
    const y = ys[j];
    rpos.push(x, y, CAP + relief(x, y));
    ruv.push(x / 8, y / 8);
    vid.set(key, rpos.length / 3 - 1);
    return rpos.length / 3 - 1;
  };
  const inCap = xs.map((x) => ys.map((y) => inside(x, y, insetPts) && Math.hypot(x - 0.5, y - 0.3) > 2.4));
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < ys.length - 1; j++) {
      const a = inCap[i][j];
      const b = inCap[i + 1][j];
      const c = inCap[i + 1][j + 1];
      const d = inCap[i][j + 1];
      if (a && b && c) rid.push(vert(i, j), vert(i + 1, j), vert(i + 1, j + 1));
      if (a && c && d) rid.push(vert(i, j), vert(i + 1, j + 1), vert(i, j + 1));
      else if (a && b && d && !c) rid.push(vert(i, j), vert(i + 1, j), vert(i, j + 1));
      if (!a && b && c && d) rid.push(vert(i + 1, j), vert(i + 1, j + 1), vert(i, j + 1));
    }
  const reliefGeo = new THREE.BufferGeometry();
  reliefGeo.setAttribute("position", new THREE.Float32BufferAttribute(rpos, 3));
  reliefGeo.setAttribute("uv", new THREE.Float32BufferAttribute(ruv, 2));
  reliefGeo.setIndex(rid);
  reliefGeo.computeVertexNormals();
  const earSkin = skinMat();
  const reliefMesh = P.mesh(reliefGeo, earSkin, "pinna relief");
  earSkin.userData.thin = true;
  // A short funnel from the concha's floor into the canal.
  const pinna = new THREE.Group();
  pinna.name = "pinna";
  pinna.add(body, reliefMesh);
  // Into head space: local x (back) -> world -z, local z (out) -> world +x; the ear stands out about 25 degrees.
  const pinnaHolder = new THREE.Group();
  pinnaHolder.name = "pinna (placed)";
  // it turns about its front edge (where it joins the face), so the rest stands out from the skin
  const TILT = 0.32;
  const pivot = new THREE.Group();
  pivot.position.set(-10, 0, 1.0);
  pivot.rotation.y = -TILT;
  pinna.position.set(10, 0, 0);
  pivot.add(pinna);
  pinnaHolder.add(pivot);
  pinnaHolder.rotation.y = Math.PI / 2;
  pinnaHolder.position.copy(EAR);
  head.add(pinnaHolder);

  // The ear canal: a tube from the concha into the head, gently S-shaped, about 25 mm, lined with skin
  // (its faces turned inward, so a cut shows its inside lit and its wall solid).
  const MOUTH = EAR.clone().add(V(-2.3, 0.3, -2.5));
  const canalPts = [V(1.2, 0, 0), V(-3, 0.6, -0.5), V(-8, 1.3, -1.6), V(-14, 1.1, -1.2), V(-20, 0, 0.3), V(-25, -1.2, 1.8)].map((p) => p.add(MOUTH));
  const canalCurve = new THREE.CatmullRomCurve3(canalPts);
  const canalGeo = new THREE.TubeGeometry(canalCurve, 120, 3.5, 40, false);
  {
    // taper toward the eardrum, and turn the faces inward
    const p = canalGeo.attributes.position;
    const pts = canalCurve.getSpacedPoints(120);
    for (let i = 0; i < p.count; i++) {
      const seg = Math.floor(i / 41);
      const c = pts[Math.min(seg, 120)];
      const k = 1 - 0.12 * (seg / 120);
      p.setXYZ(i, c.x + (p.getX(i) - c.x) * k, c.y + (p.getY(i) - c.y) * k * 0.86, c.z + (p.getZ(i) - c.z) * k);
    }
    const ix = canalGeo.index.array;
    for (let i = 0; i < ix.length; i += 3) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]];
    canalGeo.computeVertexNormals();
  }
  const canalMat = skinMat();
  canalMat.color = new THREE.Color(0x17383d);
  canalMat.emissive = new THREE.Color(0x0e5866);
  canalMat.emissiveIntensity = 0.9;
  canalMat.roughness = 0.4;
  canalMat.userData.cut = 0xc9c5bd;
  const canal = P.mesh(canalGeo, canalMat, "ear canal");
  head.add(canal);
  // The eardrum: a thin, pearly, slightly conical membrane set at a slant, with the malleus handle showing through.
  const drumEnd = canalCurve.getPointAt(1);
  const drumDir = canalCurve.getTangentAt(1);
  const eardrum = new THREE.Group();
  eardrum.name = "eardrum";
  const membrane = P.mesh(
    P.lathe(P.smoothProfile([[0, -1.3], [1.5, -0.8], [3.4, -0.2], [4.3, 0], [4.6, 0.1]], 0.4), 64),
    new THREE.MeshPhysicalMaterial({ color: 0x9fe9f5, emissive: 0x2fbfd6, emissiveIntensity: 0.55, roughness: 0.3, side: THREE.DoubleSide }),
    "membrane",
  );
  membrane.material.userData.cut = 0xd0b8ae;
  membrane.material.userData.thin = true;
  membrane.scale.set(1, 1, 0.82);
  const malleus = P.mesh(P.tube([[0, -1.25, 0], [0.4, -0.5, 1.8], [0.6, 0.0, 3.6]], 0.32, { segments: 20 }), M.plastic(0xe9fbff, { rough: 0.5 }), "malleus");
  const annulus = P.mesh(new THREE.TorusGeometry(4.5, 0.45, 12, 64), M.plastic(0x7fd8e6, { rough: 0.6 }), "drum ring");
  annulus.rotation.x = Math.PI / 2;
  annulus.scale.z = 0.82;
  eardrum.add(membrane, malleus, annulus);
  eardrum.position.copy(drumEnd);
  // the membrane faces back down the canal, tilted about 45 degrees
  const look = drumDir.clone().negate().applyAxisAngle(V(0, 0, 1), 0.65);
  eardrum.quaternion.setFromUnitVectors(V(0, 1, 0), look);
  head.add(eardrum);

  placeSides(EAR);

  // World points the film aims at.
  phones.updateMatrixWorld(true);
  head.updateMatrixWorld(true);
  const w = (o, p = V(0, 0, 0)) => (o.updateMatrixWorld(true), o.localToWorld(p.clone()));
  const anchor = {
    ear: EAR.clone(),
    canalIn: canalCurve.getPointAt(0.12),
    canalMid: canalCurve.getPointAt(0.55),
    drum: drumEnd.clone(),
    cupCentre: w(cup, V(0, 2, 26)),
    driverFace: w(cup, V(0, 2, 15)),
    ffMic: w(cup, V(-20.5, 31, 52)),
    chip: w(cup, V(-6.5, 5.5, 37)),
  };

  // The driver's cone, pushed and pulled by the film (mm toward the ear).
  function setCone(push) {
    // inside the driver's own frame, +y is toward the ear before its 0.55 squash
    const k = push / 0.55;
    cone.position.y = coneBase.cone + k;
    dust.position.y = coneBase.dust + k;
    coil.position.y = coneBase.coil + k;
    winding.position.y = coneBase.winding + k;
    surround.scale.y = 1 + push * 0.04;
  }

  return { phones, right, left, band, cup, shell, driver, drv, fbMic, ffMic, ffGrille, board, anc, battery, cushion, cover, foam, fabric, baffle, yoke, slider, head, skin, hair, pinna, pinnaHolder, canal, canalCurve, eardrum, anchor, setCone, mat };
}
