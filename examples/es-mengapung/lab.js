// The things in "Kenapa es malah ngapung di air?", drawn on one 2D canvas from a state the timeline holds.
//
// - A glass in cross-section (a cylinder seen a little from above), with water or molten wax, and a cube (ice or wax).
//   The ice floats with RHO_ICE / RHO_WATER of its height under the waterline; nothing about that is eyeballed.
// - Molecules of water: a real ice Ih lattice (oxygens on a hexagonal-diamond lattice, c/a = 1.628, O-O = 0.6106 a,
//   hydrogens placed by the ice rules), and the same molecules as liquid, in a box 1/1.0907 as tall.
// - Bars of density.
// Everything here is a function of the state and the time it is given: no clock of its own.
export const RHO_ICE = 0.9167; // g/cm3, ice Ih at 0 C
export const RHO_WATER = 0.9998; // g/cm3, water at 0 C
export const UNDER = RHO_ICE / RHO_WATER; // 0.9169 of a floating block is under the surface
export const GROW = RHO_WATER / RHO_ICE; // 1.0907: the room the same molecules take as ice

export const ICE = "#7fe6ff";
export const WATER = "#3f8cff";
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => {
  const u = clamp(x);
  return u * u * (3 - 2 * u);
};
const mix = (a, b, u) => a + (b - a) * u;
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Sphere sprites ────────────────────────────────────────────────────────────
function sprite(colour, rim, size = 96) {
  const c = Object.assign(document.createElement("canvas"), { width: size, height: size });
  const g = c.getContext("2d");
  const r = size / 2;
  const body = g.createRadialGradient(r * 0.7, r * 0.62, r * 0.05, r, r, r * 0.98);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.18, colour);
  body.addColorStop(0.78, rim);
  body.addColorStop(1, "rgba(0,0,0,0.9)");
  g.fillStyle = body;
  g.beginPath();
  g.arc(r, r, r * 0.96, 0, Math.PI * 2);
  g.fill();
  // A soft back light on the lower right edge.
  const back = g.createRadialGradient(r * 1.45, r * 1.5, 0, r * 1.45, r * 1.5, r * 0.8);
  back.addColorStop(0, "rgba(160,235,255,0.45)");
  back.addColorStop(1, "rgba(160,235,255,0)");
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = back;
  g.fillRect(0, 0, size, size);
  return c;
}

