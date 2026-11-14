// The storm: a shader sky and one 2D canvas for everything in the world (bolts, fronts of sound, the observer).
// Nothing here keeps time. Both layers are drawn from plain state and the film's time, so any frame can be seeked.
//
// The world is flat and to scale. You stand at x 828 and the race's bolt strikes at x 190, 3 087 m away (9 x 343),
// so 0.2067 px is a metre. Sound (343 m/s) therefore moves 70.9 px a second, and a front of sound is drawn as the
// channel's own outline pushed outward by exactly that much, in real time.
export const YOU = 828; // where you stand, all film long
export const RACE_M = 9 * 343;
export const PXM = (YOU - 190) / RACE_M;
export const SOUND = 343 * PXM;
// Light cannot be drawn at its speed (it would cross this world in a millionth of a frame). Its shell is drawn at
// 4 200 px a second, fast enough to be gone in a few frames, and the film says in figures how long it really takes.
export const LIGHT = 4200;
export const G = 1100; // the ground
export const FOOT = { x: 190, y: G }; // where the race's bolt strikes: 9 s of sound from you
export const FOOT3 = { x: YOU - 3 * 343 * PXM, y: G }; // the counted strike: 3 s away
export const FOOT1 = { x: YOU - 343 * PXM, y: G }; // the last strike: 1 s away
export const CLOUD = 400; // the cloud base
export const W = 1080;
export const H = 1920;

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const VIOLET = [169, 139, 255];
const WHITE = [244, 238, 255];
const AMBER = [255, 179, 71];
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

