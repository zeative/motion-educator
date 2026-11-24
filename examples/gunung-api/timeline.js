// The shots of "Kenapa gunung api bisa meledak?", one after another, and the frame loop. The sets are built in
// film.js and handed over in ctx. Every time is a shot's start or end (storyboard.json) or a beat (72 BPM).
export function timeline(ctx) {
  const {
    film, tl, gsap, $, s, D, BEAT, THREE, renderer, camera, deg, V3, ease, note, sky, usePalette, fogMix, camOf, mixCam, aim, C, CL, cut, move,
    tags, tag, showTag, hideTag, noteOn, noteOff, col, clamp, smooth, lerp, hash,
    MERAPI, M, CRATER, FLOOR, southHalf, ash, pyro, updatePyro, CUTSET, cutFace, RES, CONDUIT, topAt, reservoir, resBuild, resMols, arrows, blob, kentalFill, DOME, domeShell, domeCut, cracks, domeBlocks, settleBlocks, domeY, trapped, froth, shards, shock, slice,
    KIL, MU, MLOA, HMM, ribbons, flowLava, sea, updateFountain, plumes, hmmPlume,
    wipe, updateWipe, MELT, melt, updateMelt, molH2O, molCO2, molSO2, sites,
    BOTTLE, bottleGroup, liquid, capMesh, bottleMols, BMATCH, fizz, bottle, miniRes, miniResBuild,
    LAB, COLH, colA, colB, bubA, bubB, pops, gasA, spill, upArrows, BARS, sizeBars, lab,
    CHART, CHART_BARS, chartBars, chartFold, CARD1, CARD2, CARD3, c1, c2, c3, cards, gauge, updateGauge, gaugeLabel,
  } = ctx;
  const SETS = { MERAPI, KIL, MELT, BOTTLE, LAB, CHART, CARD1, CARD2, CARD3 };
  const T_SWAP = 4.32; // inside the cloud: Merapi becomes Kīlauea
  // Which set the main view shows, and in which palette, at every moment.
  const WINDOWS = [
    [0, T_SWAP, "MERAPI", "dawn", C], [T_SWAP, 10.0, "KIL", "midday", C],
    [10.0, s.s05.start, "MERAPI", "dawn", CL], [s.s05.start, s.s06.start, "MELT", "ember", C], [s.s06.start, s.s07.start, "BOTTLE", "studio", C],
    [s.s07.start, s.s09.start, "MERAPI", "dawn", C], [s.s09.start, s.s10.start, "MELT", "emberHot", C], [s.s10.start, s.s13.start, "LAB", "lab", C],
    [s.s13.start, s.s16.start, "MERAPI", "dawn", C], [s.s16.start, s.s17.start, "CHART", "noon", C], [s.s17.start, D + 1, "MERAPI", "dawn", C],
  ];
  const ASH_SIZE = ash.size;
  const SEAM = new THREE.Color("#2c4d3c"); // the cut's face in shadow
  // the near half of Merapi: drop 1 = slid down out of sight (the cut-away, s04); s = its height when it rises back (s15)
  const half = { s: 1, drop: 0 };
  const SINK = 85;
  const BLOCK_AT = [0, 1, 2].map((i) => s.s13.start + 1.23 + i * 0.36); // the dome's blocks land (38.73, 39.09, 39.45)
  const column = { opacity: 1, front: Infinity };
  const blur = { v: 0 };
  const split = { k: 0 };
  const rise = { y: CONDUIT.y0 + 0.5, on: 0 };
  const squash = { k: 0 };
  const dome = { on: 0, grow: 0.75, bulge: 0, crack: 0, burst: 0, swell: 0, froth: 0 };
  const frag = { t: 0, on: 0 };
  const ashAt = V3(0, 0, 0); // the middle of the ash in the air (s15), for its tag
  const kental = { on: 0 };
  const shake = { k: 0 };
  const cutK = { k: 0 }; // the fall into a molecule at the end of s05

  // ── s01: Merapi at dawn, the column rising out of its crater, a pyroclastic flow down the south-east ───────────────
  // A slow drone orbit, the same speed through s01 and into the last frame, so the loop meets itself.
  const ORBIT = { az0: -13, speed: 10 / s.s01.dur, el: -1.0, dist: 150, tx: 0, ty: 17.5, tz: 0, fov: 19.5 };
  const orbitAt = (t) => camOf({ az: ORBIT.az0 + ORBIT.speed * t, el: ORBIT.el, dist: ORBIT.dist, tx: ORBIT.tx, ty: ORBIT.ty, tz: ORBIT.tz, fov: ORBIT.fov });
  const tMerapi = tag("Merapi, 2010", { at: CRATER.clone().add(V3(0, 0.6, 0)), dx: 250, dy: 40, cls: "big" });
  tMerapi.show = 1;
  hideTag(tMerapi, 3.35);
  // into the ash: the cloud closes over the lens, turns white while it covers it, and parts on Kīlauea
  tl.to(wipe, { k: 1, duration: 0.4, ease: "power1.in" }, 3.8);
  tl.to(wipe, { white: 1, duration: 0.2, ease: "none" }, 4.22);
  tl.set(wipe, { parting: 1 }, 4.44);
  tl.to(wipe, { k: 0, duration: 0.8, ease: "power1.out" }, 4.45);
  tl.set(wipe, { parting: 0, white: 0 }, 5.4);
  // the cloud is fully white for a moment where Merapi becomes Kīlauea, so the swap is never seen
  const flash = (t0, t1) => {
    tl.fromTo("#flash", { opacity: 0 }, { opacity: 1, duration: 0.13, ease: "power1.in", immediateRender: false }, t0 - 0.13);
    tl.to("#flash", { opacity: 0, duration: 0.2, ease: "power1.out" }, t1);
  };
  gsap.set("#flash", { opacity: 0 });
  flash(T_SWAP - 0.02, T_SWAP + 0.04);
  note("whoosh", 3.9, 4.6);

  // ── s02: Kīlauea: its caldera and plume, Mauna Loa behind, pāhoehoe to the sea; then the split at one scale ────────
  const KG0 = camOf({ az: 62, el: 4, dist: 165, tx: 10, ty: 9, tz: 30, fov: 38 });
  const KG1 = camOf({ az: 40, el: 11, dist: 62, tx: MU.x - 4, ty: MU.y + 1.5, tz: MU.z + 8, fov: 38 });
  cut(C, KG0, T_SWAP);
  move(C, KG1, T_SWAP + 0.3, 6.62 - T_SWAP - 0.3, "power1.inOut");
  // The split: two long lenses from 120 km, the same focal length, distance and height: 11 px per 100 m in both
  // halves, at the depth of each subject (Merapi's summit; Kīlauea's flank between the caldera and Mauna Ulu).
  const FAR = { el: -0.3, dist: 1200, ty: 12, fov: (2 * Math.atan(540 / (11 * 1200)) * 180) / Math.PI };
  const SPLIT_M = camOf({ az: 0, tx: 0, tz: 0, ...FAR });
  const SPLIT_K = camOf({ az: 0, tx: 38, tz: 55, ...FAR });
  cut(CL, SPLIT_M, 0);
  tl.to(split, { k: 1, duration: 0.45, ease: "power3.out" }, 6.67);
  move(C, SPLIT_K, 6.67, 0.62, "power2.inOut");
  note("split", 6.72);
  const tKil = tag("Kīlauea, Hawaii", { at: HMM.clone().add(V3(0, 2.5, 0)), dx: -230, dy: -120, cls: "big" });
  showTag(tKil, 4.95);
  hideTag(tKil, 6.4);
  const tLoa = tag("Mauna Loa", { at: MLOA.clone().add(V3(0, 1, 0)), dx: -120, dy: -150, cls: "small" });
  showTag(tLoa, 4.75);
  hideTag(tLoa, 5.6);
  const tVent = tag("lava <span class=\"key\">mengalir</span>", { at: MU.clone().add(V3(1, 1.2, 4)), dx: 200, dy: -110 });
  showTag(tVent, 5.75);
  hideTag(tVent, 6.42);
  const tMeledak = tag("meledak", { at: CRATER.clone().add(V3(0, 16, 0)), view: "left", dx: -170, dy: -40, cls: "big" });
  const tMengalir = tag("mengalir", { at: () => ribbons[0].mid.clone(), view: "right", dx: 120, dy: -170, cls: "big" });
  showTag(tMeledak, 6.82);
  showTag(tMengalir, 6.98);
  tl.set("#split-line", { autoAlpha: 1 }, 6.67);
  tl.fromTo("#split-line", { scaleY: 0 }, { scaleY: 1, duration: 0.45, ease: "power3.out", immediateRender: false }, 6.67);
  noteOn("#same-scale", 6.95);

  // ── s03: the question over the dimmed split ────────────────────────────────────────────────────────────────────────
  tl.to("#split-line", { autoAlpha: 0, duration: 0.15 }, s.s03.start + 0.05);
  tl.to(blur, { v: 6, duration: 0.5, ease: "power2.out" }, s.s03.start + 0.2);
  tl.to("#dim", { autoAlpha: 1, duration: 0.5 }, s.s03.start + 0.2);
  hideTag(tMeledak, s.s03.start + 0.35);
  hideTag(tMengalir, s.s03.start + 0.35);
  noteOff("#same-scale", s.s03.start + 0.35);
  tl.fromTo("#question", { autoAlpha: 0, y: 90, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.5)", immediateRender: false }, s.s03.start + 0.12);
  gsap.set("#question .qw", { opacity: 0, y: 30 });
  tl.to("#question .qw:nth-child(1), #question .qw:nth-child(2)", { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: "power3.out" }, s.s03.start + 0.14);
  tl.to("#question .qw:nth-child(3)", { opacity: 1, y: 0, duration: 0.45, ease: "back.out(2)" }, s.s03.start + 0.14 + BEAT);
  note("panel", s.s03.start + 0.4);
  note("question", s.s03.start + 0.24 + BEAT);
  // both halves keep moving, the same way, so they stay at one scale
  tl.to([C, CL], { fov: FAR.fov * 0.93, az: "-=1.5", duration: 2.5, ease: "sine.inOut" }, s.s03.start);
  tl.to("#question", { autoAlpha: 0, y: -160, duration: 0.3, ease: "power3.in" }, s.s04.start - 0.28);

  // ── s04: Merapi, cut in half: layers over basement, the conduit, the reservoir deep down (f1, f12) ────────────────
  const CUT_WIDE = camOf({ az: 0, el: 2.5, dist: 200, tx: 0, ty: 1.5, tz: 0, fov: 20 });
  tl.to("#dim", { autoAlpha: 0, duration: 0.35 }, s.s04.start - 0.2);
  tl.to(blur, { v: 0, duration: 0.35 }, s.s04.start - 0.2);
  tl.to(split, { k: 2, duration: 0.7, ease: "power2.inOut" }, s.s04.start);
  move(CL, CUT_WIDE, s.s04.start, 1.0, "power2.inOut");
  note("whoosh", s.s04.start + 0.05, s.s04.start + 0.9);
  tl.to(column, { opacity: 0, duration: 0.7, ease: "power1.in" }, s.s04.start + 0.2);
  tl.to(fogMix, { k: 1, duration: 1.0, ease: "power1.inOut" }, s.s04.start + 0.1);
  tl.set(pyro, { on: 0 }, s.s04.start + 0.95);
  tl.set(slice, { visible: true }, s.s04.start + 0.45);
  tl.fromTo(slice.position, { y: 46 }, { y: -40, duration: 0.75, ease: "power1.inOut", immediateRender: false }, s.s04.start + 0.45);
  tl.set(slice, { visible: false }, s.s04.start + 1.22);
  note("slice", s.s04.start + 0.45, s.s04.start + 1.2);
  // the near half sinks into the ground, so the cut face shows from the top down
  tl.fromTo(half, { drop: 0 }, { drop: 1, duration: 0.85, ease: "power2.in", immediateRender: false }, s.s04.start + 0.98);
  note("slide", s.s04.start + 1.05, s.s04.start + 1.8);
  noteOn("#schema", s.s04.start + 1.4);
  resBuild.p = 0;
  tl.fromTo(resBuild, { p: 0 }, { p: 1, duration: 0.7, ease: "power1.out", immediateRender: false }, s.s04.start + 1.35);
  note("assemble", s.s04.start + 1.4, s.s04.start + 2.05);
  const tKawah = tag("kawah", { at: V3(-1.5, FLOOR + 1.1, 0.2), dx: 170, dy: -60 });
  const tSaluran = tag("saluran magma", { at: V3(1.0, 8, 0.2), dx: 230, dy: -15 });
  const tMagma = tag("magma", { at: V3(8, RES.y + 0.5, 0.3), dx: 260, dy: 10 });
  showTag(tKawah, s.s04.start + 1.75);
  showTag(tSaluran, s.s04.start + 2.0);
  showTag(tMagma, s.s04.start + 2.25);
  for (const tg of [tKawah, tSaluran, tMagma]) hideTag(tg, s.s05.start - 0.33);
  move(CL, { dist: 46, ty: RES.y, tx: 0, el: 0, az: 0, fov: 20 }, s.s05.start - 0.4, 0.4, "power2.in");
  note("push", s.s05.start - 0.4, s.s05.start);

  // ── s05: inside the magma: not the heat, but gas dissolved in it (f1, f3, f5) ───────────────────────────────────────
  noteOff("#schema", s.s05.start, 0.01);
  const MELT_FAR = camOf({ az: 0, el: 0, dist: 44, tx: 0, ty: 0, tz: 0, fov: 40 });
  const MELT_NEAR = camOf({ az: 6, el: 3, dist: 25, tx: 0, ty: 0, tz: 0, fov: 40 });
  cut(C, MELT_FAR, s.s05.start);
  move(C, MELT_NEAR, s.s05.start, 1.4, "expo.out");
  tl.to(C, { az: -5, el: -1, duration: s.s05.dur - 1.85, ease: "sine.inOut" }, s.s05.start + 1.4);
  tl.set(melt, { hot: 0 }, s.s05.start);
  tl.fromTo(melt, { flow: -1, rise: 0 }, { flow: 1.2, rise: 0, duration: s.s05.dur, ease: "none", immediateRender: false }, s.s05.start);
  // "not the heat": the word struck through as the caption says it
  const tPanas = tag("panas?", { at: () => V3(-12 + melt.flow, 6.5, 2), bare: true, cls: "big" });
  const tPanasX = tag("<s>panas</s>", { at: () => V3(-12 + melt.flow, 6.5, 2), bare: true, cls: "big no" });
  tl.to(tPanas, { show: 1, duration: 0.25 }, s.s05.start + 0.2);
  tl.set(tPanas, { show: 0 }, s.s05.start + 0.75);
  tl.set(tPanasX, { show: 1 }, s.s05.start + 0.75);
  note("strike", s.s05.start + 0.75);
  hideTag(tPanasX, s.s05.start + 1.45);
  const tH2O = tag("uap air (H₂O)", { at: () => molH2O.position, dx: -200, dy: -150 });
  const tCO2 = tag("CO₂", { at: () => molCO2.position, dx: 170, dy: -120 });
  const tSO2 = tag("SO₂", { at: () => molSO2.position, dx: 170, dy: 110 });
  showTag(tH2O, s.s05.start + 1.05);
  showTag(tCO2, s.s05.start + 1.45);
  showTag(tSO2, s.s05.start + 1.85);
  for (const tg of [tH2O, tCO2, tSO2]) hideTag(tg, s.s06.start - 0.62);
  // the fall into one CO₂ molecule, which the next shot finds in the soda
  tl.fromTo(cutK, { k: 0 }, { k: 1, duration: 0.47, ease: "power2.in", immediateRender: false }, s.s06.start - 0.47);
  tl.set(cutK, { k: 0 }, s.s06.start);
  note("cut", s.s06.start);

  // ── s06: the same gas in a closed soda bottle; opened, it comes out as bubbles (f4) ────────────────────────────────
  const B0 = camOf({ az: 6, el: 11, dist: 95, tx: 14, ty: 13, tz: 0, fov: 30 });
  const B1 = camOf({ az: -4, el: 9, dist: 88, tx: 12, ty: 12.6, tz: 0, fov: 30 });
  const bOut = { k: 0 };
  tl.fromTo(bOut, { k: 0 }, { k: 1, duration: 0.9, ease: "expo.out", immediateRender: false }, s.s06.start);
  cut(C, B0, s.s06.start + 0.9);
  move(C, B1, s.s06.start + 0.95, 2.05, "sine.inOut");
  const tCap = tag("tutup rapat: <span class=\"key\">tekanan tinggi</span>", { at: () => V3(-1.4, 31.2, 0).add(bottleGroup.position), dx: -200, dy: 30 });
  const tLarut = tag("CO₂ larut", { at: () => bottleMols[3].position.clone().add(bottleGroup.position), dx: -230, dy: 40 });
  const tSama = tag("sama kayak magma", { at: () => miniRes.position.clone().add(V3(0, 3, 0)), dx: 40, dy: -150 });
  showTag(tCap, s.s06.start + 0.85);
  showTag(tLarut, s.s06.start + 1.1);
  miniResBuild.p = 0;
  tl.fromTo(miniResBuild, { p: 0 }, { p: 1, duration: 0.5, ease: "power1.out", immediateRender: false }, s.s06.start + 1.2);
  showTag(tSama, s.s06.start + 1.45);
  for (const tg of [tCap, tLarut, tSama]) hideTag(tg, s.s06.start + 2.0);
  // opened: the cap twists off, the pressure drops, and the gas comes out of the drink as bubbles
  tl.to(bottle, { open: 1, duration: 0.3, ease: "power2.in" }, s.s06.start + 2.18);
  tl.to(bottle, { open: 2, duration: 0.45, ease: "power2.out" }, s.s06.start + 2.48);
  note("capoff", s.s06.start + 2.47);
  tl.to(bottle, { fizz: 1, duration: 0.95, ease: "none" }, s.s06.start + 2.38);
  note("fizz", s.s06.start + 2.45, s.s06.start + 3.2);
  const tBuka = tag("dibuka: jadi <span class=\"key\">gelembung</span>", { at: () => V3(1.5, 15, 1).add(bottleGroup.position), dx: 230, dy: -60 });
  showTag(tBuka, s.s06.start + 2.5);
  const closedCap = [...document.querySelectorAll('.caption[data-shot="s06"]')].at(-1);
  tl.to(closedCap, { autoAlpha: 0, duration: 0.16, ease: "power1.in" }, s.s06.start + 2.22);
  hideTag(tBuka, s.s07.start - 0.3);
  // away: the bottle slides left as the camera turns down to the ground under the volcano
  tl.to(bottleGroup.position, { x: -40, duration: 0.3, ease: "power3.in" }, s.s07.start - 0.3);
  tl.to(miniRes.position, { x: -10, duration: 0.3, ease: "power3.in" }, s.s07.start - 0.3);
  tl.to(C, { el: -8, ty: 7, duration: 0.3, ease: "power2.in" }, s.s07.start - 0.3);
  note("cut", s.s07.start);

  // ── s07: the rock above presses on the reservoir: high pressure keeps the gas dissolved (f4, f12) ───────────────────
  const CUT_SW = camOf({ az: -32, el: 12, dist: 190, tx: 2, ty: -2.5, tz: 0, fov: 20 });
  cut(C, { ...CUT_SW, ty: 12, el: 16 }, s.s07.start);
  move(C, CUT_SW, s.s07.start, 0.8, "power2.out");
  move(C, { az: -15, el: 9, dist: 168 }, s.s07.start + 0.8, s.s07.dur - 0.9, "power1.inOut");
  tl.set(fogMix, { k: 1 }, s.s07.start);
  noteOn("#schema", s.s07.start);
  tl.set(resMols, { visible: false }, 0);
  tl.set(resMols, { visible: true }, s.s07.start);
  arrows.forEach((a, i) => {
    const t0 = s.s07.start + 0.7 + i * 0.32;
    tl.set(a, { visible: false }, 0);
    tl.set(a, { visible: true }, t0);
    tl.fromTo(a.position, { y: RES.y + RES.ry + 6 }, { y: RES.y + RES.ry + 0.4, duration: 0.25, ease: "power2.in", immediateRender: false }, t0);
    tl.to(squash, { k: "+=1", duration: 0.1, ease: "power2.out" }, t0 + 0.24);
    tl.to(squash, { k: "-=1", duration: 0.3, ease: "power2.out" }, t0 + 0.34);
    note("press", t0 + 0.24);
  });
  const tBatuan = tag("batuan di atasnya <span class=\"key\">menekan</span>", { at: V3(-19, RES.y + RES.ry + 8, 1.5), dx: -40, dy: -160 });
  showTag(tBatuan, s.s07.start + 0.9);
  tl.to(gauge, { show: 1, duration: 0.5, ease: "power2.out" }, s.s07.start + 1.0);
  tl.to(gauge, { v: 0.86, duration: 1.2, ease: "power2.inOut" }, s.s07.start + 1.3);
  note("gauge", s.s07.start + 1.35, s.s07.start + 2.5);
  const tLarut2 = tag("gas tetap larut", { at: () => resMols.children[2].getWorldPosition(V3(0, 0, 0)), dx: 300, dy: 110, cls: "small" });
  showTag(tLarut2, s.s07.start + 2.1);
  for (const tg of [tBatuan, tLarut2]) hideTag(tg, s.s08.start - 0.18);
  arrows.forEach((a) => tl.set(a, { visible: false }, s.s08.start));

  // ── s08: magma is lighter, so it rises up the conduit; the higher it is, the lower the pressure (f2, f4) ───────────
  // The conduit sits right of the caption; the camera cranes with the blob, bright in the dark channel.
  const CRANE0 = camOf({ az: 18, el: 3, dist: 125, tx: -8.5, ty: -8, tz: 0, fov: 18 });
  const CRANE1 = camOf({ az: 10, el: 4, dist: 125, tx: -8.5, ty: 17, tz: 0, fov: 18 });
  move(C, CRANE0, s.s08.start - 0.15, 0.6, "power2.inOut");
  // a quick first lift takes the reservoir under the caption band fast, then the crane follows the blob
  move(C, { ty: 6, el: 3.5, az: 14 }, s.s08.start + 0.45, 0.5, "power2.inOut");
  move(C, CRANE1, s.s08.start + 0.95, 1.95, "sine.inOut");
  note("crane", s.s08.start + 0.45, s.s08.start + 2.9);
  tl.set(rise, { on: 1 }, s.s08.start + 0.05);
  tl.set(rise, { on: 0 }, s.s09.start);
  [[0.25, 2.5], [1.15, 10.5], [2.05, 18.2]].forEach(([dt, y], i) => {
    tl.to(rise, { y, duration: 0.62, ease: "power2.inOut" }, s.s08.start + dt);
    tl.to(gauge, { v: [0.62, 0.4, 0.2][i], duration: 0.5, ease: "power2.inOut" }, s.s08.start + dt + 0.1);
    note("rise", s.s08.start + dt, s.s08.start + dt + 0.62);
  });
  const tRingan = tag("lebih ringan, jadi naik", { at: () => blob.position.clone().add(V3(-1.2, 0, 0)), dx: -230, dy: -60 });
  showTag(tRingan, s.s08.start + 0.55);
  hideTag(tRingan, s.s09.start - 0.4);
  tl.to(gauge, { show: 0, duration: 0.3 }, s.s09.start - 0.4);
  move(C, { dist: 9, ty: 18.2, tx: 0, az: 0, el: 0 }, s.s09.start - 0.38, 0.38, "power2.in");
  note("push", s.s09.start - 0.38, s.s09.start);
  noteOff("#schema", s.s09.start - 0.3);

  // ── s09: inside the rising blob, looking up: the gas comes out as bubbles (f4) ─────────────────────────────────────
  const MUP0 = camOf({ az: -10, el: -24, dist: 26, tx: 0, ty: -2, tz: 0, fov: 42, roll: 5 });
  const MUP1 = camOf({ az: 8, el: -17, dist: 22, tx: 0, ty: 2, tz: 0, fov: 42, roll: -3 });
  cut(C, MUP0, s.s09.start);
  move(C, MUP1, s.s09.start, s.s09.dur - 0.4, "sine.inOut");
  tl.set(melt, { hot: 1, flow: 0.4, rise: 0 }, s.s09.start);
  tl.to(melt, { rise: 3.2, duration: s.s09.dur, ease: "none" }, s.s09.start);
  sites.forEach((st, b) => {
    const t0 = s.s09.start + 0.3 + b * 0.22;
    tl.fromTo(st, { k: 0, grow: 0 }, { k: 1, duration: 0.6, ease: "power2.inOut", immediateRender: false }, t0);
    tl.fromTo(st, { grow: 0 }, { grow: 1, duration: 0.6, ease: "power2.out", immediateRender: false }, t0 + 0.5);
    note("bubble", t0 + 0.7);
  });
  tl.set(sites, { k: 0, grow: 0 }, s.s05.start);
  const tBubble = tag("<span class=\"key\">gelembung</span> gas", { at: () => sites[2].m.position.clone(), dx: 150, dy: -150 });
  showTag(tBubble, s.s09.start + 1.5);
  hideTag(tBubble, s.s10.start - 0.32);
  move(C, { dist: 44, roll: 0 }, s.s10.start - 0.37, 0.37, "power2.in");
  note("cut", s.s10.start);

  // ── s10: higher up, bigger bubbles (f5; an illustration, no numbers): pulled out of the melt into a slice ──────────
  const LAB0 = camOf({ az: 0, el: 1, dist: 13, tx: 0, ty: 21, tz: 0, fov: 34 });
  const LAB1 = camOf({ az: -4, el: 5, dist: 74, tx: 5, ty: 11.6, tz: 0, fov: 34 });
  cut(C, LAB0, s.s10.start);
  move(C, LAB1, s.s10.start, 0.95, "expo.out");
  move(C, { az: 9, el: 7.5, dist: 61, ty: 12.6 }, s.s10.start + 0.95, s.s10.dur - 0.95, "power1.inOut");
  tl.set(lab, { mode: 1 }, s.s10.start);
  BARS.forEach((b, i) => {
    const t0 = s.s10.start + 0.5 + i * 0.55;
    tl.fromTo(sizeBars[i].scale, { x: 0.001 }, { x: 1, duration: 0.45, ease: "power2.out", immediateRender: false }, t0);
    note("bar", t0 + 0.3);
  });
  const barTags = BARS.map(([name, y, len], i) => tag(i === 2 ? `<span class="key">${name}</span>` : name, { at: V3(7.2 + len / 2, y - 1.9, 0.5), bare: true, dx: 0, dy: 24, cls: "small" }));
  barTags.forEach((tg, i) => { tl.to(tg, { show: 1, duration: 0.3 }, s.s10.start + 0.7 + i * 0.55); hideTag(tg, s.s11.start); });
  noteOn("#illus", s.s10.start + 0.45);
  noteOff("#illus", s.s11.start);
  tl.to(sizeBars.map((b) => b.scale), { x: 0.001, duration: 0.35, ease: "power2.in" }, s.s11.start);
  {
    const crossings = (per, lo, hi, at) => {
      const out = [];
      bubA.forEach((m, i) => { const ph = m.userData.r + i / bubA.length; for (let k = Math.ceil(lo / per + ph - at); k <= hi / per + ph - at; k++) out.push((k + at - ph) * per); });
      return out.filter((t) => t >= lo && t <= hi).sort((a, b) => a - b);
    };
    crossings(1.9, s.s10.start + 0.4, s.s11.start - 0.2, 1).forEach((t, i) => i % 2 === 0 && note("blub", t));
    crossings(1.15, s.s11.start + 0.5, s.s12.start - 0.1, 0.965).forEach((t) => note("pop", t));
  }

  // ── s11: Hawaii's magma is runny: the gas gets out (f6, f8) ────────────────────────────────────────────────────────
  const LAB2 = camOf({ az: -6, el: 4, dist: 88, tx: 0, ty: 13.4, tz: 0, fov: 34 });
  tl.set(lab, { mode: 2 }, s.s11.start);
  tl.fromTo(lab, { split: 0 }, { split: 1, duration: 0.6, ease: "power3.inOut", immediateRender: false }, s.s11.start);
  move(C, LAB2, s.s11.start, 0.7, "power2.inOut");
  move(C, { az: 5, el: 5, dist: 84, ty: 13.6 }, s.s11.start + 0.7, s.s13.start - 0.45 - (s.s11.start + 0.7), "sine.inOut");
  tl.set(colB, { visible: false }, 0);
  tl.set(colB, { visible: true }, s.s11.start + 0.05);
  note("whoosh", s.s11.start + 0.05, s.s11.start + 0.6);
  const tEncer = tag("<span class=\"key\">encer</span> · Kīlauea", { at: () => colA.position.clone().add(V3(0, COLH + 2, 0)), bare: true, dy: -40 });
  const tKentalC = tag("kental · Merapi", { at: () => colB.position.clone().add(V3(0, COLH + 2, 0)), bare: true, dy: -40 });
  tl.to([tEncer, tKentalC], { show: 1, duration: 0.35 }, s.s11.start + 0.55);
  const tLolos = tag("gas <span class=\"key\">lolos</span>", { at: () => colA.position.clone().add(V3(-1, COLH + 6, 1)), dx: -230, dy: 10 });
  showTag(tLolos, s.s11.start + 1.9);
  hideTag(tLolos, s.s12.start + 0.3);
  tl.fromTo(gasA, { opacity: 0 }, { opacity: 1, duration: 0.5, immediateRender: false }, s.s11.start + 0.9);
  tl.to(gasA, { opacity: 0.35, duration: 0.6 }, s.s12.start + 0.2);
  tl.set(lab, { dimA: 0, dimB: 1 }, s.s11.start);

  // ── s12: thick magma traps it (f6) ─────────────────────────────────────────────────────────────────────────────────
  tl.to(lab, { dimA: 1, dimB: 0, duration: 0.55, ease: "power2.inOut" }, s.s12.start);
  note("light", s.s12.start + 0.1, s.s12.start + 0.6);
  tl.fromTo(lab, { stall: 0 }, { stall: 1, duration: 2.0, ease: "power1.out", immediateRender: false }, s.s12.start + 0.2);
  upArrows.forEach((a, i) => {
    tl.set(a, { visible: false }, 0);
    tl.set(a, { visible: true }, s.s12.start + 1.0 + i * 0.12);
    tl.fromTo(a.position, { y: COLH - 6 - (i % 2) * 0.8 }, { y: COLH - 3.4 - (i % 2) * 0.8, duration: 0.35, ease: "power3.out", immediateRender: false }, s.s12.start + 1.0 + i * 0.12);
    note("stop", s.s12.start + 1.3 + i * 0.12);
  });
  const tJebak = tag("gas <span class=\"key\">terjebak</span>", { at: () => colB.position.clone().add(V3(1.5, COLH - 2.5, 2)), dx: 190, dy: -60 });
  showTag(tJebak, s.s12.start + 1.3);
  for (const tg of [tJebak, tEncer, tKentalC]) hideTag(tg, s.s13.start - 0.33);
  move(C, { tx: 13, ty: COLH - 8.5, dist: 22, az: 0, el: 1 }, s.s13.start - 0.38, 0.38, "power2.in");
  note("push", s.s13.start - 0.38, s.s13.start);

  // ── s13: Merapi's magma is the thick kind: a lava dome plugs the crater (f9, f12) ──────────────────────────────────
  // The thick column becomes Merapi's conduit (the same red, the same bubbles), then the camera rises to the crater.
  const C13_0 = camOf({ az: 0, el: 1, dist: 24, tx: 0, ty: 21.5, tz: 0, fov: 18 });
  const CLOSE = camOf({ az: -9, el: 6, dist: 42, tx: 3.5, ty: 25.8, tz: 0, fov: 18 });
  cut(C, C13_0, s.s13.start);
  move(C, CLOSE, s.s13.start + 0.1, 1.5, "power2.inOut");
  move(C, { az: -2, el: 8, dist: 35, ty: 26.3 }, s.s13.start + 1.6, s.s13.dur - 1.6, "power1.inOut");
  note("crane", s.s13.start + 0.1, s.s13.start + 1.6);
  tl.set(fogMix, { k: 1 }, s.s13.start);
  noteOn("#schema", s.s13.start);
  tl.set(kental, { on: 1 }, s.s13.start);
  // the dome grows in three steps: with each, a block tumbles onto it and settles (the knock)
  tl.set(dome, { on: 1, grow: 0.28 }, s.s13.start);
  BLOCK_AT.forEach((t0, i) => {
    tl.to(dome, { grow: 0.28 + 0.24 * (i + 1), duration: 0.1, ease: "back.out(2.5)" }, t0 - 0.04);
    note("block", t0);
  });
  const tKubah = tag("kubah lava <span class=\"key\">menyumbat</span>", { at: V3(-0.9, FLOOR + 1.3, 0.1), dx: -260, dy: -70 });
  const tKental = tag("magma <span class=\"key\">kental</span>", { at: V3(0.7, 23.2, 0.2), dx: 240, dy: -60 });
  showTag(tKubah, s.s13.start + 2.05);
  showTag(tKental, s.s13.start + 2.4);
  hideTag(tKental, s.s14.start + 0.15);
  hideTag(tKubah, s.s14.start + 0.15);

  // ── s14: the pressure builds: the gas swells into froth under the dome; the dome bulges and cracks (f5, f6) ────────
  move(C, { az: -4, el: 6, dist: 33, ty: 26.6, tx: 2.6 }, s.s14.start, s.s14.dur, "sine.inOut");
  tl.to(gauge, { show: 1, v: 0.55, duration: 0.45, ease: "power2.out" }, s.s14.start + 0.05);
  tl.to(gauge, { v: 0.97, duration: 1.7, ease: "power1.in" }, s.s14.start + 0.5);
  for (let i = 0; i < 7; i++) note("tick", s.s14.start + 0.6 + i * 0.24 * (1 - i * 0.06));
  tl.to(dome, { swell: 1, bulge: 1, froth: 1, duration: 2.2, ease: "power1.in" }, s.s14.start + 0.1);
  tl.to(dome, { crack: 1, duration: 1.3, ease: "power1.in" }, s.s14.start + 0.8);
  note("crack", s.s14.start + 0.85, s.s14.start + 2.1);
  const tNumpuk = tag("tekanan <span class=\"key\">numpuk</span>", { at: V3(-0.6, FLOOR - 2.0, 1), dx: -260, dy: -30 });
  showTag(tNumpuk, s.s14.start + 0.55);
  hideTag(tNumpuk, s.s15.start);
  tl.to(shake, { k: 1, duration: 0.8, ease: "power1.in" }, s.s14.start + 1.7);
  tl.set(shake, { k: 0 }, s.s15.start);

  // ── s15: it bursts; the bubble walls of the froth shatter into ash (f5, f7); the mountain closes, the column climbs ─
  tl.to(dome, { burst: 1, duration: 1.8, ease: "none" }, s.s15.start);
  tl.to(gauge, { show: 0, duration: 0.15 }, s.s15.start);
  noteOff("#schema", s.s15.start + 0.2);
  note("boom", s.s15.start);
  tl.set(frag, { on: 1 }, s.s15.start);
  tl.set(frag, { on: 0 }, s.s16.start);
  tl.fromTo(frag, { t: 0 }, { t: 4, duration: 4, ease: "none", immediateRender: false }, s.s15.start);
  tl.set(shock, { visible: true }, s.s15.start + 0.05);
  tl.set(shock, { visible: false }, s.s15.start + 1.0);
  tl.fromTo(shock.scale, { x: 1.5, y: 1.5, z: 1.5 }, { x: 5, y: 5, z: 5, duration: 0.9, ease: "power2.out", immediateRender: false }, s.s15.start + 0.05);
  tl.fromTo(shock.material, { opacity: 0.5 }, { opacity: 0, duration: 0.9, ease: "power1.in", immediateRender: false }, s.s15.start + 0.05);
  const PULL = camOf({ az: -9, el: 1.5, dist: 520, tx: 0, ty: 72, tz: 0, fov: 24 });
  move(C, PULL, s.s15.start + 0.4, 3.0, "power3.inOut");
  note("pull", s.s15.start + 0.45, s.s15.start + 2.6);
  // the near half rises back out of the ground: the mountain is whole again
  // (it grows back while the camera is still near, so the mountain is whole before the wide view)
  tl.set(half, { drop: 0, s: 0 }, s.s15.start);
  tl.fromTo(half, { s: 0 }, { s: 1, duration: 0.62, ease: "power2.inOut", immediateRender: false }, s.s15.start + 0.95);
  tl.to(fogMix, { k: 0, duration: 1.8, ease: "power1.inOut" }, s.s15.start + 1.3);
  tl.set(column, { opacity: 1, front: -2 }, s.s15.start);
  tl.fromTo(column, { front: -2 }, { front: 170, duration: 2.95, ease: "power1.in", immediateRender: false }, s.s15.start + 0.7);
  tl.set(column, { front: Infinity }, s.s16.start);
  tl.set(pyro, { on: 1, front: 0 }, s.s15.start + 1.6);
  tl.to(pyro, { front: 1, duration: 2.2, ease: "power1.out" }, s.s15.start + 1.6);
  const tAbu = tag("magma hancur jadi <span class=\"key\">abu</span>", { at: () => ashAt.clone(), dx: 250, dy: 40 });
  showTag(tAbu, s.s15.start + 0.6);
  hideTag(tAbu, s.s15.start + 1.55);
  // up into the column, through the ash, out into the chart
  move(C, { ty: 110, dist: 230, el: 6 }, s.s16.start - 0.55, 0.55, "power2.in");
  tl.set(wipe, { white: 0, parting: 0 }, s.s16.start - 0.6);
  tl.to(wipe, { k: 1, duration: 0.42, ease: "power1.in" }, s.s16.start - 0.45);
  tl.to(wipe, { white: 0.85, duration: 0.15 }, s.s16.start - 0.05);
  tl.set(wipe, { parting: 1 }, s.s16.start + 0.06);
  tl.to(wipe, { k: 0, duration: 0.75, ease: "power1.out" }, s.s16.start + 0.07);
  tl.set(wipe, { parting: 0, white: 0 }, s.s16.start + 0.9);
  flash(s.s16.start - 0.07, s.s16.start + 0.03);
  note("whoosh", s.s16.start - 0.45, s.s16.start + 0.3);

  // ── s16: how high: 17 km, almost twice Everest (f9, f10) ───────────────────────────────────────────────────────────
  // Final framing: 40 px per km at the bars (tan(fov / 2) = 540 / (40 x 60)): 116, 354 and 680 px tall.
  const CH1 = camOf({ az: 0, el: 0, dist: 60, tx: 0, ty: 6.6, tz: 0, fov: (2 * Math.atan(540 / (40 * 60)) * 180) / Math.PI });
  const CH0 = { ...CH1, az: -20, tx: -6, ty: 3.6, dist: 34 };
  cut(C, CH0, s.s16.start);
  move(C, CH1, s.s16.start, s.s16.dur - 0.25, "sine.inOut");
  const BAR_AT = [47.62, 48.3, 49.0], BAR_D = [0.55, 0.55, 0.7];
  chartBars.forEach((b, i) => {
    b.build.p = 0;
    tl.fromTo(b.build, { p: 0 }, { p: 1, duration: BAR_D[i], ease: "power2.out", immediateRender: false }, BAR_AT[i]);
    note(i === 2 ? "bar-big" : "bar", BAR_AT[i] + BAR_D[i]);
  });
  const chartTags = CHART_BARS.map(([name, h, , x], i) => [
    tag(i === 2 ? `<span class="key">${["2,9 km", "8,8 km", "17 km"][i]}</span>` : ["2,9 km", "8,8 km", "17 km"][i], { at: V3(x, h, 0), bare: true, dy: -40, cls: i === 2 ? "big" : "" }),
    tag(name, { at: V3(x, 0, 2), bare: true, dy: 34, cls: "small" }),
  ]);
  chartTags.forEach(([v, n], i) => {
    tl.to(v, { show: 1, duration: 0.3 }, BAR_AT[i] + BAR_D[i]);
    tl.to(n, { show: 1, duration: 0.3 }, BAR_AT[i] + 0.1);
    hideTag(v, s.s17.start - 0.52, 0.15);
    hideTag(n, s.s17.start - 0.52, 0.15);
  });
  const tEverest = tag("hampir 2× Everest", { at: V3(8 - 2, 16.2, 0), dx: -330, dy: -10 });
  showTag(tEverest, BAR_AT[2] + BAR_D[2] + 0.1);
  hideTag(tEverest, s.s17.start - 0.52, 0.15);
  tl.to(chartFold, { k: 1, duration: 0.3, ease: "power2.in" }, s.s17.start - 0.43);
  note("cut", s.s17.start);

  // ── s17: the chain, three cards over the dawn world, each with its cause ───────────────────────────────────────────
  const RECAP = camOf({ az: -18, el: 2, dist: 175, tx: 0, ty: 15, tz: 0, fov: 22 });
  const FLY0 = camOf({ az: -11.5, el: 0.1, dist: 182, tx: 0, ty: 5.9, tz: 0, fov: 19.5 }); // where the fly-over starts (s18)
  cut(C, RECAP, s.s17.start);
  tl.to(C, { az: FLY0.az, el: FLY0.el, dist: FLY0.dist, ty: FLY0.ty, fov: FLY0.fov, duration: s.s18.start + 0.25 - s.s17.start, ease: "sine.inOut" }, s.s17.start);
  tl.set(blur, { v: 10 }, s.s17.start);
  const capWords = [50.95, 51.68, 52.4];
  ["#card1", "#card2", "#card3"].forEach((sel, i) => {
    const t0 = capWords[i] - 0.05;
    tl.fromTo(sel, { autoAlpha: 0, y: 140, x: -60, rotation: -6 }, { autoAlpha: 1, y: 0, x: 0, rotation: 0, duration: 0.6, ease: "back.out(1.4)", immediateRender: false }, t0);
    tl.set(cards, { [`k${i + 1}`]: 1 }, t0);
    note("card", t0 + 0.32);
  });
  tl.set(cards, { k1: 0, k2: 0, k3: 0 }, 0);
  tl.fromTo("#cards", { y: 0, scale: 1 }, { y: -14, scale: 1.025, duration: s.s17.dur, ease: "sine.inOut", immediateRender: false }, s.s17.start);
  tl.fromTo(cards, { burst: 0 }, { burst: 1, duration: 1.6, ease: "none", immediateRender: false }, 53.1);
  note("burst-small", 53.12);
  tl.fromTo(cards, { press: 0 }, { press: 1, duration: 3.6, ease: "none", immediateRender: false }, 51.0);

  // ── s18: the third card opens onto the plain; the camera flies over a hill into the opening picture ───────────────
  tl.to(["#card1", "#card2"], { autoAlpha: 0, y: -40, duration: 0.3, ease: "power2.in" }, s.s18.start);
  tl.to("#card3 p", { autoAlpha: 0, duration: 0.15 }, s.s18.start);
  tl.to("#card3", { x: -1280 + 710, scale: 1.8, duration: 0.5, ease: "power2.in" }, s.s18.start + 0.05);
  tl.to("#card3", { autoAlpha: 0, duration: 0.28, ease: "power1.in" }, s.s18.start + 0.3);
  tl.to(blur, { v: 0, duration: 0.5, ease: "power1.inOut" }, s.s18.start + 0.15);
  note("fly", s.s18.start + 0.4, s.s18.start + 2.0);
  const flyK = { k: 0 };
  tl.fromTo(flyK, { k: 0 }, { k: 1, duration: D - 0.45 - (s.s18.start + 0.25), ease: "sine.inOut", immediateRender: false }, s.s18.start + 0.25);
  tl.to(tMerapi, { show: 1, duration: 0.55, ease: "power2.out" }, D - 0.95);
  note("tag", D - 0.7);

  // ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // EVERY FRAME
  // ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  const cardCtx = [1, 2, 3].map((i) => $(`#card${i} canvas`).getContext("2d"));
  const CARD_CAMS = {
    CARD1: camOf({ az: 0, el: 22, dist: 30, tx: 0, ty: 0.6, tz: 0, fov: 30 }),
    CARD2: camOf({ az: 0, el: 6, dist: 62, tx: 0, ty: 15, tz: 0, fov: 34 }),
    CARD3: camOf({ az: -6, el: 5, dist: 150, tx: 0, ty: 34, tz: 0, fov: 30 }),
  };
  function showOnly(...keep) { for (const [k, g] of Object.entries(SETS)) g.visible = keep.includes(k); }
  function pass(set, palette, c, rect = { x: 0, y: 0, w: 1920, h: 1080 }, view = "main") {
    showOnly(set);
    usePalette(palette);
    // a long lens far away pushes the haze out with it, smoothly as the camera travels
    if (c.dist > 300) { scene().fog.near = Math.max(scene().fog.near, c.dist - 60); scene().fog.far = Math.max(scene().fog.far, c.dist + 1400); }
    aim(c, rect.w / rect.h);
    sky.follow(camera);
    updateWipe();
    updateGauge();
    const x = Math.max(0, rect.x), w = Math.min(1920, rect.x + rect.w) - x;
    if (w <= 0) return;
    renderer.setViewport(rect.x, 1080 - rect.y - rect.h, rect.w, rect.h);
    renderer.setScissor(x, 1080 - rect.y - rect.h, w, rect.h);
    renderer.setScissorTest(true);
    renderer.render(ctx.scene, camera);
    if (view) tags.place(view, camera, rect);
  }
  const scene = () => ctx.scene;
  const windowAt = (t) => WINDOWS.find(([a, b]) => t >= a && t < b) ?? WINDOWS.at(-1);
  const kentalCol = col("#ffffff");

  function updateMerapi(t) {
    ash.opacity = column.opacity;
    ash.front = column.front;
    // the column starts as a narrow jet of ash and swells as it climbs (no big grey blob at the vent, s15)
    ash.size = ASH_SIZE * (t > s.s15.start && t < s.s16.start ? lerp(0.4, 1, smooth(s.s15.start + 0.7, s.s15.start + 2.3, t)) : 1);
    ash.update(t);
    updatePyro(t);
    southHalf.scale.y = Math.max(half.s, 0.001);
    southHalf.position.y = -half.drop * SINK;
    southHalf.visible = half.s > 0.002 && half.drop < 0.999;
    CUTSET.visible = half.s < 0.999 || half.drop > 0.001;
    // while the near half rises back, the strip of the cut still showing above it goes into shadow (no bright seam)
    cutFace.material.color.setRGB(1, 1, 1).lerp(SEAM, t > s.s15.start ? smooth(0.0, 0.25, half.s) * smooth(110, 200, C.dist) : 0);
    for (const m of shards) if (!frag.on) m.visible = false;
    if (!CUTSET.visible && !frag.on) return;
    resBuild.update();
    reservoir.scale.set(1 + squash.k * 0.05, 1 - squash.k * 0.1, 1);
    resMols.children.forEach((m, i) => { m.rotation.z = i * 1.3 + Math.sin(t * 0.8 + i) * 0.4; m.position.x = -11.5 + i * 3.8 + Math.sin(t * 0.5 + i * 2) * 0.35; });
    kentalFill.visible = kental.on > 0.5;
    // the rising blob
    blob.visible = rise.on > 0.5;
    blob.position.set(Math.sin(t * 3.1) * 0.1, rise.y, 0.6);
    blob.children[1].rotation.set(t * 0.4, t * 0.7, 0);
    // the dome and what is under it
    DOME.visible = dome.on > 0.5;
    const bt = dome.burst * 1.8;
    const whole = DOME.visible && bt === 0;
    domeShell.visible = domeCut.visible = whole;
    DOME.scale.set(1 + dome.bulge * 0.06, dome.grow * (1 + dome.bulge * 0.25), 1 + dome.bulge * 0.06);
    cracks.forEach((m, i) => { m.visible = whole; m.geometry.setDrawRange(0, Math.floor(clamp(dome.crack * 1.6 - i * 0.2) * m.userData.n / 3) * 3); });
    settleBlocks.forEach((m, i) => {
      const t0 = BLOCK_AT[i], { x, s: sz } = m.userData;
      m.visible = whole && t >= t0 - 0.16;
      if (!m.visible) return;
      const fall = clamp((t0 - t) / 0.16);
      m.position.set(x * (1 + dome.bulge * 0.06), DOME.position.y + domeY(x) * DOME.scale.y + sz * 0.42 + fall * fall * 2.4, -0.3);
      m.rotation.set(0.4 + i, i * 1.3 + fall * 2, 0.2 + fall * 1.5);
    });
    domeBlocks.forEach((m) => {
      m.visible = DOME.visible && bt > 0 && bt < 1.7;
      if (!m.visible) return;
      const { p0, v, spin } = m.userData;
      m.position.set(p0.x + v.x * bt, p0.y + v.y * bt - 6 * bt * bt, p0.z + v.z * bt);
      m.rotation.set(spin.x * bt, spin.y * bt, spin.z * bt);
    });
    trapped.forEach((m, i) => {
      const { x, y, s0, ph } = m.userData;
      m.visible = DOME.visible && bt < 0.08;
      const sw = 1 + dome.swell * (i < 4 ? 0.8 : 0.4);
      m.position.set(x * (1 - dome.swell * 0.3) + Math.sin(t * 2.3 + ph) * 0.1, y + Math.sin(t * 1.7 + ph) * 0.12 + dome.swell * (i < 4 ? 0.4 : 0.7), 0.9);
      m.scale.setScalar(s0 * sw);
    });
    froth.forEach((m, i) => {
      const { x, y, s0, ph, at: a } = m.userData;
      m.visible = DOME.visible && bt < 0.08 && a < dome.froth;
      if (!m.visible) return;
      m.position.set(x * 0.55, y + Math.sin(t * 2 + ph) * 0.06, 1.0);
      m.scale.setScalar(s0 * (0.6 + 0.6 * smooth(a, a + 0.15, dome.froth)));
    });
    // the ash: shards of the froth's bubble walls, carried up out of the crater by the gas
    let nAsh = 0;
    ashAt.copy(CRATER).add(V3(0.5, 3, 1));
    const sum = V3(0, 0, 0);
    shards.forEach((m) => {
      const ft = frag.t - m.userData.d;
      m.visible = frag.on > 0.5 && ft > 0 && ft < 3.4;
      if (!m.visible) return;
      const { x, y, a, sp, up, s: sz, spin } = m.userData;
      const h = up * ft * (1 - ft * 0.1);
      const spread = 1 + Math.max(0, y + h - FLOOR) * 0.25;
      m.position.set(x * 0.5 + Math.cos(a) * sp * ft * spread * 0.5, y + h, 1.2 + Math.abs(Math.sin(a)) * sp * ft * 0.6);
      m.rotation.set(spin.x * ft, spin.y * ft, spin.z * ft);
      m.scale.setScalar(sz * (1 + ft * 0.3) * (1 - smooth(2.4, 3.4, ft)));
      if (ft > 0.15 && ft < 1.6) { sum.add(m.position); nAsh++; }
    });
    if (nAsh > 20) ashAt.copy(sum.multiplyScalar(1 / nAsh));
    shock.position.copy(CRATER).add(V3(0, 3, 0));
    shock.lookAt(camera.position);
  }
  function updateKil(t) {
    flowLava(t);
    sea.update(t);
    updateFountain(t);
    plumes.forEach((c) => c.update(t));
    hmmPlume.update(t);
  }
  function updateBottle(t) {
    // the cap twists, lifts off and flies away
    const o = bottle.open;
    capMesh.visible = o < 1.95;
    capMesh.rotation.set(0, -o * 3.2, o > 1 ? (o - 1) * 0.9 : 0);
    capMesh.position.set(o > 1 ? (o - 1) * 5 : 0, 31.1 + Math.min(o, 1) * 0.9 + (o > 1 ? (o - 1) * 7 : 0), 0);
    bottleMols.forEach((m, i) => {
      const { p0, rz, w } = m.userData;
      m.position.set(p0.x + Math.sin(t + p0.y) * 0.25, p0.y + Math.sin(t * 0.7 + p0.x) * 0.2, p0.z);
      m.rotation.set(0, 0, rz + w * t);
      const sc = 1 - smooth(0.05 + (i % 3) * 0.05, 0.4 + (i % 3) * 0.05, bottle.fizz);
      m.scale.setScalar(Math.max(sc, 0.001));
      m.visible = sc > 0.01;
    });
    fizz.forEach((m) => {
      const { x, y0, z, d, sp, s: sz } = m.userData;
      const tau = bottle.fizz * 0.95 - d;
      const y = y0 + sp * Math.max(0, tau) * (0.6 + tau);
      m.visible = tau > 0 && y < 22.4;
      if (!m.visible) return;
      m.position.set(x + Math.sin(tau * 9 + y0) * 0.15, y, z);
      m.scale.setScalar(sz * (0.5 + Math.min(1, tau * 3)));
    });
    miniResBuild.update();
    miniRes.rotation.y = Math.sin(t * 0.6) * 0.25;
  }
  function updateLab(t) {
    colA.position.set(-13 * lab.split, 0, 0);
    colB.position.set(13 + (1 - lab.split) * 40, 0, 0);
    colA.userData.mat.color.set("#ffffff").lerp(col("#9a8f86"), lab.dimA * 0.55);
    colA.userData.rockMat.color.set("#ffffff").lerp(col("#8b8b8b"), lab.dimA * 0.5);
    colB.userData.mat.color.set("#ffffff").lerp(col("#8a7f78"), lab.dimB * 0.55);
    colB.userData.rockMat.color.set("#ffffff").lerp(col("#8b8b8b"), lab.dimB * 0.5);
    const per = lab.mode === 1 ? 1.9 : 1.15;
    bubA.forEach((m, i) => {
      const u = (((t / per + m.userData.r + i / bubA.length) % 1) + 1) % 1;
      m.position.set(m.userData.x * (0.6 + 0.4 * u), 1.4 + u * (COLH - 2.2), 1.4);
      m.scale.setScalar((0.32 + 1.25 * Math.pow(u, 1.3)) * (lab.mode === 2 ? 1 - smooth(0.93, 1, u) : 1));
    });
    pops.forEach((p, i) => {
      const b = bubA[i];
      const u = (((t / per + b.userData.r + i / bubA.length) % 1) + 1) % 1;
      const k = smooth(0.93, 1, u);
      p.visible = lab.mode === 2 && u > 0.93;
      p.position.set(b.userData.x, COLH + 0.2, 1.6);
      p.scale.setScalar(0.6 + 1.6 * k);
      p.material.opacity = 0.9 * (1 - k);
    });
    gasA.update(t);
    spill.m.geometry.setDrawRange(0, Math.floor((spill.k * spill.n) / 3) * 3);
    bubB.forEach((m, i) => {
      const { r } = m.userData;
      const row = Math.floor(i / 3), slot = i % 3;
      const yStall = COLH - 2.6 - row * 2.4 - (slot === 1 ? 0.9 : 0);
      const y0 = 2.5 + ((i * 2.9) % (COLH - 8));
      const y = lerp(y0, Math.max(y0, yStall), ease("power2.out")(lab.stall)) + Math.sin(t * 1.4 + i) * 0.1;
      m.position.set((slot - 1) * 1.85 + (r - 0.5) * 0.4, Math.min(y, COLH - 2.2), 1.4);
      m.scale.setScalar(0.62 + 0.3 * r + lab.stall * 0.25);
    });
    sizeBars.forEach((b) => (b.visible = b.scale.x > 0.02));
  }
  function updateCards(t) {
    c1.arrow.position.y = 3.4 - 0.6 * Math.abs(Math.sin(cards.press * Math.PI * 3));
    c1.mols.forEach((m, i) => (m.rotation.z = i + t * 0.4));
    c2.bub.forEach((m, i) => {
      const u = (((t / 1.6 + i / c2.bub.length) % 1) + 1) % 1;
      m.position.set((hash(i, 4) - 0.5) * 2.6, 1.6 + u * (COLH - 3), 1.4);
      m.scale.setScalar(0.35 + 1.4 * Math.pow(u, 1.3));
    });
    const bt = cards.burst * 1.6;
    c3.blocks.forEach((b) => { const { p0, v } = b.userData; b.position.set(p0.x + v.x * bt, p0.y + v.y * bt - 9 * bt * bt, p0.z + v.z * bt); b.visible = bt < 1.4; b.rotation.set(bt * 5, bt * 3, 0); });
    c3.col.front = bt > 0 ? 70 * ease("power2.out")(clamp(bt / 1.3)) : 0;
    c3.col.update(t);
  }

  film.each((t) => {
    tags.begin();
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, 1920, 1080);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    // the cameras that are computed, not tweened: the opening orbit and its rise into the ash; the fall into a
    // molecule (s05); the pull back from one (s06); the closing fly-over
    if (t < T_SWAP) {
      Object.assign(C, orbitAt(t));
      const k = ease("power2.in")(smooth(3.45, 4.25, t));
      C.ty += 30 * k;
      C.el += 7 * k;
      C.dist -= 45 * k;
    }
    if (cutK.k > 0 && t < s.s06.start) {
      const k = cutK.k, p = molCO2.position;
      C.tx = lerp(C.tx, p.x, k); C.ty = lerp(C.ty, p.y, k); C.tz = lerp(C.tz, p.z, k);
      C.dist = lerp(C.dist, 7.5, k); C.az = lerp(C.az, 0, k); C.el = lerp(C.el, 0, k);
    }
    if (t >= s.s06.start && t < s.s06.start + 0.9) {
      const p = BMATCH.position.clone().add(bottleGroup.position);
      const close = camOf({ az: 0, el: 0, dist: 11, tx: p.x, ty: p.y, tz: p.z, fov: 30 });
      Object.assign(C, mixCam(close, B0, bOut.k));
    }
    if (t >= s.s18.start + 0.25) {
      Object.assign(C, mixCam(FLY0, orbitAt(t - D), flyK.k));
      C.el += Math.sin(Math.PI * clamp(flyK.k * 1.4)) * -0.75; // skims the hill: its crown sweeps up the lower frame and under
    }
    if (shake.k > 0) { C.az += Math.sin(t * 61) * 0.05 * shake.k; C.el += Math.sin(t * 47 + 1) * 0.04 * shake.k; }
    const [, , set, palette, cam] = windowAt(t);
    const splitOn = t >= 6.67 && t < 10.7 && split.k > 0 && split.k < 2;
    if (set === "MERAPI" || splitOn) updateMerapi(t);
    if (set === "KIL" || splitOn) updateKil(t);
    if (set === "MELT") updateMelt(t);
    if (set === "BOTTLE") updateBottle(t);
    if (set === "LAB") updateLab(t);
    if (set === "CHART") chartBars.forEach((b) => { b.build.update(); b.m.scale.y = 1 - chartFold.k * 0.999; });
    if (t >= s.s17.start && t < s.s18.start + 0.6) {
      updateCards(t);
      ["CARD1", "CARD2", "CARD3"].forEach((key, i) => {
        if (!cards[`k${i + 1}`]) return;
        pass(key, "dawn", CARD_CAMS[key], { x: 0, y: 0, w: 460, h: 400 }, null);
        cardCtx[i].clearRect(0, 0, 460, 400);
        cardCtx[i].drawImage(renderer.domElement, 0, 0, 460, 400, 0, 0, 460, 400);
        renderer.setScissorTest(false);
        renderer.clear();
      });
    }
    if (splitOn) {
      const k = split.k;
      const left = k <= 1 ? { x: -960 * (1 - k), y: 0, w: 960, h: 1080 } : { x: 0, y: 0, w: 960 * k, h: 1080 };
      const right = k <= 1 ? { x: 960 * k, y: 0, w: 1920 - 960 * k, h: 1080 } : { x: 960 * k, y: 0, w: 960 * (2 - k), h: 1080 };
      if (right.w > 1) pass("KIL", "midday", C, right, "right");
      pass("MERAPI", "dawn", CL, left, "left");
      tags.place("main", camera, left);
    } else {
      pass(set, palette, cam);
    }
    $("#space").style.filter = blur.v > 0.05 ? `blur(${blur.v.toFixed(2)}px)` : "";
    gaugeLabel.show = gauge.show;
    if (gauge.show > 0.01) {
      gaugeLabel.el.style.visibility = "visible";
      gaugeLabel.el.style.opacity = clamp(gauge.show).toFixed(3);
      gaugeLabel.el.style.transform = `translate(${gauge.x - gaugeLabel.el.offsetWidth / 2}px, ${gauge.y + gauge.r + 22}px)`;
      gaugeLabel.placed = true;
    }
    tags.end();
  });
  film.finish();
}
