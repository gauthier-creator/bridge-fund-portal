import { useState, useEffect } from "react";
import MeshGradient from "./MeshGradient";

/* ═══════════════════════════════════════════════════════════════════
   Onboarding — ElevenLabs exact flow reproduction
   CSS blob intro → Choose portal → Personalize → Use cases → Login
   Full-screen, no header, centered, white bg
   ═══════════════════════════════════════════════════════════════════ */

/* ── Intro: CSS blob + cinematic text reveal ── */
function LogoIntro({ onDone }) {
  const [phase, setPhase] = useState(0);
  // 0: White screen
  // 1: Logo bars appear (chromatic aberration style)
  // 2: Text deploys with letter-spacing, blob grows
  // 3: Hold
  // 4: Fade out

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => setPhase(4), 3600),
      setTimeout(onDone, 4200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden cursor-pointer" onClick={onDone}>

      {/* CSS mesh gradient blob — behind text, centered, grows */}
      <div className="absolute inset-0 pointer-events-none" style={{
        opacity: phase >= 4 ? 0 : phase >= 2 ? 1 : 0,
        transition: phase >= 4 ? "opacity 0.6s ease" : "opacity 1.5s ease",
      }}>
        <MeshGradient
          scale={phase >= 3 ? 1.3 : phase >= 2 ? 0.8 : 0.2}
        />
      </div>

      {/* Logo bars — chromatic aberration (like ElevenLabs || icon) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{
        opacity: phase >= 2 ? 0 : phase >= 1 ? 1 : 0,
        transition: phase >= 2 ? "opacity 0.8s ease" : "opacity 0.6s ease",
      }}>
        <div className="flex gap-[6px]">
          <div style={{
            width: "8px",
            height: phase >= 1 ? "52px" : "0px",
            background: "#0F0F10",
            borderRadius: "2px",
            transition: "height 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: phase >= 1 ? "-3px 0 12px rgba(74, 230, 217, 0.5), 3px 0 12px rgba(242, 173, 209, 0.4)" : "none",
          }} />
          <div style={{
            width: "8px",
            height: phase >= 1 ? "52px" : "0px",
            background: "#0F0F10",
            borderRadius: "2px",
            transition: "height 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
            boxShadow: phase >= 1 ? "-3px 0 12px rgba(115, 235, 140, 0.4), 3px 0 12px rgba(242, 224, 128, 0.5)" : "none",
          }} />
        </div>
      </div>

      {/* Text — fades in with expanding letter-spacing, stays crisp */}
      <div className="relative z-10 select-none" style={{
        opacity: phase >= 4 ? 0 : phase >= 2 ? 1 : 0,
        transition: phase >= 4 ? "opacity 0.4s ease" : "opacity 1s ease",
      }}>
        <h1 style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "#0F0F10",
          letterSpacing: phase >= 3 ? "-0.02em" : phase >= 2 ? "0.25em" : "0.5em",
          transition: "letter-spacing 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
          whiteSpace: "nowrap",
        }}>
          Bridge Fund
        </h1>
        <p style={{
          textAlign: "center",
          fontSize: "14px",
          color: "#787881",
          marginTop: "8px",
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? "translateY(0)" : "translateY(6px)",
          transition: "all 0.6s ease 0.2s",
        }}>
          Tokenized fund infrastructure
        </p>
      </div>
    </div>
  );
}

/* ── Selectable card with border highlight ── */
function SelectCard({ selected, onClick, children, className = "" }) {
  return (
    <div onClick={onClick}
      className={`cursor-pointer rounded-2xl border-2 p-5 transition-all duration-100 ${
        selected
          ? "border-[#0F0F10] bg-white shadow-[0_0_0_1px_rgba(15,15,16,0.1)]"
          : "border-[rgba(0,0,29,0.08)] bg-white hover:border-[rgba(0,0,29,0.15)] hover:bg-[rgba(0,0,23,0.015)]"
      } ${className}`}>
      {children}
    </div>
  );
}

