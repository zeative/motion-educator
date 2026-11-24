// "Kenapa jantung makin cepat waktu kamu lari?" in the Pixel template. Built from storyboard.json: every time below
// is a shot's start or end, a word of the take (voice/voice.json) or a kick of the bed (music/kicks.json, from
// beats.build.py). The picture advances on twelves (template.json "stepped": 12): the renderer seeks the timeline to
// the held time, and every frame is drawn from that time alone.
//
// The whole film is one game screen: a 270 x 480 framebuffer of the PICO-8 palette (pixel.js), shown four times larger
// with hard edges. The game's HUD is a band across the top (beats a minute, an oxygen bar, litres a minute, always at
// their true values); the playfield is the park, open sky over hills and a running track, where the heart floats over
// the player as in the template's concept still; the dialogue box sits at the bottom. Sprites and every letter are
// drawn at that one pixel size. The heart squeezes on the bed's kick: on every kick while running (150 a minute), on
// every other kick at rest (75). Every number on screen and every bottle, block and beat drawn is computed from the
// fact sheet (f1 to f3, f8): 75 x 70 mL = 5,25 L a minute at rest; 150 x 70 mL = 10,5 L with the faster beat alone;
// 150 x 130 mL = 19,5 L with the stronger beat as well; 19,5 / 5,25 = 3,7.
import { createFilm } from "../../kit/engine/motion.js";
import { FB, C, W, present, loadFonts, fonts, textWidth, hash, dither, CLEAR } from "./pixel.js";
import * as A from "./art.js";

const storyboard = await (await fetch("storyboard.json")).json();
const KICKS = (await (await fetch("music/kicks.json")).json()).kicks;
const film = await createFilm({ storyboard });
const { shots: s, voiced, duration: DUR } = film;
await loadFonts();
const F8 = fonts.small, F16 = fonts.big, F24 = fonts.huge;
const { black: K, navy: N, plum: P, green: G, brown: B, dark: D, grey: Y, cream: Wc, red: R, orange: O, yellow: Yl, lime: L, sky: S, lav: V, pink: I, peach: E } = C;

// ── The numbers (storyboard.build.py, f1 to f3) ─────────────────────────────────────────────────────────────────
const HR_REST = 75, SV_REST = 70, HR_RUN = 150, SV_RUN = 130;
const CO_REST = (HR_REST * SV_REST) / 1000; // 5.25 L a minute
const CO_MID = (HR_RUN * SV_REST) / 1000; // 10.5 L: the faster beat alone
const CO_RUN = (HR_RUN * SV_RUN) / 1000; // 19.5 L: faster and stronger
const RATIO = CO_RUN / CO_REST; // 3.71: "nyaris empat kali lipat"
const dec = (v, d) => v.toFixed(d).replace(".", ",");
const T_REST = dec(CO_REST, 2), T_MID = dec(CO_MID, 1), T_RUN = dec(CO_RUN, 1), T_RATIO = dec(RATIO, 1);
console.assert(T_REST === "5,25" && T_MID === "10,5" && T_RUN === "19,5" && T_RATIO === "3,7");

// ── Time ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const FPS = 12;
const wordAt = (id, text) => voiced[id].words.find((w) => w[2].toLowerCase().replace(/[^a-z-]/g, "") === text)[0];
const frames = (t, at) => Math.floor((t - at) * FPS + 1e-6); // whole frames since `at` (negative before)
const mod = (a, m) => ((a % m) + m) % m;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const kickAt = (t) => {
  let lo = 0, hi = KICKS.length - 1, r = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (KICKS[m] <= t + 1e-6) (r = m), (lo = m + 1);
    else hi = m - 1;
  }
  return r;
};
// The rest begins when the park is back on screen (after s07's wipe); the pacemaker's signal lands on the kick during
// "ngegas", and from that beat on the heart beats on every kick.
const REST_FROM = s.s07.start + 5 / FPS;
const SPARK = KICKS.find((k) => k >= wordAt("s11", "ngegas"));
const resting = (t) => t >= REST_FROM && t < SPARK;
const beats = (i) => (KICKS[i] >= REST_FROM && KICKS[i] < SPARK ? i % 2 === 0 : true);
const beatNow = (t, only = beats) => {
  const i = kickAt(t + 0.06);
  return i >= 0 && t - KICKS[i] < 0.12 && only(i) ? i : -1;
};
const runFrame = (t) => {
  const i = kickAt(t + 0.06);
  return (i * 2 + (t - KICKS[i] >= 0.2 ? 1 : 0)) % 4;
};
// He stands up and breaks into a run on "Begitu kamu lari".
const RISE_AT = wordAt("s10", "begitu") - 0.05, RUN_AT = wordAt("s10", "lari");
const S10_MAP = wordAt("s10", "otot") - 0.2; // the cut to the body map, as the muscles send their signal
const S11_HEART = wordAt("s11", "nyuruh") + 0.05; // the cut from the map into the heart
// The park scrolls while the player runs: P is its position in seconds of running. In s15 to s17 it is counted back
// from the end, so the last frame is one step before frame 0 (the loop).
const parkP = (t) => {
  if (t < s.s02.start) return t;
  if (t < RUN_AT) return s.s02.start;
  if (t < s.s13b.start) return s.s02.start + (t - RUN_AT);
  if (t < s.s15.start) return s.s02.start + (s.s13b.start - RUN_AT);
  if (t < s.s16.start) return t - s.s16.start + (s.s17.start - DUR);
  if (t < s.s17.start) return s.s17.start - DUR;
  return t - DUR;
};

// ── Sound events: logged as the film is built, written out by render.mjs --events for cues.build.py ─────────────
const log = (window.__events = []);
const ev = (kind, at, note = "") => log.push({ kind, at: +at.toFixed(3), end: +at.toFixed(3), note });

// ── Layout (game pixels) ─────────────────────────────────────────────────────────────────────────────────────────
const BAND = 96, TOP = 98, BOTTOM = 303, BOX_Y = 304, BOX_H = 67, SAFE_L = 16, SAFE_R = 232;
const PLAYER = { x: 82, feet: 274 };
const BENCH = { x: 24, y: 265 };
const SKY_HEART = { x: 150, y: 168, s: 78 };

// ── Drawing helpers ─────────────────────────────────────────────────────────────────────────────────────────────
const lineH = (f) => (f === F8 ? 8 : f === F16 ? 18 : 26);
// A pixel tag: a small game window with its words, and a dotted leader to the thing it names. All in the 16-px face.
function tag(fb, lines, x, y, { to = null, lead = Wc, align = "left" } = {}) {
  const pad = 3;
  const w = Math.max(...lines.map((l) => textWidth(l.text, l.font ?? F16))) + 2 * pad + 4;
  const h = lines.reduce((a, l) => a + lineH(l.font ?? F16), 0) - 4 + 2 * pad + 4;
  if (align === "right") x -= w;
  if (align === "center") x -= Math.floor(w / 2);
  x = clamp(Math.round(x), SAFE_L - 4, SAFE_R + 4 - w);
  y = clamp(Math.round(y), TOP + 2, BOTTOM - h);
  if (to) {
    const [tx, ty] = to;
    const sx = tx < x ? x : tx > x + w ? x + w - 1 : clamp(tx, x + 2, x + w - 3);
    const sy = ty < y ? y : ty > y + h ? y + h - 1 : y + Math.floor(h / 2);
    fb.line(sx, sy, tx, ty, N, { dash: 2, gap: 1 });
    fb.line(sx + 1, sy, tx + 1, ty, lead, { dash: 2, gap: 1 });
    fb.rect(tx - 1, ty - 1, 3, 3, N);
    fb.px(tx, ty, lead);
  }
  fb.window(x, y, w, h);
  let yy = y + pad + 2;
  for (const l of lines) {
    fb.text(l.text, x + pad + 2, yy, { font: l.font ?? F16, colour: l.colour ?? Wc, count: l.count ?? Infinity });
    yy += lineH(l.font ?? F16);
  }
  return { x, y, w, h };
}
// Lettering straight on the playfield: a navy drop shadow so it reads on sky, grass or tissue.
function say(fb, str, x, y, { font = F16, colour = Wc, count = Infinity, align = "left", colours = null } = {}) {
  fb.text(str, x + 1, y + 1, { font, colour: N, count, align, colours: colours && colours.map(() => N) });
  return fb.text(str, x, y, { font, colour, count, align, colours });
}
function blitC(fb, spr, x, y, opts) {
  fb.blit(spr, Math.round(x - spr.cx), Math.round(y - spr.cy), opts);
}
function heartAt(fb, t, x, y, size, opts = {}) {
  const on = (opts.beat ?? beatNow(t)) >= 0;
  const spr = A.heart(size, { squeeze: on ? opts.hard ?? 1 : 0, open: opts.open ?? false, pace: opts.pace ?? 0, detail: size >= 40 });
  blitC(fb, spr, x, y);
  return spr;
}
// A dotted nerve: a yellow dotted line with a dark edge, so it reads on skin, sky and navy alike.
function nerve(fb, pts, upto = Infinity) {
  let run = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const l = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]);
    if (run >= upto) break;
    const p = Math.min(1, (upto - run) / l);
    const end = [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * p, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * p];
    fb.line(pts[k][0] + 1, pts[k][1] + 1, end[0] + 1, end[1] + 1, B, { dash: 2, gap: 2 });
    fb.line(pts[k][0], pts[k][1], end[0], end[1], Yl, { dash: 2, gap: 2 });
    run += l;
  }
}
const pathLen = (pts) => pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
function along(pts, d) {
  for (let k = 0; k < pts.length - 1; k++) {
    const l = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]);
    if (d <= l) return [pts[k][0] + ((pts[k + 1][0] - pts[k][0]) * d) / l, pts[k][1] + ((pts[k + 1][1] - pts[k][1]) * d) / l];
    d -= l;
  }
  return pts.at(-1);
}
function spark(fb, x, y) {
  x = Math.round(x);
  y = Math.round(y);
  fb.rect(x - 3, y - 3, 6, 6, O);
  fb.rect(x - 2, y - 2, 4, 4, Yl);
  fb.px(x - 2, y - 2, Wc);
}
function block(fb, x, y, w, h) {
  x = Math.round(x - w / 2);
  y = Math.round(y - h / 2);
  fb.rect(x - 1, y - 1, w + 2, h + 2, N);
  fb.rect(x, y, w, h, R);
  fb.rect(x, y, w, 1, I);
  fb.rect(x, y, 1, h, I);
  fb.rect(x + w - 1, y + 1, 1, h - 1, P);
}

