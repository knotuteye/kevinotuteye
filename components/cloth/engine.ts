import { DYES, ENDS, PERIOD, type CompiledCloth } from '../../lib/kente'

/**
 * The loom: kente drawn thread by thread in one fragment shader.
 *
 * Every pixel works out which warp end and weft pick it falls on, which of the
 * two threads is on top there, and then shades that thread as a small twisted
 * cylinder: a wrap-diffuse term, an anisotropic sheen along the fibre (silk
 * and rayon catch light in streaks, not spots) and a little occlusion where it
 * dives under its neighbour. Far away the threads are too small to draw, so it
 * fades to a mipmapped colour texture, which averages them the way the eye
 * does instead of letting them shimmer.
 *
 * Over that: a slow drape (folds of hanging cloth), a dent where the pointer
 * presses, and the weaving front, above which only the bare warp is strung,
 * with a beater and a shuttle laying the next pick.
 *
 * Coordinates: the cloth is measured in threads. x runs across the strips,
 * y down the cloth. The camera puts cloth point `cam.xy` at the centre of the
 * canvas, at `cam.z` CSS pixels per thread.
 */

export const MAX_STRIPS = 16

const VERT = /* glsl */ `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uRes;
uniform float uDpr;
uniform vec3 uCam;
uniform float uTilt;
uniform float uTime;
uniform vec3 uLight;
uniform vec4 uPress;
uniform vec3 uShuttle;     // x: 0..1 across, y: direction, z: visible
uniform float uBeat;       // beater distance above the fell, threads
uniform float uSeam;
uniform int uStrips;
// Per strip: slide (y offset), top (the fell), bottom, bare warp above the top.
uniform vec4 uStrip[${MAX_STRIPS}];
uniform float uDrape;
uniform float uDim;
uniform vec4 uShadow;      // xy: offset (CSS px), z: blur (CSS px), w: strength
uniform vec3 uDyes[8];
uniform sampler2D uStruct;
uniform sampler2D uColour;

out vec4 outColor;

const float ENDS = ${ENDS}.0;
const float PERIOD = ${PERIOD}.0;
const float PI = 3.14159265;

float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x),
             mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
}

vec3 dye(float i) {
  int k = int(i + 0.5);
  vec3 c = uDyes[0];
  for (int n = 1; n < 8; n++) if (n == k) c = uDyes[n];
  return c;
}

// Height of the hanging cloth, in CSS px, and its slope. Folds run mostly
// down the cloth, the way fabric hangs from a rail.
vec3 drape(vec2 p) {
  float t = uTime * 0.35;
  vec2 a = vec2(0.0105, 0.0016), b = vec2(-0.0062, 0.0029), c = vec2(0.0171, -0.0041);
  float pa = dot(p, a) * 6.2832 + t, pb = dot(p, b) * 6.2832 - t * 0.8 + 1.7, pc = dot(p, c) * 6.2832 + t * 1.3 + 4.1;
  float h = sin(pa) * 1.0 + sin(pb) * 0.7 + sin(pc) * 0.35;
  vec2 g = cos(pa) * a * 6.2832 + cos(pb) * b * 6.2832 * 0.7 + cos(pc) * c * 6.2832 * 0.35;
  return vec3(h, g) * uDrape;
}

struct Hit { vec3 albedo; vec3 n; vec3 t; float ao; float alpha; float gloss; };

// One thread seen from above. 'across' runs over its width (-1..1), 'along'
// over one grain (-1..1). Returns its surface normal and fibre tangent.
void threadShape(float across, float along, float width, float bulge, bool vertical,
                 float twist, out vec3 n, out vec3 t, out float ao, out float cover, out float fibre) {
  float a = across / width;
  cover = 1.0 - smoothstep(0.84, 1.0, abs(a));
  float nx = clamp(a, -0.97, 0.97);
  float ny = sin(along * PI * 0.5) * bulge;
  // Plied yarn: fine diagonal ridges, plus loose fibres running along it.
  float ply = sin((across * 1.1 + along * 1.7 + twist) * 10.5);
  float hair = noise(vec2(across * 7.0 + twist * 3.0, along * 1.3 + twist));
  nx += ply * 0.07 + (hair - 0.5) * 0.12;
  fibre = 0.93 + ply * 0.05 + hair * 0.06;
  vec3 local = normalize(vec3(nx, ny, sqrt(max(0.02, 1.0 - nx * nx))));
  vec3 axis = vec3(0.0, 1.0, 0.0);
  if (vertical) {
    n = local;
  } else {
    n = vec3(local.y, local.x, local.z);
    axis = vec3(1.0, 0.0, 0.0);
  }
  t = normalize(axis - n * dot(axis, n));
  // A narrow crease where the thread dives under its neighbour.
  ao = mix(0.6, 1.0, 1.0 - pow(abs(along), 9.0)) * mix(0.62, 1.0, 1.0 - a * a * 0.7);
}

vec3 shade(vec3 albedo, vec3 n, vec3 t, float ao, float gloss, vec2 css) {
  vec3 L1 = normalize(vec3(uLight.xy - css, uLight.z));
  vec3 L2 = normalize(vec3(-0.5, -0.8, 0.9));
  vec3 V = vec3(0.0, 0.0, 1.0);
  float d1 = max(0.0, (dot(n, L1) + 0.35) / 1.35);
  float d2 = max(0.0, (dot(n, L2) + 0.35) / 1.35);
  // Kajiya-Kay: brightest where the fibre is perpendicular to the half vector.
  vec3 H1 = normalize(L1 + V), H2 = normalize(L2 + V);
  float s1 = sqrt(max(0.0, 1.0 - pow(dot(t, H1), 2.0)));
  float s2 = sqrt(max(0.0, 1.0 - pow(dot(t, H2), 2.0)));
  // Dyed silk shines in its own colour: a broad, soft streak tinted by the
  // dye, and only a thin, dim glint of white. Yarn never goes chalky.
  float spec = pow(s1, 24.0) * 0.2 + pow(s1, 6.0) * 0.08 + pow(s2, 32.0) * 0.1;
  float glint = pow(s1, 90.0) * 0.06;
  float dist = length(uLight.xy - css);
  float falloff = 1.0 / (1.0 + dist * dist / (uLight.z * uLight.z * 3.0));
  // The pointer light is a gentle lift, not a spotlight: the cloth is evenly
  // lit by the room, and the pointer only adds a little.
  vec3 c = albedo * (0.27 + d1 * 0.7 * (0.85 + falloff * 0.2) + d2 * 0.3);
  vec3 sheen = albedo * 1.2 + 0.03;
  c += (sheen * spec + vec3(1.0, 0.96, 0.88) * glint) * gloss * (0.65 + falloff * 0.35);
  // Roll highlights off above 0.8 instead of letting them clip to white.
  c = c / (1.0 + max(c - 0.8, 0.0) * 0.8);
  return c * ao;
}

// Cloth coordinates of a canvas point, without the drape or the dent.
vec2 toCloth(vec2 q) {
  vec2 c = q - uRes / uDpr * 0.5;
  float ct = cos(uTilt), st = sin(uTilt);
  c = vec2(ct * c.x - st * c.y, st * c.x + ct * c.y);
  return c / uCam.z + uCam.xy;
}

// Distance, in threads, from a cloth point to a box (negative inside).
float boxDist(vec2 p, vec2 lo, vec2 hi) {
  vec2 d = max(lo - p, p - hi);
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// The shadow the hanging cloth casts on the ground behind it: the woven
// part solid, the bare warp, which is mostly gaps, much fainter.
vec4 groundShadow(vec2 css) {
  if (uShadow.w <= 0.0) return vec4(0.0);
  vec2 p = toCloth(css - uShadow.xy);
  float pitch = ENDS + uSeam;
  float base = floor(p.x / pitch);
  float blur = uShadow.z / uCam.z;
  float a = 0.0;
  for (int k = -1; k <= 1; k++) {
    float s = base + float(k);
    if (s < 0.0 || s >= float(uStrips)) continue;
    vec4 st = uStrip[int(s)];
    float x0 = s * pitch, x1 = x0 + ENDS;
    float top = st.x + st.y, bottom = st.x + st.z;
    float fringe = st.w > 0.0 ? 0.0 : 5.0;
    float dc = boxDist(p, vec2(x0, top - fringe), vec2(x1, bottom + 5.0));
    a = max(a, 1.0 - smoothstep(-blur * 0.6, blur, dc));
    if (st.w > 0.0) {
      float dw = boxDist(p, vec2(x0, top - st.w * 0.6), vec2(x1, top));
      a = max(a, (1.0 - smoothstep(-blur * 0.6, blur, dw)) * 0.3);
    }
  }
  a *= uShadow.w;
  return vec4(vec3(0.2, 0.13, 0.05) * a, a);
}

void main() {
  vec2 css = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec2 size = uRes / uDpr;

  // Drape and the press of the pointer.
  vec3 dr = drape(css);
  vec2 d = css - uPress.xy;
  float r2 = dot(d, d) / (uPress.z * uPress.z);
  float dent = uPress.w * exp(-r2);
  vec2 grad = dr.yz + (-dent * 2.0 * d / (uPress.z * uPress.z)) * 14.0;
  vec2 q = css + dr.yz * 9.0 - d * dent * 0.18;

  // Into cloth space, with an optional tilt about the centre.
  vec2 c = q - size * 0.5;
  float ct = cos(uTilt), st = sin(uTilt);
  c = vec2(ct * c.x - st * c.y, st * c.x + ct * c.y);
  vec2 p = c / uCam.z + uCam.xy;

  float pitch = ENDS + uSeam;
  float sIdx = floor(p.x / pitch);
  float lu = p.x - sIdx * pitch;
  vec3 foldN = normalize(vec3(-grad * 2.4, 1.0));

  if (sIdx < 0.0 || sIdx >= float(uStrips) || lu >= ENDS) {
    outColor = groundShadow(css);
    return;
  }

  vec4 strip = uStrip[int(sIdx)];
  float y = p.y - strip.x;                   // along the strip, in picks
  float v = y - strip.y;                     // picks below the fell
  float len = strip.z - strip.y;
  float warpLen = strip.w;
  float i = floor(lu);
  vec2 f = vec2(lu - i, fract(v));
  float j = floor(y);
  float threadPx = uCam.z * uDpr;
  float detail = smoothstep(1.6, 4.5, threadPx);
  float salt = hash(sIdx * 97.0 + i);

  vec3 col;
  float alpha = 1.0;

  if (v >= 0.0 && v < len) {
    // ------------------------------------------------------------ woven
    float row = mod(j, PERIOD);
    vec4 st4 = texelFetch(uStruct, ivec2(int(sIdx) * int(ENDS) + int(i), int(row)), 0);
    vec3 warpC = dye(st4.r * 255.0);
    vec3 weftC = dye(st4.g * 255.0);
    bool weftTop = st4.b > 0.5;

    vec3 n, t; float ao, cover, fib;
    vec3 albedo;
    if (!weftTop) {
      float along = fract(v + 0.5 * mod(i, 2.0)) * 2.0 - 1.0;
      threadShape(f.x * 2.0 - 1.0, along, 0.95, 0.38, true, salt * 6.28 + v * 0.3, n, t, ao, cover, fib);
      albedo = mix(weftC * 0.25, warpC * fib, cover);
    } else {
      // Weft-faced: the weft packs tight and each float spans two ends.
      float along = fract(lu * 0.5 + 0.5 * mod(j, 2.0)) * 2.0 - 1.0;
      threadShape(f.y * 2.0 - 1.0, along, 0.96, 0.34, false, hash(j * 13.0 + sIdx) * 6.28 + lu * 0.3, n, t, ao, cover, fib);
      albedo = mix(warpC * 0.25, weftC * fib, cover);
    }
    // Dye is never even: a little per-thread and along-thread variation.
    float slub = noise(vec2(weftTop ? j * 3.1 : i * 3.1, (weftTop ? lu : v) * 0.18));
    albedo *= 0.9 + salt * 0.08 + slub * 0.08;
    n = normalize(n + vec3(foldN.xy, 0.0));
    vec3 near = shade(albedo, n, t, ao, 1.0, css);

    // Far: averaged colour, lit by the folds only.
    vec2 uv = vec2((sIdx * ENDS + lu) / (float(uStrips) * ENDS), y / PERIOD);
    vec2 dUV = vec2(1.0 / (uCam.z * uDpr)) / vec2(float(uStrips) * ENDS, PERIOD);
    vec3 avg = textureGrad(uColour, uv, vec2(dUV.x, 0.0), vec2(0.0, dUV.y)).rgb;
    vec3 tf = weftTop ? vec3(1, 0, 0) : vec3(0, 1, 0);
    vec3 far = shade(avg * 1.08, foldN, normalize(tf - foldN * dot(tf, foldN)), 0.92, 0.55, css);
    col = mix(far, near, detail);

    // Seams: the edge ends are darker, and sewn strips get a whip stitch.
    float edge = min(lu, ENDS - lu);
    if (uSeam < 0.6) {
      bool hasNeighbour = (lu < 1.0 && sIdx > 0.0) || (lu > ENDS - 1.0 && sIdx < float(uStrips) - 1.0);
      if (hasNeighbour) {
        col *= mix(0.45, 1.0, smoothstep(0.0, 0.6, edge));
        float k = fract(y / 3.0 + (lu < 1.0 ? lu : ENDS - lu) * 0.35);
        float stitch = (1.0 - smoothstep(0.08, 0.2, abs(k - 0.5))) * (1.0 - smoothstep(0.4, 1.0, edge));
        col = mix(col, dye(5.0) * 0.8, stitch * detail * 0.9);
      }
    }
    col *= mix(0.72, 1.0, smoothstep(0.0, 0.5, edge));
  } else if (v < 0.0 && -v < warpLen) {
    // ------------------------------------------------- the bare warp
    vec4 st4 = texelFetch(uStruct, ivec2(int(sIdx) * int(ENDS) + int(i), 0), 0);
    vec3 warpC = dye(st4.r * 255.0);
    float up = -v;
    // The shed: alternate ends lifted near the fell, pulled together further up.
    bool lifted = mod(i, 2.0) > 0.5;
    float width = mix(0.9, 0.62, smoothstep(0.0, 24.0, up));
    vec3 n, t; float ao, cover, fib;
    threadShape(f.x * 2.0 - 1.0, 0.0, width, 0.0, true, salt * 6.28 + v * 0.35, n, t, ao, cover, fib);
    vec3 albedo = warpC * fib * (0.9 + salt * 0.1) * (lifted ? 0.95 : 0.6);
    vec3 lit = shade(albedo, n, t, ao, 0.8, css);
    float fade = 1.0 - smoothstep(warpLen * 0.55, warpLen, up);
    col = lit;
    alpha = cover * fade;
    // Far away the strung warp reads as a soft haze rather than lines.
    col = mix(warpC * 0.55, col, detail);
    alpha = mix(fade * 0.6, alpha, detail);

    // The beater, a wooden reed with a tooth between every end.
    float beat = up - uBeat;
    if (uBeat > 0.0 && beat > 0.0 && beat < 1.6) {
      float tooth = 1.0 - smoothstep(0.05, 0.16, abs(f.x - 0.5) - 0.32);
      vec3 wood = vec3(0.16, 0.1, 0.06) * (0.8 + 0.4 * noise(vec2(p.x * 0.4, beat * 2.0)));
      wood += vec3(0.5, 0.36, 0.2) * pow(1.0 - abs(beat / 1.6 - 0.35) * 1.6, 6.0) * 0.5;
      col = mix(col, wood, 0.92);
      col = mix(col, vec3(0.03), tooth * 0.2);
      alpha = 1.0;
    }

    // The new pick being laid, and the shuttle that lays it.
    if (uShuttle.z > 0.5) {
      float sx = uShuttle.y > 0.0 ? uShuttle.x : 1.0 - uShuttle.x;
      float pos = mix(-6.0, ENDS + 6.0, sx);
      float laid = uShuttle.y > 0.0 ? step(lu, pos) : step(pos, lu);
      float pickY = up - 0.55;
      if (abs(pickY) < 0.42 && laid > 0.5) {
        vec4 next = texelFetch(uStruct, ivec2(int(sIdx) * int(ENDS) + int(i), int(mod(strip.y - 1.0, PERIOD))), 0);
        vec3 weftC = dye(next.g * 255.0);
        vec3 n2, t2; float ao2, cov2, fib2;
        threadShape(pickY / 0.42, fract(lu) * 2.0 - 1.0, 0.95, 0.2, false, lu * 0.6, n2, t2, ao2, cov2, fib2);
        col = mix(col, shade(weftC * fib2, n2, t2, ao2, 1.0, css), cov2);
        alpha = max(alpha, cov2);
      }
      vec2 sp = vec2((lu - pos) / 7.0, (up - 1.4) / 0.95);
      float body = 1.0 - smoothstep(0.92, 1.0, length(vec2(sp.x, sp.y * (1.0 + sp.x * sp.x * 0.6))));
      if (body > 0.0) {
        float ridge = 1.0 - abs(sp.y);
        vec3 wood = vec3(0.24, 0.13, 0.06) * (0.75 + 0.5 * noise(vec2(sp.x * 6.0, sp.y * 1.5)));
        wood += vec3(0.95, 0.75, 0.45) * pow(max(0.0, ridge), 8.0) * 0.45;
        // The bobbin window, showing the weft wound inside.
        float win = (1.0 - smoothstep(0.38, 0.45, abs(sp.x))) * (1.0 - smoothstep(0.35, 0.45, abs(sp.y)));
        vec4 next = texelFetch(uStruct, ivec2(int(sIdx) * int(ENDS) + int(clamp(i, 0.0, ENDS - 1.0)), int(mod(strip.y - 1.0, PERIOD))), 0);
        wood = mix(wood, dye(next.g * 255.0) * (0.7 + 0.3 * sin(sp.y * 40.0)), win);
        col = mix(col, wood, body);
        alpha = max(alpha, body);
      }
    }
  } else if ((v >= len && v < len + 7.0) || (warpLen <= 0.0 && v < 0.0 && v > -7.0)) {
    // ------------------------------------------------------ the fringe
    vec4 st4 = texelFetch(uStruct, ivec2(int(sIdx) * int(ENDS) + int(i), 0), 0);
    float hang = v >= len ? v - len : -v;
    float len = 3.0 + hash(sIdx * 31.0 + floor(i / 4.0)) * 4.0;
    vec3 n, t; float ao, cover, fib;
    threadShape(fract(lu / 4.0) * 2.0 - 1.0, 0.0, 0.7, 0.0, true, v, n, t, ao, cover, fib);
    col = shade(dye(st4.r * 255.0), n, t, ao, 1.0, css);
    alpha = cover * (1.0 - smoothstep(len - 1.0, len, hang));
  } else {
    outColor = groundShadow(css);
    return;
  }

  col *= uDim;
  col = pow(max(col, 0.0), vec3(0.92));
  outColor = vec4(col * alpha, alpha);
}
`

