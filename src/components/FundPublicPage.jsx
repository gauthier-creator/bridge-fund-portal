import { useState, useEffect } from "react";
import { listFunds, getFund } from "../services/fundService";
import { shortenHash, getExplorerUrl } from "../services/cardanoService";

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function FundCard({ fund, onClick }) {
  return (
    <button
      onClick={() => onClick(fund.slug)}
      className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden text-left hover:border-[#D1D5DB] transition-all group"
    >
      <div className="bg-[#F7F8FA] p-6 relative overflow-hidden">
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EEF2FF] text-[#4F7DF3] text-[11px] font-semibold mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F7DF3]" />
            {fund.regulatoryStatus || "Regulated"}
          </div>
          <h3 className="text-lg font-bold text-[#0D0D12] mb-1">{fund.fundName}</h3>
          <p className="text-sm text-[#5F6B7A] line-clamp-2">{fund.fundSubtitle}</p>
        </div>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-[13px] text-[#9AA4B2] font-medium">Rendement</p>
            <p className="text-lg font-bold text-[#0D0D12] mt-0.5 tabular-nums">{fund.targetReturn || "—"}</p>
          </div>
          <div>
            <p className="text-[13px] text-[#9AA4B2] font-medium">NAV / Part</p>
            <p className="text-lg font-bold text-[#0D0D12] mt-0.5 tabular-nums">{fund.navPerShare ? fmt(fund.navPerShare) : "—"}</p>
          </div>
          <div>
            <p className="text-[13px] text-[#9AA4B2] font-medium">Invest. min.</p>
            <p className="text-sm font-medium text-[#0D0D12] mt-0.5 tabular-nums">{fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—"}</p>
          </div>
          <div>
            <p className="text-[13px] text-[#9AA4B2] font-medium">Taille</p>
            <p className="text-sm font-medium text-[#0D0D12] mt-0.5 tabular-nums">{fund.fundSize ? fmt(fund.fundSize) : "—"}</p>
          </div>
        </div>
        {fund.cardanoPolicyId && (
          <div className="flex items-center gap-2 bg-[#ECFDF5] rounded-xl px-3 py-2 text-xs mb-4">
            <span className="w-2 h-2 rounded-full bg-[#00C48C]" />
            <span className="text-[#5F6B7A]">Registre Cardano</span>
            <span className="font-mono text-[#9AA4B2] ml-auto">{shortenHash(fund.cardanoPolicyId, 6)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-[#F0F2F5]">
          <span className="text-xs text-[#9AA4B2]">{fund.jurisdiction} · {fund.legalForm}</span>
          <span className="text-sm font-medium text-[#4F7DF3] group-hover:translate-x-1 transition-transform">Voir le fonds →</span>
        </div>
      </div>
    </button>
  );
}

function PublicFundDetail({ fundSlug, onBack, onInvest }) {
  const [fund, setFund] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fundSlug) return;
    setLoading(true);
    getFund(fundSlug).then(setFund).finally(() => setLoading(false));
  }, [fundSlug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="w-10 h-10 border-4 border-[#E8ECF1] border-t-[#0D0D12] rounded-full animate-spin mx-auto mb-4" />
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <p className="text-[#9AA4B2] text-sm mb-4">Fonds introuvable</p>
        <button onClick={onBack} className="text-sm text-[#4F7DF3] font-medium">← Retour</button>
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
    <>
      {/* Hero */}
      <section className="bg-[#0D0D12] text-white relative overflow-hidden">
        {/* Decorative dots */}
        <div className="absolute inset-0 opacity-[0.15]">
          <svg width="100%" height="100%"><defs><pattern id="hero-dots-detail" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white" opacity="0.3" /></pattern></defs><rect width="100%" height="100%" fill="url(#hero-dots-detail)" /></svg>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28 relative">
          <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white/80 text-sm mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Tous les fonds
          </button>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/10 text-[#93A3F8] text-[11px] font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#93A3F8]" />
              {fund.regulatoryStatus}
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">{fund.fundName}</h1>
            <p className="text-lg text-white/70 mb-8">{fund.fundSubtitle}</p>
            <p className="text-base text-white/50 mb-10 leading-relaxed max-w-2xl">{fund.description}</p>
            <div className="flex items-center gap-4">
              <button onClick={() => onInvest(fund)} className="px-8 py-3.5 bg-white text-[#0D0D12] font-medium rounded-xl hover:bg-white/90 transition-colors text-sm">
                Commencer à investir
              </button>
              {fund.cardanoTxHash && (
                <a href={getExplorerUrl(fund.cardanoTxHash, fund.blockchainNetwork)} target="_blank" rel="noopener noreferrer" className="px-6 py-3.5 bg-transparent border border-white/20 text-white/80 rounded-xl hover:border-white/40 transition-colors text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00C48C]" />
                  Voir sur Cardano
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="bg-white border-b border-[#E8ECF1]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-[13px] text-[#9AA4B2] font-medium mb-1">Rendement cible</p>
              <p className="text-2xl font-bold text-[#0D0D12] tabular-nums">{fund.targetReturn || "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-[13px] text-[#9AA4B2] font-medium mb-1">NAV / Part</p>
              <p className="text-2xl font-bold text-[#0D0D12] tabular-nums">{fund.navPerShare ? fmt(fund.navPerShare) : "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-[13px] text-[#9AA4B2] font-medium mb-1">Investissement min.</p>
              <p className="text-2xl font-bold text-[#0D0D12] tabular-nums">{fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-[13px] text-[#9AA4B2] font-medium mb-1">Taille du fonds</p>
              <p className="text-2xl font-bold text-[#0D0D12] tabular-nums">{fund.fundSize ? fmt(fund.fundSize) : "—"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cardano Registry */}
      {fund.cardanoPolicyId && (
        <section className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white rounded-2xl border border-[#E8ECF1] p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-[#00C48C]" />
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
        </section>
      )}

      {/* Strategy */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          {fund.strategy && (
            <div>
              <h2 className="text-2xl font-bold text-[#0D0D12] mb-4">Stratégie d'investissement</h2>
              <p className="text-[#5F6B7A] leading-relaxed whitespace-pre-line">{fund.strategy}</p>
            </div>
          )}
          {fund.investmentThesis && (
            <div>
              <h2 className="text-2xl font-bold text-[#0D0D12] mb-4">Thèse d'investissement</h2>
              <p className="text-[#5F6B7A] leading-relaxed whitespace-pre-line">{fund.investmentThesis}</p>
            </div>
          )}
        </div>
      </section>

      {/* Highlights */}
      {highlights.length > 0 && (
        <section className="bg-[#F7F8FA]">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-2xl font-bold text-[#0D0D12] mb-8 text-center">Points clés</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-2xl p-5 border border-[#E8ECF1]">
                  <div className="w-8 h-8 bg-[#ECFDF5] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-[#00C48C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-[#0D0D12] font-medium">{h}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Share Classes */}
      {shareClasses.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-[#0D0D12] mb-8 text-center">Classes de parts</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {shareClasses.map((sc) => (
              <div key={sc.id} className="bg-white rounded-2xl border border-[#E8ECF1] p-6 hover:border-[#D1D5DB] transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${sc.id === 1 ? "bg-[#0D0D12] text-white" : "bg-[#EEF2FF] text-[#4F7DF3]"}`}>{sc.id}</div>
                  <h4 className="text-sm font-semibold text-[#0D0D12]">{sc.name}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#5F6B7A]">Rendement cible</span><span className="font-medium text-[#0D0D12] tabular-nums">{sc.targetReturn}</span></div>
                  <div className="flex justify-between"><span className="text-[#5F6B7A]">Durée</span><span className="font-medium text-[#0D0D12]">{sc.duration}</span></div>
                  <div className="flex justify-between"><span className="text-[#5F6B7A]">Risque</span><span className="font-medium text-[#0D0D12]">{sc.risk}</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fund Structure */}
      {structureItems.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-[#0D0D12] mb-8 text-center">Structure du fonds</h2>
          <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden max-w-2xl mx-auto">
            {structureItems.map((item, i) => (
              <div key={i} className={`flex items-center justify-between px-6 py-4 hover:bg-[#FAFBFC] ${i < structureItems.length - 1 ? "border-b border-[#F0F2F5]" : ""}`}>
                <span className="text-sm text-[#5F6B7A]">{item.label}</span>
                <span className="text-sm font-medium text-[#0D0D12]">{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-[#0D0D12] relative overflow-hidden">
        {/* Decorative dots */}
        <div className="absolute inset-0 opacity-[0.15]">
          <svg width="100%" height="100%"><defs><pattern id="cta-dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white" opacity="0.3" /></pattern></defs><rect width="100%" height="100%" fill="url(#cta-dots)" /></svg>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-16 text-center relative">
          <h2 className="text-3xl font-bold text-white mb-4">Prêt à investir ?</h2>
          <p className="text-white/50 mb-8 max-w-xl mx-auto">
            Accédez à {fund.fundName} avec un rendement cible de {fund.targetReturn || "8-12%"} net annuel.
          </p>
          <button onClick={() => onInvest(fund)} className="px-10 py-4 bg-white text-[#0D0D12] font-semibold rounded-xl hover:bg-white/90 transition-colors text-base">
            Commencer à investir
          </button>
          <p className="text-white/30 text-xs mt-4 tabular-nums">Investissement minimum : {fund.minimumInvestment ? fmt(fund.minimumInvestment) : "125 000 €"}</p>
        </div>
      </section>
    </>
  );
}

export default function FundPublicPage({ onInvest }) {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState(null);

  useEffect(() => {
    listFunds().then(setFunds).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-[#E8ECF1]/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedSlug(null)} className="w-8 h-8 bg-[#0D0D12] rounded-lg flex items-center justify-center hover:bg-[#1A1A2E] transition-colors">
              <span className="text-white font-bold text-sm">BF</span>
            </button>
            <span className="text-lg font-semibold text-[#0D0D12]">Bridge Fund</span>
          </div>
          <button onClick={() => onInvest()} className="px-5 py-2 bg-[#0D0D12] text-white text-sm font-medium rounded-xl hover:bg-[#1A1A2E] transition-colors">
            Se connecter
          </button>
        </div>
      </header>

      {selectedSlug ? (
        <PublicFundDetail
          fundSlug={selectedSlug}
          onBack={() => setSelectedSlug(null)}
          onInvest={(fund) => onInvest(fund)}
        />
      ) : (
        <>
          {/* Hero */}
          <section className="bg-[#0D0D12] text-white relative overflow-hidden">
            {/* Decorative dots */}
            <div className="absolute inset-0 opacity-[0.15]">
              <svg width="100%" height="100%"><defs><pattern id="hero-dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white" opacity="0.3" /></pattern></defs><rect width="100%" height="100%" fill="url(#hero-dots)" /></svg>
            </div>
            <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28 text-center relative">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/10 text-[#93A3F8] text-[11px] font-semibold mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#93A3F8]" />
                Plateforme d'investissement tokenisée
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">Investissez dans des fonds<br />tokenisés sur Cardano</h1>
              <p className="text-lg text-white/50 mb-10 max-w-2xl mx-auto">
                Accédez à des opportunités d'investissement alternatif régulées, tokenisées et transparentes grâce à la blockchain Cardano.
              </p>
              <a href="#funds" className="px-8 py-3.5 bg-white text-[#0D0D12] font-medium rounded-xl hover:bg-white/90 transition-colors text-sm inline-block">
                Découvrir les fonds
              </a>
            </div>
          </section>

          {/* Fund catalog */}
          <section id="funds" className="max-w-7xl mx-auto px-6 py-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-[#0D0D12]">Fonds disponibles</h2>
              <p className="text-sm text-[#9AA4B2] mt-2">Sélectionnez un fonds pour voir les détails et investir</p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-4 border-[#E8ECF1] border-t-[#0D0D12] rounded-full animate-spin mx-auto mb-4" />
              </div>
            ) : funds.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#9AA4B2] text-sm">Aucun fonds disponible pour le moment</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {funds.map((fund) => (
                  <FundCard key={fund.id} fund={fund} onClick={setSelectedSlug} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Footer */}
      <footer className="border-t border-[#E8ECF1] bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-[#9AA4B2]">
          <span>Bridge Fund · CSSF regulated · Luxembourg</span>
          <span>Portail sécurisé · Données en temps réel</span>
        </div>
      </footer>
    </div>
  );
}
