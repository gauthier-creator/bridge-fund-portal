import { useState, useEffect } from "react";

/* ═══════════════════════════════════════════════════
   Onboarding — Minimal, Premium, 2-step
   Inspired by Linear/Clerk/Mercury
   ═══════════════════════════════════════════════════ */

export default function Onboarding({ onComplete, onLogin }) {
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => { setTimeout(() => setReady(true), 100); }, []);

  const finish = () => {
    localStorage.setItem("bf_onboarding_seen", "1");
    onLogin?.();
  };

  const skip = () => {
    localStorage.setItem("bf_onboarding_seen", "1");
    onComplete?.();
  };

  /* ── Step 0: Welcome ── */
  if (step === 0) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
        {/* Skip */}
        <div className="px-8 py-5 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#0A0A0A] rounded-md flex items-center justify-center">
              <span className="text-white font-semibold text-[9px] tracking-wider">BF</span>
            </div>
            <span className="text-[14px] font-semibold text-[#0A0A0A] tracking-[-0.01em]">Bridge Fund</span>
          </div>
          <button onClick={skip} className="text-[13px] text-[#737373] hover:text-[#0A0A0A] transition-colors duration-150">
            Se connecter →
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-[520px] w-full text-center" style={{ opacity: ready ? 1 : 0, transform: ready ? "none" : "translateY(12px)", transition: "all 0.5s cubic-bezier(0, 0, 0.2, 1)" }}>

            {/* Accent mark */}
            <div className="w-12 h-1 bg-[#635BFF] rounded-full mx-auto mb-8"
              style={{ opacity: ready ? 1 : 0, transform: ready ? "scaleX(1)" : "scaleX(0)", transition: "all 0.4s cubic-bezier(0, 0, 0.2, 1) 0.1s" }} />

            <h1 className="text-[36px] font-semibold text-[#0A0A0A] tracking-[-0.03em] leading-[1.15] mb-4">
              L'infrastructure pour<br />tokeniser vos fonds
            </h1>

            <p className="text-[16px] text-[#525252] leading-relaxed max-w-[420px] mx-auto mb-10">
              Gerez, tokenisez et distribuez vos fonds d'investissement alternatifs sur la blockchain Cardano.
            </p>

            {/* Three pillars — icon + label, inline */}
            <div className="flex items-center justify-center gap-8 mb-12">
              {[
                { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/></svg>, label: "Conforme CSSF" },
                { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>, label: "On-chain" },
                { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, label: "Securise" },
              ].map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-[13px] text-[#525252] font-medium"
                  style={{ opacity: ready ? 1 : 0, transform: ready ? "none" : "translateY(8px)", transition: `all 0.3s cubic-bezier(0, 0, 0.2, 1) ${0.3 + i * 0.08}s` }}>
                  <span className="text-[#0A0A0A]">{p.icon}</span>
                  {p.label}
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{ opacity: ready ? 1 : 0, transform: ready ? "none" : "translateY(8px)", transition: "all 0.3s cubic-bezier(0, 0, 0.2, 1) 0.5s" }}>
              <button onClick={() => setStep(1)}
                className="px-8 py-3 bg-[#0A0A0A] text-white text-[14px] font-medium rounded-lg hover:bg-[#171717] active:scale-[0.98] transition-all duration-150">
                Decouvrir
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-1.5 mt-8">
              <div className="w-5 h-1 bg-[#0A0A0A] rounded-full" />
              <div className="w-1.5 h-1 bg-[#D4D4D4] rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Step 1: Overview + Login CTA ── */
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <div className="px-8 py-5 flex justify-between items-center">
        <button onClick={() => setStep(0)} className="text-[13px] text-[#737373] hover:text-[#0A0A0A] transition-colors duration-150">
          ← Retour
        </button>
        <button onClick={skip} className="text-[13px] text-[#737373] hover:text-[#0A0A0A] transition-colors duration-150">
          Passer →
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-[640px] w-full">
          <div className="text-center mb-10" style={{ animation: "fadeInUp 0.3s var(--ease-out) both" }}>
            <h2 className="text-[28px] font-semibold text-[#0A0A0A] tracking-[-0.02em] mb-2">Comment ca fonctionne</h2>
            <p className="text-[15px] text-[#737373]">Trois etapes pour digitaliser vos fonds</p>
          </div>

          {/* Steps — numbered, clean */}
          <div className="space-y-4 mb-12">
            {[
              { n: "01", title: "Creez votre fonds", desc: "Configurez les parametres, la classe de parts et deployez le registre sur Cardano." },
              { n: "02", title: "Collectez les souscriptions", desc: "Vos investisseurs souscrivent en ligne avec KYC, signature electronique et paiement integres." },
              { n: "03", title: "Tokenisez et distribuez", desc: "Les parts sont emises sous forme de tokens CIP-113. Chaque position est verifiable on-chain." },
            ].map((s, i) => (
              <div key={i} className="flex gap-5 items-start bg-white border border-[#E5E5E5] rounded-lg p-5 hover:border-[#D4D4D4] hover:shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-150"
                style={{ animation: `fadeInUp 0.3s var(--ease-out) ${100 + i * 60}ms both` }}>
                <span className="text-[24px] font-semibold text-[#E5E5E5] tracking-[-0.02em] tabular-nums shrink-0 w-8">{s.n}</span>
                <div>
                  <h3 className="text-[14px] font-semibold text-[#0A0A0A] mb-1">{s.title}</h3>
                  <p className="text-[13px] text-[#737373] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA row */}
          <div className="flex items-center justify-between" style={{ animation: "fadeInUp 0.3s var(--ease-out) 0.4s both" }}>
            <div className="flex items-center gap-4 text-[11px] text-[#A3A3A3] font-medium">
              {["CSSF Luxembourg", "Cardano", "eIDAS"].map(t => (
                <span key={t} className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[#D4D4D4]" />{t}
                </span>
              ))}
            </div>

            <button onClick={finish}
              className="px-6 py-2.5 bg-[#0A0A0A] text-white text-[14px] font-medium rounded-lg hover:bg-[#171717] active:scale-[0.98] transition-all duration-150">
              Se connecter
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1.5 mt-8">
            <div className="w-1.5 h-1 bg-[#0A0A0A] rounded-full" />
            <div className="w-5 h-1 bg-[#0A0A0A] rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