// ── The park ─────────────────────────────────────────────────────────────────────────────────────────────────────
const TREE = A.tree();
const hillFar = (X) => 200 + Math.round((9 * Math.sin(X / 23) + 6 * Math.sin(X / 9.7 + 1)) / 3) * 3;
const hillMid = (X) => 230 + Math.round((10 * Math.sin(X / 31 + 2) + 5 * Math.sin(X / 13)) / 3) * 3;
// player: "run", "sit", "frozen", "rise" (standing up and breaking into a run, s10), or null; heart: the heart in the
// sky over him, with its dotted leader to his chest; inset: the s15 window onto the thigh's artery
function park(fb, t, { P = parkP(t), player = "run", heart = true, inset = null, bench = false } = {}) {
  fb.clear(S);
  const oc = Math.floor(P * 6);
  for (const [x0, y, k] of [[30, 104, 0], [190, 120, 1], [120, 140, 1], [250, 112, 0]]) fb.blit(A.CLOUD[k], mod(x0 - oc, W + 40) - 20, y);
  const o1 = Math.floor(P * 12);
  for (let x = 0; x < W; x++) {
    const X = x + o1, top = hillFar(Math.floor(X / 4) * 4);
    for (let y = top; y < 262; y++) fb.px(x, y, y === top ? L : y < top + 3 && dither(X, y, 0.5) ? L : G);
  }
  const o2 = Math.floor(P * 24);
  for (let x = 0; x < W; x++) {
    const X = x + o2, top = hillMid(Math.floor(X / 6) * 6);
    for (let y = top; y < 262; y++) fb.px(x, y, y === top ? G : L);
  }
  for (const tx of [60, 210]) fb.blit(TREE, mod(tx - o2, 300) - 30, 222);
  const o3 = Math.floor(P * 48);
  fb.rect(0, 260, W, 1, B);
  fb.rect(0, 261, W, 14, E);
  fb.rect(0, 275, W, 1, B);
  for (let x = 0; x < W + 24; x += 24) fb.rect(mod(x - o3, W + 24) - 12, 267, 8, 1, I);
  fb.rect(0, 276, W, 204, G);
  for (let gx = -1; gx < 10; gx++) {
    for (let gy = 0; gy < 8; gy++) {
      const X = gx * 32 + mod(-o3, 32), Y = 280 + gy * 24, seed = hash(gx + Math.floor(o3 / 32), gy, 7);
      const x = X + Math.floor(seed * 24), y = Y + Math.floor(hash(gy, gx + Math.floor(o3 / 32), 9) * 14);
      fb.px(x, y, L);
      fb.px(x + 2, y, L);
      fb.px(x + 1, y + 1, L);
    }
  }
  const benchOn = bench || player === "sit" || (player === "rise" && t < RUN_AT + 1.4);
  if (benchOn) fb.blit(A.BENCH, BENCH.x - mod(Math.floor(Math.max(0, P - s.s02.start) * 48), 400), BENCH.y);
  let chest = [PLAYER.x + 11, 252];
  if (player === "run") fb.blit(A.RUN[runFrame(t)], PLAYER.x, PLAYER.feet - 33);
  if (player === "frozen") fb.blit(A.RUN[runFrame(s.s02.start - 0.01)], PLAYER.x, PLAYER.feet - 33);
  if (player === "sit") {
    fb.blit(A.SITTING[mod(frames(t, s.s07.start) >> 3, 2)], BENCH.x + 1, PLAYER.feet - 33);
    chest = [BENCH.x + 12, 254];
  }
  if (player === "rise") {
    // he gets up (two drawings), stands, and breaks into a run: four drawings a stride, moving out to his place
    const f = frames(t, RISE_AT);
    let x = BENCH.x + 1, spr = A.SITTING[0];
    if (f >= 0) spr = A.RISING[0];
    if (f >= 2) spr = A.RISING[1];
    if (f >= 4) spr = A.STANDING;
    if (t >= RUN_AT) {
      spr = A.RUN[runFrame(t)];
      x = Math.min(PLAYER.x, BENCH.x + 1 + 6 * (frames(t, RUN_AT) + 1));
    }
    fb.blit(spr, x, PLAYER.feet - 33);
    chest = [x + 11, 252];
  }
  if (heart) {
    const H = SKY_HEART;
    fb.line(H.x, H.y + 34, H.x, 230, N, { dash: 1, gap: 1 });
    fb.line(H.x, 230, chest[0], 230, N, { dash: 1, gap: 1 });
    fb.line(chest[0], 230, chest[0], chest[1] - 14, N, { dash: 1, gap: 1 });
    heartAt(fb, t, H.x, H.y, H.s);
  }
  if (inset) {
    fb.window(48, 100, 174, 100);
    stream(fb, t);
  }
}

// ── HUD band ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Beats a minute and the heart icon that beats with them; an oxygen bar (the muscle's oxygen: full, drained when the
// running muscle needs more than it gets, refilled when the heart catches up; no number, the fact sheet has none);
// litres a minute, at the true value for what the heart is doing: 19,5 running, 5,25 at rest, 10,5 once the beat is
// faster, 19,5 once it is stronger as well.
const S04_DRAIN = [s.s04.start + 0.2, wordAt("s04", "oksigen")];
const O2_REFILL_REST = [REST_FROM + 0.3, REST_FROM + 1.6];
const O2_DRAIN_RUN = [RUN_AT + 0.2, s.s11.start];
const O2OK_AT = wordAt("s15", "oksigen");
const O2_REFILL_RUN = [s.s15.start + 0.5, O2OK_AT];
const ramp = (t, [a, b], from, to) => from + (to - from) * clamp((t - a) / (b - a), 0, 1);
const o2 = (t) => {
  if (t < S04_DRAIN[1] + 1) return t < s.s04.start ? 1 : ramp(t, S04_DRAIN, 1, 0.25);
  if (t < O2_REFILL_REST[0]) return 0.25;
  if (t < O2_DRAIN_RUN[0]) return ramp(t, O2_REFILL_REST, 0.25, 1);
  if (t < s.s15.start) return ramp(t, O2_DRAIN_RUN, 1, 0.25);
  return ramp(t, O2_REFILL_RUN, 0.25, 1);
};
const S14 = { a: s.s14.start + 0.1, b: wordAt("s14", "hampir") - 0.2, result: wordAt("s14", "liter") + 0.1, fills: [] };
const lmin = (t) => (t < REST_FROM ? T_RUN : t < SPARK ? T_REST : t < S14.result ? T_MID : T_RUN);
function hud(fb, t) {
  fb.rect(0, 0, W, BAND, N);
  fb.rect(0, BAND - 2, W, 1, Wc);
  const paused = t >= s.s02.start && t < s.s03.start;
  fb.blit(A.HUD_HEART, 16, 61);
  if (!paused && beatNow(t) >= 0) {
    for (let j = -1; j <= 11; j++) for (let i = -1; i <= 13; i++) {
      const inside = (x, y) => x >= 0 && y >= 0 && x < 13 && y < 11 && A.HUD_HEART.d[y * 13 + x] !== CLEAR;
      if (!inside(i, j) && (inside(i - 1, j) || inside(i + 1, j) || inside(i, j - 1) || inside(i, j + 1))) fb.px(16 + i, 61 + j, Wc);
    }
  }
  if (paused) {
    if (frames(t, s.s02.start) % 12 < 8) fb.text("PAUSE", 34, 59, { font: F16, colour: R });
  } else {
    const x = fb.text(String(resting(t) ? HR_REST : HR_RUN), 34, 59, { font: F16, colour: Yl });
    fb.text("BPM", x + 6, 59, { font: F16, colour: Wc });
  }
  // the oxygen bar: eight segments, sky blue (oxygen) when it is enough, red and blinking when it runs low
  const v = o2(t), low = v < 0.5 || (t >= s.s15.start && t < O2OK_AT); // red until the inset says O2 OK
  fb.text("O2", 162, 59, { font: F16, colour: S });
  fb.rect(195, 60, 38, 13, Wc);
  fb.rect(196, 61, 36, 11, N);
  const segs = Math.round(v * 8);
  const blink = low && frames(t, 0) % 6 < 2;
  for (let k = 0; k < 8; k++) if (k < segs && !blink) fb.rect(197 + k * 4 + (k > 3 ? 1 : 0), 62, 3, 9, low ? R : S);
  const xv = fb.text(lmin(t), 16, 77, { font: F16, colour: Yl });
  fb.text("L/MENIT", xv + 6, 77, { font: F16, colour: Wc });
}

