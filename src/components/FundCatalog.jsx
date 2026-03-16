import { useState, useEffect } from "react";
import { listFunds } from "../services/fundService";
import { shortenHash, getExplorerUrl } from "../services/cardanoService";

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
      <div className="text-center py-20">
        <div className="w-10 h-10 border-4 border-[#E8ECF1] border-t-[#0D0D12] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#9AA4B2] text-sm">Chargement des fonds...</p>
      </div>
    );
  }

  if (funds.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-[#F0F2F5] rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#9AA4B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-[#9AA4B2] text-sm">Aucun fonds disponible pour le moment</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#0D0D12]">Fonds disponibles</h2>
        <p className="text-sm text-[#5F6B7A] mt-1">Selectionnez un fonds pour voir les details et investir</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {funds.map((fund) => (
          <button
            key={fund.id}
            onClick={() => onSelectFund(fund.slug)}
            className="bg-white rounded-2xl overflow-hidden text-left border border-[#E8ECF1] hover:border-[#D1D5DB] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all group"
          >
            {/* Card header */}
            <div className="bg-[#F7F8FA] p-6 relative overflow-hidden">
              <div className="relative">
                <div className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#EEF2FF] text-[#4F7DF3] inline-flex items-center gap-1.5 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F7DF3]" />
                  {fund.regulatoryStatus || "Regulated"}
                </div>
                <h3 className="text-lg font-bold text-[#0D0D12] mb-1">{fund.fundName}</h3>
                <p className="text-sm text-[#5F6B7A] line-clamp-2">{fund.fundSubtitle}</p>
              </div>
            </div>

            {/* Key metrics */}
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[13px] text-[#9AA4B2] font-medium">Rendement</p>
                  <p className="text-lg font-bold text-[#0D0D12] mt-0.5 tabular-nums">{fund.targetReturn || "\u2014"}</p>
                </div>
                <div>
                  <p className="text-[13px] text-[#9AA4B2] font-medium">NAV / Part</p>
                  <p className="text-lg font-bold text-[#0D0D12] mt-0.5 tabular-nums">{fund.navPerShare ? fmt(fund.navPerShare) : "\u2014"}</p>
                </div>
                <div>
                  <p className="text-[13px] text-[#9AA4B2] font-medium">Invest. min.</p>
                  <p className="text-sm font-medium text-[#0D0D12] mt-0.5 tabular-nums">{fund.minimumInvestment ? fmt(fund.minimumInvestment) : "\u2014"}</p>
                </div>
                <div>
                  <p className="text-[13px] text-[#9AA4B2] font-medium">Taille</p>
                  <p className="text-sm font-medium text-[#0D0D12] mt-0.5 tabular-nums">{fund.fundSize ? fmt(fund.fundSize) : "\u2014"}</p>
                </div>
              </div>

              {/* Cardano badge */}
              {fund.cardanoPolicyId && (
                <div className="flex items-center gap-2 bg-[#F7F8FA] rounded-xl px-3 py-2 text-xs mb-4 border border-[#E8ECF1]">
                  <span className="w-2 h-2 rounded-full bg-[#059669]" />
                  <span className="text-[#5F6B7A]">Cardano Registry</span>
                  <span className="font-mono text-[#9AA4B2] ml-auto tabular-nums">{shortenHash(fund.cardanoPolicyId, 6)}</span>
                </div>
              )}

              {/* CTA */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E8ECF1]">
                <span className="text-[11px] text-[#9AA4B2]">{fund.jurisdiction} · {fund.legalForm}</span>
                <span className="text-sm font-medium text-[#4F7DF3] group-hover:translate-x-1 transition-all">
                  Voir le fonds &rarr;
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
