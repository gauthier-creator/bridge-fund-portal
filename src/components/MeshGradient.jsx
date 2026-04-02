import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   CSS Mesh Gradient Blob — Pure DOM, no WebGL
   Smooth organic blob using layered radial-gradients + CSS animation
   Inspired by ElevenLabs onboarding intro (no canvas, no saccade)
   ═══════════════════════════════════════════════════════════════ */

export default function MeshGradient({ scale = 1, className = "" }) {
  const ref = useRef(null);
  const scaleRef = useRef(scale);

  useEffect(() => { scaleRef.current = scale; }, [scale]);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.setProperty("--blob-scale", scale);
  }, [scale]);

  return (
    <div ref={ref} className={`w-full h-full relative overflow-hidden ${className}`}>
      {/* Blob container — centered, organic shape via border-radius animation */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ "--blob-scale": scale }}
      >
        <div
          className="blob-mesh"
          style={{
            width: "min(60vw, 500px)",
            height: "min(60vw, 500px)",
            transform: `scale(var(--blob-scale, 1))`,
            transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Layer 1 — Cyan/Teal */}
          <div className="blob-layer blob-layer-1" />
          {/* Layer 2 — Green/Yellow */}
          <div className="blob-layer blob-layer-2" />
          {/* Layer 3 — Pink/Lavender */}
          <div className="blob-layer blob-layer-3" />
          {/* Layer 4 — Warm center glow */}
          <div className="blob-layer blob-layer-4" />
        </div>
      </div>
    </div>
  );
}