// ── Captions ────────────────────────────────────────────────────────────────────────────────────────────────────
// Pages of up to four words in the dialogue box, never empty: a page stays until the next one begins. A page types on
// in three frames when its first word starts; each word turns from lavender to its own colour as it is said (the key
// word in the colour of what it names: red the heart and its blood, sky blue oxygen, yellow the nerve). A number said
// in words, or a preposition with the word it leads, is never split across two pages.
const MEANS = { oksigen: S, sinyal: Yl, ngegas: Yl };
const NUMBER = /^(nol|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|seratus|seribu|puluh|ratus|belas)$/;
const LEADS = /^(ke|di|per|lewat|buat|dari|sampai)$/;
const UNITS = /^(mililiter|liter|ml)$/; // a unit stays with the number it counts
const ALSO_KEY = { s15: ["empat", "kali", "lipat"] }; // "nyaris empat kali lipat": the film's ratio, in the accent
const pages = [];
for (const shot of storyboard.shots) {
  const line = voiced[shot.id];
  if (!shot.voice || !line) continue;
  const tokens = [];
  for (const part of shot.voice.split(/(\*[^*]+\*)/)) {
    if (!part) continue;
    const key = part.startsWith("*");
    for (const w of (key ? part.slice(1, -1) : part).split(/\s+/).filter(Boolean)) {
      if (/^[.,;:!?]+$/.test(w) && tokens.length) tokens.at(-1).text += w;
      else tokens.push({ text: w.toUpperCase(), key });
    }
  }
  console.assert(tokens.length === line.words.length, `${shot.id}: ${tokens.length} words on screen, ${line.words.length} in the take`);
  tokens.forEach((tk, i) => {
    [tk.at, tk.end] = line.words[i];
    tk.bare = tk.text.toLowerCase().replace(/[^a-z-]/g, "");
    if ((ALSO_KEY[shot.id] ?? []).includes(tk.bare)) tk.key = true;
    tk.colour = tk.key ? MEANS[tk.bare] ?? R : Wc;
  });
  // units that stay together: a run of number words; a preposition with what follows it
  const units = [];
  for (const tk of tokens) {
    const last = units.at(-1);
    const lastTk = last?.at(-1);
    const after = lastTk && !/[.,!?:]$/.test(lastTk.text);
    if (last && ((after && NUMBER.test(lastTk.bare) && (NUMBER.test(tk.bare) || UNITS.test(tk.bare))) || LEADS.test(lastTk.bare))) last.push(tk);
    else units.push([tk]);
  }
  const lay = (toks) => {
    const lines = [[]];
    for (const tk of toks) {
      const cur = lines.at(-1), len = cur.reduce((a, x) => a + x.text.length + 1, 0) + tk.text.length;
      if (cur.length && len > 13) lines.push([tk]);
      else cur.push(tk);
    }
    return lines.length <= 3 && lines.every((l) => l.reduce((a, x) => a + x.text.length + 1, -1) <= 13) ? lines : null;
  };
  let cur = [];
  for (const u of units) {
    const toks = cur.flat();
    const ended = toks.length && /[.!?]$/.test(toks.at(-1).text);
    if (toks.length && (ended || toks.length + u.length > 4 || !lay([...toks, ...u]))) (pages.push(toks), (cur = []));
    cur.push(u);
  }
  if (cur.length) pages.push(cur.flat());
}
pages.forEach((p, k) => (p.from = k === 0 ? 0 : p[0].at - 0.04));
pages.forEach((p, k) => (p.to = k < pages.length - 1 ? pages[k + 1].from : DUR + 1));
function dialog(fb, t) {
  fb.window(12, BOX_Y, 246, BOX_H);
  const k = pages.findIndex((p) => t >= p.from && t < p.to);
  const p = pages[k];
  if (!p) return;
  const lines = [[]];
  for (const tk of p) {
    const cur = lines.at(-1), len = cur.reduce((a, x) => a + x.text.length + 1, 0) + tk.text.length;
    if (cur.length && len > 13) lines.push([tk]);
    else cur.push(tk);
  }
  const total = p.reduce((a, x) => a + x.text.length, 0);
  // the page types on in three frames (the first page is already there on frame 0, the cover)
  let budget = k === 0 ? Infinity : Math.ceil((total * (frames(t, p.from) + 1)) / 3);
  lines.forEach((ln, j) => {
    let x = 22;
    for (const tk of ln) {
      const n = Math.max(0, Math.min(tk.text.length, budget));
      budget -= tk.text.length;
      if (n > 0) fb.text(tk.text, x, BOX_Y + 6 + j * 19, { font: F16, colour: t >= tk.at - 0.04 ? tk.colour : V, count: n });
      x += (tk.text.length + 1) * 16;
    }
  });
  const last = p.at(-1);
  if (t >= last.end && frames(t, last.end) % 8 < 5) fb.text("▼", 243, BOX_Y + BOX_H - 11, { colour: Yl });
}

// ── s01 and s02: the opening, the pause ─────────────────────────────────────────────────────────────────────────
const runningKicks = (a, b) => KICKS.filter((k) => k >= a && k < b);
function opening(fb, t) {
  park(fb, t);
}
const BLOCK_AT = s.s02.start + 0.17;
// one step darker for each colour: black, navy, plum, green, brown, dark, grey, cream, red, orange, yellow, lime, sky,
// lavender, pink, peach
const DARKER = [0, 0, 1, 1, 2, 1, 5, 6, 2, 4, 9, 3, 13, 5, 2, 4];
ev("pause", s.s02.start, "the game pauses");
ev("bump", BLOCK_AT + 3 / FPS, "the question block lands and bounces");
function pause(fb, t) {
  park(fb, t, { player: "frozen" });
  // the screen dims the way a PICO-8 game fades: every colour swapped for the next darker one in the palette (a
  // palette swap, not a translucent layer, and no full-screen dither to shimmer when an app rescales the video); it
  // lays in two steps: every other row on the first frame, then all of them
  const f = frames(t, s.s02.start);
  for (let y = 0; y < 480; y++) if (f >= 1 || y % 2 === 0) for (let i = y * W; i < y * W + W; i++) fb.d[i] = DARKER[fb.d[i]] ?? fb.d[i];
  // the question block: drops in, bounces up and settles, then bobs a pixel while the game waits
  const bf = frames(t, BLOCK_AT);
  if (bf >= 0) {
    const dy = bf < 6 ? [-24, -12, 0, -4, -2, 0][bf] : (bf >> 3) % 2 ? -1 : 0;
    fb.blit(A.QBLOCK, PLAYER.x + 7, PLAYER.feet - 33 - 16 + dy);
  }
  const tf = frames(t, s.s02.start + 0.1);
  if (tf >= 0) {
    const str = "KOK BISA?";
    const blinkQ = tf > 12 && (tf >> 2) % 3 === 0;
    const cols = [...str].map((ch) => (ch === "?" ? (blinkQ ? Wc : R) : Wc));
    say(fb, str, 124, 100, { font: F24, colours: cols, count: tf + 1, align: "center" });
  }
}

