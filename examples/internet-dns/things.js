// The real things of the miniature internet, each built from its parts in the template's matte blocks: your phone
// (a screen with an address bar, a page of a title, a picture and lines of text, a camera dot, a home bar), a house
// (walls, a gable roof with eaves, a door and windows), trees, a tiny faceless figure, a router (antennas, status
// lights, ports), server towers (drive bays with lights, vents, a lid that lifts), Wikimedia's data centre (a base,
// four racks of lights, corner posts and a roof) and the packets: the one saturated colour in the film.
import { PAL, C, mix, rgba, shade } from "./iso.js";

export function makeThings(P) {
  const g = P.g;
  const T = {};
  // A flat quad on a face of a block, in the block's own (x, y, z), filled.
  const quad = (V, pts, fill, alpha = 1, r = 0) => {
    g.save();
    g.globalAlpha *= alpha;
    g.fillStyle = fill;
    const sp = pts.map((q) => V.p(...q));
    if (r > 0) P.roundPath(sp, r);
    else P.path(sp);
    g.fill();
    g.restore();
  };
  T.quad = quad;
  // A rectangle on the front-left face (the plane y = yy) from x0 to x1 and z0 to z1.
  const onLeft = (V, yy, x0, x1, z0, z1, fill, alpha = 1, r = 0) => quad(V, [[x0, yy, z0], [x1, yy, z0], [x1, yy, z1], [x0, yy, z1]], fill, alpha, r);
  // ... and on the front-right face (the plane x = xx) from y0 to y1.
  const onRight = (V, xx, y0, y1, z0, z1, fill, alpha = 1, r = 0) => quad(V, [[xx, y1, z0], [xx, y0, z0], [xx, y0, z1], [xx, y1, z1]], fill, alpha, r);
  T.onLeft = onLeft;
  T.onRight = onRight;

  // ── Your phone, standing: 2.0 wide, 0.34 deep, h tall; its screen faces the lower left. rows: how much of the
  // page is on it (0 to 7, fractional: the newest row fading in). typed: the address bar holds the name.
  T.phone = (V, x, y, o = {}) => {
    const h = o.h ?? 3.6, z = o.z ?? 0, rows = o.rows ?? 0;
    const f = h / 3.6;
    P.block(V, x, y, z, 2.0, 0.34, h, PAL.peri, {
      alpha: o.alpha,
      r: 0.18,
      faces: () => {
        const yy = y + 0.34;
        // The glass: white, a little cooler at the top.
        onLeft(V, yy, x + 0.13, x + 1.87, z + 0.2 * f, z + h - 0.2 * f, o.dark ? "#3a3f63" : "#fbfcff", 1, 0.12 * V.u);
        // The camera dot over the screen.
        const [cx, cy] = V.p(x + 1.0, yy, z + h - 0.11 * f);
        g.fillStyle = "#3b4170";
        g.beginPath();
        g.ellipse(cx, cy, 0.05 * V.u, 0.05 * V.u, 0, 0, Math.PI * 2);
        g.fill();
        if (o.dark) return;
        // The address bar, and the name in it once typed.
        const bar = (a, b) => onLeft(V, yy, x + 0.3, x + 1.7, z + a * f, z + b * f, "#e8ebfa", 1, 0.08 * V.u);
        bar(3.0, 3.24);
        // The name typed in the address bar, lettered on the glass.
        if (o.addr) P.faceText(V, "left", [x + 0.4, yy, z + 3.06 * f], o.addr, { size: 0.15 * f, weight: 700, colour: "#4a4f73" });
        else if (o.typed) onLeft(V, yy, x + 0.42, x + 0.42 + 1.1 * Math.min(1, o.typed), z + 3.09 * f, z + 3.15 * f, "#9aa1c6", 1);
        // Contacts: a list of people, each a coloured dot and a name, the first one tapped.
        if (o.contacts > 0) {
          for (let i = 0; i < 6; i++) {
            const zc = 2.62 - i * 0.38;
            const tap = i === 0 ? o.tap ?? 0 : 0;
            if (tap) onLeft(V, yy, x + 0.22, x + 1.78, z + (zc - 0.16) * f, z + (zc + 0.17) * f, rgba(PAL.peri, 0.3 * tap), 1, 0.04 * V.u);
            onLeft(V, yy, x + 0.32, x + 0.52, z + (zc - 0.1) * f, z + (zc + 0.1) * f, [PAL.peach, PAL.mint, PAL.butter, PAL.peri, PAL.peach, PAL.mint][i], o.contacts, 0.1 * V.u);
            onLeft(V, yy, x + 0.66, x + (i % 2 ? 1.3 : 1.6), z + (zc - 0.04) * f, z + (zc + 0.04) * f, i === 0 ? PAL.ink : "#c3c8e6", o.contacts);
          }
          return;
        }
        // The page, row by row, top to bottom: a title, a picture, then lines of text.
        const row = (i) => Math.max(0, Math.min(1, rows - i));
        if (row(0)) onLeft(V, yy, x + 0.32, x + 1.28, z + 2.6 * f, z + 2.78 * f, PAL.ink, row(0), 0.04 * V.u);
        if (row(1)) {
          onLeft(V, yy, x + 0.32, x + 1.68, z + 1.66 * f, z + 2.4 * f, "#d6f3e6", row(1), 0.06 * V.u);
          onLeft(V, yy, x + 0.5, x + 0.95, z + 1.66 * f, z + 2.0 * f, PAL.mint, row(1));
          onLeft(V, yy, x + 0.86, x + 1.5, z + 1.66 * f, z + 2.12 * f, mix(PAL.mint, PAL.peri, 0.25), row(1));
          const [sx, sy] = V.p(x + 1.38, yy, z + 2.2 * f);
          g.save();
          g.globalAlpha *= row(1);
          g.fillStyle = PAL.butter;
          g.beginPath();
          g.arc(sx, sy, 0.085 * V.u, 0, Math.PI * 2);
          g.fill();
          g.restore();
        }
        for (let i = 2; i < 7; i++) {
          if (!row(i)) continue;
          const zc = 1.4 - (i - 2) * 0.22;
          onLeft(V, yy, x + 0.32, x + (i % 3 === 1 ? 1.16 : 1.68), z + (zc - 0.04) * f, z + (zc + 0.04) * f, "#bfc5e6", row(i), 0.03 * V.u);
        }
        // The home bar.
        onLeft(V, yy, x + 0.75, x + 1.25, z + 0.3 * f, z + 0.35 * f, "#c9cee8", 1, 0.02 * V.u);
      },
    });
    // The side button on the right edge.
    onRight(V, x + 2.0, y + 0.08, y + 0.26, z + 2.5 * f, z + 2.95 * f, shade(PAL.peri).deep, (o.alpha ?? 1) * V.alpha);
  };
  // The point on top of the phone where things leave it and arrive.
  T.phoneTop = (x, y, o = {}) => [x + 1.0, y + 0.17, (o.z ?? 0) + (o.h ?? 3.6)];

  // ── A phone lying flat on its back (the contacts): the screen faces up.
  T.phoneFlat = (V, x, y, o = {}) => {
    P.block(V, x, y, 0, 2.0, 3.6, 0.25, PAL.peri, { r: 0.2, alpha: o.alpha });
    g.save();
    g.globalAlpha = V.alpha * (o.alpha ?? 1);
    const top = (a, b, c, d, fill, alpha = 1) => quad(V, [[a, c, 0.25], [b, c, 0.25], [b, d, 0.25], [a, d, 0.25]], fill, alpha, 0.1 * V.u);
    top(x + 0.14, x + 1.86, y + 0.16, y + 3.44, "#fbfcff");
    // A contact list: a row per name, the first one tapped.
    for (let i = 0; i < 5; i++) {
      const yy = y + 0.5 + i * 0.56;
      const tap = i === 0 ? o.tap ?? 0 : 0;
      if (tap) top(x + 0.22, x + 1.78, yy - 0.18, yy + 0.32, rgba(PAL.peri, 0.25 * tap));
      const [cx, cy] = V.p(x + 0.45, yy + 0.07, 0.25);
      g.fillStyle = [PAL.peach, PAL.mint, PAL.butter, PAL.peri, PAL.peach][i];
      g.beginPath();
      g.ellipse(cx, cy, 0.15 * V.u * 1.1, 0.15 * V.u * 0.65, 0, 0, Math.PI * 2);
      g.fill();
      top(x + 0.75, x + (i % 2 ? 1.4 : 1.65), yy, yy + 0.12, i === 0 ? PAL.ink : "#c3c8e6");
    }
    g.restore();
  };

  // ── A house: walls, a gable roof (ridge along x) with eaves, a door and windows.
  T.house = (V, x, y, w = 2.4, h = 1.5, o = {}) => {
    const a = o.alpha ?? 1;
    const wall = o.colour ?? PAL.butter, roof = o.roof ?? PAL.peach;
    const r = w * 0.42, e = w * 0.07, x1 = x + w, y1 = y + w, ym = y + w / 2;
    P.block(V, x, y, 0, w, w, h, wall, {
      alpha: a,
      r: 0.05,
      faces: () => {
        // The door and two windows on the front, a window on the side.
        onLeft(V, y1, x + w * 0.16, x + w * 0.34, 0, h * 0.62, mix(roof, PAL.ink, 0.25), 1, 0.03 * V.u);
        onLeft(V, y1, x + w * 0.5, x + w * 0.66, h * 0.36, h * 0.7, "#ffffff", 1, 0.02 * V.u);
        onLeft(V, y1, x + w * 0.74, x + w * 0.9, h * 0.36, h * 0.7, "#ffffff", 1, 0.02 * V.u);
        onLeft(V, y1, x + w * 0.5, x + w * 0.66, h * 0.36, h * 0.48, rgba(PAL.peri, 0.35));
        onLeft(V, y1, x + w * 0.74, x + w * 0.9, h * 0.36, h * 0.48, rgba(PAL.peri, 0.35));
        onRight(V, x1, y + w * 0.35, y + w * 0.65, h * 0.34, h * 0.72, mix("#ffffff", shade(wall).right, 0.25), 1, 0.02 * V.u);
      },
    });
    const sh = shade(roof), ws = shade(wall);
    g.save();
    g.globalAlpha = a * V.alpha;
    // The gable end: a triangle of wall on the right face.
    quad(V, [[x1, y, h], [x1, y1, h], [x1, ym, h + r]], ws.right);
    // The back slope (a sliver from here), the front slope, and the roof's thickness along the gable.
    quad(V, [[x - e, y - e, h], [x1 + e, y - e, h], [x1 + e, ym, h + r], [x - e, ym, h + r]], sh.top);
    // (drawn plain first: at small sizes the rounded outline alone leaves a hairline seam over the wall's top)
    quad(V, [[x - e, y1 + e, h - 0.02], [x1 + e, y1 + e, h - 0.02], [x1 + e, ym, h + r], [x - e, ym, h + r]], sh.left);
    quad(V, [[x - e, y1 + e, h - 0.02], [x1 + e, y1 + e, h - 0.02], [x1 + e, ym, h + r], [x - e, ym, h + r]], sh.left, 1, 0.03 * V.u);
    quad(V, [[x1 + e, y1 + e, h - 0.02], [x1 + e, ym, h + r], [x1 + e, ym, h + r - 0.12], [x1 + e, y1 + e, h - 0.14]], sh.deep);
    P.line(V, [[x - e, ym, h + r], [x1 + e, ym, h + r]], sh.edge, Math.max(1, 0.03 * V.U), { alpha: 0.9 });
    g.restore();
    // A chimney on the back slope.
    if (o.chimney !== false) P.block(V, x + w * 0.66, y + w * 0.12, h + r * 0.3, w * 0.13, w * 0.13, r * 0.62, roof, { alpha: a, contact: 0, r: 0.03 });
  };

  // ── A tree: a trunk and a mint cube of leaves.
  T.tree = (V, x, y, s = 1, ht = 1.3, o = {}) => {
    const tw = s * 0.2;
    P.block(V, x + s / 2 - tw / 2, y + s / 2 - tw / 2, 0, tw, tw, ht * 0.32, "#d4a99a", { alpha: o.alpha, r: 0.02 });
    P.block(V, x, y, ht * 0.28, s, s, ht * 0.72, o.colour ?? PAL.mint, { alpha: o.alpha, r: 0.16, contact: 0 });
  };

  // ── A tiny faceless figure, standing at (x, y): legs, a body, arms, a head. About 1.6 units tall.
  T.person = (V, x, y, o = {}) => {
    const a = (o.alpha ?? 1) * V.alpha;
    if (a <= 0.002) return;
    const s = o.s ?? 1;
    P.softShadow(V, x + 0.12 * s, y + 0.06 * s, 0, 0.42 * s, 0.2 * (o.alpha ?? 1));
    const [bx, by0] = V.p(x, y, 0);
    const by = by0 - (o.bob ?? 0) * V.u;
    const u = V.u * s;
    g.save();
    g.globalAlpha = a;
    const capsule = (cx, top, w, hgt, fill, dark) => {
      const grad = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
      grad.addColorStop(0, mix(fill, "#ffffff", 0.18));
      grad.addColorStop(0.55, fill);
      grad.addColorStop(1, dark);
      g.fillStyle = grad;
      g.beginPath();
      g.roundRect(cx - w / 2, top, w, hgt, w / 2);
      g.fill();
    };
    const legs = o.legs ?? "#41466b";
    capsule(bx - 0.085 * u, by - 0.58 * u, 0.14 * u, 0.6 * u, legs, "#2d3047");
    capsule(bx + 0.085 * u, by - 0.58 * u, 0.14 * u, 0.6 * u, legs, "#2d3047");
    const shirt = o.shirt ?? PAL.peach;
    capsule(bx - 0.27 * u, by - 1.12 * u, 0.12 * u, 0.5 * u, shirt, shade(shirt).deep);
    capsule(bx + 0.27 * u, by - 1.12 * u, 0.12 * u, 0.5 * u, shirt, shade(shirt).deep);
    capsule(bx, by - 1.18 * u, 0.44 * u, 0.7 * u, shirt, shade(shirt).right);
    const head = o.head ?? "#f6c9b6";
    const grad = g.createRadialGradient(bx - 0.06 * u, by - 1.42 * u, 0.02 * u, bx, by - 1.36 * u, 0.2 * u);
    grad.addColorStop(0, mix(head, "#ffffff", 0.35));
    grad.addColorStop(1, mix(head, "#c98b7c", 0.35));
    g.fillStyle = grad;
    g.beginPath();
    g.arc(bx, by - 1.37 * u, 0.19 * u, 0, Math.PI * 2);
    g.fill();
    // Hair: a darker cap on the back of the head (still no face).
    g.fillStyle = "#4a4f73";
    g.beginPath();
    g.arc(bx + 0.02 * u, by - 1.4 * u, 0.19 * u, Math.PI * 1.05, Math.PI * 1.95);
    g.fill();
    g.restore();
  };

  // ── A router: a periwinkle box with two antennas, a row of status lights and ports. lights: 0..1, how lit.
  T.router = (V, x, y, o = {}) => {
    const s = o.s ?? 1.4, hh = (o.h ?? 1.0) * (o.rise ?? 1);
    if (hh <= 0.001) return;
    const a = o.alpha ?? 1;
    P.block(V, x, y, o.z ?? 0, s, s, hh, o.colour ?? PAL.peri, {
      alpha: a,
      lit: o.lit,
      faces: () => {
        const z0 = o.z ?? 0;
        for (let i = 0; i < 4; i++) {
          const lx = x + s * (0.2 + i * 0.13);
          const on = o.lights ?? 0;
          const col = on > 0 && i === (o.port ?? 0) ? mix("#a8b2ff", PAL.accent, on) : on > 0 ? mix("#a8b2ff", PAL.mint, on * 0.8) : "#a8b2ff";
          onLeft(V, y + s, lx, lx + s * 0.07, z0 + hh * 0.55, z0 + hh * 0.66, col, 1, 0.01 * V.u);
        }
        for (let i = 0; i < 3; i++) {
          const py = y + s * (0.2 + i * 0.22);
          onRight(V, x + s, py, py + s * 0.14, z0 + hh * 0.22, z0 + hh * 0.42, "#3b4170", 0.85, 0.01 * V.u);
        }
      },
    });
    if (o.antennas === false) return;
    // The antennas stand on the top's back half.
    const top = (o.z ?? 0) + hh;
    const al = 0.75 * (o.rise ?? 1);
    for (const [ax, ay] of [[x + s * 0.18, y + s * 0.3], [x + s * 0.3, y + s * 0.18]]) {
      P.line(V, [[ax, ay, top], [ax, ay, top + al]], "#3b4170", Math.max(1.5, 0.07 * V.U), { alpha: a });
      const [tx, ty] = V.p(ax, ay, top + al);
      g.save();
      g.globalAlpha = a * V.alpha;
      g.fillStyle = "#3b4170";
      g.beginPath();
      g.arc(tx, ty, Math.max(1.5, 0.06 * V.u), 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  };

  // ── A server tower: drive bays with a light each on the front, vents on the side, a lid. lift: how far the lid
  // is raised (units). lit: the top glows. blink: a function (i) -> 0..1 for each bay's light.
  T.server = (V, x, y, w, d, h, colour, o = {}) => {
    const a = o.alpha ?? 1;
    const lid = o.lid ?? 0.26;
    const body = (h - lid) * (o.rise ?? 1);
    if (body <= 0.001) return;
    const sh = shade(colour);
    P.block(V, x, y, 0, w, d, body, colour, {
      alpha: a,
      faces: () => {
        const n = Math.max(1, Math.floor((body - 0.25) / 0.38));
        for (let i = 0; i < n; i++) {
          const zb = body - 0.2 - (i + 1) * 0.38 + 0.08;
          onLeft(V, y + d, x + 0.16, x + w - 0.16, zb, zb + 0.24, mix(colour, "#ffffff", 0.32), 1, 0.03 * V.u);
          onLeft(V, y + d, x + 0.26, x + w * 0.55, zb + 0.1, zb + 0.14, sh.right, 0.55);
          const lv = o.blink ? o.blink(i) : 0.5;
          onLeft(V, y + d, x + w - 0.42, x + w - 0.28, zb + 0.07, zb + 0.17, mix("#ffffff", o.led ?? PAL.mint, 0.35 + 0.65 * lv), 1, 0.02 * V.u);
        }
        for (let i = 0; i < 4; i++) {
          const yy = y + d * (0.22 + i * 0.16);
          onRight(V, x + w, yy, yy + d * 0.05, body * 0.25, body * 0.8, sh.deep, 0.5);
        }
      },
    });
    const lift = o.lift ?? 0;
    // The inside, when the lid is raised: a white shelf of filed cards.
    if (lift > 0.02 && o.inside) o.inside(body);
    P.block(V, x - 0.06, y - 0.06, body + lift, w + 0.12, d + 0.12, lid * (o.rise ?? 1), colour, { alpha: a, lit: o.lit, contact: 0, r: 0.08 });
  };

  // ── A packet: a small cube in the accent, the one saturated colour.
  T.packet = (V, x, y, z, s = 0.55, o = {}) => {
    P.block(V, x - s / 2, y - s / 2, z, s, s, s, PAL.accent, { alpha: o.alpha, r: 0.12, contact: z <= 0.15 ? 0.7 : 0, lit: o.lit });
    if (o.sticker) {
      // A white label stuck on its front face.
      const yy = y + s / 2;
      onLeft(V, yy, x - s * 0.32, x + s * 0.32, z + s * 0.28, z + s * 0.72, "#ffffff", (o.alpha ?? 1) * o.sticker, 0.03 * V.u);
      onLeft(V, yy, x - s * 0.22, x + s * 0.12, z + s * 0.56, z + s * 0.62, PAL.accent, (o.alpha ?? 1) * o.sticker);
      onLeft(V, yy, x - s * 0.22, x + s * 0.2, z + s * 0.4, z + s * 0.46, "#c3c8e6", (o.alpha ?? 1) * o.sticker);
    }
  };

  // ── Wikimedia's caching data centre in Singapore (eqsin), on its own slab: a base, four racks of lights between
  // corner posts, a roof that lifts. rise: 0..1 (it grows out of the ground). lid: 0..1 (the roof raised 2.2 units).
  T.dataCentre = (V, o = {}) => {
    const r = o.rise ?? 1, lid = o.lid ?? 0, a = o.alpha ?? 1;
    if (r <= 0.001) return;
    const PALE = "#e6e9ff";
    const top = 0.3 + 2.5 * r;
    P.block(V, -2.4, -2.4, 0, 4.8, 4.8, 0.3 * Math.min(1, r * 3), PALE, { alpha: a });
    // The back walls, seen from inside: the front is cut away so the racks show.
    g.save();
    g.globalAlpha = a * V.alpha;
    quad(V, [[-2.4, -2.4, 0.3], [2.4, -2.4, 0.3], [2.4, -2.4, top], [-2.4, -2.4, top]], "#eef0ff", 0.95);
    quad(V, [[-2.4, 2.4, 0.3], [-2.4, -2.4, 0.3], [-2.4, -2.4, top], [-2.4, 2.4, top]], "#dfe3fb", 0.95);
    for (let k = 1; k < 4; k++) {
      P.line(V, [[-2.4 + k * 1.2, -2.4, 0.3], [-2.4 + k * 1.2, -2.4, top]], "#d4d9f6", 2, { alpha: a });
      P.line(V, [[-2.4, -2.4 + k * 1.2, 0.3], [-2.4, -2.4 + k * 1.2, top]], "#c9cff3", 2, { alpha: a });
    }
    g.restore();
    const post = (px, py) => P.block(V, px, py, 0.3, 0.22, 0.22, 2.5 * r, PALE, { alpha: a, contact: 0, r: 0.05 });
    post(-2.4, -2.4);
    post(2.18, -2.4);
    post(-2.4, 2.18);
    // Four rows of racks, their fronts (rows of servers, each with its lights) facing the lower left.
    for (let i = 0; i < 4; i++) {
      const ry = -1.95 + i * 1.08;
      const rh = 2.2 * r;
      P.block(V, -1.55, ry, 0.3, 3.1, 0.62, rh, PAL.peri, {
        alpha: a,
        lit: o.pulse,
        faces: () => {
          const yy = ry + 0.62;
          for (let row = 0; row < 6; row++) {
            const zb = 0.3 + rh * (0.08 + row * 0.15);
            T.onLeft(V, yy, -1.42, 1.42, zb, zb + rh * 0.11, mix(PAL.peri, "#ffffff", 0.28), 1, 0.01 * V.u);
            for (let c = 0; c < 3; c++) {
              const on = o.blink ? o.blink(i, row, c) : (i + row + c) % 3 === 0 ? 1 : 0.2;
              const xx = 0.55 + c * 0.26;
              T.onLeft(V, yy, xx, xx + 0.13, zb + rh * 0.03, zb + rh * 0.075, mix("#c3cbff", on > 0.5 ? PAL.accent : PAL.mint, 0.3 + 0.7 * on), 1);
            }
            T.onLeft(V, yy, -1.3, 0.2, zb + rh * 0.045, zb + rh * 0.06, shade(PAL.peri).right, 0.6);
          }
        },
      });
    }
    post(2.18, 2.18);
    // The roof.
    P.block(V, -2.5, -2.5, top + lid * 2.2, 5.0, 5.0, 0.35 * r, PALE, { alpha: a, contact: 0, r: 0.08, lit: o.pulse });
  };

  // ── A home Wi-Fi router: a white box with two antennas and status lights; the home's one public address lives
  // here, and it hands what comes back to the phone. waves: 0..1 how strongly its Wi-Fi arcs pulse; t: the time.
  T.wifi = (V, x, y, o = {}) => {
    const a = o.alpha ?? 1, t = o.t ?? 0;
    const w = 1.0, d = 0.66, h = 0.34;
    P.block(V, x, y, 0, w, d, h, "#f2f4ff", {
      shades: { top: "#ffffff", left: "#e6e9fd", right: "#c9cff3", edge: "#ffffff", deep: "#b7bfee" },
      alpha: a,
      r: 0.1,
      faces: () => {
        for (let i = 0; i < 4; i++) {
          const on = o.lights ? o.lights(i) : 0.5 + 0.5 * Math.sin(t * 7 + i * 1.9);
          const lx = x + 0.18 + i * 0.17;
          onLeft(V, y + d, lx, lx + 0.08, h * 0.45, h * 0.62, mix("#c9cff0", i === 3 && o.hot ? PAL.accent : PAL.mint, on), 1, 0.01 * V.u);
        }
      },
    });
    for (const [ax, ay] of [[x + 0.16, y + 0.12], [x + w - 0.16, y + 0.12]]) {
      P.line(V, [[ax, ay, h], [ax - 0.05, ay, h + 0.62]], "#8a93d8", Math.max(1.5, 0.08 * V.U), { alpha: a });
    }
    // Wi-Fi: arcs rising off the router, one after another.
    const [cx, cy] = V.p(x + w / 2, y + d / 2, h + 0.7);
    for (let i = 0; i < 3; i++) {
      const ph = (((o.phase ?? t * 0.9) + i / 3) % 1 + 1) % 1;
      const r = (0.25 + ph * 0.75) * V.u;
      g.save();
      g.globalAlpha = a * V.alpha * (o.waves ?? 1) * Math.sin(Math.PI * ph) * 0.8;
      g.strokeStyle = PAL.peri;
      g.lineWidth = Math.max(1.5, 0.06 * V.u);
      g.lineCap = "round";
      g.beginPath();
      g.arc(cx, cy, r, Math.PI * 1.22, Math.PI * 1.78);
      g.stroke();
      g.restore();
    }
  };

  // ── A server rack cabinet: rows of units on its front, each with lights; its name lettered across the top.
  T.rack = (V, x, y, w, d, h, colour, o = {}) => {
    const a = o.alpha ?? 1;
    const hh = h * (o.rise ?? 1);
    if (hh <= 0.001) return;
    const sh = shade(colour);
    P.block(V, x, y, o.z ?? 0, w, d, hh, colour, {
      alpha: a,
      lit: o.lit,
      r: 0.06,
      faces: () => {
        const z0 = o.z ?? 0, top = z0 + hh - (o.label ? 0.42 : 0.12);
        const rows = Math.max(1, Math.floor((top - z0 - 0.12) / 0.22));
        for (let i = 0; i < rows; i++) {
          const zb = top - (i + 1) * 0.22;
          onLeft(V, y + d, x + 0.1, x + w - 0.1, zb + 0.03, zb + 0.17, mix(colour, "#ffffff", 0.3), 1, 0.01 * V.u);
          const on = o.blink ? o.blink(i) : (i % 3 === 0 ? 0.9 : 0.25);
          onLeft(V, y + d, x + w - 0.26, x + w - 0.16, zb + 0.07, zb + 0.13, mix("#ffffff", o.led ?? PAL.mint, 0.3 + 0.7 * on), 1);
        }
        onRight(V, x + w, y + 0.1, y + d - 0.1, z0 + 0.15, top, sh.deep, 0.25, 0.01 * V.u);
        if (o.label) P.faceText(V, "left", [x + w / 2, y + d, z0 + hh - 0.12], o.label, { size: o.labelSize ?? 0.26, colour: o.labelColour ?? PAL.ink, align: "center", alpha: a });
      },
    });
  };

  // ── The root: thirteen named server cabinets, a to m, in a ring (each name is run as many copies worldwide).
  T.rootRing = (V, o = {}) => {
    const a = o.alpha ?? 1;
    const items = [];
    for (let i = 0; i < 13; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI * 2) / 13;
      const cx = Math.cos(ang) * 1.22, cy = Math.sin(ang) * 1.22;
      items.push({ cx, cy, letter: "abcdefghijklm"[i], i });
    }
    items.sort((p, q) => p.cx + p.cy - (q.cx + q.cy));
    P.block(V, -0.55, -0.55, 0, 1.1, 1.1, 0.16, "#e9ecff", { alpha: a, r: 0.3 });
    for (const it of items) {
      const s = 0.42;
      T.rack(V, it.cx - s / 2, it.cy - s / 2, s, s, 1.0, PAL.peri, { alpha: a, lit: o.lit, label: it.letter, labelSize: 0.3, labelColour: "#ffffff", blink: (j) => 0.5 + 0.5 * Math.sin((o.t ?? 0) * 4 + it.i + j) });
    }
  };

  // ── The .org registry: a pale building with columns and a pediment, the servers that hold the list of every .org.
  T.registry = (V, o = {}) => {
    const a = o.alpha ?? 1, lit = o.lit ?? 0;
    const W = 2.4, Dd = 2.0, H = 1.5;
    P.block(V, -1.2, -1.0, 0, W, Dd, 0.22, "#f0e3df", { alpha: a, r: 0.04 });
    P.block(V, -1.05, -0.9, 0.22, W - 0.3, Dd - 0.55, H, PAL.peach, {
      alpha: a,
      lit,
      faces: () => {
        // The registry's servers seen through its windows.
        for (let i = 0; i < 4; i++) {
          const xx = -0.85 + i * 0.48;
          onLeft(V, -0.9 + Dd - 0.55, xx, xx + 0.26, 0.55, 1.4, mix(PAL.peach, PAL.ink, 0.35), 1, 0.02 * V.u);
          onLeft(V, -0.9 + Dd - 0.55, xx + 0.05, xx + 0.21, 1.1, 1.16, PAL.mint, 0.9 * (0.5 + 0.5 * Math.sin((o.t ?? 0) * 5 + i)));
        }
      },
    });
    // Columns along the front.
    for (let i = 0; i < 5; i++) {
      const xx = -1.0 + i * 0.5;
      P.block(V, xx, 0.78, 0.22, 0.16, 0.16, H, "#fff7f4", { alpha: a, contact: 0, r: 0.2 });
    }
    // The pediment (a prism along x) and its lettering.
    const z = 0.22 + H, x0 = -1.2, x1 = 1.2, y0 = -1.0, y1 = 1.0, ym = 0;
    g.save();
    g.globalAlpha = a * V.alpha;
    const sh = shade("#fff1ec");
    quad(V, [[x0, y0, z], [x1, y0, z], [x1, ym, z + 0.6], [x0, ym, z + 0.6]], sh.top);
    quad(V, [[x1, y0, z], [x1, y1, z], [x1, ym, z + 0.6]], sh.right);
    quad(V, [[x0, y1, z], [x1, y1, z], [x1, ym, z + 0.6], [x0, ym, z + 0.6]], mix(sh.left, PAL.peach, 0.25), 1, 0.02 * V.u);
    g.restore();
    P.block(V, x0, y0, z - 0.12, W, 2.0, 0.12, "#fff1ec", { alpha: a, contact: 0, r: 0.03 });
    P.faceText(V, "left", [-0.62, 1.0, z + 0.07], ".org", { size: 0.36, colour: PAL.ink, alpha: a });
  };

  // ── A cell tower: a lattice mast with panel antennas near the top, on a small base.
  T.cellTower = (V, x, y, h = 3.0, o = {}) => {
    const a = o.alpha ?? 1;
    P.block(V, x - 0.3, y - 0.3, 0, 0.6, 0.6, 0.2, "#e8ebfb", { alpha: a });
    const legs = [[-0.16, -0.16], [0.16, -0.16], [0.16, 0.16], [-0.16, 0.16]];
    for (const [lx, ly] of legs) P.line(V, [[x + lx * 1.4, y + ly * 1.4, 0.2], [x + lx * 0.4, y + ly * 0.4, h]], "#8a93d8", Math.max(1, 0.06 * V.U), { alpha: a });
    for (let k = 1; k < 5; k++) {
      const z = 0.2 + (k * (h - 0.4)) / 5, f = 1.4 - (k / 5) * 1.0;
      P.line(V, [[x - 0.16 * f, y + 0.16 * f, z], [x + 0.16 * f, y + 0.16 * f, z + 0.3]], "#a5acea", Math.max(1, 0.04 * V.U), { alpha: a });
    }
    for (const [px, py] of [[0.12, -0.05], [-0.05, 0.12], [0.1, 0.1]]) P.block(V, x + px - 0.06, y + py - 0.06, h - 0.55, 0.12, 0.12, 0.42, "#ffffff", { alpha: a, contact: 0, r: 0.1 });
    P.block(V, x - 0.05, y - 0.05, h, 0.1, 0.1, 0.35, PAL.peri, { alpha: a, contact: 0, r: 0.2 });
  };

  // ── A small data centre: a long pale hall with rows of rack windows and cooling units on the roof.
  T.miniDC = (V, x, y, w, d, h, o = {}) => {
    const a = o.alpha ?? 1;
    P.block(V, x, y, 0, w, d, h, "#e3e7ff", {
      alpha: a,
      faces: (f) => {
        for (let zz = 0.25; zz < h - 0.25; zz += 0.42) T.onLeft(V, f.y1, x + 0.15, x + w - 0.15, zz, zz + 0.22, mix(PAL.peri, "#ffffff", 0.25), 1, 0.01 * V.u);
        for (let zz = 0.25; zz < h - 0.25; zz += 0.42) T.onRight(V, f.x1, y + 0.15, y + d - 0.15, zz, zz + 0.22, mix(PAL.peri, "#ffffff", 0.05), 1, 0.01 * V.u);
      },
    });
    for (let i = 0; i < 3; i++) P.block(V, x + 0.25 + i * (w - 0.6) / 3, y + d * 0.3, h, 0.45, 0.45, 0.22, "#cfd5f7", { alpha: a, contact: 0, r: 0.1 });
  };

  // ── A cable landing station: a small hut where the sea cable comes ashore.
  T.station = (V, x, y, o = {}) => {
    const a = o.alpha ?? 1;
    P.block(V, x, y, 0, 1.0, 0.9, 0.7, "#f7f8ff", {
      alpha: a,
      faces: (f) => T.onLeft(V, f.y1, x + 0.3, x + 0.6, 0, 0.45, mix(PAL.mint, PAL.ink, 0.15), 1, 0.02 * V.u),
    });
    P.block(V, x - 0.06, y - 0.06, 0.7, 1.12, 1.02, 0.14, PAL.mint, { alpha: a, contact: 0, r: 0.05, lit: o.lit });
  };

  // ── A dial on the ground: a stopwatch for the cache's countdown. left: the share of the time still to run.
  T.dial = (V, x, y, R, left, o = {}) => {
    const a = (o.alpha ?? 1) * V.alpha;
    if (a <= 0.002) return;
    const h = 0.32;
    // The body: a short cylinder, its top an iso ellipse.
    const [bx, by] = V.p(x, y, 0), [tx, ty] = V.p(x, y, h);
    const rx = R * 1.2247 * V.u, ry = R * 0.7071 * V.u;
    P.softShadow(V, x + 0.2, y + 0.1, 0, R * 1.3, 0.2);
    g.save();
    g.globalAlpha = a;
    g.fillStyle = shade(PAL.mint).right;
    g.beginPath();
    g.ellipse(bx, by, rx, ry, 0, 0, Math.PI);
    g.lineTo(tx - rx, ty);
    g.ellipse(tx, ty, rx, ry, 0, Math.PI, 0, true);
    g.closePath();
    g.fill();
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.ellipse(tx, ty, rx * 0.94, ry * 0.94, 0, 0, Math.PI * 2);
    g.fill();
    // The time still to run, as a mint sector from twelve o'clock (the dial's "up" is the ground's -y).
    const pt = (ang, rr) => {
      const gx = x + Math.sin(ang) * rr, gy = y - Math.cos(ang) * rr;
      return V.p(gx, gy, h);
    };
    if (left > 0.001) {
      g.fillStyle = rgba(PAL.mint, 0.85);
      g.beginPath();
      g.moveTo(tx, ty);
      const n = 48;
      for (let i = 0; i <= n; i++) g.lineTo(...pt((i / n) * left * Math.PI * 2, R * 0.86));
      g.closePath();
      g.fill();
    }
    // Ticks every 30 s (twelve of them) and the hand.
    g.strokeStyle = PAL.ink;
    g.lineCap = "round";
    for (let i = 0; i < 12; i++) {
      g.lineWidth = Math.max(1, 0.035 * V.u);
      g.beginPath();
      g.moveTo(...pt((i / 12) * Math.PI * 2, R * 0.78));
      g.lineTo(...pt((i / 12) * Math.PI * 2, R * 0.9));
      g.stroke();
    }
    g.lineWidth = Math.max(2, 0.07 * V.u);
    g.beginPath();
    g.moveTo(tx, ty);
    g.lineTo(...pt(left * Math.PI * 2, R * 0.75));
    g.stroke();
    g.fillStyle = PAL.ink;
    g.beginPath();
    g.ellipse(tx, ty, 0.07 * V.u * 1.22, 0.07 * V.u * 0.71, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  return T;
}
