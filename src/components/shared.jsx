import { useState, useCallback, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════
   BRIDGE FUND — Shared UI Primitives v2
   Linear/Vercel/Mercury-grade components
   ═══════════════════════════════════════════════════ */

/* ── Toast ── */
export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5">
      {toasts.map((t) => (
        <div key={t.id} onClick={() => onDismiss(t.id)}
          className="flex items-center gap-3 bg-[#0A0A0A] text-white pl-3 pr-4 py-3 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] max-w-sm text-[13px] font-medium cursor-pointer"
          style={{ animation: "slideIn 0.2s var(--ease-out) forwards" }}>
          <div className="w-4.5 h-4.5 rounded-full bg-[#00A67E] flex items-center justify-center flex-shrink-0">
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  const dismiss = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  return { toasts, toast, dismiss };
}

/* ── Animated Counter ── */
export function useCountUp(end, duration = 800, decimals = 0) {
  const [value, setValue] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const startVal = prevRef.current;
    const endVal = typeof end === "number" ? end : parseFloat(end) || 0;
    if (startVal === endVal) return;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(startVal + (endVal - startVal) * eased);
      if (progress < 1) requestAnimationFrame(animate);
      else prevRef.current = endVal;
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return decimals > 0 ? value.toFixed(decimals) : Math.round(value);
}

/* ── Intersection Observer ── */
export function useInView(options = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rafId = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 100 && rect.bottom > -100) { setIsInView(true); return; }
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { setIsInView(true); observer.unobserve(el); } },
        { threshold: 0.01, rootMargin: "200px 0px", ...options }
      );
      observer.observe(el);
      el._observer = observer;
    });
    return () => { cancelAnimationFrame(rafId); if (el._observer) { el._observer.disconnect(); delete el._observer; } };
  }, []);
  return [ref, isInView];
}