// ── s03: the leg, cut open ─────────────────────────────────────────────────────────────────────────────────────
const LEGS = A.STRIDE.map(([th, sh, pull]) => A.leg(th, sh, pull));
const LEG_GROUND = 288, LEG_HIP_Y = LEG_GROUND - (LEGS[0].low - LEGS[0].hip[1]);
for (let i = kickAt(s.s03.start); KICKS[i] < s.s04.start; i++) if (KICKS[i] > s.s03.start + 0.35 && i % 2 === 0) ev("squelch", KICKS[i], "the thigh muscle pulls");
function legScene(fb, t) {
  fb.clear(S);
  const scroll = Math.floor((t - s.s03.start) * 48);
  for (let x = 0; x < W; x++) {
    const top = hillFar(Math.floor((x + 40 + scroll / 4) / 4) * 4) + 60;
    for (let y = top; y < LEG_GROUND; y++) fb.px(x, y, y === top ? L : G);
  }
  fb.rect(0, LEG_GROUND, W, 1, B);
  fb.rect(0, LEG_GROUND + 1, W, 10, E);
  for (let x = 0; x < W + 24; x += 24) fb.rect(mod(x - scroll, W + 24) - 12, LEG_GROUND + 6, 8, 1, I);
  fb.rect(0, LEG_GROUND + 11, W, 1, B);
  fb.rect(0, LEG_GROUND + 12, W, 200, G);
  const spr = LEGS[runFrame(t)];
  const x0 = 34, y0 = LEG_HIP_Y - spr.hip[1];
  fb.blit(spr, x0, y0);
  if (t >= wordAt("s03", "otot") - 0.1) tag(fb, [{ text: "OTOT", colour: R }, { text: "PAHA", colour: R }], 176, 104, { to: [x0 + spr.quad[0], y0 + spr.quad[1]] });
}

// ── s04 and s05: inside the thigh muscle, then along the capillary to the artery that feeds it ─────────────────
const FIB_Y = [170, 196, 222, 248, 274], FIB_R = 11, FIB_X0 = 215, FIB_LEN = 240, CAP_Y = 152;
const FIBRE = [A.fibre(FIB_LEN, FIB_R), A.fibre(FIB_LEN - 8, FIB_R + 1)];
const CELL = [A.cell(20, 12, "edge"), A.cell(18, 13, "turn"), A.cell(14, 14, "face"), A.cell(18, 13, "turn")];
const ART = { x1: 212, top: 174, bot: 256 };
const LANES = [196, 214, 232];
const camX = (t) => (t < s.s05.start ? 200 : Math.max(0, 200 - 40 * (frames(t, s.s05.start) + 1)));
const pulling = (t) => {
  const i = kickAt(t + 0.06);
  return i % 2 === 1 && t - KICKS[i] < 0.25;
};
const O2USE = [];
for (let n = 0, ts = s.s04.start - 0.6; ts < s.s05.start + 0.2; n++) {
  const life = Math.max(0.35, 1.1 - (ts - s.s04.start) * 0.22);
  const j = Math.floor(hash(n, 3) * 5);
  const x = 228 + Math.floor(hash(n, 5) * 214);
  const y = FIB_Y[j] - 4 + Math.floor(hash(n, 6) * 6);
  O2USE.push({ ts, x, y, gone: ts + Math.ceil((y - CAP_Y - 4) / 8) / FPS + life });
  ts += Math.max(0.09, 0.2 - (ts - s.s04.start) * 0.03);
}
const HERO = { ts: s.s04.start + 0.1, x: 360, y: FIB_Y[1] - 3, gone: wordAt("s04", "butuh") + 0.05 };
O2USE.push(HERO);
for (const o of O2USE) if (o.gone > s.s04.start && o.gone < s.s05.start) ev("used", o.gone, "an oxygen pixel used up");
const WARN = wordAt("s04", "oksigen") - 0.3;
for (let f = 0; WARN + f / FPS < s.s05.start; f += 3) ev("beep", WARN + f / FPS, "low oxygen alarm");
const CHOSEN_AT = wordAt("s05", "darah"), CELL_V = 48;
const CELLS = [];
for (let k = 0; k < 14; k++) CELLS.push({ lane: [0, 2, 1][k % 3], x0: -150 + k * 23 + Math.floor(hash(k, 11) * 8), seed: k });
const cellX = (c, t) => c.x0 + Math.floor((t - s.s05.start) * CELL_V);
const chosen = CELLS.filter((c) => c.lane === 0).reduce((a, c) => (Math.abs(cellX(c, CHOSEN_AT) - 190) < Math.abs(cellX(a, CHOSEN_AT) - 190) ? c : a));
for (const c of CELLS) {
  c.drop = s.s05.start + (190 - c.x0) / CELL_V;
  c.to = [222 + Math.floor(hash(c.seed, 21) * 36), FIB_Y[1 + Math.floor(hash(c.seed, 22) * 3)] - 4];
  if (c.drop > s.s05.start + 0.35 && c.drop < s.s06.start - 0.25) ev("coin", c.drop, "an oxygen pixel delivered to the muscle");
}
ev("pan", s.s05.start, "the camera scrolls along the capillary to the artery");
function inside(fb, t) {
  const X0 = camX(t);
  fb.clear(E);
  // the artery: stepped walls, plasma inside
  const ax1 = ART.x1 - X0;
  for (let x = 0; x < Math.min(W, ax1 + 1); x++) {
    const X = x + X0, st = Math.floor(X / 8) % 2;
    const t0 = ART.top + st, b0 = ART.bot - st;
    for (let y = t0 - 6; y <= b0 + 6; y++) fb.px(x, y, y < t0 - 4 || y > b0 + 4 ? P : y < t0 || y > b0 ? I : y < t0 + 2 || y > b0 - 2 ? P : dither(X, y, 0.12) ? R : P);
  }
  // the capillary along the top of the muscle, branching off the artery
  for (let x = 0; x < W; x++) {
    if (x + X0 < 204) continue;
    for (let y = CAP_Y - 4; y <= CAP_Y + 4; y++) fb.px(x, y, y === CAP_Y - 4 || y === CAP_Y + 4 ? P : y === CAP_Y - 3 ? I : R);
  }
  for (let y = CAP_Y; y < ART.top - 4; y++) for (let x = 204 - X0 - 4; x <= 204 - X0 + 4; x++) fb.px(x, y, x === 204 - X0 - 4 || x === 204 - X0 + 4 ? P : R);
  for (let k = 0; k < 30; k++) fb.rect(204 + mod(k * 17 + Math.floor((t - 8) * 48), 300) - X0, CAP_Y - 1, 3, 2, P);
  // the cells, each with its oxygen pixel on it
  for (const c of CELLS) {
    const x = cellX(c, t) - X0;
    if (x < -24 || x + X0 > ART.x1 - 6) continue;
    const y = LANES[c.lane];
    const spr = CELL[mod((frames(t, 0) >> 1) + c.seed, 4)];
    fb.blit(spr, x, y - (spr.h >> 1));
    if (t < c.drop) fb.blit(A.O2, x + spr.w - 6, y - (spr.h >> 1) - 2);
  }
  const pull = pulling(t) ? 1 : 0;
  for (const fy of FIB_Y) fb.blit(FIBRE[pull], FIB_X0 + pull * 4 - X0, fy - FIB_R - pull);
  for (const o of O2USE) {
    if (t < o.ts || t >= o.gone) continue;
    const y = Math.min(o.y, CAP_Y + 4 + 8 * frames(t, o.ts));
    if (!(t > o.gone - 0.25 && frames(t, o.gone) % 2 === 0)) fb.blit(A.O2, o.x - X0, y);
  }
  for (const c of CELLS) {
    if (t < c.drop || t > s.s06.start + 1) continue;
    const p = Math.min(1, frames(t, c.drop) / 4);
    const x0 = 196, y0 = LANES[c.lane] - 8;
    fb.blit(A.O2, x0 + (c.to[0] - x0) * p - X0, y0 + (c.to[1] - y0) * p - 10 * Math.sin(Math.PI * p));
  }
  if (t >= HERO.ts + 0.15 && t < HERO.gone && t < WARN) {
    const y = Math.min(HERO.y, CAP_Y + 4 + 8 * frames(t, HERO.ts));
    tag(fb, [{ text: "O2", colour: S }], HERO.x - X0 + 34, 104, { to: [HERO.x - X0 + 5, y] });
  }
  if (t >= WARN && t < s.s05.start) {
    fb.window(12, 100, 246, 44);
    fb.text("OTOT PAHA", 20, 106, { font: F16, colour: Wc });
    fb.text("O2 RENDAH!", 20, 124, { font: F16, colour: frames(t, WARN) % 3 !== 2 ? R : P });
  }
  if (t >= s.s05.start + 0.45) {
    const x = Math.min(cellX(chosen, t), ART.x1 - 26) - X0, y = LANES[chosen.lane];
    tag(fb, [{ text: "SEL DARAH" }, { text: "MERAH" }], x - 40, 104, { to: [x + 6, y - 6] });
    if (t < chosen.drop) {
      if (t >= s.s05.start + 0.8) tag(fb, [{ text: "O2", colour: S }], x + 4, 266, { to: [x + 17, y - 6] });
    } else {
      const p = Math.min(1, frames(t, chosen.drop) / 4);
      const ox = 196 + (chosen.to[0] - 196) * p - X0, oy = y - 8 + (chosen.to[1] - y + 8) * p - 10 * Math.sin(Math.PI * p);
      tag(fb, [{ text: "O2", colour: S }], ox - 40, 266, { to: [ox + 3, oy + 6] });
    }
  }
}

