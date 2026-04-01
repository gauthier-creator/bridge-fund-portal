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
      <div className="min-h-screen bg-[#FAFAFA]">
        {/* ─── Header ─── */}
        <header className="bg-white/80 backdrop-blur-[12px] border-b border-[#E5E5E5] sticky top-0 z-40">
          <div className="max-w-[1280px] mx-auto px-6 h-12 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-[#0A0A0A] rounded-md flex items-center justify-center">
                  <span className="text-white font-semibold text-[9px] tracking-wider">BF</span>
                </div>
                <span className="text-[14px] font-semibold text-[#0A0A0A] tracking-[-0.01em] hidden sm:block">Bridge Fund</span>
              </div>
              <span className="hidden md:block text-[#D4D4D4]">/</span>
              <span className="hidden md:block text-[13px] text-[#737373]">{config.label}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md border border-[#E5E5E5] text-[12px] text-[#525252] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00A67E] pulse-dot" />
                Preprod
              </div>

              <div className="flex items-center gap-2 pl-2.5 pr-1 py-0.5 rounded-md border border-[#E5E5E5] hover:bg-[#FAFAFA] transition-colors">
                <span className="text-[12px] font-medium text-[#0A0A0A] hidden sm:block">{profile?.full_name || profile?.email}</span>
                <div className="w-6 h-6 bg-[#0A0A0A] rounded-full flex items-center justify-center text-[9px] text-white font-semibold">
                  {(profile?.full_name || profile?.email || "?").charAt(0).toUpperCase()}
                </div>
              </div>

              <button onClick={async () => { await signOut(); navigate("/"); }}
                className="w-7 h-7 rounded-md border border-[#E5E5E5] flex items-center justify-center text-[#A3A3A3] hover:text-[#0A0A0A] hover:bg-[#FAFAFA] transition-all duration-150" title="Deconnexion">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-[1280px] mx-auto px-6 py-6">
          <PortalRouter toast={toast} />
        </main>

        <footer className="border-t border-[#F0F0F0]">
          <div className="max-w-[1280px] mx-auto px-6 py-3 flex items-center justify-between text-[11px] text-[#A3A3A3]">
            <span>Bridge Fund SCSp · CSSF regulated · Luxembourg</span>
            <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-[#00A67E]" />Live</span>
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
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#E5E5E5] border-t-[#0A0A0A] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#A3A3A3] text-[13px]">Chargement...</p>
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
