import { useState, useEffect, useCallback } from "react";
import MeshGradient from "./MeshGradient";

/* ═══════════════════════════════════════════════════════════════════
   Onboarding — ElevenLabs-exact reproduction
   Smooth intro → Choose portal → Personalize → Use cases → Signup
   No cards, no box-shadows — everything floats on white
   Cross-fade transitions between steps
   ═══════════════════════════════════════════════════════════════════ */

const iCls = "w-full h-11 bg-transparent border-b border-[rgba(0,0,29,0.15)] px-0 text-[15px] text-[#0F0F10] placeholder-[#C4C0BB] focus:outline-none focus:border-[#0F0F10] transition-[border-color] duration-200";

/* ── Intro: Smooth blob + text reveal (ElevenLabs ref5/ref6) ── */
function LogoIntro({ onDone }) {
  const [phase, setPhase] = useState(0);

  const done = useCallback(onDone, [onDone]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),   // bars appear
      setTimeout(() => setPhase(2), 1000),   // blob fades in, bars dissolve into text
      setTimeout(() => setPhase(3), 2200),   // text settles, blob grows
      setTimeout(() => setPhase(4), 3400),   // fade out
      setTimeout(done, 4000),                // next step
    ];
    return () => timers.forEach(clearTimeout);
  }, [done]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden cursor-pointer select-none" onClick={done}>

      {/* Mesh gradient blob — fades in behind text, grows slowly */}
      <div className="absolute inset-0 pointer-events-none" style={{
        opacity: phase >= 4 ? 0 : phase >= 2 ? 0.9 : 0,
        transition: phase >= 4 ? "opacity 0.5s ease" : "opacity 2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        <MeshGradient scale={phase >= 3 ? 1.4 : phase >= 2 ? 0.7 : 0.15} />
      </div>

      {/* Logo bars — chromatic aberration like ElevenLabs || */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{
        opacity: phase >= 2 ? 0 : phase >= 1 ? 1 : 0,
        transition: phase >= 2 ? "opacity 0.6s ease" : "opacity 0.4s ease",
      }}>
        <div className="flex gap-[5px]">
          {[0, 1].map(i => (
            <div key={i} style={{
              width: "7px",
              height: phase >= 1 ? "48px" : "0px",
              background: "#0F0F10",
              borderRadius: "2px",
              transition: `height 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms`,
              boxShadow: phase >= 1
                ? `${i === 0 ? "-4px" : "4px"} 0 16px rgba(${i === 0 ? "134, 239, 225" : "160, 240, 170"}, 0.5), ${i === 0 ? "4px" : "-4px"} 0 16px rgba(${i === 0 ? "240, 190, 220" : "240, 225, 150"}, 0.4)`
                : "none",
            }} />
          ))}
        </div>
      </div>

      {/* Text — wide letter-spacing contracts to normal */}
      <div className="relative z-10" style={{
        opacity: phase >= 4 ? 0 : phase >= 2 ? 1 : 0,
        transition: phase >= 4 ? "opacity 0.4s ease" : "opacity 0.8s ease 0.1s",
      }}>
        <h1 style={{
          fontSize: "clamp(28px, 5vw, 38px)",
          fontWeight: 700,
          color: "#0F0F10",
          letterSpacing: phase >= 3 ? "-0.03em" : "0.3em",
          transition: "letter-spacing 1.6s cubic-bezier(0.16, 1, 0.3, 1)",
          whiteSpace: "nowrap",
          textAlign: "center",
        }}>
          Bridge Fund
        </h1>
        <p style={{
          textAlign: "center",
          fontSize: "14px",
          color: "#787881",
          marginTop: "10px",
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? "translateY(0)" : "translateY(8px)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
        }}>
          Tokenized fund infrastructure
        </p>
      </div>
    </div>
  );
}

/* ── Animated step wrapper — cross-fade between steps ── */
function StepWrapper({ children, stepKey }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => { cancelAnimationFrame(t); setVisible(false); };
  }, [stepKey]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6" key={stepKey}>
      <div className="w-full" style={{
        maxWidth: "520px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        {children}
      </div>
    </div>
  );
}

