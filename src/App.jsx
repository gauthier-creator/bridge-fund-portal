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
      <div className="min-h-screen bg-[#FDFCFC]">
        {/* ─── Header (ElevenLabs-inspired) ─── */}
        <header className="bg-white/80 backdrop-blur-md border-b border-[rgba(0,0,29,0.07)] sticky top-0 z-40">
          <div className="max-w-[1400px] mx-auto px-6 h-[52px] flex items-center justify-between">
            {/* Left: Brand + Role */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#0F0F10] rounded-[10px] flex items-center justify-center">
                  <span className="text-white font-bold text-[10px] tracking-wider">BF</span>
                </div>
                <span className="text-[14px] font-semibold text-[#0F0F10] tracking-[-0.01em] hidden sm:block">Bridge Fund</span>
              </div>
              <div className="hidden md:flex items-center">
                <div className="w-px h-4 bg-[rgba(0,0,29,0.1)] mx-1" />
                <span className="text-[13px] text-[#787881] font-medium ml-2">{config.label}</span>
              </div>
            </div>

            {/* Right: Actions + User */}
            <div className="flex items-center gap-2.5">
              {/* Network badge */}
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] border border-[rgba(0,0,29,0.08)] bg-white hover:bg-[#F5F3F1] transition-colors cursor-default">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C]" style={{ animation: "pulse-dot 2s infinite" }} />
                <span className="text-[12px] text-[#0F0F10] font-medium">Preprod</span>
              </div>

              {/* User pill */}
              <div className="flex items-center gap-2.5 pl-3 pr-1.5 py-1 rounded-full border border-[rgba(0,0,29,0.08)] bg-white hover:bg-[#F5F3F1] transition-colors">
                <div className="text-right hidden sm:block">
                  <p className="text-[12px] font-medium text-[#0F0F10] leading-tight">{profile?.full_name || profile?.email}</p>
                </div>
                <div className="w-7 h-7 bg-[#0F0F10] rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                  {(profile?.full_name || profile?.email || "?").charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={async () => { await signOut(); navigate("/"); }}
                className="w-8 h-8 rounded-[10px] border border-[rgba(0,0,29,0.08)] bg-white hover:bg-[#F5F3F1] flex items-center justify-center text-[#787881] hover:text-[#0F0F10] transition-all duration-150"
                title="Deconnexion"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* ─── Main ─── */}
        <main className="max-w-[1400px] mx-auto px-6 py-7">
          <PortalRouter toast={toast} />
        </main>

        {/* ─── Footer ─── */}
        <footer className="border-t border-[rgba(0,0,29,0.05)]">
          <div className="max-w-[1400px] mx-auto px-6 py-3.5 flex items-center justify-between text-[11px] text-[#B0B0B8]">
            <span>Bridge Fund SCSp · CSSF regulated · Luxembourg</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#0F0F10]" />
                Portail securise
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#00C48C]" />
                Donnees en temps reel
              </span>
            </div>
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
          <div className="w-10 h-10 border-[2px] border-[#E8ECF1] border-t-[#0D0D12] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#9AA4B2] text-[13px] font-medium">Chargement…</p>
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