// ── s06: following the blood back up the artery to its pump; s10 and s11: the nerves ─────────────────────────────
// The whole body, head clear of the HUD, set to the right of the frame so its labels have room beside it (s10 has it
// to the left): the convoy runs down from the heart to the thighs.
const BIG = A.bodyMap(0.92), BIGX = 80;
const BIG_PATHS = A.ARTERY(BIG);
const LIGHT_AT = wordAt("s06", "jantung");
const bigY = () => 100;
ev("ding", LIGHT_AT, "the heart lights up on the map");
for (let i = kickAt(s.s06.start); KICKS[i] < s.s07.start; i++) if (KICKS[i] > s.s06.start + 0.3) ev("pulse", KICKS[i], "a pulse on the map");
function mapGround(fb) {
  fb.clear(G);
  for (let y = 12; y < 480; y += 24) for (let x = 12; x < W; x += 24) (fb.px(x, y, L), fb.px(x + 1, y, L), fb.px(x, y + 1, L), fb.px(x + 1, y + 1, L));
}
function convoy(fb, t, paths, ox, oy, step) {
  const b = kickAt(t + 0.06);
  let n = 0;
  for (let i = b; i > b - 40 && i >= 0; i--) if (beats(i)) {
    const p = paths[n % 2], d = 6 + n * step;
    if (d < pathLen(p)) {
      const [x, y] = along(p, d);
      fb.rect(Math.round(x + ox) - 2, Math.round(y + oy) - 1, 5, 4, P);
      fb.rect(Math.round(x + ox) - 1, Math.round(y + oy) - 1, 3, 2, I);
    }
    n++;
  }
}
function artery(fb, paths, ox, oy, w = 2) {
  for (const p of paths) for (let k = 0; k < p.length - 1; k++) for (let i = 0; i < w; i++) fb.line(p[k][0] + ox + i, p[k][1] + oy, p[k + 1][0] + ox + i, p[k + 1][1] + oy, R);
}
function mapS06(fb, t) {
  mapGround(fb);
  const oy = bigY(t);
  fb.blit(BIG, BIGX, oy);
  artery(fb, BIG_PATHS, BIGX, oy, 2);
  convoy(fb, t, BIG_PATHS, BIGX, oy, 7);
  const hx = BIG.heart[0] + BIGX, hy = BIG.heart[1] + oy;
  const spr = heartAt(fb, t, hx, hy, 24);
  if (t >= LIGHT_AT && t < LIGHT_AT + 0.6 && frames(t, LIGHT_AT) % 2 === 0) {
    const x0 = hx - spr.cx, y0 = hy - spr.cy;
    for (let j = 0; j < spr.h; j++) for (let i = 0; i < spr.w; i++) {
      const on = (a, c) => a >= 0 && c >= 0 && a < spr.w && c < spr.h && spr.d[c * spr.w + a] !== CLEAR;
      if (!on(i, j) && (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1))) fb.px(x0 + i, y0 + j, Wc);
    }
  }
  const [tx, ty] = BIG.thighs[0];
  tag(fb, [{ text: "OTOT" }], 12, 196, { to: [tx + BIGX - 6, ty + oy] });
  if (t >= LIGHT_AT - 0.05) tag(fb, [{ text: "JANTUNG", colour: R }], 12, 104, { to: [hx - 6, hy - 4] });
  tag(fb, [{ text: "TIDAK" }, { text: "SESUAI" }, { text: "SKALA" }], 12, 240);
}
// s10 and s11 show the whole body, smaller, on the same map: the signal climbs the spinal cord from the working thighs
// to the brainstem; then the brainstem's answer runs down a nerve to the heart.
const SMALL = A.bodyMap(0.92), SX = 36, SY = 100;
const SMALL_PATHS = A.ARTERY(SMALL), NV = A.NERVES(SMALL);
const UP = NV.up.map((p) => p.map(([x, y]) => [x + SX, y + SY])), DOWN = NV.down.map(([x, y]) => [x + SX, y + SY]);
const UP_LEN = pathLen(UP[0]);
const SPARKS_FROM = wordAt("s10", "otot") - 0.05, STEM_AT = wordAt("s10", "otak");
const UP_V = UP_LEN / ((STEM_AT - SPARKS_FROM) * FPS);
const DOWN_FROM = s.s11.start + 0.1, DOWN_LEN = pathLen(DOWN);
const DOWN_V = DOWN_LEN / ((S11_HEART - 0.15 - DOWN_FROM) * FPS);
for (let f = 0; SPARKS_FROM + f / FPS < STEM_AT; f += 3) ev("arp", SPARKS_FROM + f / FPS, "a spark climbs the spinal cord");
ev("ping", STEM_AT, "the signal reaches the brainstem");
for (let f = 0; DOWN_FROM + f / FPS < S11_HEART - 0.1; f += 3) ev("arp2", DOWN_FROM + f / FPS, "the answer runs down to the heart");
function mapNerves(fb, t) {
  mapGround(fb);
  fb.blit(SMALL, SX, SY);
  artery(fb, SMALL_PATHS, SX, SY, 2);
  convoy(fb, t, SMALL_PATHS, SX, SY, 7);
  // the thighs flash on each stride
  const i = kickAt(t + 0.06);
  if (t - KICKS[i] < 0.12) {
    const [tx, ty] = SMALL.thighs[i % 2];
    for (let y = -18; y <= 18; y++) for (let x = -7; x <= 7; x++) if ((x / 7) ** 2 + (y / 18) ** 2 <= 1 && SMALL.d[(ty + y) * SMALL.w + tx + x] !== CLEAR) fb.px(tx + x + SX, ty + y + SY, (x + y) % 2 ? I : Wc);
  }
  heartAt(fb, t, SMALL.heart[0] + SX, SMALL.heart[1] + SY, 24);
  for (const p of UP) nerve(fb, p);
  const lit = t >= STEM_AT;
  const br = A.brain(22, 15, lit && frames(t, STEM_AT) % 4 < 3, 8);
  fb.blit(br, SMALL.brain[0] + SX - 11, SMALL.brain[1] + SY - 7);
  let lead = null;
  for (let f = 0; SPARKS_FROM + f / FPS <= t && SPARKS_FROM + f / FPS < STEM_AT; f += 3) {
    const d = (frames(t, SPARKS_FROM + f / FPS) + 1) * UP_V;
    if (d > UP_LEN) continue;
    for (const p of UP) {
      const [x, y] = along(p, d);
      spark(fb, x, y);
      lead ??= [x, y];
    }
  }
  if (t >= s.s11.start) {
    // the answer: down a second nerve from the brainstem to the heart
    const d = (frames(t, DOWN_FROM) + 1) * DOWN_V;
    nerve(fb, DOWN, Math.max(0, d));
    if (d > 0 && d < DOWN_LEN) spark(fb, ...along(DOWN, d));
    tag(fb, [{ text: "SARAF", colour: Yl }], 140, 150, { to: along(DOWN, DOWN_LEN * 0.6).map(Math.round) });
  }
  if (t >= wordAt("s10", "sinyal") - 0.1 && t < s.s11.start) tag(fb, [{ text: "SINYAL", colour: Yl }], 132, 252, { to: [UP[1][2][0] + 1, UP[1][2][1] - 10] });
  if (t >= STEM_AT - 0.05) tag(fb, [{ text: "BATANG" }, { text: "OTAK" }], 128, 104, { to: [SMALL.stem[0] + SX + 3, SMALL.stem[1] + SY + 1] });
}

// ── s07: back in the park, at rest on the bench ───────────────────────────────────────────────────────────────
for (let i = kickAt(REST_FROM); KICKS[i] < SPARK; i++) if (beats(i) && KICKS[i] > REST_FROM + 0.2) ev("thump_rest", KICKS[i], "the resting heartbeat, 75 a minute");
function rest(fb, t) {
  park(fb, t, { player: "sit" });
}

