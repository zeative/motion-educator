// "Why does a bigger rear gear make hills easier?" in the Blueprint template. Built from storyboard.json: every time
// below is a shot's start or end, or a beat of the bed (75 BPM, 0.8 s), counted from them.
//
// The drawing: technical drawings of real parts at true proportion (parts.js), drawn on at a steady pen speed and
// lettered in technical capitals (draft.js), six sheets of one set. The bike is a Polygon Xtrada 7 (2021, XL, 29 in)
// from its geometry (f8); the gears an involute pair cut by one rack, module 3, 12 and 36 teeth, profile-shifted
// +0.6 / -0.6 (f4); the sprockets for a 1/2-inch chain (f6) on a Shimano Deore 11-51 cassette and a 32-tooth chainring
// (f7). Every quantity drawn is computed from those numbers: the turns of 360 and 120 degrees, the radii 18 and 54 mm,
// the bars 1 : 3, the wheel turns 2.91 and 0.97, the roads 6.73 and 2.24 m.
//
// Sheet scales: 6 px on the frame is 1 mm of drawing, so the gears (6 px per mm) are 1:1, DETAIL B 3:1, the bike
// (0.75 px per mm) 1:8, the exploded cassette (2 px per mm) 1:3, the cogs (3 px per mm) 1:2, the roads (0.2) 1:30.
import { createFilm } from "../../kit/engine/motion.js";
import { createInk } from "../../kit/engine/ink.js";
import { createFlatBackdrop } from "../../kit/engine/backdrops.js";
import * as G from "./parts.js";
import { createDraft } from "./draft.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, shots: s } = film;
const ink = createInk(film);
film.captions();
// The blueprint paper, painted by the template's own stage, for the two sheets that slide in over the table.
const paper = Object.assign(document.createElement("canvas"), { width: 1920, height: 1080 });
createFlatBackdrop(paper, film.look).render({});
const D = createDraft(film, ink, { paperURL: paper.toDataURL("image/jpeg", 0.95) });
const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
const BEAT = storyboard.music.beat;
const cue = (kind, at, note) => D.log(kind, at, at, note); // a sound the picture makes (cues.build.py)
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
// When a letter of a label is written (for a sound on one character of it).
// (ink.write counts the letters, not the spaces: i is the letter's place among them)
const letterAt = (at, text, i, speed) => { const n = text.replace(/\s/g, "").length; return at + (i * Math.max(0.3, n / speed)) / n; };

// The sheets, bottom to top. The bike and the summary are sheets of their own paper; the rest are drawn on the
// table's sheet (the kit's blueprint stage) and laid over them.
const bk = D.sheet("bike", { paper: true });
const sm = D.sheet("summary", { paper: true });
const gr = D.sheet("gears");
const cs = D.sheet("cassette");
const cg = D.sheet("cogs");
const rd = D.sheet("roads");

// ═══ Sheets 1 and 3: the bike on the hill (s01, s02, s10, s11, s15, s17) ════════════════════════════════════════
// Drawn at 0.75 px per mm (1:8), the rear axle at (507, 576), tilted 6 degrees up a hill (f8).
const AX = [507, 576], SB = 0.75, TILT = -6;
const GEO = G.GEO;
const rot = (q, a) => [Math.cos(rad(a)) * q[0] - Math.sin(rad(a)) * q[1], Math.sin(rad(a)) * q[0] + Math.cos(rad(a)) * q[1]];
const onBike = (q) => { const r = rot(q, TILT); return [AX[0] + SB * r[0], AX[1] + SB * r[1]]; };
const SLOPE = rot([1, 0], TILT);
const WR = (GEO.TYRE / 2) * SB; // the wheel's radius on the sheet
const B = G.bike({ cog: 33 });
const BBl = B.b.BB, Fl = B.b.F;
const ride = { d: 0, crank0: 60, cas: 0 }; // d: px travelled up the slope; crank0: the crank's angle at rest
const bikeParts = [];
function bpart(strokes, home, role = null, { fade = true, drawn = true, far = false, ...o } = {}) {
  const at = onBike(home);
  const P = bk.part(strokes, { x: at[0], y: at[1], s: SB, r: TILT, drawn, ...o });
  bikeParts.push({ P, home, role, fade, far });
  return P;
}
const GROUND = GEO.TYRE / 2;
const hatch = [];
for (let x = -690; x < GEO.WB + 700; x += 44) hatch.push(G.line([x, GROUND + 5], [x - 26, GROUND + 31]));
const ground = bpart([G.line([-720, GROUND], [GEO.WB + 720, GROUND], { w: G.THICK }), ...hatch], [0, 0], "fixed", { far: true });
const axleLine = bpart([G.line([-430, 0], [GEO.WB + 430, 0], { dash: "chain" })], [0, 0], null, { far: true });
const rearW = G.wheel({ spokesFrom: G.tipR(51) + 3 }), frontW = G.wheel();
const rearRim = bpart(rearW.rim, [0, 0], "rear");
const rearSpokes = bpart(rearW.spokes, [0, 0], "rear", { k: 0.5 });
const rotorR = bpart([...B.rotorR, ...B.calR], [0, 0]);
const frontRim = bpart(frontW.rim, Fl, "front", { far: true });
const frontSpokes = bpart(frontW.spokes, Fl, "front", { far: true, k: 0.5 });
const frontHub = bpart([...frontW.hub, ...G.place(B.rotorF, {})], Fl, "front", { far: true });
const frame = bpart([...B.frame, ...B.calF], [0, 0]);
const derailleur = bpart(B.derailleur, [0, 0]);
const ring = bpart(B.ring, BBl, "crank");
const cas = bpart(G.cassette(1, { hi: [], only: (n) => n !== 33 }), [0, 0], "cas");
const cog33 = bpart(B.cog33, [0, 0], "cas", { fade: false });
// the chain is laid over the sprockets: its plates (filled with the paper) hide the teeth they wrap
const chainIn = bpart(B.chain.inner, [0, 0]);
const chainOut = bpart(B.chain.outer, [0, 0]);
const crank = bpart([...B.crankArm, ...B.otherArm], BBl, "crank");
const pedal = bpart(B.pedal, BBl, "pedal");
const pedal2 = bpart(B.pedal.map((k) => ({ ...k, w: G.THIN, dash: "dash", fill: undefined })), BBl, "pedal2");
const retrace = bpart([G.sprocket(33, 1, { w: G.THICK + 1, col: "acc" })], [0, 0], "cas", { fade: false, drawn: false });
const baseParts = bikeParts.filter((b) => b.fade).map((b) => b.P);
const farParts = bikeParts.filter((b) => b.far).map((b) => b.P);

// Where everything is, from the ride: the bike rolls up the slope, its wheels turn by the distance over their radius,
// and the crank turns 33/32 as far as the wheel (the chain on the 33, the chainring 32).
// (the hub rises to the middle sooner than the camera closes in, so the wheel stays clear of the caption)
const camAt = (w) => { const u = 1 - Math.pow(1 - w, 3); return D.aim(AX, [lerp(AX[0], 960, u), lerp(AX[1], 450, u)], Math.pow(3.2 / SB, w)); };
D.before((t) => {
  // s01 into s02: a draughtsman leaning in, then the dive into the hub, where the cassette is drawn 3.2 px per mm.
  // At the end (s17) the camera comes back to frame 0's place still moving the same way, so the loop is one move.
  let w = null;
  if (t < 8) w = t < 5.3 ? 0.12 * (t / 5.3) + 0.88 * Math.pow(t / 5.3, 5) : 1;
  else if (t >= 52) w = (0.12 * (t - 54.4)) / 5.3;
  if (w !== null) {
    Object.assign(bk.cam, camAt(w));
    const a = 1 - smooth(0.32, 0.62, w);
    for (const P of baseParts) P.st.a = P === cas ? 1 - 0.7 * smooth(0.45, 0.85, w) : P === ground ? 1 - smooth(0.08, 0.24, w) : a;
  }
  const sh = [SLOPE[0] * ride.d, SLOPE[1] * ride.d];
  const spin = deg(ride.d / WR), ca = ride.crank0 + (spin * 33) / 32;
  for (const { P, home, role } of bikeParts) {
    if (role === "fixed") continue;
    let at = onBike(home), r = TILT;
    if (role === "rear" || role === "front") r += spin;
    else if (role === "cas") r += spin + ride.cas;
    else if (role === "crank") r += ca;
    else if (role === "pedal" || role === "pedal2") at = onBike([home[0] + GEO.CRANK * Math.cos(rad(ca + (role === "pedal2" ? 180 : 0))), home[1] + GEO.CRANK * Math.sin(rad(ca + (role === "pedal2" ? 180 : 0)))]);
    P.st.x = at[0] + sh[0];
    P.st.y = at[1] + sh[1];
    P.st.r = r;
  }
});
const tb1 = D.titleBlock(bk, 0, { title: 'MOUNTAIN BIKE 29"', scale: "1:8", no: "1/6" });
bk.show(0);

// s01: frame 0 is finished. The push begins; the pen goes over the 33-tooth sprocket once more, in yellow.
retrace.drawOn(0.9, { duration: 1.4, kind: "pen" });

// s02: in the hub, the cassette along its axle, faint; the question in capitals over it.
const q1 = bk.label("BUT YOUR LEGS ARE THE SAME.", 960, 400, { size: 84, align: "middle", fixed: true, zoom: false, cls: "big" });
const q2 = bk.label("SO HOW?", 960, 524, { size: 84, align: "middle", fixed: true, zoom: false, col: "acc", cls: "big" });
tl.to(ride, { cas: 8, duration: 2.8, ease: "sine.inOut" }, s.s02.start);
q1.write(s.s02.start + 0.25, { speed: 24 });
q2.write(s.s02.start + 1.65, { speed: 17 });
cue("tick", letterAt(s.s02.start + 1.65, "SO HOW?", 5.5, 17), "the question mark");
// the last beat: the other sprockets are rubbed out, the lettering goes, and the 33 is carried into the next sheet
cas.erase(s.s03.start - 0.8, 0.35);
q1.erase(s.s03.start - 0.45, 0.3);
q2.fade(s.s03.start - 0.4, 0, 0.2);
bk.hide(s.s03.start - 0.2);
tl.set(retrace.st, { a: 0 }, s.s03.start - 0.2);

