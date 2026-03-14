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
        <div className="w-10 h-10 border-4 border-navy/20 border-t-gold rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Chargement des fonds…</p>
      </div>
    );
  }

  if (funds.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-gray-400 text-sm">Aucun fonds disponible pour le moment</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-navy">Fonds disponibles</h2>
        <p className="text-sm text-gray-400 mt-1">Sélectionnez un fonds pour voir les détails et investir</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {funds.map((fund) => (
          <button
            key={fund.id}
            onClick={() => onSelectFund(fund.slug)}
            className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden text-left hover:shadow-md hover:border-gold/30 transition-all group"
          >
            {/* Card header */}
            <div className="bg-navy p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-gold text-xs font-medium mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                  {fund.regulatoryStatus || "Regulated"}
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{fund.fundName}</h3>
                <p className="text-sm text-white/60 line-clamp-2">{fund.fundSubtitle}</p>
              </div>
            </div>

            {/* Key metrics */}
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Rendement</p>
                  <p className="text-lg font-bold text-navy mt-0.5">{fund.targetReturn || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">NAV / Part</p>
                  <p className="text-lg font-bold text-navy mt-0.5">{fund.navPerShare ? fmt(fund.navPerShare) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Invest. min.</p>
                  <p className="text-sm font-medium text-navy mt-0.5">{fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Taille</p>
                  <p className="text-sm font-medium text-navy mt-0.5">{fund.fundSize ? fmt(fund.fundSize) : "—"}</p>
                </div>
              </div>

              {/* Cardano badge */}
              {fund.cardanoPolicyId && (
                <div className="flex items-center gap-2 bg-cream rounded-xl px-3 py-2 text-xs mb-4">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-gray-500">Cardano Registry</span>
                  <span className="font-mono text-navy/60 ml-auto">{shortenHash(fund.cardanoPolicyId, 6)}</span>
                </div>
              )}

              {/* CTA */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">{fund.jurisdiction} · {fund.legalForm}</span>
                <span className="text-sm font-medium text-gold group-hover:translate-x-1 transition-transform">
                  Voir le fonds →
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
