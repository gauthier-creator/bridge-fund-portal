import { useState } from "react";

/* ═══════════════════════════════════════
   Login — Clean, Clerk/Mercury-inspired
   ═══════════════════════════════════════ */

export default function LoginPage({ onLogin, onBack, onSignup, error: externalError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try { await onLogin(email, password); }
    catch (err) { setError(err.message === "Invalid login credentials" ? "Email ou mot de passe incorrect" : err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Top bar */}
      <div className="px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#0A0A0A] rounded-md flex items-center justify-center">
            <span className="text-white font-semibold text-[9px] tracking-wider">BF</span>
          </div>
          <span className="text-[14px] font-semibold text-[#0A0A0A] tracking-[-0.01em]">Bridge Fund</span>
        </div>
        <div className="flex items-center gap-4">
          {onSignup && (
            <button onClick={onSignup} className="text-[13px] text-[#737373] hover:text-[#0A0A0A] transition-colors duration-150">
              Decouvrir
            </button>
          )}
          {onBack && (
            <button onClick={onBack} className="text-[13px] text-[#737373] hover:text-[#0A0A0A] transition-colors duration-150">
              ← Retour
            </button>
          )}
        </div>
      </div>

      {/* Center */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[360px]" style={{ animation: "fadeInUp 0.3s var(--ease-out) both" }}>

          <div className="text-center mb-7">
            <h1 className="text-[24px] font-semibold text-[#0A0A0A] tracking-[-0.02em]">Se connecter</h1>
            <p className="text-[14px] text-[#737373] mt-1.5">Accedez a votre espace Bridge Fund</p>
          </div>

          <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#0A0A0A] mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full h-10 bg-[#F7F7F7] border border-[#E5E5E5] rounded-md px-3 text-[14px] text-[#0A0A0A] placeholder-[#A3A3A3] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/10 transition-[border-color,box-shadow] duration-150"
                  placeholder="nom@entreprise.com" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[13px] font-medium text-[#0A0A0A]">Mot de passe</label>
                  <button type="button" className="text-[11px] text-[#A3A3A3] hover:text-[#0A0A0A] transition-colors">Oublie ?</button>
                </div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  className="w-full h-10 bg-[#F7F7F7] border border-[#E5E5E5] rounded-md px-3 text-[14px] text-[#0A0A0A] placeholder-[#A3A3A3] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/10 transition-[border-color,box-shadow] duration-150"
                  placeholder="••••••••" />
              </div>

              {(error || externalError) && (
                <div className="flex items-center gap-2 bg-[#FEF2F2] text-[#EE0000] text-[13px] px-3 py-2.5 rounded-md border border-[#FECACA]">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>
                  {error || externalError}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full h-10 bg-[#0A0A0A] text-white text-[14px] font-medium rounded-md hover:bg-[#171717] active:scale-[0.98] transition-all duration-150 disabled:opacity-50">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connexion...
                  </span>
                ) : "Continuer"}
              </button>
            </form>

            {onSignup && (
              <div className="mt-4 pt-4 border-t border-[#F0F0F0] text-center">
                <p className="text-[13px] text-[#737373]">
                  Nouveau ?{" "}
                  <button onClick={onSignup} className="text-[#0A0A0A] font-medium hover:underline">Decouvrir Bridge Fund</button>
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-[#A3A3A3]">
            {["Chiffre E2E", "CSSF regulated", "On-chain"].map(t => (
              <span key={t} className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#D4D4D4]" />{t}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
