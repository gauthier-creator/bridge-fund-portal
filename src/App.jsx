import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { ToastContainer, useToast } from "./components/shared";
import LoginPage from "./components/LoginPage";
import PortailLP from "./portals/PortailLP";
import PortailSwissLife from "./portals/PortailSwissLife";
import PortailAIFM from "./portals/PortailAIFM";
import PortailAdmin from "./portals/PortailAdmin";

const ROLE_CONFIG = {
  investor: { path: "/investisseur", label: "Espace Investisseur", sub: "Souscription directe & collatéral", icon: "LP", color: "bg-navy" },
  intermediary: { path: "/intermediaire", label: "Espace Intermédiaire", sub: "Souscription intermédiée & custody", icon: "SL", color: "bg-blue-600" },
  aifm: { path: "/aifm", label: "Espace AIFM", sub: "Gestion du fonds & validation", icon: "AI", color: "bg-gold" },
  admin: { path: "/admin", label: "Espace Admin", sub: "Vue d'ensemble propriétaire", icon: "GA", color: "bg-emerald-600" },
};

// Simple hash-based router
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash.replace("#", "") || "/");

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash.replace("#", "") || "/");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return hash;
}

function navigate(path) {
  window.location.hash = path;
}

function PortalRouter({ toast }) {
  const route = useHashRoute();
  const { role } = useAuth();

  // Redirect to correct portal if on root or wrong path
  useEffect(() => {
    if (role) {
      const config = ROLE_CONFIG[role];
      if (config && (route === "/" || !Object.values(ROLE_CONFIG).some((c) => route.startsWith(c.path)))) {
        navigate(config.path);
      }
    }
  }, [role, route]);

  if (route.startsWith("/investisseur")) return <PortailLP toast={toast} />;
  if (route.startsWith("/intermediaire")) return <PortailSwissLife toast={toast} />;
  if (route.startsWith("/aifm")) return <PortailAIFM toast={toast} />;
  if (route.startsWith("/admin")) return <PortailAdmin toast={toast} />;

  return <div className="text-center py-20 text-gray-500">Chargement…</div>;
}

function AuthenticatedApp() {
  const { profile, role, signOut } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.investor;

  return (
    <AppProvider>
      <div className="min-h-screen bg-cream font-sans">
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-navy rounded-xl flex items-center justify-center">
                <span className="text-gold font-bold text-sm">BF</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-navy leading-tight">{config.label}</h1>
                <p className="text-xs text-gray-400">{config.sub}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400 hidden lg:block">Réseau : Cardano Mainnet</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 hidden md:block">{profile?.full_name || profile?.email}</span>
                <div className={`w-8 h-8 ${config.color} rounded-full flex items-center justify-center text-xs text-white font-medium`}>
                  {(profile?.full_name || profile?.email || "?").charAt(0).toUpperCase()}
                </div>
              </div>
              <button
                onClick={() => { signOut(); navigate("/"); }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-2"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          <PortalRouter toast={toast} />
        </main>

        <footer className="border-t border-gray-100 bg-white mt-auto">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-gray-400">
            <span>Bridge Fund SCSp · CSSF regulated · Luxembourg</span>
            <span>Portail sécurisé · Données en temps réel</span>
          </div>
        </footer>

        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    </AppProvider>
  );
}

function AppContent() {
  const { user, loading, signIn } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-navy/20 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-navy/60 text-sm font-medium">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={signIn} />;
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
