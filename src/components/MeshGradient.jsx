import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   WebGL Mesh Gradient — Organic animated blob
   Lightweight custom shader (~3KB), no dependencies
   Produces the same organic gradient blob as ElevenLabs intro
   ═══════════════════════════════════════════════════════════════ */

const VERTEX_SHADER = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_scale;
  uniform float u_opacity;

  // Simplex-like noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 center = vec2(0.5);
    float t = u_time * 0.15;

    // Distance from center for blob shape
    float dist = length((uv - center) * vec2(u_resolution.x / u_resolution.y, 1.0));

    // Organic blob boundary with noise
    float blobRadius = 0.35 * u_scale;
    float noiseVal = snoise(uv * 3.0 + t) * 0.12;
    float noiseVal2 = snoise(uv * 2.0 - t * 0.7) * 0.08;
    float blob = smoothstep(blobRadius + noiseVal + noiseVal2, blobRadius * 0.3, dist);

    // Color mixing with flowing noise
    float n1 = snoise(uv * 2.5 + vec2(t * 0.8, t * 0.6)) * 0.5 + 0.5;
    float n2 = snoise(uv * 1.8 + vec2(-t * 0.5, t * 0.9)) * 0.5 + 0.5;
    float n3 = snoise(uv * 3.2 + vec2(t * 0.3, -t * 0.4)) * 0.5 + 0.5;

    // ElevenLabs colors: cyan, green, pink, yellow, violet
    vec3 cyan   = vec3(0.18, 0.83, 0.75);  // #2DD4BF
    vec3 green  = vec3(0.29, 0.87, 0.50);  // #4ADE80
    vec3 pink   = vec3(0.96, 0.45, 0.71);  // #F472B6
    vec3 yellow = vec3(0.98, 0.75, 0.14);  // #FBBF24
    vec3 violet = vec3(0.65, 0.55, 0.98);  // #A78BFA

    vec3 color = mix(cyan, green, n1);
    color = mix(color, pink, n2 * 0.6);
    color = mix(color, yellow, n3 * 0.35);
    color = mix(color, violet, (1.0 - n1) * n2 * 0.4);

    // Lighten the colors (pastel feel)
    color = mix(vec3(1.0), color, 0.6);

    // Apply blob mask with soft edge
    float alpha = blob * u_opacity;

    gl_FragColor = vec4(color, alpha);
  }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vs, fs) {
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

export default function MeshGradient({ scale = 1, opacity = 1, className = "" }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    // Shaders
    const vs = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = createProgram(gl, vs, fs);
    if (!program) return;

    // Full-screen quad
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "a_position");
    const timeLoc = gl.getUniformLocation(program, "u_time");
    const resLoc = gl.getUniformLocation(program, "u_resolution");
    const scaleLoc = gl.getUniformLocation(program, "u_scale");
    const opacityLoc = gl.getUniformLocation(program, "u_opacity");

    // Resize handler
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    // Animation loop
    const render = () => {
      const time = (Date.now() - startTime.current) / 1000;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1f(timeLoc, time);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(scaleLoc, scale);
      gl.uniform1f(opacityLoc, opacity);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [scale, opacity]);

  return (
    <canvas ref={canvasRef} className={`w-full h-full ${className}`}
      style={{ display: "block" }} />
  );
}
