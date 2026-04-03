import { useState, useEffect } from "react";
import { getFund } from "../services/fundService";
import { shortenHash, getExplorerUrl } from "../services/cardanoService";

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/* Stagger delay helper */
const stagger = (i, base = 80) => ({ animationDelay: `${i * base}ms` });

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
        <div className="skeleton h-8 w-32" />
        <div className="skeleton h-[280px] rounded-3xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-28 rounded-3xl" style={{ animationDelay: `${i * 80}ms` }} />)}
        </div>
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="text-center py-20 page-slide-in">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] flex items-center justify-center">
          <svg className="w-7 h-7 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <p className="text-[#A8A29E] text-[14px] mb-4">Fonds introuvable</p>
        <button onClick={onBack} className="text-[14px] text-[#6366F1] hover:text-[#0F0F10] transition-colors font-medium">← Retour aux fonds</button>
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
    {
      label: "Rendement cible",
      value: fund.targetReturn || "—",
      gradient: "from-[#6366F1] to-[#818CF8]",
      bg: "bg-[#EEF2FF]",
      icon: (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      label: "NAV / Part",
      value: fund.navPerShare ? fmt(fund.navPerShare) : "—",
      gradient: "from-[#059669] to-[#34D399]",
      bg: "bg-[#ECFDF5]",
      icon: (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Invest. minimum",
      value: fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—",
      gradient: "from-[#F59E0B] to-[#FBBF24]",
      bg: "bg-[#FFFBEB]",
      icon: (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      label: "Taille du fonds",
      value: fund.fundSize ? fmt(fund.fundSize) : "—",
      gradient: "from-[#EC4899] to-[#F472B6]",
      bg: "bg-[#FDF2F8]",
      icon: (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ];

  const shareClassColors = [
    { strip: "from-[#6366F1] to-[#818CF8]", badge: "bg-[#6366F1] text-white" },
    { strip: "from-[#059669] to-[#34D399]", badge: "bg-[#ECFDF5] text-[#059669]" },
    { strip: "from-[#F59E0B] to-[#FBBF24]", badge: "bg-[#FFFBEB] text-[#F59E0B]" },
    { strip: "from-[#EC4899] to-[#F472B6]", badge: "bg-[#FDF2F8] text-[#EC4899]" },
  ];

  return (
    <div className="space-y-8 page-slide-in">
      {/* Back nav */}
      <button onClick={onBack} className="flex items-center gap-2 text-[13px] text-[#787881] hover:text-[#6366F1] transition-colors duration-200 font-medium group">
        <span className="w-7 h-7 rounded-xl bg-white border border-[rgba(0,0,29,0.08)] flex items-center justify-center group-hover:border-[#6366F1]/30 group-hover:bg-[#EEF2FF] transition-all duration-200">
          <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </span>
        Retour aux fonds
      </button>

      {/* Hero card - colorful gradient */}
      <div className="relative rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 50%, #C7D2FE 100%)" }}>
        {/* Decorative shapes */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
          <circle cx="85%" cy="20%" r="120" fill="#6366F1" opacity="0.06" />
          <circle cx="90%" cy="75%" r="80" fill="#818CF8" opacity="0.08" />
          <circle cx="10%" cy="80%" r="60" fill="#059669" opacity="0.05" />
          <rect x="75%" y="55%" width="100" height="100" rx="20" fill="#6366F1" opacity="0.04" transform="rotate(15 800 400)" />
          <rect x="5%" y="10%" width="60" height="60" rx="12" fill="#818CF8" opacity="0.05" transform="rotate(-10 50 50)" />
          <circle cx="50%" cy="5%" r="40" fill="#A78BFA" opacity="0.07" />
          <circle cx="30%" cy="90%" r="30" fill="#6366F1" opacity="0.04" />
        </svg>

        <div className="relative p-8 lg:p-12">
          <div className="stagger-hero">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-white/50 text-[11px] font-semibold uppercase tracking-wider text-[#6366F1] mb-5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] shadow-sm shadow-[#6366F1]/30" />
                {fund.regulatoryStatus}
              </div>
            </div>
            <div>
              <h1 className="text-[30px] lg:text-[36px] font-bold text-[#0F0F10] mb-3 tracking-tight leading-tight">{fund.fundName}</h1>
            </div>
            <div>
              <p className="text-[#4B5563] text-[15px] mb-8 max-w-2xl leading-relaxed">{fund.fundSubtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => onInvest(fund)}
                className="px-7 py-3 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-semibold rounded-2xl hover:shadow-lg hover:shadow-[#6366F1]/25 hover:-translate-y-0.5 transition-all duration-200 text-[14px] active:scale-[0.98]">
                Investir dans ce fonds
              </button>
              {fund.cardanoTxHash && (
                <a href={getExplorerUrl(fund.cardanoTxHash, fund.blockchainNetwork)} target="_blank" rel="noopener noreferrer"
                  className="px-5 py-3 bg-white/60 backdrop-blur-sm border border-white/50 text-[#0F0F10] rounded-2xl hover:bg-white/80 hover:shadow-md transition-all duration-200 text-[14px] flex items-center gap-2 font-medium shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
                  </span>
                  Voir sur Cardano
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div key={i}
            className="bg-white border border-[rgba(0,0,29,0.08)] rounded-3xl hover:border-[rgba(0,0,29,0.15)] hover:shadow-lg hover:shadow-black/[0.03] hover:-translate-y-0.5 transition-all duration-300 p-5"
            style={{ animation: `revealUp 0.4s var(--ease-out) ${i * 100}ms both` }}>
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center mb-3 shadow-sm`}>
              {m.icon}
            </div>
            <p className="text-[12px] text-[#A8A29E] font-medium mb-1">{m.label}</p>
            <p className="text-[20px] lg:text-[22px] font-bold text-[#0F0F10] tabular-nums">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Strategy & Thesis */}
      <div className="grid md:grid-cols-2 gap-5">
        {fund.strategy && (
          <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-3xl p-6 hover:border-[rgba(0,0,29,0.12)] hover:shadow-lg hover:shadow-black/[0.03] transition-all duration-300"
            style={{ animation: "revealUp 0.4s var(--ease-out) 0ms both" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-[16px] font-semibold text-[#0F0F10] tracking-tight">Strategie d'investissement</h3>
            </div>
            <p className="text-[13px] text-[#787881] leading-relaxed whitespace-pre-line">{fund.strategy}</p>
          </div>
        )}
        {fund.investmentThesis && (
          <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-3xl p-6 hover:border-[rgba(0,0,29,0.12)] hover:shadow-lg hover:shadow-black/[0.03] transition-all duration-300"
            style={{ animation: "revealUp 0.4s var(--ease-out) 100ms both" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#059669] to-[#34D399] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-[16px] font-semibold text-[#0F0F10] tracking-tight">These d'investissement</h3>
            </div>
            <p className="text-[13px] text-[#787881] leading-relaxed whitespace-pre-line">{fund.investmentThesis}</p>
          </div>
        )}
      </div>

      {/* Highlights */}
      {highlights.length > 0 && (
        <div>
          <h3 className="text-[17px] font-semibold text-[#0F0F10] mb-5 tracking-tight">Points cles</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {highlights.map((h, i) => (
              <div key={i}
                className="flex items-start gap-3 bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-4 hover:border-[#059669]/20 hover:shadow-md hover:shadow-[#059669]/[0.04] transition-all duration-300"
                style={{ animation: `revealUp 0.4s var(--ease-out) ${i * 80}ms both` }}>
                <div className="w-7 h-7 bg-gradient-to-br from-[#059669] to-[#34D399] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#059669]/20">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[13px] text-[#0F0F10] font-medium leading-snug">{h}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Classes */}
      {shareClasses.length > 0 && (
        <div>
          <h3 className="text-[17px] font-semibold text-[#0F0F10] mb-5 tracking-tight">Classes de parts</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {shareClasses.map((sc, idx) => {
              const colors = shareClassColors[idx % shareClassColors.length];
              return (
                <div key={sc.id}
                  className="bg-white border border-[rgba(0,0,29,0.08)] rounded-3xl overflow-hidden hover:border-[rgba(0,0,29,0.15)] hover:shadow-lg hover:shadow-black/[0.04] hover:-translate-y-0.5 transition-all duration-300"
                  style={{ animation: `revealUp 0.4s var(--ease-out) ${idx * 100}ms both` }}>
                  {/* Gradient accent strip */}
                  <div className={`h-1.5 bg-gradient-to-r ${colors.strip}`} />
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold ${colors.badge}`}>
                        {sc.id}
                      </div>
                      <h4 className="text-[14px] font-semibold text-[#0F0F10]">{sc.name}</h4>
                    </div>
                    <div className="space-y-2.5 text-[13px]">
                      <div className="flex justify-between py-1.5 border-b border-[rgba(0,0,29,0.04)]">
                        <span className="text-[#787881]">Rendement cible</span>
                        <span className="font-semibold text-[#0F0F10] tabular-nums">{sc.targetReturn}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-[rgba(0,0,29,0.04)]">
                        <span className="text-[#787881]">Duree</span>
                        <span className="font-semibold text-[#0F0F10]">{sc.duration}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-[#787881]">Risque</span>
                        <span className="font-semibold text-[#0F0F10]">{sc.risk}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fund Structure */}
      {structureItems.length > 0 && (
        <div>
          <h3 className="text-[17px] font-semibold text-[#0F0F10] mb-5 tracking-tight">Structure du fonds</h3>
          <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-3xl overflow-hidden">
            {structureItems.map((item, i) => (
              <div key={i}
                className={`flex items-center justify-between px-6 py-4 hover:bg-[#EEF2FF]/30 transition-colors duration-200 ${i < structureItems.length - 1 ? "border-b border-[rgba(0,0,29,0.05)]" : ""}`}
                style={{ animation: `revealUp 0.3s var(--ease-out) ${i * 50}ms both` }}>
                <span className="text-[13px] text-[#787881]">{item.label}</span>
                <span className="text-[13px] font-semibold text-[#0F0F10]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA - colorful gradient */}
      <div className="relative rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 40%, #C7D2FE 70%, #DDD6FE 100%)" }}>
        {/* Decorative shapes */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
          <circle cx="15%" cy="30%" r="80" fill="#6366F1" opacity="0.06" />
          <circle cx="80%" cy="70%" r="100" fill="#818CF8" opacity="0.07" />
          <circle cx="60%" cy="15%" r="50" fill="#A78BFA" opacity="0.06" />
          <rect x="85%" y="10%" width="70" height="70" rx="14" fill="#6366F1" opacity="0.04" transform="rotate(20 900 50)" />
          <rect x="5%" y="60%" width="50" height="50" rx="10" fill="#818CF8" opacity="0.05" transform="rotate(-15 30 200)" />
        </svg>

        <div className="relative p-8 lg:p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center shadow-lg shadow-[#6366F1]/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-[22px] font-bold text-[#0F0F10] mb-2 tracking-tight">Pret a investir ?</h3>
          <p className="text-[#4B5563] text-[14px] mb-7 max-w-md mx-auto leading-relaxed">
            Accedez a {fund.fundName} avec un investissement minimum de {fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—"}
          </p>
          <button onClick={() => onInvest(fund)}
            className="px-8 py-3.5 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-[#6366F1]/25 hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] text-[15px]">
            Commencer la souscription
          </button>
        </div>
      </div>
    </div>
  );
}
