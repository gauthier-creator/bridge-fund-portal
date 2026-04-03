import { useState, useEffect } from "react";
import { listFunds } from "../services/fundService";
import { shortenHash } from "../services/cardanoService";

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/* ---------- gradient palette & icon colors ---------- */
const GRADIENTS = [
  "from-indigo-100 to-indigo-50",
  "from-amber-100 to-orange-50",
  "from-emerald-100 to-green-50",
  "from-pink-100 to-rose-50",
  "from-sky-100 to-cyan-50",
  "from-violet-100 to-purple-50",
  "from-teal-100 to-teal-50",
  "from-orange-100 to-yellow-50",
];

const ICON_COLORS = [
  "#6366F1", "#F59E0B", "#059669", "#F43F5E",
  "#0EA5E9", "#8B5CF6", "#14B8A6", "#EA580C",
];

/* ---------- abstract SVG illustrations per gradient ---------- */
const CardIllustration = ({ color, variant }) => {
  const shapes = [
    // indigo — overlapping circles
    <g key="0">
      <circle cx="90" cy="30" r="28" fill={color} opacity=".18" />
      <circle cx="110" cy="50" r="20" fill={color} opacity=".13" />
      <rect x="60" y="45" width="24" height="24" rx="6" fill={color} opacity=".10" />
    </g>,
    // amber — stacked rectangles
    <g key="1">
      <rect x="70" y="18" width="40" height="40" rx="10" fill={color} opacity=".16" transform="rotate(15 90 38)" />
      <rect x="90" y="30" width="28" height="28" rx="8" fill={color} opacity=".12" transform="rotate(-10 104 44)" />
      <circle cx="75" cy="55" r="10" fill={color} opacity=".10" />
    </g>,
    // emerald — leaf / organic
    <g key="2">
      <ellipse cx="95" cy="35" rx="30" ry="20" fill={color} opacity=".15" transform="rotate(-20 95 35)" />
      <circle cx="110" cy="55" r="14" fill={color} opacity=".12" />
      <rect x="65" y="42" width="16" height="16" rx="8" fill={color} opacity=".10" />
    </g>,
    // pink — playful dots
    <g key="3">
      <circle cx="80" cy="28" r="18" fill={color} opacity=".16" />
      <circle cx="108" cy="42" r="22" fill={color} opacity=".12" />
      <circle cx="90" cy="60" r="10" fill={color} opacity=".10" />
    </g>,
    // sky — wave paths
    <g key="4">
      <path d="M60 50 Q80 20 100 45 Q120 70 140 35" stroke={color} strokeWidth="6" fill="none" opacity=".18" strokeLinecap="round" />
      <circle cx="105" cy="30" r="14" fill={color} opacity=".10" />
    </g>,
    // violet — diamond
    <g key="5">
      <rect x="82" y="22" width="30" height="30" rx="4" fill={color} opacity=".16" transform="rotate(45 97 37)" />
      <circle cx="78" cy="52" r="12" fill={color} opacity=".12" />
      <circle cx="115" cy="55" r="8" fill={color} opacity=".10" />
    </g>,
    // teal — bars
    <g key="6">
      <rect x="68" y="38" width="10" height="28" rx="5" fill={color} opacity=".18" />
      <rect x="84" y="28" width="10" height="38" rx="5" fill={color} opacity=".14" />
      <rect x="100" y="34" width="10" height="32" rx="5" fill={color} opacity=".11" />
      <rect x="116" y="24" width="10" height="42" rx="5" fill={color} opacity=".08" />
    </g>,
    // orange — abstract sun
    <g key="7">
      <circle cx="98" cy="40" r="20" fill={color} opacity=".16" />
      <path d="M98 12 L102 22 L94 22 Z" fill={color} opacity=".12" />
      <path d="M120 18 L118 28 L112 24 Z" fill={color} opacity=".12" />
      <path d="M128 38 L118 40 L120 34 Z" fill={color} opacity=".12" />
      <circle cx="75" cy="55" r="8" fill={color} opacity=".10" />
    </g>,
  ];

  return (
    <svg className="absolute right-0 top-0 h-full w-36 pointer-events-none" viewBox="0 0 144 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {shapes[variant % shapes.length]}
    </svg>
  );
};

