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
        <div className="skeleton h-6 w-32" />
        <div className="skeleton h-48 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />)}
        </div>
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="text-center py-20 page-slide-in">
        <p className="text-[#787881] text-[14px] mb-4">Fonds introuvable</p>
        <button onClick={onBack} className="text-[14px] text-[#0F0F10] hover:text-[#787881] transition-colors font-medium">← Retour aux fonds</button>
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

  const metrics = [
    { label: "Rendement cible", value: fund.targetReturn || "—" },
    { label: "NAV / Part", value: fund.navPerShare ? fmt(fund.navPerShare) : "—" },
    { label: "Invest. minimum", value: fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—" },
    { label: "Taille du fonds", value: fund.fundSize ? fmt(fund.fundSize) : "—" },
  ];

  return (
    <div className="space-y-8 page-slide-in">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] text-[#787881] hover:text-[#0F0F10] transition-colors font-medium">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
        Retour aux fonds
      </button>

      {/* Hero */}
      <div className="border-b border-[rgba(0,0,29,0.06)] pb-8">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
            {fund.regulatoryStatus}
          </span>
          {fund.cardanoPolicyId && (
            <span className="text-[11px] font-mono text-[#A8A29E]">{shortenHash(fund.cardanoPolicyId, 6)}</span>
          )}
        </div>

        <h1 className="text-[28px] lg:text-[32px] font-semibold text-[#0F0F10] mb-2 tracking-tight leading-tight">{fund.fundName}</h1>
        <p className="text-[#787881] text-[15px] mb-6 max-w-2xl leading-relaxed">{fund.fundSubtitle}</p>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => onInvest(fund)}
            className="px-6 py-2.5 bg-[#0F0F10] text-white font-medium rounded-full hover:bg-[#292524] transition-colors text-[14px] active:scale-[0.98]">
            Investir dans ce fonds
          </button>
          {fund.cardanoTxHash && (
            <a href={getExplorerUrl(fund.cardanoTxHash, fund.blockchainNetwork)} target="_blank" rel="noopener noreferrer"
              className="px-5 py-2.5 border border-[rgba(0,0,29,0.12)] text-[#0F0F10] rounded-full hover:border-[rgba(0,0,29,0.25)] transition-colors text-[14px] flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#059669]" />
              Voir sur Cardano
            </a>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div key={i}
            className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-5"
            style={{ animation: `revealUp 0.4s var(--ease-out) ${i * 80}ms both` }}>
            <p className="text-[12px] text-[#A8A29E] font-medium mb-1">{m.label}</p>
            <p className="text-[20px] font-semibold text-[#0F0F10] tabular-nums">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Strategy & Thesis */}
      <div className="grid md:grid-cols-2 gap-5">
        {fund.strategy && (
          <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-6">
            <h3 className="text-[14px] font-semibold text-[#0F0F10] mb-3">Strategie d'investissement</h3>
            <p className="text-[13px] text-[#787881] leading-relaxed whitespace-pre-line">{fund.strategy}</p>
          </div>
        )}
        {fund.investmentThesis && (
          <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-6">
            <h3 className="text-[14px] font-semibold text-[#0F0F10] mb-3">These d'investissement</h3>
            <p className="text-[13px] text-[#787881] leading-relaxed whitespace-pre-line">{fund.investmentThesis}</p>
          </div>
        )}
      </div>

      {/* Highlights */}
      {highlights.length > 0 && (
        <div>
          <h3 className="text-[14px] font-semibold text-[#0F0F10] mb-4">Points cles</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-3 bg-white border border-[rgba(0,0,29,0.08)] rounded-xl p-4">
                <svg className="w-4 h-4 text-[#059669] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-[13px] text-[#0F0F10] leading-snug">{h}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Classes */}
      {shareClasses.length > 0 && (
        <div>
          <h3 className="text-[14px] font-semibold text-[#0F0F10] mb-4">Classes de parts</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {shareClasses.map((sc) => (
              <div key={sc.id} className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-8 rounded-lg bg-[rgba(0,0,23,0.04)] flex items-center justify-center text-[12px] font-semibold text-[#0F0F10]">{sc.id}</span>
                  <h4 className="text-[14px] font-semibold text-[#0F0F10]">{sc.name}</h4>
                </div>
                <div className="space-y-2.5 text-[13px]">
                  {[
                    ["Rendement cible", sc.targetReturn],
                    ["Duree", sc.duration],
                    ["Risque", sc.risk],
                  ].map(([label, value], i, arr) => (
                    <div key={label} className={`flex justify-between py-1.5 ${i < arr.length - 1 ? "border-b border-[rgba(0,0,29,0.04)]" : ""}`}>
                      <span className="text-[#787881]">{label}</span>
                      <span className="font-medium text-[#0F0F10] tabular-nums">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fund Structure */}
      {structureItems.length > 0 && (
        <div>
          <h3 className="text-[14px] font-semibold text-[#0F0F10] mb-4">Structure du fonds</h3>
          <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl overflow-hidden">
            {structureItems.map((item, i) => (
              <div key={i} className={`flex items-center justify-between px-6 py-3.5 ${i < structureItems.length - 1 ? "border-b border-[rgba(0,0,29,0.04)]" : ""}`}>
                <span className="text-[13px] text-[#787881]">{item.label}</span>
                <span className="text-[13px] font-medium text-[#0F0F10]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="border-t border-[rgba(0,0,29,0.06)] pt-8 text-center">
        <h3 className="text-[18px] font-semibold text-[#0F0F10] mb-2">Pret a investir ?</h3>
        <p className="text-[#787881] text-[14px] mb-5">
          Investissement minimum de {fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—"}
        </p>
        <button onClick={() => onInvest(fund)}
          className="px-8 py-3 bg-[#0F0F10] text-white font-medium rounded-full hover:bg-[#292524] transition-colors active:scale-[0.98] text-[14px]">
          Commencer la souscription
        </button>
      </div>
    </div>
  );
}
