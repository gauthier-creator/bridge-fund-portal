import { useState, useEffect } from "react";
import { getFund } from "../services/fundService";
import { shortenHash, getExplorerUrl } from "../services/cardanoService";
import { useInView } from "./shared";

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function FundDetail({ fundSlug, onBack, onInvest }) {
  const [fund, setFund] = useState(null);
  const [loading, setLoading] = useState(true);

  // Scroll-triggered sections
  const [metricsRef, metricsVisible] = useInView();
  const [strategyRef, strategyVisible] = useInView();
  const [highlightsRef, highlightsVisible] = useInView();
  const [classesRef, classesVisible] = useInView();
  const [structureRef, structureVisible] = useInView();
  const [ctaRef, ctaVisible] = useInView();

  useEffect(() => {
    if (!fundSlug) return;
    setLoading(true);
    getFund(fundSlug)
      .then(setFund)
      .finally(() => setLoading(false));
  }, [fundSlug]);

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="skeleton h-8 w-32" />
        <div className="skeleton h-[280px] rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />)}
        </div>
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <p className="text-[#9AA4B2] text-sm mb-4">Fonds introuvable</p>
        <button onClick={onBack} className="text-sm text-[#4F7DF3] hover:text-[#1A1A2E] transition-colors font-medium">← Retour aux fonds</button>
      </div>
    );
  }

  const highlights = Array.isArray(fund.highlights) ? fund.highlights : [];
  const shareClasses = Array.isArray(fund.shareClasses) ? fund.shareClasses : [];
  const structureItems = [
    { label: "Juridiction", value: fund.jurisdiction },
    { label: "Forme juridique", value: fund.legalForm },
    { label: "AIFM", value: fund.aifm },
    { label: "Dépositaire", value: fund.custodian },
    { label: "Auditeur", value: fund.auditor },
    { label: "Administrateur", value: fund.administrator },
    { label: "Régulation", value: fund.regulatoryStatus },
  ].filter((i) => i.value);

  return (
    <div className="space-y-8">
      {/* Back nav — slide in from left */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[#5F6B7A] hover:text-[#0D0D12] transition-colors font-medium animate-slide-in-left group">
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Retour aux fonds
      </button>

      {/* Hero card — cinematic entrance */}
      <div className="bg-[#0D0D12] rounded-2xl p-8 lg:p-12 relative overflow-hidden animate-reveal-scale">
        {/* Animated dot pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots-detail" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots-detail)" />
        </svg>

        {/* Decorative gradient orb */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#4F7DF3]/5 rounded-full blur-3xl animate-breathe" />
        <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-[#00C48C]/3 rounded-full blur-3xl animate-breathe" style={{ animationDelay: "2s" }} />

        <div className="relative stagger-hero">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/[0.08] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#818CF8] mb-4 animate-badge-pop" style={{ animationDelay: "200ms" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F7DF3]" />
              {fund.regulatoryStatus}
            </div>
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 tracking-tight animate-hero-text">{fund.fundName}</h1>
          </div>
          <div>
            <p className="text-[#9AA4B2] mb-8 max-w-2xl leading-relaxed">{fund.fundSubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onInvest(fund)}
              className="px-8 py-3 bg-white text-[#0D0D12] font-medium rounded-xl hover:bg-white/90 transition-all duration-200 text-sm btn-lift"
            >
              Investir dans ce fonds
            </button>
            {fund.cardanoTxHash && (
              <a
                href={getExplorerUrl(fund.cardanoTxHash, fund.blockchainNetwork)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 border border-white/[0.12] text-white/70 rounded-xl hover:bg-white/[0.06] hover:text-white hover:border-white/20 transition-all duration-200 text-sm flex items-center gap-2"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00C48C] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00C48C]"></span>
                </span>
                Voir sur Cardano
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics — staggered card lift */}
      <div
        ref={metricsRef}
        className={`grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-500 ${metricsVisible ? "stagger-fast" : "opacity-0"}`}
      >
        {[
          { label: "Rendement cible", value: fund.targetReturn || "—" },
          { label: "NAV / Part", value: fund.navPerShare ? fmt(fund.navPerShare) : "—" },
          { label: "Invest. minimum", value: fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—" },
          { label: "Taille du fonds", value: fund.fundSize ? fmt(fund.fundSize) : "—" },
        ].map((m, i) => (
          <div key={i} className="bg-white border border-[#E8ECF1] rounded-2xl hover:border-[#D1D5DB] transition-all duration-200 p-5 text-center card-elevated">
            <p className="text-[13px] text-[#9AA4B2] font-medium mb-1">{m.label}</p>
            <p className="text-2xl font-bold text-[#0D0D12] tabular-nums count-value">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Cardano Registry Info */}
      {fund.cardanoPolicyId && (
        <div className="bg-white border border-[#E8ECF1] rounded-2xl p-6 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#0D0D12]">Registre Blockchain Cardano</h3>
              <p className="text-[11px] text-[#9AA4B2]">Vérifié on-chain — Preprod Testnet</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            {[
              { label: "Policy ID", value: fund.cardanoPolicyId, mono: true },
              { label: "Script Address", value: shortenHash(fund.cardanoScriptAddress, 12), mono: true },
              { label: "Transaction", value: shortenHash(fund.cardanoTxHash, 12), mono: true },
            ].map((item, i) => (
              <div key={i} className="bg-[#F7F8FA] rounded-xl p-4 hover:bg-[#F0F2F5] transition-colors duration-200" style={{ animationDelay: `${500 + i * 100}ms` }}>
                <p className="text-[13px] text-[#9AA4B2] font-medium mb-1">{item.label}</p>
                <p className="font-mono text-[#0D0D12] text-xs break-all">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy & Thesis — scroll-triggered */}
      <div
        ref={strategyRef}
        className={`grid md:grid-cols-2 gap-6 transition-all duration-700 ${strategyVisible ? "" : "opacity-0 translate-y-8"}`}
      >
        {fund.strategy && (
          <div className="bg-white border border-[#E8ECF1] rounded-2xl p-6 card-elevated" style={strategyVisible ? { animation: "fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards" } : undefined}>
            <h3 className="text-lg font-semibold text-[#0D0D12] mb-3 tracking-tight">Stratégie d'investissement</h3>
            <p className="text-sm text-[#5F6B7A] leading-relaxed whitespace-pre-line">{fund.strategy}</p>
          </div>
        )}
        {fund.investmentThesis && (
          <div className="bg-white border border-[#E8ECF1] rounded-2xl p-6 card-elevated" style={strategyVisible ? { animation: "fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards", opacity: 0 } : undefined}>
            <h3 className="text-lg font-semibold text-[#0D0D12] mb-3 tracking-tight">Thèse d'investissement</h3>
            <p className="text-sm text-[#5F6B7A] leading-relaxed whitespace-pre-line">{fund.investmentThesis}</p>
          </div>
        )}
      </div>

      {/* Highlights — scroll-triggered stagger */}
      {highlights.length > 0 && (
        <div ref={highlightsRef}>
          <h3 className={`text-lg font-semibold text-[#0D0D12] mb-4 tracking-tight transition-all duration-500 ${highlightsVisible ? "animate-fade-in" : "opacity-0"}`}>Points clés</h3>
          <div className={`grid md:grid-cols-3 gap-4 ${highlightsVisible ? "stagger-children" : ""}`}>
            {highlights.map((h, i) => (
              <div key={i} className={`flex items-start gap-3 bg-white border border-[#E8ECF1] rounded-2xl p-5 card-elevated ${highlightsVisible ? "" : "opacity-0"}`}>
                <div className="w-8 h-8 bg-[#ECFDF5] rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-[#0D0D12] font-medium">{h}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Classes — scroll-triggered */}
      {shareClasses.length > 0 && (
        <div ref={classesRef}>
          <h3 className={`text-lg font-semibold text-[#0D0D12] mb-4 tracking-tight transition-all duration-500 ${classesVisible ? "animate-fade-in" : "opacity-0"}`}>Classes de parts</h3>
          <div className={`grid md:grid-cols-2 gap-4 ${classesVisible ? "stagger-children" : ""}`}>
            {shareClasses.map((sc) => (
              <div key={sc.id} className={`bg-white border border-[#E8ECF1] rounded-2xl p-6 card-interactive ${classesVisible ? "" : "opacity-0"}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-transform duration-300 group-hover:scale-110 ${sc.id === 1 ? "bg-[#0D0D12] text-white" : "bg-[#EEF2FF] text-[#4F7DF3]"}`}>
                    {sc.id}
                  </div>
                  <h4 className="text-sm font-semibold text-[#0D0D12]">{sc.name}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1"><span className="text-[#5F6B7A]">Rendement cible</span><span className="font-medium text-[#0D0D12] tabular-nums">{sc.targetReturn}</span></div>
                  <div className="flex justify-between py-1"><span className="text-[#5F6B7A]">Durée</span><span className="font-medium text-[#0D0D12]">{sc.duration}</span></div>
                  <div className="flex justify-between py-1"><span className="text-[#5F6B7A]">Risque</span><span className="font-medium text-[#0D0D12]">{sc.risk}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fund Structure — scroll-triggered with row stagger */}
      {structureItems.length > 0 && (
        <div ref={structureRef}>
          <h3 className={`text-lg font-semibold text-[#0D0D12] mb-4 tracking-tight transition-all duration-500 ${structureVisible ? "animate-fade-in" : "opacity-0"}`}>Structure du fonds</h3>
          <div className={`bg-white border border-[#E8ECF1] rounded-2xl overflow-hidden ${structureVisible ? "animate-fade-in-up" : "opacity-0"}`}>
            {structureItems.map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-6 py-4 hover:bg-[#FAFBFC] transition-colors duration-200 ${i < structureItems.length - 1 ? "border-b border-[#E8ECF1]" : ""}`}
                style={structureVisible ? { animation: `table-row 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${i * 60}ms forwards`, opacity: 0 } : undefined}
              >
                <span className="text-sm text-[#5F6B7A]">{item.label}</span>
                <span className="text-sm font-medium text-[#0D0D12]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA — scroll-triggered cinematic entrance */}
      <div
        ref={ctaRef}
        className={`bg-[#0D0D12] rounded-2xl p-8 lg:p-10 text-center relative overflow-hidden transition-all duration-700 ${ctaVisible ? "animate-reveal-scale" : "opacity-0 scale-95"}`}
      >
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots-cta" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots-cta)" />
        </svg>

        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-32 bg-[#4F7DF3]/5 rounded-full blur-3xl animate-breathe" />

        <div className="relative">
          <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Prêt à investir ?</h3>
          <p className="text-[#9AA4B2] text-sm mb-6 max-w-md mx-auto">
            Accédez à {fund.fundName} avec un investissement minimum de {fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—"}
          </p>
          <button
            onClick={() => onInvest(fund)}
            className="px-10 py-3.5 bg-white text-[#0D0D12] font-semibold rounded-xl hover:bg-white/90 transition-all duration-200 btn-lift"
          >
            Commencer la souscription
          </button>
        </div>
      </div>
    </div>
  );
}
