import { useState } from "react";

const ROLE_LABELS = {
  investor: "Investisseur",
  intermediary: "Intermédiaire",
  aifm: "AIFM",
  admin: "Administrateur",
};

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
    <div className="min-h-screen bg-cream font-sans flex flex-col">
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center">
          <div className="w-14 h-14 bg-navy rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-gold font-bold text-xl">BF</span>
          </div>
          <h1 className="text-2xl font-semibold text-navy">Bridge Fund Portal</h1>
          <p className="text-sm text-gray-400 mt-1">SLP Luxembourg · Fonds de dette tokenisé · Cardano</p>
          {onBack && (
            <button onClick={onBack} className="mt-3 text-xs text-gold hover:text-gold/80 transition-colors font-medium">
              ← Retour à la page du fonds
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-8 w-full max-w-md">
          <h2 className="text-xl font-semibold text-navy mb-1">Connexion</h2>
          <p className="text-sm text-gray-400 mb-6">Accédez à votre espace sécurisé</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-colors"
                placeholder="nom@exemple.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-colors"
                placeholder="••••••••"
              />
            </div>

            {(error || externalError) && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">
                {error || externalError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy text-white py-2.5 rounded-xl text-sm font-medium hover:bg-navy-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Connexion en cours…" : "Se connecter"}
            </button>
          </form>
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-gray-400">
          <span>Bridge Fund SCSp · CSSF regulated · Luxembourg</span>
          <span>Portail sécurisé · Données en temps réel</span>
        </div>
      </footer>
    </div>
  );
}
