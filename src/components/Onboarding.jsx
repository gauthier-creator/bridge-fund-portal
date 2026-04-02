import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { generateWallet } from "../services/cardanoService";
import MeshGradient from "./MeshGradient";

/* ═══════════════════════════════════════════════════════════════════
   Onboarding — Single unified tunnel (ElevenLabs-style)
   No separate signup page — everything flows step by step.
   intro → portal → personalize → hearabout → usecases → account → creating → done
   ═══════════════════════════════════════════════════════════════════ */

const iCls = "w-full h-10 bg-white border border-[rgba(0,0,29,0.12)] rounded-lg px-3 text-[14px] text-[#0F0F10] placeholder-[#C4C0BB] focus:outline-none focus:border-[#0F0F10] focus:ring-1 focus:ring-[#0F0F10] transition-all duration-150";

/* ── Intro animation ── */
function LogoIntro({ onDone }) {
  const [phase, setPhase] = useState(0);
  const done = useCallback(onDone, [onDone]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1100),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => setPhase(4), 3600),
      setTimeout(done, 4200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [done]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden cursor-pointer select-none" onClick={done}>
      <div className="absolute inset-0 pointer-events-none" style={{
        opacity: phase >= 4 ? 0 : phase >= 2 ? 0.9 : 0,
        transition: phase >= 4 ? "opacity 0.5s ease" : "opacity 2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        <MeshGradient scale={phase >= 3 ? 1.4 : phase >= 2 ? 0.7 : 0.15} />
      </div>

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
                ? `${i === 0 ? "-4px" : "4px"} 0 16px rgba(${i === 0 ? "134,239,225" : "160,240,170"}, 0.5), ${i === 0 ? "4px" : "-4px"} 0 16px rgba(${i === 0 ? "240,190,220" : "240,225,150"}, 0.4)`
                : "none",
            }} />
          ))}
        </div>
      </div>

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

/* ── Step transition wrapper ── */
function StepView({ children }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(t);
  }, []);
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.35s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {children}
      </div>
    </div>
  );
}