// ── s08: into the heart, cut open ──────────────────────────────────────────────────────────────────────────────
const OPEN = { x: 178, y: 214, s: 136 };
function openPath(spr) {
  const ox = OPEN.x - spr.cx, oy = OPEN.y - spr.cy;
  return [[ox + spr.u(0.12), oy + spr.v(0.14)], [ox + spr.u(-0.05), oy + spr.v(0.01)], [ox + spr.u(-0.05), oy + spr.v(-0.45)], [ox + spr.u(-0.05), 60]];
}
const S08_BEATS = KICKS.filter((k, i) => k >= s.s08.start + 0.25 && k < s.s09.start - 0.2 && beats(i));
for (const k of S08_BEATS) ev("thump", k, "the ventricle squeezes: 70 mL out");
function heartOpen(fb, t) {
  park(fb, t, { player: "sit", heart: false });
  const b = beatNow(t);
  const spr = heartAt(fb, t, OPEN.x, OPEN.y, OPEN.s, { open: true, beat: b });
  const path = openPath(A.heart(OPEN.s, { open: true }));
  const [vx, vy] = path[1];
  let tagged = null;
  for (const k of S08_BEATS) {
    const f = frames(t, k);
    if (f < 0 || f > 20) continue;
    const [x, y] = along(path, f * 12);
    if (y < TOP + 6) continue;
    block(fb, x, y, 7, 10);
    tagged = [Math.round(x), Math.round(y)];
  }
  const open = tagged && tagged[1] < vy + 6 && tagged[1] > vy - 16;
  if (open) (fb.rect(vx - 5, vy - 4, 1, 4, Wc), fb.rect(vx + 5, vy - 4, 1, 4, Wc));
  else (fb.rect(vx - 5, vy, 4, 1, Wc), fb.rect(vx + 2, vy, 4, 1, Wc));
  if (t >= s.s08.start + 0.3) tag(fb, [{ text: "BILIK" }, { text: "KIRI" }], 16, 178, { to: [OPEN.x - spr.cx + spr.u(0.16), OPEN.y - spr.cy + spr.v(0.18)] });
  tag(fb, [{ text: `${SV_REST} mL`, colour: R }, { text: "PER DETAK" }], 16, 102, tagged ? { to: [tagged[0] - 4, tagged[1]] } : {});
}

// ── s09 and s14: the sums, with the litres standing on the track ─────────────────────────────────────────────────
const S09 = { sum: s.s09.start + 0.1, first: s.s09.start + 0.45, step: 0.16, result: wordAt("s09", "lima") };
for (let k = 0; k < 6; k++) ev("coin", S09.first + k * S09.step + 1 / FPS, `litre ${k + 1}`);
ev("tally", S09.result, "the result: 5,25 L a minute");
const BIG_BOTTLE = (lvl) => A.bottle(24, 54, lvl);
function score1(fb, t) {
  park(fb, t, { player: "sit", heart: false });
  say(fb, `${HR_REST} × ${SV_REST} mL`, 124, 102, { count: frames(t, S09.sum) + 1, align: "center" });
  if (t >= S09.result) {
    say(fb, `= ${T_REST} L`, 124, 122, { colour: R, count: 3 * (frames(t, S09.result) + 1), align: "center" });
    say(fb, "PER MENIT", 124, 142, { count: 3 * (frames(t, S09.result + 0.15) + 1), align: "center" });
  }
  for (let k = 0; k < 6; k++) {
    const want = Math.min(1, Math.max(0, CO_REST - k));
    const f = frames(t, S09.first + k * S09.step);
    fb.blit(BIG_BOTTLE(f < 0 ? 0 : f === 0 ? want / 2 : want), 66 + k * 27, 275 - 54);
  }
  say(fb, "1 BOTOL = 1 L", 124, 282, { colour: Wc, align: "center" });
}
{
  // the running group fills bottle by bottle, faster and faster: twenty bottles, the last half full
  // the run speeds up and is done a quarter of a second before the result, so the result is heard on its own
  const from = S14.b + 0.25, span = S14.result - 0.25 - from, q = 0.88;
  const g0 = span / ((1 - q ** 19) / (1 - q));
  let at = from, gap = g0;
  for (let k = 0; k < 20; k++) {
    S14.fills.push(Math.round(at * FPS) / FPS);
    at += gap;
    gap *= q;
  }
}
ev("tally", S14.a + 0.5, "the faster beat alone: 10,5 L");
S14.fills.forEach((at, k) => ev("coin", at, `running litre ${k + 1}`));
ev("levelup", S14.result, "the result: 19,5 L a minute");
const SMALL_BOTTLE = (lvl) => A.bottle(14, 26, lvl);
function score2(fb, t) {
  park(fb, t, { player: null, heart: false });
  // the two steps: the faster beat alone, then the faster and stronger beat
  say(fb, `${HR_RUN} × ${SV_REST} mL`, 16, 99, { count: 2 * (frames(t, S14.a) + 1) });
  if (t >= S14.a + 0.4) say(fb, `= ${T_MID} L`, 16, 116, { colour: O, count: 2 * (frames(t, S14.a + 0.4) + 1) });
  if (t >= S14.b) {
    say(fb, `${HR_RUN} × ${SV_RUN} mL`, 16, 133, { count: 2 * (frames(t, S14.b) + 1) });
    if (t >= S14.result) say(fb, `= ${T_RUN} L`, 16, 150, { colour: R, count: 2 * (frames(t, S14.result) + 1) });
  }
  const group = (x0, litres, fills) => {
    for (let k = 0; k < Math.ceil(litres); k++) {
      const want = Math.min(1, litres - k);
      fb.blit(SMALL_BOTTLE(fills ? (t >= fills[k] ? want : 0) : want), x0 + (k % 5) * 16, 275 - 26 - Math.floor(k / 5) * 28);
    }
  };
  group(22, CO_REST, null);
  group(146, CO_RUN, t >= S14.b ? S14.fills : S14.fills.map(() => 99));
  say(fb, `${T_REST} L`, 60, 196, { colour: Wc, align: "center" });
  say(fb, "SANTAI", 60, 282, { colour: Wc, align: "center" });
  say(fb, "LARI", 184, 282, { colour: R, align: "center" });
}

// ── s10: he gets up and runs; then the body map ────────────────────────────────────────────────────────────────
ev("rise", RISE_AT + 0.05, "he gets up");
function getUp(fb, t) {
  park(fb, t, { player: "rise" });
}

// ── s11: the heart, close on the pacemaker ─────────────────────────────────────────────────────────────────────
const NEAR = { x: 190, y: 226, s: 170 };
const S11_PATH = (() => {
  const spr = A.heart(NEAR.s, { pace: 1 });
  return [[112, BAND], [112, 150], [NEAR.x - spr.cx + spr.sa[0] - 2, NEAR.y - spr.cy + spr.sa[1] - 2]]; // down from the brainstem
})();
const S11_LEN = pathLen(S11_PATH), S11_V = 10;
const S11_FROM = SPARK - S11_LEN / S11_V / FPS;
ev("powerup", SPARK, "the pacemaker fires: GAS!");
for (const k of KICKS.filter((k, i) => k > S11_HEART + 0.2 && k < s.s12.start - 0.1 && beats(i))) if (k < SPARK - 0.05 || k > SPARK + 0.7) ev("thump", k, "a heartbeat");
function heartNear(fb, t) {
  park(fb, t, { player: "run", heart: false });
  const lit = t >= SPARK - 0.02 ? (frames(t, SPARK) < 2 ? 2 : 1) : 0;
  const spr = heartAt(fb, t, NEAR.x, NEAR.y, NEAR.s, { pace: lit });
  nerve(fb, S11_PATH);
  for (let f = 0; S11_FROM + f / FPS <= t && S11_FROM + f / FPS < SPARK; f += 4) {
    const d = (frames(t, S11_FROM + f / FPS) + 1) * S11_V;
    if (d < S11_LEN) spark(fb, ...along(S11_PATH, d));
  }
  tag(fb, [{ text: "SARAF", colour: Yl }], 12, 112, { to: [111, 124] });
  if (t >= SPARK - 0.02) {
    const [sx, sy] = [NEAR.x - spr.cx + spr.sa[0], NEAR.y - spr.cy + spr.sa[1]];
    tag(fb, [{ text: "PEMACU" }, { text: "ALAMI" }], 12, 182, { to: [sx - 3, sy + 2] });
    const f = frames(t, SPARK);
    say(fb, "GAS!", 232, 100 + (f === 0 ? -2 : 0), { font: F24, colour: f === 0 ? Wc : Yl, align: "right" });
    say(fb, "OTOMATIS!", 16, 284, { colour: Yl, count: 2 * (f + 1) });
  }
}

