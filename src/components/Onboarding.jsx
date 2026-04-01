import { useState, useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════════════════════
   Onboarding Flow — ElevenLabs-inspired
   Premium animated intro + multi-step signup funnel
   ══════════════════════════════════════════════════════════════════ */

/* ── Animated 3D metallic orb (pure CSS + SVG) ── */
function AnimatedOrb() {
  return (
    <div className="relative w-[200px] h-[200px]" style={{ animation: "orbFloat 6s ease-in-out infinite" }}>
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full" style={{
        background: "radial-gradient(circle, rgba(79,125,243,0.15) 0%, transparent 70%)",
        animation: "breathe 4s ease-in-out infinite",
      }} />
      {/* Main orb */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full" style={{ animation: "orbSpin 12s linear infinite" }}>
        <defs>
          <linearGradient id="orbGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00B4D8" />
            <stop offset="30%" stopColor="#4F7DF3" />
            <stop offset="60%" stopColor="#0077B6" />
            <stop offset="100%" stopColor="#00C48C" />
          </linearGradient>
          <linearGradient id="orbGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#90E0EF" />
            <stop offset="50%" stopColor="#4F7DF3" />
            <stop offset="100%" stopColor="#023E8A" />
          </linearGradient>
          <radialGradient id="orbSheen" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="orbBlur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" />
          </filter>
        </defs>
        {/* Base circle */}
        <circle cx="100" cy="100" r="80" fill="url(#orbGrad1)" opacity="0.9" />
        {/* Rotating facets */}
        <ellipse cx="100" cy="100" rx="78" ry="60" fill="url(#orbGrad2)" opacity="0.6"
          style={{ transformOrigin: "center", animation: "orbTilt 8s ease-in-out infinite" }} />
        <ellipse cx="100" cy="100" rx="60" ry="78" fill="url(#orbGrad1)" opacity="0.3"
          style={{ transformOrigin: "center", animation: "orbTilt 8s ease-in-out infinite reverse" }} />
        {/* Sheen overlay */}
        <circle cx="100" cy="100" r="78" fill="url(#orbSheen)" />
        {/* Inner ring */}
        <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      </svg>
      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 bg-[#0F0F10] rounded-full flex items-center justify-center shadow-lg"
          style={{ animation: "scaleIn 0.6s cubic-bezier(0.16,1,0.3,1) 0.5s both" }}>
          <span className="text-white font-bold text-[14px] tracking-wider">BF</span>
        </div>
      </div>
    </div>
  );
}

/* ── Premium Illustration SVGs — Fintech-grade ── */
function IllustrationTokenize() {
  return (
    <svg viewBox="0 0 120 120" className="w-24 h-24">
      <defs>
        <linearGradient id="tokG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F7DF3" />
          <stop offset="100%" stopColor="#00C48C" />
        </linearGradient>
        <filter id="tokSh"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" /></filter>
      </defs>
      {/* Card */}
      <rect x="12" y="20" width="96" height="72" rx="14" fill="white" filter="url(#tokSh)" />
      <rect x="12" y="20" width="96" height="72" rx="14" fill="none" stroke="#E8ECF1" strokeWidth="0.5" />
      {/* Header bar */}
      <rect x="12" y="20" width="96" height="20" rx="14" fill="url(#tokG)" opacity="0.06" />
      <rect x="12" y="34" width="96" height="1" fill="#F0F2F5" />
      <circle cx="26" cy="30" r="4" fill="url(#tokG)" opacity="0.2" />
      <rect x="34" y="28" width="28" height="4" rx="2" fill="url(#tokG)" opacity="0.15" />
      {/* Content rows */}
      <rect x="24" y="44" width="40" height="3" rx="1.5" fill="#E8ECF1" />
      <rect x="24" y="52" width="32" height="3" rx="1.5" fill="#F0F2F5" />
      <rect x="24" y="60" width="36" height="3" rx="1.5" fill="#F0F2F5" />
      {/* Token badge */}
      <rect x="68" y="42" width="32" height="26" rx="8" fill="url(#tokG)" opacity="0.08" />
      <circle cx="84" cy="52" r="9" fill="url(#tokG)" opacity="0.15" />
      <circle cx="84" cy="52" r="6" fill="url(#tokG)" opacity="0.9" />
      <path d="M81 52l2 2 4-4" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bottom action */}
      <rect x="24" y="72" width="44" height="10" rx="5" fill="url(#tokG)" />
      <text x="46" y="79.5" fill="white" fontSize="5.5" fontWeight="600" textAnchor="middle" fontFamily="system-ui">Tokeniser</text>
    </svg>
  );
}