/* ── Illustrated tile icons ── */
function UseCaseIcon({ type }) {
  const icons = {
    tokenize:   { bg: "from-indigo-100 to-indigo-50", el: <><circle cx="16" cy="16" r="8" fill="#6366F1" opacity="0.15"/><circle cx="16" cy="16" r="5" fill="#6366F1"/><path d="M14 16l1.2 1.2 2.6-2.6" stroke="white" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></> },
    subscribe:  { bg: "from-amber-100 to-orange-50",  el: <><rect x="8" y="9" width="16" height="14" rx="2.5" fill="#F59E0B" opacity="0.2"/><rect x="11" y="13" width="10" height="1.5" rx=".75" fill="#F59E0B" opacity="0.5"/><rect x="11" y="17" width="7" height="1.5" rx=".75" fill="#F59E0B" opacity="0.4"/><rect x="11" y="21" width="5" height="2.5" rx="1.25" fill="#F59E0B"/></> },
    kyc:        { bg: "from-emerald-100 to-green-50",  el: <><rect x="7" y="10" width="18" height="12" rx="2.5" fill="#059669" opacity="0.2"/><circle cx="14" cy="15" r="2.5" fill="#059669" opacity="0.4"/><circle cx="23" cy="21" r="4" fill="#059669"/><path d="M21.5 21l1 1 2.2-2.2" stroke="white" strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round"/></> },
    dashboard:  { bg: "from-pink-100 to-rose-50",     el: <><rect x="7" y="19" width="4" height="5" rx="1" fill="#F43F5E" opacity="0.3"/><rect x="13" y="15" width="4" height="9" rx="1" fill="#F43F5E" opacity="0.5"/><rect x="19" y="11" width="4" height="13" rx="1" fill="#F43F5E" opacity="0.7"/><rect x="25" y="7" width="4" height="17" rx="1" fill="#F43F5E"/></> },
    blockchain: { bg: "from-sky-100 to-cyan-50",      el: <><rect x="5" y="13" width="7" height="7" rx="1.5" fill="#0EA5E9" opacity="0.25"/><rect x="14" y="12" width="7" height="9" rx="1.5" fill="#0EA5E9" opacity="0.5"/><rect x="23" y="13" width="7" height="7" rx="1.5" fill="#0EA5E9"/><line x1="12" y1="16.5" x2="14" y2="16.5" stroke="#0EA5E9" strokeWidth="1.2" opacity="0.5"/><line x1="21" y1="16.5" x2="23" y2="16.5" stroke="#0EA5E9" strokeWidth="1.2" opacity="0.5"/></> },
    defi:       { bg: "from-violet-100 to-purple-50",  el: <><circle cx="16" cy="16" r="9" fill="#8B5CF6" opacity="0.12"/><circle cx="16" cy="16" r="5" fill="#8B5CF6" opacity="0.25"/><path d="M14 16h4M16 14v4" stroke="#7C3AED" strokeWidth="1.3" strokeLinecap="round"/></> },
    reporting:  { bg: "from-teal-100 to-teal-50",     el: <><rect x="7" y="8" width="18" height="16" rx="2.5" fill="#14B8A6" opacity="0.2"/><path d="M11 18l3-4 3 2 4-5" stroke="#14B8A6" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></> },
    collateral: { bg: "from-orange-100 to-yellow-50",  el: <><circle cx="16" cy="16" r="9" fill="#EA580C" opacity="0.12"/><path d="M12 16l2.5 2.5 5-5" stroke="#EA580C" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/><circle cx="16" cy="16" r="5" fill="#EA580C" opacity="0.1"/></> },
  };
  const c = icons[type];
  if (!c) return null;
  return (
    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${c.bg} flex items-center justify-center relative overflow-hidden`}>
      <svg viewBox="0 0 32 32" className="w-8 h-8 relative z-10">{c.el}</svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN ONBOARDING — unified tunnel with account creation
   ══════════════════════════════════════════════════════════════════ */
export default function Onboarding({ onComplete, onLogin }) {
  const { signIn } = useAuth();
  const [step, setStep] = useState("intro");

  // Collected data across all steps
  const [portal, setPortal] = useState(null);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [investorType, setInvestorType] = useState("Professionnel");
  const [acceptAge, setAcceptAge] = useState(false);
  const [acceptComm, setAcceptComm] = useState(false);
  const [hearAbout, setHearAbout] = useState([]);
  const [useCases, setUseCases] = useState([]);

  // Account step
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState(null);

  // Creating step
  const [statusMsg, setStatusMsg] = useState("");
  const [completedSteps, setCompletedSteps] = useState([]);

  const markDone = (key) => setCompletedSteps(prev => [...prev, key]);

  const toggleList = (list, setList, id) =>
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const skip = () => { localStorage.setItem("bf_onboarding_seen", "1"); onComplete?.(); };

  /* ── Account creation ── */
  const handleCreateAccount = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email invalide"); return;
    }
    if (password.length < 6) {
      setError("6 caracteres minimum"); return;
    }
    if (!acceptTerms) {
      setError("Veuillez accepter les conditions"); return;
    }

    setError(null);
    setStep("creating");

    try {
      setStatusMsg("Creation du compte...");
      if (!supabase) throw new Error("Supabase non configure");

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, role: "investor" } },
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("Erreur lors de la creation du compte");
      markDone("compte");

      setStatusMsg("Configuration du profil...");
      let profileReady = false;
      for (let i = 0; i < 15; i++) {
        const { data } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
        if (data) { profileReady = true; break; }
        await new Promise((r) => setTimeout(r, 500));
      }

      if (profileReady) {
        await supabase.from("profiles").update({
          full_name: name || null,
          company: company || null,
          investor_type: investorType,
          role: portal === "manager" ? "intermediary" : "investor",
          updated_at: new Date().toISOString(),
        }).eq("id", userId);
      }
      markDone("profil");

      setStatusMsg("Generation du wallet Cardano...");
      try {
        const wallet = await generateWallet();
        if (wallet?.address) {
          await supabase.from("profiles").update({ wallet_address: wallet.address }).eq("id", userId);
        }
      } catch (e) {
        console.warn("Wallet generation failed (non-blocking):", e);
      }
      markDone("wallet");

      setStatusMsg("Connexion automatique...");
      await signIn(email, password);
      markDone("connexion");

      localStorage.setItem("bf_onboarding_seen", "1");
      setStep("done");
      setStatusMsg("Bienvenue sur Bridge Fund !");

    } catch (err) {
      console.error("Signup error:", err);
      let msg = err.message;
      if (msg.includes("already registered")) msg = "Un compte existe deja avec cet email";
      if (msg.includes("rate limit")) msg = "Trop de tentatives, veuillez patienter";
      setError(msg);
      setStep("account");
      setStatusMsg("");
      setCompletedSteps([]);
    }
  };

  /* ── Step 0: INTRO ── */
  if (step === "intro") {
    return <LogoIntro onDone={() => setStep("portal")} />;
  }

  /* ── Step 1: Choose portal ── */
  if (step === "portal") {
    const portals = [
      {
        id: "investor",
        icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/></svg>,
        label: "Investisseur",
        desc: "Souscrivez et suivez vos investissements",
        features: ["Catalogue fonds", "Souscription directe", "KYC integre", "Portfolio & NAV", "Tokens on-chain", "Wallet Cardano"],
      },
      {
        id: "manager",
        icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
        label: "Gestionnaire",
        desc: "Gerez et validez les operations du fonds",
        features: ["Validation ordres", "Gestion fonds", "Compliance & KYC", "Vault tokens", "Audit trail", "Reporting NAV"],
      },
    ];

    return (
      <StepView key="portal">
        <div className="w-full max-w-[600px]">
          <h1 className="text-[22px] font-bold text-[#0F0F10] text-center tracking-tight">Choisissez votre portail</h1>
          <p className="text-[14px] text-[#787881] text-center mt-1 mb-8">Basculez entre les portails a tout moment</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {portals.map(p => {
              const sel = portal === p.id;
              return (
                <div key={p.id} onClick={() => setPortal(p.id)}
                  className={`cursor-pointer rounded-xl border p-5 transition-all duration-150 ${
                    sel
                      ? "border-[#0F0F10] bg-white shadow-[0_0_0_1px_rgba(15,15,16,0.08)]"
                      : "border-[rgba(0,0,29,0.1)] bg-white hover:border-[rgba(0,0,29,0.2)]"
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-150 ${
                    sel ? "bg-[#0F0F10] text-white" : "bg-[rgba(0,0,23,0.04)] text-[#787881]"
                  }`}>{p.icon}</div>
                  <p className="text-[15px] font-semibold text-[#0F0F10]">{p.label}</p>
                  <p className="text-[12px] text-[#787881] mb-4">{p.desc}</p>
                  <p className="text-[10px] font-medium text-[#A8A29E] uppercase tracking-wider mb-2">Fonctionnalites</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    {p.features.map(f => (
                      <p key={f} className="text-[11px] text-[#787881] flex items-center gap-1.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg>
                        {f}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center">
            <button onClick={() => portal && setStep("personalize")} disabled={!portal}
              className="px-8 py-2.5 bg-[#0F0F10] text-white text-[14px] font-medium rounded-full hover:bg-[#292524] active:scale-[0.97] transition-all duration-100 disabled:opacity-25 disabled:cursor-not-allowed">
              Continuer
            </button>
          </div>
        </div>
      </StepView>
    );
  }

  /* ── Step 2: Personalize ── */
  if (step === "personalize") {
    return (
      <StepView key="personalize">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[22px] font-bold text-[#0F0F10] tracking-tight mb-6">Personnalisez votre experience</h1>

          <div className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-[#0F0F10] mb-1.5">Comment vous appelez-vous ? <span className="text-[#A8A29E] font-normal">(optionnel)</span></label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={iCls} placeholder="Votre nom" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#0F0F10] mb-1.5">Societe <span className="text-[#A8A29E] font-normal">(optionnel)</span></label>
              <input type="text" value={company} onChange={e => setCompany(e.target.value)} className={iCls} placeholder="Nom de votre societe" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#0F0F10] mb-1.5">Type d'investisseur</label>
              <select value={investorType} onChange={e => setInvestorType(e.target.value)} className={iCls + " appearance-none cursor-pointer"}>
                <option value="Professionnel">Investisseur professionnel</option>
                <option value="Averti">Investisseur averti</option>
                <option value="Institutionnel">Institutionnel</option>
              </select>
            </div>

            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={acceptAge} onChange={e => setAcceptAge(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[#D6D3D1] accent-[#0F0F10]" />
                <span className="text-[12px] text-[#787881] leading-relaxed">
                  En cochant cette case, vous confirmez avoir atteint l'age legal requis (ou l'age de la majorite dans votre pays de residence).
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={acceptComm} onChange={e => setAcceptComm(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[#D6D3D1] accent-[#0F0F10]" />
                <span className="text-[12px] text-[#787881] leading-relaxed">
                  Je souhaite recevoir des mises a jour, offres speciales et emails promotionnels de Bridge Fund.
                </span>
              </label>
            </div>
          </div>

          <div className="mt-8">
            <button onClick={() => setStep("hearabout")}
              className="px-8 py-2.5 bg-[#0F0F10] text-white text-[14px] font-medium rounded-full hover:bg-[#292524] active:scale-[0.97] transition-all duration-100">
              Suivant
            </button>
          </div>
        </div>
      </StepView>
    );
  }

  /* ── Step 3: How did you hear ── */
  if (step === "hearabout") {
    const sources = [
      { id: "chatgpt", icon: "💬", label: "ChatGPT, Claude, etc." },
      { id: "podcast", icon: "🎙", label: "Podcast" },
      { id: "travail", icon: "💼", label: "Du travail" },
      { id: "actualites", icon: "📰", label: "Dans les actualites" },
      { id: "newsletter", icon: "📧", label: "Newsletter ou Blog" },
      { id: "amis", icon: "👥", label: "Amis ou Ecole" },
      { id: "x", label: "X", iconSvg: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
      { id: "tiktok", icon: "🎵", label: "TikTok" },
      { id: "instagram", icon: "📷", label: "Instagram" },
      { id: "linkedin", icon: "💼", label: "LinkedIn" },
      { id: "google", icon: "🔍", label: "Google" },
      { id: "autre", icon: "···", label: "Autre" },
    ];

    return (
      <StepView key="hearabout">
        <div className="w-full max-w-[520px]">
          <h1 className="text-[22px] font-bold text-[#0F0F10] tracking-tight mb-8">Comment avez-vous entendu parler de Bridge Fund ?</h1>

          <div className="grid grid-cols-4 gap-2.5 mb-8">
            {sources.map(s => {
              const sel = hearAbout.includes(s.id);
              return (
                <button key={s.id} onClick={() => toggleList(hearAbout, setHearAbout, s.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[12px] font-medium transition-all duration-100 ${
                    sel
                      ? "border-[#0F0F10] bg-[rgba(0,0,23,0.04)] text-[#0F0F10]"
                      : "border-[rgba(0,0,29,0.1)] text-[#787881] hover:border-[rgba(0,0,29,0.2)] hover:text-[#0F0F10]"
                  }`}>
                  {s.iconSvg || <span className="text-[14px]">{s.icon}</span>}
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-5">
            <button onClick={() => setStep("personalize")} className="text-[13px] text-[#787881] hover:text-[#0F0F10] transition-colors">Retour</button>
            <button onClick={() => setStep("usecases")} className="text-[13px] text-[#787881] hover:text-[#0F0F10] transition-colors">Passer cette etape</button>
          </div>
        </div>
      </StepView>
    );
  }

  /* ── Step 4: Use cases ── */
  if (step === "usecases") {
    const cases = [
      { id: "tokenize", label: "Tokeniser des fonds" },
      { id: "subscribe", label: "Souscrire a des fonds" },
      { id: "kyc", label: "KYC & Compliance" },
      { id: "dashboard", label: "Suivi portfolio" },
      { id: "blockchain", label: "Verification on-chain" },
      { id: "defi", label: "DeFi & Collateral" },
      { id: "reporting", label: "Reporting & NAV" },
      { id: "collateral", label: "Collateralisation" },
    ];

    return (
      <StepView key="usecases">
        <div className="w-full max-w-[540px]">
          <h1 className="text-[22px] font-bold text-[#0F0F10] tracking-tight">Que souhaitez-vous faire avec Bridge Fund ?</h1>
          <p className="text-[13px] text-[#787881] mt-1 mb-8">Selectionnez tout ce qui s'applique</p>

          <div className="grid grid-cols-4 gap-3 mb-8">
            {cases.map((c, i) => {
              const sel = useCases.includes(c.id);
              return (
                <div key={c.id} onClick={() => toggleList(useCases, setUseCases, c.id)}
                  className={`cursor-pointer rounded-2xl py-4 px-2 text-center transition-all duration-150 ${
                    sel ? "bg-[rgba(0,0,23,0.05)] ring-1 ring-[rgba(0,0,29,0.15)]" : "hover:bg-[rgba(0,0,23,0.02)]"
                  }`}
                  style={{ animation: `fadeInUp 0.3s cubic-bezier(0.16,1,0.3,1) ${i * 40}ms both` }}>
                  <div className="flex justify-center mb-2.5">
                    <UseCaseIcon type={c.id} />
                  </div>
                  <p className="text-[11px] font-medium text-[#0F0F10] leading-tight">{c.label}</p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button onClick={() => setStep("hearabout")} className="text-[13px] text-[#787881] hover:text-[#0F0F10] transition-colors">Retour</button>
              <button onClick={() => setStep("account")} className="text-[13px] text-[#787881] hover:text-[#0F0F10] transition-colors">Passer</button>
            </div>
            <button onClick={() => setStep("account")}
              className="px-8 py-2.5 bg-[#0F0F10] text-white text-[14px] font-medium rounded-full hover:bg-[#292524] active:scale-[0.97] transition-all duration-100">
              Creer mon compte
            </button>
          </div>
        </div>
      </StepView>
    );
  }

  /* ── Step 5: Account — email + password only (no repetition) ── */
  if (step === "account") {
    return (
      <StepView key="account">
        <div className="w-full max-w-[380px]">
          <h1 className="text-[22px] font-bold text-[#0F0F10] tracking-tight mb-1">Creez votre compte</h1>
          <p className="text-[14px] text-[#787881] mb-8">Plus qu'une etape pour acceder a Bridge Fund</p>

          <div className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-[#0F0F10] mb-1.5">Email professionnel</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className={iCls} placeholder="nom@entreprise.com" autoFocus />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#0F0F10] mb-1.5">Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className={iCls} placeholder="6 caracteres minimum"
                onKeyDown={e => { if (e.key === "Enter" && acceptTerms) handleCreateAccount(); }} />
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-[#D6D3D1] accent-[#0F0F10]" />
              <span className="text-[12px] text-[#A8A29E] leading-relaxed">
                J'accepte les <span className="text-[#0F0F10] font-medium">conditions generales</span> et
                la <span className="text-[#0F0F10] font-medium">politique de confidentialite</span> de Bridge Fund.
              </span>
            </label>

            {error && (
              <div className="flex items-center gap-2 text-[13px] text-[#DC2626]">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-8">
            <button onClick={() => setStep("usecases")} className="text-[13px] text-[#787881] hover:text-[#0F0F10] transition-colors">Retour</button>
            <button onClick={handleCreateAccount}
              disabled={!email || !password || !acceptTerms}
              className="px-8 py-2.5 bg-[#0F0F10] text-white text-[14px] font-medium rounded-full hover:bg-[#292524] active:scale-[0.97] transition-all duration-100 disabled:opacity-25 disabled:cursor-not-allowed">
              Creer mon compte
            </button>
          </div>

          <p className="text-[13px] text-[#A8A29E] mt-6">
            Deja un compte ?{" "}
            <button onClick={onLogin} className="text-[#0F0F10] font-medium hover:underline">Se connecter</button>
          </p>
        </div>
      </StepView>
    );
  }

  /* ── Step 6: Creating / Done ── */
  if (step === "creating" || step === "done") {
    const progressSteps = [
      { key: "compte", label: "Creation du compte" },
      { key: "profil", label: "Configuration du profil" },
      { key: "wallet", label: "Generation du wallet" },
      { key: "connexion", label: "Connexion automatique" },
    ];

    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-[360px] w-full text-center" style={{
          animation: "fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}>
          {step === "done" ? (
            <>
              <div className="w-12 h-12 rounded-full bg-[#059669] flex items-center justify-center mx-auto mb-5">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-[20px] font-bold text-[#0F0F10] tracking-tight mb-1.5">Bienvenue sur Bridge Fund</h2>
              <p className="text-[14px] text-[#787881]">Votre compte a ete cree. Redirection...</p>
            </>
          ) : (
            <>
              <div className="w-8 h-8 border-[1.5px] border-[rgba(0,0,29,0.1)] border-t-[#0F0F10] rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-[18px] font-semibold text-[#0F0F10] tracking-tight mb-1">Creation en cours</h2>
              <p className="text-[13px] text-[#787881] mb-8">{statusMsg}</p>
              <div className="space-y-3 text-left max-w-[220px] mx-auto">
                {progressSteps.map((s) => {
                  const done = completedSteps.includes(s.key);
                  const active = !done && statusMsg.toLowerCase().includes(s.label.toLowerCase().slice(0, 8));
                  return (
                    <div key={s.key} className={`flex items-center gap-3 text-[13px] transition-colors duration-200 ${done ? "text-[#059669]" : active ? "text-[#0F0F10] font-medium" : "text-[#D6D3D1]"}`}>
                      {done ? (
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : active ? (
                        <div className="w-4 h-4 border-[1.5px] border-[rgba(0,0,29,0.1)] border-t-[#0F0F10] rounded-full animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-[#E5E5E5] flex-shrink-0" />
                      )}
                      {s.label}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
