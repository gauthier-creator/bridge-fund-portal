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

/* ── Illustration SVGs for feature cards ── */
function IllustrationTokenize() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <defs>
        <linearGradient id="tokGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F7DF3" />
          <stop offset="100%" stopColor="#00C48C" />
        </linearGradient>
      </defs>
      <rect x="8" y="12" width="64" height="48" rx="8" fill="#F5F3F1" stroke="#E8ECF1" strokeWidth="1" />
      <rect x="16" y="20" width="20" height="4" rx="2" fill="url(#tokGrad)" opacity="0.7" />
      <rect x="16" y="28" width="32" height="3" rx="1.5" fill="#E8ECF1" />
      <rect x="16" y="34" width="28" height="3" rx="1.5" fill="#E8ECF1" />
      <circle cx="56" cy="40" r="14" fill="url(#tokGrad)" opacity="0.15" />
      <circle cx="56" cy="40" r="8" fill="url(#tokGrad)" opacity="0.3" />
      <path d="M53 40l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <rect x="16" y="44" width="24" height="8" rx="4" fill="url(#tokGrad)" opacity="0.9" />
      <text x="28" y="50" fill="white" fontSize="5" fontWeight="600" textAnchor="middle">TOKEN</text>
    </svg>
  );
}

function IllustrationKYC() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <defs>
        <linearGradient id="kycGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#00C48C" />
        </linearGradient>
      </defs>
      <rect x="10" y="14" width="60" height="44" rx="8" fill="#F5F3F1" stroke="#E8ECF1" strokeWidth="1" />
      <circle cx="30" cy="32" r="10" fill="url(#kycGrad)" opacity="0.15" />
      <circle cx="30" cy="30" r="4" fill="url(#kycGrad)" opacity="0.4" />
      <path d="M22 38c0-4 3.5-6 8-6s8 2 8 6" fill="url(#kycGrad)" opacity="0.3" />
      <rect x="46" y="26" width="18" height="3" rx="1.5" fill="#E8ECF1" />
      <rect x="46" y="32" width="14" height="3" rx="1.5" fill="#E8ECF1" />
      <rect x="46" y="38" width="16" height="3" rx="1.5" fill="#E8ECF1" />
      <circle cx="58" cy="50" r="8" fill="url(#kycGrad)" />
      <path d="M55 50l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function IllustrationDashboard() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <defs>
        <linearGradient id="dashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F7DF3" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect x="8" y="12" width="64" height="48" rx="8" fill="#F5F3F1" stroke="#E8ECF1" strokeWidth="1" />
      {/* Mini chart bars */}
      <rect x="16" y="42" width="8" height="12" rx="2" fill="url(#dashGrad)" opacity="0.3" />
      <rect x="28" y="36" width="8" height="18" rx="2" fill="url(#dashGrad)" opacity="0.5" />
      <rect x="40" y="30" width="8" height="24" rx="2" fill="url(#dashGrad)" opacity="0.7" />
      <rect x="52" y="24" width="8" height="30" rx="2" fill="url(#dashGrad)" opacity="0.9" />
      {/* Top KPI */}
      <rect x="16" y="18" width="16" height="8" rx="3" fill="url(#dashGrad)" opacity="0.15" />
      <text x="24" y="24" fill="#4F7DF3" fontSize="5" fontWeight="700" textAnchor="middle">VNI</text>
      <rect x="36" y="18" width="12" height="8" rx="3" fill="#E8ECF1" />
      <rect x="52" y="18" width="12" height="8" rx="3" fill="#E8ECF1" />
    </svg>
  );
}

function IllustrationBlockchain() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <defs>
        <linearGradient id="chainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0077B6" />
          <stop offset="100%" stopColor="#00B4D8" />
        </linearGradient>
      </defs>
      {/* Chain blocks */}
      <rect x="8" y="30" width="18" height="18" rx="4" fill="url(#chainGrad)" opacity="0.2" stroke="url(#chainGrad)" strokeWidth="0.5" />
      <rect x="31" y="30" width="18" height="18" rx="4" fill="url(#chainGrad)" opacity="0.5" stroke="url(#chainGrad)" strokeWidth="0.5" />
      <rect x="54" y="30" width="18" height="18" rx="4" fill="url(#chainGrad)" opacity="0.8" stroke="url(#chainGrad)" strokeWidth="0.5" />
      {/* Links */}
      <line x1="26" y1="39" x2="31" y2="39" stroke="url(#chainGrad)" strokeWidth="1.5" strokeDasharray="2 1" />
      <line x1="49" y1="39" x2="54" y2="39" stroke="url(#chainGrad)" strokeWidth="1.5" strokeDasharray="2 1" />
      {/* Block content */}
      <text x="17" y="41" fill="#0077B6" fontSize="6" fontWeight="600" textAnchor="middle">#1</text>
      <text x="40" y="41" fill="#0077B6" fontSize="6" fontWeight="600" textAnchor="middle">#2</text>
      <text x="63" y="41" fill="white" fontSize="6" fontWeight="600" textAnchor="middle">#3</text>
      {/* Top label */}
      <text x="40" y="22" fill="#787881" fontSize="5" fontWeight="500" textAnchor="middle">CARDANO</text>
      {/* Bottom hash */}
      <rect x="18" y="54" width="44" height="6" rx="3" fill="#F5F3F1" />
      <text x="40" y="59" fill="#B0B0B8" fontSize="4" fontWeight="500" textAnchor="middle" fontFamily="monospace">0x58244b...df1</text>
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
