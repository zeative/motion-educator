// "How does the internet know where to go?" in the Isometric template. Built from storyboard.json: every time below
// is a shot's start or end, or a word of the take (voice/voice.json, the film's own clock).
//
// One soft pastel miniature world on a 2D canvas (iso.js), always at the same isometric angle: the camera only pans
// and zooms, never turns, and never dissolves. Each diorama sits where storyboard.build.py drew it (Iso(ox, oy, U)),
// and the smaller ones live inside the bigger: your home is a tile of the city, an island of the DNS district and the
// corner of the road network; the crossroads is a tile of the city; Wikimedia's data centre stands on the Singapore
// shore of the sea. So every move is a pan, a push in or a pull out through one world, and things rise out of the
// ground or sink back into it. The real lookup is the story: en.wikipedia.org asked from Australia, the resolver
// asking the root, the .org registry and Wikimedia's own name server ns0 in turn, 103.102.166.224 (Wikimedia's eqsin
// site in Singapore), the request as a packet labelled to that number from your home's (example) address, passed
// router to router and along a sea cable, and the page coming back as 36 packets the same way. Every value is a
// function of t. Every event the sound lands on is logged in window.__events (render.mjs --events), for cues.build.py.
import { createFilm } from "../../kit/engine/motion.js";
import { View, painter, PAL, mix, rgba, clamp, ramp, lerp, inOut, out3, back, pop } from "./iso.js";
import { makeThings } from "./things.js";

const storyboard = await (await fetch("storyboard.json")).json();
const take = await (await fetch("voice/voice.json")).json();
const film = await createFilm({ storyboard });
const { $, shots: s, duration: DUR } = film;
film.captions({ style: "pop" });

const g = $("#world").getContext("2d");
const P = painter(g);
const T = makeThings(P);

// ── The numbers (storyboard.build.py, facts f4, f7, f8, f11, f12, f14) ──────────────────────────────────────────
const NAME = "en.wikipedia.org";
const IP = "103.102.166.224"; // en.wikipedia.org from Australia (f4)
const OCTETS = IP.split(".");
const HOME_IP = "203.0.113.24"; // your home's address: an example from the documentation block 203.0.113.0/24 (f14)
const TTL = 180; // seconds (f8)
const PACKETS = Math.ceil(52254 / (1500 - 20 - 20)); // the Main Page's text, 1,460 bytes a packet: 36 (f12)
const CABLE_KM = 4600; // INDIGO-West, Perth to Singapore (f11)
if (PACKETS !== 36 || OCTETS.some((o) => +o > 255)) throw new Error("the fact sheet's numbers changed");

// ── The take: when each word is said, in the film's time ────────────────────────────────────────────────────────
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
const said = (id, word, n = 0) => {
  const hits = take.film[id].words.filter((w) => norm(w[2]) === word);
  if (!hits[n]) throw new Error(`${id}: the take has no "${word}"`);
  return hits[n][0];
};
const S = (id) => s[id].start;

// ── Sound events, logged as the picture is planned ──────────────────────────────────────────────────────────────
const events = (window.__events = []);
const ev = (kind, at, note, more = {}) => {
  events.push({ kind, at: +at.toFixed(3), end: +(more.end ?? at).toFixed(3), note, ...more });
  return at;
};

// ── The camera ──────────────────────────────────────────────────────────────────────────────────────────────────
// A camera is { k, fx, fy, sx, sy }: zoom k about the board point (fx, fy), which is shown at (sx, sy).
const ID = () => ({ k: 1, fx: 960, fy: 540, sx: 960, sy: 540 });
const apply = (c, [x, y]) => [(x - c.fx) * c.k + c.sx, (y - c.fy) * c.k + c.sy];
const look = (k, lx, ly) => ({ k, fx: lx, fy: ly, sx: 960, sy: 540 }); // the board point (lx, ly) in the middle
const toLook = (c) => ({ k: c.k, lx: c.fx + (960 - c.sx) / c.k, ly: c.fy + (540 - c.sy) / c.k });
const zoomed = (c, f) => ({ ...c, k: c.k * f });
// A move from one framing to another: the zoom is eased in steps of the same ratio, and the point the camera goes to
// slides straight to the middle of the frame, so a push in or a pull out reads as one camera travelling.
const move = (c0, c1, e) => {
  const b = toLook(c1);
  const S0 = apply(c0, [b.lx, b.ly]);
  return { k: Math.exp(lerp(Math.log(c0.k), Math.log(c1.k), e)), fx: b.lx, fy: b.ly, sx: lerp(S0[0], 960, e), sy: lerp(S0[1], 540, e) };
};
// A pan: A leaves by d while B arrives from -d (both on the same camera move).
const pan = (e, d, c0 = ID(), c1 = ID()) => [
  { ...c0, sx: c0.sx - d[0] * e, sy: c0.sy - d[1] * e },
  { ...c1, sx: c1.sx + d[0] * (1 - e), sy: c1.sy + d[1] * (1 - e) },
];
// The camera of a smaller world set into a bigger one: child point (0, 0, 0) sits at the parent's (cx, cy, cz),
// one child unit is f parent units.
const nested = (parent, child, cx, cy, cz, f) => {
  const [sx, sy] = parent.p(cx, cy, cz);
  return { k: (parent.k * parent.U * f) / child.U, fx: child.ox, fy: child.oy, sx, sy };
};
const set = (V, cam, alpha = 1) => {
  Object.assign(V.cam, cam);
  V.alpha = alpha;
  return V;
};
const drift = (t, a, b, amount, f = [960, 540]) => ({ k: 1 + amount * ramp(t, a, b), fx: f[0], fy: f[1], sx: f[0], sy: f[1] });
const bump = (t, a, d = 0.35) => (t < a || t > a + d ? 0 : Math.sin((Math.PI * (t - a)) / d));
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hop = (a, b, f, h) => [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2] ?? 0, b[2] ?? 0, f) + h * 4 * f * (1 - f)];
// Along a path of [time, x, y, z] keys at time t (linear between keys, so the pace is steady). arcs: a lift for a
// key's segment (keys[i][4]) makes that leg a hop.
const along = (keys, t) => {
  if (t <= keys[0][0]) return keys[0].slice(1, 4);
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, ...a] = keys[i - 1], [t1, ...b] = keys[i];
      const f = (t - t0) / (t1 - t0);
      const p = [0, 1, 2].map((j) => lerp(a[j], b[j], f));
      if (b[3]) p[2] += b[3] * 4 * f * (1 - f);
      return p;
    }
  }
  return keys.at(-1).slice(1, 4);
};
// A view of something that pops up (r 0 to 1, with its overshoot) or sinks away: scaled about its own origin.
const scaled = (V, r) => {
  const v = new View(V.ox, V.oy, V.U * Math.max(0, r), V.cam);
  v.alpha = V.alpha;
  return v;
};

// ── The camera's moves ──────────────────────────────────────────────────────────────────────────────────────────
const X = {
  city: [3.4, 4.6], // s01 -> s02: pull out until your slab is the corner of the city
  street: [5.45, 6.25], // s02 -> s03: push in to the crossroads tile beside your house; the rest of the city sinks
  bill: [9.1, 9.8], // s04: down from the router's table to the number, standing on the street
  dns: [11.1, 11.75], // s04 -> s05: pan up the street's axis to the DNS district
  pair: [13.9, 14.4], // s05 -> s06: closer on your phone and the resolver
  back: [17.2, 17.95], // s06 -> s07: pull out over the whole district
  toRoot: [20.22, 20.8], // s08: to the root servers
  toOrg: [22.28, 22.78], // s09: to the .org registry
  toNs: [23.36, 23.9], // s09: to Wikimedia's name server
  cache: [26.6, 27.28], // s10 -> s11: push in on the resolver
  home2: [29.45, 30.25], // s11 -> s12: the answer flies home and the camera follows it into your house
  roads: [33.12, 33.98], // s12 -> s13: pull out; the road network unfolds around your slab
  router: [35.25, 35.85], // s13 -> s14: push in on the first two routers
  sea: [37.2, 37.95], // s14 -> s15: pull out and travel east with the packet, over the network to the coast
  dc: [40.62, 41.16], // s15 -> s16: push in on the Singapore shore
  ret1: [43.45, 43.9], // s17: pull out from the data centre over the sea
  ret2: [43.9, 44.3], // ... along the sea back to Australia
  ret3: [44.3, 44.7], // ... across to the road network
  ret4: [44.7, 45.15], // ... and in to your house
  recap: [45.96, 46.46], // s18 -> s19: lift up to the recap
  loop: [49.24, 50.1], // s19 -> s20: back down to the opening picture
};
const prog = (t, key, ease = inOut) => ease(ramp(t, ...X[key]));
const WHOOSH = { city: 0, street: 0.2, bill: -0.2, dns: 0.3, back: 0, toRoot: 0.3, toOrg: 0.3, toNs: 0.2, cache: -0.2, home2: -0.4, roads: 0, router: 0.2, sea: 0.4, dc: 0.3, ret1: 0, ret2: -0.4, ret3: -0.4, ret4: -0.2, recap: -0.3, loop: 0.3 };
for (const [key, pn] of Object.entries(WHOOSH)) ev("whoosh", (X[key][0] + X[key][1]) / 2, `camera: ${key}`, { end: X[key][1], pan: pn, small: ["toRoot", "toOrg", "toNs", "bill", "ret2", "ret3"].includes(key) });

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// HOME: your phone, your Wi-Fi router, your house, two trees, you
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const HOME = new View(960, 560, 76);
const HOME_T = 0.62; // the slab's thickness
const ENTER = said("s01", "enter"), PAGE = said("s01", "page"), NAME0 = said("s01", "name") - 0.1;
const PHONE = [-3.2, 1.3];
const PTOP = T.phoneTop(...PHONE); // (-2.2, 1.47, 3.6)
const WIFI = [-0.3, -0.6]; // the router's corner (between your phone and your house); its top is at z 0.34
const WTOP = [WIFI[0] + 0.5, WIFI[1] + 0.33, 0.34];
const ME = [2.8, 3.0]; // where you stand
const REQ = ENTER + 0.04; // the request cube leaves the phone
ev("key", ENTER, "Enter: the phone dips");
ev("pop", REQ + 0.1, "the request slides out of the phone");
ev("blip", REQ + 0.52, "the request reaches your Wi-Fi router", { soft: true });
ev("tick", REQ + 0.86, "the request lands on the road", { soft: true });
for (let i = 0; i < 7; i++) ev("tick", PAGE + i * 0.06, `page row ${i + 1}`, { soft: true, under: i > 0 });
// s12
const ARRIVE = X.home2[1] - 0.12; // the answer reaches the phone
const R0 = S("s12") + 0.72, LABEL = said("s12", "labelled"), TO = said("s12", "number");
ev("card", ARRIVE, "the number arrives at your phone");
ev("pop", R0 + 0.1, "the packet pops up from the phone");
ev("slap", LABEL + 0.02, "the label slaps on");
ev("tag", LABEL + 0.4, "'your home: 203.0.113.24'", { soft: true });
ev("tick", TO, "the number is underlined");
// s20
const CLEAR = X.loop[1] - 0.05, TYPE = [X.loop[1] + 0.2, DUR - 0.6];
for (let i = 0; i < NAME.length; i++) ev("key", lerp(...TYPE, i / NAME.length), `typed '${NAME[i]}'`, { soft: true, under: true });
// The Wi-Fi arcs and your sway are loop-aligned: a whole number of cycles in the film.
const WAVE_PHASE = (t) => (t / DUR) * 38;

function homeState(t) {
  const st = { rows: 0, addr: NAME, dip: 0, typed: NAME, caret: false, nameTag: 0, youTag: 0, cubes: [], contacts: 0, tap: 0, hot: 0 };
  if (t < 11) {
    // s01: the name is typed; Enter; the request leaves by the Wi-Fi router; the page appears.
    st.nameTag = st.youTag = 1 - ramp(t, X.city[0], X.city[0] + 0.22);
    st.caret = t < ENTER && t % 1 < 0.5;
    st.dip = -0.055 * (ramp(t, ENTER, ENTER + 0.06) - back(ramp(t, ENTER + 0.06, ENTER + 0.42), 2.4));
    st.rows = 7 * ramp(t, PAGE, PAGE + 0.42);
    const u = t - REQ;
    if (u > 0 && u < 2.0) {
      const OUTP = [-0.75, 1.47, 2.6];
      let p, a = 1;
      if (u < 0.28) p = [lerp(-1.75, OUTP[0], back(clamp(u / 0.28), 2.2)), OUTP[1], OUTP[2]];
      else if (u < 0.52) p = hop(OUTP, [WTOP[0], WTOP[1], WTOP[2]], (u - 0.28) / 0.24, 0.4);
      else if (u < 0.86) p = hop([WTOP[0], WTOP[1], WTOP[2]], [0.4, 1.0, 0], (u - 0.52) / 0.34, 0.7);
      else {
        const x = 0.4 + (u - 0.86) * 6.0;
        p = [x, 1.0, x > 4 ? -(x - 4) * 1.6 : 0];
        a = 1 - clamp((x - 4.0) / 0.7);
      }
      st.hot = bump(t, REQ + 0.45, 0.4);
      if (a > 0) st.cubes.push({ p, s: 0.55 * clamp(u / 0.12), a });
    }
  } else if (t < 29.45) {
    // s05 to s11, an island of the DNS district: the phone shows your contacts while the voice compares them.
    st.contacts = ramp(t, CONTACTS - 0.3, CONTACTS) * (1 - ramp(t, X.back[0], X.back[0] + 0.3));
    st.tap = bump(t, TAP - 0.05, 0.7);
  } else if (t < 44) {
    // s12: the number arrives; the request rises above the phone and gets its label (s13 sends it, from the roads).
    const r = back(ramp(t, R0, R0 + 0.46), 2.0);
    if (t >= R0 && t < OUT[0][0]) {
      st.cubes.push({ p: [PTOP[0], PTOP[1], PTOP[2] + 0.85 * r + 0.05 * Math.sin((t - R0) * 3.2)], s: 0.9 * clamp((t - R0) / 0.14), a: 1, sticker: ramp(t, LABEL, LABEL + 0.08) });
    }
  } else if (t < 47) {
    // s18: the page's packets come in along the road, through your Wi-Fi router, into the phone.
    const n = landed(t);
    st.rows = (7 * n) / PACKETS;
    for (let i = 0; i < PACKETS; i++) {
      const q = homeLeg(i, t);
      if (q) st.cubes.push(q);
    }
    st.hot = n > 0 && n < PACKETS ? 1 : 0;
  } else {
    // s20: the page clears from the bottom, then the name is typed again; the caret blinks into the loop.
    st.nameTag = pop(t, TYPE[0] - 0.22, 0.36);
    st.youTag = pop(t, TYPE[0] - 0.05, 0.4);
    st.rows = 7 * (1 - ramp(t, CLEAR, CLEAR + 0.5));
    const n = Math.floor(NAME.length * ramp(t, ...TYPE) + 1e-6);
    st.typed = NAME.slice(0, n);
    st.addr = st.typed;
    st.caret = n < NAME.length ? true : ((t - DUR) % 1 + 1) % 1 < 0.5;
  }
  return st;
}

