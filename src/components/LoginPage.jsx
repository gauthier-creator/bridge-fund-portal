import { useState } from "react";

/* ═══════════════════════════════════════
   Login — ElevenLabs warm style
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

  const iCls = "w-full h-10 bg-[rgba(0,0,23,0.043)] border border-[rgba(0,0,29,0.1)] rounded-[10px] px-3 text-[14px] text-[#0F0F10] placeholder-[#A8A29E] focus:outline-none focus:border-[rgba(0,0,29,0.3)] focus:ring-2 focus:ring-[rgba(0,0,29,0.05)] transition-[border-color,box-shadow] duration-75";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#0F0F10] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-[10px] tracking-wider">BF</span>
          </div>
          <span className="text-[15px] font-semibold text-[#0F0F10] tracking-tight">Bridge Fund</span>
        </div>
        <div className="flex items-center gap-3">
          {onSignup && (
            <button onClick={onSignup} className="text-[14px] text-[#787881] hover:text-[#0F0F10] transition-colors duration-75">
              Decouvrir
            </button>
          )}
          {onBack && (
            <button onClick={onBack} className="text-[14px] text-[#787881] hover:text-[#0F0F10] transition-colors duration-75">
              ← Retour
            </button>
          )}
        </div>
      </div>

      {/* Center */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]" style={{ animation: "fadeInUp 0.3s var(--ease-out) both" }}>

          <div className="text-center mb-8">
            <h1 className="text-[24px] font-semibold text-[#0F0F10]">Se connecter</h1>
            <p className="text-[14px] text-[#787881] mt-2">Accedez a votre espace Bridge Fund</p>
          </div>

          <div className="bg-white rounded-2xl p-7" style={{ boxShadow: "rgba(0, 0, 23, 0.043) 0px 0px 0px 1px, rgba(16, 24, 40, 0.03) 0px 4px 6px -2px" }}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[14px] font-medium text-[#0F0F10] mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className={iCls} placeholder="nom@entreprise.com" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[14px] font-medium text-[#0F0F10]">Mot de passe</label>
                  <button type="button" className="text-[12px] text-[#787881] hover:text-[#0F0F10] transition-colors">Oublie ?</button>
                </div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  className={iCls} placeholder="••••••••" />
              </div>

              {(error || externalError) && (
                <div className="flex items-center gap-2 bg-[#FEF2F2] text-[#DC2626] text-[13px] px-3 py-2.5 rounded-[10px] border border-[#FECACA]">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>
                  {error || externalError}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full h-10 bg-[#0F0F10] text-white text-[14px] font-medium rounded-[10px] hover:bg-[#292524] active:scale-[0.98] transition-all duration-75 disabled:opacity-50">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connexion...
                  </span>
                ) : "Continuer"}
              </button>
            </form>

            {onSignup && (
              <div className="mt-5 pt-5 border-t border-[rgba(0,0,29,0.075)] text-center">
                <p className="text-[13px] text-[#787881]">
                  Nouveau ?{" "}
                  <button onClick={onSignup} className="text-[#0F0F10] font-medium hover:underline">Decouvrir Bridge Fund</button>
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-center gap-5 text-[12px] text-[#A8A29E]">
            {["Chiffre E2E", "CSSF regulated", "On-chain"].map(t => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