function IllustrationKYC() {
  return (
    <svg viewBox="0 0 120 120" className="w-24 h-24">
      <defs>
        <linearGradient id="kycG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
        <filter id="kycSh"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" /></filter>
      </defs>
      {/* ID Card */}
      <rect x="12" y="24" width="96" height="64" rx="14" fill="white" filter="url(#kycSh)" />
      <rect x="12" y="24" width="96" height="64" rx="14" fill="none" stroke="#E8ECF1" strokeWidth="0.5" />
      {/* Photo area */}
      <rect x="22" y="34" width="30" height="36" rx="8" fill="#F5F3F1" />
      <circle cx="37" cy="46" r="7" fill="url(#kycG)" opacity="0.12" />
      <circle cx="37" cy="44" r="4.5" fill="url(#kycG)" opacity="0.25" />
      <path d="M28 58c0-5 4-8 9-8s9 3 9 8" fill="url(#kycG)" opacity="0.15" />
      {/* Info lines */}
      <rect x="60" y="36" width="38" height="3.5" rx="1.75" fill="#E0E4E9" />
      <rect x="60" y="44" width="30" height="3.5" rx="1.75" fill="#F0F2F5" />
      <rect x="60" y="52" width="34" height="3.5" rx="1.75" fill="#F0F2F5" />
      <rect x="60" y="60" width="26" height="3.5" rx="1.75" fill="#F0F2F5" />
      {/* Verified badge */}
      <circle cx="92" cy="78" r="11" fill="url(#kycG)" opacity="0.1" />
      <circle cx="92" cy="78" r="7.5" fill="url(#kycG)" />
      <path d="M88.5 78l2.5 2.5 5-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Scan line animation hint */}
      <rect x="22" y="72" width="30" height="1" rx="0.5" fill="url(#kycG)" opacity="0.3" />
    </svg>
  );
}

function IllustrationDashboard() {
  return (
    <svg viewBox="0 0 120 120" className="w-24 h-24">
      <defs>
        <linearGradient id="dshG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F7DF3" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
        <filter id="dshSh"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" /></filter>
      </defs>
      {/* Main card */}
      <rect x="12" y="16" width="96" height="80" rx="14" fill="white" filter="url(#dshSh)" />
      <rect x="12" y="16" width="96" height="80" rx="14" fill="none" stroke="#E8ECF1" strokeWidth="0.5" />
      {/* KPI row */}
      <rect x="22" y="26" width="26" height="18" rx="6" fill="url(#dshG)" opacity="0.06" />
      <text x="35" y="34" fill="#4F7DF3" fontSize="4" fontWeight="600" textAnchor="middle" fontFamily="system-ui" opacity="0.6">VNI</text>
      <text x="35" y="40.5" fill="#0F0F10" fontSize="5.5" fontWeight="700" textAnchor="middle" fontFamily="system-ui">1,247€</text>
      <rect x="52" y="26" width="26" height="18" rx="6" fill="#F7F8FA" />
      <text x="65" y="34" fill="#787881" fontSize="4" fontWeight="500" textAnchor="middle" fontFamily="system-ui">AUM</text>
      <text x="65" y="40.5" fill="#0F0F10" fontSize="5.5" fontWeight="700" textAnchor="middle" fontFamily="system-ui">42M€</text>
      <rect x="82" y="26" width="18" height="18" rx="6" fill="#ECFDF5" />
      <text x="91" y="37" fill="#059669" fontSize="6" fontWeight="700" textAnchor="middle">↑</text>
      {/* Chart area */}
      <rect x="22" y="50" width="78" height="36" rx="8" fill="#FAFBFC" />
      {/* Smooth line chart */}
      <path d="M28 78 L38 72 L48 74 L58 65 L68 60 L78 56 L88 50 L94 48" fill="none" stroke="url(#dshG)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 78 L38 72 L48 74 L58 65 L68 60 L78 56 L88 50 L94 48 L94 82 L28 82 Z" fill="url(#dshG)" opacity="0.06" />
      {/* Chart dots */}
      <circle cx="58" cy="65" r="2.5" fill="url(#dshG)" />
      <circle cx="58" cy="65" r="5" fill="url(#dshG)" opacity="0.1" />
      <circle cx="88" cy="50" r="2" fill="url(#dshG)" />
    </svg>
  );
}

