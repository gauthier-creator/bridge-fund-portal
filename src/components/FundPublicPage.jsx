import { useState, useEffect } from "react";
import { listFunds, getFund } from "../services/fundService";
import { shortenHash, getExplorerUrl } from "../services/cardanoService";

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function FundCard({ fund, onClick }) {
  return (
    <button
      onClick={() => onClick(fund.slug)}
      className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden text-left hover:shadow-md hover:border-gold/30 transition-all group"
    >
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
        {fund.cardanoPolicyId && (
          <div className="flex items-center gap-2 bg-cream rounded-xl px-3 py-2 text-xs mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-gray-500">Registre Cardano</span>
            <span className="font-mono text-navy/60 ml-auto">{shortenHash(fund.cardanoPolicyId, 6)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">{fund.jurisdiction} · {fund.legalForm}</span>
          <span className="text-sm font-medium text-gold group-hover:translate-x-1 transition-transform">Voir le fonds →</span>
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
        <div className="w-10 h-10 border-4 border-navy/20 border-t-gold rounded-full animate-spin mx-auto mb-4" />
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <p className="text-gray-400 text-sm mb-4">Fonds introuvable</p>
        <button onClick={onBack} className="text-sm text-gold font-medium">← Retour</button>
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
      <section className="bg-navy text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
          <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white/80 text-sm mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Tous les fonds
          </button>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-gold text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              {fund.regulatoryStatus}
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">{fund.fundName}</h1>
            <p className="text-lg text-white/70 mb-8">{fund.fundSubtitle}</p>
            <p className="text-base text-white/60 mb-10 leading-relaxed max-w-2xl">{fund.description}</p>
            <div className="flex items-center gap-4">
              <button onClick={() => onInvest(fund)} className="px-8 py-3.5 bg-gold text-white font-medium rounded-xl hover:bg-gold/90 transition-colors text-sm">
                Commencer à investir
              </button>
              {fund.cardanoTxHash && (
                <a href={getExplorerUrl(fund.cardanoTxHash, fund.blockchainNetwork)} target="_blank" rel="noopener noreferrer" className="px-6 py-3.5 border border-white/20 text-white/80 rounded-xl hover:bg-white/5 transition-colors text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Voir sur Cardano
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Rendement cible</p>
              <p className="text-2xl font-bold text-navy">{fund.targetReturn || "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">NAV / Part</p>
              <p className="text-2xl font-bold text-navy">{fund.navPerShare ? fmt(fund.navPerShare) : "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Investissement min.</p>
              <p className="text-2xl font-bold text-navy">{fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Taille du fonds</p>
              <p className="text-2xl font-bold text-navy">{fund.fundSize ? fmt(fund.fundSize) : "—"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cardano Registry */}
      {fund.cardanoPolicyId && (
        <section className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
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
        </section>
      )}

      {/* Strategy */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          {fund.strategy && (
            <div>
              <h2 className="text-2xl font-bold text-navy mb-4">Stratégie d'investissement</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{fund.strategy}</p>
            </div>
          )}
          {fund.investmentThesis && (
            <div>
              <h2 className="text-2xl font-bold text-navy mb-4">Thèse d'investissement</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{fund.investmentThesis}</p>
            </div>
          )}
        </div>
      </section>

      {/* Highlights */}
      {highlights.length > 0 && (
        <section className="bg-white border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-2xl font-bold text-navy mb-8 text-center">Points clés</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-3 bg-cream rounded-2xl p-5">
                  <div className="w-8 h-8 bg-gold/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-navy font-medium">{h}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Share Classes */}
      {shareClasses.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-navy mb-8 text-center">Classes de parts</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {shareClasses.map((sc) => (
              <div key={sc.id} className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${sc.id === 1 ? "bg-navy text-white" : "bg-gold/20 text-gold"}`}>{sc.id}</div>
                  <h4 className="text-sm font-semibold text-navy">{sc.name}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Rendement cible</span><span className="font-medium text-navy">{sc.targetReturn}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Durée</span><span className="font-medium text-navy">{sc.duration}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Risque</span><span className="font-medium text-navy">{sc.risk}</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fund Structure */}
      {structureItems.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-navy mb-8 text-center">Structure du fonds</h2>
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden max-w-2xl mx-auto">
            {structureItems.map((item, i) => (
              <div key={i} className={`flex items-center justify-between px-6 py-4 ${i < structureItems.length - 1 ? "border-b border-gray-50" : ""}`}>
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-medium text-navy">{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-navy">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Prêt à investir ?</h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            Accédez à {fund.fundName} avec un rendement cible de {fund.targetReturn || "8-12%"} net annuel.
          </p>
          <button onClick={() => onInvest(fund)} className="px-10 py-4 bg-gold text-white font-semibold rounded-xl hover:bg-gold/90 transition-colors text-base">
            Commencer à investir
          </button>
          <p className="text-white/30 text-xs mt-4">Investissement minimum : {fund.minimumInvestment ? fmt(fund.minimumInvestment) : "125 000 €"}</p>
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
    <div className="min-h-screen bg-cream font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedSlug(null)} className="w-9 h-9 bg-navy rounded-xl flex items-center justify-center hover:bg-navy-light transition-colors">
              <span className="text-gold font-bold text-sm">BF</span>
            </button>
            <span className="text-lg font-semibold text-navy">Bridge Fund</span>
          </div>
          <button onClick={() => onInvest()} className="px-5 py-2 bg-gold text-white text-sm font-medium rounded-xl hover:bg-gold/90 transition-colors">
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
          <section className="bg-navy text-white">
            <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-gold text-xs font-medium mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                Plateforme d'investissement tokenisée
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">Investissez dans des fonds<br />tokenisés sur Cardano</h1>
              <p className="text-lg text-white/60 mb-10 max-w-2xl mx-auto">
                Accédez à des opportunités d'investissement alternatif régulées, tokenisées et transparentes grâce à la blockchain Cardano.
              </p>
              <a href="#funds" className="px-8 py-3.5 bg-gold text-white font-medium rounded-xl hover:bg-gold/90 transition-colors text-sm inline-block">
                Découvrir les fonds
              </a>
            </div>
          </section>

          {/* Fund catalog */}
          <section id="funds" className="max-w-7xl mx-auto px-6 py-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-navy">Fonds disponibles</h2>
              <p className="text-sm text-gray-400 mt-2">Sélectionnez un fonds pour voir les détails et investir</p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-4 border-navy/20 border-t-gold rounded-full animate-spin mx-auto mb-4" />
              </div>
            ) : funds.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">Aucun fonds disponible pour le moment</p>
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
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-gray-400">
          <span>Bridge Fund · CSSF regulated · Luxembourg</span>
          <span>Portail sécurisé · Données en temps réel</span>
        </div>
      </footer>
    </div>
  );
}
