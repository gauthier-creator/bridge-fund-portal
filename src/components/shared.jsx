import { useState, useCallback, useRef, useEffect } from "react";

/* ─── Toast System ─── */
export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-slide-in flex items-center gap-3 bg-[#0D0D12] text-white pl-4 pr-5 py-3.5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] max-w-sm text-[13px] font-medium cursor-pointer"
          onClick={() => onDismiss(t.id)}
        >
          <div className="w-5 h-5 rounded-full bg-[#00C48C] flex items-center justify-center flex-shrink-0">
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

/* ─── KPI Card (Ondo-style: border card, clean metrics) ─── */
export function KPICard({ label, value, sub, trend }) {
  return (
    <div className="bg-white border border-[#E8ECF1] rounded-2xl p-5 hover:border-[#D1D5DB] transition-all duration-200 group">
      <p className="text-[13px] text-[#9AA4B2] mb-2.5 font-medium">{label}</p>
      <div className="flex items-baseline gap-2.5">
        <p className="text-[22px] font-semibold text-[#0D0D12] tracking-[-0.02em] tabular-nums">{value}</p>
        {trend && (
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${trend > 0 ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#FEF2F2] text-[#DC2626]"}`}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      {sub && <p className="text-[12px] text-[#9AA4B2] mt-1.5">{sub}</p>}
    </div>
  );
}

/* ─── Badge (Clean status pills) ─── */
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
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide ${styles[status] || "bg-[#F7F8FA] text-[#5F6B7A]"}`}>
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

/* ─── Form helpers (Ondo-style clean inputs) ─── */
export const inputCls = "w-full bg-white border border-[#E8ECF1] rounded-xl px-3.5 py-2.5 text-sm text-[#0D0D12] placeholder-[#C4CAD4] focus:outline-none focus:border-[#4F7DF3] focus:ring-2 focus:ring-[#4F7DF3]/10 transition-all duration-150";
export const selectCls = inputCls + " appearance-none";
export const labelCls = "block text-[13px] text-[#5F6B7A] mb-1.5 font-medium";

export function Checkbox({ checked, onChange, children, required }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group" onClick={onChange}>
      <div className={`w-[18px] h-[18px] mt-0.5 rounded-md border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all duration-150 ${checked ? "bg-[#0D0D12] border-[#0D0D12]" : "border-[#D1D5DB] group-hover:border-[#9AA4B2]"}`}>
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
    <div className={`flex items-start gap-3 p-4 rounded-xl border text-[13px] leading-relaxed ${styles[type]}`}>
      <span className="font-bold text-sm mt-[-1px] opacity-70">{icons[type]}</span>
      <div>{children}</div>
    </div>
  );
}

/* ─── Decorative illustration components ─── */
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
        <button onClick={confirm} disabled={!hasContent} className={`text-[13px] font-semibold px-4 py-1.5 rounded-xl transition-all duration-150 ${hasContent ? "bg-[#0D0D12] text-white hover:bg-[#1A1A2E]" : "bg-[#F0F2F5] text-[#C4CAD4] cursor-not-allowed"}`}>Confirmer la signature</button>
      </div>
    </div>
  );
}
