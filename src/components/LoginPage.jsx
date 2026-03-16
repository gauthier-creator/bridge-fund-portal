import { useState } from "react";

export default function LoginPage({ onLogin, onBack, error: externalError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message === "Invalid login credentials"
        ? "Email ou mot de passe incorrect"
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Minimal top bar */}
      <div className="px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0D0D12] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-[11px] tracking-wide">BF</span>
          </div>
          <span className="text-[15px] font-semibold text-[#0D0D12] tracking-[-0.01em]">Bridge Fund</span>
        </div>
        {onBack && (
          <button onClick={onBack} className="text-[13px] text-[#5F6B7A] hover:text-[#0D0D12] transition-colors font-medium">
            ← Page du fonds
          </button>
        )}
      </div>

      {/* Center card */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-[28px] font-semibold text-[#0D0D12] tracking-[-0.02em]">Connexion</h1>
            <p className="text-[15px] text-[#5F6B7A] mt-2">Accedez a votre espace securise</p>
          </div>

          {/* Card */}
          <div className="bg-white border border-[#E8ECF1] rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[13px] font-medium text-[#5F6B7A] mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8ECF1] text-sm text-[#0D0D12] placeholder-[#C4CAD4] focus:outline-none focus:ring-2 focus:ring-[#4F7DF3]/10 focus:border-[#4F7DF3] transition-all duration-150"
                  placeholder="nom@exemple.com"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#5F6B7A] mb-2">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8ECF1] text-sm text-[#0D0D12] placeholder-[#C4CAD4] focus:outline-none focus:ring-2 focus:ring-[#4F7DF3]/10 focus:border-[#4F7DF3] transition-all duration-150"
                  placeholder="••••••••"
                />
              </div>

              {(error || externalError) && (
                <div className="flex items-center gap-2.5 bg-[#FEF2F2] text-[#DC2626] text-[13px] px-4 py-3 rounded-xl border border-[#FECACA]">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>
                  {error || externalError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0D0D12] text-white py-2.5 rounded-xl text-[14px] font-semibold hover:bg-[#1A1A2E] active:bg-[#0D0D12] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connexion…
                  </span>
                ) : "Se connecter"}
              </button>
            </form>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex items-center justify-center gap-6 text-[11px] text-[#9AA4B2]">
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

      {/* Footer */}
      <footer className="border-t border-[#E8ECF1]">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between text-[11px] text-[#9AA4B2]">
          <span>Bridge Fund SCSp · CSSF regulated · Luxembourg</span>
          <span>Portail securise</span>
        </div>
      </footer>
    </div>
  );
}