function IllustrationBlockchain() {
  return (
    <svg viewBox="0 0 120 120" className="w-24 h-24">
      <defs>
        <linearGradient id="chG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0077B6" />
          <stop offset="100%" stopColor="#00B4D8" />
        </linearGradient>
        <filter id="chSh"><feDropShadow dx="0" dy="1.5" stdDeviation="2" floodOpacity="0.06" /></filter>
      </defs>
      {/* Block 1 */}
      <rect x="8" y="38" width="28" height="28" rx="8" fill="white" filter="url(#chSh)" />
      <rect x="8" y="38" width="28" height="28" rx="8" fill="none" stroke="url(#chG)" strokeWidth="0.8" opacity="0.3" />
      <rect x="14" y="44" width="16" height="2" rx="1" fill="url(#chG)" opacity="0.15" />
      <rect x="14" y="48" width="12" height="2" rx="1" fill="#F0F2F5" />
      <rect x="14" y="52" width="14" height="2" rx="1" fill="#F0F2F5" />
      <circle cx="22" cy="60" r="3" fill="url(#chG)" opacity="0.12" />
      {/* Connector 1-2 */}
      <line x1="36" y1="52" x2="44" y2="52" stroke="url(#chG)" strokeWidth="1.5" opacity="0.4" />
      <circle cx="40" cy="52" r="1.5" fill="url(#chG)" opacity="0.3" />
      {/* Block 2 — main */}
      <rect x="44" y="32" width="32" height="36" rx="10" fill="white" filter="url(#chSh)" />
      <rect x="44" y="32" width="32" height="36" rx="10" fill="none" stroke="url(#chG)" strokeWidth="1" opacity="0.5" />
      <rect x="44" y="32" width="32" height="12" rx="10" fill="url(#chG)" opacity="0.06" />
      <rect x="44" y="42" width="32" height="1" fill="#F0F2F5" />
      <circle cx="55" cy="38" r="3" fill="url(#chG)" opacity="0.3" />
      <rect x="61" y="36" width="10" height="3" rx="1.5" fill="url(#chG)" opacity="0.12" />
      <rect x="50" y="48" width="20" height="2" rx="1" fill="#E8ECF1" />
      <rect x="50" y="53" width="16" height="2" rx="1" fill="#F0F2F5" />
      <rect x="50" y="58" width="18" height="2" rx="1" fill="#F0F2F5" />
      {/* Connector 2-3 */}
      <line x1="76" y1="52" x2="84" y2="52" stroke="url(#chG)" strokeWidth="1.5" opacity="0.4" />
      <circle cx="80" cy="52" r="1.5" fill="url(#chG)" opacity="0.3" />
      {/* Block 3 */}
      <rect x="84" y="38" width="28" height="28" rx="8" fill="white" filter="url(#chSh)" />
      <rect x="84" y="38" width="28" height="28" rx="8" fill="url(#chG)" opacity="0.04" />
      <rect x="84" y="38" width="28" height="28" rx="8" fill="none" stroke="url(#chG)" strokeWidth="0.8" opacity="0.3" />
      <rect x="90" y="44" width="16" height="2" rx="1" fill="url(#chG)" opacity="0.15" />
      <rect x="90" y="48" width="12" height="2" rx="1" fill="#F0F2F5" />
      <rect x="90" y="52" width="14" height="2" rx="1" fill="#F0F2F5" />
      <circle cx="98" cy="60" r="3" fill="url(#chG)" opacity="0.12" />
      {/* Top label */}
      <rect x="36" y="18" width="48" height="8" rx="4" fill="#F5F3F1" />
      <text x="60" y="24" fill="#787881" fontSize="5" fontWeight="600" textAnchor="middle" fontFamily="system-ui">Cardano Blockchain</text>
      {/* Bottom hash */}
      <rect x="28" y="78" width="64" height="10" rx="5" fill="#F7F8FA" stroke="#E8ECF1" strokeWidth="0.5" />
      <text x="60" y="85" fill="#B0B0B8" fontSize="5" fontWeight="500" textAnchor="middle" fontFamily="monospace">policy_58244b...ddf1</text>
    </svg>
  );
}

/* ── Step indicator dots ── */
function StepDots({ current, total }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`rounded-full transition-all duration-500 ${
          i === current ? "w-6 h-2 bg-[#0F0F10]" : i < current ? "w-2 h-2 bg-[#0F0F10]" : "w-2 h-2 bg-[#E8ECF1]"
        }`} />
      ))}
    </div>
  );
}

/* ── Typing animation ── */
function TypeWriter({ text, delay = 0, speed = 30 }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const iv = setInterval(() => {
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
        i++;
      } else clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [started, text, speed]);

  return <>{displayed}<span className="animate-pulse">|</span></>;
}

/* ══════════════════════════════
   MAIN ONBOARDING COMPONENT
   ══════════════════════════════ */