/* ------------------------------------------------------------------ */

export type StripState = { slide: number; top: number; bottom: number; warp: number }

export type ClothParams = {
  /** Cloth point at the canvas centre (threads), and CSS px per thread. */
  cam: { x: number; y: number; scale: number }
  tilt: number
  time: number
  /** Light position in CSS px from the canvas's top-left, and its height. */
  light: { x: number; y: number; z: number }
  /** Pointer press: position, radius (CSS px), strength 0..1. */
  press: { x: number; y: number; r: number; s: number }
  /**
   * Per strip, in picks: `slide` moves the whole strip; the cloth is woven from
   * `top` (the fell) down to `bottom`; `warp` is the bare warp strung above the
   * fell, 0 for a finished strip, which gets a fringe instead. Strips missing
   * from the list use `defaultStrip`.
   */
  strips: StripState[]
  defaultStrip: StripState
  shuttle: { x: number; dir: 1 | -1; visible: boolean }
  /** Beater distance above the fell; 0 hides it. */
  beat: number
  /** Gap between strips, in threads. Under 0.6 they are sewn. */
  seam: number
  drape: number
  dim: number
  /** Shadow cast on the ground: offset and blur in CSS px, strength 0..1. */
  shadow: { x: number; y: number; blur: number; strength: number }
}