// ═══ Sheet 2: the spur gears, module 3, 12 and 36 teeth, 1:1 (s03 to s09) ═══════════════════════════════════════
// The pair in the middle of the sheet, Section A-A of the wheel beside it, the gear data in a table.
const K = 6, BIGC = [852, 430], SMC = [852 + 72 * K, 430], PP = [852 + 54 * K, 430]; // centres 72 mm apart; pitch point
const bigG = G.cutGear(36, 3, K, { x: -0.6, hub: 60, bore: 25, key: [8, 3.3] });
const smG = G.cutGear(12, 3, K, { x: 0.6, col: "acc", w: G.MID, hub: 22, bore: 10, key: [3, 1.4] });
const RA = bigG.g.ra * K, ra = smG.g.ra * K; // tip radii on the sheet
const gst = { th: 0 }; // how far the small gear has turned, clockwise, in degrees; the big one turns a third, back
const gpart = (strokes, at, o = {}) => gr.part(strokes, { x: at[0], y: at[1], ...o });
const centres = gpart([G.line([BIGC[0] - 400, 430], [SMC[0] + 170, 430], { dash: "chain" }), G.line([BIGC[0], 430 - 395], [BIGC[0], 430 + 395], { dash: "chain" }), G.line([SMC[0], 430 - 175], [SMC[0], 430 + 175], { dash: "chain" })], [0, 0]);
const pitchBig = gpart([bigG.pitch], BIGC), pitchSm = gpart([smG.pitch], SMC);
const outBig = gpart([bigG.outline], BIGC), outSm = gpart([smG.outline], SMC);
const hubBig = gpart(bigG.hub, BIGC), hubSm = gpart(smG.hub, SMC);
// reference marks: a radius from the hub out past the teeth to a dot, pointing up when s05 begins (small gear turned
// 90): the arcs of s05 are the paths of these dots
const TH5 = 90, RMB = 362, RMS = 160;
const markPart = (r0, r1, an, at) => { const c = Math.cos(rad(an)), n = Math.sin(rad(an)); return gpart([G.line([r0 * c, r0 * n], [r1 * c, r1 * n], { w: G.MID }), G.dot(r1 * c, r1 * n, 7)], at); };
const markBig = markPart(30 * K, RMB, -90 + TH5 / 3, BIGC);
const markSm = markPart(11 * K, RMS, -90 - 15 - TH5, SMC);
const turning = [outBig, hubBig, markBig, outSm, hubSm, markSm];
D.before(() => {
  outBig.st.r = hubBig.st.r = markBig.st.r = -gst.th / 3;
  outSm.st.r = hubSm.st.r = markSm.st.r = 15 + gst.th;
});
const dimBig = gpart(G.dim([BIGC[0] - 54 * K, 430], [PP[0], 430], 392), [0, 0]);
const dimSm = gpart(G.dim([PP[0], 430], [SMC[0] + 18 * K, 430], 200, { col: "acc" }), [0, 0]);
const bal1 = gpart(G.balloon(600, 112, BIGC[0] + RA * Math.cos(rad(-128)), 430 + RA * Math.sin(rad(-128))), [0, 0]);
const bal2 = gpart(G.balloon(1430, 262, SMC[0] + ra * Math.cos(rad(-42)), 430 + ra * Math.sin(rad(-42)), 26, { col: "acc" }), [0, 0]);
const lDimBig = gr.label("Ø108 · 36 TEETH", BIGC[0] + 190, 800, { size: 30, align: "middle" });
const lDimSm = gr.label("Ø36 · 12 TEETH", SMC[0], 664, { size: 30, align: "middle", col: "acc" });
const lBal1 = gr.label("1", 600, 113, { size: 30, align: "middle" });
const lBal2 = gr.label("2", 1430, 263, { size: 30, align: "middle", col: "acc" });
// Section A-A of the wheel, projected beside it at the same scale: face 30 mm, hub 60 mm across and 20 mm proud,
// bore 25 mm with its keyway (cut through, so the top of the bore is the keyway's floor). Cut faces hatched; the teeth,
// by convention, not; root lines thick, pitch line a chain line.
const SX = 440, mm = (v) => v * K;
const secOutline = [
  G.S([[0, -15.8], [0, -55.2], [-30, -55.2], [-30, -30], [-50, -30], [-50, -15.8], [0, -15.8]].map(([x, y]) => [mm(x), mm(y)]), { w: G.THICK, closed: true, tool: "ruler" }),
  G.S([[0, 12.5], [0, 55.2], [-30, 55.2], [-30, 30], [-50, 30], [-50, 12.5], [0, 12.5]].map(([x, y]) => [mm(x), mm(y)]), { w: G.THICK, closed: true, tool: "ruler" }),
  G.line([mm(-30), mm(-48.45)], [0, mm(-48.45)], { w: G.THICK }), G.line([mm(-30), mm(48.45)], [0, mm(48.45)], { w: G.THICK }),
  G.line([mm(-50), mm(-12.5)], [0, mm(-12.5)], { w: G.THIN }),
  G.line([mm(-34), mm(-54)], [mm(4), mm(-54)], { dash: "chain" }), G.line([mm(-34), mm(54)], [mm(4), mm(54)], { dash: "chain" }),
  G.line([mm(-57), 0], [mm(7), 0], { dash: "chain" }),
];
const hatchIn = (x0, x1, y0, y1, step = 3.4) => {
  const out = [];
  for (let c = x0 - (y1 - y0) - step; c < x1 + step; c += step) {
    // the line x - c = -(y - y0) ... 45 degrees: from (c, y1) up to (c + (y1 - y0), y0), clipped to the box
    let p = [c, y1], q = [c + (y1 - y0), y0];
    const clip = (a, b) => {
      let t0 = 0, t1 = 1;
      const dx = b[0] - a[0], dy = b[1] - a[1];
      for (const [pp, qq] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
        if (pp === 0) { if (qq < 0) return null; continue; }
        const r = qq / pp;
        if (pp < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
      }
      return t0 < t1 ? [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]] : null;
    };
    const seg = clip(p, q);
    if (seg) out.push(G.line(seg[0].map(mm), seg[1].map(mm), { w: G.THIN - 0.4 }));
  }
  return out;
};
const secHatch = [...hatchIn(-30, 0, -48.45, -15.8), ...hatchIn(-50, -30, -30, -15.8), ...hatchIn(-30, 0, 12.5, 48.45), ...hatchIn(-50, -30, 12.5, 30)];
const section = gpart(secOutline, [SX, 430]);
const sectionHatch = gpart(secHatch, [SX, 430], { k: 0.6 }); // hatching is the lightest line on a drawing
const sweep = gpart([G.line([0, -mm(60)], [0, mm(60)], { col: "acc", dash: "chain" })], [SX, 430]);
const cutPlane = gpart([
  G.line([BIGC[0], 46], [BIGC[0], 80], { w: G.THICK + 1 }), G.line([BIGC[0], 780], [BIGC[0], 814], { w: G.THICK + 1 }),
  ...G.arrow([BIGC[0], 60], [BIGC[0] - 46, 60], { w: G.THIN }, 20), ...G.arrow([BIGC[0], 800], [BIGC[0] - 46, 800], { w: G.THIN }, 20),
], [0, 0]);
const lA1 = gr.label("A", BIGC[0] - 72, 60, { size: 34, align: "middle" }), lA2 = gr.label("A", BIGC[0] - 72, 800, { size: 34, align: "middle" });
const lSec = gr.label("SECTION A–A", SX - mm(25), 806, { size: 30, align: "middle" });
// the gear data, as a drawing gives it for each gear: teeth, module, pressure angle, profile shift
const TBL = { x: [1440, 1532, 1612, 1684, 1762, 1840], y: [62, 102, 142, 182] };
const table = gpart([
  G.S([[TBL.x[0], TBL.y[0]], [TBL.x[5], TBL.y[0]], [TBL.x[5], TBL.y[3]], [TBL.x[0], TBL.y[3]]], { closed: true, w: G.THICK - 1 }),
  G.line([TBL.x[0], TBL.y[1]], [TBL.x[5], TBL.y[1]]), G.line([TBL.x[0], TBL.y[2]], [TBL.x[5], TBL.y[2]]),
  ...TBL.x.slice(1, 5).map((x) => G.line([x, TBL.y[0]], [x, TBL.y[3]])),
], [0, 0]);
const cellL = (r, c, text, o = {}) => gr.label(text, (TBL.x[c] + TBL.x[c + 1]) / 2, (TBL.y[r] + TBL.y[r + 1]) / 2 + 1, { size: 28, align: "middle", cls: "tb", ...o });
const tableL = [
  ["GEAR", "z", "m", "α", "x"].map((t, c) => cellL(0, c, t)),
  ["1", "36", "3", "20°", "−0.6"].map((t, c) => cellL(1, c, t)),
  ["2", "12", "3", "20°", "+0.6"].map((t, c) => cellL(2, c, t, { col: "acc" })),
];
// the title block is there, complete, the moment the sheet is: never blank
const tbG = D.titleBlock(gr, s.s03.start - 0.2, { title: "SPUR GEARS · m 3", scale: "1:1", no: "2/6", write: [] });

// s02 to s03: the yellow 33 is carried across: it glides to the big gear's place and opens to its pitch circle.
const carrier = gr.part([G.sprocket(33, 1, { w: G.THICK + 1, col: "acc" })], { x: 960, y: 450, s: 3.2, r: TILT + 8 });
gr.show(s.s03.start - 0.2);
tl.set(carrier.st, { p: 1e9 }, s.s03.start - 0.2);
tl.to(carrier.st, { x: BIGC[0], y: BIGC[1], s: (54 * K) / G.pitchR(33), r: TILT + 26, duration: 0.65, ease: "power2.inOut" }, s.s03.start - 0.15);
carrier.fade(s.s03.start + 0.4, 0, 0.4);
cue("slide", s.s03.start - 0.15, "the sprocket carried across");
// s03: built as a draughtsman would: centre lines, pitch circles, the outlines tooth by tooth, hubs, then the section
// (its cutting plane, its outline, its hatching swept on), the data table, the dimensions and part numbers.
const S3 = s.s03.start;
centres.drawOn(S3 + 0.05, { speed: 7000, kind: "ruler" });
pitchBig.drawOn(S3 + 0.25, { speed: 6000, kind: "compass" });
pitchSm.drawOn(S3 + 0.55, { speed: 5000, kind: "compass" });
let t3 = outBig.drawOn(S3 + 0.62, { duration: 0.72, kind: "pen" });
t3 = outSm.drawOn(t3 + 0.02, { duration: 0.24, kind: "pen" });
hubBig.drawOn(t3, { duration: 0.18, kind: "compass" });
hubSm.drawOn(t3 + 0.12, { duration: 0.12, kind: "silent" });
const SEC = t3 + 0.2;
cutPlane.drawOn(SEC, { duration: 0.22, kind: "ruler" });
lA1.write(SEC + 0.18, { duration: 0.06 });
lA2.write(SEC + 0.2, { duration: 0.06 });
const tSec = section.drawOn(SEC + 0.2, { duration: 0.38, kind: "ruler" });
// the cutting line sweeps across the section and the cut faces are hatched behind it
tl.set(sectionHatch.st, { p: 1e9, clipX: 10 }, tSec);
tl.to(sectionHatch.st, { clipX: -mm(52), duration: 0.5, ease: "power1.inOut" }, tSec);
tl.set(sweep.st, { p: 1e9, x: SX + 6 }, tSec);
tl.to(sweep.st, { x: SX - mm(52), duration: 0.5, ease: "power1.inOut" }, tSec);
tl.set(sweep.st, { a: 0 }, tSec + 0.52);
D.log("pen", tSec, tSec + 0.5, "hatching swept on");
lSec.write(tSec + 0.3, { speed: 50 });
table.drawOn(SEC + 0.1, { duration: 0.3, kind: "silent" });
tableL.forEach((row, r) => row.forEach((L, c) => L.write(SEC + 0.3 + r * 0.12 + c * 0.03, { duration: 0.08 })));
dimBig.drawOn(SEC + 0.45, { duration: 0.2, kind: "silent" });
lDimBig.write(SEC + 0.55, { speed: 50 });
dimSm.drawOn(SEC + 0.6, { duration: 0.16, kind: "silent" });
lDimSm.write(SEC + 0.68, { speed: 50 });
bal1.drawOn(SEC + 0.78, { duration: 0.16, kind: "compass" });
lBal1.write(SEC + 0.86, { duration: 0.06 });
bal2.drawOn(SEC + 0.84, { duration: 0.16, kind: "silent" });
lBal2.write(SEC + 0.92, { duration: 0.06 });
// the detail is marked on the view before the camera goes into it
const markB = gpart([G.circle(PP[0], PP[1], 62, { dash: "dash" })], [0, 0]);
const lB = gr.label("B", PP[0], PP[1] - 128, { size: 34, align: "middle" });
markB.drawOn(s.s04.start - 0.3, { duration: 0.2, kind: "compass" });
lB.write(s.s04.start - 0.18, { duration: 0.06 });

