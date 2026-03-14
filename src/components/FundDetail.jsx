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
      <div className="text-center py-20">
        <div className="w-10 h-10 border-4 border-navy/20 border-t-gold rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Chargement du fonds…</p>
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-sm mb-4">Fonds introuvable</p>
        <button onClick={onBack} className="text-sm text-gold hover:text-gold/80 transition-colors font-medium">← Retour aux fonds</button>
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
    <div className="animate-fade-in">
      {/* Back nav */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-navy transition-colors mb-6 font-medium">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Retour aux fonds
      </button>

      {/* Hero card */}
      <div className="bg-navy rounded-2xl p-8 lg:p-12 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-gold text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            {fund.regulatoryStatus}
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">{fund.fundName}</h1>
          <p className="text-white/60 mb-8 max-w-2xl">{fund.fundSubtitle}</p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => onInvest(fund)}
              className="px-8 py-3 bg-gold text-white font-medium rounded-xl hover:bg-gold/90 transition-colors text-sm"
            >
              Investir dans ce fonds
            </button>

            {fund.cardanoTxHash && (
              <a
                href={getExplorerUrl(fund.cardanoTxHash, fund.blockchainNetwork)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 border border-white/20 text-white/70 rounded-xl hover:bg-white/5 transition-colors text-sm flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Voir sur Cardano
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Rendement cible</p>
          <p className="text-2xl font-bold text-navy">{fund.targetReturn || "—"}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">NAV / Part</p>
          <p className="text-2xl font-bold text-navy">{fund.navPerShare ? fmt(fund.navPerShare) : "—"}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Invest. minimum</p>
          <p className="text-2xl font-bold text-navy">{fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—"}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Taille du fonds</p>
          <p className="text-2xl font-bold text-navy">{fund.fundSize ? fmt(fund.fundSize) : "—"}</p>
        </div>
      </div>

      {/* Cardano Registry Info */}
      {fund.cardanoPolicyId && (
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-semibold text-navy">Registre Blockchain Cardano</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-cream rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Policy ID</p>
              <p className="font-mono text-navy text-xs break-all">{fund.cardanoPolicyId}</p>
            </div>
            <div className="bg-cream rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Script Address</p>
              <p className="font-mono text-navy text-xs break-all">{shortenHash(fund.cardanoScriptAddress, 12)}</p>
            </div>
            <div className="bg-cream rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Transaction</p>
              <p className="font-mono text-navy text-xs break-all">{shortenHash(fund.cardanoTxHash, 12)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Strategy & Thesis */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {fund.strategy && (
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-navy mb-3">Stratégie d'investissement</h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{fund.strategy}</p>
          </div>
        )}
        {fund.investmentThesis && (
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-navy mb-3">Thèse d'investissement</h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{fund.investmentThesis}</p>
          </div>
        )}
      </div>

      {/* Highlights */}
      {highlights.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-navy mb-4">Points clés</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-3 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-5">
                <div className="w-8 h-8 bg-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-navy font-medium">{h}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Classes */}
      {shareClasses.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-navy mb-4">Classes de parts</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {shareClasses.map((sc) => (
              <div key={sc.id} className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${sc.id === 1 ? "bg-navy text-white" : "bg-gold/20 text-gold"}`}>
                    {sc.id}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-navy">{sc.name}</h4>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Rendement cible</span><span className="font-medium text-navy">{sc.targetReturn}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Durée</span><span className="font-medium text-navy">{sc.duration}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Risque</span><span className="font-medium text-navy">{sc.risk}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fund Structure */}
      {structureItems.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-navy mb-4">Structure du fonds</h3>
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
            {structureItems.map((item, i) => (
              <div key={i} className={`flex items-center justify-between px-6 py-4 ${i < structureItems.length - 1 ? "border-b border-gray-50" : ""}`}>
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-medium text-navy">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="bg-navy rounded-2xl p-8 text-center">
        <h3 className="text-xl font-bold text-white mb-3">Prêt à investir ?</h3>
        <p className="text-white/50 text-sm mb-6 max-w-md mx-auto">
          Accédez à {fund.fundName} avec un investissement minimum de {fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—"}
        </p>
        <button
          onClick={() => onInvest(fund)}
          className="px-10 py-3.5 bg-gold text-white font-semibold rounded-xl hover:bg-gold/90 transition-colors"
        >
          Commencer la souscription
        </button>
      </div>
    </div>
  );
}
