import { useState, useEffect } from "react";

/* ═══════════════════════════════════════════════════
   Onboarding — ElevenLabs warm style
   2-step: Welcome → How it works → Login
   ═══════════════════════════════════════════════════ */

export default function Onboarding({ onComplete, onLogin }) {
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => { setTimeout(() => setReady(true), 100); }, []);

  const finish = () => { localStorage.setItem("bf_onboarding_seen", "1"); onLogin?.(); };
  const skip = () => { localStorage.setItem("bf_onboarding_seen", "1"); onComplete?.(); };

  /* ── Step 0: Welcome ── */
  if (step === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#0F0F10] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-[10px] tracking-wider">BF</span>
            </div>
            <span className="text-[15px] font-semibold text-[#0F0F10] tracking-tight">Bridge Fund</span>
          </div>
          <button onClick={skip} className="px-4 py-2 text-[14px] text-[#0F0F10] font-medium rounded-[9.6px] border border-[rgba(0,0,29,0.1)] hover:bg-[rgba(0,0,23,0.02)] transition-colors duration-75">
            Se connecter
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-[560px] w-full text-center" style={{ opacity: ready ? 1 : 0, transform: ready ? "none" : "translateY(12px)", transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }}>

            <h1 className="text-[40px] font-semibold text-[#0F0F10] leading-[1.1] mb-5">
              Tokenisez vos fonds<br />d'investissement
            </h1>

            <p className="text-[16px] text-[#787881] leading-relaxed max-w-[440px] mx-auto mb-10">
              L'infrastructure complete pour creer, gerer et distribuer vos fonds alternatifs sur la blockchain Cardano. Conforme CSSF.
            </p>

            {/* Feature tiles — ElevenLabs style */}
            <div className="grid grid-cols-3 gap-4 mb-10">
              {[
                { emoji: "🔐", label: "Tokenisation", desc: "Parts de fonds CIP-113" },
                { emoji: "✅", label: "KYC integre", desc: "Conformite AMLD5" },
                { emoji: "📊", label: "Temps reel", desc: "Dashboard on-chain" },
              ].map((f, i) => (
                <div key={i} className="bg-[rgba(0,0,23,0.043)] rounded-2xl p-5 text-center hover:bg-[rgba(0,0,23,0.065)] transition-colors duration-150 cursor-default"
                  style={{ opacity: ready ? 1 : 0, transform: ready ? "none" : "translateY(8px)", transition: `all 0.3s cubic-bezier(0.4, 0, 0.2, 1) ${0.2 + i * 0.08}s` }}>
                  <div className="text-[28px] mb-2">{f.emoji}</div>
                  <p className="text-[14px] font-medium text-[#0F0F10] mb-0.5">{f.label}</p>
                  <p className="text-[12px] text-[#787881]">{f.desc}</p>
                </div>
              ))}
            </div>

            <div style={{ opacity: ready ? 1 : 0, transition: "opacity 0.3s 0.5s" }}>
              <button onClick={() => setStep(1)}
                className="px-8 py-3 bg-[#0F0F10] text-white text-[14px] font-medium rounded-[9999px] hover:bg-[#292524] active:scale-[0.98] transition-all duration-75">
                Decouvrir →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Step 1: How it works + Login CTA ── */
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-6 py-4 flex justify-between items-center">
        <button onClick={() => setStep(0)} className="text-[14px] text-[#787881] hover:text-[#0F0F10] transition-colors duration-75">
          ← Retour
        </button>
        <button onClick={skip} className="text-[14px] text-[#787881] hover:text-[#0F0F10] transition-colors duration-75">
          Passer
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-[640px] w-full">
          <div className="text-center mb-10" style={{ animation: "fadeInUp 0.3s var(--ease-out) both" }}>
            <h2 className="text-[28px] font-semibold text-[#0F0F10] mb-2">Comment ca fonctionne</h2>
            <p className="text-[16px] text-[#787881]">Trois etapes pour digitaliser vos fonds</p>
          </div>

          <div className="space-y-3 mb-10">
            {[
              { n: "01", title: "Creez votre fonds", desc: "Configurez les parametres, la classe de parts et deployez le registre sur Cardano." },
              { n: "02", title: "Collectez les souscriptions", desc: "Vos investisseurs souscrivent en ligne avec KYC, signature electronique et paiement integres." },
              { n: "03", title: "Tokenisez et distribuez", desc: "Les parts sont emises sous forme de tokens CIP-113. Chaque position est verifiable on-chain." },
            ].map((s, i) => (
              <div key={i} className="flex gap-5 items-start bg-[rgba(0,0,23,0.043)] rounded-2xl p-5 hover:bg-[rgba(0,0,23,0.065)] transition-colors duration-150"
                style={{ animation: `fadeInUp 0.3s var(--ease-out) ${80 + i * 60}ms both` }}>
                <span className="text-[24px] font-semibold text-[rgba(0,0,29,0.15)] tabular-nums shrink-0 w-8">{s.n}</span>
                <div>
                  <h3 className="text-[14px] font-semibold text-[#0F0F10] mb-1">{s.title}</h3>
                  <p className="text-[14px] text-[#787881] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between" style={{ animation: "fadeInUp 0.3s var(--ease-out) 0.4s both" }}>
            <div className="flex items-center gap-4 text-[12px] text-[#A8A29E]">
              {["CSSF Luxembourg", "Cardano", "eIDAS"].map(t => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <button onClick={finish}
              className="px-6 py-2.5 bg-[#0F0F10] text-white text-[14px] font-medium rounded-[9999px] hover:bg-[#292524] active:scale-[0.98] transition-all duration-75">
              Se connecter →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