function drawHome(V, t, o = {}) {
  const st = homeState(t);
  P.slab(V, -4, -4, 8, 8, HOME_T, { shadow: o.shadow ?? 1 });
  P.road(V, -1.2, 1.0, 4.0, 1.0, 0.46);
  const L = [];
  L.push([-6.2, () => T.tree(V, -3.6, -3.6, 1.0, 1.3)]);
  L.push([-5.4, () => T.tree(V, -2.4, -3.7, 0.8, 1.9)]);
  L.push([-0.45, () => T.house(V, 0.6, -3.4, 2.4, 1.5)]);
  L.push([-0.7, () => T.phone(V, ...PHONE, { rows: st.rows, z: st.dip, addr: st.addr, contacts: st.contacts, tap: st.tap })]);
  L.push([WIFI[0] + WIFI[1] + 0.8, () => T.wifi(V, ...WIFI, { t, phase: WAVE_PHASE(t), hot: st.hot, waves: 1 })]);
  L.push([ME[0] + ME[1], () => T.person(V, ...ME, { bob: 0.012 * Math.sin((2 * Math.PI * 17 * t) / DUR) })]);
  for (const c of st.cubes) {
    const front = c.p[1] > 1.64 || c.p[0] > -1.2 || c.p[2] > 3.6;
    const onWifi = c.p[0] > WIFI[0] && c.p[0] < WIFI[0] + 1.0 && c.p[1] > WIFI[1] - 0.2 && c.p[2] > 0.25;
    L.push([onWifi ? WIFI[0] + WIFI[1] + 1.5 : front ? c.p[0] + c.p[1] + 0.5 : -0.75, () => {
      if (c.s > 0.01) T.packet(V, c.p[0], c.p[1], c.p[2], c.s, { alpha: c.a, sticker: c.sticker });
    }]);
  }
  L.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f());
  if (o.tags === false) return st;
  if (st.nameTag > 0.001) {
    const tag = P.tag(V, PTOP[0], PTOP[1], PTOP[2] + st.dip, st.typed, { lift: 46, size: 44, pop: st.nameTag, alpha: clamp(st.nameTag * 2), caret: st.caret });
    // s01, "you type a name": the name is underlined as it is said, and the line flashes on Enter (gone by 1.8 s, so
    // the loop's first and last frames still match).
    const u = t < 3 ? ramp(t, NAME0, NAME0 + 0.5) * (1 - ramp(t, ENTER + 0.12, ENTER + 0.35)) : 0;
    if (tag && u > 0.001) {
      const pad = 0.575 * 44 * V.k, x0 = tag.cx - tag.w / 2 + pad, len = (tag.w - 2 * pad) * ramp(t, NAME0, NAME0 + 0.5);
      g.save();
      g.globalAlpha = u * V.alpha;
      g.fillStyle = PAL.accent;
      g.fillRect(x0, tag.cy + tag.h / 2 - 9 * V.k, len, Math.max(2, 4 * V.k * (1 + 0.6 * bump(t, ENTER, 0.25))));
      g.restore();
    }
  }
  if (st.youTag > 0.001) {
    const [fx, fy] = V.p(...ME);
    P.pill(fx, fy + 8 * V.k, "you, in Australia", { lift: -16, size: 32, k: V.k, pop: st.youTag, alpha: clamp(st.youTag * 2) * V.alpha });
  }
  return st;
}

