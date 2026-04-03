import { useState, useEffect } from "react";
import { listFunds } from "../services/fundService";
import { shortenHash } from "../services/cardanoService";

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function FundCatalog({ onSelectFund }) {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listFunds()
      .then(setFunds)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-slide-in">
        <div className="mb-8">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-text w-64" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[300px] rounded-2xl" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (funds.length === 0) {
    return (
      <div className="text-center py-20 page-slide-in">
        <div className="w-14 h-14 bg-[rgba(0,0,23,0.03)] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-[#D6D3D1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-[14px] font-medium text-[#787881]">Aucun fonds disponible pour le moment</p>
        <p className="text-[12px] text-[#A8A29E] mt-1">Les fonds seront bientot disponibles</p>
      </div>
    );
  }

  return (
    <div className="page-slide-in">
      {/* Header */}
      <div className="mb-6 stagger-hero">
        <div>
          <h2 className="text-[24px] font-bold text-[#0F0F10] tracking-tight">Fonds disponibles</h2>
          <p className="text-[14px] text-[#787881] mt-1">{funds.length} fond{funds.length > 1 ? "s" : ""} — Selectionnez un fonds pour investir</p>
        </div>
      </div>

      {/* Fund cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
        {funds.map((fund) => (
          <button
            key={fund.id}
            onClick={() => onSelectFund(fund.slug)}
            className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl overflow-hidden text-left group hover:border-[rgba(0,0,29,0.15)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-0.5"
          >
            {/* Card header */}
            <div className="bg-[rgba(0,0,23,0.02)] p-5 relative overflow-hidden border-b border-[rgba(0,0,29,0.05)]">
              <div className="relative">
                <div className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-[#EEF2FF] text-[#6366F1] inline-flex items-center gap-1.5 mb-3 border border-[rgba(99,102,241,0.1)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
                  {fund.regulatoryStatus || "Regulated"}
                </div>
                <h3 className="text-[16px] font-bold text-[#0F0F10] mb-1 tracking-tight">{fund.fundName}</h3>
                <p className="text-[13px] text-[#787881] line-clamp-2">{fund.fundSubtitle}</p>
              </div>
            </div>

            {/* Key metrics */}
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[12px] text-[#A8A29E] font-medium">Rendement</p>
                  <p className="text-[18px] font-bold text-[#0F0F10] mt-0.5 tabular-nums">{fund.targetReturn || "\u2014"}</p>
                </div>
                <div>
                  <p className="text-[12px] text-[#A8A29E] font-medium">NAV / Part</p>
                  <p className="text-[18px] font-bold text-[#0F0F10] mt-0.5 tabular-nums">{fund.navPerShare ? fmt(fund.navPerShare) : "\u2014"}</p>
                </div>
                <div>
                  <p className="text-[12px] text-[#A8A29E] font-medium">Invest. min.</p>
                  <p className="text-[13px] font-medium text-[#0F0F10] mt-0.5 tabular-nums">{fund.minimumInvestment ? fmt(fund.minimumInvestment) : "\u2014"}</p>
                </div>
                <div>
                  <p className="text-[12px] text-[#A8A29E] font-medium">Taille</p>
                  <p className="text-[13px] font-medium text-[#0F0F10] mt-0.5 tabular-nums">{fund.fundSize ? fmt(fund.fundSize) : "\u2014"}</p>
                </div>
              </div>

              {/* Cardano badge */}
              {fund.cardanoPolicyId && (
                <div className="flex items-center gap-2 bg-[rgba(0,0,23,0.025)] rounded-xl px-3 py-2 text-[12px] mb-4 border border-[rgba(0,0,29,0.06)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-50" style={{ animationDuration: "3s" }}></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
                  </span>
                  <span className="text-[#787881]">Cardano Registry</span>
                  <span className="font-mono text-[#A8A29E] ml-auto tabular-nums">{shortenHash(fund.cardanoPolicyId, 6)}</span>
                </div>
              )}

              {/* CTA */}
              <div className="flex items-center justify-between pt-3 border-t border-[rgba(0,0,29,0.06)]">
                <span className="text-[11px] text-[#A8A29E]">{fund.jurisdiction} · {fund.legalForm}</span>
                <span className="flex items-center gap-1 text-[13px] font-medium text-[#6366F1] group-hover:gap-2 transition-all duration-200">
                  Voir le fonds
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
