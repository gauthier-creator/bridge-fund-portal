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
      <div className="animate-fade-in">
        <div className="mb-8">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-text w-64" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-card h-[320px]" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (funds.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="w-16 h-16 bg-[#F0F2F5] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#C4CAD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[#5F6B7A]">Aucun fonds disponible pour le moment</p>
        <p className="text-xs text-[#9AA4B2] mt-1">Les fonds seront bientôt disponibles</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with stagger */}
      <div className="mb-8 stagger-hero">
        <div>
          <h2 className="text-2xl font-bold text-[#0D0D12] tracking-tight">Fonds disponibles</h2>
          <p className="text-sm text-[#5F6B7A] mt-1.5">{funds.length} fond{funds.length > 1 ? "s" : ""} — Sélectionnez un fonds pour voir les détails et investir</p>
        </div>
      </div>

      {/* Fund cards with staggered lift animation */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
        {funds.map((fund) => (
          <button
            key={fund.id}
            onClick={() => onSelectFund(fund.slug)}
            className="card-interactive rounded-2xl overflow-hidden text-left group"
          >
            {/* Card header with subtle gradient overlay */}
            <div className="bg-[#F7F8FA] p-6 relative overflow-hidden">
              {/* Decorative dot pattern that animates on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id={`dots-${fund.id}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="0.8" fill="#D1D5DB" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#dots-${fund.id})`} />
                </svg>
              </div>

              <div className="relative">
                <div className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#EEF2FF] text-[#4F7DF3] inline-flex items-center gap-1.5 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F7DF3]" />
                  {fund.regulatoryStatus || "Regulated"}
                </div>
                <h3 className="text-lg font-bold text-[#0D0D12] mb-1 tracking-tight">{fund.fundName}</h3>
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
                <div className="flex items-center gap-2 bg-[#F7F8FA] rounded-xl px-3 py-2 text-xs mb-4 border border-[#E8ECF1] group-hover:border-[#D1D5DB] transition-colors">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-50" style={{ animationDuration: "3s" }}></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
                  </span>
                  <span className="text-[#5F6B7A]">Cardano Registry</span>
                  <span className="font-mono text-[#9AA4B2] ml-auto tabular-nums">{shortenHash(fund.cardanoPolicyId, 6)}</span>
                </div>
              )}

              {/* CTA */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E8ECF1]">
                <span className="text-[11px] text-[#9AA4B2]">{fund.jurisdiction} · {fund.legalForm}</span>
                <span className="flex items-center gap-1 text-sm font-medium text-[#4F7DF3] group-hover:gap-2 transition-all duration-300">
                  Voir le fonds
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
