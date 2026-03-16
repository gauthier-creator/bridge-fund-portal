import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { ToastContainer, useToast } from "./components/shared";
import LoginPage from "./components/LoginPage";
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
        {/* ─── Header ─── */}
        <header className="bg-white border-b border-[#E8ECF1] sticky top-0 z-40">
          <div className="max-w-[1360px] mx-auto px-8 h-[56px] flex items-center justify-between">
            {/* Left: Brand */}
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#0D0D12] rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-[11px] tracking-wide">BF</span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-[15px] font-semibold text-[#0D0D12] tracking-[-0.01em]">Bridge Fund</span>
                </div>
              </div>
              <div className="hidden md:block w-px h-5 bg-[#E8ECF1]" />
              <span className="hidden md:block text-[13px] text-[#9AA4B2] font-medium">{config.label}</span>
            </div>

            {/* Right: Status + User */}
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0]/40">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C] pulse-dot" />
                <span className="text-[11px] text-[#059669] font-medium">Preprod</span>
              </div>
              <div className="w-px h-5 bg-[#E8ECF1] hidden lg:block" />
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[13px] font-medium text-[#0D0D12] leading-tight">{profile?.full_name || profile?.email}</p>
                  <p className="text-[11px] text-[#9AA4B2]">{config.sub}</p>
                </div>
                <div className="w-8 h-8 bg-[#0D0D12] rounded-xl flex items-center justify-center text-[11px] text-white font-bold">
                  {(profile?.full_name || profile?.email || "?").charAt(0).toUpperCase()}
                </div>
              </div>
              <button
                onClick={async () => { await signOut(); navigate("/"); }}
                className="text-[13px] text-[#9AA4B2] hover:text-[#0D0D12] transition-colors duration-150"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* ─── Main ─── */}
        <main className="max-w-[1360px] mx-auto px-8 py-8">
          <PortalRouter toast={toast} />
        </main>

        {/* ─── Footer ─── */}
        <footer className="border-t border-[#E8ECF1]">
          <div className="max-w-[1360px] mx-auto px-8 py-4 flex items-center justify-between text-[11px] text-[#9AA4B2]">
            <span>Bridge Fund SCSp · CSSF regulated · Luxembourg</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#0D0D12]" />
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

  if (!user && (route === "/" || route.startsWith("/fund"))) {
    return <FundPublicPage onInvest={() => { setReturnTo(true); navigate("/login"); }} />;
  }

  if (!user) {
    return <LoginPage onLogin={signIn} onBack={() => navigate("/")} />;
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