export const DEFAULT_PARAMS: ClothParams = {
  cam: { x: ENDS / 2, y: 0, scale: 8 },
  tilt: 0,
  time: 0,
  light: { x: 0, y: 0, z: 520 },
  press: { x: -9999, y: -9999, r: 90, s: 0 },
  strips: [],
  defaultStrip: { slide: 0, top: -1e5, bottom: 1e5, warp: 0 },
  shuttle: { x: 0, dir: 1, visible: false },
  beat: 0,
  seam: 0,
  drape: 1,
  dim: 1,
  shadow: { x: 14, y: 26, blur: 30, strength: 0 },
}

export type ClothRenderer = {
  render(params: ClothParams): void
  /** Lowers (or raises) the pixel density cap, and resizes. */
  setMaxDpr(dpr: number): void
  /** Canvas size in CSS px, after the last resize. */
  size(): { width: number; height: number }
  resize(): void
  destroy(): void
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[loom]', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function rgb(hex: string): number[] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
}

/** Returns null when WebGL2 is unavailable, so callers can keep their fallback. */
export function createClothRenderer(
  canvas: HTMLCanvasElement,
  cloth: CompiledCloth,
  { maxDpr: initialDpr = 2 }: { maxDpr?: number } = {}
): ClothRenderer | null {
  let maxDpr = initialDpr
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    alpha: true,
    premultipliedAlpha: true,
    powerPreference: 'high-performance',
  })
  if (!gl) return null

  const vs = compile(gl, gl.VERTEX_SHADER, VERT)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null
  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[loom]', gl.getProgramInfoLog(program))
    return null
  }
  gl.useProgram(program)

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(program, 'a_pos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  const structure = gl.createTexture()
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, structure)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cloth.width, cloth.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, cloth.structure)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

  const colour = gl.createTexture()
  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, colour)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cloth.width, cloth.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, cloth.colour)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  gl.generateMipmap(gl.TEXTURE_2D)

  const loc = (name: string) => gl.getUniformLocation(program, name)
  const U = {
    res: loc('uRes'),
    dpr: loc('uDpr'),
    cam: loc('uCam'),
    tilt: loc('uTilt'),
    time: loc('uTime'),
    light: loc('uLight'),
    press: loc('uPress'),
    shuttle: loc('uShuttle'),
    beat: loc('uBeat'),
    seam: loc('uSeam'),
    strip: loc('uStrip'),
    drape: loc('uDrape'),
    dim: loc('uDim'),
    shadow: loc('uShadow'),
  }
  gl.uniform1i(loc('uStruct'), 0)
  gl.uniform1i(loc('uColour'), 1)
  gl.uniform1i(loc('uStrips'), cloth.strips)
  // Shading is done on display values, like the colour texture, so the near
  // and far views agree when the shader crossfades between them.
  gl.uniform3fv(loc('uDyes'), new Float32Array(DYES.flatMap(rgb)))

  const stripData = new Float32Array(MAX_STRIPS * 4)
  let width = 1
  let height = 1
  let lost = false

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
    width = Math.max(1, canvas.clientWidth)
    height = Math.max(1, canvas.clientHeight)
    const w = Math.round(width * dpr)
    const h = Math.round(height * dpr)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    gl.viewport(0, 0, w, h)
    gl.uniform2f(U.res, w, h)
    gl.uniform1f(U.dpr, w / width)
  }

  const onLost = (event: Event) => {
    event.preventDefault()
    lost = true
  }
  canvas.addEventListener('webglcontextlost', onLost)
  resize()

  return {
    render(p) {
      if (lost) return
      gl.uniform3f(U.cam, p.cam.x, p.cam.y, p.cam.scale)
      gl.uniform1f(U.tilt, p.tilt)
      gl.uniform1f(U.time, p.time)
      gl.uniform3f(U.light, p.light.x, p.light.y, p.light.z)
      gl.uniform4f(U.press, p.press.x, p.press.y, p.press.r, p.press.s)
      gl.uniform3f(U.shuttle, p.shuttle.x, p.shuttle.dir, p.shuttle.visible ? 1 : 0)
      gl.uniform1f(U.beat, p.beat)
      gl.uniform1f(U.seam, p.seam)
      for (let k = 0; k < MAX_STRIPS; k++) {
        const st = p.strips[k] ?? p.defaultStrip
        stripData[k * 4] = st.slide
        stripData[k * 4 + 1] = st.top
        stripData[k * 4 + 2] = st.bottom
        stripData[k * 4 + 3] = st.warp
      }
      gl.uniform4fv(U.strip, stripData)
      gl.uniform1f(U.drape, p.drape)
      gl.uniform1f(U.dim, p.dim)
      gl.uniform4f(U.shadow, p.shadow.x, p.shadow.y, p.shadow.blur, p.shadow.strength)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    size: () => ({ width, height }),
    setMaxDpr(dpr) {
      maxDpr = dpr
      resize()
    },
    resize,
    destroy() {
      canvas.removeEventListener('webglcontextlost', onLost)
      gl.deleteTexture(structure)
      gl.deleteTexture(colour)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