/* ── Step dots (pagination like ElevenLabs bottom dots) ── */
function StepDots({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`rounded-full transition-all duration-200 ${
          i === current ? "w-6 h-1.5 bg-[#0F0F10]" : "w-1.5 h-1.5 bg-[#D6D3D1]"
        }`} />
      ))}
    </div>
  );
}

/* ── Navigation footer ── */
function NavFooter({ onBack, onSkip, onNext, nextLabel = "Continuer", nextDisabled = false, step = 0, totalSteps = 4 }) {
  return (
    <>
      <div className="flex items-center justify-between mt-8">
        <div className="flex gap-4">
          {onBack && <button onClick={onBack} className="text-[14px] text-[#787881] hover:text-[#0F0F10] transition-colors">Retour</button>}
          {onSkip && <button onClick={onSkip} className="text-[14px] text-[#787881] hover:text-[#0F0F10] transition-colors">Passer</button>}
        </div>
        {onNext && (
          <button onClick={onNext} disabled={nextDisabled}
            className="px-6 py-2.5 bg-[#0F0F10] text-white text-[14px] font-medium rounded-[9999px] hover:bg-[#292524] active:scale-[0.98] transition-all duration-75 disabled:opacity-30 disabled:cursor-not-allowed">
            {nextLabel}
          </button>
        )}
      </div>
      <StepDots current={step} total={totalSteps} />
    </>
  );
}