export default function Onboarding({ onComplete, onLogin }) {
  const [step, setStep] = useState(0);
  const [showContent, setShowContent] = useState(false);

  // Intro animation timing
  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 800);
    return () => clearTimeout(t);
  }, []);

  const goNext = () => setStep(s => s + 1);
  const goLogin = () => {
    localStorage.setItem("bf_onboarding_seen", "1");
    onLogin?.();
  };
  const skip = () => {
    localStorage.setItem("bf_onboarding_seen", "1");
    onComplete?.();
  };

  /* ── STEP 0: Animated Intro ── */
  if (step === 0) {
    return (
      <div className="min-h-screen bg-[#FDFCFC] flex flex-col">
        {/* Skip button */}
        <div className="absolute top-6 right-8 z-10">
          <button onClick={skip} className="text-[13px] text-[#B0B0B8] hover:text-[#0F0F10] transition-colors">
            Passer →
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Animated orb */}
          <div style={{ animation: "fadeIn 1s ease-out both" }}>
            <AnimatedOrb />
          </div>

          {/* Text content */}
          {showContent && (
            <div className="text-center mt-8 max-w-[500px]">
              <h1 className="text-[32px] font-semibold text-[#0F0F10] tracking-[-0.03em] leading-tight mb-3"
                style={{ animation: "fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) both" }}>
                Bienvenue sur Bridge Fund
              </h1>
              <p className="text-[15px] text-[#787881] leading-relaxed mb-8"
                style={{ animation: "fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) 150ms both" }}>
                La premiere plateforme de tokenisation de fonds d'investissement sur Cardano
              </p>

              <div style={{ animation: "fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) 300ms both" }}>
                <button onClick={goNext}
                  className="px-8 py-3.5 bg-[#0F0F10] text-white text-[14px] font-semibold rounded-full hover:bg-[#1a1a24] transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5">
                  Decouvrir la plateforme
                </button>
              </div>

              <div className="mt-6" style={{ animation: "fadeIn 0.5s ease 600ms both" }}>
                <StepDots current={0} total={4} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── STEP 1: What is Bridge Fund? ── */
  if (step === 1) {
    return (
      <div className="min-h-screen bg-[#FDFCFC] flex flex-col">
        <div className="absolute top-6 right-8 z-10">
          <button onClick={skip} className="text-[13px] text-[#B0B0B8] hover:text-[#0F0F10] transition-colors">Passer →</button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="max-w-[680px] w-full">
            <div className="text-center mb-10" style={{ animation: "fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>
              <h2 className="text-[28px] font-semibold text-[#0F0F10] tracking-[-0.02em] mb-2">
                Tout ce dont vous avez besoin
              </h2>
              <p className="text-[14px] text-[#787881]">Une infrastructure complete pour digitaliser vos fonds d'investissement</p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-4 mb-10">
              {[
                { Illust: IllustrationTokenize, title: "Tokenisation native", desc: "Emettez des parts de fonds sous forme de tokens CIP-113 sur la blockchain Cardano. Chaque part est verifiable on-chain.", delay: 100 },
                { Illust: IllustrationKYC, title: "KYC & Compliance", desc: "Verification d'identite integree, screening PEP/sanctions, et conformite AMLD5 automatisee.", delay: 200 },
                { Illust: IllustrationDashboard, title: "Tableau de bord temps reel", desc: "Suivez la VNI, les souscriptions, les positions et l'activite de vos fonds en temps reel.", delay: 300 },
                { Illust: IllustrationBlockchain, title: "On-chain verifiable", desc: "Chaque transaction est enregistree sur la blockchain Cardano. Transparence totale et auditabilite.", delay: 400 },
              ].map(({ Illust, title, desc, delay }) => (
                <div key={title}
                  className="bg-white border border-[rgba(0,0,29,0.06)] rounded-2xl p-5 hover:border-[rgba(0,0,29,0.12)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 group"
                  style={{ animation: `fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }}>
                  <div className="mb-3 group-hover:scale-105 transition-transform duration-300">
                    <Illust />
                  </div>
                  <h3 className="text-[14px] font-semibold text-[#0F0F10] mb-1">{title}</h3>
                  <p className="text-[12px] text-[#787881] leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(0)} className="text-[13px] text-[#787881] hover:text-[#0F0F10] transition-colors">← Retour</button>
              <StepDots current={1} total={4} />
              <button onClick={goNext}
                className="px-6 py-2.5 bg-[#0F0F10] text-white text-[13px] font-semibold rounded-full hover:bg-[#1a1a24] transition-all duration-200">
                Continuer →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── STEP 2: Who is it for? (Role selection) ── */
  if (step === 2) {
    const roles = [
      { id: "investor", icon: "👤", title: "Investisseur (LP)", desc: "Souscrivez a des fonds, suivez vos investissements et vos tokens en temps reel.", color: "#4F7DF3" },
      { id: "intermediary", icon: "🏦", title: "Intermediaire", desc: "Gerez les souscriptions de vos clients, assurez la custody et le suivi.", color: "#059669" },
      { id: "aifm", icon: "📊", title: "Gestionnaire (AIFM)", desc: "Validez les ordres, gerez la valorisation et la conformite reglementaire.", color: "#7C3AED" },
      { id: "admin", icon: "⚙️", title: "Administrateur", desc: "Configurez les fonds, gerez les utilisateurs et surveillez l'ensemble de la plateforme.", color: "#0F0F10" },
    ];

    return (
      <div className="min-h-screen bg-[#FDFCFC] flex flex-col">
        <div className="absolute top-6 right-8 z-10">
          <button onClick={skip} className="text-[13px] text-[#B0B0B8] hover:text-[#0F0F10] transition-colors">Passer →</button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="max-w-[600px] w-full">
            <div className="text-center mb-10" style={{ animation: "fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>
              <h2 className="text-[28px] font-semibold text-[#0F0F10] tracking-[-0.02em] mb-2">
                Un portail pour chaque role
              </h2>
              <p className="text-[14px] text-[#787881]">Chaque acteur dispose d'une interface adaptee a ses besoins</p>
            </div>

            <div className="space-y-3 mb-10">
              {roles.map((r, i) => (
                <div key={r.id}
                  className="bg-white border border-[rgba(0,0,29,0.06)] rounded-xl p-4 flex items-center gap-4 hover:border-[rgba(0,0,29,0.12)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 cursor-default"
                  style={{ animation: `fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms both` }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[20px] shrink-0"
                    style={{ background: `${r.color}10` }}>
                    {r.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-semibold text-[#0F0F10]">{r.title}</h3>
                    <p className="text-[12px] text-[#787881] mt-0.5">{r.desc}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4C9D2" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(1)} className="text-[13px] text-[#787881] hover:text-[#0F0F10] transition-colors">← Retour</button>
              <StepDots current={2} total={4} />
              <button onClick={goNext}
                className="px-6 py-2.5 bg-[#0F0F10] text-white text-[13px] font-semibold rounded-full hover:bg-[#1a1a24] transition-all duration-200">
                Continuer →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── STEP 3: Ready — Login CTA ── */
  if (step === 3) {
    return (
      <div className="min-h-screen bg-[#FDFCFC] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="max-w-[480px] w-full text-center">
            {/* Success animation */}
            <div className="mb-8" style={{ animation: "fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #4F7DF3 0%, #00C48C 100%)" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" style={{ animation: "draw-line 0.6s ease 0.3s both" }} />
                </svg>
              </div>
            </div>

            <h2 className="text-[28px] font-semibold text-[#0F0F10] tracking-[-0.02em] mb-3"
              style={{ animation: "fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) 100ms both" }}>
              Pret a commencer
            </h2>
            <p className="text-[14px] text-[#787881] leading-relaxed mb-8"
              style={{ animation: "fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) 200ms both" }}>
              Connectez-vous pour acceder a votre portail Bridge Fund. Souscrivez, suivez et gerez vos fonds tokenises en toute securite.
            </p>

            {/* Trust pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8"
              style={{ animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 300ms both" }}>
              {[
                { icon: "🔒", label: "Chiffrement E2E" },
                { icon: "🏛️", label: "CSSF Luxembourg" },
                { icon: "⛓️", label: "Blockchain Cardano" },
                { icon: "🇪🇺", label: "RGPD compliant" },
              ].map(t => (
                <span key={t.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[rgba(0,0,29,0.06)] text-[11px] text-[#787881] font-medium">
                  {t.icon} {t.label}
                </span>
              ))}
            </div>

            <div className="space-y-3" style={{ animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 400ms both" }}>
              <button onClick={goLogin}
                className="w-full py-3.5 bg-[#0F0F10] text-white text-[14px] font-semibold rounded-full hover:bg-[#1a1a24] transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5">
                Se connecter
              </button>
              <p className="text-[11px] text-[#B0B0B8]">
                Vous avez deja un compte Bridge Fund ? Connectez-vous pour acceder a votre espace.
              </p>
            </div>

            <div className="mt-6">
              <StepDots current={3} total={4} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
