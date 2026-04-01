import { useState, useEffect } from "react";

/* ═══════════════════════════════════════════════════
   Onboarding — ElevenLabs immersive style
   Animated intro → Feature tiles with rich illustrations → Login
   ═══════════════════════════════════════════════════ */

/* ── Animated metallic shape (ElevenLabs intro style) ── */
function MetallicShape() {
  return (
    <div className="relative w-[180px] h-[180px]" style={{ animation: "float 6s ease-in-out infinite" }}>
      <svg viewBox="0 0 200 200" className="w-full h-full" style={{ animation: "slowSpin 20s linear infinite" }}>
        <defs>
          <linearGradient id="met1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00B4D8" />
            <stop offset="40%" stopColor="#0077B6" />
            <stop offset="70%" stopColor="#48CAE4" />
            <stop offset="100%" stopColor="#023E8A" />
          </linearGradient>
          <linearGradient id="met2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#90E0EF" />
            <stop offset="50%" stopColor="#0096C7" />
            <stop offset="100%" stopColor="#03045E" />
          </linearGradient>
          <radialGradient id="metSheen" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        {/* Folded disc shape — like ElevenLabs' conic metallic form */}
        <circle cx="100" cy="100" r="75" fill="url(#met1)" />
        <path d="M100 25 A75 75 0 0 1 175 100 L100 100 Z" fill="url(#met2)" opacity="0.8" />
        <path d="M100 100 A75 75 0 0 1 100 175 L100 100 Z" fill="url(#met2)" opacity="0.5" />
        <path d="M25 100 A75 75 0 0 1 100 25 L100 100 Z" fill="url(#met1)" opacity="0.6" />
        <circle cx="100" cy="100" r="74" fill="url(#metSheen)" />
      </svg>
      {/* Center logo dot */}
      <div className="absolute bottom-2 right-2 w-8 h-8 bg-[#0F0F10] rounded-full flex items-center justify-center shadow-lg">
        <span className="text-white font-bold text-[7px] tracking-wider">BF</span>
      </div>
    </div>
  );
}

/* ── Rich SVG illustrations for feature tiles (ElevenLabs-style compositions) ── */
function IllustTokenize() {
  return (
    <svg viewBox="0 0 160 120" className="w-full h-full">
      <defs>
        <linearGradient id="iT1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366F1"/><stop offset="100%" stopColor="#8B5CF6"/></linearGradient>
        <linearGradient id="iT2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3B82F6"/><stop offset="100%" stopColor="#06B6D4"/></linearGradient>
        <filter id="iTs"><feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.1"/></filter>
      </defs>
      {/* Background card */}
      <rect x="20" y="15" width="100" height="70" rx="12" fill="white" filter="url(#iTs)"/>
      <rect x="28" y="24" width="36" height="4" rx="2" fill="#E7E5E4"/>
      <rect x="28" y="32" width="50" height="3" rx="1.5" fill="#F5F5F4"/>
      <rect x="28" y="38" width="42" height="3" rx="1.5" fill="#F5F5F4"/>
      <rect x="28" y="48" width="30" height="22" rx="6" fill="url(#iT2)" opacity="0.1"/>
      <rect x="33" y="53" width="20" height="5" rx="2.5" fill="url(#iT2)" opacity="0.9"/>
      {/* Floating token */}
      <circle cx="105" cy="52" r="18" fill="url(#iT1)" opacity="0.12" filter="url(#iTs)"/>
      <circle cx="105" cy="52" r="13" fill="url(#iT1)"/>
      <path d="M100 52l3 3 6-6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Small floating elements */}
      <circle cx="130" cy="28" r="6" fill="url(#iT2)" opacity="0.2"/>
      <rect x="85" y="78" width="32" height="5" rx="2.5" fill="#E7E5E4"/>
      {/* Colorful accent dot */}
      <circle cx="35" cy="72" r="5" fill="#F59E0B" opacity="0.8"/>
    </svg>
  );
}

