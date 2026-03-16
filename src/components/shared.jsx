import { useState, useCallback, useRef, useEffect } from "react";

/* ─── Toast System ─── */
export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((t, i) => (
        <div
          key={t.id}
          className="flex items-center gap-3 bg-[#0D0D12] text-white pl-4 pr-5 py-3.5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] max-w-sm text-[13px] font-medium cursor-pointer"
          style={{
            animation: `slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
            animationDelay: `${i * 50}ms`,
          }}
          onClick={() => onDismiss(t.id)}
        >
          <div className="w-5 h-5 rounded-full bg-[#00C48C] flex items-center justify-center flex-shrink-0 animate-badge-pop">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
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

/* ─── Animated Number Counter Hook ─── */
export function useCountUp(end, duration = 1200, decimals = 0) {
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
      // Ease-out expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startVal + (endVal - startVal) * eased;
      setValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevRef.current = endVal;
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return decimals > 0 ? value.toFixed(decimals) : Math.round(value);
}

/* ─── Intersection Observer Hook for reveal animations ─── */
export function useInView(options = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Use rAF to wait for browser layout to settle, then check visibility
    const rafId = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 100 && rect.bottom > -100) {
        setIsInView(true);
        return;
      }
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { setIsInView(true); observer.unobserve(el); } },
        { threshold: 0.01, rootMargin: "200px 0px", ...options }
      );
      observer.observe(el);
      // Store cleanup
      el._observer = observer;
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (el._observer) { el._observer.disconnect(); delete el._observer; }
    };
  }, []);

  return [ref, isInView];
}

/* ─── KPI Card with animated entrance + optional counter ─── */
export function KPICard({ label, value, sub, trend, delay = 0, animate = false }) {
  const displayValue = value;

  return (
    <div
      className="bg-white border border-[#E8ECF1] rounded-2xl p-5 group card-elevated"
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      <p className="text-[13px] text-[#9AA4B2] mb-2.5 font-medium">{label}</p>
      <div className="flex items-baseline gap-2.5">
        <p className="text-[22px] font-semibold text-[#0D0D12] tracking-[-0.02em] tabular-nums count-value">
          {displayValue}
        </p>
        {trend && (
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md animate-badge-pop ${trend > 0 ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#FEF2F2] text-[#DC2626]"}`}
            style={{ animationDelay: `${delay + 300}ms` }}
          >
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      {sub && <p className="text-[12px] text-[#9AA4B2] mt-1.5">{sub}</p>}
    </div>
  );
}

/* ─── Badge with subtle entrance ─── */
export function Badge({ status }) {
  const styles = {
    "Validé": "bg-[#ECFDF5] text-[#059669]",
    "Actif": "bg-[#ECFDF5] text-[#059669]",
    "Reçu": "bg-[#ECFDF5] text-[#059669]",
    "Approuvé": "bg-[#ECFDF5] text-[#059669]",
    "En attente": "bg-[#FFF7ED] text-[#D97706]",
    "Pending": "bg-[#FFF7ED] text-[#D97706]",
    "Envoyé": "bg-[#EEF2FF] text-[#4F7DF3]",
    "En transfert": "bg-[#EEF2FF] text-[#4F7DF3]",
    "Rejeté": "bg-[#FEF2F2] text-[#DC2626]",
    "En retard": "bg-[#FEF2F2] text-[#DC2626]",
    "Racheté": "bg-[#F7F8FA] text-[#5F6B7A]",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-200 ${styles[status] || "bg-[#F7F8FA] text-[#5F6B7A]"}`}>
      {status}
    </span>
  );
}

/* ─── Formatters ─── */
export function fmt(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
export function fmtFull(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);
}

/* ─── Form helpers ─── */
export const inputCls = "w-full bg-white border border-[#E8ECF1] rounded-xl px-3.5 py-2.5 text-sm text-[#0D0D12] placeholder-[#C4CAD4] focus:outline-none focus:border-[#4F7DF3] focus:ring-2 focus:ring-[#4F7DF3]/10 transition-all duration-150";
export const selectCls = inputCls + " appearance-none";
export const labelCls = "block text-[13px] text-[#5F6B7A] mb-1.5 font-medium";

export function Checkbox({ checked, onChange, children, required }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group" onClick={onChange}>
      <div className={`w-[18px] h-[18px] mt-0.5 rounded-md border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all duration-200 ${checked ? "bg-[#0D0D12] border-[#0D0D12] scale-105" : "border-[#D1D5DB] group-hover:border-[#9AA4B2]"}`}>
        {checked && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className="text-[13px] text-[#5F6B7A] leading-relaxed select-none">{children}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
    </label>
  );
}

export function ComplianceAlert({ type, children }) {
  const styles = {
    warning: "bg-[#FFF7ED] border-[#FED7AA] text-[#92400E]",
    info: "bg-[#EEF2FF] border-[#C7D2FE] text-[#3730A3]",
    success: "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]",
    error: "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]",
  };
  const icons = { warning: "⚠", info: "ℹ", success: "✓", error: "✗" };
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border text-[13px] leading-relaxed animate-fade-in ${styles[type]}`}>
      <span className="font-bold text-sm mt-[-1px] opacity-70">{icons[type]}</span>
      <div>{children}</div>
    </div>
  );
}

