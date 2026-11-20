import { colors } from '../../Theme'
import { PERIOD_UNITS, THREADS, type Strip } from '../../lib/weave'

/**
 * The weave as one full-quad fragment shader.
 *
 * The CSS weave costs one DOM node per cell. This draws the same cloth in a
 * single draw call, and because colour is decided per frame it can do what the
 * CSS cannot: re-thread cells from gold to indigo as you scroll, and let a
 * strip slide under the pointer like a thread being pulled.
 *
 * The cell model is uploaded once as a strips x rows RGBA texture:
 *   R = warm thread index, G = cool thread index, B = r (0..255)
 * Kinds and heights are not stored: they follow from strip parity, exactly as
 * in lib/weave.ts, which keeps the two renderers from drifting apart.
 */

const MAX_STRIPS = 32

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG = `
precision highp float;

uniform vec2 u_res;
uniform float u_dpr;
uniform float u_n;
uniform float u_rows;
uniform float u_unit;
uniform float u_gap;
uniform float u_from;
uniform float u_to;
uniform float u_shift;
uniform vec3 u_threads[6];
uniform vec4 u_pull[${MAX_STRIPS / 4}];
uniform sampler2D u_cells;

const vec3 INK = vec3(${hex(colors.ink)});
const vec3 COTTON = vec3(${hex(colors.cotton)});

vec3 thread(float index) {
  vec3 c = INK;
  for (int k = 0; k < 6; k++) {
    if (abs(float(k) - index) < 0.5) c = u_threads[k];
  }
  return c;
}

// Packed four to a vec4: WebGL 1 only guarantees 16 fragment uniform vectors.
float pull(float strip) {
  float p = 0.0;
  for (int k = 0; k < ${MAX_STRIPS / 4}; k++) {
    vec4 v = u_pull[k];
    float d = strip - float(k) * 4.0;
    if (abs(d) < 0.5) p = v.x;
    else if (abs(d - 1.0) < 0.5) p = v.y;
    else if (abs(d - 2.0) < 0.5) p = v.z;
    else if (abs(d - 3.0) < 0.5) p = v.w;
  }
  return p;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_dpr;
  float width = u_res.x / u_dpr;
  float stripW = (width - u_gap * (u_n - 1.0)) / u_n;
  float pitch = stripW + u_gap;

  float i = floor(p.x / pitch);
  float lx = p.x - i * pitch;
  if (lx > stripW || i >= u_n) { gl_FragColor = vec4(INK, 1.0); return; }

  bool odd = mod(i, 2.0) > 0.5;
  float period = ${PERIOD_UNITS}.0 * u_unit;
  float cloth = (u_rows / 6.0) * period;
  float y = mod(p.y + (odd ? u_unit : 0.0) - pull(i), cloth);

  float q = floor(y / period);
  float w = mod(y, period) / u_unit;

  // Cell index, start (units) and kind within one 15-unit period.
  // Even: warp 3, weft 2, warp 3, check 2, warp 3, solid 2.
  // Odd:  check 2, warp 3, solid 2, warp 3, weft 2, warp 3.
  float idx; float start; float kind;
  if (!odd) {
    if (w < 3.0)       { idx = 0.0; start = 0.0;  kind = 0.0; }
    else if (w < 5.0)  { idx = 1.0; start = 3.0;  kind = 1.0; }
    else if (w < 8.0)  { idx = 2.0; start = 5.0;  kind = 0.0; }
    else if (w < 10.0) { idx = 3.0; start = 8.0;  kind = 2.0; }
    else if (w < 13.0) { idx = 4.0; start = 10.0; kind = 0.0; }
    else               { idx = 5.0; start = 13.0; kind = 3.0; }
  } else {
    if (w < 2.0)       { idx = 0.0; start = 0.0;  kind = 2.0; }
    else if (w < 5.0)  { idx = 1.0; start = 2.0;  kind = 0.0; }
    else if (w < 7.0)  { idx = 2.0; start = 5.0;  kind = 3.0; }
    else if (w < 10.0) { idx = 3.0; start = 7.0;  kind = 0.0; }
    else if (w < 12.0) { idx = 4.0; start = 10.0; kind = 1.0; }
    else               { idx = 5.0; start = 12.0; kind = 0.0; }
  }
  float ly = (w - start) * u_unit;
  float row = mod(q * 6.0 + idx, u_rows);

  vec4 cell = texture2D(u_cells, vec2((i + 0.5) / u_n, (row + 0.5) / u_rows)) * 255.0;
  float warmth = (u_n > 1.0 ? mix(u_from, u_to, i / (u_n - 1.0)) : u_from) + u_shift;
  float r = cell.b / 255.0;
  vec3 a = thread(r < warmth ? cell.g : cell.r);

  vec3 c = a;
  if (kind < 0.5) {
    float m = mod(lx, 10.0);
    c = m < 3.0 ? a : (m < 5.0 ? INK : (m < 9.0 ? a : COTTON));
  } else if (kind < 1.5) {
    c = mod(ly, 8.0) < 5.0 ? a : INK;
  } else if (kind < 2.5) {
    bool right = mod(lx, 10.0) >= 5.0;
    bool lower = mod(ly, 10.0) >= 5.0;
    c = right != lower ? a : INK;
  }
  gl_FragColor = vec4(c, 1.0);
}
`