// s04: DETAIL B, the mesh at 3:1. The small gear turns three teeth; each tooth that passes the pitch point gets its
// number, and so does each tooth of the big gear it pushes past: one for one.
const DB = [1060, 420];
gr.camTo(D.aim(PP, DB, 3), s.s04.start - 0.12, 0.62, "power2.inOut");
markB.fade(s.s04.start + 0.25, 0, 0.3);
lB.fade(s.s04.start + 0.25, 0, 0.3);
// the dimensions and part numbers have said their piece: they go as the camera goes in, and the sheet stays clean
for (const P of [dimBig, dimSm, bal1, bal2]) P.fade(s.s04.start - 0.12, 0, 0.3);
for (const L of [lDimBig, lDimSm, lBal1, lBal2]) L.fade(s.s04.start - 0.12, 0, 0.3);
const lDetB = gr.label("DETAIL B · 3:1", 110, 110, { size: 34, fixed: true, zoom: false });
lDetB.write(s.s04.start + 0.35, { speed: 40 });
const SPIN0 = s.s04.start + 0.6; // the small gear turns 75 degrees a second: a tooth on every half beat
tl.to(gst, { th: 90, duration: 1.2, ease: "none" }, SPIN0);
const numbers = [];
for (let k = 1; k <= 3; k++) {
  const js = 6 - k, jb = k; // small tooth 5, 4, 3 and big tooth 1, 2, 3 pass in turn
  const ls = gr.label(String(k), 13.6 * K * Math.cos(rad(30 * js)), 13.6 * K * Math.sin(rad(30 * js)), { size: 50, align: "middle", col: "acc", part: outSm, zoom: false });
  const lb = gr.label(String(k), 44 * K * Math.cos(rad(10 * jb)), 44 * K * Math.sin(rad(10 * jb)), { size: 50, align: "middle", part: outBig, zoom: false });
  const atS = SPIN0 + (15 + 30 * (k - 1)) / 75, atB = SPIN0 + (30 * k) / 75;
  ls.write(atS, { duration: 0.1 });
  lb.write(atB, { duration: 0.1 });
  cue("tooth", atS, `small tooth ${k} passes`);
  cue("tooth2", atB, `big tooth ${k} passes`);
  numbers.push(ls, lb);
}
gr.camTo({ ...D.aim(PP, DB, 3.1) }, s.s04.start + 1.85, 0.5, "sine.inOut");
for (const n of numbers) n.fade(s.s05.start - 0.12, 0, 0.14);
lDetB.fade(s.s05.start - 0.12, 0, 0.14);
D.log("clear", s.s05.start - 0.12, s.s05.start + 0.02);

// s05: back to the whole sheet. One turn of the small gear: its mark's dot draws a full circle; the big gear's draws a
// third of one, the other way.
gr.camTo({ x: 960, y: 540, z: 1 }, s.s05.start, 0.62, "power2.inOut");
markBig.drawOn(s.s05.start + 0.62, { duration: 0.16, kind: "ruler" });
markSm.drawOn(s.s05.start + 0.7, { duration: 0.1, kind: "silent" });
const TURN0 = s.s05.start + 0.75, TURN = 2.2;
tl.to(gst, { th: 90 + 360, duration: TURN, ease: "power1.inOut" }, TURN0);
const arcSm = gpart([G.arc(SMC[0], SMC[1], RMS, -90, 270, { col: "acc", w: G.THIN + 0.5 })], [0, 0]);
const arcBig = gpart([G.arc(BIGC[0], BIGC[1], RMB, -90, -210, { w: G.THIN + 0.5 })], [0, 0]);
const headSm = gpart([G.head([SMC[0] - 30, SMC[1] - RMS - 2], [SMC[0] + 2, SMC[1] - RMS], 24, { col: "acc" })], [0, 0]);
const eB = [BIGC[0] + RMB * Math.cos(rad(-210)), BIGC[1] + RMB * Math.sin(rad(-210))];
const headBig = gpart([G.head([eB[0] - RMB * Math.sin(rad(-210)) * -0.09, eB[1] + RMB * Math.cos(rad(-210)) * -0.09], eB, 24)], [0, 0]);
arcSm.drawOn(TURN0, { duration: TURN, ease: "power1.inOut", kind: "silent" });
arcBig.drawOn(TURN0, { duration: TURN, ease: "power1.inOut", kind: "silent" });
headSm.drawOn(TURN0 + TURN, { duration: 0.08, kind: "silent" });
headBig.drawOn(TURN0 + TURN, { duration: 0.08, kind: "silent" });
// each value beside its own arc
const l360 = gr.label("1 TURN · 360°", SMC[0] + RMS + 26, SMC[1], { size: 42, col: "acc" });
const l120 = gr.label("1/3 TURN · 120°", 640, 66, { size: 42, align: "end" });
l360.write(TURN0 + TURN + 0.02, { speed: 40 });
l120.write(TURN0 + TURN + 0.12, { speed: 44 });
// a tick for every tooth of the small gear that passes (twelve), when the eased turn carries it past
{
  const ease = gsap.parseEase("power1.inOut");
  for (let k = 1; k <= 12; k++) {
    const target = (30 * k - 15) / 360;
    let lo = 0, hi = 1;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (ease(m) < target) lo = m; else hi = m; }
    cue("tooth-soft", TURN0 + TURN * lo, `tooth ${k} of 12`);
  }
}
gr.camTo({ x: 966, y: 540, z: 1.02 }, TURN0 + TURN, 0.9, "sine.inOut");

// s06: the arcs go; the camera goes in to the pitch point: the push on the big gear and the push back are equal.
for (const P of [arcSm, arcBig, headSm, headBig]) P.fade(s.s06.start + 0.05, 0, 0.2);
D.log("clear", s.s06.start + 0.05, s.s06.start + 0.25);
l360.fade(s.s06.start + 0.05, 0, 0.18);
l120.fade(s.s06.start + 0.05, 0, 0.18);
// (close enough to read the push, not so close that the wheel runs under the caption or the table off the top)
gr.camTo(D.aim(PP, [1000, 452], 1.16), s.s06.start + 0.1, 1.1, "power2.inOut");
gr.camTo(D.aim(PP, [996, 450], 1.21), s.s06.start + 1.2, s.s07.start - 0.1 - (s.s06.start + 1.2), "sine.inOut");
const dot = gpart([G.dot(PP[0], PP[1], 8)], [0, 0]);
dot.drawOn(s.s06.start + 0.45, { duration: 0.12, kind: "compass" });
const fUp = gpart(G.arrow([PP[0], PP[1] - 12], [PP[0], PP[1] - 172], { w: G.THICK }, 28), [0, 0]);
const fDown = gpart(G.arrow([PP[0], PP[1] + 12], [PP[0], PP[1] + 172], { w: G.THICK, col: "acc" }, 28), [0, 0]);
fUp.drawOn(s.s06.start + 0.75, { duration: 0.5, kind: "ruler" });
fDown.drawOn(s.s06.start + 0.75, { duration: 0.5, kind: "silent" });
const lFu = gr.label("F", PP[0] + 24, PP[1] - 166, { size: 46 });
const lFd = gr.label("F", PP[0] + 24, PP[1] + 160, { size: 46, col: "acc" });
lFu.write(s.s06.start + 1.3, { duration: 0.08 });
lFd.write(s.s06.start + 1.36, { duration: 0.08 });
const lAct = gr.label("ACTION = REACTION", SMC[0] + 26, 612, { size: 32 });
lAct.write(s.s06.start + 1.65, { speed: 30 });

// s07: but the push acts three times farther from the big gear's axle: the camera pulls back to both centres and the
// radii are drawn at one pen speed, so the long one takes three times as long.
lAct.erase(s.s07.start - 0.15, 0.15);
gr.camTo({ x: 1080, y: 460, z: 1.12 }, s.s07.start - 0.1, 0.9, "power2.inOut");
const radSm = gpart(G.arrow([SMC[0], 430], [PP[0] + 2, 430], { col: "acc", w: G.MID }, 24), [0, 0]);
const radBig = gpart(G.arrow([BIGC[0], 430], [PP[0] - 2, 430], { w: G.MID }, 24), [0, 0]);
const leadSm = gpart([G.line([SMC[0] - 40, 440], [SMC[0] + 44, 600], { col: "acc" }), G.dot(SMC[0] - 40, 440, 4, { col: "acc" })], [0, 0]);
const lR18 = gr.label("r 18", SMC[0] + 52, 622, { size: 46, col: "acc" });
const lR54 = gr.label("r 54", BIGC[0] + 108, 398, { size: 46, align: "middle" });
const PEN = 430; // px a second
let t7 = radSm.drawOn(s.s07.start + 0.15, { speed: PEN, kind: "ruler" });
leadSm.drawOn(t7, { duration: 0.12, kind: "silent" });
lR18.write(t7 + 0.1, { speed: 26 });
t7 = radBig.drawOn(s.s07.start + 0.85, { speed: PEN, kind: "ruler" });
lR54.write(t7 + 0.05, { speed: 26 });
const DIV = "54 ÷ 18 = 3", DIVAT = s.s08.start - 0.95;
const lDiv = gr.label('54 ÷ 18 = <span class="acc">3</span>', 1450, 300, { size: 54 });
lDiv.write(DIVAT, { speed: 22 });
cue("tick", letterAt(DIVAT, DIV, 6.5, 22), "the 3");