/* ── Rich illustrated icons for use-case cards (like ElevenLabs ref10) ── */
function UseCaseIllust({ type }) {
  const map = {
    tokenize: (
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 70% 30%, #818CF8, transparent 60%)" }} />
        <svg viewBox="0 0 32 32" className="w-8 h-8 relative z-10">
          <circle cx="16" cy="16" r="11" fill="#6366F1" opacity="0.15"/>
          <circle cx="16" cy="16" r="7" fill="#6366F1"/>
          <path d="M13.5 16l1.5 1.5 3.5-3.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    ),
    subscribe: (
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 30% 70%, #F59E0B, transparent 60%)" }} />
        <svg viewBox="0 0 32 32" className="w-8 h-8 relative z-10">
          <rect x="7" y="8" width="18" height="16" rx="3" fill="#F59E0B" opacity="0.2"/>
          <rect x="10" y="12" width="12" height="2" rx="1" fill="#F59E0B" opacity="0.5"/>
          <rect x="10" y="16" width="8" height="2" rx="1" fill="#F59E0B" opacity="0.4"/>
          <rect x="10" y="20" width="6" height="3" rx="1.5" fill="#F59E0B"/>
        </svg>
      </div>
    ),
    kyc: (
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-green-50 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 60% 40%, #059669, transparent 60%)" }} />
        <svg viewBox="0 0 32 32" className="w-8 h-8 relative z-10">
          <rect x="6" y="9" width="20" height="14" rx="3" fill="#059669" opacity="0.2"/>
          <circle cx="14" cy="15" r="3" fill="#059669" opacity="0.4"/>
          <rect x="19" y="13" width="5" height="1.5" rx="0.75" fill="#059669" opacity="0.3"/>
          <rect x="19" y="16" width="4" height="1.5" rx="0.75" fill="#059669" opacity="0.2"/>
          <circle cx="24" cy="22" r="5" fill="#059669"/>
          <path d="M22 22l1.2 1.2 2.6-2.6" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    ),
    dashboard: (
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-50 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 40% 60%, #EC4899, transparent 60%)" }} />
        <svg viewBox="0 0 32 32" className="w-8 h-8 relative z-10">
          <rect x="5" y="20" width="5" height="6" rx="1.5" fill="#EC4899" opacity="0.3"/>
          <rect x="12" y="16" width="5" height="10" rx="1.5" fill="#EC4899" opacity="0.5"/>
          <rect x="19" y="12" width="5" height="14" rx="1.5" fill="#EC4899" opacity="0.7"/>
          <rect x="26" y="7" width="5" height="19" rx="1.5" fill="#EC4899"/>
        </svg>
      </div>
    ),
    blockchain: (
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-50 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 50% 50%, #0EA5E9, transparent 60%)" }} />
        <svg viewBox="0 0 32 32" className="w-8 h-8 relative z-10">
          <rect x="3" y="13" width="8" height="8" rx="2" fill="#0EA5E9" opacity="0.25"/>
          <rect x="13" y="11" width="8" height="10" rx="2" fill="#0EA5E9" opacity="0.5"/>
          <rect x="23" y="13" width="8" height="8" rx="2" fill="#0EA5E9"/>
          <line x1="11" y1="17" x2="13" y2="17" stroke="#0EA5E9" strokeWidth="1.5" opacity="0.5"/>
          <line x1="21" y1="17" x2="23" y2="17" stroke="#0EA5E9" strokeWidth="1.5" opacity="0.5"/>
        </svg>
      </div>
    ),
    defi: (
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-50 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 50% 50%, #8B5CF6, transparent 60%)" }} />
        <svg viewBox="0 0 32 32" className="w-8 h-8 relative z-10">
          <circle cx="16" cy="16" r="10" fill="#8B5CF6" opacity="0.15"/>
          <circle cx="16" cy="16" r="6" fill="#8B5CF6" opacity="0.3"/>
          <path d="M13 16h6M16 13v6" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    ),
  };
  return map[type] || null;
}

/* ══════════════════════════════════════════
   MAIN ONBOARDING
   ══════════════════════════════════════════ */
export default function Onboarding({ onComplete, onLogin }) {
  const [step, setStep] = useState("intro"); // intro → portal → personalize → usecases → done
  const [portal, setPortal] = useState(null);
  const [name, setName] = useState("");
  const [useCases, setUseCases] = useState([]);

  const finish = () => { localStorage.setItem("bf_onboarding_seen", "1"); onLogin?.(); };
  const skip = () => { localStorage.setItem("bf_onboarding_seen", "1"); onComplete?.(); };

  const toggleUseCase = (id) => setUseCases(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  /* ── INTRO: Logo animation ── */
  if (step === "intro") {
    return <LogoIntro onDone={() => setStep("portal")} />;
  }

  /* ── STEP 1: Choose your portal (like "Choose your platform") ── */
  if (step === "portal") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-[640px] w-full page-slide-in">

          <div className="text-center mb-8">
            <h1 className="text-[24px] font-bold text-[#0F0F10]">Choisissez votre portail</h1>
            <p className="text-[14px] text-[#787881] mt-1.5">Vous pourrez changer a tout moment</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-2">
            <SelectCard selected={portal === "investor"} onClick={() => setPortal("investor")}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#0F0F10]">Investisseur</p>
                  <p className="text-[12px] text-[#787881]">Souscrivez et suivez vos fonds</p>
                </div>
              </div>
              <div className="text-[12px] text-[#787881] space-y-1.5">
                <p className="font-medium text-[#A8A29E] text-[11px] uppercase tracking-wider mb-2">Fonctionnalites</p>
                <div className="grid grid-cols-2 gap-1">
                  {["Catalogue fonds", "Souscription", "KYC integre", "Suivi portfolio", "Tokens on-chain", "Paiement crypto"].map(f => (
                    <p key={f} className="flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2"><path d="M9 12l2 2 4-4"/></svg>{f}</p>
                  ))}
                </div>
              </div>
            </SelectCard>

            <SelectCard selected={portal === "manager"} onClick={() => setPortal("manager")}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/></svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#0F0F10]">Gestionnaire</p>
                  <p className="text-[12px] text-[#787881]">Gerez et validez les operations</p>
                </div>
              </div>
              <div className="text-[12px] text-[#787881] space-y-1.5">
                <p className="font-medium text-[#A8A29E] text-[11px] uppercase tracking-wider mb-2">Fonctionnalites</p>
                <div className="grid grid-cols-2 gap-1">
                  {["Validation ordres", "Gestion fonds", "Compliance", "Vault tokens", "Audit trail", "CRM Salesforce"].map(f => (
                    <p key={f} className="flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2"><path d="M9 12l2 2 4-4"/></svg>{f}</p>
                  ))}
                </div>
              </div>
            </SelectCard>
          </div>

          <NavFooter onSkip={skip} onNext={() => setStep("personalize")} nextLabel="Continuer" nextDisabled={!portal} step={0} totalSteps={4} />
        </div>
      </div>
    );
  }

  /* ── STEP 2: Personalize ── */
  if (step === "personalize") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-[420px] w-full page-slide-in">
          <h1 className="text-[24px] font-bold text-[#0F0F10] mb-6">Personnalisez votre experience</h1>

          <div className="space-y-5">
            <div>
              <label className="block text-[14px] font-medium text-[#0F0F10] mb-1.5">Comment vous appelez-vous ? <span className="text-[#A8A29E] font-normal">(optionnel)</span></label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full h-10 bg-[rgba(0,0,23,0.043)] border border-[rgba(0,0,29,0.1)] rounded-[10px] px-3 text-[14px] text-[#0F0F10] placeholder-[#A8A29E] focus:outline-none focus:border-[rgba(0,0,29,0.3)] transition-[border-color] duration-75"
                placeholder="Votre prenom" />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#0F0F10] mb-1.5">Votre type d'organisation</label>
              <select className="w-full h-10 bg-[rgba(0,0,23,0.043)] border border-[rgba(0,0,29,0.1)] rounded-[10px] px-3 text-[14px] text-[#0F0F10] focus:outline-none focus:border-[rgba(0,0,29,0.3)] transition-[border-color] duration-75 appearance-none">
                <option>Asset Manager / AIFM</option>
                <option>Banque privee</option>
                <option>Family Office</option>
                <option>Assureur</option>
                <option>Investisseur particulier</option>
                <option>Autre</option>
              </select>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" className="mt-1 w-4 h-4 rounded border-[rgba(0,0,29,0.2)] accent-[#0F0F10]" />
              <span className="text-[13px] text-[#787881] leading-relaxed">
                En cochant cette case, vous confirmez avoir l'age legal et acceptez de recevoir des informations sur Bridge Fund.
              </span>
            </label>
          </div>

          <NavFooter onBack={() => setStep("portal")} onSkip={skip} onNext={() => setStep("usecases")} nextLabel="Suivant" step={1} totalSteps={4} />
        </div>
      </div>
    );
  }

  /* ── STEP 3: Use cases (illustrated cards like ElevenLabs ref10) ── */
  if (step === "usecases") {
    const cases = [
      { id: "tokenize", label: "Tokeniser des fonds" },
      { id: "subscribe", label: "Souscrire a des fonds" },
      { id: "kyc", label: "KYC & Compliance" },
      { id: "dashboard", label: "Suivi portfolio" },
      { id: "blockchain", label: "Verification on-chain" },
      { id: "defi", label: "DeFi & Collateral" },
    ];

    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-[560px] w-full page-slide-in">
          <div className="text-center mb-8">
            <h1 className="text-[24px] font-bold text-[#0F0F10]">Que souhaitez-vous faire ?</h1>
            <p className="text-[14px] text-[#787881] mt-1.5">Selectionnez tout ce qui s'applique</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {cases.map((c, i) => (
              <div key={c.id} onClick={() => toggleUseCase(c.id)}
                className={`cursor-pointer rounded-2xl border-2 p-4 text-center transition-all duration-100 ${
                  useCases.includes(c.id)
                    ? "border-[#0F0F10] bg-[rgba(0,0,23,0.02)]"
                    : "border-[rgba(0,0,29,0.06)] hover:border-[rgba(0,0,29,0.15)]"
                }`}
                style={{ animation: `fadeInUp 0.3s var(--ease-out) ${i * 50}ms both` }}>
                <div className="flex justify-center mb-3">
                  <UseCaseIllust type={c.id} />
                </div>
                <p className="text-[13px] font-medium text-[#0F0F10]">{c.label}</p>
              </div>
            ))}
          </div>

          <NavFooter onBack={() => setStep("personalize")} onSkip={skip} onNext={finish} nextLabel="Commencer" step={2} totalSteps={4} />
        </div>
      </div>
    );
  }

  return null;
}