function hex(value: string): string {
  const n = parseInt(value.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => (v / 255).toFixed(4))
    .join(', ')
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[weave]', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export type WeaveOptions = {
  from: number
  to: number
  unit: number
  gap: number
}

export type WeaveRenderer = {
  /** Shifts every strip toward indigo (positive) or gold (negative). */
  setShift(shift: number): void
  /** Pulls one strip by `px` (others ease back to rest), or none with null. */
  setPull(strip: number | null, px: number): void
  resize(): void
  destroy(): void
}

export function createWeaveRenderer(
  canvas: HTMLCanvasElement,
  cloth: Strip[],
  options: WeaveOptions,
  onFirstFrame: () => void
): WeaveRenderer | null {
  const gl = canvas.getContext('webgl', {
    antialias: false,
    alpha: false,
    powerPreference: 'low-power',
    preserveDrawingBuffer: false,
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
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
  gl.useProgram(program)

  // One triangle that covers the viewport.
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(program, 'a_pos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const n = Math.min(cloth.length, MAX_STRIPS)
  const rows = cloth[0]?.length ?? 6
  const data = new Uint8Array(n * rows * 4)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < n; i++) {
      const cell = cloth[i][j]
      const o = (j * n + i) * 4
      data[o] = cell.warm
      data[o + 1] = cell.cool
      data[o + 2] = Math.round(cell.r * 255)
      data[o + 3] = 255
    }
  }
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, n, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  const u = (name: string) => gl.getUniformLocation(program, name)
  const uRes = u('u_res')
  const uDpr = u('u_dpr')
  const uShift = u('u_shift')
  const uPull = u('u_pull')
  gl.uniform1f(u('u_n'), n)
  gl.uniform1f(u('u_rows'), rows)
  gl.uniform1f(u('u_unit'), options.unit)
  gl.uniform1f(u('u_gap'), options.gap)
  gl.uniform1f(u('u_from'), options.from)
  gl.uniform1f(u('u_to'), options.to)
  gl.uniform1i(u('u_cells'), 0)
  gl.uniform3fv(
    u('u_threads'),
    new Float32Array(
      THREADS.flatMap((c) => {
        const v = parseInt(c.slice(1), 16)
        return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
      })
    )
  )

  const pull = new Float32Array(MAX_STRIPS)
  const target = new Float32Array(MAX_STRIPS)
  let shift = 0
  let frame = 0
  let first = true
  let lost = false

  const draw = () => {
    frame = 0
    if (lost) return
    let moving = false
    for (let k = 0; k < n; k++) {
      const d = target[k] - pull[k]
      if (Math.abs(d) > 0.1) {
        pull[k] += d * 0.14
        moving = true
      } else {
        pull[k] = target[k]
      }
    }
    gl.uniform1f(uShift, shift)
    gl.uniform4fv(uPull, pull)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    if (first) {
      first = false
      onFirstFrame()
    }
    if (moving) request()
  }

  const request = () => {
    if (!frame) frame = requestAnimationFrame(draw)
  }

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    gl.viewport(0, 0, width, height)
    gl.uniform2f(uRes, width, height)
    gl.uniform1f(uDpr, width / Math.max(1, canvas.clientWidth))
    request()
  }

  const onLost = (event: Event) => {
    event.preventDefault()
    lost = true
  }
  canvas.addEventListener('webglcontextlost', onLost)

  resize()

  return {
    setShift(next) {
      if (Math.abs(next - shift) < 0.002) return
      shift = next
      request()
    },
    setPull(strip, px) {
      for (let k = 0; k < MAX_STRIPS; k++) {
        target[k] = k === strip ? (k % 2 ? px : -px) : 0
      }
      request()
    },
    resize,
    destroy() {
      if (frame) cancelAnimationFrame(frame)
      canvas.removeEventListener('webglcontextlost', onLost)
      gl.deleteTexture(texture)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      // Browsers cap live contexts (Chrome: 16) and drop the oldest past it,
      // so release this one now rather than waiting for garbage collection.
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