// ── s12: the two beat strips, as a HUD strip across the screen over the running park ──────────────────────────────
const STRIP = { x0: 22, x1: 248, rows: [[100, "SANTAI 75", HR_REST, Wc], [158, "LARI 150", HR_RUN, R]] };
const SWEEP_FROM = s.s12.start + 0.1, SWEEP_RATE = 1.25;
const pxPerS = (STRIP.x1 - STRIP.x0) / 4;
// f8: 5 and 10 beats in 4 s, each at its real time, on the nearest whole pixel
const BEAT_X = (hr) => Array.from({ length: (hr / 60) * 4 }, (_, k) => Math.round(STRIP.x0 + (((k + 0.5) * 60) / hr) * pxPerS));
for (const [, , hr] of STRIP.rows) for (const bx of BEAT_X(hr)) ev(hr === HR_RUN ? "blip_hi" : "blip_lo", SWEEP_FROM + (bx - STRIP.x0) / pxPerS / SWEEP_RATE, `a beat on the ${hr} strip`);
const X2_AT = wordAt("s12", "semenit");
ev("bracket", X2_AT, "×2");
function ecgY(x, beatsX, base) {
  let y = 0;
  for (const bx of beatsX) {
    const d = x - bx;
    if (d >= -13 && d <= -7) y -= d === -13 || d === -7 ? 1 : 2;
    if (d === -3 || d === -2) y += 2;
    if (d === -1) y -= 12;
    if (d === 0) y -= 24;
    if (d === 1) y -= 9;
    if (d === 2 || d === 3) y += 5;
    if (d >= 9 && d <= 17) y -= d === 9 || d === 17 ? 1 : d === 10 || d === 16 ? 3 : 4;
  }
  return base + y;
}
// how far the strips have slid: down out of the HUD band as s12 begins, up into it again as s13 begins
const stripShift = (t) => (t < s.s13.start ? Math.min(0, -120 + 30 * (frames(t, s.s12.start) + 1)) : -30 * (frames(t, s.s13.start) + 1));
function drawStrips(fb, t, dy) {
  const sweep = STRIP.x0 + Math.floor(Math.max(0, t - SWEEP_FROM) * SWEEP_RATE * pxPerS);
  for (const [y0r, label, hr, col] of STRIP.rows) {
    const y0 = y0r + dy;
    fb.rect(0, y0, W, 56, N);
    fb.rect(0, y0 + 55, W, 1, Wc);
    for (let y = y0 + 20; y < y0 + 54; y += 8) for (let x = STRIP.x0; x <= STRIP.x1; x += 8) fb.px(x, y, G);
    fb.text(label, 16, y0 + 3, { font: F16, colour: col });
    const base = y0 + 49, bx = BEAT_X(hr);
    let prev = ecgY(STRIP.x0, bx, base);
    for (let x = STRIP.x0 + 1; x <= Math.min(sweep, STRIP.x1); x++) {
      const y = ecgY(x, bx, base);
      fb.line(x - 1, prev, x, y, R);
      fb.line(x - 1, prev + 1, x, y + 1, R);
      prev = y;
    }
    if (sweep < STRIP.x1) fb.rect(sweep + 1, y0 + 20, 2, 34, L);
  }
  if (t >= X2_AT) {
    fb.text("×2", 232, STRIP.rows[1][0] + dy + 3, { font: F16, colour: R, align: "right" });
    const by = 222 + dy;
    fb.rect(STRIP.x0, by, STRIP.x1 - STRIP.x0, 1, N);
    fb.rect(STRIP.x0, by - 3, 1, 7, N);
    fb.rect(STRIP.x1, by - 3, 1, 7, N);
    say(fb, "4 DETIK", 135, by - 7, { align: "center" });
  }
}
function strips(fb, t) {
  park(fb, t, { player: "run", heart: false });
  drawStrips(fb, t, stripShift(t));
}

// ── s13: every beat now squeezes harder, and a bigger block leaves (130 mL against 70) ───────────────────────────
const HARD = { x: 168, y: 222, s: 140 };
const S13_BEATS = KICKS.filter((k) => k > s.s13.start + 0.15 && k < s.s13b.start - 0.1);
for (const k of S13_BEATS) ev("heavy", k, "a hard squeeze: 130 mL");
function heartHard(fb, t) {
  park(fb, t, { player: "run", heart: false });
  const b = beatNow(t);
  const spr = heartAt(fb, t, HARD.x, HARD.y, HARD.s, { pace: 1, hard: 3, beat: b });
  const ox = HARD.x - spr.cx, oy = HARD.y - spr.cy;
  for (const k of S13_BEATS) {
    const f = frames(t, k);
    if (f < 0 || f > 8) continue;
    const y = oy + spr.v(-0.45) - f * 9;
    if (y < TOP + 8) continue;
    block(fb, ox + spr.u(-0.06), y, 10, 13);
  }
  if (b >= 0) {
    say(fb, ">>", ox + spr.u(-0.42) - 30, HARD.y - 24, { colour: Wc });
    say(fb, "<<", ox + spr.u(0.48) + 2, HARD.y - 4, { colour: Wc });
  }
  if (t >= wordAt("s13", "kuat") - 0.1) tag(fb, [{ text: "LEBIH", colour: R }, { text: "KUAT", colour: R }], 16, 116, { to: [ox + spr.u(-0.1), oy + spr.v(0.05)] });
  if (t < s.s13.start + 0.4) drawStrips(fb, t, stripShift(t));
}

// ── s13b: two blocks of blood, 70 mL and 130 mL, standing on the track ──────────────────────────────────────────
const ML_ROW = 5, ROW_PX = 6, FLOOR = 275; // a row is 5 mL and six pixels (f8: 1.2 game px a mL): 84 and 156 pixels
const S13B = { left: s.s13b.start + 0.1, right: wordAt("s13b", "seratus") };
const ROWS_REST = SV_REST / ML_ROW, ROWS_RUN = SV_RUN / ML_ROW;
const LAND = S13B.right + Math.ceil(ROWS_RUN / 2) / FPS;
ev("stack", S13B.left, "the resting block stacks up");
ev("sweep", S13B.right, "the running block stacks up");
ev("thud", LAND, "130 mL lands");
function blocks(fb, t) {
  park(fb, t, { player: null, heart: false });
  const col = (x0, rows, max, label, sub, heartBeat) => {
    const n = clamp(rows, 0, max);
    for (let r = 0; r < n; r++) {
      const y = FLOOR - (r + 1) * ROW_PX;
      fb.rect(x0, y, 64, ROW_PX, R);
      fb.rect(x0, y, 64, 1, r === n - 1 ? I : P);
    }
    if (n > 0) (fb.rect(x0 - 1, FLOOR - n * ROW_PX - 1, 66, 1, N), fb.rect(x0 - 1, FLOOR - n * ROW_PX, 1, n * ROW_PX, N), fb.rect(x0 + 64, FLOOR - n * ROW_PX, 1, n * ROW_PX, N));
    if (n === max) {
      const top = FLOOR - n * ROW_PX;
      fb.text(label, x0 + 32, top + 6, { font: F16, colour: Wc, align: "center" });
      fb.text("mL", x0 + 32, top + 24, { font: F16, colour: Wc, align: "center" });
      const h = A.heart(30, { squeeze: heartBeat ? 1 : 0, detail: false });
      if (top - 22 > TOP + 4) blitC(fb, h, x0 + 32, top - 18);
      else blitC(fb, h, x0 + 84, top + 16);
    }
    say(fb, sub, x0 + 32, 282, { colour: sub === "LARI" ? R : Wc, align: "center" });
  };
  col(38, 2 * (frames(t, S13B.left) + 1), ROWS_REST, String(SV_REST), "SANTAI", false);
  col(152, 2 * (frames(t, S13B.right) + 1), ROWS_RUN, String(SV_RUN), "LARI", beatNow(t) >= 0);
}

// ── s15: running again; the inset shows the blood pouring into the thigh ───────────────────────────────────────
const SCELL = A.cell(12, 8, "turn");
const STREAM_V = 72;
const RATIO_AT = wordAt("s15", "empat");
for (let k = 0; k < 60; k++) {
  const at = s.s15.start + k * (14 / STREAM_V) * 0.5;
  if (at > s.s15.start + 0.5 && at < s.s16.start - 0.1 && k % 3 === 0) ev("coin_soft", at, "oxygen delivered (inset)");
}
ev("ok", O2OK_AT, "O2 OK");
function stream(fb, t) {
  const x0 = 50, y0 = 102, x1 = 220;
  fb.clip = [x0, y0, x1, 198]; // everything in the inset stays inside its window
  fb.rect(x0, y0, x1 - x0, 56, E);
  fb.rect(x0, y0 + 10, 118, 2, P);
  fb.rect(x0, y0 + 12, 118, 1, I);
  fb.rect(x0, y0 + 13, 118, 30, P);
  fb.rect(x0, y0 + 43, 118, 1, I);
  fb.rect(x0, y0 + 44, 118, 2, P);
  const span = 118, gap = 16, f = Math.floor((t - s.s15.start) * STREAM_V);
  for (let k = -1; k < span / gap + 1; k++) {
    for (const [lane, off] of [[y0 + 16, 0], [y0 + 30, 8]]) {
      const x = x0 + mod(k * gap + off + f, span + gap) - gap;
      if (x < x0 - 12 || x > x0 + span - 12) continue;
      fb.blit(SCELL, x, lane);
      fb.blit(A.O2S, x + 9, lane - 1);
    }
  }
  for (let j = 0; j < 5; j++) {
    const y = y0 + 2 + j * 11;
    fb.rect(x0 + 120, y, x1 - x0 - 122, 9, R);
    fb.rect(x0 + 120, y, x1 - x0 - 122, 1, I);
    fb.rect(x0 + 120, y + 8, x1 - x0 - 122, 1, P);
    for (let x = x0 + 124; x < x1 - 2; x += 5) fb.rect(x, y + 1, 1, 7, P);
  }
  for (let k = 0; k < 6; k++) {
    const ph = mod(f + k * 9, 54);
    if (ph > 30) continue;
    const p = ph / 30;
    fb.blit(A.O2S, x0 + 110 + p * 30, y0 + 20 + (k % 3) * 9 - Math.sin(Math.PI * p) * 8);
  }
  const rowY = y0 + 60;
  if (t >= O2OK_AT) fb.text("O2 OK", x0 + 4, rowY, { font: F16, colour: L });
  else if (frames(t, s.s15.start) % 3 !== 2) fb.text("O2 RENDAH!", x0 + 4, rowY, { font: F16, colour: R });
  if (t >= RATIO_AT - 0.05) {
    const x = fb.text(`≈${T_RATIO}×`, x0 + 4, rowY + 18, { font: F16, colour: R });
    fb.text("DARAH", x + 6, rowY + 18, { font: F16, colour: Wc });
  }
  fb.clip = null;
}
function running(fb, t) {
  park(fb, t, { heart: false, inset: true });
}

