import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   WebGL Mesh Gradient v2 — Smooth organic blob
   Inspired by Stripe's gradient + ElevenLabs' pastel blob
   Smooth FBM noise, proper color blending, no saccade
   ═══════════════════════════════════════════════════════════════ */

const VS = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0,1);}`;

const FS = `
precision highp float;
uniform float u_t;
uniform vec2 u_res;
uniform float u_scale;

// --- Smooth value noise (no harsh edges) ---
vec2 hash(vec2 p) {
  p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f); // smoothstep
  return mix(
    mix(dot(hash(i), f), dot(hash(i + vec2(1,0)), f - vec2(1,0)), u.x),
    mix(dot(hash(i + vec2(0,1)), f - vec2(0,1)), dot(hash(i + vec2(1,1)), f - vec2(1,1)), u.x),
    u.y
  );
}

// --- FBM: layered noise for organic movement ---
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = rot * p * 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  float t = u_t * 0.08; // Very slow movement

  // Organic blob shape using FBM
  float blobBase = 0.32 * u_scale;
  float distortion = fbm(p * 2.5 + t) * 0.15 + fbm(p * 1.5 - t * 0.7) * 0.1;
  float dist = length(p);
  float blob = 1.0 - smoothstep(blobBase * 0.4 + distortion, blobBase + distortion, dist);

  // Color channels — soft pastel blending via noise
  float n1 = fbm(p * 1.8 + vec2(t, t * 0.6)) * 0.5 + 0.5;
  float n2 = fbm(p * 2.2 + vec2(-t * 0.5, t)) * 0.5 + 0.5;
  float n3 = fbm(p * 1.5 + vec2(t * 0.8, -t * 0.4)) * 0.5 + 0.5;

  // ElevenLabs exact palette (sampled from screenshots)
  vec3 c1 = vec3(0.29, 0.90, 0.85); // Cyan-teal #4AE6D9
  vec3 c2 = vec3(0.45, 0.92, 0.55); // Green #73EB8C
  vec3 c3 = vec3(0.95, 0.68, 0.82); // Soft pink #F2ADD1
  vec3 c4 = vec3(0.95, 0.88, 0.50); // Warm yellow #F2E080
  vec3 c5 = vec3(0.72, 0.62, 0.95); // Lavender #B89EF2

  // Smooth blending between colors
  vec3 color = c1;
  color = mix(color, c2, smoothstep(0.3, 0.7, n1));
  color = mix(color, c3, smoothstep(0.4, 0.8, n2) * 0.7);
  color = mix(color, c4, smoothstep(0.3, 0.6, n3) * 0.5);
  color = mix(color, c5, smoothstep(0.5, 0.9, 1.0 - n1 * n2) * 0.4);

  // Lighten toward white for pastel feel (match ElevenLabs' lightness)
  color = mix(vec3(1.0), color, 0.55);

  // Soft inner glow — slightly brighter at center
  float glow = 1.0 - smoothstep(0.0, blobBase * 0.8, dist) * 0.15;
  color *= glow;

  gl_FragColor = vec4(color, blob);
}
`;

function initGL(canvas, scaleRef) {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: true });
  if (!gl) return null;

  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, VS); gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, FS); gl.compileShader(fs);

  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.error("FS error:", gl.getShaderInfoLog(fs));
    return null;
  }

  const prg = gl.createProgram();
  gl.attachShader(prg, vs); gl.attachShader(prg, fs);
  gl.linkProgram(prg);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prg, "a_pos");
  const uT = gl.getUniformLocation(prg, "u_t");
  const uRes = gl.getUniformLocation(prg, "u_res");
  const uScale = gl.getUniformLocation(prg, "u_scale");

  const t0 = performance.now();
  let raf;

  const render = () => {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(prg);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(uT, (performance.now() - t0) / 1000);
    gl.uniform2f(uRes, w, h);
    gl.uniform1f(uScale, scaleRef.current);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    raf = requestAnimationFrame(render);
  };

  render();
  return () => cancelAnimationFrame(raf);
}

export default function MeshGradient({ scale = 1, className = "" }) {
  const canvasRef = useRef(null);
  const scaleRef = useRef(scale);

  useEffect(() => { scaleRef.current = scale; }, [scale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cleanup = initGL(canvas, scaleRef);
    return cleanup || undefined;
  }, []);

  return <canvas ref={canvasRef} className={`w-full h-full ${className}`} style={{ display: "block" }} />;
}