function IllustKYC() {
  return (
    <svg viewBox="0 0 160 120" className="w-full h-full">
      <defs>
        <linearGradient id="iK1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#059669"/><stop offset="100%" stopColor="#34D399"/></linearGradient>
        <linearGradient id="iK2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#F97316"/><stop offset="100%" stopColor="#FB923C"/></linearGradient>
        <filter id="iKs"><feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.1"/></filter>
      </defs>
      {/* ID Card */}
      <rect x="18" y="20" width="90" height="60" rx="12" fill="white" filter="url(#iKs)"/>
      {/* Photo circle */}
      <circle cx="46" cy="45" r="14" fill="#F5F5F4"/>
      <circle cx="46" cy="42" r="6" fill="#D6D3D1"/>
      <path d="M34 55c0-6 5-9 12-9s12 3 12 9" fill="#E7E5E4"/>
      {/* Info lines */}
      <rect x="68" y="34" width="30" height="3" rx="1.5" fill="#E7E5E4"/>
      <rect x="68" y="42" width="24" height="3" rx="1.5" fill="#F5F5F4"/>
      <rect x="68" y="50" width="28" height="3" rx="1.5" fill="#F5F5F4"/>
      {/* Verified badge */}
      <circle cx="120" cy="65" r="14" fill="url(#iK1)" opacity="0.12" filter="url(#iKs)"/>
      <circle cx="120" cy="65" r="10" fill="url(#iK1)"/>
      <path d="M116 65l3 3 5-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Floating accent */}
      <circle cx="130" cy="30" r="7" fill="url(#iK2)" opacity="0.8"/>
      <rect x="24" y="86" width="40" height="4" rx="2" fill="#E7E5E4"/>
    </svg>
  );
}

function IllustDashboard() {
  return (
    <svg viewBox="0 0 160 120" className="w-full h-full">
      <defs>
        <linearGradient id="iD1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3B82F6"/><stop offset="100%" stopColor="#8B5CF6"/></linearGradient>
        <linearGradient id="iD2" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#3B82F6" stopOpacity="0.05"/><stop offset="100%" stopColor="#3B82F6" stopOpacity="0.2"/></linearGradient>
        <filter id="iDs"><feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.1"/></filter>
      </defs>
      {/* Dashboard card */}
      <rect x="15" y="12" width="110" height="80" rx="12" fill="white" filter="url(#iDs)"/>
      {/* Mini KPIs */}
      <rect x="23" y="20" width="30" height="16" rx="5" fill="#F5F5F4"/>
      <rect x="27" y="24" width="14" height="3" rx="1.5" fill="#D6D3D1"/>
      <rect x="27" y="30" width="20" height="3" rx="1.5" fill="#0F0F10" opacity="0.6"/>
      <rect x="58" y="20" width="30" height="16" rx="5" fill="#F5F5F4"/>
      <rect x="62" y="24" width="14" height="3" rx="1.5" fill="#D6D3D1"/>
      <rect x="62" y="30" width="18" height="3" rx="1.5" fill="#059669" opacity="0.6"/>
      <rect x="93" y="20" width="24" height="16" rx="5" fill="#ECFDF5"/>
      <text x="105" y="31" fill="#059669" fontSize="8" fontWeight="700" textAnchor="middle">↑</text>
      {/* Area chart */}
      <path d="M23 78 L38 68 L53 72 L68 58 L83 52 L98 46 L113 40 L118 38" fill="none" stroke="url(#iD1)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M23 78 L38 68 L53 72 L68 58 L83 52 L98 46 L113 40 L118 38 L118 84 L23 84 Z" fill="url(#iD2)"/>
      {/* Active dot */}
      <circle cx="83" cy="52" r="3.5" fill="url(#iD1)"/>
      <circle cx="83" cy="52" r="6" fill="url(#iD1)" opacity="0.15"/>
      {/* Floating accent */}
      <circle cx="138" cy="25" r="8" fill="#EC4899" opacity="0.7"/>
      <circle cx="140" cy="80" r="5" fill="#F59E0B" opacity="0.5"/>
    </svg>
  );
}

