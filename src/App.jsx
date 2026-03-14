import { useState } from "react";
import { AppProvider } from "./context/AppContext";
import { ToastContainer, useToast } from "./components/shared";
import PortailLP from "./portals/PortailLP";
import PortailSwissLife from "./portals/PortailSwissLife";
import PortailAIFM from "./portals/PortailAIFM";
import PortailAdmin from "./portals/PortailAdmin";

const portals = [
  { id: "lp", label: "Portail LP", sub: "Souscription directe & collatéral", icon: "LP", color: "bg-navy" },
  { id: "swisslife", label: "Portail SwissLife", sub: "Souscription intermédiée & custody", icon: "SL", color: "bg-blue-600" },
  { id: "aifm", label: "Portail AIFM", sub: "Gestion du fonds & validation", icon: "AI", color: "bg-gold" },
  { id: "admin", label: "Portail Admin", sub: "Vue d'ensemble propriétaire", icon: "GA", color: "bg-emerald-600" },
];

function AppContent() {
  const [activePortal, setActivePortal] = useState(null);
  const { toasts, toast, dismiss } = useToast();

  if (!activePortal) {
    return (
      <div className="min-h-screen bg-cream font-sans flex flex-col">
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 py-6 text-center">
            <div className="w-14 h-14 bg-navy rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-gold font-bold text-xl">BF</span>
            </div>
            <h1 className="text-2xl font-semibold text-navy">Bridge Fund Portal</h1>
            <p className="text-sm text-gray-400 mt-1">SLP Luxembourg · Fonds de dette tokenisé · Cardano</p>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="grid grid-cols-2 gap-6 max-w-2xl w-full">
            {portals.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePortal(p.id)}
                className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-8 text-left hover:shadow-md hover:border-gray-200 transition-all group"
              >
                <div className={`w-12 h-12 ${p.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                  <span className="text-white font-bold text-sm">{p.icon}</span>
                </div>
                <h2 className="text-lg font-semibold text-navy">{p.label}</h2>
                <p className="text-xs text-gray-400 mt-1">{p.sub}</p>
              </button>
            ))}
          </div>
        </main>

        <footer className="border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-gray-400">
            <span>Bridge Fund SCSp · CSSF regulated · Luxembourg</span>
            <span>Mode démonstration — données fictives</span>
          </div>
        </footer>
      </div>
    );
  }

  const current = portals.find((p) => p.id === activePortal);

  return (
    <div className="min-h-screen bg-cream font-sans">
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setActivePortal(null)} className="w-9 h-9 bg-navy rounded-xl flex items-center justify-center hover:bg-navy-light transition-colors">
              <span className="text-gold font-bold text-sm">BF</span>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-navy leading-tight">{current.label}</h1>
              <p className="text-xs text-gray-400">{current.sub}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 hidden lg:block">Réseau : Cardano Mainnet</span>
            <div className={`w-8 h-8 ${current.color} rounded-full flex items-center justify-center text-xs text-white font-medium`}>{current.icon}</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activePortal === "lp" && <PortailLP toast={toast} />}
        {activePortal === "swisslife" && <PortailSwissLife toast={toast} />}
        {activePortal === "aifm" && <PortailAIFM toast={toast} />}
        {activePortal === "admin" && <PortailAdmin toast={toast} />}
      </main>

      <footer className="border-t border-gray-100 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-gray-400">
          <span>Bridge Fund SCSp · CSSF regulated · Luxembourg</span>
          <span>Mode démonstration — données fictives</span>
        </div>
      </footer>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
