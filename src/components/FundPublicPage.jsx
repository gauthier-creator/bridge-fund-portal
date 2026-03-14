import { useState, useEffect } from "react";
import { getFundConfig } from "../services/fundConfigService";

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

// Default config used while loading or if DB not available
const DEFAULT_CONFIG = {
  fund_name: "Bridge Fund SCSp",
  fund_subtitle: "Fonds de dette privée tokenisé sur Cardano",
  description: "Bridge Fund est un fonds d'investissement alternatif spécialisé dans la dette privée, structuré sous forme de SCSp luxembourgeoise et tokenisé sur la blockchain Cardano.",
  strategy: "Notre stratégie repose sur l'origination directe de prêts garantis à des PME européennes, avec un focus sur des maturités courtes (12-36 mois) et des garanties réelles.",
  investment_thesis: "Dans un environnement de taux élevés, la dette privée offre un rendement attractif avec une volatilité maîtrisée.",
  target_return: "8-12% net",
  minimum_investment: 125000,
  fund_size: 50000000,
  nav_per_share: 1043.27,
  jurisdiction: "Luxembourg",
  legal_form: "SCSp (Société en Commandite Spéciale)",
  aifm: "Bridge Capital Management",
  custodian: "Banque de Luxembourg",
  auditor: "PricewaterhouseCoopers",
  administrator: "Apex Fund Services",
  regulatory_status: "CSSF regulated",
  highlights: [
    "Rendement cible 8-12% net annuel",
    "Tokenisé sur blockchain Cardano",
    "Liquidité améliorée via marché secondaire",
    "Transparence totale du portefeuille",
    "Distributions trimestrielles automatisées",
    "Régulé CSSF Luxembourg",
  ],
};

export default function FundPublicPage({ onInvest }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFundConfig()
      .then((data) => { if (data) setConfig({ ...DEFAULT_CONFIG, ...data }); })
      .finally(() => setLoading(false));
  }, []);

  const highlights = Array.isArray(config.highlights) ? config.highlights : [];

  const structureItems = [
    { label: "Juridiction", value: config.jurisdiction },
    { label: "Forme juridique", value: config.legal_form },
    { label: "AIFM", value: config.aifm },
    { label: "Dépositaire", value: config.custodian },
    { label: "Auditeur", value: config.auditor },
    { label: "Administrateur", value: config.administrator },
    { label: "Régulation", value: config.regulatory_status },
  ].filter((i) => i.value);

  return (
    <div className="min-h-screen bg-cream font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-navy rounded-xl flex items-center justify-center">
              <span className="text-gold font-bold text-sm">BF</span>
            </div>
            <span className="text-lg font-semibold text-navy">{config.fund_name}</span>
          </div>
          <button
            onClick={onInvest}
            className="px-5 py-2 bg-gold text-white text-sm font-medium rounded-xl hover:bg-gold/90 transition-colors"
          >
            Investir
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-navy text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-gold text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              {config.regulatory_status}
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">{config.fund_name}</h1>
            <p className="text-lg text-white/70 mb-8">{config.fund_subtitle}</p>
            <p className="text-base text-white/60 mb-10 leading-relaxed max-w-2xl">{config.description}</p>
            <div className="flex items-center gap-4">
              <button
                onClick={onInvest}
                className="px-8 py-3.5 bg-gold text-white font-medium rounded-xl hover:bg-gold/90 transition-colors text-sm"
              >
                Commencer à investir
              </button>
              <a href="#strategy" className="px-6 py-3.5 border border-white/20 text-white/80 rounded-xl hover:bg-white/5 transition-colors text-sm">
                En savoir plus
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Rendement cible</p>
              <p className="text-2xl font-bold text-navy">{config.target_return || "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">NAV / Part</p>
              <p className="text-2xl font-bold text-navy">{config.nav_per_share ? fmt(config.nav_per_share) : "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Investissement min.</p>
              <p className="text-2xl font-bold text-navy">{config.minimum_investment ? fmt(config.minimum_investment) : "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Taille du fonds</p>
              <p className="text-2xl font-bold text-navy">{config.fund_size ? fmt(config.fund_size) : "—"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Strategy */}
      <section id="strategy" className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold text-navy mb-4">Stratégie d'investissement</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{config.strategy}</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-navy mb-4">Thèse d'investissement</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{config.investment_thesis}</p>
          </div>
        </div>
      </section>

      {/* Highlights */}
      {highlights.length > 0 && (
        <section className="bg-white border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-2xl font-bold text-navy mb-8 text-center">Points clés</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-3 bg-cream rounded-2xl p-5">
                  <div className="w-8 h-8 bg-gold/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-navy font-medium">{h}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Fund Structure */}
      {structureItems.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-navy mb-8 text-center">Structure du fonds</h2>
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden max-w-2xl mx-auto">
            {structureItems.map((item, i) => (
              <div key={i} className={`flex items-center justify-between px-6 py-4 ${i < structureItems.length - 1 ? "border-b border-gray-50" : ""}`}>
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-medium text-navy">{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-navy">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Prêt à investir ?</h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            Accédez à des opportunités de dette privée tokenisée avec un rendement cible de {config.target_return || "8-12%"} net annuel.
          </p>
          <button
            onClick={onInvest}
            className="px-10 py-4 bg-gold text-white font-semibold rounded-xl hover:bg-gold/90 transition-colors text-base"
          >
            Commencer à investir
          </button>
          <p className="text-white/30 text-xs mt-4">Investissement minimum : {config.minimum_investment ? fmt(config.minimum_investment) : "125 000 €"}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-gray-400">
          <span>{config.fund_name} · {config.regulatory_status} · {config.jurisdiction}</span>
          <span>Portail sécurisé · Données en temps réel</span>
        </div>
      </footer>
    </div>
  );
}