/* ── KPI Card — ElevenLabs style (soft bg, warm) ── */
export function KPICard({ label, value, sub, trend, delay = 0 }) {
  return (
    <div className="bg-white border border-[rgba(0,0,29,0.1)] rounded-2xl p-5"
      style={delay > 0 ? { animation: `fadeInUp 0.3s var(--ease-out) ${delay}ms both` } : undefined}>
      <p className="text-[13px] text-[#787881] mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-[22px] font-semibold text-[#0F0F10] tracking-[-0.02em] tabular-nums">{value}</p>
        {trend && (
          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${trend > 0 ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#FEF2F2] text-[#DC2626]"}`}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      {sub && <p className="text-[12px] text-[#787881] mt-1.5">{sub}</p>}
    </div>
  );
}

/* ── Badge — Dot + text, pill shape ── */
export function Badge({ status }) {
  const config = {
    "Validé":      { dot: "#059669", bg: "#ECFDF5", text: "#059669" },
    "Actif":       { dot: "#059669", bg: "#ECFDF5", text: "#059669" },
    "Reçu":        { dot: "#059669", bg: "#ECFDF5", text: "#059669" },
    "Approuvé":    { dot: "#059669", bg: "#ECFDF5", text: "#059669" },
    "En attente":  { dot: "#D97706", bg: "#FFFBEB", text: "#92400E" },
    "Pending":     { dot: "#D97706", bg: "#FFFBEB", text: "#92400E" },
    "Envoyé":      { dot: "#635BFF", bg: "#F0EFFF", text: "#4338CA" },
    "En transfert":{ dot: "#635BFF", bg: "#F0EFFF", text: "#4338CA" },
    "Rejeté":      { dot: "#DC2626", bg: "#FEF2F2", text: "#DC2626" },
    "En retard":   { dot: "#DC2626", bg: "#FEF2F2", text: "#DC2626" },
    "Racheté":     { dot: "#787881", bg: "rgba(0,0,23,0.043)", text: "#57534E" },
  };
  const c = config[status] || { dot: "#A8A29E", bg: "rgba(0,0,23,0.043)", text: "#57534E" };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
      style={{ background: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {status}
    </span>
  );
}

/* ── Formatters ── */
export function fmt(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
export function fmtFull(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);
}

/* ── Form primitives (ElevenLabs-style: rgba borders, 10px radius) ── */
export const inputCls = "w-full h-10 bg-[rgba(0,0,23,0.043)] border border-[rgba(0,0,29,0.1)] rounded-[10px] px-3 text-[14px] text-[#0F0F10] placeholder-[#A8A29E] focus:outline-none focus:border-[rgba(0,0,29,0.3)] focus:ring-2 focus:ring-[rgba(0,0,29,0.05)] transition-[border-color,box-shadow] duration-75";
export const selectCls = inputCls + " appearance-none";
export const labelCls = "block text-[14px] text-[#0F0F10] mb-1.5 font-medium";

export function Checkbox({ checked, onChange, children, required }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group" onClick={onChange}>
      <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-150 ${checked ? "bg-[#0A0A0A] border-[#0A0A0A]" : "border-[#D4D4D4] group-hover:border-[#A3A3A3]"}`}>
        {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className="text-[13px] text-[#525252] leading-relaxed select-none">{children}{required && <span className="text-[#EE0000] ml-0.5">*</span>}</span>
    </label>
  );
}

export function ComplianceAlert({ type, children }) {
  const styles = {
    warning: "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]",
    info:    "bg-[#F0EFFF] border-[#C4B5FD] text-[#4338CA]",
    success: "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]",
    error:   "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]",
  };
  const icons = { warning: "⚠", info: "ℹ", success: "✓", error: "✗" };
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border text-[13px] leading-relaxed ${styles[type]}`}>
      <span className="font-bold text-sm mt-[-1px] opacity-60">{icons[type]}</span>
      <div>{children}</div>
    </div>
  );
}

/* ── Decorative ── */
export function GeometricDecoration({ className = "" }) {
  return (
    <svg className={`absolute pointer-events-none opacity-[0.02] ${className}`} width="400" height="400" viewBox="0 0 400 400" fill="none">
      <circle cx="200" cy="200" r="180" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="200" cy="200" r="120" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="200" cy="200" r="60" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  );
}

export function GridPattern({ className = "" }) {
  return (
    <svg className={`absolute pointer-events-none ${className}`} width="100%" height="100%" opacity="0.3">
      <defs><pattern id="grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.6" fill="#D4D4D4" /></pattern></defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
    </svg>
  );
}

/* ── Progress Ring ── */
export function ProgressRing({ value = 0, size = 48, stroke = 3, color = "#0A0A0A" }) {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#F0F0F0" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s var(--ease-out)" }} />
    </svg>
  );
}

/* ── Signature Pad ── */
export function SignaturePad({ onSignature }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#0A0A0A";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };
  const startDraw = (e) => { e.preventDefault(); setDrawing(true); const ctx = canvasRef.current.getContext("2d"); const { x, y } = getPos(e); ctx.beginPath(); ctx.moveTo(x, y); };
  const draw = (e) => { if (!drawing) return; e.preventDefault(); const ctx = canvasRef.current.getContext("2d"); const { x, y } = getPos(e); ctx.lineTo(x, y); ctx.stroke(); setHasContent(true); };
  const endDraw = () => setDrawing(false);
  const clear = () => { const canvas = canvasRef.current; const ctx = canvas.getContext("2d"); const dpr = window.devicePixelRatio || 1; ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr); setHasContent(false); onSignature(null); };
  const confirm = () => { if (!hasContent) return; onSignature(canvasRef.current.toDataURL("image/png")); };

  return (
    <div className="text-left">
      <label className={labelCls}>Signez dans le cadre ci-dessous <span className="text-[#EE0000]">*</span></label>
      <div className="relative border border-dashed border-[#D4D4D4] rounded-lg overflow-hidden bg-[#FAFAFA] hover:border-[#A3A3A3] transition-colors">
        <canvas ref={canvasRef} className="w-full cursor-crosshair touch-none" style={{ height: 140 }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
        {!hasContent && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-[13px] text-[#A3A3A3]">Dessinez votre signature ici</span></div>}
      </div>
      <div className="flex justify-between mt-2">
        <button onClick={clear} className="text-[13px] text-[#737373] hover:text-[#EE0000] transition-colors">Effacer</button>
        <button onClick={confirm} disabled={!hasContent} className={`text-[13px] font-medium px-4 py-1.5 rounded-md transition-all duration-150 ${hasContent ? "bg-[#0A0A0A] text-white hover:bg-[#171717]" : "bg-[#F5F5F5] text-[#A3A3A3] cursor-not-allowed"}`}>Confirmer</button>
      </div>
    </div>
  );
}