function IllustBlockchain() {
  return (
    <svg viewBox="0 0 160 120" className="w-full h-full">
      <defs>
        <linearGradient id="iB1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0EA5E9"/><stop offset="100%" stopColor="#06B6D4"/></linearGradient>
        <linearGradient id="iB2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#8B5CF6"/><stop offset="100%" stopColor="#A78BFA"/></linearGradient>
        <filter id="iBs"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08"/></filter>
      </defs>
      {/* Block 1 */}
      <rect x="10" y="35" width="36" height="36" rx="10" fill="white" filter="url(#iBs)"/>
      <rect x="17" y="42" width="22" height="3" rx="1.5" fill="url(#iB1)" opacity="0.3"/>
      <rect x="17" y="48" width="16" height="3" rx="1.5" fill="#F5F5F4"/>
      <rect x="17" y="54" width="18" height="3" rx="1.5" fill="#F5F5F4"/>
      <circle cx="22" cy="63" r="3.5" fill="url(#iB1)" opacity="0.2"/>
      {/* Connector */}
      <line x1="46" y1="53" x2="58" y2="53" stroke="url(#iB1)" strokeWidth="2" strokeDasharray="3 2" opacity="0.4"/>
      {/* Block 2 — main */}
      <rect x="58" y="28" width="44" height="50" rx="12" fill="white" filter="url(#iBs)"/>
      <rect x="58" y="28" width="44" height="14" rx="12" fill="url(#iB1)" opacity="0.06"/>
      <circle cx="72" cy="35" r="4" fill="url(#iB1)" opacity="0.4"/>
      <rect x="80" y="33" width="14" height="3" rx="1.5" fill="#E7E5E4"/>
      <rect x="65" y="48" width="28" height="3" rx="1.5" fill="#E7E5E4"/>
      <rect x="65" y="55" width="22" height="3" rx="1.5" fill="#F5F5F4"/>
      <rect x="65" y="62" width="26" height="3" rx="1.5" fill="#F5F5F4"/>
      {/* Connector */}
      <line x1="102" y1="53" x2="114" y2="53" stroke="url(#iB1)" strokeWidth="2" strokeDasharray="3 2" opacity="0.4"/>
      {/* Block 3 */}
      <rect x="114" y="35" width="36" height="36" rx="10" fill="white" filter="url(#iBs)"/>
      <rect x="121" y="42" width="22" height="3" rx="1.5" fill="url(#iB1)" opacity="0.3"/>
      <rect x="121" y="48" width="16" height="3" rx="1.5" fill="#F5F5F4"/>
      <rect x="121" y="54" width="18" height="3" rx="1.5" fill="#F5F5F4"/>
      <circle cx="138" cy="63" r="3.5" fill="url(#iB2)" opacity="0.3"/>
      {/* Floating accents */}
      <circle cx="140" cy="22" r="6" fill="url(#iB2)" opacity="0.6"/>
      <circle cx="15" cy="80" r="5" fill="url(#iB1)" opacity="0.3"/>
      {/* Bottom label */}
      <rect x="45" y="90" width="70" height="8" rx="4" fill="#F5F5F4"/>
    </svg>
  );
}

