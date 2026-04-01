import { useState, useEffect } from "react";
import MeshGradient from "./MeshGradient";

/* ═══════════════════════════════════════════════════════════════════
   Onboarding — ElevenLabs exact flow reproduction
   WebGL intro → Choose portal → Personalize → Use cases → Login
   Full-screen, no header, centered, white bg
   ═══════════════════════════════════════════════════════════════════ */

/* ── Intro: WebGL blob + cinematic text reveal ── */
function LogoIntro({ onDone }) {
  const [phase, setPhase] = useState(0);
  // 0: Nothing visible (white screen)
  // 1: Blob fades in small + "Bridge Fund" fades in with letter-spacing animation
  // 2: Blob grows to full size, text fully revealed
  // 3: Hold — blob continues animating
  // 4: Fade everything out

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3200),
      setTimeout(onDone, 3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden cursor-pointer" onClick={onDone}>

      {/* WebGL mesh gradient blob — behind text, centered, grows */}
      <div className="absolute inset-0 pointer-events-none" style={{
        opacity: phase >= 4 ? 0 : phase >= 1 ? 1 : 0,
        transition: phase >= 4 ? "opacity 0.5s ease" : "opacity 1s ease",
      }}>
        <MeshGradient
          scale={phase >= 3 ? 1.4 : phase >= 2 ? 1.0 : phase >= 1 ? 0.4 : 0}
          opacity={1}
        />
      </div>

      {/* Text — fades in with expanding letter-spacing, stays crisp on white */}
      <div className="relative z-10 select-none" style={{
        opacity: phase >= 4 ? 0 : phase >= 1 ? 1 : 0,
        transition: phase >= 4 ? "opacity 0.4s ease" : "opacity 0.8s ease",
      }}>
        <h1 style={{
          fontSize: "32px",
          fontWeight: 700,
          color: "#0F0F10",
          letterSpacing: phase >= 2 ? "-0.02em" : phase >= 1 ? "0.3em" : "0.6em",
          transition: "letter-spacing 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          whiteSpace: "nowrap",
        }}>
          Bridge Fund
        </h1>
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

/* ── Selectable chip ── */
function SelectChip({ selected, onClick, icon, label }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-all duration-75 ${
        selected
          ? "border-[#0F0F10] bg-[rgba(0,0,23,0.04)] text-[#0F0F10]"
          : "border-[rgba(0,0,29,0.1)] text-[#787881] hover:border-[rgba(0,0,29,0.2)] hover:text-[#0F0F10]"
      }`}>
      {icon && <span className="text-[14px]">{icon}</span>}
      {label}
    </button>
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
function NavFooter({ onBack, onSkip, onNext, nextLabel = "Continuer", nextDisabled = false, step = 0, totalSteps = 5 }) {
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

/* ── Feature illustrations for use-case cards ── */
function MiniIllust({ type }) {
  const styles = {
    tokenize: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <circle cx="24" cy="24" r="20" fill="#EEF2FF"/>
        <circle cx="24" cy="24" r="12" fill="#818CF8" opacity="0.2"/>
        <circle cx="24" cy="24" r="7" fill="#6366F1"/>
        <path d="M21 24l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    kyc: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <circle cx="24" cy="24" r="20" fill="#ECFDF5"/>
        <rect x="14" y="16" width="20" height="14" rx="3" fill="#34D399" opacity="0.3"/>
        <circle cx="21" cy="22" r="3" fill="#059669" opacity="0.5"/>
        <rect x="26" y="20" width="6" height="2" rx="1" fill="#059669" opacity="0.3"/>
        <rect x="26" y="24" width="5" height="2" rx="1" fill="#059669" opacity="0.2"/>
        <circle cx="34" cy="32" r="6" fill="#059669"/>
        <path d="M31.5 32l1.5 1.5 3-3" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    dashboard: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <circle cx="24" cy="24" r="20" fill="#FDF2F8"/>
        <rect x="12" y="30" width="5" height="6" rx="1.5" fill="#EC4899" opacity="0.3"/>
        <rect x="19" y="26" width="5" height="10" rx="1.5" fill="#EC4899" opacity="0.5"/>
        <rect x="26" y="22" width="5" height="14" rx="1.5" fill="#EC4899" opacity="0.7"/>
        <rect x="33" y="16" width="5" height="20" rx="1.5" fill="#EC4899"/>
      </svg>
    ),
    subscribe: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <circle cx="24" cy="24" r="20" fill="#FEF3C7"/>
        <rect x="14" y="15" width="20" height="18" rx="3" fill="#F59E0B" opacity="0.2"/>
        <rect x="17" y="19" width="14" height="2" rx="1" fill="#F59E0B" opacity="0.4"/>
        <rect x="17" y="23" width="10" height="2" rx="1" fill="#F59E0B" opacity="0.3"/>
        <rect x="17" y="27" width="8" height="4" rx="2" fill="#F59E0B"/>
        <text x="21" y="30.5" fill="white" fontSize="4" fontWeight="600" textAnchor="middle">OK</text>
      </svg>
    ),
    blockchain: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <circle cx="24" cy="24" r="20" fill="#F0F9FF"/>
        <rect x="8" y="20" width="10" height="10" rx="3" fill="#0EA5E9" opacity="0.25"/>
        <rect x="20" y="18" width="10" height="12" rx="3" fill="#0EA5E9" opacity="0.5"/>
        <rect x="32" y="20" width="10" height="10" rx="3" fill="#0EA5E9"/>
        <line x1="18" y1="25" x2="20" y2="25" stroke="#0EA5E9" strokeWidth="1.5" opacity="0.4"/>
        <line x1="30" y1="25" x2="32" y2="25" stroke="#0EA5E9" strokeWidth="1.5" opacity="0.4"/>
      </svg>
    ),
    defi: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <circle cx="24" cy="24" r="20" fill="#F5F3FF"/>
        <circle cx="24" cy="24" r="10" fill="#8B5CF6" opacity="0.15"/>
        <circle cx="24" cy="24" r="6" fill="#8B5CF6" opacity="0.3"/>
        <path d="M20 24h8M24 20v8" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  };
  return styles[type] || null;
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
        <div className="max-w-[640px] w-full" style={{ animation: "fadeInUp 0.4s var(--ease-out) both" }}>
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

  /* ── STEP 2: Personalize (like "Help us personalize your experience") ── */
  if (step === "personalize") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-[420px] w-full" style={{ animation: "fadeInUp 0.3s var(--ease-out) both" }}>
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

  /* ── STEP 3: Use cases (like "Que souhaitez-vous faire avec ElevenLabs ?") ── */
  if (step === "usecases") {
    const cases = [
      { id: "tokenize", icon: "tokenize", label: "Tokeniser des fonds" },
      { id: "subscribe", icon: "subscribe", label: "Souscrire a des fonds" },
      { id: "kyc", icon: "kyc", label: "KYC & Compliance" },
      { id: "dashboard", icon: "dashboard", label: "Suivi portfolio" },
      { id: "blockchain", icon: "blockchain", label: "Verification on-chain" },
      { id: "defi", icon: "defi", label: "DeFi & Collateral" },
    ];

    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-[560px] w-full" style={{ animation: "fadeInUp 0.3s var(--ease-out) both" }}>
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
                <div className="flex justify-center mb-2">
                  <MiniIllust type={c.icon} />
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
