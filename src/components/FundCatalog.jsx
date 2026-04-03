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
        <div className="mb-10">
          <div className="skeleton h-6 w-48 mb-2" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[220px] rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (funds.length === 0) {
    return (
      <div className="page-slide-in flex flex-col items-center justify-center py-24 px-4">
        <p className="text-[16px] font-semibold text-[#0F0F10] mb-1">Aucun fonds disponible</p>
        <p className="text-[13px] text-[#787881] max-w-xs text-center leading-relaxed">
          De nouveaux fonds seront bientot disponibles.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 text-[13px] font-medium text-[#0F0F10] hover:text-[#787881] transition-colors"
        >
          Rafraichir
        </button>
      </div>
    );
  }

  return (
    <div className="page-slide-in">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-[24px] font-semibold text-[#0F0F10] tracking-tight">
          Fonds disponibles
        </h2>
        <p className="text-[14px] text-[#787881] mt-1">
          {funds.length} fond{funds.length > 1 ? "s" : ""} ouvert{funds.length > 1 ? "s" : ""} a la souscription
        </p>
      </div>

      {/* Fund cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
        {funds.map((fund) => (
          <button
            key={fund.id}
            onClick={() => onSelectFund(fund.slug)}
            className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-6 text-left group hover:border-[rgba(0,0,29,0.16)] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-200"
          >
            {/* Status badge */}
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                {fund.regulatoryStatus || "Regulated"}
              </span>
              {fund.cardanoPolicyId && (
                <span className="font-mono text-[10px] text-[#A8A29E]">{shortenHash(fund.cardanoPolicyId, 4)}</span>
              )}
            </div>

            {/* Fund name */}
            <h3 className="text-[15px] font-semibold text-[#0F0F10] tracking-tight leading-snug mb-4">
              {fund.fundName}
            </h3>

            {/* Metrics */}
            <div className="flex gap-6 mb-5">
              <div>
                <p className="text-[11px] text-[#A8A29E] font-medium mb-0.5">Rendement</p>
                <p className="text-[18px] font-semibold text-[#0F0F10] tabular-nums">
                  {fund.targetReturn || "\u2014"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#A8A29E] font-medium mb-0.5">NAV / Part</p>
                <p className="text-[18px] font-semibold text-[#0F0F10] tabular-nums">
                  {fund.navPerShare ? fmt(fund.navPerShare) : "\u2014"}
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#0F0F10] group-hover:text-[#787881] transition-colors">
              Voir le fonds
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
