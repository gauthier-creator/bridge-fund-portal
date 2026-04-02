import { useState, useEffect } from "react";
import { getFund } from "../services/fundService";
import { shortenHash, getExplorerUrl } from "../services/cardanoService";

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function FundDetail({ fundSlug, onBack, onInvest }) {
  const [fund, setFund] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fundSlug) return;
    setLoading(true);
    getFund(fundSlug)
      .then(setFund)
      .finally(() => setLoading(false));
  }, [fundSlug]);

  if (loading) {
    return (
      <div className="page-slide-in space-y-6">
        <div className="skeleton h-8 w-32" />
        <div className="skeleton h-[240px] rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />)}
        </div>
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="text-center py-20 page-slide-in">
        <p className="text-[#A8A29E] text-[14px] mb-4">Fonds introuvable</p>
        <button onClick={onBack} className="text-[14px] text-[#6366F1] hover:text-[#0F0F10] transition-colors font-medium">← Retour aux fonds</button>
      </div>
    );
  }

  const highlights = Array.isArray(fund.highlights) ? fund.highlights : [];
  const shareClasses = Array.isArray(fund.shareClasses) ? fund.shareClasses : [];
  const structureItems = [
    { label: "Juridiction", value: fund.jurisdiction },
    { label: "Forme juridique", value: fund.legalForm },
    { label: "AIFM", value: fund.aifm },
    { label: "Depositaire", value: fund.custodian },
    { label: "Auditeur", value: fund.auditor },
    { label: "Administrateur", value: fund.administrator },
    { label: "Regulation", value: fund.regulatoryStatus },
  ].filter((i) => i.value);

  return (
    <div className="space-y-6 page-slide-in">
      {/* Back nav */}
      <button onClick={onBack} className="flex items-center gap-2 text-[13px] text-[#787881] hover:text-[#0F0F10] transition-colors font-medium group">
        <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Retour aux fonds
      </button>

      {/* Hero card */}
      <div className="bg-[#0F0F10] rounded-2xl p-8 lg:p-10 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#6366F1]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-[#059669]/3 rounded-full blur-3xl" />

        <div className="relative stagger-hero">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.08] text-[11px] font-medium uppercase tracking-wider text-[#A78BFA] mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
              {fund.regulatoryStatus}
            </div>
          </div>
          <div>
            <h1 className="text-[28px] lg:text-[32px] font-bold text-white mb-2 tracking-tight">{fund.fundName}</h1>
          </div>
          <div>
            <p className="text-[#787881] text-[14px] mb-8 max-w-2xl leading-relaxed">{fund.fundSubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => onInvest(fund)}
              className="px-7 py-2.5 bg-white text-[#0F0F10] font-medium rounded-[9.6px] hover:bg-white/90 transition-all duration-150 text-[14px] active:scale-[0.98]">
              Investir dans ce fonds
            </button>
            {fund.cardanoTxHash && (
              <a href={getExplorerUrl(fund.cardanoTxHash, fund.blockchainNetwork)} target="_blank" rel="noopener noreferrer"
                className="px-5 py-2.5 border border-white/[0.1] text-white/70 rounded-[9.6px] hover:bg-white/[0.05] hover:text-white transition-all duration-150 text-[14px] flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
                </span>
                Voir sur Cardano
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-fast">
        {[
          { label: "Rendement cible", value: fund.targetReturn || "—" },
          { label: "NAV / Part", value: fund.navPerShare ? fmt(fund.navPerShare) : "—" },
          { label: "Invest. minimum", value: fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—" },
          { label: "Taille du fonds", value: fund.fundSize ? fmt(fund.fundSize) : "—" },
        ].map((m, i) => (
          <div key={i} className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl hover:border-[rgba(0,0,29,0.15)] transition-all duration-150 p-5 text-center">
            <p className="text-[12px] text-[#A8A29E] font-medium mb-1">{m.label}</p>
            <p className="text-[22px] font-bold text-[#0F0F10] tabular-nums">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Cardano Registry */}
      {fund.cardanoPolicyId && (
        <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-6 page-slide-in">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-[#0F0F10]">Registre Blockchain Cardano</h3>
              <p className="text-[11px] text-[#A8A29E]">Verifie on-chain — Preprod Testnet</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { label: "Policy ID", value: fund.cardanoPolicyId },
              { label: "Script Address", value: shortenHash(fund.cardanoScriptAddress, 12) },
              { label: "Transaction", value: shortenHash(fund.cardanoTxHash, 12) },
            ].map((item, i) => (
              <div key={i} className="bg-[rgba(0,0,23,0.025)] rounded-xl p-4 hover:bg-[rgba(0,0,23,0.04)] transition-colors">
                <p className="text-[12px] text-[#A8A29E] font-medium mb-1">{item.label}</p>
                <p className="font-mono text-[#0F0F10] text-[12px] break-all">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy & Thesis */}
      <div className="grid md:grid-cols-2 gap-5 stagger-children">
        {fund.strategy && (
          <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-6 hover:border-[rgba(0,0,29,0.12)] transition-colors">
            <h3 className="text-[16px] font-semibold text-[#0F0F10] mb-3 tracking-tight">Strategie d'investissement</h3>
            <p className="text-[13px] text-[#787881] leading-relaxed whitespace-pre-line">{fund.strategy}</p>
          </div>
        )}
        {fund.investmentThesis && (
          <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-6 hover:border-[rgba(0,0,29,0.12)] transition-colors">
            <h3 className="text-[16px] font-semibold text-[#0F0F10] mb-3 tracking-tight">These d'investissement</h3>
            <p className="text-[13px] text-[#787881] leading-relaxed whitespace-pre-line">{fund.investmentThesis}</p>
          </div>
        )}
      </div>

      {/* Highlights */}
      {highlights.length > 0 && (
        <div>
          <h3 className="text-[16px] font-semibold text-[#0F0F10] mb-4 tracking-tight">Points cles</h3>
          <div className="grid md:grid-cols-3 gap-3 stagger-children">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-3 bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-4 hover:border-[rgba(0,0,29,0.12)] transition-colors">
                <div className="w-7 h-7 bg-[#ECFDF5] rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[13px] text-[#0F0F10] font-medium">{h}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Classes */}
      {shareClasses.length > 0 && (
        <div>
          <h3 className="text-[16px] font-semibold text-[#0F0F10] mb-4 tracking-tight">Classes de parts</h3>
          <div className="grid md:grid-cols-2 gap-4 stagger-children">
            {shareClasses.map((sc) => (
              <div key={sc.id} className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-5 hover:border-[rgba(0,0,29,0.12)] transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold ${sc.id === 1 ? "bg-[#0F0F10] text-white" : "bg-[#EEF2FF] text-[#6366F1]"}`}>
                    {sc.id}
                  </div>
                  <h4 className="text-[14px] font-semibold text-[#0F0F10]">{sc.name}</h4>
                </div>
                <div className="space-y-2 text-[13px]">
                  <div className="flex justify-between py-1"><span className="text-[#787881]">Rendement cible</span><span className="font-medium text-[#0F0F10] tabular-nums">{sc.targetReturn}</span></div>
                  <div className="flex justify-between py-1"><span className="text-[#787881]">Duree</span><span className="font-medium text-[#0F0F10]">{sc.duration}</span></div>
                  <div className="flex justify-between py-1"><span className="text-[#787881]">Risque</span><span className="font-medium text-[#0F0F10]">{sc.risk}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fund Structure */}
      {structureItems.length > 0 && (
        <div>
          <h3 className="text-[16px] font-semibold text-[#0F0F10] mb-4 tracking-tight">Structure du fonds</h3>
          <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl overflow-hidden">
            {structureItems.map((item, i) => (
              <div key={i}
                className={`flex items-center justify-between px-6 py-3.5 hover:bg-[rgba(0,0,23,0.015)] transition-colors ${i < structureItems.length - 1 ? "border-b border-[rgba(0,0,29,0.05)]" : ""}`}
                style={{ animation: `revealUp 0.3s var(--ease-out) ${i * 50}ms both` }}>
                <span className="text-[13px] text-[#787881]">{item.label}</span>
                <span className="text-[13px] font-medium text-[#0F0F10]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="bg-[#0F0F10] rounded-2xl p-8 text-center relative overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-32 bg-[#6366F1]/5 rounded-full blur-3xl" />
        <div className="relative">
          <h3 className="text-[20px] font-bold text-white mb-2 tracking-tight">Pret a investir ?</h3>
          <p className="text-[#787881] text-[14px] mb-6 max-w-md mx-auto">
            Accedez a {fund.fundName} avec un investissement minimum de {fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—"}
          </p>
          <button onClick={() => onInvest(fund)}
            className="px-8 py-3 bg-white text-[#0F0F10] font-semibold rounded-[9.6px] hover:bg-white/90 transition-all duration-150 active:scale-[0.98]">
            Commencer la souscription
          </button>
        </div>
      </div>
    </div>
  );
}