// ── The lattice ───────────────────────────────────────────────────────────────
// Units of a (the lattice constant, 4.52 A). A block NX rectangular cells wide (a each), NY tall (sqrt(3) a each) and
// one period c deep, taken from z = 3/8 c so it is two whole puckered bilayers: 8 molecules a rectangular cell.
const C = 7.36 / 4.52;
const BOND = Math.sqrt(3 / 8); // the O-O distance in units of a for ideal tetrahedra: 0.612 a = 2.77 A
export function buildIce(NX = 6, NY = 5, seed = 11) {
  const W = NX;
  const H = NY * Math.sqrt(3);
  const base = [
    [0, 0.57735, 3 / 8],
    [0.5, 0.288675, 4 / 8],
    [0.5, 0.288675, 7 / 8],
    [0, 0.57735, 8 / 8],
  ];
  const sites = [];
  for (let i = 0; i < NX; i++)
    for (let j = 0; j < NY; j++)
      for (const [ox, oy] of [
        [0, 0],
        [0.5, Math.sqrt(3) / 2],
      ])
        for (const [bx, by, bz] of base) {
          let x = i + ox + bx;
          let y = j * Math.sqrt(3) + oy + by;
          x = ((x % W) + W) % W;
          y = ((y % H) + H) % H;
          sites.push({ x, y, z: bz * C });
        }
  const n = sites.length;
  const Z0 = (3 / 8) * C;
  // Neighbours: the four ideal directions (periodic), and which of them are real bonds inside the block.
  const ideal = sites.map(() => []);
  const bonds = [];
  const adj = sites.map(() => []);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const raw = [sites[j].x - sites[i].x, sites[j].y - sites[i].y, sites[j].z - sites[i].z];
      const per = [raw[0] - W * Math.round(raw[0] / W), raw[1] - H * Math.round(raw[1] / H), raw[2] - C * Math.round(raw[2] / C)];
      const d = Math.hypot(...per);
      if (Math.abs(d - BOND) > 0.05) continue;
      ideal[i].push(per);
      ideal[j].push(per.map((v) => -v));
      if (Math.hypot(...raw) < BOND + 0.05) {
        adj[i].push(bonds.length);
        adj[j].push(bonds.length);
        bonds.push({ i, j });
      }
    }
  // The ice rules: each bond holds one hydrogen, each molecule gives two. An Eulerian orientation of the bond graph
  // (closed walks, with a dummy vertex joined to every vertex of odd degree) gives every full molecule two out-bonds;
  // molecules on the edge of the block point their spare hydrogen along a bond that would leave the block.
  const edges = bonds.map((b) => ({ a: b.i, b: b.j, used: false, from: -1 }));
  const inc = adj.map((list) => [...list]);
  const DUMMY = n;
  inc.push([]);
  for (let v = 0; v < n; v++)
    if (inc[v].length % 2) {
      edges.push({ a: v, b: DUMMY, used: false, from: -1 });
      inc[v].push(edges.length - 1);
      inc[DUMMY].push(edges.length - 1);
    }
  const ptr = inc.map(() => 0);
  for (let s = 0; s <= n; s++) {
    for (;;) {
      while (ptr[s] < inc[s].length && edges[inc[s][ptr[s]]].used) ptr[s]++;
      if (ptr[s] >= inc[s].length) break;
      let v = s;
      for (;;) {
        while (ptr[v] < inc[v].length && edges[inc[v][ptr[v]]].used) ptr[v]++;
        if (ptr[v] >= inc[v].length) break;
        const e = edges[inc[v][ptr[v]]];
        e.used = true;
        e.from = v;
        v = e.a === v ? e.b : e.a;
      }
    }
  }
  const rand = rng(seed);
  const mols = sites.map((p, i) => {
    const hs = [];
    for (const k of adj[i]) {
      const e = edges[k];
      if (e.from !== i) continue;
      const o = e.a === i ? e.b : e.a;
      hs.push([sites[o].x - p.x, sites[o].y - p.y, sites[o].z - p.z]);
    }
    if (hs.length < 2) {
      const real = adj[i].map((k) => {
        const o = bonds[k].i === i ? bonds[k].j : bonds[k].i;
        return [sites[o].x - p.x, sites[o].y - p.y, sites[o].z - p.z];
      });
      for (const v of ideal[i]) {
        if (hs.length >= 2) break;
        if (real.some((r) => Math.hypot(r[0] - v[0], r[1] - v[1], r[2] - v[2]) < 0.05)) continue;
        hs.push(v);
      }
    }
    const hdir = hs.slice(0, 2).map((v) => {
      const l = Math.hypot(...v);
      return v.map((c) => c / l);
    });
    return { x: p.x, y: p.y, z: p.z - Z0, deg: adj[i].length, hdir };
  });
  // The same molecules as liquid: the column squeezed to 1/GROW of the height, then every molecule shaken out of
  // its place (seeded), pushed apart so none overlap, and kept inside the box.
  const D = C; // the box's depth
  const HL = H / GROW;
  for (const m of mols) {
    m.lx = clamp(m.x + (rand() - 0.5) * 0.9, 0.16, W - 0.16);
    m.ly = clamp(H - (H - m.y) / GROW + (rand() - 0.5) * 0.9, H - HL + 0.16, H - 0.16);
    m.lz = clamp(m.z + (rand() - 0.5) * 0.7, -0.08, D - 0.25);
  }
  for (let it = 0; it < 24; it++)
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const a = mols[i];
        const b = mols[j];
        const dx = b.lx - a.lx;
        const dy = b.ly - a.ly;
        const dz = b.lz - a.lz;
        const d = Math.hypot(dx, dy, dz);
        if (d >= 0.5 || d === 0) continue;
        const push = (0.5 - d) / 2 / d;
        a.lx -= dx * push;
        a.ly -= dy * push;
        a.lz -= dz * push;
        b.lx += dx * push;
        b.ly += dy * push;
        b.lz += dz * push;
        for (const m of [a, b]) {
          m.lx = clamp(m.lx, 0.16, W - 0.16);
          m.ly = clamp(m.ly, H - HL + 0.16, H - 0.16);
          m.lz = clamp(m.lz, -0.08, D - 0.25);
        }
      }
  for (const m of mols) {
    // Motion in the liquid: a wander and a tumble, each a sum of slow sines with seeded phases.
    m.w = [0, 1, 2, 3, 4, 5].map(() => [1.6 + rand() * 2.2, rand() * 6.283]);
    m.rot = [rand() * 6.283, rand() * 6.283, rand() * 6.283, 0.8 + rand() * 1.6, 0.6 + rand() * 1.4];
    // Freezing starts from the middle of the block and spreads out.
    m.delay = Math.hypot((m.x - W / 2) / W, (m.y - H / 2) / H) * 1.1;
  }
  // Channels: the open hexagons, seen down c (the centres of the hexagonal lattice).
  const channels = [];
  for (let i = -1; i <= NX; i++)
    for (let j = -1; j <= NY; j++)
      for (const [ox, oy] of [
        [0, 0],
        [0.5, Math.sqrt(3) / 2],
      ]) {
        const x = i + ox;
        const y = j * Math.sqrt(3) + oy;
        if (x > 0.3 && x < W - 0.3 && y > 0.4 && y < H - 0.4) channels.push({ x, y });
      }
  return { mols, bonds, channels, W, H, HL, D, n };
}

// Where a molecule is, in units of a: in the liquid (moving) or at its site, and how far frozen.
function place(m, t, frozen, jiggle) {
  let x = m.lx;
  let y = m.ly;
  let z = m.lz;
  const A = 0.13 * jiggle;
  if (A > 0) {
    const w = m.w;
    x += A * (Math.sin(w[0][0] * t + w[0][1]) + 0.6 * Math.sin(w[3][0] * 1.7 * t + w[3][1]));
    y += A * (Math.sin(w[1][0] * t + w[1][1]) + 0.6 * Math.sin(w[4][0] * 1.7 * t + w[4][1]));
    z += A * (Math.sin(w[2][0] * t + w[2][1]) + 0.6 * Math.sin(w[5][0] * 1.7 * t + w[5][1]));
  }
  const u = smooth(frozen);
  return [mix(x, m.x, u), mix(y, m.y, u), mix(z, m.z, u)];
}
// The two hydrogens: tumbling in the liquid, along their bonds in the ice.
const HOH = (104.5 * Math.PI) / 180;
function hydrogens(m, t, frozen, jiggle) {
  const [a0, b0, c0, wa, wb] = m.rot;
  const a = a0 + wa * t * jiggle;
  const b = b0 + wb * t * jiggle;
  const c = c0;
  // A V of two unit vectors, turned by three angles.
  const v = [
    [Math.sin(HOH / 2), Math.cos(HOH / 2), 0],
    [-Math.sin(HOH / 2), Math.cos(HOH / 2), 0],
  ].map(([x, y, z]) => {
    let [x1, y1, z1] = [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z];
    [y1, z1] = [y1 * Math.cos(b) - z1 * Math.sin(b), y1 * Math.sin(b) + z1 * Math.cos(b)];
    [x1, z1] = [x1 * Math.cos(c) + z1 * Math.sin(c), -x1 * Math.sin(c) + z1 * Math.cos(c)];
    return [x1, y1, z1];
  });
  const u = smooth(frozen);
  return v.map((l, k) => {
    const s = m.hdir[k] ?? l;
    const r = [mix(l[0], s[0], u), mix(l[1], s[1], u), mix(l[2], s[2], u)];
    const n = Math.hypot(...r) || 1;
    return r.map((c) => c / n);
  });
}