// ── Bolts ────────────────────────────────────────────────────────────────────
// Midpoint displacement between two points: the classic jagged channel.
function jag(a, b, rand, rough, depth) {
  let pts = [a, b];
  let amp = Math.hypot(b[0] - a[0], b[1] - a[1]) * rough;
  for (let d = 0; d < depth; d++) {
    const next = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1];
      const q = pts[i];
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const L = Math.hypot(dx, dy) || 1;
      const off = (rand() - 0.5) * amp;
      next.push([(p[0] + q[0]) / 2 - (dy / L) * off, (p[1] + q[1]) / 2 + (dx / L) * off], q);
    }
    pts = next;
    amp *= 0.56;
  }
  return pts;
}
const lengthOf = (pts) => pts.reduce((n, p, i) => (i ? n + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
// The nearest point of a channel to an observer must be its strike point, or the thunder would arrive early.
const clear = (pts, foot, margin = 10) => pts.every(([x, y]) => Math.hypot(YOU - x, G - y) >= YOU - foot[0] + (y < G - 1 ? margin : 0) - 0.01);

// free: a bolt that is only looked at (the one on the horizon), with no observer to keep clear of.
export function makeBolt(seed, top = [250, 330], foot = [FOOT.x, FOOT.y], { rough = 0.2, branches = 4, free = false, reach: far = 1 } = {}) {
  const rand = seeded(seed);
  const main = jag(top, foot, rand, rough, 6).map(([x, y]) => {
    if (free) return [x, y];
    // The last 300 px lean away from the observer, so the strike point stays the nearest part of the channel.
    // (Folded back, not clamped: a clamped channel would run down a ruler-straight line.)
    const allowed = foot[0] + Math.max(0, foot[1] - 300 - y) * 0.6;
    return [x > allowed ? allowed - (x - allowed) * 0.7 : x, y];
  });
  main[main.length - 1] = [foot[0], foot[1]];
  const twigs = [];
  for (let b = 0; b < branches; b++) {
    const at = Math.floor(main.length * (0.16 + 0.15 * b + rand() * 0.06));
    const from = main[at];
    const len = (120 + rand() * 130) * far;
    const side = b % 2 ? 1 : -1;
    const reach = 0.45 + rand() * 0.4;
    const rise = 0.6 + rand() * 0.4;
    const build = (s) => jag(from, [from[0] + s * len * reach, Math.min(foot[1] - 60, from[1] + len * rise)], seeded(seed * 31 + b * 7 + 1), 0.26, 4);
    let twig = build(side);
    if (!free && !clear(twig, foot)) twig = build(-1);
    if (free || clear(twig, foot)) twigs.push({ pts: twig, at: at / (main.length - 1) });
  }
  if (!free && !clear(main, foot, 0)) throw new Error(`bolt ${seed}: the strike point is not the nearest point to the observer`);
  // Fronts of light and sound are drawn around the main channel only: with the twigs the outline is a blot nobody
  // can read, and the twigs are kept clear of the observer so they never change when the sound arrives.
  const path = new Path2D();
  main.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
  return { main, twigs, path, length: lengthOf(main), top, foot };
}

// How bright a stroke is, t seconds after it: a return stroke, three weaker re-strikes, a short afterglow.
export function strokeLight(tau) {
  if (tau < 0) return 0;
  let sum = 0;
  for (const [at, amp] of [
    [0, 1],
    [0.11, 0.7],
    [0.21, 0.5],
    [0.34, 0.28],
  ]) {
    if (tau >= at) sum += amp * Math.exp(-(tau - at) / 0.05);
  }
  return Math.min(1, sum + 0.2 * Math.exp(-tau / 0.6));
}

// ── The sky ──────────────────────────────────────────────────────────────────
const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uT; uniform vec2 uCam; uniform float uZoom; uniform float uGround; uniform float uCloud;
uniform float uFlash; uniform vec3 uBolt; uniform vec3 uFlick; uniform float uDim; uniform float uLoop;
out vec4 o;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for(int i = 0; i < 4; i++){ s += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= .5; } return s; }
void main(){
  // The frame in its own pixels (1080 x 1920, y down), then the world the camera is looking at.
  vec2 s = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * (1080. / uRes.x);
  vec2 w = (s - vec2(540., 960.)) / uZoom + uCam;
  float up = uGround - w.y;
  // Nothing is drawn below the horizon: the stage's floor is the ground.
  float a = smoothstep(-1.5, 1.5, up * uZoom);
  float h = clamp(up / 1100., 0., 1.);
  vec3 col = mix(vec3(.105, .10, .215), vec3(.012, .014, .04), pow(h, .6));
  col += vec3(.20, .13, .36) * exp(-up / 120.) * .55;

  // The cloud deck: warped noise, solid above the base and ragged at it. Its drift is a circle, so the film loops.
  float ph = 6.2831853 * uT / uLoop;
  vec2 drift = vec2(cos(ph), sin(ph)) * .32;
  vec2 q = vec2(w.x, w.y * 1.7) / 560.;
  vec2 wp = vec2(fbm(q * 1.3 + drift), fbm(q * 1.3 + vec2(5.2, 1.3) - drift));
  float n = fbm(q + 1.6 * wp + drift * .6);
  float n2 = fbm(q * 2.6 + 2.2 * wp - drift);
  float depth = (uCloud - w.y) / 330. + (n - .5) * 1.5;
  float d = smoothstep(-.05, .45, depth);
  vec3 cloud = mix(vec3(.06, .06, .12), vec3(.30, .27, .47), smoothstep(.25, .78, n2));
  cloud += vec3(.20, .15, .34) * (1. - smoothstep(0., .55, depth)) * d;
  cloud *= .75 + .5 * smoothstep(.3, .7, n);

  // A stroke lights the clouds around its channel and, more weakly, the whole sky.
  float dist = length(vec2(w.x - uBolt.x, w.y - clamp(w.y, uBolt.y, uBolt.z)));
  float L = uFlash * (exp(-dist / 260.) + .22);
  cloud += vec3(.80, .72, 1.) * L * (.25 + 1.1 * n2);
  col += vec3(.34, .30, .60) * L * .55;
  vec2 fd = w - uFlick.xy;
  cloud += vec3(.62, .55, .95) * uFlick.z * exp(-dot(fd, fd) / 57600.) * (.3 + n2);
  col = mix(col, cloud, d);

  // Rain: thin slanted streaks under the deck, brighter in a flash.
  float u = w.x + w.y * .16;
  float r = hash(vec2(floor(u / 9.), 3.7));
  float fall = fract(w.y / 420. - uT * (1.5 + r) - r * 9.);
  float streak = smoothstep(.8, 1., fall) * step(.45, r) * smoothstep(.34, 0., abs(fract(u / 9.) - .5));
  col += vec3(.5, .5, .78) * streak * smoothstep(-80., 120., w.y - uCloud) * (.045 + .3 * uFlash);

  col *= uDim;
  o = vec4(col * a * .93, a * .93);
}`;

export function createSky(canvas) {
  const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: true });
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const at = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(at);
  gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
  const loc = Object.fromEntries(["uRes", "uT", "uCam", "uZoom", "uGround", "uCloud", "uFlash", "uBolt", "uFlick", "uDim", "uLoop"].map((n) => [n, gl.getUniformLocation(program, n)]));
  gl.viewport(0, 0, canvas.width, canvas.height);
  return {
    // s: { t, cam: {x, y, z}, ground, cloud, flash, bolt: [x, y0, y1], flick: [x, y, a], dim, loop }
    render(s) {
      gl.uniform2f(loc.uRes, canvas.width, canvas.height);
      gl.uniform1f(loc.uT, s.t);
      gl.uniform2f(loc.uCam, s.cam.x, s.cam.y);
      gl.uniform1f(loc.uZoom, s.cam.z);
      gl.uniform1f(loc.uGround, s.ground);
      gl.uniform1f(loc.uCloud, s.cloud);
      gl.uniform1f(loc.uFlash, s.flash);
      gl.uniform3f(loc.uBolt, ...s.bolt);
      gl.uniform3f(loc.uFlick, ...s.flick);
      gl.uniform1f(loc.uDim, s.dim);
      gl.uniform1f(loc.uLoop, s.loop);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

// ── The world ────────────────────────────────────────────────────────────────
export function createWorld(canvas) {
  const ctx = canvas.getContext("2d");
  // Fronts of sound are cut out of wide strokes on a canvas of their own, then laid over the scene.
  const off = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const oc = off.getContext("2d");

  const rand = seeded(23);
  const trees = [
    [-150, 74],
    [18, 92],
    [58, 60],
    [978, 84],
    [1022, 62],
    [1090, 96],
    [1220, 70],
  ];
  const farHouses = Array.from({ length: 9 }, (_, i) => ({ x: 40 + i * 118 + rand() * 60, w: 16 + rand() * 12, h: 9 + rand() * 7, tree: rand() > 0.4 }));
  const ridge = (x) => 30 + 20 * Math.sin(x / 173 + 1.3) + 13 * Math.sin(x / 71 + 0.4) + 6 * Math.sin(x / 29);
  const tuft = (x) => 3 + 2.5 * (Math.sin(x / 13) + Math.sin(x / 5.3 + 1));

  const camera = (c, target = ctx) => target.setTransform(c.z, 0, 0, c.z, W / 2 - c.x * c.z, H / 2 - c.y * c.z);

  // A line of light: wide and faint to narrow and bright, which reads as a glow once the film blooms.
  function glow(path, width, alpha, hot, colour = VIOLET) {
    ctx.lineJoin = ctx.lineCap = "round";
    for (const [w, a] of [
      [width * 9, 0.05],
      [width * 4.4, 0.13],
      [width * 2.1, 0.34],
    ]) {
      ctx.strokeStyle = rgba(colour, a * alpha);
      ctx.lineWidth = w;
      ctx.stroke(path);
    }
    ctx.strokeStyle = rgba(hot > 0.5 ? WHITE : colour, alpha);
    ctx.lineWidth = width * (1 + 0.5 * hot);
    ctx.stroke(path);
  }
  // The first part of a line, by length.
  function partial(pts, part) {
    const total = lengthOf(pts) * part;
    const path = new Path2D();
    let run = 0;
    let tip = pts[0];
    path.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (run + seg >= total) {
        const k = (total - run) / (seg || 1);
        tip = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
        path.lineTo(tip[0], tip[1]);
        return { path, tip };
      }
      path.lineTo(pts[i][0], pts[i][1]);
      run += seg;
      tip = pts[i];
    }
    return { path, tip };
  }

  // One bolt at one moment: the leader on its way down, the stroke, or what is left of it.
  function drawBolt(bolt, { tau, lead, ghost, sustain = 0, width = 3.2, z = 1 }) {
    const w = width / Math.sqrt(z);
    if (tau < 0) {
      const g = clamp(1 + tau / lead);
      if (g <= 0) return;
      const { path, tip } = partial(bolt.main, g);
      glow(path, w * 0.55, 0.5, 0);
      for (const twig of bolt.twigs) {
        if (g > twig.at) glow(partial(twig.pts, clamp((g - twig.at) / 0.3)).path, w * 0.4, 0.34, 0);
      }
      const halo = ctx.createRadialGradient(tip[0], tip[1], 0, tip[0], tip[1], 46);
      halo.addColorStop(0, rgba(WHITE, 0.9));
      halo.addColorStop(0.25, rgba(VIOLET, 0.5));
      halo.addColorStop(1, rgba(VIOLET, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(tip[0] - 46, tip[1] - 46, 92, 92);
      return;
    }
    // sustain: the close-up holds the channel white hot a little longer, so there is something to point at.
    const light = Math.max(strokeLight(tau), sustain * Math.exp(-tau / 1.6));
    const a = Math.max(light, ghost);
    if (a <= 0.004) return;
    const main = new Path2D();
    bolt.main.forEach(([x, y], i) => (i ? main.lineTo(x, y) : main.moveTo(x, y)));
    const twigs = new Path2D();
    for (const twig of bolt.twigs) twig.pts.forEach(([x, y], i) => (i ? twigs.lineTo(x, y) : twigs.moveTo(x, y)));
    glow(twigs, w * 0.5, a * 0.55, light);
    glow(main, w * (0.8 + 0.7 * light), a, light);
    if (light > 0.3) {
      // Where it meets the ground.
      const [fx, fy] = bolt.foot;
      const burst = ctx.createRadialGradient(fx, fy, 0, fx, fy, 90);
      burst.addColorStop(0, rgba(WHITE, 0.9 * light));
      burst.addColorStop(0.3, rgba(VIOLET, 0.4 * light));
      burst.addColorStop(1, rgba(VIOLET, 0));
      ctx.fillStyle = burst;
      ctx.fillRect(fx - 90, fy - 90, 180, 90);
    }
  }

  // A front of sound r px from the channel: the channel's outline pushed outward, with fainter fronts behind it.
  // Each band is a wide stroke with a slightly narrower one cut out of it, drawn from the outermost inward.
  const BANDS = [
    [0, 30, 0.2],
    [0, 7, 1],
    [34, 3, 0.36],
    [68, 2.6, 0.15],
  ];
  // The air just behind the front, still ringing: a soft haze, drawn as a pass of its own because each band cuts
  // away everything inside it.
  const HAZE = [
    [16, 32, 0.1],
    [52, 40, 0.055],
    [96, 48, 0.025],
  ];
  // Light leaves as a shell too, the same shape, but it is out of the frame within a few frames.
  const SHELL = [
    [0, 44, 0.16],
    [0, 6, 1],
  ];
  function drawFront(bolt, r, alpha, cam, groundY, cloudY, bands = BANDS, colour = AMBER) {
    if (alpha <= 0.004 || r <= 1) return;
    oc.setTransform(1, 0, 0, 1, 0, 0);
    oc.globalCompositeOperation = "source-over";
    oc.clearRect(0, 0, W, H);
    camera(cam, oc);
    oc.lineJoin = oc.lineCap = "round";
    for (const [behind, width, a] of bands) {
      const rr = r - behind;
      const half = width / cam.z / 2;
      if (rr - half <= 0.5) continue;
      oc.globalCompositeOperation = "source-over";
      oc.strokeStyle = rgba(colour, a);
      oc.lineWidth = 2 * (rr + half);
      oc.stroke(bolt.path);
      oc.globalCompositeOperation = "destination-out";
      oc.strokeStyle = "#000";
      oc.lineWidth = 2 * (rr - half);
      oc.stroke(bolt.path);
    }
    // Keep only what is above the ground, and let it fade into the cloud.
    oc.globalCompositeOperation = "destination-in";
    const fade = oc.createLinearGradient(0, cloudY - 150, 0, cloudY + 110);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(1, "rgba(0,0,0,1)");
    oc.fillStyle = fade;
    oc.fillRect(-4000, cloudY - 4000, 9000, 4000 + groundY - cloudY);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(off, 0, 0);
    ctx.restore();
  }

  // Light leaving the channel, drawn only close up: short streaks at right angles to it, evenly spaced along its
  // length, each flying outward and fading. Ordered, so that it reads as radiating and not as debris.
  const rayRand = seeded(77);
  const RAYS = Array.from({ length: 64 }, (_, i) => ({ u: 0.2 + (0.8 * (i + rayRand() * 0.6)) / 64, side: i % 2 ? 1 : -1, a: (rayRand() - 0.5) * 0.24, v: 1500 + rayRand() * 500, ph: rayRand(), len: 26 + rayRand() * 34 }));
  function drawRays(bolt, tau, alpha, z) {
    if (tau < 0 || alpha <= 0.004) return;
    const reach = 250;
    ctx.lineCap = "round";
    for (const ray of RAYS) {
      const origin = bolt.main[Math.floor(ray.u * (bolt.main.length - 1))];
      let d = tau * ray.v - ray.ph * reach;
      if (d < 0) continue;
      d %= reach;
      const dx = ray.side * Math.cos(ray.a);
      const dy = Math.sin(ray.a);
      const a = alpha * (1 - d / reach) ** 1.5;
      const x0 = origin[0] + dx * (d + 8);
      const y0 = origin[1] + dy * (d + 8);
      for (const [w, k, colour] of [
        [7, 0.18, VIOLET],
        [2.2, 0.85, WHITE],
      ]) {
        ctx.strokeStyle = rgba(colour, a * k);
        ctx.lineWidth = w / z;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + dx * ray.len, y0 + dy * ray.len);
        ctx.stroke();
      }
    }
  }

  function tree(x, h, colour) {
    ctx.fillStyle = colour;
    ctx.fillRect(x - 2, G - h * 0.45, 4, h * 0.45);
    ctx.beginPath();
    ctx.ellipse(x, G - h * 0.66, h * 0.22, h * 0.36, 0, 0, TAU);
    ctx.fill();
  }
  function land(flash, x0, x1) {
    // A far ridge, then the near edge of the ground with its grass and trees.
    ctx.fillStyle = "rgba(13,12,30,0.86)";
    ctx.beginPath();
    ctx.moveTo(x0, G + 2);
    for (let x = x0; x <= x1; x += 12) ctx.lineTo(x, G - ridge(x));
    ctx.lineTo(x1, G + 2);
    ctx.fill();
    ctx.strokeStyle = rgba(VIOLET, 0.1 + 0.5 * flash);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 12) (x === x0 ? ctx.moveTo : ctx.lineTo).call(ctx, x, G - ridge(x));
    ctx.stroke();
    for (const [x, h] of trees) tree(x, h, "#06060c");
    ctx.fillStyle = "#050509";
    ctx.beginPath();
    ctx.moveTo(x0, G + 5);
    for (let x = x0; x <= x1; x += 4) ctx.lineTo(x, G - tuft(x));
    ctx.lineTo(x1, G + 5);
    ctx.fill();
  }

  // The observer: a small standing figure, rim lit from the storm's side, shaking when the thunder arrives.
  function person(x, h, { rim = 0, hear = 0, t = 0, alpha = 1 }) {
    if (alpha <= 0.004) return;
    const s = h / 150;
    const sx = x + Math.sin(t * 58) * 2.6 * s * hear;
    const body = (dx, colour) => {
      ctx.fillStyle = colour;
      ctx.strokeStyle = colour;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(sx + dx, G - 133 * s, 14 * s, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx + dx - 15 * s, G - 112 * s);
      ctx.quadraticCurveTo(sx + dx, G - 122 * s, sx + dx + 15 * s, G - 112 * s);
      ctx.lineTo(sx + dx + 10 * s, G - 58 * s);
      ctx.lineTo(sx + dx - 10 * s, G - 58 * s);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 9 * s;
      ctx.beginPath();
      ctx.moveTo(sx + dx - 5 * s, G - 60 * s);
      ctx.lineTo(sx + dx - 9 * s, G - 3 * s);
      ctx.moveTo(sx + dx + 5 * s, G - 60 * s);
      ctx.lineTo(sx + dx + 9 * s, G - 3 * s);
      ctx.stroke();
      ctx.lineWidth = 7 * s;
      ctx.beginPath();
      ctx.moveTo(sx + dx - 14 * s, G - 108 * s);
      ctx.lineTo(sx + dx - 20 * s, G - 66 * s);
      ctx.moveTo(sx + dx + 14 * s, G - 108 * s);
      ctx.lineTo(sx + dx + 20 * s, G - 66 * s);
      ctx.stroke();
    };
    ctx.save();
    ctx.globalAlpha = alpha;
    body(-2.4 * s, rgba(rim > 0.5 ? WHITE : VIOLET, 0.3 + 0.7 * clamp(rim)));
    body(0, "#07070d");
    if (hear > 0.02) {
      // The sound at the ears.
      ctx.lineWidth = 3 * s;
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = rgba(AMBER, hear * (0.9 - i * 0.25));
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(sx + side * 6 * s, G - 133 * s, (24 + i * 11) * s, side < 0 ? Math.PI - 0.7 : -0.7, side < 0 ? Math.PI + 0.7 : 0.7);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  return {
    // v: everything the frame needs.
    //   cam {x, y, z}, pov (0 or 1), flash, dim
    //   strikes: [{ bolt, tau, lead, ghost, front (alpha), rays (alpha), far (the bolt as seen from the observer) }]
    //   ray: { a, p, from: [x, y], to: [x, y] }   the light on its way to the eye
    //   you: { a, rim, hear }
    //   ruler: { p, x0, x1 }      the distance measured along the floor, drawn from x0 as far as p says
    draw(v, t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      camera(v.cam);
      const x0 = v.cam.x - W / 2 / v.cam.z - 30;
      const x1 = v.cam.x + W / 2 / v.cam.z + 30;

      if (v.pov) {
        // Seen from where you stand: the storm on the horizon, your own head and shoulders in front.
        ctx.fillStyle = "rgba(13,12,30,0.9)";
        ctx.beginPath();
        ctx.moveTo(x0, G + 2);
        for (let x = x0; x <= x1; x += 10) ctx.lineTo(x, G - 0.6 * ridge(x * 1.7 + 300));
        ctx.lineTo(x1, G + 2);
        ctx.fill();
        for (const s of v.strikes) if (s.far) drawBolt(s.far, { tau: s.tau, lead: s.lead, ghost: s.ghost, width: 2.1, z: 1 });
        ctx.fillStyle = "#05050a";
        for (const house of farHouses) {
          ctx.fillRect(house.x, G - house.h, house.w, house.h + 3);
          ctx.beginPath();
          ctx.moveTo(house.x - 3, G - house.h);
          ctx.lineTo(house.x + house.w / 2, G - house.h - 7);
          ctx.lineTo(house.x + house.w + 3, G - house.h);
          ctx.fill();
          if (house.tree) {
            ctx.beginPath();
            ctx.ellipse(house.x + house.w + 12, G - 9, 5, 9, 0, 0, TAU);
            ctx.fill();
          }
        }
        ctx.fillRect(x0, G - 3, x1 - x0, 8);
        // You, from behind: head, neck, shoulders and the arms hanging straight down, low in the frame.
        const figure = (dx, colour) => {
          ctx.fillStyle = colour;
          ctx.beginPath();
          ctx.ellipse(790 + dx, 1096, 64, 78, 0, 0, TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(764 + dx, 1158);
          ctx.bezierCurveTo(766 + dx, 1204, 752 + dx, 1226, 706 + dx, 1238);
          ctx.bezierCurveTo(640 + dx, 1254, 612 + dx, 1296, 606 + dx, 1400);
          ctx.lineTo(598 + dx, 1960);
          ctx.lineTo(982 + dx, 1960);
          ctx.lineTo(974 + dx, 1400);
          ctx.bezierCurveTo(968 + dx, 1296, 940 + dx, 1254, 874 + dx, 1238);
          ctx.bezierCurveTo(828 + dx, 1226, 814 + dx, 1204, 816 + dx, 1158);
          ctx.fill();
        };
        figure(-4, rgba(v.flash > 0.5 ? WHITE : VIOLET, 0.16 + 0.8 * clamp(v.flash)));
        figure(0, "#05050a");
        return;
      }

      land(v.flash, x0, x1);
      for (const s of v.strikes) if (s.bolt) drawBolt(s.bolt, { tau: s.tau, lead: s.lead, ghost: s.ghost, sustain: s.sustain, z: v.cam.z });
      for (const s of v.strikes) if (s.bolt && s.rays) drawRays(s.bolt, s.tau, s.rays, v.cam.z);
      if (v.ray.a > 0.004) {
        // One ray of all that light: the one that reaches your eye.
        const { from, to, p, a } = v.ray;
        const end = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
        const path = new Path2D();
        path.moveTo(from[0], from[1]);
        path.lineTo(end[0], end[1]);
        glow(path, 2.6, a, a);
        // Light keeps arriving along it.
        ctx.fillStyle = rgba(WHITE, a);
        for (let i = 0; i < 6; i++) {
          const k = (i / 6 + t * 2.6) % 1;
          if (k > p) continue;
          ctx.beginPath();
          ctx.arc(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, 3.2, 0, TAU);
          ctx.fill();
        }
      }
      for (const s of v.strikes) {
        if (!s.bolt || !(s.front > 0) || s.tau < 0) continue;
        // A shell of light with the stroke and with each of its re-strikes, then the one front of sound.
        for (const at of [0, 0.11, 0.21, 0.34]) {
          const r = LIGHT * (s.tau - at);
          if (r > 0 && r < 1500) drawFront(s.bolt, r, s.front * (at ? 0.55 : 1) * clamp(1.15 - r / 1500), v.cam, G, v.cloud ?? CLOUD, SHELL, WHITE);
        }
        drawFront(s.bolt, SOUND * s.tau, s.front, v.cam, G, v.cloud ?? CLOUD, HAZE);
        drawFront(s.bolt, SOUND * s.tau, s.front, v.cam, G, v.cloud ?? CLOUD);
      }
      camera(v.cam);
      if (v.ruler.p > 0.002) {
        // The distance, measured along the floor: a tick every 100 m on a short ruler, every 500 m on a long one,
        // and a taller one at each kilometre.
        const { x0: a, x1: b, p } = v.ruler;
        const end = a + (b - a) * p;
        const y = G + 30 / v.cam.z;
        const k = 1 / v.cam.z;
        const metres = (b - a) / PXM;
        const step = metres > 1500 ? 500 : 100;
        ctx.strokeStyle = "rgba(244,238,255,0.92)";
        ctx.lineWidth = 3.2 * k;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(a, y);
        ctx.lineTo(end, y);
        ctx.moveTo(a, y - 13 * k);
        ctx.lineTo(a, y + 13 * k);
        if (p > 0.995) {
          ctx.moveTo(b, y - 13 * k);
          ctx.lineTo(b, y + 13 * k);
        }
        ctx.stroke();
        for (let m = step; m < metres - 1; m += step) {
          const x = a + m * PXM;
          if (x > end) break;
          const tall = m % 1000 === 0 ? 10 : 6;
          ctx.lineWidth = (m % 1000 === 0 ? 2.8 : 2) * k;
          ctx.strokeStyle = m % 1000 === 0 ? "rgba(244,238,255,0.85)" : "rgba(244,238,255,0.5)";
          ctx.beginPath();
          ctx.moveTo(x, y - tall * k);
          ctx.lineTo(x, y + tall * k);
          ctx.stroke();
        }
      }
      person(YOU, 150, { ...v.you, alpha: v.you.a, t });
    },
  };
}
