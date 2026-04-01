import { useState, useEffect } from "react";

/* ══════════════════════════════════════════
   Login + Onboarding — ElevenLabs-inspired
   Warm, minimal, premium feel
   ══════════════════════════════════════════ */

/* ── Animated background pattern ── */
function FloatingGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #0F0F10 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(79,125,243,0.04) 0%, transparent 70%)", animation: "float 8s ease-in-out infinite" }} />
      <div className="absolute bottom-[10%] right-[15%] w-[300px] h-[300px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(0,196,140,0.03) 0%, transparent 70%)", animation: "float 10s ease-in-out infinite reverse" }} />
    </div>
  );
}

/* ── Feature card for onboarding ── */
function FeatureCard({ icon, title, desc, delay = 0 }) {
  return (
    <div className="group bg-white/80 backdrop-blur-sm border border-[rgba(0,0,29,0.08)] rounded-2xl p-5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-[rgba(0,0,29,0.14)] transition-all duration-300"
      style={{ animation: `fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both` }}>
      <div className="w-10 h-10 rounded-xl bg-[#F5F3F1] flex items-center justify-center text-[20px] mb-3 group-hover:scale-105 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-[14px] font-semibold text-[#0F0F10] mb-1">{title}</h3>
      <p className="text-[12px] text-[#787881] leading-relaxed">{desc}</p>
    </div>
  );
}

export default function LoginPage({ onLogin, onBack, error: externalError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user has seen onboarding before
    const seen = localStorage.getItem("bf_onboarding_seen");
    if (seen) setShowOnboarding(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message === "Invalid login credentials" ? "Email ou mot de passe incorrect" : err.message);
    } finally {
      setLoading(false);
    }
  };

  const skipOnboarding = () => {
    localStorage.setItem("bf_onboarding_seen", "1");
    setShowOnboarding(false);
  };

  /* ═══════════════════════════════
     ONBOARDING — Welcome Screen
     ═══════════════════════════════ */
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-[#FDFCFC] flex flex-col relative">
        <FloatingGrid />

        {/* Top bar */}
        <div className="relative z-10 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#0F0F10] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-[11px] tracking-wide">BF</span>
            </div>
            <span className="text-[15px] font-semibold text-[#0F0F10] tracking-[-0.02em]">Bridge Fund</span>
          </div>
          <button onClick={skipOnboarding}
            className="text-[13px] text-[#787881] hover:text-[#0F0F10] transition-colors duration-150 font-medium">
            Se connecter →
          </button>
        </div>

        {/* Hero */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
          <div className="max-w-[640px] text-center mb-12"
            style={{ animation: mounted ? "fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both" : "none" }}>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0F0F10] text-white text-[12px] font-medium mb-6"
              style={{ animation: mounted ? "fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 100ms both" : "none" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C] animate-pulse" />
              Plateforme de fonds tokenises
            </div>

            <h1 className="text-[40px] font-semibold text-[#0F0F10] tracking-[-0.03em] leading-[1.1] mb-4"
              style={{ animation: mounted ? "fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 200ms both" : "none" }}>
              L'infrastructure de<br />
              <span className="bg-gradient-to-r from-[#4F7DF3] to-[#00C48C] bg-clip-text text-transparent">
                tokenisation de fonds
              </span>
            </h1>

            <p className="text-[16px] text-[#787881] leading-relaxed max-w-[480px] mx-auto"
              style={{ animation: mounted ? "fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 300ms both" : "none" }}>
              Gerez vos fonds d'investissement alternatifs sur la blockchain Cardano. Conforme CSSF, securise, transparent.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[720px] w-full mb-12">
            <FeatureCard
              icon="🔐"
              title="Tokenisation CIP-113"
              desc="Vos parts de fonds sont des tokens natifs Cardano, conformes au standard CIP-113."
              delay={400}
            />
            <FeatureCard
              icon="⚡"
              title="Souscription instantanee"
              desc="Souscrivez, signez et payez en quelques clics. KYC integre, signature eIDAS."
              delay={500}
            />
            <FeatureCard
              icon="📊"
              title="Suivi en temps reel"
              desc="Tableau de bord avec VNI, positions, et verification on-chain en temps reel."
              delay={600}
            />
          </div>

          {/* CTA */}
          <div style={{ animation: mounted ? "fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 700ms both" : "none" }}>
            <button onClick={skipOnboarding}
              className="px-8 py-3.5 bg-[#0F0F10] text-white text-[14px] font-semibold rounded-full hover:bg-[#1a1a24] transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2.5">
              Acceder a la plateforme
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            </button>
          </div>

          {/* Trust line */}
          <div className="mt-8 flex items-center gap-6 text-[11px] text-[#B0B0B8]"
            style={{ animation: mounted ? "fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 800ms both" : "none" }}>
            {["CSSF Luxembourg", "Blockchain Cardano", "eIDAS compliant", "RGPD"].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#C4C9D2]" />
                {t}
              </span>
            ))}
          </div>
        </main>
      </div>
    );
  }

  /* ═══════════════════════════════
     LOGIN FORM — Clean & warm
     ═══════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#FDFCFC] flex flex-col relative">
      <FloatingGrid />

      {/* Top bar */}
      <div className="relative z-10 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0F0F10] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-[11px] tracking-wide">BF</span>
          </div>
          <span className="text-[15px] font-semibold text-[#0F0F10] tracking-[-0.02em]">Bridge Fund</span>
        </div>
        {onBack && (
          <button onClick={onBack} className="text-[13px] text-[#787881] hover:text-[#0F0F10] transition-colors duration-150 font-medium">
            ← Retour
          </button>
        )}
      </div>

      {/* Center */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]"
          style={{ animation: "fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both" }}>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-[26px] font-semibold text-[#0F0F10] tracking-[-0.02em]">Bon retour</h1>
            <p className="text-[14px] text-[#787881] mt-2">Connectez-vous a votre espace Bridge Fund</p>
          </div>

          {/* Form card */}
          <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[13px] font-medium text-[#0F0F10] mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFCFC] border border-[rgba(0,0,29,0.1)] text-[14px] text-[#0F0F10] placeholder-[#B0B0B8] focus:outline-none focus:ring-2 focus:ring-[#0F0F10]/5 focus:border-[rgba(0,0,29,0.25)] transition-all duration-150"
                  placeholder="nom@entreprise.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] font-medium text-[#0F0F10]">Mot de passe</label>
                  <button type="button" className="text-[11px] text-[#787881] hover:text-[#0F0F10] transition-colors">
                    Mot de passe oublie ?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFCFC] border border-[rgba(0,0,29,0.1)] text-[14px] text-[#0F0F10] placeholder-[#B0B0B8] focus:outline-none focus:ring-2 focus:ring-[#0F0F10]/5 focus:border-[rgba(0,0,29,0.25)] transition-all duration-150"
                  placeholder="••••••••"
                />
              </div>

              {(error || externalError) && (
                <div className="flex items-center gap-2.5 bg-[#FEF2F2] text-[#DC2626] text-[13px] px-4 py-3 rounded-xl border border-[#FECACA]/60"
                  style={{ animation: "fadeInUp 0.3s ease-out" }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
                  </svg>
                  {error || externalError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0F0F10] text-white py-3 rounded-xl text-[14px] font-semibold hover:bg-[#1a1a24] active:bg-[#0F0F10] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connexion...
                  </span>
                ) : "Se connecter"}
              </button>
            </form>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex items-center justify-center gap-5 text-[11px] text-[#B0B0B8]">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
              Chiffre end-to-end
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
              CSSF regulated
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.03a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" /></svg>
              On-chain verified
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