/* ---------- welcome header illustration ---------- */
const WelcomeIllustration = () => (
  <svg className="w-full h-full" viewBox="0 0 400 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="40" fill="#6366F1" opacity=".08" />
    <circle cx="60" cy="60" r="24" fill="#6366F1" opacity=".12" />
    <rect x="120" y="30" width="50" height="50" rx="14" fill="#059669" opacity=".08" transform="rotate(12 145 55)" />
    <rect x="120" y="30" width="30" height="30" rx="8" fill="#059669" opacity=".12" transform="rotate(12 135 45)" />
    <circle cx="220" cy="55" r="32" fill="#F59E0B" opacity=".08" />
    <path d="M210 55 Q220 30 230 55 Q240 80 250 55" stroke="#F59E0B" strokeWidth="3" opacity=".18" fill="none" strokeLinecap="round" />
    <rect x="290" y="25" width="44" height="44" rx="22" fill="#F43F5E" opacity=".07" />
    <rect x="300" y="35" width="24" height="24" rx="12" fill="#F43F5E" opacity=".12" />
    <circle cx="370" cy="50" r="18" fill="#8B5CF6" opacity=".10" />
    <circle cx="370" cy="50" r="10" fill="#8B5CF6" opacity=".14" />
  </svg>
);

/* ---------- empty-state illustration ---------- */
const EmptyIllustration = () => (
  <svg className="w-28 h-28 mx-auto mb-5" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="56" fill="#F5F3FF" />
    <circle cx="60" cy="60" r="40" fill="#EEF2FF" />
    <rect x="40" y="42" width="40" height="36" rx="8" fill="#6366F1" opacity=".12" />
    <rect x="46" y="50" width="28" height="3" rx="1.5" fill="#6366F1" opacity=".25" />
    <rect x="46" y="57" width="20" height="3" rx="1.5" fill="#6366F1" opacity=".18" />
    <rect x="46" y="64" width="24" height="3" rx="1.5" fill="#6366F1" opacity=".14" />
    <circle cx="85" cy="38" r="14" fill="#6366F1" opacity=".08" />
    <path d="M80 38 L85 32 L90 38" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" opacity=".3" />
  </svg>
);