// s08: torque is force times distance: two outline bars, F x 18 and F x 54, 1 : 3. The camera pans to them.
lDiv.erase(s.s08.start - 0.12, 0.16);
gr.camTo({ x: 1180, y: 520, z: 1 }, s.s08.start - 0.1, 1.0, "power2.inOut");
const lTq1 = gr.label("TORQUE =", 1470, 262, { size: 32 }), lTq2 = gr.label("FORCE × DISTANCE", 1470, 302, { size: 32 });
lTq1.write(s.s08.start + 0.1, { speed: 40 });
lTq2.write(s.s08.start + 0.35, { speed: 44 });
const BX = 1478, BW = 112, BH = 120 / 18, BY = 780; // bar height: 120 px for 18 mm, so 54 mm stands at 360 px
const base8 = gpart([G.line([1450, BY], [1810, BY])], [0, 0]);
const bar18 = gr.part([G.S([[0, 0], [0, -18 * BH], [BW, -18 * BH], [BW, 0]], { w: G.THICK })], { x: BX, y: BY });
const bar54 = gr.part([G.S([[0, 0], [0, -54 * BH], [BW, -54 * BH], [BW, 0]], { w: G.THICK, col: "acc" })], { x: BX + 180, y: BY });
base8.drawOn(s.s08.start + 0.75, { duration: 0.2, kind: "ruler" });
for (const [P, at, d] of [[bar18, s.s08.start + 0.95, 0.4], [bar54, s.s08.start + 1.5, 0.9]]) {
  tl.set(P.st, { p: 1e9, sy: 0 }, at);
  tl.to(P.st, { sy: 1, duration: d, ease: "power2.out" }, at);
  D.log("ruler", at, at + d);
}
const lF18 = gr.label("F × 18", BX + BW / 2, BY + 32, { size: 30, align: "middle" });
const lF54 = gr.label("F × 54", BX + 180 + BW / 2, BY + 32, { size: 30, align: "middle", col: "acc" });
const lX3 = gr.label("×3", BX + 180 + BW / 2, BY - 54 * BH - 36, { size: 54, align: "middle", col: "acc" });
lF18.write(s.s08.start + 1.2, { speed: 40 });
lF54.write(s.s08.start + 1.9, { speed: 40 });
const X3a = s.s08.start + 2.4; // on the beat
lX3.write(X3a, { duration: 0.12 });
cue("ping", X3a, "TORQUE x3, the bars 1 : 3");
gr.camTo({ x: 1196, y: 524, z: 1.03 }, s.s08.start + 1.0, s.s09.start - 0.1 - (s.s08.start + 1.0), "sine.inOut");

// s09: speed is traded for torque: the pair turns on, the big gear a third as fast; the camera pulls back.
const clear9 = [base8, bar18, bar54, radSm, radBig, leadSm, fUp, fDown, dot];
for (const P of clear9) P.fade(s.s09.start - 0.08, 0, 0.14);
D.log("clear", s.s09.start - 0.08, s.s09.start + 0.06);
for (const L of [lTq1, lTq2, lF18, lF54, lX3, lR18, lR54, lFu, lFd]) L.fade(s.s09.start - 0.08, 0, 0.12);
gr.camTo({ x: 960, y: 540, z: 1 }, s.s09.start, 0.9, "power2.inOut");
tl.to(gst, { th: 450 + 360 + 150 * 0.4, duration: 2.8, ease: "none" }, s.s09.start);
const slowArc = gpart([G.arc(BIGC[0], BIGC[1], RMB + 14, -62, -108, { w: G.MID }), G.head([BIGC[0] + (RMB + 14) * Math.cos(rad(-104)), BIGC[1] + (RMB + 14) * Math.sin(rad(-104))], [BIGC[0] + (RMB + 14) * Math.cos(rad(-112)), BIGC[1] + (RMB + 14) * Math.sin(rad(-112))], 24, { w: G.MID })], [0, 0]);
slowArc.drawOn(s.s09.start + 0.15, { duration: 0.45, kind: "pen" });
const lTurns = gr.label("TURNS 1/3", 1500, 300, { size: 48 });
const lTorq = gr.label("TORQUE ×3", 1500, 620, { size: 54, col: "acc" });
const aDown = gpart(G.arrow([1468, 268], [1468, 336], { w: G.MID }, 20), [0, 0]);
const aUp = gpart(G.arrow([1468, 654], [1468, 584], { w: G.MID, col: "acc" }, 20), [0, 0]);
const aTrade = gpart(G.arrow2([1610, 352], [1610, 568], { w: G.MID }, 22), [0, 0]);
const lTraded = gr.label("TRADED", 1640, 462, { size: 36 });
lTurns.write(s.s09.start + 0.2, { speed: 32 });
aDown.drawOn(s.s09.start + 0.42, { duration: 0.18, kind: "ruler" });
lTorq.write(s.s09.start + 0.65, { speed: 32 });
aUp.drawOn(s.s09.start + 0.88, { duration: 0.18, kind: "ruler" });
aTrade.drawOn(s.s09.start + 1.05, { duration: 0.3, kind: "ruler" });
lTraded.write(s.s09.start + 1.15, { speed: 34 });

// s09 to s10: the bike is the same mechanism with a chain. The big gear, the driven one, shrinks into the 33 on the
// rear hub; the bike is drawn round it, with its own driver, the 32-tooth chainring.
const M10 = s.s10.start - 0.6;
for (const P of [slowArc, aDown, aUp, aTrade, centres, pitchBig, pitchSm, section, sectionHatch, cutPlane, table]) P.fade(M10 - 0.1, 0, 0.2);
D.log("clear", M10 - 0.1, M10 + 0.1);
for (const L of [lTurns, lTorq, lTraded, lA1, lA2, lSec, ...tableL.flat()]) L.fade(M10 - 0.1, 0, 0.18);
const RS = onBike([0, 0]);
for (const P of [outBig, hubBig, markBig]) tl.to(P.st, { x: RS[0], y: RS[1], s: (G.pitchR(33) * SB) / (54 * K), duration: 0.6, ease: "power3.inOut" }, M10 + 0.1);
for (const P of [outSm, hubSm, markSm]) P.fade(M10, 0, 0.3);
for (const P of [outBig, hubBig, markBig]) P.fade(M10 + 0.55, 0, 0.3);
for (const L of [tbG.title, tbG.no, tbG.scale, tbG.units, tbG.rev]) tl.set(L.el, { autoAlpha: 0 }, M10 + 0.45);
tl.set(tbG.P.st, { a: 0 }, M10 + 0.45);
cue("slide", M10, "the big gear shrinks onto the rear hub");
gr.hide(s.s10.start + 0.6);