/* ─── Decorative Components ─── */
export function GeometricDecoration({ className = "" }) {
  return (
    <svg className={`absolute pointer-events-none opacity-[0.03] ${className}`} width="400" height="400" viewBox="0 0 400 400" fill="none">
      <circle cx="200" cy="200" r="180" stroke="currentColor" strokeWidth="1" />
      <circle cx="200" cy="200" r="120" stroke="currentColor" strokeWidth="1" />
      <circle cx="200" cy="200" r="60" stroke="currentColor" strokeWidth="0.5" />
      <line x1="20" y1="200" x2="380" y2="200" stroke="currentColor" strokeWidth="0.5" />
      <line x1="200" y1="20" x2="200" y2="380" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  );
}

export function GridPattern({ className = "" }) {
  return (
    <svg className={`absolute pointer-events-none ${className}`} width="100%" height="100%" opacity="0.4">
      <defs>
        <pattern id="grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" fill="#E8ECF1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
    </svg>
  );
}

/* ─── Animated Progress Ring (for dashboards) ─── */
export function ProgressRing({ value = 0, size = 56, stroke = 4, color = "#0D0D12" }) {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F0F2F5" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
      />
    </svg>
  );
}

/* ─── Signature Pad ─── */
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
    ctx.strokeStyle = "#0D0D12";
    ctx.lineWidth = 2;
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
      <label className={labelCls}>Signez dans le cadre ci-dessous <span className="text-red-500">*</span></label>
      <div className="relative border-2 border-dashed border-[#E8ECF1] rounded-xl overflow-hidden bg-[#F7F8FA] hover:border-[#D1D5DB] transition-colors">
        <canvas ref={canvasRef} className="w-full cursor-crosshair touch-none" style={{ height: 140 }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
        {!hasContent && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-sm text-[#C4CAD4]">Dessinez votre signature ici</span></div>}
      </div>
      <div className="flex justify-between mt-2.5">
        <button onClick={clear} className="text-[13px] text-[#9AA4B2] hover:text-[#DC2626] transition-colors">Effacer</button>
        <button onClick={confirm} disabled={!hasContent} className={`text-[13px] font-semibold px-4 py-1.5 rounded-xl transition-all duration-200 btn-lift ${hasContent ? "bg-[#0D0D12] text-white hover:bg-[#1A1A2E]" : "bg-[#F0F2F5] text-[#C4CAD4] cursor-not-allowed"}`}>Confirmer la signature</button>
      </div>
    </div>
  );
}