/* ========== MAIN COMPONENT ========== */
export default function FundCatalog({ onSelectFund }) {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listFunds()
      .then(setFunds)
      .finally(() => setLoading(false));
  }, []);

  /* ---------- loading skeleton ---------- */
  if (loading) {
    return (
      <div className="page-slide-in">
        {/* header skeleton */}
        <div className="mb-10">
          <div className="skeleton h-32 rounded-3xl mb-6" />
          <div className="skeleton skeleton-title w-48" />
          <div className="skeleton skeleton-text w-64 mt-2" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[280px] rounded-3xl" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  /* ---------- empty state ---------- */
  if (funds.length === 0) {
    return (
      <div className="page-slide-in flex flex-col items-center justify-center py-24 px-4">
        <EmptyIllustration />
        <h3 className="text-[20px] font-bold text-[#0F0F10] tracking-tight mb-1">Aucun fonds disponible</h3>
        <p className="text-[14px] text-[#787881] max-w-xs text-center leading-relaxed">
          De nouveaux fonds seront bientot disponibles. Revenez dans quelques instants.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#6366F1] bg-[#EEF2FF] hover:bg-[#E0E7FF] transition-colors duration-200"
        >
          Rafraichir
        </button>
      </div>
    );
  }

  /* ---------- main catalog ---------- */
  return (
    <div className="page-slide-in">
      {/* Welcome banner */}
      <div className="relative mb-10 rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 border border-[rgba(0,0,29,0.06)] stagger-hero">
        <div className="absolute inset-0 opacity-60 pointer-events-none">
          <WelcomeIllustration />
        </div>
        <div className="relative px-7 py-8 md:px-10 md:py-10">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-[rgba(0,0,29,0.06)] rounded-full px-3.5 py-1.5 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-50" style={{ animationDuration: "3s" }}></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
            </span>
            <span className="text-[12px] font-medium text-[#059669]">{funds.length} fond{funds.length > 1 ? "s" : ""} disponible{funds.length > 1 ? "s" : ""}</span>
          </div>
          <h2 className="text-[28px] md:text-[32px] font-extrabold text-[#0F0F10] tracking-tight leading-tight max-w-md">
            Investissez dans des fonds tokenises
          </h2>
          <p className="text-[15px] text-[#787881] mt-2 max-w-lg leading-relaxed">
            Selectionnez un fonds pour decouvrir ses performances, consulter les details et souscrire en quelques clics.
          </p>
        </div>
      </div>

      {/* Fund cards grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
        {funds.map((fund, idx) => {
          const gradientIdx = idx % GRADIENTS.length;
          const gradient = GRADIENTS[gradientIdx];
          const iconColor = ICON_COLORS[gradientIdx];

          return (
            <button
              key={fund.id}
              onClick={() => onSelectFund(fund.slug)}
              className="bg-white border border-[rgba(0,0,29,0.08)] rounded-3xl overflow-hidden text-left group hover:border-[rgba(0,0,29,0.16)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1"
              style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
            >
              {/* Gradient header with illustration */}
              <div className={`relative bg-gradient-to-br ${gradient} px-5 pt-5 pb-6 overflow-hidden`}>
                <CardIllustration color={iconColor} variant={gradientIdx} />

                <div className="relative z-10">
                  {/* Regulatory badge */}
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold mb-3"
                    style={{ backgroundColor: `${iconColor}18`, color: iconColor }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: iconColor }} />
                    {fund.regulatoryStatus || "Regulated"}
                  </div>

                  {/* Fund name */}
                  <h3 className="text-[17px] font-bold text-[#0F0F10] tracking-tight leading-snug pr-16">
                    {fund.fundName}
                  </h3>
                </div>
              </div>

              {/* Metrics — only rendement + NAV */}
              <div className="px-5 pt-5 pb-2">
                <div className="flex gap-6 mb-4">
                  <div className="flex-1">
                    <p className="text-[11px] uppercase tracking-wider text-[#A8A29E] font-semibold mb-1">Rendement</p>
                    <p className="text-[22px] font-extrabold text-[#0F0F10] tabular-nums leading-none">
                      {fund.targetReturn || "\u2014"}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] uppercase tracking-wider text-[#A8A29E] font-semibold mb-1">NAV / Part</p>
                    <p className="text-[22px] font-extrabold text-[#0F0F10] tabular-nums leading-none">
                      {fund.navPerShare ? fmt(fund.navPerShare) : "\u2014"}
                    </p>
                  </div>
                </div>

                {/* Cardano badge */}
                {fund.cardanoPolicyId && (
                  <div className="flex items-center gap-2 bg-[rgba(0,0,23,0.025)] rounded-xl px-3 py-2 text-[12px] mb-4 border border-[rgba(0,0,29,0.06)]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-50" style={{ animationDuration: "3s" }}></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
                    </span>
                    <span className="text-[#787881]">Cardano</span>
                    <span className="font-mono text-[#A8A29E] ml-auto tabular-nums">{shortenHash(fund.cardanoPolicyId, 6)}</span>
                  </div>
                )}
              </div>

              {/* CTA button */}
              <div className="px-5 pb-5">
                <div
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[14px] font-semibold text-white transition-all duration-300 group-hover:shadow-lg"
                  style={{
                    backgroundColor: iconColor,
                    transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  Decouvrir ce fonds
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