// ═══ s10: the bike again, its drivetrain, and its chain (sheet 3) ═══════════════════════════════════════════════
const B10 = M10 + 0.45; // the bike is drawn on once the gear is nearly in its place
bk.show(B10);
tl.set(bk.cam, { x: 960, y: 540, z: 1 }, B10);
tl.set(ride, { d: 0, crank0: 60, cas: 0 }, B10);
for (const b of bikeParts) tl.set(b.P.st, { a: 1 }, B10);
tl.set(retrace.st, { a: 0 }, B10);
const drawnParts = [ground, axleLine, rearRim, rearSpokes, rotorR, frontRim, frontSpokes, frontHub, frame, derailleur, chainIn, chainOut, ring, crank, pedal, pedal2, cas, cog33];
function drawBike(at, withChain) {
  for (const P of drawnParts) tl.set(P.st, { p: 0, e: 0 }, at);
  ground.drawOn(at, { duration: 0.5, kind: "ruler" });
  rearRim.drawOn(at, { duration: 0.6, kind: "compass" });
  frontRim.drawOn(at + 0.05, { duration: 0.6, kind: "silent" });
  frame.drawOn(at + 0.12, { duration: 0.75, kind: "pen" });
  ring.drawOn(at + 0.2, { duration: 0.35, kind: "silent" });
  cog33.drawOn(at + 0.25, { duration: 0.35, kind: "silent" });
  cas.drawOn(at + 0.3, { duration: 0.45, kind: "silent" });
  rearSpokes.drawOn(at + 0.4, { duration: 0.5, kind: "silent" });
  frontSpokes.drawOn(at + 0.42, { duration: 0.5, kind: "silent" });
  frontHub.drawOn(at + 0.5, { duration: 0.3, kind: "silent" });
  rotorR.drawOn(at + 0.55, { duration: 0.25, kind: "silent" });
  crank.drawOn(at + 0.45, { duration: 0.3, kind: "silent" });
  pedal.drawOn(at + 0.6, { duration: 0.2, kind: "silent" });
  pedal2.drawOn(at + 0.62, { duration: 0.2, kind: "silent" });
  derailleur.drawOn(at + 0.6, { duration: 0.4, kind: "silent" });
  axleLine.drawOn(at + 0.75, { duration: 0.25, kind: "silent" });
  if (withChain) {
    chainIn.drawOn(at + 0.7, { duration: 0.4, kind: "silent" });
    chainOut.drawOn(at + 0.7, { duration: 0.4, kind: "silent" });
  }
  return at + 1.0;
}
drawBike(B10, false);
const tb10 = D.retitle(bk, s.s10.start - 0.6 + 0.45, tb1, { title: "BIKE · DRIVETRAIN", no: "3/6" });
// the chain, link by link in the direction it moves: off the 33 over the top, round the chainring, back under; the
// camera goes in to the drivetrain as it is drawn, and what is far from it fades
const CH = s.s10.start + 0.7;
chainIn.drawOn(CH, { duration: 0.9, kind: "chain" });
chainOut.drawOn(CH, { duration: 0.9, kind: "silent" });
const CAM10 = { x: 680, y: 640, z: 1.7 };
bk.camTo(CAM10, s.s10.start + 0.15, 0.7, "power2.inOut");
for (const P of farParts) P.fade(s.s10.start + 0.2, 0, 0.5);
// (on the frame, as the camera has them: a sheet point p is at (p - cam) z + the frame's middle)
const onCam = (p) => [(p[0] - CAM10.x) * CAM10.z + 960, (p[1] - CAM10.y) * CAM10.z + 540];
const BBc = onCam(onBike(BBl)), AXc = onCam(AX), Lc = onCam(onBike([B.L[0] + 10, B.L[1] - 60]));
const rr = G.pitchR(GEO.RING) * SB * CAM10.z, rc = G.tipR(51) * SB * CAM10.z;
const BAL = { 3: [1290, 250], 4: [120, 250], 5: [390, 860] };
const offCam = (q) => [(q[0] - 960) / CAM10.z + CAM10.x, (q[1] - 540) / CAM10.z + CAM10.y]; // back onto the sheet
const balloonAt = (n, tx, ty) => { const b0 = offCam(BAL[n]), t0 = offCam([tx, ty]); return bk.part(G.balloon(b0[0], b0[1], t0[0], t0[1], 26 / CAM10.z), {}); };
const bal3 = balloonAt(3, BBc[0] + rr * Math.cos(rad(-62)), BBc[1] + rr * Math.sin(rad(-62)));
const bal4 = balloonAt(4, AXc[0] + rc * Math.cos(rad(198)), AXc[1] + rc * Math.sin(rad(198)));
const bal5 = balloonAt(5, Lc[0], Lc[1]);
const lb = (n) => { const b0 = offCam(BAL[n]); return bk.label(String(n), b0[0], b0[1] + 1 / CAM10.z, { size: 32, align: "middle", zoom: false }); };
const lb3 = lb(3), lb4 = lb(4), lb5 = lb(5);
// the parts list, over the title block, names the numbered parts (and which drives which)
const PL = { x0: 1440, x1: 1840, y0: 740, xm: 1494, row: 44 };
const plist = bk.part([G.S([[PL.x0, 872], [PL.x0, PL.y0], [PL.x1, PL.y0], [PL.x1, 872]], { w: G.THICK - 1 }), G.line([PL.x0, PL.y0 + PL.row], [PL.x1, PL.y0 + PL.row], { w: 2 }), G.line([PL.x0, PL.y0 + 2 * PL.row], [PL.x1, PL.y0 + 2 * PL.row], { w: 2 }), G.line([PL.xm, PL.y0], [PL.xm, 872], { w: 2 })], { fixed: true });
const plRow = (i, n, text) => [bk.label(n, PL.x0 + 27, PL.y0 + PL.row * (i + 0.5) + 1, { size: 28, align: "middle", fixed: true, zoom: false, cls: "tb" }), bk.label(text, PL.xm + 14, PL.y0 + PL.row * (i + 0.5) + 1, { size: 28, fixed: true, zoom: false, cls: "tb" })];
const plRows = [plRow(0, "3", "DRIVER: CHAINRING 32"), plRow(1, "4", "DRIVEN: COG 11–51"), plRow(2, "5", "REAR DERAILLEUR")];
const B3 = s.s10.start + 0.9;
bk.camTo({ x: CAM10.x + 10, y: CAM10.y - 4, z: CAM10.z * 1.035 }, B3 + 0.2, s.s11.start - 0.15 - (B3 + 0.2), "sine.inOut");
plist.drawOn(B3 - 0.15, { duration: 0.25, kind: "ruler" });
[[bal3, lb3], [bal4, lb4], [bal5, lb5]].forEach(([P, L], i) => {
  P.drawOn(B3 + i * 0.12, { duration: 0.18, kind: i ? "silent" : "compass" });
  L.write(B3 + i * 0.12 + 0.1, { duration: 0.06 });
  plRows[i][0].write(B3 + i * 0.12 + 0.05, { duration: 0.06 });
  plRows[i][1].write(B3 + i * 0.12 + 0.08, { speed: 70 });
});