export function createLab(canvas) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const ice = buildIce();
  const SPR = {
    water: sprite("#5aa2ff", "#173f9a"),
    ice: sprite("#d9f8ff", "#3aa9c9"),
    h: sprite("#f4f7ff", "#8a93a8", 48),
    hot: sprite("#ffffff", "#7fe6ff"),
  };

  // ── The state the timeline tweens ──────────────────────────────────────────
  const L = {
    cam: { z: 1, x: 540, y: 960 }, // a push on everything drawn, about (x, y)
    hero: { a: 1, x0: 232, x1: 762, top: 300, bottom: 1150, level: 540, s: 250, t0: -0.25, cubeA: 1, bob: 1, rest: 0, dim: 0, ripple: -99 },
    pair: { a: 0, wax: 0, waxT0: 0 },
    lens: { r: 0, x: 560, y: 960, a: 0 },
    mol: { a: 0, cx: 497, cy: 746, s: 93.33, tilt: 0.5, phi: -0.32, freeze: 0, jiggle: 1, bonds: 0, box: 0, hi: 0, hiBonds: 0, ring: 0, chan: 0, lift: 0, liq: 0 },
    twin: { a: 0, cx: 260, cy: 852, s: 70 },
    bars: { a: 0, morph: 0, fill: 0, lift: 0 },
    macro: { a: 0, ticks: 0, measure: 0, t0: 0 },
  };
  // The highlighted molecule: a full one (four bonds) near the middle, on the second layer from the front.
  const hi = ice.mols.map((m, i) => ({ m, i })).filter(({ m }) => m.deg === 4 && Math.abs(m.z - 0.5 * C) < 0.01).sort((p, q) => Math.hypot(p.m.x - 3, p.m.y - ice.H / 2) - Math.hypot(q.m.x - 3, q.m.y - ice.H / 2))[0].i;
  const hiBonds = ice.bonds.filter((b) => b.i === hi || b.j === hi);
  // The ring traced in s06: the channel nearest the middle and the six columns of molecules around it.
  const ring = ice.channels.slice().sort((p, q) => Math.hypot(p.x - 3, p.y - ice.H / 2) - Math.hypot(q.x - 3, q.y - ice.H / 2))[0];
  const out = { hi: [0, 0], ring: [0, 0], gap: [0, 0], col: [] };

  // ── Projection of the molecule view ────────────────────────────────────────
  function projector(v) {
    const ct = Math.cos(v.tilt);
    const st = Math.sin(v.tilt);
    const cp = Math.cos(v.phi);
    const sp = Math.sin(v.phi);
    const ox = ice.W / 2;
    const oy = v.oy ?? ice.H / 2;
    const oz = ice.D / 2 - 0.1;
    return (x, y, z) => {
      const X = x - ox;
      const Y = y - oy;
      const Z = z - oz;
      const x1 = X * cp + Z * sp;
      const z1 = -X * sp + Z * cp;
      const y2 = Y * ct + z1 * st;
      const z2 = -Y * st + z1 * ct;
      const k = 1 / (1 - (z2 * v.s) / 4200);
      return [v.cx + x1 * v.s * k, v.cy + y2 * v.s * k, z2, k];
    };
  }

  function box(P, h, alpha, colour, front) {
    // The block's box from y = H - h to H, x 0..W, z -0.2..D - 0.1, as a wireframe with glass faces.
    const y0 = ice.H - h;
    const x0 = -0.08;
    const x1 = ice.W + 0.08;
    const z0 = -0.2;
    const z1 = ice.D - 0.05;
    const c = [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, ice.H + 0.06, z0],
      [x0, ice.H + 0.06, z0],
      [x0, y0, z1],
      [x1, y0, z1],
      [x1, ice.H + 0.06, z1],
      [x0, ice.H + 0.06, z1],
    ].map((p) => P(...p));
    const edges = front
      ? [
          [4, 5],
          [5, 6],
          [6, 7],
          [7, 4],
          [0, 4],
          [1, 5],
          [2, 6],
          [3, 7],
        ]
      : [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
        ];
    ctx.save();
    ctx.globalAlpha = alpha;
    if (!front) {
      // The back face and the floor of the box, faintly filled.
      ctx.fillStyle = "rgba(127,230,255,0.035)";
      ctx.beginPath();
      [0, 1, 2, 3].forEach((k, i) => (i ? ctx.lineTo(c[k][0], c[k][1]) : ctx.moveTo(c[k][0], c[k][1])));
      ctx.fill();
      ctx.fillStyle = "rgba(127,230,255,0.06)";
      ctx.beginPath();
      [3, 2, 6, 7].forEach((k, i) => (i ? ctx.lineTo(c[k][0], c[k][1]) : ctx.moveTo(c[k][0], c[k][1])));
      ctx.fill();
    }
    ctx.strokeStyle = colour;
    ctx.lineWidth = front ? 3 : 2;
    ctx.globalAlpha = alpha * (front ? 0.9 : 0.35);
    ctx.beginPath();
    for (const [a, b] of edges) {
      ctx.moveTo(c[a][0], c[a][1]);
      ctx.lineTo(c[b][0], c[b][1]);
    }
    ctx.stroke();
    if (front) {
      // A bright top edge on the front face, like the kit's glass.
      const g = ctx.createLinearGradient(c[4][0], 0, c[5][0], 0);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, "rgba(255,255,255,0.9)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(c[4][0], c[4][1]);
      ctx.lineTo(c[5][0], c[5][1]);
      ctx.stroke();
    }
    ctx.restore();
    return c;
  }

  // Draws the molecules with a view; o overrides the state (the liquid twin).
  function molecules(v, t, o = {}) {
    const P = projector(v);
    const freeze = o.freeze ?? v.freeze;
    const jiggle = o.jiggle ?? v.jiggle;
    const alpha = o.a ?? v.a;
    const frozenOf = (m) => clamp((freeze * 1.7 - m.delay) / 0.7);
    // The box grows from the liquid's height to the ice's as the block freezes.
    const grown = smooth(clamp(freeze * 1.25 - 0.15));
    const h = mix(ice.HL, ice.H, grown) + 0.06;
    const colour = o.colour ?? (freeze > 0.5 ? ICE : WATER);
    if (v.box > 0) box(P, h, alpha * v.box, colour, false);
    const pts = ice.mols.map((m, i) => {
      const f = frozenOf(m);
      const p = place(m, t, f, jiggle * (1 - f));
      return { i, f, p, q: P(...p) };
    });
    // Bonds: thin lines of ice cyan between frozen neighbours.
    const bondsA = (o.bonds ?? v.bonds) * alpha;
    if (bondsA > 0.01) {
      ctx.save();
      ctx.lineCap = "round";
      for (const b of ice.bonds) {
        const A = pts[b.i];
        const B = pts[b.j];
        const k = Math.min(A.f, B.f);
        if (k < 0.6) continue;
        const own = b.i === hi || b.j === hi;
        ctx.globalAlpha = bondsA * smooth((k - 0.6) / 0.4) * (own && v.hiBonds > 0 ? 0.35 : 0.55) * mix(0.55, 1, clamp((A.q[2] + B.q[2]) / 4 + 0.5));
        ctx.strokeStyle = ICE;
        ctx.lineWidth = 2.6 * ((A.q[3] + B.q[3]) / 2) * (v.s / 93);
        ctx.setLineDash([7 * (v.s / 93), 6 * (v.s / 93)]);
        ctx.beginPath();
        ctx.moveTo(A.q[0], A.q[1]);
        ctx.lineTo(B.q[0], B.q[1]);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Channels: the open hexagons glow, seen down c.
    if (!o.twin && v.chan > 0.01) {
      ctx.save();
      for (const c of ice.channels) {
        const [x, y] = P(c.x, c.y, ice.D / 2);
        const r = 0.36 * v.s;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(127,230,255,0.55)");
        g.addColorStop(0.6, "rgba(127,230,255,0.18)");
        g.addColorStop(1, "rgba(127,230,255,0)");
        ctx.globalAlpha = v.chan * alpha;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // Balls, back to front: the oxygen, and its two hydrogens before or after it as they lie.
    pts.sort((p, q) => p.q[2] - q.q[2]);
    const RO = 0.2 * v.s;
    const RH = 0.088 * v.s;
    const OH = 0.212; // 0.96 A in units of a
    ctx.save();
    for (const { i, f, p, q } of pts) {
      const m = ice.mols[i];
      const depth = clamp((q[2] + 1.2) / 2.4);
      const shade = mix(0.55, 1, depth);
      const hs = hydrogens(m, t, f, jiggle * (1 - f)).map((d) => P(p[0] + d[0] * OH, p[1] + d[1] * OH, p[2] + d[2] * OH));
      const drawH = (front) => {
        for (const hq of hs) {
          if (hq[2] > q[2] !== front) continue;
          const r = RH * hq[3];
          ctx.globalAlpha = alpha * shade * (v.hi > 0 && i !== hi ? mix(1, 0.42, v.hi) : 1);
          ctx.drawImage(SPR.h, hq[0] - r, hq[1] - r, 2 * r, 2 * r);
        }
      };
      drawH(false);
      const r = RO * q[3];
      const isHi = i === hi && v.hi > 0;
      const u = o.twin ? 0 : smooth(f);
      if (u < 1) {
        ctx.globalAlpha = alpha * shade * (1 - u);
        ctx.drawImage(SPR.water, q[0] - r, q[1] - r, 2 * r, 2 * r);
      }
      if (u > 0) {
        ctx.globalAlpha = alpha * shade * u * (isHi ? 1 - v.hi : 1) * (v.hi > 0 && !isHi ? mix(1, 0.42, v.hi) : 1);
        ctx.drawImage(SPR.ice, q[0] - r, q[1] - r, 2 * r, 2 * r);
      }
      if (isHi) {
        ctx.globalAlpha = alpha * v.hi;
        ctx.drawImage(SPR.hot, q[0] - r * 1.08, q[1] - r * 1.08, 2.16 * r, 2.16 * r);
        out.hi = [q[0], q[1], r];
      }
      drawH(true);
    }
    ctx.restore();
    // The highlighted molecule's four bonds, drawn on top, one after another.
    if (!o.twin && v.hiBonds > 0) {
      const H0 = pts.find((p) => p.i === hi);
      ctx.save();
      ctx.lineCap = "round";
      hiBonds.forEach((b, k) => {
        const u = clamp(v.hiBonds * 4 - k);
        if (u <= 0) return;
        const o2 = pts.find((p) => p.i === (b.i === hi ? b.j : b.i));
        const x = mix(H0.q[0], o2.q[0], u);
        const y = mix(H0.q[1], o2.q[1], u);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "rgba(127,230,255,0.35)";
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.moveTo(H0.q[0], H0.q[1]);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.strokeStyle = "#e9fcff";
        ctx.lineWidth = 7;
        ctx.stroke();
        if (u >= 1) {
          ctx.globalAlpha = alpha * 0.9;
          ctx.strokeStyle = ICE;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(o2.q[0], o2.q[1], RO * o2.q[3] + 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      ctx.restore();
    }
    if (!o.twin && v.hi > 0) {
      const [x, y, r] = out.hi;
      ctx.save();
      ctx.globalAlpha = alpha * v.hi;
      ctx.strokeStyle = ICE;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, r + 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // The ring of six, traced around the channel nearest the middle.
    if (!o.twin && v.ring > 0) {
      const pts6 = [];
      for (let k = 0; k < 6; k++) {
        const ang = Math.PI / 2 + (k * Math.PI) / 3;
        pts6.push(P(ring.x + 0.57735 * Math.cos(ang), ring.y + 0.57735 * Math.sin(ang), ice.D - 0.3));
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineJoin = "round";
      const total = v.ring * 6;
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(pts6[0][0], pts6[0][1]);
        for (let k = 1; k <= 6; k++) {
          const u = clamp(total - (k - 1));
          if (u <= 0) break;
          const a = pts6[k - 1];
          const b = pts6[k % 6];
          ctx.lineTo(mix(a[0], b[0], u), mix(a[1], b[1], u));
        }
      };
      path();
      ctx.strokeStyle = "rgba(127,230,255,0.35)";
      ctx.lineWidth = 22;
      ctx.stroke();
      path();
      ctx.strokeStyle = "#dffaff";
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.restore();
      out.ring = P(ring.x, ring.y, ice.D / 2);
    }
    out.gap = P(ring.x, ring.y, ice.D / 2);
    if (v.box > 0) {
      const c = box(P, h, alpha * v.box, colour, true);
      if (!o.twin) out.box = c;
      else out.twinBox = c;
    }
    return P;
  }

  // ── The glass ──────────────────────────────────────────────────────────────
  function glass(g, liquid, items, opts = {}) {
    const { x0, x1, top, bottom, level } = g;
    const cx = (x0 + x1) / 2;
    const rx = (x1 - x0) / 2;
    const ry = rx * 0.11;
    const a = g.a;
    ctx.save();
    ctx.globalAlpha = a;
    // A pool of light on the floor under the glass.
    const pool = ctx.createRadialGradient(cx, bottom + 10, 0, cx, bottom + 10, rx * 1.5);
    pool.addColorStop(0, liquid.pool);
    pool.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.ellipse(cx, bottom + 14, rx * 1.5, ry * 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // The back of the glass: its inner wall, faintly lit.
    const wall = ctx.createLinearGradient(x0, 0, x1, 0);
    wall.addColorStop(0, "rgba(255,255,255,0.10)");
    wall.addColorStop(0.18, "rgba(255,255,255,0.025)");
    wall.addColorStop(0.82, "rgba(255,255,255,0.02)");
    wall.addColorStop(1, "rgba(255,255,255,0.08)");
    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.ellipse(cx, top, rx, ry, 0, Math.PI, 0);
    ctx.lineTo(x1, bottom);
    ctx.ellipse(cx, bottom, rx, ry, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, top, rx, ry, 0, Math.PI, 0);
    ctx.stroke();
    // The liquid's body.
    const body = ctx.createLinearGradient(0, level, 0, bottom);
    body.addColorStop(0, liquid.top);
    body.addColorStop(1, liquid.deep);
    const liquidPath = () => {
      ctx.beginPath();
      ctx.ellipse(cx, level, rx - 4, ry, 0, Math.PI, 0, true);
      ctx.lineTo(x1 - 4, bottom);
      ctx.ellipse(cx, bottom, rx - 4, ry, 0, 0, Math.PI);
      ctx.closePath();
    };
    ctx.fillStyle = body;
    liquidPath();
    ctx.fill();
    // Light through the liquid: soft caustic bands on the back wall, drifting.
    if (liquid.caustic) {
      ctx.save();
      liquidPath();
      ctx.clip();
      ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < 5; k++) {
        const x = x0 + ((k * 0.23 + 0.05 + 0.02 * Math.sin(opts.t * 0.7 + k * 2)) % 1) * (x1 - x0);
        const gr = ctx.createLinearGradient(x - 40, 0, x + 40, 0);
        gr.addColorStop(0, "rgba(127,230,255,0)");
        gr.addColorStop(0.5, `rgba(127,230,255,${0.05 + 0.03 * Math.sin(opts.t * 1.3 + k)})`);
        gr.addColorStop(1, "rgba(127,230,255,0)");
        ctx.fillStyle = gr;
        ctx.fillRect(x - 40, level, 80, bottom - level);
      }
      ctx.restore();
    }
    // The surface, seen from a little above.
    ctx.fillStyle = liquid.surface;
    ctx.beginPath();
    ctx.ellipse(cx, level, rx - 4, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ripples on the surface.
    for (const rp of opts.ripples ?? []) {
      if (rp.age < 0 || rp.age > 1.6) continue;
      const u = rp.age / 1.6;
      const rr = mix(rp.r0, rx - 8, Math.sqrt(u));
      ctx.strokeStyle = `rgba(220,245,255,${0.55 * (1 - u)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, level, rr, ry * (rr / rx), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // What floats or sinks in it, then the liquid in front of whatever is under the surface.
    for (const item of items) {
      item.draw();
      ctx.save();
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.rect(x0, level, x1 - x0, bottom - level + ry);
      ctx.clip();
      ctx.fillStyle = liquid.front;
      item.outline();
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = a;
    // The surface's front lip and its bright line.
    ctx.strokeStyle = liquid.line;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, level, rx - 4, ry, 0, 0, Math.PI);
    ctx.stroke();
    // The glass in front: walls, rim and bottom, with long highlights.
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, top, rx, ry, 0, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, bottom, rx, ry, 0, 0, Math.PI);
    ctx.lineWidth = 5;
    ctx.stroke();
    for (const [x, w, al] of [
      [x0 + 2, 5, 0.75],
      [x1 - 2, 5, 0.6],
      [x0 + rx * 0.22, 14, 0.13],
      [x0 + rx * 0.3, 4, 0.18],
      [x1 - rx * 0.16, 9, 0.1],
    ]) {
      const gr = ctx.createLinearGradient(0, top, 0, bottom);
      gr.addColorStop(0, `rgba(255,255,255,${al})`);
      gr.addColorStop(0.5, `rgba(255,255,255,${al * 0.45})`);
      gr.addColorStop(1, `rgba(255,255,255,${al})`);
      ctx.fillStyle = gr;
      ctx.fillRect(x - w / 2, top, w, bottom - top);
    }
    ctx.restore();
  }

  // A cube: front face, top and right side, ice or wax.
  function cube(cx, top, s, kind, alpha, t) {
    const x0 = cx - s / 2;
    const d = s * 0.16;
    const lift = d * 0.62;
    const outline = () => {
      ctx.beginPath();
      ctx.moveTo(x0, top);
      ctx.lineTo(x0 + d, top - lift);
      ctx.lineTo(x0 + s + d, top - lift);
      ctx.lineTo(x0 + s + d, top + s - lift);
      ctx.lineTo(x0 + s, top + s);
      ctx.lineTo(x0, top + s);
      ctx.closePath();
    };
    const draw = () => {
      ctx.save();
      ctx.globalAlpha = alpha;
      const isIce = kind === "ice";
      // Front face.
      const f = ctx.createLinearGradient(x0, top, x0 + s, top + s);
      if (isIce) {
        f.addColorStop(0, "rgba(235,252,255,0.78)");
        f.addColorStop(0.45, "rgba(150,228,250,0.42)");
        f.addColorStop(1, "rgba(90,190,230,0.62)");
      } else {
        f.addColorStop(0, "#fff3dc");
        f.addColorStop(1, "#e9cfa1");
      }
      ctx.fillStyle = f;
      ctx.fillRect(x0, top, s, s);
      // Top and side.
      ctx.fillStyle = isIce ? "rgba(240,253,255,0.85)" : "#fff8ea";
      ctx.beginPath();
      ctx.moveTo(x0, top);
      ctx.lineTo(x0 + d, top - lift);
      ctx.lineTo(x0 + s + d, top - lift);
      ctx.lineTo(x0 + s, top);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = isIce ? "rgba(70,170,215,0.6)" : "#d7b885";
      ctx.beginPath();
      ctx.moveTo(x0 + s, top);
      ctx.lineTo(x0 + s + d, top - lift);
      ctx.lineTo(x0 + s + d, top + s - lift);
      ctx.lineTo(x0 + s, top + s);
      ctx.closePath();
      ctx.fill();
      if (isIce) {
        // Frost inside: a cloudy core and a few fine cracks, fixed to the cube.
        const core = ctx.createRadialGradient(x0 + s * 0.5, top + s * 0.55, 0, x0 + s * 0.5, top + s * 0.55, s * 0.45);
        core.addColorStop(0, "rgba(255,255,255,0.42)");
        core.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = core;
        ctx.fillRect(x0, top, s, s);
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = Math.max(1, s / 180);
        ctx.beginPath();
        ctx.moveTo(x0 + s * 0.2, top + s * 0.3);
        ctx.lineTo(x0 + s * 0.42, top + s * 0.46);
        ctx.lineTo(x0 + s * 0.38, top + s * 0.7);
        ctx.moveTo(x0 + s * 0.42, top + s * 0.46);
        ctx.lineTo(x0 + s * 0.7, top + s * 0.4);
        ctx.moveTo(x0 + s * 0.62, top + s * 0.75);
        ctx.lineTo(x0 + s * 0.8, top + s * 0.62);
        ctx.stroke();
        // Bright rim on every edge.
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = Math.max(2, s / 70);
        outline();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x0, top);
        ctx.lineTo(x0 + s, top);
        ctx.lineTo(x0 + s + d, top - lift);
        ctx.moveTo(x0 + s, top);
        ctx.lineTo(x0 + s, top + s);
        ctx.stroke();
      } else {
        ctx.strokeStyle = "rgba(120,80,30,0.6)";
        ctx.lineWidth = 3;
        outline();
        ctx.stroke();
      }
      ctx.restore();
    };
    return { draw, outline };
  }

  const LIQ = {
    water: { top: "rgba(70,150,255,0.30)", deep: "rgba(20,70,190,0.55)", surface: "rgba(160,215,255,0.28)", front: "rgba(40,110,230,0.30)", line: "rgba(200,238,255,0.9)", pool: "rgba(63,140,255,0.35)", caustic: true },
    wax: { top: "rgba(240,150,40,0.78)", deep: "rgba(190,95,20,0.9)", surface: "rgba(255,200,120,0.85)", front: "rgba(225,130,35,0.72)", line: "rgba(255,215,150,0.95)", pool: "rgba(232,137,26,0.3)", caustic: false },
  };

  // The ice cube's top in the hero glass at time t: let go under water at t0, it rises, overshoots and bobs to rest
  // where the physics puts it (a damped oscillation about the floating height).
  const restTop = (g) => g.level - (1 - UNDER) * g.s;
  function heroTop(g, t) {
    const eq = restTop(g);
    const u = t - g.t0;
    if (g.rest) return eq + 4 * Math.sin(1.6 * t) * 0.5;
    return eq + (g.bottom - 18 - g.s - eq) * Math.exp(-1.18 * u) * Math.cos(1.745 * u) + 2 * Math.sin(1.6 * t);
  }
  // When the cube first breaks the surface (its top crosses the waterline).
  function breakTime(g) {
    for (let u = 0; u < 3; u += 0.005) if (heroTop({ ...g, t0: 0 }, u) < g.level) return g.t0 + u;
    return 0;
  }

  // ── A frame ────────────────────────────────────────────────────────────────
  function draw(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const cam = L.cam;
    ctx.setTransform(cam.z, 0, 0, cam.z, cam.x * (1 - cam.z), cam.y * (1 - cam.z));

    // The hero glass.
    const g = L.hero;
    if (g.a > 0.001) {
      const top = heroTop(g, t);
      // Water level: it stands higher by the volume under water (the glass is a cylinder, the cube a cube).
      const R = (g.x1 - g.x0) / 2;
      const sub = clamp(top + g.s - g.level, 0, g.s);
      const levelNow = g.level - ((sub - UNDER * g.s) * g.s * g.s) / (Math.PI * R * R);
      const tb = breakTime(g);
      const c = cube((g.x0 + g.x1) / 2, top, g.s, "ice", g.a * g.cubeA, t);
      ctx.save();
      ctx.globalAlpha = 1 - g.dim;
      glass({ ...g, level: levelNow }, LIQ.water, [c], {
        t,
        ripples: [
          { age: t - tb, r0: g.s * 0.6 },
          { age: t - tb - 0.35, r0: g.s * 0.6 },
          { age: t - (tb + 1.78), r0: g.s * 0.62 },
        ],
      });
      ctx.restore();
      // Bubbles from where the cube was let go.
      ctx.save();
      for (let k = 0; k < 9; k++) {
        const b0 = g.t0 + k * 0.09;
        const age = t - b0;
        if (age < 0 || age > 1.6) continue;
        const y = g.bottom - 60 - age * age * 260 - age * 120;
        if (y < levelNow + 8) continue;
        const x = (g.x0 + g.x1) / 2 + Math.sin(k * 2.1 + age * 6) * 14 + (k - 4) * 22;
        ctx.globalAlpha = g.a * (1 - age / 1.6) * 0.8;
        ctx.strokeStyle = "rgba(220,245,255,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 4 + (k % 3) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      out.heroTop = top;
      out.heroLevel = levelNow;
    }

    // The two glasses.
    const p = L.pair;
    if (p.a > 0.001) {
      const S2 = 170;
      const WG = { x0: 84, x1: 444, top: 420, bottom: 1120, level: 560, a: p.a };
      const IG = { x0: 550, x1: 910, top: 420, bottom: 1120, level: 560, a: p.a };
      // The wax block: let go at the surface, it sinks through the thick melt and settles on the bottom.
      const u = clamp((t - p.waxT0) / 3.2);
      const fall = 1 - Math.pow(1 - u, 2.2);
      const settle = u >= 1 ? 0 : 0;
      const waxTop = mix(WG.level - S2 * 0.35, WG.bottom - 16 - S2, fall) + settle;
      out.waxTop = waxTop;
      glass(WG, LIQ.wax, [cube(264, waxTop, S2, "wax", p.a, t)], { t });
      const iceTop = IG.level - (1 - UNDER) * S2 + 2 * Math.sin(1.7 * t);
      glass(IG, LIQ.water, [cube(730, iceTop, S2, "ice", p.a, t)], { t });
    }

    // The molecules (and the lens that dives into them).
    const v = L.mol;
    const lens = L.lens;
    if (lens.a > 0.001 && lens.r > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(lens.x, lens.y, lens.r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = `rgba(8,14,26,${0.92 * lens.a * clamp(1 - (lens.r - 300) / 900)})`;
      ctx.fillRect(0, 0, W, H);
      molecules({ ...v, a: lens.a * Math.max(v.a, 1) }, t);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = lens.a;
      ctx.strokeStyle = "rgba(127,230,255,0.9)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(lens.x, lens.y, lens.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lens.x, lens.y, lens.r - 9, Math.PI * 1.05, Math.PI * 1.55);
      ctx.stroke();
      ctx.restore();
    } else if (v.a > 0.001) {
      molecules(v, t);
    }
    // The liquid twin, left column.
    const tw = L.twin;
    if (tw.a > 0.001) molecules({ ...v, cx: tw.cx, cy: tw.cy, s: tw.s, tilt: tw.tilt ?? 0, phi: tw.phi ?? 0, box: 1, hi: 0, hiBonds: 0, ring: 0, chan: 0 }, t, { a: tw.a, freeze: 0, jiggle: 1, bonds: 0, twin: true, colour: WATER });

    // Bars of density.
    const b = L.bars;
    if (b.a > 0.001) bars(b, t);

    // The close-up: a big cube floating in a wide glass, with its ruler.
    const m = L.macro;
    if (m.a > 0.001) macro(m, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // Columns of s07 (x 50..470 and 510..930 on a floor at 1130) become bars on a baseline at 1100, 600 px a g/cm3.
  const PX_G = 600;
  const COL_L = { x0: 50, x1: 470, y0: 1130 - 606 / GROW, y1: 1130 };
  const COL_I = { x0: 510, x1: 930, y0: 1130 - 606, y1: 1130 };
  const BAR_W = { x0: 200, x1: 440, y0: 1100 - PX_G * 1.0, y1: 1100 };
  const BAR_I = { x0: 560, x1: 800, y0: 1100 - PX_G * RHO_ICE, y1: 1100 };
  function rectMix(a, b, u) {
    return { x0: mix(a.x0, b.x0, u), x1: mix(a.x1, b.x1, u), y0: mix(a.y0, b.y0, u), y1: mix(a.y1, b.y1, u) };
  }
  function bars(b, t) {
    const u = smooth(b.morph);
    ctx.save();
    ctx.globalAlpha = b.a;
    // Baseline.
    ctx.strokeStyle = "rgba(237,237,240,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mix(50, 150, u), mix(1130, 1100, u));
    ctx.lineTo(mix(930, 870, u), mix(1130, 1100, u));
    ctx.stroke();
    // The water bar's top, carried across as a dashed line so the gap shows.
    for (const [r, col, deep, lift] of [
      [rectMix(COL_L, BAR_W, u), "rgba(63,140,255,", "rgba(25,70,180,", 0],
      [rectMix(COL_I, BAR_I, u), "rgba(127,230,255,", "rgba(40,140,190,", b.lift],
    ]) {
      const dy = -lift;
      const gr = ctx.createLinearGradient(0, r.y0 + dy, 0, r.y1 + dy);
      gr.addColorStop(0, `${col}${0.75 * b.fill})`);
      gr.addColorStop(1, `${deep}${0.45 * b.fill})`);
      ctx.fillStyle = gr;
      ctx.fillRect(r.x0, r.y0 + dy, r.x1 - r.x0, r.y1 - r.y0);
      ctx.strokeStyle = `${col}0.95)`;
      ctx.lineWidth = 4;
      ctx.strokeRect(r.x0, r.y0 + dy, r.x1 - r.x0, r.y1 - r.y0);
      // A bright top edge.
      ctx.fillStyle = `rgba(255,255,255,${0.85 * b.fill})`;
      ctx.fillRect(r.x0 + 6, r.y0 + dy, r.x1 - r.x0 - 12, 3);
    }
    if (b.fill > 0.5) {
      ctx.globalAlpha = b.a * (b.fill - 0.5) * 2 * clamp(1 - b.lift / 200) * clamp((u - 0.85) / 0.15);
      ctx.setLineDash([14, 12]);
      ctx.strokeStyle = "rgba(237,237,240,0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(BAR_W.x0, BAR_W.y0);
      ctx.lineTo(BAR_I.x1 + 30, BAR_W.y0);
      ctx.stroke();
    }
    ctx.restore();
  }

  // s10: water at y 640 in a wide glass; a 440 px cube with UNDER of it under; a ruler of ten marks.
  const M9 = { x0: 40, x1: 1040, top: 150, bottom: 1290, level: 640, s: 400, cx: 430 };
  function macro(m, t) {
    const s = M9.s;
    const settle = Math.exp(-(t - m.t0) * 2.2) * Math.cos((t - m.t0) * 5) * 26;
    const top = M9.level - (1 - UNDER) * s + (t >= m.t0 ? settle : 26) + 1.5 * Math.sin(1.4 * t);
    const c = cube(M9.cx, top, s, "ice", m.a, t);
    ctx.save();
    ctx.globalAlpha = m.a;
    glass({ ...M9, a: m.a }, LIQ.water, [c], { t, ripples: [{ age: t - m.t0, r0: s * 0.6 }] });
    ctx.restore();
    // The ruler: ten marks up the cube's left face, lit from the bottom.
    const x0 = M9.cx - s / 2;
    ctx.save();
    ctx.globalAlpha = m.a;
    for (let k = 0; k <= 10; k++) {
      const y = top + s - (k * s) / 10;
      const lit = clamp(m.ticks * 10 - k + 1);
      ctx.strokeStyle = lit > 0 ? `rgba(127,230,255,${0.35 + 0.65 * lit})` : "rgba(255,255,255,0.35)";
      ctx.lineWidth = k % 5 === 0 ? 5 : 3.5;
      ctx.beginPath();
      ctx.moveTo(x0 + 6, y);
      ctx.lineTo(x0 + (k % 5 === 0 ? 62 : 40), y);
      ctx.stroke();
    }
    // The lit part of the ruler: a bar from the bottom up to the waterline, filling.
    const fillTo = mix(top + s, M9.level, clamp(m.ticks));
    ctx.fillStyle = "rgba(127,230,255,0.85)";
    ctx.fillRect(x0 + 6, fillTo, 7, top + s - fillTo);
    // The measure on the right: the waterline to the bottom of the cube.
    if (m.measure > 0) {
      const xm = M9.cx + s / 2 + s * 0.16 + 26;
      const y1 = top + s - 0.62 * s * 0.16;
      const y0 = M9.level;
      const yy = mix(y1, y0, smooth(m.measure));
      ctx.strokeStyle = ICE;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(xm, y1);
      ctx.lineTo(xm, yy);
      ctx.moveTo(xm - 14, y1);
      ctx.lineTo(xm + 14, y1);
      if (m.measure > 0.98) {
        ctx.moveTo(xm - 14, y0);
        ctx.lineTo(xm + 14, y0);
      }
      ctx.stroke();
      out.measure = [xm, (y0 + y1) / 2];
    }
    ctx.restore();
    out.macroTop = top;
  }

  return { L, draw, out, ice, restTop, breakTime, heroTop, BAR_W, BAR_I, COL_L, COL_I, M9 };
}