/* ── Use case illustrated tile (ElevenLabs ref10 — rounded square with gradient icon) ── */
function UseCaseIcon({ type, selected }) {
  const configs = {
    tokenize:   { from: "#EEF2FF", to: "#E0E7FF", accent: "#6366F1", icon: <><circle cx="16" cy="16" r="8" fill="#6366F1" opacity="0.15"/><circle cx="16" cy="16" r="5" fill="#6366F1"/><path d="M14 16l1.2 1.2 2.6-2.6" stroke="white" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></> },
    subscribe:  { from: "#FEF3C7", to: "#FDE68A", accent: "#F59E0B", icon: <><rect x="8" y="9" width="16" height="14" rx="2.5" fill="#F59E0B" opacity="0.2"/><rect x="11" y="13" width="10" height="1.5" rx="0.75" fill="#F59E0B" opacity="0.5"/><rect x="11" y="17" width="7" height="1.5" rx="0.75" fill="#F59E0B" opacity="0.4"/><rect x="11" y="21" width="5" height="2.5" rx="1.25" fill="#F59E0B"/></> },
    kyc:        { from: "#ECFDF5", to: "#D1FAE5", accent: "#059669", icon: <><rect x="7" y="10" width="18" height="12" rx="2.5" fill="#059669" opacity="0.2"/><circle cx="14" cy="15" r="2.5" fill="#059669" opacity="0.4"/><circle cx="23" cy="21" r="4" fill="#059669"/><path d="M21.5 21l1 1 2.2-2.2" stroke="white" strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round"/></> },
    dashboard:  { from: "#FFF1F2", to: "#FFE4E6", accent: "#F43F5E", icon: <><rect x="7" y="19" width="4" height="5" rx="1" fill="#F43F5E" opacity="0.3"/><rect x="13" y="15" width="4" height="9" rx="1" fill="#F43F5E" opacity="0.5"/><rect x="19" y="11" width="4" height="13" rx="1" fill="#F43F5E" opacity="0.7"/><rect x="25" y="7" width="4" height="17" rx="1" fill="#F43F5E"/></> },
    blockchain: { from: "#F0F9FF", to: "#E0F2FE", accent: "#0EA5E9", icon: <><rect x="5" y="13" width="7" height="7" rx="1.5" fill="#0EA5E9" opacity="0.25"/><rect x="14" y="12" width="7" height="9" rx="1.5" fill="#0EA5E9" opacity="0.5"/><rect x="23" y="13" width="7" height="7" rx="1.5" fill="#0EA5E9"/><line x1="12" y1="16.5" x2="14" y2="16.5" stroke="#0EA5E9" strokeWidth="1.2" opacity="0.5"/><line x1="21" y1="16.5" x2="23" y2="16.5" stroke="#0EA5E9" strokeWidth="1.2" opacity="0.5"/></> },
    defi:       { from: "#F5F3FF", to: "#EDE9FE", accent: "#8B5CF6", icon: <><circle cx="16" cy="16" r="9" fill="#8B5CF6" opacity="0.12"/><circle cx="16" cy="16" r="5" fill="#8B5CF6" opacity="0.25"/><path d="M14 16h4M16 14v4" stroke="#7C3AED" strokeWidth="1.3" strokeLinecap="round"/></> },
  };
  const c = configs[type];
  if (!c) return null;
  return (
    <div className="w-14 h-14 rounded-[14px] flex items-center justify-center mx-auto relative overflow-hidden transition-transform duration-200" style={{
      background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
      transform: selected ? "scale(1.08)" : "scale(1)",
    }}>
      <svg viewBox="0 0 32 32" className="w-7 h-7 relative z-10">{c.icon}</svg>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN ONBOARDING
   ══════════════════════════════════════════ */
export default function Onboarding({ onComplete, onLogin, onSignup }) {
  const [step, setStep] = useState("intro");
  const [portal, setPortal] = useState(null);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [investorType, setInvestorType] = useState("Professionnel");
  const [useCases, setUseCases] = useState([]);

  const finish = () => {
    localStorage.setItem("bf_onboarding_seen", "1");
    localStorage.setItem("bf_signup_prefill", JSON.stringify({
      name: name || "",
      company: company || "",
      investorType,
      portal: portal || "investor",
      useCases,
    }));
    onSignup?.();
  };
  const skip = () => { localStorage.setItem("bf_onboarding_seen", "1"); onComplete?.(); };
  const toggleUseCase = (id) => setUseCases(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  /* ── INTRO ── */
  if (step === "intro") {
    return <LogoIntro onDone={() => setStep("portal")} />;
  }

  /* ── STEP 1: Choose portal ── */
  if (step === "portal") {
    const portals = [
      { id: "investor", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label: "Investisseur", desc: "Souscrivez et suivez vos fonds", features: ["Catalogue fonds", "Souscription", "KYC integre", "Suivi portfolio", "Tokens on-chain", "Paiement crypto"] },
      { id: "manager", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/></svg>, label: "Gestionnaire", desc: "Gerez et validez les operations", features: ["Validation ordres", "Gestion fonds", "Compliance", "Vault tokens", "Audit trail", "Reporting"] },
    ];
    return (
      <StepWrapper stepKey="portal">
        <h1 className="text-[22px] font-bold text-[#0F0F10] text-center tracking-tight">Choisissez votre portail</h1>
        <p className="text-[14px] text-[#787881] text-center mt-1.5 mb-8">Vous pourrez changer a tout moment</p>

        <div className="grid grid-cols-2 gap-5 mb-10">
          {portals.map(p => (
            <div key={p.id} onClick={() => setPortal(p.id)}
              className={`cursor-pointer rounded-xl p-5 transition-all duration-150 ${
                portal === p.id
                  ? "bg-[rgba(0,0,23,0.04)] ring-2 ring-[#0F0F10]"
                  : "hover:bg-[rgba(0,0,23,0.02)]"
              }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors duration-150 ${
                portal === p.id ? "bg-[#0F0F10] text-white" : "bg-[rgba(0,0,23,0.06)] text-[#787881]"
              }`}>{p.icon}</div>
              <p className="text-[15px] font-semibold text-[#0F0F10] mb-0.5">{p.label}</p>
              <p className="text-[13px] text-[#787881] mb-4">{p.desc}</p>
              <div className="space-y-1.5">
                {p.features.map(f => (
                  <p key={f} className="text-[12px] text-[#A8A29E] flex items-center gap-1.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg>
                    {f}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between">
          <button onClick={skip} className="text-[13px] text-[#A8A29E] hover:text-[#787881] transition-colors">Passer</button>
          <button onClick={() => portal && setStep("personalize")} disabled={!portal}
            className="px-5 py-2 bg-[#0F0F10] text-white text-[13px] font-medium rounded-full hover:bg-[#292524] active:scale-[0.97] transition-all duration-100 disabled:opacity-25 disabled:cursor-not-allowed">
            Continuer
          </button>
        </div>
      </StepWrapper>
    );
  }

  /* ── STEP 2: Personalize (ElevenLabs ref8 — minimal, no card) ── */
  if (step === "personalize") {
    return (
      <StepWrapper stepKey="personalize">
        <h1 className="text-[22px] font-bold text-[#0F0F10] tracking-tight mb-8">Personnalisez votre experience</h1>

        <div className="space-y-6">
          <div>
            <label className="block text-[13px] font-medium text-[#0F0F10] mb-2">Comment vous appelez-vous ? <span className="text-[#C4C0BB] font-normal">(optionnel)</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={iCls} placeholder="Votre nom" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#0F0F10] mb-2">Societe <span className="text-[#C4C0BB] font-normal">(optionnel)</span></label>
            <input type="text" value={company} onChange={e => setCompany(e.target.value)} className={iCls} placeholder="Nom de votre societe" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#0F0F10] mb-2">Type d'investisseur</label>
            <select value={investorType} onChange={e => setInvestorType(e.target.value)}
              className={iCls + " appearance-none cursor-pointer"}>
              <option value="Professionnel">Investisseur professionnel</option>
              <option value="Averti">Investisseur averti</option>
              <option value="Institutionnel">Institutionnel</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-10">
          <div className="flex gap-5">
            <button onClick={() => setStep("portal")} className="text-[13px] text-[#A8A29E] hover:text-[#787881] transition-colors">Retour</button>
            <button onClick={skip} className="text-[13px] text-[#A8A29E] hover:text-[#787881] transition-colors">Passer</button>
          </div>
          <button onClick={() => setStep("usecases")}
            className="px-5 py-2 bg-[#0F0F10] text-white text-[13px] font-medium rounded-full hover:bg-[#292524] active:scale-[0.97] transition-all duration-100">
            Suivant
          </button>
        </div>
      </StepWrapper>
    );
  }

  /* ── STEP 3: Use cases (ElevenLabs ref10 — illustrated grid, no border cards) ── */
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
      <StepWrapper stepKey="usecases">
        <h1 className="text-[22px] font-bold text-[#0F0F10] text-center tracking-tight">Que souhaitez-vous faire ?</h1>
        <p className="text-[14px] text-[#787881] text-center mt-1.5 mb-8">Selectionnez tout ce qui s'applique</p>

        <div className="grid grid-cols-3 gap-3 mb-10">
          {cases.map((c, i) => {
            const sel = useCases.includes(c.id);
            return (
              <div key={c.id} onClick={() => toggleUseCase(c.id)}
                className={`cursor-pointer rounded-xl py-5 px-3 text-center transition-all duration-150 ${
                  sel ? "bg-[rgba(0,0,23,0.045)] ring-1 ring-[#0F0F10]" : "hover:bg-[rgba(0,0,23,0.02)]"
                }`}
                style={{ animation: `fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${i * 40}ms both` }}>
                <UseCaseIcon type={c.id} selected={sel} />
                <p className="text-[12px] font-medium text-[#0F0F10] mt-2.5 leading-tight">{c.label}</p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-5">
            <button onClick={() => setStep("personalize")} className="text-[13px] text-[#A8A29E] hover:text-[#787881] transition-colors">Retour</button>
            <button onClick={skip} className="text-[13px] text-[#A8A29E] hover:text-[#787881] transition-colors">Passer</button>
          </div>
          <button onClick={finish}
            className="px-5 py-2 bg-[#0F0F10] text-white text-[13px] font-medium rounded-full hover:bg-[#292524] active:scale-[0.97] transition-all duration-100">
            Creer mon compte
          </button>
        </div>
      </StepWrapper>
    );
  }

  return null;
}