// s11: into the cassette: the push goes on into the rear hub and the cassette, drawn along its axle, turns to an
// isometric view and slides apart along the axle: an exploded view of its eleven sprockets (sheet 4, 1:3).
const P11 = s.s11.start - 0.15;
for (const P of [bal3, bal4, bal5, plist]) P.fade(P11 - 0.05, 0, 0.16);
for (const L of [lb3, lb4, lb5, ...plRows.flat()]) L.fade(P11 - 0.05, 0, 0.14);
D.log("clear", P11 - 0.05, P11 + 0.11);
const KX = 2.0, S0 = [700, 470]; // the exploded view's scale, and where the hub is when the views change over
bk.camTo(D.aim(AX, S0, KX / SB), P11, 0.75, "power2.inOut");
for (const P of baseParts) if (P !== cas) P.fade(P11 + 0.05, 0, 0.4);
cog33.fade(P11 + 0.05, 0.6, 0.4);
const HX = s.s11.start + 0.55; // the change-over to the cassette sheet
bk.hide(HX + 0.2);
cs.show(HX);
const tbX = D.titleBlock(cs, HX, { title: "CASSETTE 11–51 T", scale: "1:3", no: "4/6", write: [] });
tl.set(tb10.title.el, { autoAlpha: 0 }, HX);
// the exploded cassette: each sprocket an outline in its own plane, drawn every frame for the view and the spacing
// the timeline sets; where a sprocket is behind a nearer one its outline is a hidden line, dashed
const iso = { psi: 0, chi: 0, gap: 3.95, cx: S0[0], cy: S0[1], a: 0, others: 1, spin: TILT };
const ISO = { psi: 45, chi: 35.264 };
const cassetteIso = (() => {
  const SVGNS = "http://www.w3.org/2000/svg";
  const g = document.createElementNS(SVGNS, "g");
  cs.svg.append(g);
  const items = G.CASSETTE.map((n, i) => {
    const pts = G.sprocketOutline(n, { phase: rad((i - 7) * 7) });
    // the outline's radius by direction (it is star-shaped), for the hidden-line test
    const N = 1440, rr = new Float64Array(N).fill(0);
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k], b = pts[(k + 1) % pts.length];
      for (let u = 0; u < 1; u += 0.1) {
        const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
        const bin = Math.floor(((Math.atan2(y, x) + Math.PI) / (2 * Math.PI)) * N) % N;
        rr[bin] = Math.max(rr[bin], Math.hypot(x, y));
      }
    }
    for (let k = 0; k < N; k++) if (!rr[k]) rr[k] = rr[(k + N - 1) % N];
    const hi = n === 11 || n === 33;
    const mk = (dash) => { const p = document.createElementNS(SVGNS, "path"); p.setAttribute("fill", "none"); p.setAttribute("stroke", hi ? "var(--accent)" : "var(--ink)"); p.setAttribute("stroke-width", dash ? 1.6 : hi ? G.MID : G.THIN); p.setAttribute("stroke-linejoin", "round"); if (dash) p.setAttribute("stroke-dasharray", "7 5"); g.append(p); return p; };
    return { n, i, pts, rr, N, hi, solid: mk(false), dashed: mk(true) };
  });
  const lock = (() => { const p = document.createElementNS(SVGNS, "path"); p.setAttribute("fill", "none"); p.setAttribute("stroke", "var(--ink)"); p.setAttribute("stroke-width", G.THIN); g.append(p); return p; })();
  const axle = (() => { const p = document.createElementNS(SVGNS, "path"); p.setAttribute("fill", "none"); p.setAttribute("stroke", "var(--ink)"); p.setAttribute("stroke-width", G.THIN); p.setAttribute("stroke-dasharray", "24 7 4 7"); g.append(p); return p; })();
  let sig = "";
  function draw() {
    const vis = cs.el.style.visibility !== "hidden";
    const key = `${vis},${iso.psi},${iso.chi},${iso.gap},${iso.cx},${iso.cy},${iso.a},${iso.others},${iso.spin}`;
    if (key === sig) return;
    sig = key;
    g.style.opacity = iso.a;
    if (!vis || iso.a <= 0.002) return;
    const ps = rad(iso.psi), ch = rad(iso.chi), cps = Math.cos(ps), sps = Math.sin(ps), cch = Math.cos(ch), sch = Math.sin(ch);
    const cr = Math.cos(rad(iso.spin)), sr = Math.sin(rad(iso.spin));
    // world: X along the axle (inboard +), Y right, Z up; view: turned psi about Z, tilted chi
    const proj = (X, Y, Z) => {
      const Xp = X * cps - Y * sps, Yp = X * sps + Y * cps;
      const up = Xp * sch + Z * cch;
      return [iso.cx + KX * Yp, iso.cy - KX * up];
    };
    const Dw = [cps * cch, -sps * cch, -sch]; // the viewing direction, into the drawing
    const Xs = items.map((it) => it.i * iso.gap);
    const hidden = (X, Y, Z, j) => {
      for (let k = 0; k < j; k++) {
        if (!(iso.others > 0.02 || items[k].hi)) continue;
        const t = (X - Xs[k]) / Dw[0];
        if (!(t > 0)) continue;
        const y = Y - t * Dw[1], z = Z - t * Dw[2];
        const it = items[k], bin = Math.floor(((Math.atan2(-z, y) - rad(iso.spin) + 3 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI) * it.N) % it.N;
        if (Math.hypot(y, z) < it.rr[bin]) return true;
      }
      return false;
    };
    for (const it of items) {
      const alpha = it.hi ? 1 : iso.others;
      it.solid.style.opacity = it.dashed.style.opacity = alpha;
      if (alpha <= 0.01) { it.solid.setAttribute("d", ""); it.dashed.setAttribute("d", ""); continue; }
      let ds = "", dd = "", prev = null;
      const X = Xs[it.i];
      const seq = [...it.pts, it.pts[0]];
      for (const [px, py] of seq) {
        const Y = cr * px - sr * py, Zy = sr * px + cr * py, Z = -Zy;
        const q = proj(X, Y, Z), h = hidden(X, Y, Z, it.i);
        const c = `${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
        if (h) dd += prev === "h" ? `L${c}` : `M${c}`;
        else ds += prev === "s" ? `L${c}` : `M${c}`;
        prev = h ? "h" : "s";
      }
      it.solid.setAttribute("d", ds);
      it.dashed.setAttribute("d", dd);
    }
    // the lockring in front of the 11, and the axle's centre line through the stack
    let dl = "";
    for (let k = 0; k <= 48; k++) { const q = (k / 48) * 2 * Math.PI, p = proj(-1, 17 * Math.cos(q), 17 * Math.sin(q)); dl += `${k ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`; }
    lock.setAttribute("d", dl);
    const a0 = proj(-26, 0, 0), a1 = proj(10 * iso.gap + 26, 0, 0);
    axle.setAttribute("d", iso.psi > 1 ? `M${a0[0].toFixed(1)} ${a0[1].toFixed(1)}L${a1[0].toFixed(1)} ${a1[1].toFixed(1)}` : "");
  }
  D.before(() => draw());
  return { draw };
})();
// the change-over: the cassette sheet's view starts where the bike's cassette is, then turns and slides apart
tl.set(iso, { a: 1, psi: 0, chi: 0, gap: 3.95, cx: S0[0], cy: S0[1], others: 1, spin: TILT }, HX);
tl.to(iso, { psi: ISO.psi, chi: ISO.chi, duration: 0.7, ease: "power2.inOut" }, HX + 0.1);
tl.to(iso, { gap: 24, cx: 600, cy: 680, duration: 0.8, ease: "power3.inOut" }, HX + 0.25);
cue("slide", HX + 0.25, "the cassette slides apart along its axle");
const lView = cs.label("VIEW C · EXPLODED", 110, 110, { size: 34, fixed: true, zoom: false });
lView.write(HX + 0.3, { speed: 40 });
// where the 11 and the 33 are once exploded (for the leaders)
const isoAt = (X, Y, Z) => {
  const ps = rad(ISO.psi), ch = rad(ISO.chi);
  const Xp = X * Math.cos(ps) - Y * Math.sin(ps), Yp = X * Math.sin(ps) + Y * Math.cos(ps);
  return [600 + KX * Yp, 680 - KX * (Xp * Math.sin(ch) + Z * Math.cos(ch))];
};
const p11 = isoAt(0, G.tipR(11), 0), p33 = isoAt(7 * 24, G.tipR(33) * Math.cos(rad(20)), G.tipR(33) * Math.sin(rad(20)));
const CO = s.s11.start + 1.3;
const lead11 = cs.part([G.dot(p11[0], p11[1], 4.5, { col: "acc" }), G.line(p11, [1220, 690], { col: "acc" }), G.line([1220, 690], [1240, 690], { col: "acc" })], {});
const lead33 = cs.part([G.dot(p33[0], p33[1], 4.5, { col: "acc" }), G.line(p33, [1220, 448], { col: "acc" }), G.line([1220, 448], [1240, 448], { col: "acc" })], {});
const lHead = cs.label("WHEEL TURNS PER PEDAL TURN", 1252, 340, { size: 30 });
const l33a = cs.label("33 TEETH · Ø133.6", 1252, 448, { size: 38, col: "acc" }), l33b = cs.label("32 → 33: 0.97 TURN", 1252, 494, { size: 32 });
const l11a = cs.label("11 TEETH · Ø45.1", 1252, 690, { size: 38, col: "acc" }), l11b = cs.label("32 → 11: 2.91 TURNS", 1252, 736, { size: 32 });
lHead.write(CO - 0.1, { speed: 80 });
lead33.drawOn(CO, { duration: 0.14, kind: "ruler" });
l33a.write(CO + 0.08, { speed: 70 });
l33b.write(CO + 0.26, { speed: 70 });
lead11.drawOn(CO + 0.4, { duration: 0.14, kind: "silent" });
l11a.write(CO + 0.48, { speed: 70 });
l11b.write(CO + 0.66, { speed: 70 });
// out of it again, into the two cogs: the others go, the view turns back along the axle, and the 11 and the 33 are
// handed to the next sheet at the very pixels they are at
const H12 = s.s12.start + 0.3, SC = [620, 450]; // the cogs are handed over a little into s12, so the callouts hold
for (const P of [lead11, lead33]) P.fade(H12 - 0.5, 0, 0.15);
for (const L of [lHead, l33a, l33b, l11a, l11b, lView]) L.fade(H12 - 0.5, 0, 0.15);
D.log("clear", H12 - 0.5, H12 - 0.35);
tl.to(iso, { others: 0, duration: 0.2, ease: "power1.in" }, H12 - 0.45);
tl.to(iso, { psi: 0, chi: 0, gap: 0, cx: SC[0], cy: SC[1], duration: 0.4, ease: "power2.inOut" }, H12 - 0.42);
cs.hide(H12);
tl.set(iso, { a: 0 }, H12);

// ═══ s12, s13: the 11 and the 33 apart, each with the chain over its top (sheet 4 again, 1:2) ═══════════════════
const KC = 3.0, L11 = [330, 560], L33 = [1150, 560];
const R11 = G.pitchR(11) * KC, R33 = G.pitchR(33) * KC;
cg.show(H12);
const tbC = D.titleBlock(cg, H12, { title: "CASSETTE 11–51 T", scale: "1:2", no: "4/6", write: [] });
tl.set([tbX.scale.el, tbX.title.el, tbX.no.el, tbX.units.el, tbX.rev.el], { autoAlpha: 0 }, H12 + 0.02);
// handed over: the cassette view drew sprocket i with the phase (i - 7) x 7 degrees and the cassette's turn
const sp11 = cg.part([G.sprocket(11, 1, { w: G.MID, col: "acc" })], { x: SC[0], y: SC[1], s: KX, r: TILT - 49 });
const sp33 = cg.part([G.sprocket(33, 1, { w: G.MID, col: "acc" })], { x: SC[0], y: SC[1], s: KX, r: TILT });
tl.set(sp11.st, { p: 1e9 }, H12);
tl.set(sp33.st, { p: 1e9 }, H12);
const toSeat = (n, from) => { const tau = 360 / n; return -90 + tau * Math.round((from + 90) / tau); };
tl.to(sp11.st, { x: L11[0], y: L11[1], s: KC, r: toSeat(11, TILT - 49 + 20), duration: 0.65, ease: "power3.inOut" }, H12 + 0.05);
tl.to(sp33.st, { x: L33[0], y: L33[1], s: KC, r: toSeat(33, TILT + 10), duration: 0.65, ease: "power3.inOut" }, H12 + 0.05);
cue("slide", H12 + 0.05, "the two cogs slide apart");
const cl11 = cg.part([...G.centreLines(L11[0], L11[1], 110)], {}), cl33 = cg.part([...G.centreLines(L33[0], L33[1], 250)], {});
cl11.drawOn(H12 + 0.6, { duration: 0.2, kind: "ruler" });
cl33.drawOn(H12 + 0.65, { duration: 0.25, kind: "silent" });
const lC11 = cg.label("COG 11", L11[0], 822, { size: 34, align: "middle", col: "acc" });
const lC33 = cg.label("COG 33", L33[0], 822, { size: 34, align: "middle", col: "acc" });
lC11.write(H12 + 0.65, { speed: 40 });
lC33.write(H12 + 0.75, { speed: 40 });
// the chain: rollers seated in the sprocket's seats over the top, then running off straight to the right; its plates
// hide the teeth they wrap
function chainOn(n, run) {
  const R = G.pitchR(n), tau = 360 / n, pts = [];
  for (let i = 3; i >= 1; i--) pts.push([R * Math.cos(rad(-90 - i * tau)), R * Math.sin(rad(-90 - i * tau))]);
  for (let i = 0; i * G.P <= run; i++) pts.push([i * G.P, -R]);
  return G.chainLinks(pts, KC);
}
const mkChain = (n, at) => { const c = chainOn(n, 290 / KC); return [cg.part(c.inner, { x: at[0], y: at[1] - 34 }), cg.part(c.outer, { x: at[0], y: at[1] - 34 })]; };
const ch11 = mkChain(11, L11), ch33 = mkChain(33, L33);
for (const [P, i] of [[ch11[0], 0], [ch11[1], 0], [ch33[0], 1], [ch33[1], 1]]) P.drawOn(H12 + 0.72 + i * 0.02, { duration: 0.34, kind: P === ch11[0] ? "chain" : "silent" });
const DROP = H12 + 1.12;
for (const [Ps, L] of [[ch11, L11], [ch33, L33]]) for (const P of Ps) {
  tl.to(P.st, { y: L[1] + 3, duration: 0.16, ease: "power2.in" }, DROP);
  tl.to(P.st, { y: L[1], duration: 0.14, ease: "power1.out" }, DROP + 0.16);
}
cue("drop", DROP + 0.16, "the chains drop onto the teeth");
// the same pull F on both chains: the same push on the same 32-tooth chainring
const fy11 = L11[1] - R11, fy33 = L33[1] - R33;
const f11 = cg.part(G.arrow([L11[0] + 300, fy11], [L11[0] + 460, fy11], { w: G.THICK }, 28), {});
const f33 = cg.part(G.arrow([L33[0] + 300, fy33], [L33[0] + 460, fy33], { w: G.THICK }, 28), {});
f11.drawOn(H12 + 1.42, { duration: 0.36, kind: "ruler" });
f33.drawOn(H12 + 1.42, { duration: 0.36, kind: "silent" });
const lF11 = cg.label("F", L11[0] + 380, fy11 - 36, { size: 46, align: "middle" });
const lF33 = cg.label("F", L33[0] + 380, fy33 - 36, { size: 46, align: "middle" });
const lFrom = cg.label("TO THE 32 T CHAINRING", L33[0] + 300, fy33 + 40, { size: 28 });
lF11.write(H12 + 1.8, { duration: 0.08 });
lF33.write(H12 + 1.84, { duration: 0.08 });
lFrom.write(H12 + 1.88, { speed: 60 });

// s13: the same pull, three times the radius: 22.5 and 66.8 mm. The bars of the wheel's torque, 1 : 2.97, in the
// clear upper left; the wheel itself beside them, its 33 on the hub.
const r11 = cg.part(G.dim([L11[0], L11[1]], [L11[0], fy11], 46), {});
const r33 = cg.part(G.dim([L33[0], L33[1]], [L33[0], fy33], 46), {});
r11.drawOn(s.s13.start + 0.1, { duration: 0.3, kind: "ruler" });
r33.drawOn(s.s13.start + 0.4, { duration: 0.35, kind: "ruler" });
const lr11 = cg.label("r 22.5", L11[0] + 100, L11[1] - 14, { size: 36 });
const lr33 = cg.label("r 66.8", L33[0] - 26, L33[1] - R33 / 2, { size: 36, align: "end" });
lr11.write(s.s13.start + 0.4, { speed: 30 });
lr33.write(s.s13.start + 0.75, { speed: 30 });
const QX = 150, QW = 90, QH = 4, QY = 360; // 4 px per mm of radius: 90 and 267 px
const base13 = cg.part([G.line([120, QY], [460, QY])], {});
const q11 = cg.part([G.S([[0, 0], [0, -G.pitchR(11) * QH], [QW, -G.pitchR(11) * QH], [QW, 0]], { w: G.THICK })], { x: QX, y: QY });
const q33 = cg.part([G.S([[0, 0], [0, -G.pitchR(33) * QH], [QW, -G.pitchR(33) * QH], [QW, 0]], { w: G.THICK, col: "acc" })], { x: QX + 170, y: QY });
base13.drawOn(s.s13.start + 1.0, { duration: 0.18, kind: "ruler" });
const X3b = s.s13.start + 2.4; // on the beat
for (const [P, at, d] of [[q11, s.s13.start + 1.15, 0.35], [q33, X3b - 0.85, 0.85]]) {
  tl.set(P.st, { p: 1e9, sy: 0 }, at);
  tl.to(P.st, { sy: 1, duration: d, ease: "power2.out" }, at);
  D.log("ruler", at, at + d);
}
const lWT = cg.label("WHEEL TORQUE", 120, 64, { size: 30 });
const lq11 = cg.label("F × 22.5", QX + QW / 2, QY + 30, { size: 28, align: "middle" });
const lq33 = cg.label("F × 66.8", QX + 170 + QW / 2, QY + 30, { size: 28, align: "middle", col: "acc" });
const lx3b = cg.label("×3", QX + 170 + QW + 30, QY - G.pitchR(33) * QH + 24, { size: 54, col: "acc" });
const lRatio = cg.label("66.8 ÷ 22.5 = 2.97 ≈ 3", 520, 190, { size: 32 });
lWT.write(s.s13.start + 0.95, { speed: 50 });
lq11.write(s.s13.start + 1.4, { speed: 40 });
lq33.write(X3b - 0.3, { speed: 40 });
lx3b.write(X3b, { duration: 0.12 });
lRatio.write(X3b + 0.15, { speed: 44 });
cue("ping", X3b, "the 33 gives the wheel 3 times the torque");
// the wheel, 1:30, with the 33 on its hub, beside the bars
const wIn = G.wheel();
const wheelInset = cg.part([...wIn.rim, ...wIn.spokes, ...wIn.hub, G.sprocket(33, 1, { w: G.MID, col: "acc" })], { x: 1640, y: 150, s: 0.2 });
const lWheel = cg.label("33 FIXED TO THE WHEEL", 1640, 254, { size: 28, align: "middle" });
wheelInset.drawOn(s.s13.start + 1.55, { duration: 0.45, kind: "compass" });
lWheel.write(s.s13.start + 1.9, { speed: 60 });

// ═══ s14: the price: distance per pedal turn, 1:30 (6.73 m is 1346 px) (sheet 5) ═════════════════════════════════
const KR = 0.2; // px per mm on the road
const WRr = (GEO.TYRE / 2) * KR, X0 = 180, RUN11 = (GEO.RING / 11) * Math.PI * GEO.TYRE * KR, RUN33 = (GEO.RING / 33) * Math.PI * GEO.TYRE * KR;
const Y1 = 380, Y2 = 700;
const O14 = s.s14.start - 0.3;
for (const P of [f11, f33, r11, r33, base13, q11, q33, ...ch11, ...ch33, cl11, cl33, wheelInset]) P.fade(O14 - 0.05, 0, 0.16);
D.log("clear", O14 - 0.05, O14 + 0.11);
for (const L of [lF11, lF33, lFrom, lr11, lr33, lq11, lq33, lx3b, lRatio, lWT, lWheel, lC11, lC33]) L.fade(O14 - 0.05, 0, 0.14);
// the two cogs roll off to the right, and the sheet is the roads
for (const [P, R] of [[sp11, R11], [sp33, R33]]) tl.to(P.st, { x: `+=${1500}`, r: `+=${deg(1500 / R)}`, duration: 0.45, ease: "power2.in" }, O14 + 0.12);
cue("roll", O14 + 0.12, "the cogs roll away");
cg.hide(s.s14.start + 0.3);
rd.show(s.s14.start - 0.05);
const tbR = D.titleBlock(rd, s.s14.start - 0.05, { title: "DISTANCE PER PEDAL TURN", units: "UNITS: m", scale: "1:30", no: "5/6", write: [] });
tl.set([tbC.title.el, tbC.scale.el, tbC.no.el, tbC.units.el, tbC.rev.el], { autoAlpha: 0 }, s.s14.start - 0.03);
const roadHatch = (y) => { const h = []; for (let x = 150; x < 1840; x += 44) h.push(G.line([x, y + 4], [x - 22, y + 26])); return h; };
const road1 = rd.part([G.line([130, Y1], [1840, Y1], { w: G.THICK }), ...roadHatch(Y1)], {});
const road2 = rd.part([G.line([130, Y2], [1840, Y2], { w: G.THICK }), ...roadHatch(Y2)], {});
road1.drawOn(s.s14.start + 0.02, { duration: 0.42, kind: "ruler" });
road2.drawOn(s.s14.start + 0.06, { duration: 0.42, kind: "silent" });
const startLine = rd.part([G.line([X0, 236], [X0, 790], { dash: "dash" })], {});
startLine.drawOn(s.s14.start + 0.3, { duration: 0.2, kind: "ruler" });
const rw = G.wheel();
const wheel1 = rd.part([...rw.rim, ...rw.spokes, ...rw.hub], { x: X0, y: Y1 - WRr, s: KR });
const wheel2 = rd.part([...rw.rim.map((k, i) => (i === 0 ? { ...k, col: "acc", w: G.MID } : k)), ...rw.spokes, ...rw.hub], { x: X0, y: Y2 - WRr, s: KR });
wheel1.drawOn(s.s14.start + 0.25, { duration: 0.35, kind: "compass" });
wheel2.drawOn(s.s14.start + 0.3, { duration: 0.35, kind: "silent" });
const lCog11 = rd.label("COG 11", 1840, Y1 + 48, { size: 34, align: "end" });
const lCog33 = rd.label("COG 33", 1840, Y2 + 48, { size: 34, align: "end", col: "acc" });
lCog11.write(s.s14.start + 0.35, { speed: 40 });
lCog33.write(s.s14.start + 0.45, { speed: 40 });
// one pedal turn: a chainring and crank (0.68 px per mm) turning once while both wheels roll
const dialC = [420, 140], KD = 0.68;
const dial = rd.part([G.sprocket(32, 1, { w: G.THIN }), G.circle(0, 0, 24, { w: G.THIN }), ...G.place(B.crankArm, {})], { x: dialC[0], y: dialC[1], s: KD, r: 60 });
dial.drawOn(s.s14.start + 0.35, { duration: 0.3, kind: "silent" });
const lPedal = rd.label("1 PEDAL TURN", 580, 140, { size: 34 });
lPedal.write(s.s14.start + 0.4, { speed: 40 });
const roll = { u: 0 };
const ROLL0 = s.s14.start + 0.38, ROLL = 1.6; // one pedal turn
tl.to(roll, { u: 1, duration: ROLL, ease: "none" }, ROLL0);
D.before(() => {
  const d1 = RUN11 * roll.u, d2 = RUN33 * roll.u;
  wheel1.st.x = X0 + d1;
  wheel1.st.r = deg(d1 / WRr);
  wheel2.st.x = X0 + d2;
  wheel2.st.r = deg(d2 / WRr);
  dial.st.r = 60 + 360 * roll.u;
});
// a tick on the road at each full turn of a wheel, as it passes; the dimension lines grow behind the wheels
const CIRC = Math.PI * GEO.TYRE * KR;
const ticks = [];
for (let k = 1; k * CIRC < RUN11; k++) {
  const tk = rd.part([G.line([X0 + k * CIRC, Y1 - 14], [X0 + k * CIRC, Y1 + 14], { w: G.MID })], {});
  tk.drawOn(ROLL0 + (ROLL * k * CIRC) / RUN11, { duration: 0.06, kind: "silent" });
  ticks.push(tk);
}
const dim1 = rd.part([G.line([X0, 430], [X0 + RUN11, 430])], {}), dim2 = rd.part([G.line([X0, 750], [X0 + RUN33, 750], { col: "acc" })], {});
dim1.drawOn(ROLL0, { duration: ROLL, kind: "silent" });
dim2.drawOn(ROLL0, { duration: ROLL, kind: "silent" });
const ends1 = rd.part([...G.dim([X0, 430], [X0 + RUN11, 430], 0).slice(1), G.line([X0, 412], [X0, 448]), G.line([X0 + RUN11, 412], [X0 + RUN11, 448])], {});
const ends2 = rd.part([...G.dim([X0, 750], [X0 + RUN33, 750], 0, { col: "acc" }).slice(1), G.line([X0, 732], [X0, 768], { col: "acc" }), G.line([X0 + RUN33, 732], [X0 + RUN33, 768], { col: "acc" })], {});
ends1.drawOn(ROLL0 + ROLL, { duration: 0.12, kind: "ruler" });
ends2.drawOn(ROLL0 + ROLL, { duration: 0.12, kind: "silent" });
const l67 = rd.label("6.7 m", X0 + RUN11 / 2, 464, { size: 44, align: "middle" });
const l22 = rd.label("2.2 m", X0 + RUN33 / 2, 784, { size: 44, align: "middle", col: "acc" });
const lT11 = rd.label("2.91 WHEEL TURNS", X0 + RUN11, Y1 - 2 * WRr - 34, { size: 30, align: "middle" });
const lT33 = rd.label("0.97 WHEEL TURN", X0 + RUN33, Y2 - 2 * WRr - 34, { size: 30, align: "middle" });
const lPrice1 = rd.label("SAME ROAD ON THE 33:", 1840, 560, { size: 34, align: "end" });
const lPrice2 = rd.label("3× THE PEDAL TURNS", 1840, 608, { size: 42, align: "end", col: "acc" });
l67.write(ROLL0 + ROLL + 0.05, { speed: 30 });
lPrice1.write(ROLL0 + ROLL + 0.02, { speed: 90 });
l22.write(ROLL0 + ROLL + 0.15, { speed: 30 });
lT11.write(ROLL0 + ROLL + 0.25, { speed: 60 });
lT33.write(ROLL0 + ROLL + 0.3, { speed: 60 });
lPrice2.write(ROLL0 + ROLL + 0.2, { speed: 50 });
rd.camTo({ x: 980, y: 520, z: 1.035 }, ROLL0 + ROLL, s.s15.start - 0.3 - (ROLL0 + ROLL), "sine.inOut");
D.log("roll11", ROLL0, ROLL0 + ROLL, "the chain runs onto the 11 while the wheel rolls");
D.log("roll33", ROLL0, ROLL0 + ROLL, "the chain runs onto the 33 while the wheel rolls");

// ═══ s15: back to the hill: slower, but much easier ══════════════════════════════════════════════════════════════
const B15 = s.s15.start - 0.25;
// the road of the 33 tilts up into the hill of sheet 1 (it lands on the hill's ground line), and the bike is drawn on it
for (const L of [lCog11, lCog33, lPedal, l67, l22, lT11, lT33, lPrice1, lPrice2]) L.fade(B15 - 0.06, 0, 0.1);
for (const P of [road1, wheel1, wheel2, dial, dim1, ends1, startLine, dim2, ends2, ...ticks]) P.fade(B15 - 0.06, 0, 0.12);
for (const L of [tbR.title, tbR.units, tbR.no, tbR.scale, tbR.rev]) tl.set(L.el, { autoAlpha: 0 }, B15);
tl.set(tbR.P.st, { a: 0 }, B15);
const HILL = onBike([0, GEO.TYRE / 2]);
const hillY = HILL[1] + (X0 - HILL[0]) * Math.tan(rad(TILT));
tl.to(rd.el, { rotation: TILT, y: hillY - Y2, transformOrigin: `${X0}px ${Y2}px`, duration: 0.45, ease: "power2.inOut" }, B15);
cue("slide", B15, "the road tilts into the hill");
tl.to(rd.el, { opacity: 0, duration: 0.25, ease: "power1.in" }, B15 + 0.4);
rd.hide(B15 + 0.66);
const B15s = B15; // the bike sheet comes back, put as it was, and is drawn on as the road tilts
tl.set(bk.cam, { x: 960, y: 540, z: 1 }, B15s);
tl.set(ride, { d: 0, crank0: -10, cas: 0 }, B15s); // the crank forward: the stroke where the push goes in
for (const b of bikeParts) tl.set(b.P.st, { a: 1 }, B15s);
tl.set(retrace.st, { a: 0 }, B15s);
drawBike(B15s, true);
bk.show(B15s);
const tb15 = D.retitle(bk, B15s, tb10, { title: 'MOUNTAIN BIKE 29"', no: "1/6" });
tl.set([tbR.title.el], { autoAlpha: 0 }, B15s);
// the bike creeps up the slope: 40 degrees of the crank on the 33 is 249 mm of road (2.24 m a turn)
const CREEP = (40 / 360) * 2242 * SB;
tl.to(ride, { d: CREEP, duration: 2.2, ease: "sine.inOut" }, s.s15.start + 0.2);
cue("creep", s.s15.start + 0.2, "a slow pedal stroke on the big cog");
bk.camTo(D.aim(onBike([300, 0]), [800, 530], 1.05), s.s15.start + 0.3, 1.9, "sine.inOut");
// the arrows ride with the bike: the torque at the wheel, the push it makes at the tyre, the push on the pedal, the
// speed
const tq = bk.part([G.arc(0, 0, 310, 196, 278, { col: "acc", w: G.MID }), G.head([310 * Math.cos(rad(270)), 310 * Math.sin(rad(270))], [310 * Math.cos(rad(279)), 310 * Math.sin(rad(279))], 28, { col: "acc" })], { x: AX[0], y: AX[1] });
const lTq15 = bk.label("TORQUE ×3", -392, -350, { size: 46, col: "acc", part: tq, zoom: false });
const push = bk.part(G.arrow([0, -128], [0, -26], { w: G.THICK }, 26), {});
const lPush = bk.label("SAME PUSH", 0, 64, { size: 32, align: "middle", part: push, zoom: false });
const slowA = bk.part(G.arrow([-80, 0], [120, 0], { w: G.MID }, 24), { r: TILT });
const lSlow = bk.label("SLOW", 20, -40, { size: 34, align: "middle", part: slowA, zoom: false });
D.before(() => {
  const sh = [SLOPE[0] * ride.d, SLOPE[1] * ride.d];
  tq.st.x = AX[0] + sh[0];
  tq.st.y = AX[1] + sh[1];
  const ca = ride.crank0 + (deg(ride.d / WR) * 33) / 32;
  const pd = onBike([BBl[0] + GEO.CRANK * Math.cos(rad(ca)), BBl[1] + GEO.CRANK * Math.sin(rad(ca))]);
  push.st.x = pd[0] + sh[0];
  push.st.y = pd[1] + sh[1];
  const sa = onBike([Fl[0], -480]);
  slowA.st.x = sa[0] + sh[0];
  slowA.st.y = sa[1] + sh[1];
});
tq.drawOn(s.s15.start + 0.3, { duration: 0.4, kind: "pen" });
lTq15.write(s.s15.start + 0.5, { speed: 40 });
push.drawOn(s.s15.start + 0.75, { duration: 0.22, kind: "ruler" });
lPush.write(s.s15.start + 0.85, { speed: 50 });
slowA.drawOn(s.s15.start + 1.05, { duration: 0.22, kind: "ruler" });
lSlow.write(s.s15.start + 1.1, { speed: 34 });

// ═══ s16: the summary sheet slides in over the table (sheet 6) ═══════════════════════════════════════════════════
const SLIDE = 2000, S16 = s.s16.start - 0.3;
tl.to(bk.el, { x: -SLIDE, duration: 0.75, ease: "power2.inOut" }, S16);
sm.show(S16);
tl.fromTo(sm.el, { x: SLIDE }, { x: 0, duration: 0.75, ease: "power2.inOut", immediateRender: false }, S16);
cue("slide", S16, "the summary sheet slides in");
bk.hide(S16 + 0.8);
D.titleBlock(sm, 0, { title: "SUMMARY", scale: "NTS", units: "UNITS: m", no: "6/6" });
// three views on one sheet, each with its view title and notes on leaders: the gear pair, the two cogs, the price
const V = [330, 960, 1590], VY = 340;
const miniBig = G.cutGear(36, 3, 2.6, { x: -0.6 }), miniSm = G.cutGear(12, 3, 2.6, { x: 0.6, col: "acc", w: G.MID });
const gB = [V[0] - 194 + miniBig.g.ra * 2.6, VY], gS = [gB[0] + 72 * 2.6, VY];
const view1 = sm.part([...G.place([miniBig.outline], { x: gB[0], y: gB[1] }), ...G.place([miniSm.outline], { x: gS[0], y: gS[1], r: 15 }), G.line([gB[0] - 175, VY], [gS[0] + 80, VY], { dash: "chain" }), G.line([gB[0], VY - 170], [gB[0], VY + 170], { dash: "chain" }), G.line([gS[0], VY - 80], [gS[0], VY + 80], { dash: "chain" })], {});
const k2 = 1.5, c11 = [V[1] - 130, VY], c33 = [V[1] + 70, VY];
const view2 = sm.part([...G.place([G.sprocket(11, k2, { col: "acc", w: G.MID })], { x: c11[0], y: c11[1] }), ...G.place([G.sprocket(33, k2, { col: "acc", w: G.MID })], { x: c33[0], y: c33[1] }), ...G.centreLines(c11[0], c11[1], 56), ...G.centreLines(c33[0], c33[1], 128)], {});
const mr = 420 / RUN11, rx0 = V[2] - 210;
const view3 = sm.part([G.line([rx0, 280], [rx0 + 440, 280], { w: G.THICK }), G.circle(rx0 + RUN11 * mr, 280 - 22, 22), ...G.dim([rx0, 316], [rx0 + RUN11 * mr, 316], 0), G.line([rx0, 452], [rx0 + 440, 452], { w: G.THICK }), G.circle(rx0 + RUN33 * mr, 452 - 22, 22, { col: "acc", w: G.MID }), ...G.dim([rx0, 488], [rx0 + RUN33 * mr, 488], 0, { col: "acc" }), G.line([rx0, 250], [rx0, 510], { dash: "dash" })], {});
const vt = (i, text) => [sm.label(text, V[i], 742, { size: 30, align: "middle" }), sm.part([G.line([V[i] - text.length * 9.4, 766], [V[i] + text.length * 9.4, 766], { w: G.THIN })], {})];
const titles = [vt(0, "VIEW 1 · GEAR PAIR"), vt(1, "VIEW 2 · REAR COGS"), vt(2, "VIEW 3 · ONE PEDAL TURN")];
const notes = [
  [sm.label("12 → 36", V[0], 586, { size: 40, align: "middle" }), sm.label("1/3 TURN · TORQUE ×3", V[0], 640, { size: 34, align: "middle", col: "acc" })],
  [sm.label("32 → 33 AGAINST 32 → 11", V[1], 586, { size: 34, align: "middle" }), sm.label("WHEEL TORQUE ×3", V[1], 640, { size: 34, align: "middle", col: "acc" })],
  [sm.label("THE PRICE", V[2], 586, { size: 40, align: "middle" }), sm.label("3× THE PEDAL TURNS", V[2], 640, { size: 34, align: "middle", col: "acc" })],
];
const lm11 = sm.label("11", c11[0], VY + 76, { size: 30, align: "middle" }), lm33 = sm.label("33", c33[0], VY + 136, { size: 30, align: "middle" });
const lm67 = sm.label("6.7 m", rx0 + (RUN11 * mr) / 2, 340, { size: 30, align: "middle" }), lm22 = sm.label("2.2 m", rx0 + (RUN33 * mr) / 2, 512, { size: 30, align: "middle", col: "acc" });
[view1, view2, view3].forEach((P, i) => {
  const at = s.s16.start + 0.15 + i * BEAT;
  P.drawOn(at, { duration: 0.42, kind: "pen" });
  titles[i][1].drawOn(at + 0.3, { duration: 0.12, kind: "silent" });
  titles[i][0].write(at + 0.25, { speed: 60 });
  notes[i][0].write(at + 0.32, { speed: 44 });
  notes[i][1].write(at + 0.48, { speed: 56 });
  cue("tick-up", at + 0.48, `summary line ${i + 1}`);
});
lm11.write(s.s16.start + 0.15 + BEAT + 0.35, { duration: 0.08 });
lm33.write(s.s16.start + 0.15 + BEAT + 0.4, { duration: 0.08 });
lm67.write(s.s16.start + 0.15 + 2 * BEAT + 0.35, { speed: 40 });
lm22.write(s.s16.start + 0.15 + 2 * BEAT + 0.42, { speed: 40 });
sm.camTo({ x: 960, y: 520, z: 1.035 }, s.s16.start + 0.75, s.s17.start - s.s16.start - 0.75, "sine.inOut");

// ═══ s17: that's why: the summary slides out and sheet 1 slides back to exactly where frame 0 has it ═════════════
// While it is off the table, the bike is put back as it was at frame 0.
const S17 = s.s17.start;
tl.set(ride, { d: 0, crank0: 60, cas: 0 }, S17 - 0.5);
for (const P of [tq, push, slowA]) tl.set(P.st, { e: 1 }, S17 - 0.5);
for (const L of [lTq15, lPush, lSlow]) tl.set(L.el, { autoAlpha: 0 }, S17 - 0.5);
tl.to(sm.el, { x: -SLIDE, duration: 1.3, ease: "power3.inOut" }, S17);
bk.show(S17);
tl.fromTo(bk.el, { x: SLIDE }, { x: 0, duration: 1.3, ease: "power3.inOut", immediateRender: false }, S17);
cue("slide", S17, "sheet 1 slides back");
sm.hide(S17 + 1.35);

film.finish();
