// The sky seen from the ground: one fragment shader that goes from the blue of noon to the orange of dusk.
// state: sunx suny (the Sun in the frame, 0..1 from the bottom left), dusk (0 noon .. 1 sunset), lit (0 a dark sky
// before the light has spread .. 1 the whole dome), t.
const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform vec2 uSun; uniform float uDusk; uniform float uLit; uniform float uT;
out vec4 o;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for(int i = 0; i < 5; i++){ s += a * noise(p); p = p * 2.03 + 11.7; a *= .5; } return s; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = vec2(uv.x * uRes.x / uRes.y, uv.y);
  vec2 sun = vec2(uSun.x * uRes.x / uRes.y, uSun.y);
  float ground = .185 + .035 * fbm(vec2(uv.x * 3.2, 4.)) + .012 * noise(vec2(uv.x * 22., 9.));
  float h = clamp((uv.y - ground) / (1. - ground), 0., 1.);
  // Noon: deep blue overhead, paler toward the horizon, because that light crossed more air.
  vec3 noon = mix(vec3(.66, .84, 1.), vec3(.06, .3, .8), pow(h, .62));
  // Dusk: what is left after the long road, layered from the horizon up.
  vec3 dusk = mix(vec3(1., .44, .12), vec3(.86, .3, .3), smoothstep(0., .22, h));
  dusk = mix(dusk, vec3(.3, .2, .46), smoothstep(.16, .52, h));
  dusk = mix(dusk, vec3(.03, .06, .2), smoothstep(.42, 1., h));
  vec3 sky = mix(noon, dusk, uDusk);
  float d = length(p - sun);
  vec3 sunCol = mix(vec3(1., .98, .9), vec3(1., .5, .16), uDusk);
  sky += sunCol * (.9 * exp(-d * d * 60.) + .3 * exp(-d * 6.5) * (1. + uDusk));
  sky = mix(sky, sunCol * 1.6, smoothstep(.058, .05, d));
  // Thin cloud streaks catch the low light.
  float streak = smoothstep(.56, .8, fbm(vec2(uv.x * 2.4 + uT * .01, uv.y * 13.))) * smoothstep(.05, .4, h) * (1. - smoothstep(.45, .8, h));
  sky += mix(vec3(.25), vec3(1., .5, .25) * .5, uDusk) * streak * (.25 + .5 * uDusk);
  // Before the light has spread, the sky is the stage's dark; it fills outward from the Sun.
  float spread = smoothstep(uLit * 2.6, uLit * 2.6 - .7, d);
  sky = mix(vec3(.03, .035, .05), sky, clamp(spread, 0., 1.) * step(.001, uLit));
  // The land is a silhouette with a thin lit edge.
  float land = smoothstep(ground + .002, ground - .002, uv.y);
  vec3 earth = mix(vec3(.012, .014, .02), vec3(.03, .02, .02), uDusk) + sunCol * .05 * exp(-abs(uv.x - uSun.x) * 4.) * smoothstep(ground - .06, ground, uv.y);
  vec3 col = mix(sky, earth, land);
  col += (hash(gl_FragCoord.xy + uT) - .5) * 2. / 255.;
  o = vec4(col, 1.);
}`;

export function createSky(canvas) {
  const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true });
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
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const at = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(at);
  gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
  const loc = Object.fromEntries(["uRes", "uSun", "uDusk", "uLit", "uT"].map((n) => [n, gl.getUniformLocation(program, n)]));
  gl.viewport(0, 0, canvas.width, canvas.height);
  let blank = true;
  return {
    render(s, t) {
      canvas.style.opacity = s.vis;
      if (s.vis <= 0.001) {
        blank = true;
        return;
      }
      blank = false;
      gl.uniform2f(loc.uRes, canvas.width, canvas.height);
      gl.uniform2f(loc.uSun, s.sunx, s.suny);
      gl.uniform1f(loc.uDusk, s.dusk);
      gl.uniform1f(loc.uLit, s.lit);
      gl.uniform1f(loc.uT, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    get blank() {
      return blank;
    },
  };
}