// ── s16 and s17: the summary panel, then back to the opening picture ───────────────────────────────────────────
const ROW_AT = [wordAt("s16", "otot"), wordAt("s16", "dan"), wordAt("s16", "buat")];
ROW_AT.forEach((at, k) => ev("menu", at, `summary row ${k + 1}`));
ev("drop", s.s16.start, "the summary panel drops in");
ev("victory", voiced.s16.to + 0.05, "the summary is complete");
ev("slide", s.s17.start, "the panel slides away; the game goes on");
const FIBRE_S = A.fibre(50, 8);
function panel(fb, t, dy) {
  const py = TOP + 2 + dy;
  fb.window(12, py, 246, 202);
  fb.text("JADI:", 22, py + 6, { font: F16, colour: R });
  const rows = [
    () => {
      fb.blit(FIBRE_S, 18, py + 34);
      for (const [x, y] of [[22, 28], [38, 46], [54, 28]]) fb.blit(A.O2, x, py + y);
      fb.text("OTOT", 74, py + 28, { font: F16, colour: Wc });
      fb.text("BUTUH O2", 74, py + 46, { font: F16, colour: Wc, colours: [..."BUTUH O2"].map((c, i) => (i >= 6 ? S : Wc)) });
    },
    () => {
      fb.blit(A.brain(16, 11, true, 5), 16, py + 74);
      nerve(fb, [[25, py + 92], [34, py + 100], [44, py + 104]]);
      blitC(fb, A.heart(30, { pace: 1 }), 54, py + 112);
      fb.text("SARAF:", 74, py + 72, { font: F16, colour: Yl });
      fb.text("DETAK ×2", 74, py + 90, { font: F16, colour: Wc });
      fb.text("LEBIH KUAT", 74, py + 108, { font: F16, colour: Wc });
    },
    () => {
      blitC(fb, A.heart(30, {}), 30, py + 160);
      fb.blit(A.bottle(14, 28, 1), 46, py + 146);
      fb.text(`${T_REST} L`, 74, py + 136, { font: F16, colour: Wc });
      fb.text(`→ ${T_RUN} L`, 74, py + 154, { font: F16, colour: R });
      fb.text(`≈${T_RATIO}×`, 74, py + 172, { font: F16, colour: R });
    },
  ];
  rows.forEach((draw, k) => t >= ROW_AT[k] - 0.05 && draw());
}
function summary(fb, t) {
  park(fb, t, { player: "frozen", heart: false, inset: true });
  panel(fb, t, [-150, -60, 0][clamp(frames(t, s.s16.start), 0, 2)]);
}
function finale(fb, t) {
  park(fb, t);
  // the panel closes as a game window does: its contents go, and it folds shut towards its middle in four steps
  const f = frames(t, s.s17.start);
  const h = [150, 96, 46, 12][f] ?? 0;
  if (h > 0) fb.window(12, TOP + 2 + Math.round((202 - h) / 2), 246, h);
}

// ── s01: footsteps where he runs in the open ────────────────────────────────────────────────────────────────────

// ── The film: which picture draws when, and the cuts between them ─────────────────────────────────────────────
const SCENES = [
  [0, opening], [s.s02.start, pause], [s.s03.start, legScene], [s.s04.start, inside], [s.s06.start, mapS06], [s.s07.start, rest],
  [s.s08.start, heartOpen], [s.s09.start, score1], [s.s10.start, getUp], [S10_MAP, mapNerves], [S11_HEART, heartNear], [s.s12.start, strips],
  [s.s13.start, heartHard], [s.s13b.start, blocks], [s.s14.start, score2], [s.s15.start, running], [s.s16.start, summary], [s.s17.start, finale],
];
// Cuts: an iris (a circle opening on the thing that carries over), a screen wipe across or down, all in whole pixels.
const TRANSITIONS = [
  { at: s.s03.start, n: 5, kind: "iris", c: [PLAYER.x + 12, 262] },
  { at: s.s04.start, n: 5, kind: "iris", c: [130, 190] },
  { at: s.s06.start, n: 5, kind: "wipe", dir: 1 },
  { at: s.s07.start, n: 5, kind: "wipe", dir: -1 },
  { at: s.s08.start, n: 5, kind: "iris", c: [SKY_HEART.x, SKY_HEART.y] },
  { at: s.s09.start, n: 5, kind: "down" },
  { at: s.s10.start, n: 5, kind: "wipe", dir: 1 },
  { at: S10_MAP, n: 5, kind: "down" },
  { at: S11_HEART, n: 5, kind: "iris", c: [SMALL.heart[0] + SX, SMALL.heart[1] + SY] },
  { at: s.s12.start, n: 4, kind: "wipe", dir: 1 },
  { at: s.s13b.start, n: 5, kind: "down" },
  { at: s.s14.start, n: 5, kind: "wipe", dir: -1 },
  { at: s.s15.start, n: 5, kind: "wipe", dir: 1 },
];
for (const tr of TRANSITIONS) ev(tr.kind === "iris" ? "dissolve" : "wipe", tr.at, `${tr.kind} at ${tr.at.toFixed(2)}`);
const sceneAt = (t) => SCENES.findLastIndex(([at]) => t >= at - 1e-6);
const SHAKES = [[SPARK, 2], ...S13_BEATS.map((k) => [k, 1]), [LAND, 2], [BLOCK_AT + 3 / FPS, 1]];
const fb = new FB(), fa = new FB(), fbb = new FB();
const canvas = document.getElementById("game");
function shift(buf, dx, dy) {
  const copy = buf.d.slice();
  for (let y = TOP; y < BOTTOM; y++) for (let x = 0; x < W; x++) buf.d[y * W + x] = copy[clamp(y - dy, TOP, BOTTOM - 1) * W + clamp(x - dx, 0, W - 1)];
}
film.each((t) => {
  const idx = Math.max(0, sceneAt(t));
  const draw = SCENES[idx][1];
  const tr = TRANSITIONS.find((x) => t >= x.at - 1e-6 && frames(t, x.at) < x.n);
  if (tr && idx > 0) {
    SCENES[idx - 1][1](fa, t);
    draw(fbb, t);
    const p = (frames(t, tr.at) + 1) / (tr.n + 1);
    if (tr.kind === "iris") {
      // a circle of the new picture opening from the thing that carries over, edged in navy
      const R0 = Math.hypot(270, 480) * p, [cx, cy] = tr.c;
      for (let y = 0; y < 480; y++) for (let x = 0; x < W; x++) {
        const r = Math.hypot(x - cx, y - cy);
        fb.d[y * W + x] = r < R0 - 2 ? fbb.d[y * W + x] : r < R0 ? N : fa.d[y * W + x];
      }
    } else if (tr.kind === "wipe") {
      const edge = Math.floor((p * (W + 4)) / 2) * 2;
      for (let y = 0; y < 480; y++) for (let x = 0; x < W; x++) {
        const X = tr.dir > 0 ? x : W - 1 - x;
        fb.d[y * W + x] = X < edge - 2 ? fbb.d[y * W + x] : X < edge ? N : fa.d[y * W + x];
      }
    } else if (tr.kind === "down") {
      const edge = TOP + Math.floor((p * (BOTTOM - TOP + 4)) / 2) * 2;
      for (let y = 0; y < 480; y++) for (let x = 0; x < W; x++) fb.d[y * W + x] = y < edge - 2 ? fbb.d[y * W + x] : y < edge ? N : fa.d[y * W + x];
    }
  } else {
    draw(fb, t);
  }
  const shake = SHAKES.find(([at, n]) => t >= at - 0.04 && frames(t, at - 0.04) < n);
  if (shake) shift(fb, frames(t, shake[0] - 0.04) % 2 ? -1 : 1, 1);
  hud(fb, t);
  dialog(fb, t);
  present(fb, canvas);
});

film.finish();
