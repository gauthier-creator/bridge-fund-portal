import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { ToastContainer, useToast } from "./components/shared";
import LoginPage from "./components/LoginPage";
import Onboarding from "./components/Onboarding";
import FundPublicPage from "./components/FundPublicPage";
import PortailLP from "./portals/PortailLP";
import PortailSwissLife from "./portals/PortailSwissLife";
import PortailAIFM from "./portals/PortailAIFM";
import PortailAdmin from "./portals/PortailAdmin";

const ROLE_CONFIG = {
  investor: { path: "/investisseur", label: "Investisseur", sub: "Catalogue & souscription", icon: "LP", color: "bg-[#0D0D12]" },
  intermediary: { path: "/intermediaire", label: "Intermediaire", sub: "Souscription & custody", icon: "SL", color: "bg-[#0D0D12]" },
  aifm: { path: "/aifm", label: "AIFM", sub: "Gestion & validation", icon: "AI", color: "bg-[#0D0D12]" },
  admin: { path: "/admin", label: "Admin", sub: "Vue d'ensemble", icon: "GA", color: "bg-[#0D0D12]" },
};

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

  useEffect(() => {
    if (role) {
      const config = ROLE_CONFIG[role];
      if (config && !Object.values(ROLE_CONFIG).some((c) => route.startsWith(c.path))) {
        navigate(config.path);
      }
    }
  }, [role, route]);

  if (route.startsWith("/investisseur")) return <PortailLP toast={toast} />;
  if (route.startsWith("/intermediaire")) return <PortailSwissLife toast={toast} />;
  if (route.startsWith("/aifm")) return <PortailAIFM toast={toast} />;
  if (route.startsWith("/admin")) return <PortailAdmin toast={toast} />;

  return <div className="text-center py-20 text-[#9AA4B2]">Chargement…</div>;
}

function AuthenticatedApp() {
  const { profile, role, signOut } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.investor;

  return (
    <AppProvider>
      <div className="min-h-screen bg-white">
        {/* ─── Header (ElevenLabs-style) ─── */}
        <header className="bg-white border-b border-[rgba(0,0,29,0.075)] sticky top-0 z-40">
          <div className="max-w-[1200px] mx-auto px-6 h-[52px] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#0F0F10] rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-[10px] tracking-wider">BF</span>
                </div>
                <span className="text-[15px] font-semibold text-[#0F0F10] tracking-tight hidden sm:block">Bridge Fund</span>
              </div>
              <div className="hidden md:flex items-center">
                <span className="text-[14px] text-[#787881]">{config.label}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-[9.6px] border border-[rgba(0,0,29,0.1)] text-[12px] text-[#0F0F10] font-medium hover:bg-[rgba(0,0,23,0.02)] transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] pulse-dot" />
                Preprod
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-[9.6px] border border-[rgba(0,0,29,0.1)] hover:bg-[rgba(0,0,23,0.02)] transition-colors cursor-default">
                <span className="text-[13px] font-medium text-[#0F0F10] hidden sm:block">{profile?.full_name || profile?.email}</span>
                <div className="w-7 h-7 bg-[#0F0F10] rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                  {(profile?.full_name || profile?.email || "?").charAt(0).toUpperCase()}
                </div>
              </div>

              <button onClick={async () => { await signOut(); navigate("/"); }}
                className="w-8 h-8 rounded-[9.6px] border border-[rgba(0,0,29,0.1)] flex items-center justify-center text-[#787881] hover:text-[#0F0F10] hover:bg-[rgba(0,0,23,0.02)] transition-all duration-75" title="Deconnexion">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-[1200px] mx-auto px-6 py-8">
          <PortalRouter toast={toast} />
        </main>

        <footer className="border-t border-[rgba(0,0,29,0.05)]">
          <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between text-[11px] text-[#A8A29E]">
            <span>Bridge Fund SCSp · CSSF regulated · Luxembourg</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />Donnees en temps reel</span>
          </div>
        </footer>

        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    </AppProvider>
  );
}

function AppContent() {
  const route = useHashRoute();
  const { user, role, loading, signIn } = useAuth();
  const [returnTo, setReturnTo] = useState(null);

  useEffect(() => {
    if (user && role && returnTo) {
      const config = ROLE_CONFIG[role];
      if (config) navigate(config.path);
      setReturnTo(null);
    }
  }, [user, role, returnTo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[rgba(0,0,29,0.1)] border-t-[#0F0F10] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#787881] text-[13px]">Chargement...</p>
        </div>
      </div>
    );
  }

  // Onboarding route — always accessible via #/onboarding or #/inscription
  if (!user && (route === "/onboarding" || route === "/inscription")) {
    return <Onboarding
      onComplete={() => navigate("/")}
      onLogin={() => navigate("/se-connecter")}
    />;
  }

  // First-time visitors → auto-show onboarding
  const seenOnboarding = localStorage.getItem("bf_onboarding_seen");
  if (!user && route === "/" && !seenOnboarding) {
    return <Onboarding
      onComplete={() => navigate("/")}
      onLogin={() => navigate("/se-connecter")}
    />;
  }

  if (!user && (route === "/" || route.startsWith("/fund"))) {
    return <FundPublicPage
      onInvest={() => { setReturnTo(true); navigate("/se-connecter"); }}
      onSignup={() => navigate("/inscription")}
    />;
  }

  if (!user) {
    return <LoginPage onLogin={signIn} onBack={() => navigate("/")} onSignup={() => navigate("/inscription")} />;
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