// s12: the number the resolver sent, at your phone, then the packet's label: where it goes and where it comes from.
function drawHomeLabels(V, t) {
  const got = pop(t, ARRIVE, 0.36) * (1 - ramp(t, LABEL - 0.2, LABEL + 0.1));
  if (got > 0.001) P.tag(V, PTOP[0], PTOP[1], PTOP[2], `${NAME}  =  ${IP}`, { lift: 52, size: 36, pop: got, alpha: clamp(got * 2), colour: PAL.ink });
  const p = pop(t, LABEL, 0.4, 2.2);
  if (p <= 0.001) return;
  const fade = 1 - ramp(t, X.roads[0], X.roads[0] + 0.25);
  const rows = [
    { parts: [{ text: "to: " }, { text: IP, colour: PAL.accent }], under: ramp(t, TO, TO + 0.3), underPart: 1 },
    { parts: [{ text: "from: " }, { text: HOME_IP }, { text: "  your home", colour: mix(PAL.ink, PAL.paper, 0.4) }] },
    { text: "asks for: the page" },
  ];
  const [cx, cy] = V.p(PTOP[0] + 0.45, PTOP[1], PTOP[2] + 1.3);
  const card = P.card(V, 1120, 40, 700, rows, { pop: p, alpha: clamp(p * 3) * fade, row: 84 });
  if (card) P.leader([card.X, card.Y + 92 * V.k], [cx, cy], { alpha: clamp(p * 3) * V.alpha * fade });
  const r = pop(t, LABEL + 0.4, 0.4) * fade;
  if (r > 0.001) P.tag(V, WTOP[0], WTOP[1], WTOP[2] + 0.62, `your home: ${HOME_IP}`, { lift: 60, size: 32, pop: r, alpha: clamp(r * 2), dx: 150 });
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// CITY (s02): the miniature internet of homes, data centres and cell towers; your slab is its corner tile and the
// crossroads beside it is the next
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const CITY = new View(960, 480, 32);
const HOME_F = 0.6; // your 8-unit slab is a 4.8-unit tile of the city
const HOME_AT = [-9.6, 9.6];
const STREET_F = 4.8 / 7.2, STREET_AT = [-4.8, 9.6]; // the crossroads tile, beside your house
const TILE_T = HOME_T * HOME_F;
const KIND = [
  ["house", "dc", "tower", "house", "dc"],
  ["tower", "house", "house", "dc", "house"],
  ["dc", "house", "tower", "house", "tower"],
  ["house", "tower", "dc", "house", "house"],
  ["home", "street", "house", "dc", "tower"],
]; // KIND[gy][gx]
const HOUSE_COL = [[PAL.butter, PAL.peach], [PAL.mint, PAL.peri], [PAL.peach, PAL.peri], [PAL.butter, PAL.mint]];
const TILES = [];
for (let gx = 0; gx < 5; gx++)
  for (let gy = 0; gy < 5; gy++) {
    const kind = KIND[gy][gx];
    if (kind === "home") continue;
    const d = Math.hypot(gx, gy - 4);
    TILES.push({ gx, gy, kind, x: -12 + gx * 4.8, y: -12 + gy * 4.8, at: X.city[0] + 0.12 + d * 0.1, seed: gx * 5 + gy });
  }
const QUESTION = said("s02", "where");
const ASKED = [[1, 0], [3, 1], [0, 2], [2, 3], [3, 4]]; // which of the data centres?
ASKED.forEach((_, i) => ev("tick", QUESTION + i * 0.15, `question mark ${i + 1}`, { rise: i }));
for (let d = 1; d <= 5; d += 1.4) ev("pop", X.city[0] + 0.12 + d * 0.1 + 0.2, "city tiles rise", { soft: true, under: true });
ev("pop", X.street[0] + 0.2, "the city sinks away", { soft: true, under: true });

function drawCityTile(v, tile, r, t) {
  P.block(v, tile.x, tile.y, -TILE_T, 4.8, 4.8, TILE_T, "#f7f8ff", { contact: 0, r: 0.1, shades: undefined });
  const grow = back(ramp(t, tile.at + 0.12, tile.at + 0.55), 1.6);
  if (grow <= 0.001) return;
  const g2 = scaled(v.nest(tile.x + 2.4, tile.y + 2.4, 0, 1), grow);
  const [hc, rc] = HOUSE_COL[tile.seed % 4];
  if (tile.kind === "house") {
    T.house(g2, -1.4, -1.6, 2.4, 1.3, { colour: hc, roof: rc });
    T.tree(g2, 1.2, 0.9, 0.8, 1.2);
  } else if (tile.kind === "dc") {
    T.miniDC(g2, -1.7, -1.3, 3.4, 2.6, 1.3 + (tile.seed % 3) * 0.3);
  } else if (tile.kind === "tower") {
    T.cellTower(g2, 0.2, -0.2, 3.4);
    T.house(g2, -1.9, 0.6, 1.4, 0.9, { colour: hc, roof: rc, chimney: false });
  }
}
function drawCity(V, t, o = {}) {
  const sink = o.sink ?? 0;
  const risen = TILES.map((tile) => back(ramp(t, tile.at, tile.at + 0.5), 1.5));
  const all = risen.reduce((a, b) => a + b, 0) / TILES.length;
  P.softShadow(V, 0.8, 0.8, -3.5, 24 * 0.62, 0.3 * clamp(all) * (1 - sink), "#8f9cf0");
  const order = [...TILES.map((tile, i) => ({ ...tile, r: risen[i] })), { kind: "home", gx: 0, gy: 4 }].sort((a, b) => a.gx + a.gy - (b.gx + b.gy) || a.gx - b.gx);
  for (const tile of order) {
    if (tile.kind === "home") {
      // Your slab: it sinks away with the rest when the camera goes down to the crossroads.
      const hv = scaled(CITY.nest(...HOME_AT, 0, 1), 1 - sink);
      if (1 - sink <= 0.01) continue;
      set(HOME, nested(hv, HOME, 0, 0, 0, HOME_F), V.alpha);
      drawHome(HOME, t, { shadow: 1 - ramp(t, X.city[0], X.city[0] + 0.4), tags: t < X.city[0] + 0.3 });
      continue;
    }
    if (tile.kind === "street") {
      set(STREET, nested(V, STREET, ...STREET_AT, 0, STREET_F), V.alpha);
      drawStreet(STREET, t, { inCity: true, rise: tile.r });
      continue;
    }
    const r = tile.r * (1 - sink);
    if (r <= 0.001) continue;
    // Each tile rises (and later sinks) about its own centre: solid, never faded.
    const tv = scaled(V.nest(tile.x + 2.4, tile.y + 2.4, 0, 1), r);
    const local = { ...tile, x: -2.4, y: -2.4 };
    drawCityTile(tv, local, r, t);
  }
  if (sink > 0.5) return;
  ASKED.forEach(([gx, gy], i) => {
    const tile = TILES.find((q) => q.gx === gx && q.gy === gy);
    const p = pop(t, QUESTION + i * 0.15, 0.4) * (1 - ramp(t, X.street[0], X.street[0] + 0.2));
    if (p > 0) P.tag(V, tile.x + 2.4, tile.y + 2.4, 2.0, "?", { lift: 34, size: 48, pop: p, weight: 800, alpha: clamp(p * 2) });
  });
  const you = pop(t, X.city[1] - 0.25, 0.4) * (1 - ramp(t, X.street[0], X.street[0] + 0.2));
  if (you > 0) P.tag(V, -8.5, 8.3, 1.6, "you", { lift: 44, size: 36, pop: you, alpha: clamp(you * 2) });
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// STREET (s03, s04): the crossroads beside your house, its router and the router's table of numbers
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const STREET = new View(960, 650, 66);
const STREET_T = TILE_T / STREET_F;
const PANEL = [420, 70, 1080, 92];
const ROWS = [["103.102.166.*", "route A"], ["198.41.0.*", "route B"], ["208.80.154.*", "route C"]];
const ENDS = { A: [0.9, -4.05], B: [4.05, 0.9], C: [0.9, 4.05] }; // where each road leaves the crossroads
const NAMES_AT = said("s03", "names");
const SCAN = [6.92, NAMES_AT - 0.06];
const NUMS = said("s04", "numbers"), IPW = said("s04", "ip"), ADDR = said("s04", "addresses");
const BRACKETS = OCTETS.map((_, k) => IPW + 0.02 + k * 0.27);
const BOARD = { x0: -3.4, x1: 3.4, y: 2.75, z0: 0.3, z1: 2.65 }; // the sign the number stands on (its front face)
const BILLF = look(1.7, ...STREET.b(0, BOARD.y, 1.25)); // framed on the sign
ev("tick", SCAN[0], "the router reads the name", { soft: true });
ev("bonk", NAMES_AT, "the name bounces off: '?'");
ev("tick", NUMS - 0.2, "the first row is underlined");
ev("rise", NUMS + 0.15, "the sign with the number rises out of the street", { rise: 0 });
BRACKETS.forEach((b, k) => ev("tick", b + 0.08, `bracket ${k + 1}: 0-255`, { rise: k }));
ev("tag", ADDR + 0.02, "'IP address: 4 numbers, each 0 to 255'", { soft: true });

function rowsFor(t) {
  return ROWS.map(([num, route], i) => {
    const tint = 0.7 * bump(t, SCAN[0] + i * 0.15, 0.24);
    const under = i === 0 ? ramp(t, NUMS - 0.28, NUMS - 0.02) : 0;
    return { parts: [{ text: num, colour: under > 0 ? PAL.accent : PAL.ink }, { text: `   →  ${route}`, colour: PAL.ink }], size: 50, tint, tintColour: PAL.peri, under, underPart: 0 };
  });
}
const windows = (V, f, c) => {
  for (let z = 0.35; z < f.h - 0.3; z += 0.5) {
    for (let xx = 0.22; xx < f.w - 0.3; xx += 0.5) T.onLeft(V, f.y1, f.x + xx, f.x + xx + 0.26, z, z + 0.24, mix(c, "#ffffff", 0.55), 0.9, 0.02 * V.u);
    for (let yy = 0.22; yy < f.d - 0.3; yy += 0.5) T.onRight(V, f.x1, f.y + yy, f.y + yy + 0.26, z, z + 0.24, mix(c, "#ffffff", 0.35), 0.8, 0.02 * V.u);
  }
};

function drawStreet(V, t, o = {}) {
  const inCity = o.inCity;
  const rise = o.rise ?? 1;
  if (rise <= 0.001) return;
  const W = rise < 1 ? scaled(V, rise) : V;
  // In s04 the house and the tree in front sink, and the sign with the number rises in their place.
  const clear = 1 - inOut(ramp(t, NUMS - 0.45, NUMS - 0.05));
  const sign = back(ramp(t, NUMS + 0.0, NUMS + 0.45), 1.3);
  P.slab(W, -3.6, -3.6, 7.2, 7.2, STREET_T, { shadow: inCity ? 0 : 1 });
  P.road(W, -3.6, 0.9, 3.6, 0.9);
  P.road(W, 0.9, -3.6, 0.9, 3.6);
  const L = [
    [1.6, () => clear > 0.01 && T.tree(scaled(W.nest(-2.9, 2.7, 0, 1), clear), -0.4, -0.4, 0.8, 1.3)],
    [-0.4, () => T.router(W, -0.95, -0.95, { s: 1.4, h: 1.2 })],
    [5.2, () => clear > 0.01 && T.house(scaled(W.nest(2.45, 2.45, 0, 1), clear), -0.75, -0.75, 1.5, 1.0, { colour: PAL.butter, roof: PAL.peach })],
    [-1.2, () => T.tree(W, 2.3, -3.1, 0.7, 1.0)],
  ];
  if (sign > 0.001) L.push([6.5, () => drawSign(W, t, sign)]);
  L.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f());
  if (inCity && t < X.street[1] - 0.1) return;
  // The roads' names where they leave the crossroads.
  const badge = pop(t, X.street[1] - 0.15, 0.4);
  for (const [key, [ex, ey]] of Object.entries(ENDS)) if (badge > 0) P.tag(W, ex, ey, 0.05, key, { lift: 0, line: false, size: 34, weight: 800, pop: badge });
  // The name trying to get through (s03): along the road from your house, read by the router, bounced back.
  const nx = lerp(-4.4, -2.2, out3(ramp(t, 5.95, 6.88))) - 0.8 * back(ramp(t, NAMES_AT, NAMES_AT + 0.42), 2.4);
  const na = pop(t, 5.9, 0.3) * (1 - ramp(t, NUMS - 0.45, NUMS - 0.15));
  if (na > 0.001) P.tag(W, nx, 0.9, 0.05, NAME, { lift: 50, size: 40, pop: na, dx: -120 });
  const q = pop(t, NAMES_AT, 0.42) * (1 - ramp(t, NUMS - 0.45, NUMS - 0.15));
  if (q > 0) {
    const [bx, by] = W.b(nx, 0.9, 0.05);
    P.text(W, bx - 400, by - 40, "?", { size: 120 * q, weight: 800 });
  }
  // The router's table: numbers only.
  const pp = pop(t, X.street[1] - 0.1, 0.4) * (1 - ramp(t, X.bill[0] + 0.25, X.bill[0] + 0.5));
  const shake = t > NAMES_AT ? 9 * Math.sin((t - NAMES_AT) * 46) * Math.exp(-(t - NAMES_AT) * 7) : 0;
  const card = P.card(V, PANEL[0] + shake, PANEL[1], PANEL[2], rowsFor(t), { row: PANEL[3], pop: pp, alpha: clamp(pp * 2) });
  const [rx, ry] = W.p(-0.25, -0.25, 1.95);
  if (card) P.leader([rx, card.Y + card.h], [rx, ry], { alpha: W.alpha * clamp(pp * 2), dot: true });
  // The first row's number, carried down to the sign.
  const link = ramp(t, NUMS - 0.02, NUMS + 0.3) * (1 - ramp(t, X.bill[1] - 0.1, X.bill[1] + 0.2));
  if (card && link > 0) {
    const [ax, ay] = [card.X + 40 * V.k + 100 * V.k, card.Y + (12 + PANEL[3]) * V.k];
    const [bx2, by2] = W.p(BOARD.x0 + 0.6, BOARD.y, BOARD.z1);
    P.leader([ax, ay], [bx2, by2], { colour: PAL.accent, dash: [10, 10], grow: link, alpha: W.alpha * 0.9, dot: false, width: 3 });
  }
}
// s04: the number at its real value on a sign standing on the street, its four parts and what each can be.
function drawSign(W, t, rise) {
  const { x0, x1, y, z0, z1 } = BOARD;
  const top = z0 + (z1 - z0) * rise;
  for (const px of [x0 + 0.5, x1 - 0.7]) P.block(W, px, y - 0.18, 0, 0.2, 0.18, z0 + 0.05, "#dfe3fb", { r: 0.2 });
  P.block(W, x0, y - 0.14, z0, x1 - x0, 0.14, top - z0, "#ffffff", {
    r: 0.04,
    shades: { top: "#ffffff", left: "#fdfdff", right: "#d9def7", edge: "#ffffff", deep: "#c9cff3" },
    faces: () => {
      if (rise < 0.95) return;
      const a = clamp((t - NUMS - 0.35) * 6);
      // The number, fitted to the sign's width.
      const size = 0.66;
      const wNum = P.faceTextWidth(IP, size);
      const fit = Math.min(1, (x1 - x0 - 0.6) / wNum);
      const sz = size * fit, left = (x0 + x1) / 2 - (wNum * fit) / 2;
      P.faceText(W, "left", [left, y, z0 + 1.62], IP, { size: sz, colour: PAL.accent, alpha: a });
      // One bracket under each part (characters 0-2, 4-6, 8-10, 12-14 of the number as lettered).
      let at = 0;
      OCTETS.forEach((oct, k) => {
        const a0 = left + P.faceTextWidth(IP.slice(0, at), sz), a1 = a0 + P.faceTextWidth(oct, sz);
        at += oct.length + 1;
        const d = out3(ramp(t, BRACKETS[k], BRACKETS[k] + 0.22));
        if (d <= 0) return;
        const mid = (a0 + a1) / 2, half = ((a1 - a0) / 2 - 0.04) * d;
        P.line(W, [[mid - half, y, z0 + 1.32], [mid - half, y, z0 + 1.2], [mid + half, y, z0 + 1.2], [mid + half, y, z0 + 1.32]], PAL.ink, 4, { alpha: d, screen: false });
        P.faceText(W, "left", [mid, y, z0 + 0.82], "0–255", { size: 0.27, colour: mix(PAL.ink, PAL.paper, 0.15), align: "center", alpha: d, weight: 700 });
      });
      const l = out3(ramp(t, ADDR, ADDR + 0.35));
      if (l > 0) P.faceText(W, "left", [(x0 + x1) / 2, y, z0 + 0.28], "IP address: 4 numbers, each 0 to 255", { size: 0.25, align: "center", alpha: l, weight: 700 });
    },
  });
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// DNS DISTRICT (s05 to s11): floating islands; your home is one of them
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const D = new View(0, 0, 58);
const ISLE = { home: [300, 740], resolver: [720, 620], root: [1130, 400], org: [1600, 450], ns: [1520, 790] };
const HOME_F3 = 0.45; // your 8-unit slab is a 3.6-unit island
const ISLE_T = 0.45;
const TOP = { resolver: [0, 0, 2.4], root: [0, 0, 0.2], org: [0, 0, 2.3], ns: [-0.85, -0.2, 1.9] }; // where the question lands
const CLOSE = { k: 1.5, fx: 510, fy: 660, sx: 940, sy: 620 }; // the board's close view of the district (s05)
const CONTACTF = look(1.5, 640, 560);
const WIDE = look(1.0, 960, 560);
const ROOTF = look(1.42, 930, 500), ORGF = look(1.2, 1160, 540), NSF = look(1.25, 1120, 690);
const CACHE = { k: 2.0, fx: 720, fy: 620, sx: 900, sy: 590 }; // pushed in on the resolver (s11)
const HOMEF = { k: HOME.U / (D.U * HOME_F3), fx: ISLE.home[0], fy: ISLE.home[1], sx: 960, sy: 560 }; // your house, full frame
// s05, s06
const ASK = said("s05", "asks");
const HOP1 = [ASK - 0.02, ASK + 0.56];
const CONTACTS = said("s06", "contacts"), TAP = said("s06", "tap"), CALL = said("s06", "calling"), NUM6 = said("s06", "number");
ev("send", HOP1[0] + 0.05, "the question leaves your phone", { soft: true });
ev("blip", HOP1[1], "the question reaches the resolver");
ev("tag", HOP1[1] + 0.32, "'usually your ISP's'", { soft: true });
ev("card", CONTACTS + 0.1, "the contact card rises from your phone");
ev("tick", TAP, "tap on 'Mum'");
ev("blip", CALL + 0.05, "dial-tone blip", { soft: true });
ev("card", CALL + 0.3, "the DNS card rises from the resolver", { soft: true });
// s07
const KNOW = said("s07", "know");
const RISE = { root: KNOW + 0.2, org: KNOW + 0.5, ns: KNOW + 0.8 };
ev("tag", KNOW, "'?' over the resolver");
Object.entries(RISE).forEach(([key, at], i) => ev("rise", at + 0.3, `the ${key} island rises`, { rise: i }));
const LINKS = [said("s07", "chain") - 0.1, said("s07", "chain") + 0.3];
// s08: the root
const HOP2 = [S("s08") + 0.04, S("s08") + 0.52];
const REF1 = said("s08", "points");
const COPIES = [HOP2[1] + 0.05, HOP2[1] + 0.75];
ev("blip", HOP2[1], "the question reaches the root servers");
ev("pop", COPIES[0] + 0.1, "copies of the root spread out", { soft: true, under: true });
ev("tag", HOP2[1] + 0.1, "'13 names · 2,046 servers'", { soft: true });
ev("card", REF1, "the root's answer: 'ask the .org servers'");
// s09: .org, then Wikimedia's name server
const HOP3 = [S("s09") + 0.02, S("s09") + 0.46];
const REF2 = HOP3[1] + 0.06;
const HOP4 = [X.toNs[0] + 0.18, X.toNs[0] + 0.76];
ev("blip", HOP3[1], "the question reaches the .org registry");
ev("card", REF2, "'.org's answer: 'ask ns0.wikimedia.org'");
ev("blip", HOP4[1], "the question reaches ns0.wikimedia.org; it lights up");
// s10
const ANS = S("s10") + 0.08, NUMBER = said("s10", "number");
const TYPED = [NUMBER - 0.52, NUMBER - 0.02];
const HOME_CARD = [NUMBER + 0.1, NUMBER + 0.5];
ev("pop", ANS + 0.06, "the answer card rises");
ev("chime", NUMBER, "the number lands: 103.102.166.224");
ev("card", HOME_CARD[0] + 0.02, "the answer flies to the resolver", { soft: true });
// s11
const MINUTES = said("s11", "minutes"), NEXT = said("s11", "next");
const LID = [X.cache[1] - 0.24, X.cache[1] + 0.18];
const FILE = [LID[1] + 0.02, LID[1] + 0.3];
const TIMER = MINUTES - 0.16;
const COUNT = [TIMER + 0.75, X.home2[0] - 0.05]; // the clock runs down, sped up
const NB = [NEXT - 0.24, NEXT + 0.14];
const NBQ = [NB[1] + 0.02, NB[1] + 0.3], NBA = [NBQ[1] + 0.04, NBQ[1] + 0.32];
ev("pop", LID[0] + 0.1, "the resolver's lid lifts", { soft: true });
ev("drawer", FILE[1], "the answer filed on the shelf");
ev("tick", TIMER + 0.05, "the dial: kept 180 seconds");
for (let k = 1; k <= 4; k++) ev("tick", lerp(...COUNT, k / 4), "the dial ticks down", { soft: true, under: true });
ev("pop", NB[1] - 0.06, "the neighbour's house slides in", { soft: true });
ev("blip", NBQ[1], "the neighbour's question reaches the resolver");
ev("card", NBA[1], "the answer comes straight back");

const islandView = (key, r = 1) => {
  const v = D.at(...ISLE[key]);
  return r === 1 ? v : scaled(v, r);
};
const topOf = (key) => D.at(...ISLE[key]).b(...TOP[key]);
// How far each island has risen (or sunk): solid, scaled about its own centre.
function islandsState(t) {
  const st = {};
  st.home = 1 - inOut(ramp(t, X.cache[0], X.cache[0] + 0.45)) + back(ramp(t, X.home2[0], X.home2[0] + 0.45), 1.6) * (t > X.home2[0] ? 1 : 0);
  if (t > X.home2[0]) st.home = back(ramp(t, X.home2[0], X.home2[0] + 0.45), 1.6);
  const out = 1 - inOut(ramp(t, X.cache[0], X.cache[0] + 0.45));
  for (const key of ["root", "org", "ns"]) st[key] = back(ramp(t, RISE[key], RISE[key] + 0.5), 1.6) * out;
  st.resolver = 1 - inOut(ramp(t, X.home2[0] + 0.05, X.home2[0] + 0.5));
  st.lit = { resolver: bump(t, HOP1[1], 0.4) + bump(t, NBQ[1], 0.35), root: bump(t, HOP2[1], 0.45), org: bump(t, HOP3[1], 0.45), ns: ramp(t, HOP4[1], HOP4[1] + 0.1) * 0.85 };
  return st;
}
function drawIsland(key, t, st) {
  const r = st[key];
  if (r <= 0.001) return;
  const v = islandView(key, r);
  if (key === "home") {
    set(HOME, nested(v, HOME, 0, 0, 0, HOME_F3), D.alpha);
    drawHome(HOME, t, { tags: false });
    return;
  }
  P.slab(v, -1.8, -1.8, 3.6, 3.6, ISLE_T, { drop: 1.4 });
  const lit = st.lit[key];
  if (key === "resolver") {
    const lift = 1.0 * back(ramp(t, ...LID), 2.0);
    T.server(v, -1, -1, 2, 2, 2.4, PAL.mint, { lit, lift, blink: (i) => 0.5 + 0.5 * Math.sin(t * 5 + i * 1.7), inside: (body) => shelf(v, body, t) });
  } else if (key === "root") {
    T.rootRing(v, { lit, t });
  } else if (key === "org") {
    T.registry(v, { lit, t });
  } else if (key === "ns") {
    T.rack(v, -1.2, -0.6, 0.7, 0.8, 1.9, PAL.butter, { lit, label: "ns0", labelSize: 0.24, blink: (i) => 0.5 + 0.5 * Math.sin(t * 6 + i) });
    T.rack(v, -0.35, -0.6, 0.7, 0.8, 1.6, PAL.butter, { label: "ns1", labelSize: 0.22, blink: (i) => 0.5 + 0.5 * Math.sin(t * 5 + i * 2) });
    T.rack(v, 0.5, -0.6, 0.7, 0.8, 1.6, PAL.butter, { label: "ns2", labelSize: 0.22, blink: (i) => 0.5 + 0.5 * Math.sin(t * 4 + i * 3) });
  }
}
// Inside the resolver: a white shelf of filed answers; the new one drops in, and is thrown out when its time is up.
function shelf(v, body, t) {
  P.block(v, -0.8, -0.8, body, 1.6, 1.6, 0.36, "#f4f6ff", { contact: 0, r: 0.05 });
  for (let i = 0; i < 4; i++) {
    const yy = -0.6 + i * 0.36;
    const fresh = i === 3;
    const drop = fresh ? 1 - out3(ramp(t, ...FILE)) : 0;
    const gone = fresh ? ramp(t, COUNT[1] - 0.15, COUNT[1]) : 0;
    if (fresh && (t < FILE[0] || gone >= 1)) continue;
    P.block(v, -0.6, yy, body + 0.3 + drop * 1.4 + gone * 0.6, 1.2, 0.08, 0.42 * (1 - gone), fresh ? "#ffffff" : "#eef0fb", { contact: 0, r: 0.02, lit: fresh ? 0.3 : 0 });
    if (fresh && gone < 0.5) T.onLeft(v, yy + 0.08, -0.45, 0.35, body + 0.58 + drop * 1.4, body + 0.63 + drop * 1.4, PAL.accent, 1);
  }
}
// The root's copies around the world: tiny cabinets on tiny plates that spread out around the root (s08).
const COPY_AT = Array.from({ length: 46 }, (_, i) => {
  const ang = hash(i * 3.1) * Math.PI * 2, rad = 2.7 + hash(i * 7.7) * 2.6;
  return { x: Math.cos(ang) * rad, y: Math.sin(ang) * rad * 0.8, d: rad, i };
}).filter((c) => !(c.x > 2.5 && c.y < -1.5)).sort((a, b) => a.x + a.y - (b.x + b.y));
function drawCopies(t) {
  const out = 1 - inOut(ramp(t, X.toOrg[0], X.toOrg[0] + 0.35));
  if (t < COPIES[0] || out <= 0.001) return;
  const v = D.at(...ISLE.root);
  for (const c of COPY_AT) {
    const r = back(ramp(t, COPIES[0] + (c.d - 2.7) * 0.18, COPIES[0] + (c.d - 2.7) * 0.18 + 0.3), 1.8) * out;
    if (r <= 0.001) continue;
    const cv = scaled(v.nest(c.x, c.y, -0.3, 1), r);
    P.block(cv, -0.22, -0.22, -0.08, 0.44, 0.44, 0.08, "#eceffe", { contact: 0, r: 0.2 });
    P.block(cv, -0.1, -0.1, 0, 0.2, 0.2, 0.36, PAL.peri, { contact: 0.6, r: 0.1 });
  }
}

// A question cube's hop, with its dashed trail, from one board point (bx, by) to another.
function hopCube(t, [a0, a1], from, to, o = {}) {
  if (t < a0 || t > a1 + (o.stay ?? 0)) return;
  const f = clamp((t - a0) / (a1 - a0));
  const lift = o.lift ?? 90;
  const e = inOut(f);
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const q = (i / 24) * e;
    pts.push(D.s(lerp(from[0], to[0], q), lerp(from[1], to[1], q) - lift * 4 * q * (1 - q)));
  }
  g.save();
  g.globalAlpha = D.alpha * (1 - ramp(t, a1, a1 + 0.3)) * 0.75;
  g.strokeStyle = PAL.accent;
  g.lineWidth = 3.2 * D.k;
  g.setLineDash([9 * D.k, 9 * D.k]);
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  g.restore();
  const x = lerp(from[0], to[0], e), y = lerp(from[1], to[1], e) - lift * 4 * e * (1 - e);
  const v = new View(x, y, D.U * (o.scale ?? 1), D.cam);
  v.alpha = D.alpha;
  const sz = (o.size ?? 0.6) * (o.shrink ? 1 - ramp(t, a1, a1 + (o.stay ?? 0.01)) : 1) * clamp((t - a0) / 0.1);
  if (sz > 0.01) T.packet(v, 0, 0, 0, sz);
}
// The resolver's side, where its questions leave from (so a cube never crosses its name).
const RES_OUT = () => D.at(...ISLE.resolver).b(1.0, 0.1, 1.3);

function drawDistrict(t) {
  const st = islandsState(t);
  const links = ramp(t, ...LINKS) * (1 - inOut(ramp(t, X.cache[0], X.cache[0] + 0.3)));
  if (links > 0) {
    const [ax, ay] = D.at(...ISLE.resolver).b(0, 0, 1.0);
    for (const key of ["root", "org", "ns"]) {
      if (st[key] < 0.5) continue;
      const [bx, by] = D.at(...ISLE[key]).b(0, 0, 0.8);
      if (key !== "org") {
        P.leader(D.s(ax, ay), D.s(lerp(ax, bx, links), lerp(ay, by, links)), { alpha: 0.45 * D.alpha, dash: [8 * D.k, 10 * D.k], width: 3 * D.k, dot: false });
        continue;
      }
      // (the line to .org bows down, under the root island, so it never reads as root -> .org)
      const cx = (ax + bx) / 2, cy = Math.max(ay, by) + 70;
      g.save();
      g.globalAlpha = 0.45 * D.alpha;
      g.strokeStyle = PAL.ink;
      g.lineWidth = 3 * D.k;
      g.setLineDash([8 * D.k, 10 * D.k]);
      g.beginPath();
      for (let i = 0; i <= 32; i++) {
        const u = (i / 32) * links;
        const [x, y] = D.s((1 - u) ** 2 * ax + 2 * u * (1 - u) * cx + u * u * bx, (1 - u) ** 2 * ay + 2 * u * (1 - u) * cy + u * u * by);
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
      g.restore();
    }
  }
  for (const key of ["root", "org", "resolver", "home", "ns"]) drawIsland(key, t, st);
  drawCopies(t);
  // The question's hops: your phone -> resolver (s05); resolver -> root, -> .org, -> ns0 (s08, s09).
  const phoneTop = D.at(...ISLE.home).b(PTOP[0] * HOME_F3, PTOP[1] * HOME_F3, PTOP[2] * HOME_F3 + 0.05);
  hopCube(t, HOP1, phoneTop, D.at(...ISLE.resolver).b(-0.6, 0.3, 2.45), { lift: 120 });
  hopCube(t, HOP2, RES_OUT(), topOf("root"), { lift: 70, stay: REF1 - HOP2[1], shrink: true });
  hopCube(t, HOP3, RES_OUT(), topOf("org"), { lift: -110, stay: REF2 - HOP3[1], shrink: true });
  hopCube(t, HOP4, RES_OUT(), topOf("ns"), { lift: 60, stay: ANS + 0.2 - HOP4[1], shrink: true });
  // Tags, over everything in the world.
  const o = 1 - inOut(ramp(t, X.cache[0], X.cache[0] + 0.3));
  const youA = o * clamp((t - S("s05")) * 4) * (1 - ramp(t, X.pair[0], X.pair[0] + 0.2) + ramp(t, X.back[0] + 0.2, X.back[1])) * (1 - ramp(t, X.toRoot[0], X.toRoot[0] + 0.2));
  if (st.home > 0.5 && t < X.home2[0] && youA > 0.01) P.tag(islandView("home"), PTOP[0] * HOME_F3, PTOP[1] * HOME_F3, PTOP[2] * HOME_F3, "you", { lift: 36, size: 34, alpha: youA });
  const resTag = (1 - ramp(t, REF1 + 0.3, REF1 + 0.55)) * (1 - ramp(t, CALL + 0.04, CALL + 0.24) * (1 - ramp(t, X.back[0] + 0.32, X.back[0] + 0.5)));
  P.tag(islandView("resolver"), 0, 0, 2.4 + back(ramp(t, ...LID), 2.0), "DNS resolver", { lift: 46, size: 34, alpha: resTag, dx: 90 }); // (to the right: your question arrives from the left)
  const isp = pop(t, HOP1[1] + 0.32, 0.4) * (1 - ramp(t, X.pair[0], X.pair[0] + 0.25));
  if (isp > 0) P.tag(islandView("resolver"), 1.8, 1.8, -0.4, "usually your ISP's", { lift: -24, size: 34, pop: isp, alpha: clamp(isp * 2) });
  const q = pop(t, KNOW, 0.4) * (1 - ramp(t, RISE.root + 0.3, RISE.root + 0.55));
  if (q > 0) P.tag(islandView("resolver"), 0, 0, 2.4, "?", { lift: 120, size: 54, weight: 800, pop: q, line: false });
  const names = { root: "root servers", org: ".org registry", ns: "ns0.wikimedia.org" };
  const anchor = { root: [0, -1.22, 1.0], org: [0, 0, 2.32], ns: [-0.85, -0.2, 1.9] };
  // In the close framings only the server the camera is on keeps its name (the others are at the frame's edge).
  const on = (a, b) => ramp(t, a, a + 0.25) * (1 - ramp(t, b, b + 0.25));
  const shown = {
    root: (1 - ramp(t, X.toOrg[0], X.toOrg[0] + 0.25)) * (1 - ramp(t, REF1 - 0.16, REF1 - 0.02) * (1 - ramp(t, REF1 + 0.6, REF1 + 0.75))),
    org: 1 - on(X.toRoot[0], X.toOrg[0]) - ramp(t, X.toNs[0], X.toNs[0] + 0.25),
    ns: 1 - on(X.toRoot[0], X.toNs[0]),
  };
  for (const key of ["root", "org", "ns"]) {
    const r = pop(t, RISE[key] + 0.34, 0.4) * o * clamp(shown[key]);
    if (r > 0) P.tag(islandView(key), ...anchor[key], names[key], { lift: 46, size: 34, pop: r, alpha: clamp(r * 2) });
  }
  const roots = pop(t, HOP2[1] + 0.1, 0.4) * (1 - ramp(t, X.toOrg[0], X.toOrg[0] + 0.25));
  if (roots > 0) P.tag(islandView("root"), 1.8, 1.8, -0.4, "13 names · 2,046 servers", { lift: -18, size: 30, pop: roots, alpha: clamp(roots * 2) });
  const nsSub = pop(t, HOP4[1] + 0.05, 0.4) * o;
  if (nsSub > 0) P.tag(islandView("ns"), 1.8, 1.8, -0.4, "holds wikipedia.org's records", { lift: -18, size: 30, pop: nsSub, alpha: clamp(nsSub * 2) * (1 - ramp(t, ANS, ANS + 0.2)) });
  // The referral cards, held by the resolver at the top left of the frame.
  referral(t, "ask the .org servers", topOf("root"), REF1, HOP3[1] + 0.04, 470);
  referral(t, "ask ns0.wikimedia.org", topOf("org"), REF2, ANS, 560);
  answerCard(t);
}
// A card that pops out of a server and flies to the resolver's corner of the frame, where it stays until `until`.
function referral(t, text, from, at, until, w) {
  if (t < at || t > until + 0.3) return;
  const p = pop(t, at, 0.3);
  const fly = inOut(ramp(t, at + 0.2, at + 0.55));
  const spot = [60 + w / 2, 60 + 54];
  const [sx0, sy0] = D.s(from[0], from[1] - 70);
  const cx = lerp(sx0, spot[0], fly), cy = lerp(sy0, spot[1], fly) - 60 * Math.sin(Math.PI * fly);
  const sc = lerp(0.62, 1, fly) * p;
  const a = 1 - ramp(t, until, until + 0.3);
  const SCR = new View(0, 0, 1);
  P.card(SCR, cx - (w * sc) / 2, cy - (108 * sc) / 2, w, [{ text, size: 40 }], { scale: sc, alpha: a * D.alpha, row: 84 });
  if (fly >= 1) P.leader([spot[0] - w / 2 + 60, 60 + 108], D.s(...D.at(...ISLE.resolver).b(-1, 1, 1.3)), { alpha: a * D.alpha * 0.8 });
}
// s10: the record card rises from ns0 with the number; then it flies to the resolver, which files it (s11).
const ANS_W = 450;
function answerCard(t) {
  if (t < ANS || t > X.home2[1] + 0.05) return;
  const p = pop(t, ANS, 0.42);
  const n = Math.floor(IP.length * ramp(t, ...TYPED) + 1e-6);
  const rows = [{ text: NAME, size: 40 }, { text: IP, colour: PAL.accent, size: 44, typed: n, under: ramp(t, NUMBER, NUMBER + 0.25) }];
  const ns = topOf("ns");
  const [nsx, nsy] = D.s(ns[0], ns[1]);
  const near = D.s(880 + ANS_W / 2, 560 + 96);
  const spot = [60 + ANS_W / 2, 60 + 96];
  const fly = inOut(ramp(t, ...HOME_CARD));
  const push = inOut(ramp(t, ...X.cache));
  const cache = [120 + 290, 70 + 96];
  // s12: it flies on from the shelf to your phone, the camera following it.
  const home = inOut(ramp(t, X.home2[0], ARRIVE));
  let cx = lerp(lerp(nsx, near[0], clamp(p)), spot[0], fly), cy = lerp(lerp(nsy - 40, near[1], clamp(p)), spot[1], fly) - 80 * Math.sin(Math.PI * fly);
  let kk = clamp(p, 0, 1.2) * lerp(1, 0.94, fly);
  cx = lerp(cx, cache[0], push);
  cy = lerp(cy, cache[1], push);
  kk = lerp(kk, 1.12, push);
  if (home > 0) {
    const ph = HOME.p(PTOP[0], PTOP[1], PTOP[2] + 0.4);
    cx = lerp(cx, ph[0], home);
    cy = lerp(cy, ph[1] - 60, home);
    kk = lerp(kk, 0.25, home);
  }
  const SCR = new View(0, 0, 1);
  const card = P.card(SCR, cx - (ANS_W * kk) / 2, cy - (192 * kk) / 2, ANS_W, rows, { scale: kk, alpha: D.alpha * (1 - ramp(t, ARRIVE - 0.05, ARRIVE + 0.05)) });
  if (!card || home > 0) return;
  // Its leader: from its side to ns0; once it has flown, to the resolver; once filed, down to the shelf.
  let to = null, from = [card.X + card.w / 2, card.Y + card.h];
  if (fly <= 0.001) {
    to = [nsx, nsy - 10];
    from = [card.X + card.w, card.Y + card.h / 2];
  } else if (fly >= 0.999 && t < FILE[0]) to = D.s(...D.at(...ISLE.resolver).b(-1, 1, 2.14));
  else if (t >= FILE[0]) to = D.s(...D.at(...ISLE.resolver).b(0, 0.52, 2.86 - 1.4 * (1 - out3(ramp(t, ...FILE)))));
  if (to) P.leader(from, to, { alpha: D.alpha * (push > 0 && push < 1 ? 0 : 1) * (1 - ramp(t, COUNT[1] - 0.15, COUNT[1])) });
}
// s11: the dial (the answer is kept 180 seconds; the dial runs down sped up) and the neighbour's quick answer.
function drawCacheExtras(t, out = 0) {
  const tp = pop(t, TIMER, 0.42) * (1 - out);
  const dial = D.at(1010, 410);
  if (tp > 0.001) {
    const v = scaled(dial, tp);
    P.slab(v, -1.2, -1.2, 2.4, 2.4, 0.3, { drop: 1.0 });
    const left = 1 - ramp(t, ...COUNT);
    T.dial(v, 0, 0, 0.95, left);
    const secs = Math.round(TTL * left);
    const [lx, ly] = v.p(0.9, 0.9, 0);
    P.pill(lx, ly + 34, secs > 0 ? `kept ${secs} s` : "expired: it asks again", { lift: -10, size: 38, weight: 800, alpha: clamp(tp * 2) * D.alpha, line: false });
    if (t > COUNT[0] && secs > 0) P.text(new View(0, 0, 1), lx, ly + 132, "clock sped up", { size: 28, weight: 600, colour: mix(PAL.ink, PAL.paper, 0.35), alpha: clamp(tp * 2) * D.alpha });
  }
  const nb = out3(ramp(t, ...NB)) * (1 - out);
  if (nb > 0.001) {
    const v = D.at(1010 + (1 - nb) * 300, 715);
    P.slab(v, -1.1, -1.1, 2.2, 2.2, 0.3, { drop: 1.0 });
    T.house(v, -0.75, -0.75, 1.3, 0.9, { colour: PAL.peach, roof: PAL.peri });
    const from = v.b(-0.75, 0.2, 0.45), to = D.at(...ISLE.resolver).b(1.0, 0.4, 1.5);
    if (t > NBQ[0] && t < NBQ[1] + 0.05) {
      const e = inOut(ramp(t, ...NBQ));
      const c = new View(lerp(from[0], to[0], e), lerp(from[1], to[1], e) - 50 * 4 * e * (1 - e), D.U, D.cam);
      c.alpha = D.alpha;
      T.packet(c, 0, 0, 0, 0.45);
    }
    P.tag(v, -0.1, -0.1, 1.5, "neighbour", { lift: 34, size: 30 });
    const back2 = ramp(t, ...NBA);
    if (back2 > 0) {
      const a = D.s(...to), b = D.s(...from);
      arrow([a[0] + 30, a[1] + 40], [b[0] - 30, b[1] + 20], out3(back2), D.alpha * (1 - out), PAL.accent);
      const sc = back(clamp(back2 * 1.4), 1.8);
      if (sc > 0.05) {
        const SCR = new View(0, 0, 1);
        const [mx, my] = [lerp(a[0], b[0], 0.5), lerp(a[1], b[1], 0.5) + 80];
        P.card(SCR, mx - 175 * sc, my - 43 * sc, 350, [{ text: IP, colour: PAL.accent, size: 38 }], { scale: sc, row: 62, alpha: D.alpha * (1 - out), pad: 30 });
      }
    }
  }
}
function arrow(a, b, f, alpha, colour = PAL.ink) {
  const ex = lerp(a[0], b[0], f), ey = lerp(a[1], b[1], f);
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = colour;
  g.fillStyle = colour;
  g.lineWidth = 4 * D.k;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(...a);
  g.lineTo(ex, ey);
  g.stroke();
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hs = 18 * D.k;
  g.beginPath();
  g.moveTo(ex + Math.cos(ang) * 4, ey + Math.sin(ang) * 4);
  g.lineTo(ex - Math.cos(ang - 0.45) * hs, ey - Math.sin(ang - 0.45) * hs);
  g.lineTo(ex - Math.cos(ang + 0.45) * hs, ey - Math.sin(ang + 0.45) * hs);
  g.closePath();
  g.fill();
  g.restore();
}
// s06: the analogy, drawn on the things themselves: your phone's contacts card, and the resolver's card.
function drawAnalogy(t) {
  const c1 = pop(t, CONTACTS + 0.05, 0.45) * (1 - ramp(t, X.back[0], X.back[0] + 0.3));
  const under = ramp(t, NUM6 + 0.02, NUM6 + 0.3);
  const SCR = new View(0, 0, 1);
  if (c1 > 0.001) {
    const top = HOME.p(PTOP[0], PTOP[1], PTOP[2]);
    const card = P.card(SCR, 90, 150, 540, [{ text: "Mum", size: 46 }, { text: "04•• ••• •••", size: 46, colour: under > 0 ? PAL.accent : PAL.ink, under }], { pop: c1, row: 100, alpha: clamp(c1 * 2) * D.alpha });
    if (card) P.leader([card.X + card.w / 2, card.Y + card.h], top, { alpha: clamp(c1 * 2) * D.alpha });
    P.text(SCR, 360, 130, "your contacts", { size: 40, alpha: clamp(c1 * 2) * D.alpha, colour: mix(PAL.ink, PAL.paper, 0.2) });
  }
  const c2 = pop(t, CALL + 0.3, 0.45) * (1 - ramp(t, X.back[0], X.back[0] + 0.3));
  if (c2 > 0.001) {
    const top = D.s(...D.at(...ISLE.resolver).b(0, 0, 2.4));
    const u2 = ramp(t, NUM6 + 0.1, NUM6 + 0.4);
    const card = P.card(SCR, 1060, 150, 640, [{ text: NAME, size: 46 }, { text: IP, colour: PAL.accent, size: 46, under: u2 }], { pop: c2, row: 100, alpha: clamp(c2 * 2) * D.alpha });
    if (card) P.leader([card.X + 120, card.Y + card.h], top, { alpha: clamp(c2 * 2) * D.alpha });
    P.text(SCR, 1380, 130, "DNS", { size: 40, weight: 800, alpha: clamp(c2 * 2) * D.alpha });
  }
  // The call goes to the number.
  const call = bump(t, CALL, 0.7);
  if (call > 0) {
    const [px, py] = HOME.p(PTOP[0] + 0.9, PTOP[1], PTOP[2] - 0.6);
    for (let i = 0; i < 2; i++) {
      g.save();
      g.globalAlpha = call * (1 - i * 0.4) * D.alpha;
      g.strokeStyle = PAL.accent;
      g.lineWidth = 5;
      g.beginPath();
      g.arc(px + 30, py, 24 + i * 22, -0.9, 0.9);
      g.stroke();
      g.restore();
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// ROADS (s13, s14, s18): the road network between your house and the coast, routers at its junctions
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const ROADS = new View(960, 500, 46);
// (router 1, your ISP's, stands on the x = -6 road just north of the first junction: beside your house, not in front)
const ROUTERS = [[-6, 0.9], [-2, 2], [-2, -2], [2, -2], [2, 2], [6, -2], [6, 2], [-6, -2], [2, -6], [-2, -6], [6, -6]];
const HOME_F2 = 0.3;
const HOME_IN_ROADS = [-8.6, 1.7, HOME_T * HOME_F2];
const RT = said("s13", "router");
const HOME_IN_ROADS_CAM = () => ({ k: HOME.U / (ROADS.U * HOME_F2), fx: ROADS.b(...HOME_IN_ROADS)[0], fy: ROADS.b(...HOME_IN_ROADS)[1], sx: 960, sy: 560 });
const ROUTERF = look(2.35, ...ROADS.b(-4, 1.5, 0.9));
const toRoads = ([x, y, z]) => [HOME_IN_ROADS[0] + x * HOME_F2, HOME_IN_ROADS[1] + y * HOME_F2, HOME_IN_ROADS[2] + z * HOME_F2];
// s13: from your phone to your Wi-Fi router, out along the road, onto the first router.
const OUT = [
  [X.roads[0] + 0.12, ...toRoads([PTOP[0], PTOP[1], PTOP[2] + 0.85])],
  [X.roads[0] + 0.42, ...toRoads(WTOP), 0.5],
  [X.roads[0] + 0.66, ...toRoads([0.4, 1.0, 0.1]), 0.3],
  [X.roads[0] + 1.0, -6.7, 2.0, 0.15],
  [X.roads[0] + 1.2, -6.0, 0.9, 1.5, 0.8],
];
const R14 = { r1: [-6, 0.9], r2: [-2, 2] };
const READ1 = said("s14", "reads"), READ = said("s14", "number"), PASS = said("s14", "passes");
// s14: read by router 1, along the road to router 2, read again, on towards the coast.
const P14 = [
  [READ1 + 0.25, -6.0, 0.9, 1.5],
  [READ1 + 0.42, -5.3, 2.0, 0.08, 0.5],
  [READ - 0.02, -2.7, 2.0, 0.08],
  [READ + 0.12, -2.0, 2.0, 1.5, 0.6],
  [PASS + 0.05, -2.0, 2.0, 1.5],
  [PASS + 0.2, -1.3, 2.0, 0.08, 0.5],
  [PASS + 0.55, 2.0, 2.0, 1.5, 0.5],
  [PASS + 0.86, 6.0, 2.0, 1.5, 0.6],
  [X.sea[1] - 0.15, 9.6, 2.0, 0.08, 0.4],
];
ev("blip", OUT[4][0], "the packet waits on the first router");
ev("tick", READ1 + 0.02, "router 1 reads the packet's number");
ev("blip", READ + 0.12, "the packet reaches router 2");
ev("tick", READ + 0.2, "router 2 reads the number");
ev("blip", PASS + 0.55, "the packet hops onto router 3", { soft: true, under: true });
ev("blip", PASS + 0.86, "the packet hops onto router 4", { soft: true, under: true });
ROUTERS.forEach((r, i) => i % 3 === 0 && ev("pop", X.roads[0] + 0.5 + i * 0.05, `router ${i + 1} pops up`, { soft: true, under: true }));

function roadsExtent(t) {
  const e = inOut(ramp(t, X.roads[0] + 0.05, X.roads[1] + 0.1));
  return { x0: lerp(-9.8, -10, e), x1: lerp(-7.4, 10, e), y0: lerp(0.5, -8, e), y1: lerp(2.9, 4, e), e };
}
function packetRoads(t) {
  if (t < P14[0][0]) {
    const p = along(OUT, t);
    if (t >= OUT[4][0]) p[2] = 1.5 + 0.07 * Math.abs(Math.sin((t - OUT[4][0]) * 4));
    return p;
  }
  return along(P14, t);
}
function drawRoads(V, t, o = {}) {
  const ex = o.full ? { x0: -10, x1: 10, y0: -8, y1: 4, e: 1 } : roadsExtent(t);
  const sink = o.sink ?? 0;
  if (sink >= 1) return;
  const W = sink > 0 ? scaled(V, 1 - sink) : V;
  P.slab(W, ex.x0, ex.y0, ex.x1 - ex.x0, ex.y1 - ex.y0, 0.5, { shadow: ex.e });
  for (const y of [-6, -2, 2]) if (y > ex.y0 + 0.3 && y < ex.y1 - 0.3) P.road(W, y === 2 ? -7.4 : ex.x0, y, Math.min(o.noSea && y === 2 ? 10 : 8.6, ex.x1), y, 0.5);
  for (const x of [-6, -2, 2, 6]) if (x < ex.x1 - 0.3) P.road(W, x, Math.max(-8, ex.y0), x, Math.min(4, ex.y1), 0.5);
  // (in s13 a strip of sea marks the coast; from s15 on, the coast's own slab lies there, so the strip goes)
  if (ex.x1 > 9.9 && !o.noSea) P.block(W, 8.6, -8, -0.42, 1.4, 12, 0.32, PAL.sea, { contact: 0, r: 0.04 });
  const L = [];
  const lit = (i) => (i === 0 ? ramp(t, READ1, READ1 + 0.1) * (1 - ramp(t, READ + 0.2, READ + 0.4)) : i === 1 ? ramp(t, READ + 0.15, READ + 0.25) * (1 - ramp(t, PASS + 0.5, PASS + 0.7)) : 0);
  ROUTERS.forEach(([x, y], i) => {
    if (x > ex.x1 - 0.7 || y < ex.y0 + 0.7 || y > ex.y1 - 0.7) return;
    const when = X.roads[0] + 0.3 + 0.55 * ((x - ex.x0) / 20);
    const r = o.full ? 1 : back(ramp(t, when, when + 0.38), 1.8);
    if (r > 0) L.push([x + y, () => T.rack(scaled(W.nest(x, y, 0, 1), r), -0.55, -0.55, 1.1, 1.1, 1.5, PAL.peri, { lit: lit(i), blink: (j) => 0.5 + 0.5 * Math.sin(t * 6 + i + j * 1.3), led: i < 2 && lit(i) > 0.5 ? PAL.accent : PAL.mint })]);
  });
  // Your slab, a corner of the network.
  L.push([HOME_IN_ROADS[0] + HOME_IN_ROADS[1], () => {
    set(HOME, nested(W, HOME, ...HOME_IN_ROADS, HOME_F2), V.alpha);
    drawHome(HOME, t, { shadow: 0, tags: false });
  }]);
  const pk = t > OUT[0][0] && t < X.sea[1] - 0.15 ? packetRoads(t) : null;
  const sz = lerp(0.9 * HOME_F2, 0.7, ramp(t, OUT[0][0], OUT[3][0]));
  if (pk) L.push([pk[0] + pk[1] + 0.7, () => T.packet(W, pk[0], pk[1], pk[2], sz, { sticker: 1 })]);
  // s18: the page's packets come back along these roads.
  for (let i = 0; i < PACKETS; i++) {
    const q = roadsLeg(i, t);
    // small (0.32 of the sea's units, as on the coast), and down to your house's own scale as they reach it
    if (q && !inRouter1(q)) L.push([q[0] + q[1] + 0.7, () => T.packet(W, q[0], q[1], q[2], 0.38 - 0.254 * ramp(-q[0], 2, 7.4))]);
  }
  L.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f());
  if (o.tags === false) return;
  const away = 1 - ramp(t, X.router[0], X.router[0] + 0.18);
  const rt = pop(t, RT + 0.2, 0.4) * away;
  if (rt > 0) P.tag(W, -6.0, 1.6, 0, "router", { lift: -40, size: 36, pop: rt, alpha: clamp(rt * 2) });
  const coast = pop(t, RT + 0.5, 0.4) * away;
  if (coast > 0) P.tag(W, 9.3, -2.0, 0, "to the coast", { lift: 60, size: 34, pop: coast, alpha: clamp(coast * 2) });
  // (back on as the camera pulls out to the coast, growing to the size the sea's own tag has when it takes over)
  if (pk && t > OUT[3][0]) packetTag(W, pk, ramp(t, OUT[3][0], OUT[3][0] + 0.25) * (1 - ramp(t, X.router[0] - 0.1, X.router[0] + 0.08)), sz);
  // s14: each router's own small table, shown while it reads the packet's number.
  const card = (r, at, until, rows, dx) => {
    const a = pop(t, at, 0.3) * (1 - ramp(t, until, until + 0.2));
    if (a <= 0.001) return;
    const [rx, ry] = W.p(r[0], r[1], 1.5);
    const SCR = new View(0, 0, 1);
    const c = P.card(SCR, rx + dx - 260, ry - 330, 520, rows, { pop: a, row: 78, alpha: clamp(a * 2) * V.alpha });
    if (c) P.leader([c.X + c.w / 2, c.Y + c.h], [rx, ry - 6], { alpha: clamp(a * 2) * V.alpha });
  };
  const row = (num, dir, hot) => ({ parts: [{ text: num, colour: hot ? PAL.accent : PAL.ink }, { text: `  →  ${dir}` }], size: 40, tint: hot ? 1 : 0, under: hot ? 1 : 0, underPart: 0 });
  card(R14.r1, READ1 - 0.12, READ + 0.02, [row("103.102.166.*", "east", t > READ1 + 0.05), row("198.41.0.*", "north", false)], -40);
  card(R14.r2, READ + 0.12, X.sea[0] + 0.1, [row("208.80.154.*", "south", false), row("103.102.166.*", "east", t > READ + 0.25)], 120);
}
// The packet's own small label: the number it is going to.
function packetTag(V, pk, a, sz = 0.62, dx = 0, k = 1) {
  if (a <= 0) return;
  P.tag(V, pk[0], pk[1], pk[2] + sz, IP, { lift: 46, size: 30, colour: PAL.accent, alpha: a, weight: 800, dx, k });
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// SEA (s15, s17): router to router to the landing station, along the cable on the sea bed, ashore in Singapore
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const SEA = new View(940, 470, 52);
const SB = -2.62; // the sea bed
const UNDER = said("s15", "under");
const R1 = [-10.4, -0.6], R2 = [-7.8, -0.6];
const AUS_ST = [-6.6, 1.8]; // the Australian landing station's corner
const DC_IN_SEA = [7.5, 0.5, 0], DC_F = 7.0 / 8.8; // the Singapore shore: the data centre's own slab
const SG_ST = [-3.6, 2.5]; // the Singapore landing station, in the data centre's units
const sgSea = ([x, y]) => [DC_IN_SEA[0] + x * DC_F, DC_IN_SEA[1] + y * DC_F];
const SG_ST_SEA = sgSea([SG_ST[0] + 0.5, SG_ST[1] + 0.45]);
// The road network lies just west of the Australian coast: its east edge (its x 10) meets the coast's slab (x -12), its
// y = 2 road runs on into the coast's road (y 0). A road camera, seen from the sea's world, and the other way round.
const ROADS_SEA = [-19.8, -1.5, 0], ROADS_F = 0.75;
const RS = (SEA.U * ROADS_F) / ROADS.U;
const roadsToSea = (c) => {
  const o = SEA.b(...ROADS_SEA);
  return { k: c.k / RS, fx: o[0] + (c.fx - ROADS.ox) * RS, fy: o[1] + (c.fy - ROADS.oy) * RS, sx: c.sx, sy: c.sy };
};
const roadsBehind = (t) => {
  set(ROADS, nested(SEA, ROADS, ...ROADS_SEA, ROADS_F), SEA.alpha);
  drawRoads(ROADS, t, { full: true, noSea: true, tags: false });
};
const SP = [
  [X.sea[1] - 0.15, -12.6, 0, 0.08],
  [X.sea[1] + 0.12, R1[0], 0, 1.2, 0.5],
  [X.sea[1] + 0.36, -9.1, 0, 0.1, 0.4],
  [X.sea[1] + 0.58, R2[0], 0, 1.2, 0.5],
  [X.sea[1] + 0.82, -6.1, 0, 0.1, 0.4],
  [UNDER - 0.3, -6.1, 1.7, 0.1],
  [UNDER - 0.12, AUS_ST[0] + 0.5, AUS_ST[1] + 0.5, 0.75, 0.3],
  [UNDER + 0.05, -5.0, 3.0, SB + 0.12],
  [X.dc[0] - 0.12, 4.0, 3.0, SB + 0.12],
  [X.dc[0] + 0.05, SG_ST_SEA[0], SG_ST_SEA[1], 0.6],
];
const CUT = [UNDER - 0.38, UNDER + 0.05];
ev("blip", SP[1][0], "router 1 on the coast", { soft: true });
ev("blip", SP[3][0], "router 2 on the coast", { soft: true });
ev("pop", SP[6][0], "into the landing station", { soft: true });
ev("bubble", UNDER + 0.05, "the packet runs along the cable, under the sea", { end: SP[8][0] });
ev("tag", CUT[1] + 0.02, "'undersea cable'", { soft: true });

function drawSea(V, t, o = {}) {
  P.slab(V, -12, -3, 7, 6, 0.6, { drop: 1.6 });
  P.road(V, -12, 0, -6.1, 0, 0.5);
  P.road(V, -6.1, -0.25, -6.1, 1.9, 0.5, { dashes: false });
  // The ocean: sand on the sea bed, water over it, wide and deep, sliced open at the front to show the cable.
  P.block(V, -5, -6, SB - 0.32, 9, 9, 0.32, PAL.butter, { contact: 0, r: 0.05 });
  const cut = inOut(ramp(t, ...CUT));
  P.block(V, -5, -6, SB, 9, 9, -0.32 - SB, "#b4c1fb", {
    contact: 0,
    r: 0.04,
    shades: { top: "#c7d2ff", left: "#b4c1fb", right: "#9eadf2", edge: "#e6ebff", deep: "#8e9ee9" },
    faces: () => {
      const xc = lerp(-5, 4, cut);
      if (cut <= 0) return;
      const top = V.p(-5, 3, -0.32), bot = V.p(-5, 3, SB);
      const grad = g.createLinearGradient(top[0], top[1], bot[0], bot[1]);
      grad.addColorStop(0, "#dfe6ff");
      grad.addColorStop(1, "#97a8f0");
      T.quad(V, [[-5, 3, SB], [xc, 3, SB], [xc, 3, -0.32], [-5, 3, -0.32]], grad);
      for (let i = 0; i < 7; i++) {
        const x = -4.7 + i * 1.3 + 0.3 * Math.sin(t * 1.3 + i);
        if (x > xc - 0.6) continue;
        const z = -0.7 - (i % 3) * 0.5;
        P.line(V, [[x, 3, z], [x + 0.55, 3, z]], "#ffffff", 3, { alpha: 0.45 });
      }
      const end = Math.min(4, xc);
      P.line(V, [[-5, 3, SB + 0.1], [end, 3, SB + 0.1]], "#3b4170", 0.17 * V.U, { cap: "butt" });
      P.line(V, [[-5, 3, SB + 0.12], [end, 3, SB + 0.12]], "#7d86c2", 0.05 * V.U, { cap: "butt" });
      for (let x = -3.5; x < end; x += 2.5) P.block(V, x - 0.2, 2.82, SB, 0.4, 0.18, 0.22, "#3b4170", { contact: 0, r: 0.3 });
      P.line(V, [[-5, 3, -0.32], [xc, 3, -0.32]], PAL.ink, 3, { alpha: 0.5, screen: true });
    },
  });
  const waves = [];
  for (let i = 0; i <= 36; i++) waves.push([-5 + i * 0.25, 3, -0.32 + 0.07 * Math.sin(i * 1.1 + t * 3)]);
  P.line(V, waves, "#ffffff", 4, { alpha: 0.9 });
  for (let i = 0; i < 9; i++) {
    const x = -4.2 + (i % 3) * 2.9 + 0.4 * Math.sin(t + i), y = -5 + Math.floor(i / 3) * 2.6;
    P.line(V, [[x, y, -0.31], [x + 0.8, y, -0.31]], "#ffffff", 3, { alpha: 0.55 });
  }
  // The cable comes ashore at each landing station: down the Australian cliff, up the Singapore beach.
  P.line(V, [[AUS_ST[0] + 0.5, AUS_ST[1] + 0.9, 0.0], [-5.0, 3.0, -0.4], [-5.0, 3.0, SB + 0.1]], "#3b4170", 0.12 * V.U, { alpha: 0.85 });
  P.line(V, [[4.0, 3.0, SB + 0.1], [4.0, 3.0, -0.4], [SG_ST_SEA[0], SG_ST_SEA[1] + 0.4, 0]], "#3b4170", 0.12 * V.U, { alpha: 0.85 });
  const L = [
    [R1[0] + R1[1], () => T.rack(V, R1[0] - 0.5, R1[1] - 0.5, 1.0, 1.0, 1.2, PAL.peri, { lit: Math.max(bump(t, SP[1][0], 0.4), backLit(t, 0.93)), blink: (j) => 0.5 + 0.5 * Math.sin(t * 6 + j) })],
    [R2[0] + R2[1], () => T.rack(V, R2[0] - 0.5, R2[1] - 0.5, 1.0, 1.0, 1.2, PAL.peri, { lit: Math.max(bump(t, SP[3][0], 0.4), backLit(t, 0.84)), blink: (j) => 0.5 + 0.5 * Math.sin(t * 5 + j) })],
    [AUS_ST[0] + AUS_ST[1] + 1, () => T.station(V, ...AUS_ST, { lit: bump(t, SP[6][0], 0.4) })],
    [-12, () => T.tree(V, -11.5, -2.6, 0.9, 1.3)],
    [-6.2, () => T.tree(V, -8.6, -2.6, 0.8, 1.1)],
  ];
  // The packets: the request going (s15) and the page coming back (s17, s18).
  const items = [];
  if (t > SP[0][0] && t < X.dc[0] - 0.02) items.push({ p: along(SP, t), s: 0.55, tag: true });
  for (let i = 0; i < PACKETS; i++) {
    const q = seaLeg(i, t);
    if (q) items.push({ p: q, s: 0.32 });
  }
  for (const it of items) {
    if (it.p[2] < -0.2) T.packet(V, it.p[0], it.p[1], it.p[2], it.s); // in front of the cut face
    else if (it.p[0] < 4) L.push([it.p[0] + it.p[1] + 0.8, () => T.packet(V, it.p[0], it.p[1], it.p[2], it.s)]);
  }
  L.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f());
  // Singapore: the data centre's slab (its building rises in s16).
  set(DC, nested(V, DC, ...DC_IN_SEA, DC_F), V.alpha);
  drawDC(DC, t, { inSea: !o.dcTags });
  for (const it of items) if (it.p[2] >= -0.2 && it.p[0] >= 4) T.packet(V, it.p[0], it.p[1], it.p[2], it.s);
  const go = items.find((it) => it.tag);
  if (go) packetTag(V, go.p, pop(t, SP[0][0] + 0.02, 0.3) * (1 - ramp(t, X.dc[0] - 0.1, X.dc[0] + 0.1)), 0.55);
  const ta = pop(t, X.sea[1] - 0.05, 0.4), tb = pop(t, X.sea[1] + 0.12, 0.4);
  const fade = 1 - ramp(t, X.dc[0], X.dc[0] + 0.25);
  if (ta > 0) P.tag(V, -11.2, 2.6, 0, "Australia", { lift: -40, size: 38, pop: ta, alpha: clamp(ta * 2) * fade, weight: 800 });
  if (tb > 0) P.tag(V, 8.5, -3, 0, "Singapore", { lift: 44, size: 38, pop: tb, alpha: clamp(tb * 2) * fade, weight: 800 });
  const tc = pop(t, CUT[1] + 0.02, 0.4) * fade, td = pop(t, CUT[1] + 0.25, 0.4) * fade;
  // Under the cable where it leaves the Australian cliff (the packet has already gone by, its own tag rides above).
  if (tc > 0) P.tag(V, -5.0, 3, SB + 0.1, "undersea cable", { lift: -55, size: 36, dx: -100, pop: tc, alpha: clamp(tc * 2) });
  if (td > 0) {
    const at = V.p(-5.0, 3, SB + 0.1);
    P.pill(...at, "example: INDIGO-West", { lift: -132, size: 26, dx: -100, k: V.k, pop: td, alpha: clamp(td * 2) * V.alpha, line: false, weight: 600 });
    P.pill(...at, `Perth–Singapore, ${CABLE_KM.toLocaleString("en")} km`, { lift: -180, size: 26, dx: -100, k: V.k, pop: td, alpha: clamp(td * 2) * V.alpha, line: false, weight: 600 });
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// DATA CENTRE (s16, s17): Wikimedia's servers in Singapore, at 103.102.166.224
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const DC = new View(960, 610, 62);
const DC_RISE = [X.dc[0] + 0.3, X.dc[0] + 0.86];
const SERVER16 = said("s16", "server"), SING = said("s16", "singapore");
const IN = [SING - 0.52, SING - 0.12];
const ROOF = [S("s17") + 0.04, S("s17") + 0.46];
const DOOR = [-0.9, 2.6];
// The way in: from the landing station along the front road to the door.
const INWAY = [
  [X.dc[0] + 0.05, SG_ST[0] + 0.5, SG_ST[1] + 0.45, 0.6],
  [X.dc[0] + 0.3, SG_ST[0] + 1.1, 3.6, 0.06, 0.3],
  [IN[0], -1.6, 3.6, 0.06],
  [IN[0] + 0.15, DOOR[0], 3.6, 0.06],
  [IN[1], DOOR[0], DOOR[1], 0.06],
];
ev("thud", DC_RISE[0] + 0.32, "the data centre lands", { soft: true });
ev("tag", SERVER16 + 0.08, "'Wikipedia's server · Singapore'", { soft: true });
ev("tag", SERVER16 + 0.62, "'103.102.166.224' on the building", { lead: true }); // in the pause before "Singapore"
ev("blip", IN[1], "the packet goes in at the door");
ev("pop", ROOF[0] + 0.12, "the roof lifts", { soft: true });
// The page's size, held at the top of the frame while the camera follows its packets home (42.85 to 44.4 s).
const PKT_NOTE = [ROOF[0] + 0.31, X.ret3[0] + 0.1];
ev("tag", PKT_NOTE[0], "'page text alone ≈ 36 packets'", { soft: true });
function drawPacketsNote(t) {
  const a = pop(t, PKT_NOTE[0], 0.4) * (1 - ramp(t, PKT_NOTE[1], PKT_NOTE[1] + 0.25));
  if (a <= 0.001) return;
  P.pill(960, 22, `page text alone ≈ ${PACKETS} packets`, { lift: -6, size: 34, pop: a, alpha: clamp(a * 2), line: false, weight: 700 });
}

// ── The way back: each of the 36 packets leaves the door and travels back the same way: the shore road, the
// landing station, the cable, the Australian coast and its two routers, the road network, your Wi-Fi router, your
// phone. Its time is the same in every diorama, so the camera can follow the stream from one to the next.
const OUT0 = ROOF[1] + 0.03, GAP = 0.022;
const LEG = { dc: 0.35, sea: 0.75, roads: 0.5, home: 0.3 };
const leave = (i) => OUT0 + i * GAP;
const stage = (i, t) => {
  let u = t - leave(i);
  if (u < 0) return null;
  for (const [key, d] of Object.entries(LEG)) {
    if (u < d) return { key, f: u / d };
    u -= d;
  }
  return { key: "done", f: 1 };
};
const LAND_AT = (i) => leave(i) + LEG.dc + LEG.sea + LEG.roads + LEG.home;
const landed = (t) => Array.from({ length: PACKETS }, (_, i) => i).filter((i) => t >= LAND_AT(i)).length;
for (let i = 0; i < PACKETS; i += 3) ev("pop", leave(i), `reply packet ${i + 1} leaves`, { soft: true, under: true, rise: i % 4 });
ev("pop", LAND_AT(0), "the first reply packet lands in your phone");
for (let i = 3; i < PACKETS; i += 4) ev("pop", LAND_AT(i), `reply packet ${i + 1} lands`, { soft: true, under: true });
ev("chime", LAND_AT(PACKETS - 1) + 0.04, "the page is complete");
ev("tag", said("s18", "addressed") + 0.05, "'to: 203.0.113.24'");
const BACK_DC = [[0, DOOR[0], DOOR[1], 0.06], [0.3, DOOR[0], 3.6, 0.06], [0.8, SG_ST[0] + 1.1, 3.6, 0.06], [1, SG_ST[0] + 0.5, SG_ST[1] + 0.45, 0.6, 0.3]];
const BACK_SEA = [
  [0, SG_ST_SEA[0], SG_ST_SEA[1], 0.6], [0.08, 4.0, 3.0, SB + 0.12], [0.62, -5.0, 3.0, SB + 0.12],
  [0.7, AUS_ST[0] + 0.5, AUS_ST[1] + 0.5, 0.75], [0.75, -6.1, 0.9, 0.08, 0.25], [0.79, -6.1, 0.05, 0.08],
  [0.84, R2[0], -0.6, 1.25, 0.45], [0.88, R2[0] - 0.9, 0.05, 0.08, 0.3],
  [0.93, R1[0], -0.6, 1.25, 0.45], [0.96, R1[0] - 0.8, 0.05, 0.08, 0.3], [1, -12.6, 0.0, 0.08],
];
// While the page's packets cross the coast, each of its two routers flickers as they go over it.
const backLit = (t, f) => { const a = OUT0 + 0.35 + f * 0.75; return ramp(t, a - 0.05, a) * (1 - ramp(t, a + (PACKETS - 1) * GAP, a + (PACKETS - 1) * GAP + 0.1)) * (0.55 + 0.45 * Math.sin(t * 46)); };
const BACK_ROADS = [
  [0, 9.6, 2, 0.08], [0.2, 6, 2, 1.5, 0.4], [0.4, 2, 2, 1.5, 0.4], [0.6, -2, 2, 1.5, 0.4], [0.72, -4.2, 2, 0.08, 0.3],
  [0.8, -5.2, 1.7, 0.08], [0.86, -6.0, 0.9, 0.5], [0.92, -6.8, 1.7, 0.08], [1, -7.4, 2, 0.08],
];
const inRouter1 = (q) => Math.abs(q[0] + 6.0) < 0.5 && Math.abs(q[1] - 0.9) < 0.5;
const dcLeg = (i, t) => {
  const s2 = stage(i, t);
  return s2 && s2.key === "dc" ? along(BACK_DC, s2.f) : null;
};
const seaLeg = (i, t) => {
  const s2 = stage(i, t);
  return s2 && s2.key === "sea" ? along(BACK_SEA, s2.f) : null;
};
const roadsLeg = (i, t) => {
  const s2 = stage(i, t);
  return s2 && s2.key === "roads" ? along(BACK_ROADS, s2.f) : null;
};
const homeLeg = (i, t) => {
  const s2 = stage(i, t);
  if (!s2 || s2.key !== "home") return null;
  const p = along([[0, 4.0, 1.0, 0], [0.55, WTOP[0], WTOP[1], WTOP[2], 0.3], [1, PTOP[0] + 0.9, PTOP[1], 0.6, 0.5]], s2.f);
  return { p, s: 0.42 * (1 - ramp(s2.f, 0.85, 1)), a: 1 };
};

function drawDC(V, t, o = {}) {
  P.slab(V, -4.4, -4.4, 8.8, 8.8, HOME_T, { shadow: o.inSea ? 0.7 : 1 });
  P.road(V, DOOR[0], 2.4, DOOR[0], 3.6, 0.6, { dashes: false });
  P.road(V, SG_ST[0] + 1.0, 3.6, DOOR[0] + 0.3, 3.6, 0.55);
  const rise = back(ramp(t, ...DC_RISE), 1.3);
  const lid = back(ramp(t, ...ROOF), 1.6);
  const pulse = bump(t, SING, 0.36);
  const sending = t > ROOF[0];
  T.tree(V, -4.0, -4.0, 0.9, 1.3);
  T.tree(V, 3.1, -4.0, 0.9, 1.6);
  T.station(V, ...SG_ST, { lit: bump(t, X.dc[0] + 0.05, 0.4) });
  T.dataCentre(V, {
    rise,
    lid,
    pulse,
    blink: (i, row, c) => (sending ? (hash(i * 31 + row * 7 + c + Math.floor(t * 12) * 13) > 0.55 ? 1 : 0.1) : (i + row + c) % 3 === 0 ? 0.9 : 0.2),
  });
  // The request, from the landing station along the shore road to the door.
  if (t > X.dc[0] - 0.02 && t < IN[1] + 0.12) {
    const p = along(INWAY, t);
    const sz = 0.62 * (1 - ramp(t, IN[1], IN[1] + 0.12));
    T.packet(V, p[0], p[1], p[2], sz);
    if (t < IN[1] && !o.inSea) packetTag(V, p, 1, 0.62);
  }
  for (let i = 0; i < PACKETS; i++) {
    const q = dcLeg(i, t);
    if (q) T.packet(V, q[0], q[1], q[2], 0.46);
  }
  if (o.inSea) return;
  const ts = pop(t, SERVER16 + 0.08, 0.4), ti = pop(t, SERVER16 + 0.62, 0.4);
  const roofZ = 0.3 + 2.5 * Math.max(rise, 0.01) + lid * 2.2 + 0.35;
  const away = 1 - ramp(t, X.ret1[0], X.ret1[0] + 0.2);
  if (ts > 0) P.tag(V, 2.5, -2.5, roofZ, "Wikipedia's server · Singapore", { lift: 70, size: 36, dx: 200, pop: ts, alpha: clamp(ts * 2) * away });
  if (ti > 0) P.tag(V, -2.5, 2.5, roofZ, IP, { lift: 90, size: 46, colour: PAL.accent, pop: ti, alpha: clamp(ti * 2) * away, weight: 800, dx: -60 });
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// RECAP (s19): three islands, three steps, above the road network
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const RECAP = [new View(360, 660, 56), new View(960, 660, 56), new View(1560, 660, 56)];
const RC_NAME = said("s19", "name"), RC_AND = said("s19", "and"), RC_WAY = said("s19", "way");
const RC = [
  { rise: X.recap[0] + 0.02, card: RC_NAME - 0.04 },
  { rise: X.recap[0] + 0.16, card: RC_AND + 0.24 },
  { rise: X.recap[0] + 0.3, card: RC_WAY - 0.42 },
];
const RUN = [RC_WAY - 0.3, RC_WAY + 0.3];
RC.forEach((r, i) => ev("rise", r.card, `recap card ${i + 1}`, { rise: i }));
ev("pop", RUN[1] + 0.02, "the packet reaches the data centre", { soft: true });
function drawRecap(V, t) {
  const cards = [["1 · ", "name → number"], ["2 · ", "number → route"], ["3 · ", "packets back"]];
  RECAP.forEach((R0, i) => {
    const r = back(ramp(t, RC[i].rise, RC[i].rise + 0.5), 1.5);
    if (r <= 0.001) return;
    const v0 = new View(R0.ox, R0.oy, R0.U, V.cam);
    v0.alpha = V.alpha;
    const v = scaled(v0, r);
    P.slab(v, -2.5, -2.5, 5, 5, ISLE_T, { drop: 1.6 });
    if (i === 0) T.server(v, -1.3, -1.3, 2.6, 2.6, 2.8, PAL.mint, { blink: (j) => 0.5 + 0.5 * Math.sin(t * 5 + j) });
    if (i === 1) {
      P.road(v, -1.6, 1.0, 1.2, -1.3, 0.4, { dashes: false });
      T.rack(v, -2.2, 0.4, 1.1, 1.1, 1.3, PAL.peri, { blink: (j) => 0.5 + 0.5 * Math.sin(t * 6 + j) });
      T.rack(v, 0.7, -1.9, 1.1, 1.1, 1.3, PAL.peri, { blink: (j) => 0.5 + 0.5 * Math.sin(t * 5 + j) });
      const f = (t * 0.6) % 1;
      T.packet(v, lerp(-1.4, 0.9, f), lerp(0.8, -1.1, f), 0.05, 0.5);
    }
    if (i === 2) {
      const sub = v.nest(0, 0, 0, 0.55);
      T.dataCentre(sub, { blink: (a, b, c) => (hash(a * 31 + b * 7 + c + Math.floor(t * 8) * 13) > 0.5 ? 1 : 0.15) });
      for (let k = 0; k < 3; k++) {
        const q = ((t * 0.8 + k / 3) % 1) * 2.0;
        T.packet(v, -0.8 - q, 1.6 + q * 0.4, 0.05, 0.42, { alpha: 1 - clamp((q - 1.6) / 0.4) });
      }
    }
    const c = pop(t, RC[i].card, 0.42);
    if (c > 0) {
      const card = P.card(v0, 110 + i * 600, 120, 500, [{ parts: [{ text: cards[i][0], colour: PAL.accent }, { text: cards[i][1] }], size: 44 }], { pop: c, row: 110, alpha: clamp(c * 2) });
      if (card) P.leader([card.X + card.w / 2, card.Y + card.h], v.p(0, 0, i === 0 ? 2.8 : i === 1 ? 1.3 : 1.9), { alpha: v.alpha * clamp(c * 2) });
    }
  });
  if (t > RUN[0] && t < RUN[1] + 0.3) {
    const f = inOut(ramp(t, ...RUN));
    const A = RECAP[0].b(0, 0, 3.0), B = RECAP[1].b(0, 0, 1.4), Cc = RECAP[2].b(0, 0, 2.0);
    const seg = f < 0.5 ? [A, B, f * 2] : [B, Cc, (f - 0.5) * 2];
    const x = lerp(seg[0][0], seg[1][0], seg[2]), y = lerp(seg[0][1], seg[1][1], seg[2]) - 80 * 4 * seg[2] * (1 - seg[2]);
    const v = new View(x, y, 56, V.cam);
    v.alpha = V.alpha * (1 - ramp(t, RUN[1], RUN[1] + 0.25));
    T.packet(v, 0, 0, 0, 0.6);
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// The frame: where the camera is, and which dioramas it sees
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const RECAP_AWAY = [1300, 520]; // where your house lies from the recap, on the screen
const PUSH01 = 0.0088; // s01's slow push a second (s20 ends on the same line, so the loop is seamless)
const homeLoopCam = (t) => {
  if (t < 20) return { k: 1 + PUSH01 * Math.min(t, X.city[0]), fx: 960, fy: 560, sx: 960, sy: 560 };
  return { k: 1 - PUSH01 * (DUR - t), fx: 960, fy: 560, sx: 960, sy: 560 };
};
const STREETF = (city) => {
  const [sx, sy] = [960, 650];
  const [bx, by] = CITY.b(...STREET_AT, 0);
  return { k: STREET.U / (CITY.U * STREET_F), fx: bx, fy: by, sx, sy };
};
// The street's own camera after the push in: a slow push, then down to the sign (s04).
const streetCam = (t) => {
  const c0 = drift(t, X.street[1], X.bill[0], 0.025, [960, 400]);
  if (t < X.bill[0]) return c0;
  return zoomed(move(drift(X.bill[0], X.street[1], X.bill[0], 0.025, [960, 400]), BILLF, prog(t, "bill")), 1 + 0.02 * ramp(t, X.bill[1], X.dns[0]));
};
// The district's camera: close on your phone and the resolver, then out, then to each server in turn, then in.
const districtCam = (t) => {
  const seq = [
    [X.dns[1], CLOSE],
    [X.pair[0], zoomed(CLOSE, 1.02)],
    [X.pair[1], CONTACTF],
    [X.back[0], zoomed(CONTACTF, 1.025)],
    [X.back[1], WIDE],
    [X.toRoot[0], zoomed(WIDE, 1.02)],
    [X.toRoot[1], ROOTF],
    [X.toOrg[0], zoomed(ROOTF, 1.02)],
    [X.toOrg[1], ORGF],
    [X.toNs[0], ORGF],
    [X.toNs[1], NSF],
    [X.cache[0], zoomed(NSF, 1.025)],
    [X.cache[1], CACHE],
    [X.home2[0], zoomed(CACHE, 1.025)],
    [X.home2[1], HOMEF],
  ];
  if (t <= seq[0][0]) return seq[0][1];
  for (let i = 1; i < seq.length; i++) {
    if (t <= seq[i][0]) {
      const [t0, c0] = seq[i - 1], [t1, c1] = seq[i];
      const moving = [X.pair[1], X.back[1], X.toRoot[1], X.toOrg[1], X.toNs[1], X.cache[1], X.home2[1]].includes(t1);
      const e = moving ? inOut(ramp(t, t0, t1)) : ramp(t, t0, t1);
      return move(c0, c1, e);
    }
  }
  return seq.at(-1)[1];
};
const seaCam = (t) => ({ k: 1, fx: 940, fy: 520, sx: lerp(940 + 140, 940 - 170, inOut(ramp(t, X.sea[1], X.dc[0] + 0.2))), sy: 572 });
const DCF_SEA = (drift = 1) => {
  const [bx, by] = SEA.b(...DC_IN_SEA);
  return { k: (DC.U / (SEA.U * DC_F)) * drift, fx: bx, fy: by, sx: 960, sy: 610 };
};
const dcDrift = (t) => 1 + 0.04 * ramp(t, X.dc[1], X.ret1[0]);
const SEA_BACK = look(0.95, ...SEA.b(-1.5, 0.5, 0));
const SEA_AUS = look(1.45, ...SEA.b(-8.8, 0.3, 0.3));
const ROADS_EAST = look(1.0, ...ROADS.b(1, -1, 0));
const HOME_NEAR = () => { const c = HOME_IN_ROADS_CAM(); return { ...zoomed(c, 0.78), sx: 1080, sy: 500 }; };

function frame(t) {
  g.clearRect(0, 0, 1920, 1080);
  const glow = g.createRadialGradient(960, 500, 60, 960, 540, 1150);
  glow.addColorStop(0, "rgba(255,255,255,0.6)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, 1920, 1080);

  if (t < X.city[0]) {
    // s01
    set(HOME, homeLoopCam(t));
    drawHome(HOME, t);
  } else if (t < X.street[1]) {
    // s02: pull out to the city, then (s03) push in to the crossroads tile while the rest of the city sinks.
    const K = (HOME.U / (CITY.U * HOME_F)) * homeLoopCam(X.city[0]).k;
    const end = CITY.b(...HOME_AT);
    let cam;
    if (t < X.street[0]) {
      const e = prog(t, "city");
      const at = [lerp(960, end[0], e), lerp(560, end[1], e)];
      const slow = 1 - 0.02 * ramp(t, X.city[1], X.street[0]);
      cam = { k: K ** (1 - e) * slow, fx: end[0], fy: end[1], sx: at[0], sy: at[1] };
    } else {
      const c0 = { k: 0.98, fx: end[0], fy: end[1], sx: end[0], sy: end[1] };
      cam = move(c0, STREETF(), prog(t, "street"));
    }
    set(CITY, cam);
    drawCity(CITY, t, { sink: inOut(ramp(t, X.street[0] + 0.25, X.street[1] - 0.05)) });
  } else if (t < X.dns[0]) {
    set(STREET, streetCam(t));
    drawStreet(STREET, t);
  } else if (t < X.dns[1]) {
    // s04 -> s05: a pan up the street's axis to the district.
    const e = prog(t, "dns");
    const [cA, cB] = pan(e, [2000, -1150], streetCam(X.dns[0]), CLOSE);
    set(STREET, cA);
    drawStreet(STREET, t);
    set(D, cB);
    drawDistrict(t);
  } else if (t < X.home2[1]) {
    // s05 to s11, and the answer's flight home.
    set(D, districtCam(t));
    drawDistrict(t);
    if (t > X.pair[0] && t < X.back[1]) drawAnalogy(t);
    if (t > X.cache[0]) drawCacheExtras(t, inOut(ramp(t, X.home2[0], X.home2[0] + 0.4)));
    if (t > ARRIVE - 0.05) drawHomeLabels(HOME, t);
  } else if (t < X.roads[0]) {
    // s12: your house, full frame (the district has sunk away around it).
    set(HOME, drift(t, X.home2[1], X.roads[0], 0.035, [760, 330]));
    drawHome(HOME, t);
    drawHomeLabels(HOME, t);
    answerCard(t);
  } else if (t < X.sea[0]) {
    // s13: pull out; the road network unfolds around your slab. s14: push in on the first two routers.
    const c0 = drift(X.roads[0], X.home2[1], X.roads[0], 0.035, [760, 330]);
    const K = (HOME.U * c0.k) / (ROADS.U * HOME_F2);
    const end = ROADS.b(...HOME_IN_ROADS);
    const at0 = apply(c0, [960, 560]);
    let cam;
    if (t < X.roads[1]) {
      const e = prog(t, "roads");
      cam = { k: K ** (1 - e), fx: end[0], fy: end[1], sx: lerp(at0[0], end[0], e), sy: lerp(at0[1], end[1], e) };
    } else {
      const base = { k: 1 - 0.015 * ramp(t, X.roads[1], X.router[0]), fx: end[0], fy: end[1], sx: end[0], sy: end[1] };
      cam = t < X.router[0] ? base : zoomed(move({ ...base, k: 0.985 }, ROUTERF, prog(t, "router")), 1 + 0.03 * ramp(t, X.router[1], X.sea[0]));
    }
    set(ROADS, cam);
    drawRoads(ROADS, t);
    if (t < X.roads[0] + 0.3) {
      set(HOME, nested(ROADS, HOME, ...HOME_IN_ROADS, HOME_F2));
      drawHomeLabels(HOME, t);
    }
  } else if (t < X.sea[1]) {
    // s14 -> s15: pull out from the two routers and travel east with the packet, over the rest of the network, to the
    // coast (the coast's slab lies just past the network's east edge, one world).
    set(SEA, move(roadsToSea(zoomed(ROUTERF, 1.03)), seaCam(X.sea[1]), prog(t, "sea")));
    set(ROADS, nested(SEA, ROADS, ...ROADS_SEA, ROADS_F));
    drawRoads(ROADS, t, { noSea: true });
    drawSea(SEA, t);
  } else if (t < X.dc[0]) {
    set(SEA, seaCam(t));
    roadsBehind(t);
    drawSea(SEA, t);
  } else if (t < X.dc[1]) {
    set(SEA, move(seaCam(X.dc[0]), DCF_SEA(), prog(t, "dc")));
    if (t < X.dc[0] + 0.2) roadsBehind(t);
    drawSea(SEA, t);
  } else if (t < X.ret1[0]) {
    // s16, s17: the data centre, full frame (the sea is round it, out of frame).
    set(SEA, DCF_SEA(dcDrift(t)));
    drawSea(SEA, t, { dcTags: true });
  } else if (t < X.ret3[0]) {
    // The way back: out over the sea, then along it to the Australian coast.
    const cam = t < X.ret1[1] ? move(DCF_SEA(dcDrift(X.ret1[0])), SEA_BACK, prog(t, "ret1")) : move(SEA_BACK, SEA_AUS, prog(t, "ret2"));
    set(SEA, cam);
    if (t > X.ret1[0] + 0.2) roadsBehind(t);
    drawSea(SEA, t, { dcTags: t < X.ret1[0] + 0.25 });
  } else if (t < X.ret3[1]) {
    // ... over the coast's two routers to the road network's edge, and out over the whole network.
    set(SEA, move(SEA_AUS, roadsToSea(ROADS_EAST), prog(t, "ret3")));
    roadsBehind(t);
    drawSea(SEA, t);
  } else if (t < X.recap[0]) {
    // ... and in to your house: the packets come through your Wi-Fi router into the phone.
    const cam = t < X.ret4[1] ? move(ROADS_EAST, HOME_NEAR(), prog(t, "ret4")) : zoomed(HOME_NEAR(), 1 + 0.03 * ramp(t, X.ret4[1], X.recap[0]));
    set(ROADS, cam);
    drawRoads(ROADS, t, { full: true, tags: false, noSea: true });
    if (t < X.ret4[1]) {
      set(SEA, roadsToSea(cam));
      drawSea(SEA, t);
    }
    const addr = pop(t, said("s18", "addressed") + 0.05, 0.4);
    if (addr > 0) {
      set(HOME, nested(ROADS, HOME, ...HOME_IN_ROADS, HOME_F2));
      const [ax, ay] = HOME.p(PTOP[0], PTOP[1], PTOP[2] + 0.3);
      P.pill(ax, ay, `to: ${HOME_IP}  (your home)`, { lift: 70, size: 36, dx: 40, pop: addr, alpha: clamp(addr * 2) * (1 - ramp(t, X.recap[0] - 0.2, X.recap[0])) });
    }
  } else if (t < X.recap[1]) {
    // s18 -> s19: lift up to the recap.
    const e = prog(t, "recap");
    const c0 = zoomed(HOME_NEAR(), 1.03);
    const [cA, cB] = pan(e, RECAP_AWAY.map((d) => -d), c0);
    set(ROADS, cA);
    drawRoads(ROADS, t, { full: true, tags: false, noSea: true });
    drawRecap(new View(0, 0, 1, cB), t);
  } else if (t < X.loop[0]) {
    drawRecap(new View(0, 0, 1, drift(t, X.recap[1], X.loop[0], 0.03, [960, 520])), t);
  } else {
    // s20: back down to the opening picture (the road network has gone back into the ground meanwhile).
    const e = prog(t, "loop");
    const [cA, cB] = pan(e, RECAP_AWAY, drift(X.loop[0], X.recap[1], X.loop[0], 0.03, [960, 520]), homeLoopCam(t));
    if (e < 1) drawRecap(new View(0, 0, 1, cA), t);
    set(HOME, cB);
    drawHome(HOME, t);
  }
}

film.each((t) => {
  frame(t);
  drawPacketsNote(t);
});
film.finish();
