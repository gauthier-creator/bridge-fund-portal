import { useState, useCallback, useRef, useEffect } from "react";

/* ─── Toast System ─── */
export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((t) => (
        <div key={t.id} className="animate-slide-in bg-navy text-white px-5 py-3.5 rounded-xl shadow-lg max-w-sm text-sm font-medium cursor-pointer" onClick={() => onDismiss(t.id)}>
          <span className="text-gold mr-2">✓</span>{t.message}
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

/* ─── KPI Card ─── */
export function KPICard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100">
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-navy">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

/* ─── Badge ─── */
export function Badge({ status }) {
  const colors = {
    "Validé": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Actif": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Reçu": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Approuvé": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "En attente": "bg-amber-50 text-amber-700 border-amber-200",
    "Pending": "bg-amber-50 text-amber-700 border-amber-200",
    "Envoyé": "bg-blue-50 text-blue-700 border-blue-200",
    "En transfert": "bg-blue-50 text-blue-700 border-blue-200",
    "Rejeté": "bg-red-50 text-red-700 border-red-200",
    "En retard": "bg-red-50 text-red-700 border-red-200",
    "Racheté": "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
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
export const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 transition-all";
export const selectCls = inputCls + " bg-white";
export const labelCls = "block text-xs text-gray-500 mb-1 font-medium";

export function Checkbox({ checked, onChange, children, required }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group" onClick={onChange}>
      <div className={`w-4.5 h-4.5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? "bg-navy border-navy" : "border-gray-300 group-hover:border-navy/40"}`}>
        {checked && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className="text-xs text-gray-600 leading-relaxed select-none">{children}{required && <span className="text-red-400 ml-0.5">*</span>}</span>
    </label>
  );
}

export function ComplianceAlert({ type, children }) {
  const styles = { warning: "bg-amber-50 border-amber-200 text-amber-800", info: "bg-blue-50 border-blue-200 text-blue-800", success: "bg-emerald-50 border-emerald-200 text-emerald-800", error: "bg-red-50 border-red-200 text-red-800" };
  const icons = { warning: "⚠", info: "ℹ", success: "✓", error: "✗" };
  return (
    <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs leading-relaxed ${styles[type]}`}>
      <span className="font-bold text-sm mt-[-1px]">{icons[type]}</span>
      <div>{children}</div>
    </div>
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
    ctx.strokeStyle = "#1a2332";
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
      <label className={labelCls}>Signez dans le cadre ci-dessous <span className="text-red-400">*</span></label>
      <div className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white hover:border-navy/30 transition-colors">
        <canvas ref={canvasRef} className="w-full cursor-crosshair touch-none" style={{ height: 140 }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
        {!hasContent && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-sm text-gray-300">Dessinez votre signature ici</span></div>}
      </div>
      <div className="flex justify-between mt-2">
        <button onClick={clear} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Effacer</button>
        <button onClick={confirm} disabled={!hasContent} className={`text-xs font-medium px-4 py-1.5 rounded-lg transition-colors ${hasContent ? "bg-navy text-white hover:bg-navy-light" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>Confirmer la signature</button>
      </div>
    </div>
  );
}
