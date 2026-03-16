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
        <div className="w-10 h-10 border-4 border-[#E8ECF1] border-t-[#0D0D12] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#9AA4B2] text-sm">Chargement du fonds…</p>
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="text-center py-20">
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
    <div className="animate-fade-in">
      {/* Back nav */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[#5F6B7A] hover:text-[#0D0D12] transition-colors mb-6 font-medium">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Retour aux fonds
      </button>

      {/* Hero card – dark accent with dot pattern */}
      <div className="bg-[#0D0D12] rounded-2xl p-8 lg:p-12 mb-8 relative overflow-hidden">
        {/* Subtle dot pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots-detail" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots-detail)" />
        </svg>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/[0.08] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#818CF8] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F7DF3]" />
            {fund.regulatoryStatus}
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 tracking-tight">{fund.fundName}</h1>
          <p className="text-[#9AA4B2] mb-8 max-w-2xl leading-relaxed">{fund.fundSubtitle}</p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onInvest(fund)}
              className="px-8 py-3 bg-white text-[#0D0D12] font-medium rounded-xl hover:bg-white/90 transition-colors text-sm"
            >
              Investir dans ce fonds
            </button>

            {fund.cardanoTxHash && (
              <a
                href={getExplorerUrl(fund.cardanoTxHash, fund.blockchainNetwork)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 border border-white/[0.12] text-white/70 rounded-xl hover:bg-white/[0.06] transition-colors text-sm flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-[#00C48C]" />
                Voir sur Cardano
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E8ECF1] rounded-2xl hover:border-[#D1D5DB] transition-colors p-5 text-center">
          <p className="text-[13px] text-[#9AA4B2] font-medium mb-1">Rendement cible</p>
          <p className="text-2xl font-bold text-[#0D0D12] tabular-nums">{fund.targetReturn || "—"}</p>
        </div>
        <div className="bg-white border border-[#E8ECF1] rounded-2xl hover:border-[#D1D5DB] transition-colors p-5 text-center">
          <p className="text-[13px] text-[#9AA4B2] font-medium mb-1">NAV / Part</p>
          <p className="text-2xl font-bold text-[#0D0D12] tabular-nums">{fund.navPerShare ? fmt(fund.navPerShare) : "—"}</p>
        </div>
        <div className="bg-white border border-[#E8ECF1] rounded-2xl hover:border-[#D1D5DB] transition-colors p-5 text-center">
          <p className="text-[13px] text-[#9AA4B2] font-medium mb-1">Invest. minimum</p>
          <p className="text-2xl font-bold text-[#0D0D12] tabular-nums">{fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—"}</p>
        </div>
        <div className="bg-white border border-[#E8ECF1] rounded-2xl hover:border-[#D1D5DB] transition-colors p-5 text-center">
          <p className="text-[13px] text-[#9AA4B2] font-medium mb-1">Taille du fonds</p>
          <p className="text-2xl font-bold text-[#0D0D12] tabular-nums">{fund.fundSize ? fmt(fund.fundSize) : "—"}</p>
        </div>
      </div>

      {/* Cardano Registry Info */}
      {fund.cardanoPolicyId && (
        <div className="bg-white border border-[#E8ECF1] rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#059669]" />
            <h3 className="text-sm font-semibold text-[#0D0D12]">Registre Blockchain Cardano</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-[#F7F8FA] rounded-xl p-4">
              <p className="text-[13px] text-[#9AA4B2] font-medium mb-1">Policy ID</p>
              <p className="font-mono text-[#0D0D12] text-xs break-all">{fund.cardanoPolicyId}</p>
            </div>
            <div className="bg-[#F7F8FA] rounded-xl p-4">
              <p className="text-[13px] text-[#9AA4B2] font-medium mb-1">Script Address</p>
              <p className="font-mono text-[#0D0D12] text-xs break-all">{shortenHash(fund.cardanoScriptAddress, 12)}</p>
            </div>
            <div className="bg-[#F7F8FA] rounded-xl p-4">
              <p className="text-[13px] text-[#9AA4B2] font-medium mb-1">Transaction</p>
              <p className="font-mono text-[#0D0D12] text-xs break-all">{shortenHash(fund.cardanoTxHash, 12)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Strategy & Thesis */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {fund.strategy && (
          <div className="bg-white border border-[#E8ECF1] rounded-2xl hover:border-[#D1D5DB] transition-colors p-6">
            <h3 className="text-lg font-semibold text-[#0D0D12] mb-3">Stratégie d'investissement</h3>
            <p className="text-sm text-[#5F6B7A] leading-relaxed whitespace-pre-line">{fund.strategy}</p>
          </div>
        )}
        {fund.investmentThesis && (
          <div className="bg-white border border-[#E8ECF1] rounded-2xl hover:border-[#D1D5DB] transition-colors p-6">
            <h3 className="text-lg font-semibold text-[#0D0D12] mb-3">Thèse d'investissement</h3>
            <p className="text-sm text-[#5F6B7A] leading-relaxed whitespace-pre-line">{fund.investmentThesis}</p>
          </div>
        )}
      </div>

      {/* Highlights */}
      {highlights.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-[#0D0D12] mb-4">Points clés</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-3 bg-white border border-[#E8ECF1] rounded-2xl hover:border-[#D1D5DB] transition-colors p-5">
                <div className="w-8 h-8 bg-[#EEF2FF] rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[#4F7DF3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-[#0D0D12] font-medium">{h}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Classes */}
      {shareClasses.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-[#0D0D12] mb-4">Classes de parts</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {shareClasses.map((sc) => (
              <div key={sc.id} className="bg-white border border-[#E8ECF1] rounded-2xl hover:border-[#D1D5DB] transition-colors p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${sc.id === 1 ? "bg-[#0D0D12] text-white" : "bg-[#EEF2FF] text-[#4F7DF3]"}`}>
                    {sc.id}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#0D0D12]">{sc.name}</h4>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#5F6B7A]">Rendement cible</span><span className="font-medium text-[#0D0D12] tabular-nums">{sc.targetReturn}</span></div>
                  <div className="flex justify-between"><span className="text-[#5F6B7A]">Durée</span><span className="font-medium text-[#0D0D12]">{sc.duration}</span></div>
                  <div className="flex justify-between"><span className="text-[#5F6B7A]">Risque</span><span className="font-medium text-[#0D0D12]">{sc.risk}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fund Structure */}
      {structureItems.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-[#0D0D12] mb-4">Structure du fonds</h3>
          <div className="bg-white border border-[#E8ECF1] rounded-2xl overflow-hidden">
            {structureItems.map((item, i) => (
              <div key={i} className={`flex items-center justify-between px-6 py-4 ${i < structureItems.length - 1 ? "border-b border-[#E8ECF1]" : ""}`}>
                <span className="text-sm text-[#5F6B7A]">{item.label}</span>
                <span className="text-sm font-medium text-[#0D0D12]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA – dark accent with dot pattern */}
      <div className="bg-[#0D0D12] rounded-2xl p-8 text-center relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots-cta" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots-cta)" />
        </svg>
        <div className="relative">
          <h3 className="text-xl font-bold text-white mb-3">Prêt à investir ?</h3>
          <p className="text-[#9AA4B2] text-sm mb-6 max-w-md mx-auto">
            Accédez à {fund.fundName} avec un investissement minimum de {fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—"}
          </p>
          <button
            onClick={() => onInvest(fund)}
            className="px-10 py-3.5 bg-white text-[#0D0D12] font-semibold rounded-xl hover:bg-white/90 transition-colors"
          >
            Commencer la souscription
          </button>
        </div>
      </div>
    </div>
  );
}