/* ── CSS for intro spin ── */
const introCSS = `@keyframes slowSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

export default function Onboarding({ onComplete, onLogin }) {
  const [phase, setPhase] = useState("intro"); // intro → features → steps
  const [ready, setReady] = useState(false);

  useEffect(() => { setTimeout(() => setReady(true), 100); }, []);

  // Auto-advance from intro after 2.5s
  useEffect(() => {
    if (phase === "intro") {
      const t = setTimeout(() => setPhase("features"), 2500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const finish = () => { localStorage.setItem("bf_onboarding_seen", "1"); onLogin?.(); };
  const skip = () => { localStorage.setItem("bf_onboarding_seen", "1"); onComplete?.(); };

  /* ── Phase: INTRO — Immersive metallic animation ── */
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-[#F5F3F1] flex items-center justify-center cursor-pointer" onClick={() => setPhase("features")}>
        <style>{introCSS}</style>
        <div className="text-center" style={{ opacity: ready ? 1 : 0, transition: "opacity 0.8s ease" }}>
          <div className="flex justify-center mb-6">
            <MetallicShape />
          </div>
          <p className="text-[14px] text-[#787881]" style={{ opacity: ready ? 1 : 0, transition: "opacity 1s ease 0.5s" }}>
            Bridge Fund
          </p>
        </div>
      </div>
    );
  }

  /* ── Phase: FEATURES — ElevenLabs-style tiles with illustrations ── */
  if (phase === "features") {
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
          <div className="max-w-[720px] w-full">
            <div className="text-center mb-10" style={{ animation: "fadeInUp 0.4s var(--ease-out) both" }}>
              <p className="text-[14px] text-[#787881] mb-2">Bridge Fund Platform</p>
              <h1 className="text-[32px] font-semibold text-[#0F0F10] leading-tight">
                Tokenisez vos fonds d'investissement
              </h1>
            </div>

            {/* Feature tiles — ElevenLabs square card style with rich illustrations */}
            <div className="grid grid-cols-4 gap-4 mb-10">
              {[
                { Illust: IllustTokenize, label: "Tokenisation" },
                { Illust: IllustKYC, label: "KYC & Compliance" },
                { Illust: IllustDashboard, label: "Dashboard" },
                { Illust: IllustBlockchain, label: "Blockchain" },
              ].map(({ Illust, label }, i) => (
                <div key={i} className="bg-[rgba(0,0,23,0.043)] rounded-2xl p-3 pb-4 hover:bg-[rgba(0,0,23,0.065)] transition-colors duration-150 cursor-default"
                  style={{ animation: `fadeInUp 0.3s var(--ease-out) ${150 + i * 80}ms both` }}>
                  <div className="w-full aspect-[4/3] mb-3 overflow-hidden rounded-xl">
                    <Illust />
                  </div>
                  <p className="text-[13px] font-medium text-[#0F0F10] text-center">{label}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center" style={{ animation: "fadeInUp 0.3s var(--ease-out) 0.5s both" }}>
              <button onClick={() => setPhase("steps")}
                className="px-8 py-3 bg-[#0F0F10] text-white text-[14px] font-medium rounded-[9999px] hover:bg-[#292524] active:scale-[0.98] transition-all duration-75">
                Comment ca fonctionne →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Phase: STEPS — How it works + Login CTA ── */
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-6 py-4 flex justify-between items-center">
        <button onClick={() => setPhase("features")} className="text-[14px] text-[#787881] hover:text-[#0F0F10] transition-colors duration-75">← Retour</button>
        <button onClick={skip} className="text-[14px] text-[#787881] hover:text-[#0F0F10] transition-colors duration-75">Passer</button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-[600px] w-full">
          <div className="text-center mb-10" style={{ animation: "fadeInUp 0.3s var(--ease-out) both" }}>
            <h2 className="text-[28px] font-semibold text-[#0F0F10] mb-2">Comment ca fonctionne</h2>
            <p className="text-[16px] text-[#787881]">Trois etapes pour digitaliser vos fonds</p>
          </div>

          <div className="space-y-3 mb-10">
            {[
              { n: "01", title: "Creez votre fonds", desc: "Configurez les parametres, la classe de parts et deployez le registre sur la blockchain Cardano." },
              { n: "02", title: "Collectez les souscriptions", desc: "Vos investisseurs souscrivent en ligne avec KYC, signature electronique et paiement integres." },
              { n: "03", title: "Tokenisez et distribuez", desc: "Les parts sont emises sous forme de tokens CIP-113. Chaque position est verifiable on-chain." },
            ].map((s, i) => (
              <div key={i} className="flex gap-5 items-start bg-[rgba(0,0,23,0.043)] rounded-2xl p-5 hover:bg-[rgba(0,0,23,0.065)] transition-colors duration-150"
                style={{ animation: `fadeInUp 0.3s var(--ease-out) ${80 + i * 60}ms both` }}>
                <span className="text-[24px] font-semibold text-[rgba(0,0,29,0.12)] tabular-nums shrink-0 w-8">{s.n}</span>
                <div>
                  <h3 className="text-[14px] font-semibold text-[#0F0F10] mb-1">{s.title}</h3>
                  <p className="text-[14px] text-[#787881] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between" style={{ animation: "fadeInUp 0.3s var(--ease-out) 0.35s both" }}>
            <div className="flex items-center gap-4 text-[12px] text-[#A8A29E]">
              {["CSSF Luxembourg", "Cardano", "eIDAS"].map(t => <span key={t}>{t}</span>)}
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
