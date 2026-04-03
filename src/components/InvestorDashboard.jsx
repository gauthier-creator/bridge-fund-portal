import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import { KPICard, Badge, fmt, fmtFull, useCountUp, ProgressRing } from "./shared";
import { NAV_PER_PART } from "../data";
import { shortenHash, getExplorerUrl } from "../services/cardanoService";

/* ═══════════════════════════════════════════════════════════════
   Investor Dashboard — Colorful illustrated brand experience
   Welcome banner → Quick actions → KPIs → Portfolio → Activity
   ═══════════════════════════════════════════════════════════════ */

/* ── Decorative SVG blobs for welcome banner ── */
function WelcomeBanner({ greeting, name, totalInvested, totalParts, walletAddress }) {
  return (
    <div className="relative overflow-hidden rounded-2xl" style={{
      background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 40%, #A78BFA 70%, #C4B5FD 100%)",
      minHeight: 160,
    }}>
      {/* Decorative blobs */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none" style={{ opacity: 0.15 }}>
        <circle cx="680" cy="30" r="120" fill="white" />
        <circle cx="750" cy="160" r="80" fill="white" />
        <circle cx="100" cy="180" r="60" fill="white" />
        <ellipse cx="400" cy="-20" rx="200" ry="80" fill="white" />
        <circle cx="50" cy="50" r="30" fill="white" />
        <rect x="300" y="140" width="120" height="120" rx="60" fill="white" opacity="0.5" />
      </svg>
      {/* Floating geometric shapes */}
      <svg className="absolute right-6 top-4" width="140" height="140" viewBox="0 0 140 140" style={{ opacity: 0.2 }}>
        <rect x="20" y="20" width="50" height="50" rx="12" fill="white" transform="rotate(15 45 45)" />
        <circle cx="110" cy="40" r="25" fill="white" />
        <rect x="70" y="80" width="40" height="40" rx="20" fill="white" transform="rotate(-10 90 100)" />
        <circle cx="30" cy="110" r="15" fill="white" />
      </svg>

      <div className="relative z-10 p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[26px] sm:text-[30px] font-bold text-white tracking-tight drop-shadow-sm">
              {greeting}, {name}
            </h2>
            <p className="text-[14px] text-white/80 mt-1.5">
              Voici un apercu de votre portefeuille
            </p>
            {totalInvested > 0 && (
              <div className="mt-4 inline-flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2">
                <div className="w-2 h-2 rounded-full bg-[#34D399]" />
                <span className="text-[13px] text-white font-medium tabular-nums">
                  {fmt(totalInvested)} investis
                </span>
                <span className="text-white/50">|</span>
                <span className="text-[13px] text-white/90 tabular-nums">
                  {totalParts} parts
                </span>
              </div>
            )}
          </div>
          {/* Decorative illustration on the right */}
          <svg className="hidden sm:block w-24 h-24 flex-shrink-0" viewBox="0 0 96 96" fill="none">
            <circle cx="48" cy="48" r="36" fill="white" opacity="0.15" />
            <circle cx="48" cy="48" r="24" fill="white" opacity="0.12" />
            <path d="M40 52l5 5 12-14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
            <circle cx="48" cy="48" r="20" stroke="white" strokeWidth="1.5" opacity="0.3" strokeDasharray="4 3" />
          </svg>
        </div>

        {/* Wallet banner */}
        {walletAddress && (
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 mt-4 max-w-fit">
            <div className="relative">
              <span className="w-2 h-2 rounded-full bg-[#34D399] block" />
              <span className="w-2 h-2 rounded-full bg-[#34D399] block absolute inset-0 pulse-ring" />
            </div>
            <span className="text-[12px] text-white/70">Wallet Cardano</span>
            <span className="font-mono text-[11px] text-white bg-white/15 px-2 py-0.5 rounded-lg border border-white/10">
              {walletAddress.slice(0, 14)}...{walletAddress.slice(-8)}
            </span>
            <span className="text-[10px] text-white/50">Preprod</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Quick action tiles — larger icons with gradient backgrounds ── */
function QuickActions({ onNavigate }) {
  const actions = [
    {
      id: "invest",
      label: "Investir",
      sub: "Parcourir les fonds et souscrire",
      gradientBg: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)",
      iconGradient: "linear-gradient(135deg, #6366F1, #818CF8)",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      action: () => onNavigate?.("funds"),
    },
    {
      id: "vault",
      label: "Tokens & DeFi",
      sub: "Synthetic tokens et pools",
      gradientBg: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)",
      iconGradient: "linear-gradient(135deg, #8B5CF6, #A78BFA)",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      action: () => onNavigate?.("collateral"),
    },
    {
      id: "blockchain",
      label: "Explorer on-chain",
      sub: "Verifier sur Cardano",
      gradientBg: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
      iconGradient: "linear-gradient(135deg, #059669, #34D399)",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      ),
      action: () => window.open("https://preprod.cardanoscan.io", "_blank"),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 stagger-children">
      {actions.map((a) => (
        <button
          key={a.id}
          onClick={a.action}
          className="group text-left rounded-2xl border border-[rgba(0,0,29,0.08)] bg-white p-4 transition-all duration-200 hover:shadow-lg hover:shadow-[rgba(99,102,241,0.08)] hover:-translate-y-0.5 hover:border-[rgba(99,102,241,0.15)]"
          style={{ background: a.gradientBg }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 shadow-md transition-transform duration-200 group-hover:scale-110"
            style={{ background: a.iconGradient }}
          >
            {a.icon}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#0F0F10]">{a.label}</p>
            <p className="text-[11px] text-[#787881] mt-0.5 hidden sm:block">{a.sub}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── Feature highlight cards with larger illustrations ── */
function FeatureCards({ onNavigate }) {
  const features = [
    {
      title: "Souscription directe",
      sub: "KYC integre, e-signature et paiement SEPA ou crypto — en quelques clics",
      gradient: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 50%, #C7D2FE 100%)",
      badge: null,
      icon: (
        <svg viewBox="0 0 80 80" className="w-20 h-20">
          {/* Document background */}
          <rect x="12" y="8" width="42" height="52" rx="8" fill="#6366F1" opacity="0.08" />
          <rect x="16" y="12" width="42" height="52" rx="8" fill="#6366F1" opacity="0.12" />
          {/* Main document */}
          <rect x="20" y="16" width="42" height="52" rx="8" fill="white" stroke="#6366F1" strokeWidth="1" opacity="0.9" />
          {/* Lines */}
          <rect x="28" y="26" width="26" height="3" rx="1.5" fill="#6366F1" opacity="0.25" />
          <rect x="28" y="33" width="18" height="3" rx="1.5" fill="#6366F1" opacity="0.15" />
          <rect x="28" y="40" width="22" height="3" rx="1.5" fill="#6366F1" opacity="0.15" />
          {/* Signature line */}
          <path d="M28 54 Q32 48 36 54 Q40 60 44 52" stroke="#6366F1" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round" />
          {/* Check badge */}
          <circle cx="54" cy="56" r="12" fill="#4F46E5" />
          <path d="M49 56l3 3 6-7" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Decorative dots */}
          <circle cx="14" cy="62" r="3" fill="#A5B4FC" opacity="0.4" />
          <circle cx="64" cy="14" r="4" fill="#A5B4FC" opacity="0.3" />
          <circle cx="8" cy="30" r="2" fill="#C7D2FE" opacity="0.5" />
        </svg>
      ),
      action: () => onNavigate?.("funds"),
    },
    {
      title: "Tokens & DeFi",
      sub: "Mintez des synthetic tokens (sBF) et accedez aux pools de liquidite Cardano",
      gradient: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 50%, #DDD6FE 100%)",
      badge: "Nouveau",
      icon: (
        <svg viewBox="0 0 80 80" className="w-20 h-20">
          {/* Outer ring */}
          <circle cx="40" cy="40" r="28" fill="none" stroke="#8B5CF6" strokeWidth="1" opacity="0.15" strokeDasharray="4 3" />
          {/* Connected nodes */}
          <circle cx="40" cy="40" r="18" fill="#8B5CF6" opacity="0.08" />
          <circle cx="40" cy="40" r="12" fill="#8B5CF6" opacity="0.12" />
          {/* Center token */}
          <circle cx="40" cy="40" r="10" fill="#7C3AED" />
          <text x="40" y="44" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">sBF</text>
          {/* Satellite nodes */}
          <circle cx="16" cy="22" r="7" fill="#A78BFA" opacity="0.25" />
          <circle cx="64" cy="22" r="7" fill="#A78BFA" opacity="0.25" />
          <circle cx="16" cy="58" r="7" fill="#A78BFA" opacity="0.25" />
          <circle cx="64" cy="58" r="7" fill="#A78BFA" opacity="0.25" />
          {/* Connection lines */}
          <line x1="22" y1="26" x2="32" y2="34" stroke="#A78BFA" strokeWidth="1" opacity="0.2" />
          <line x1="58" y1="26" x2="48" y2="34" stroke="#A78BFA" strokeWidth="1" opacity="0.2" />
          <line x1="22" y1="54" x2="32" y2="46" stroke="#A78BFA" strokeWidth="1" opacity="0.2" />
          <line x1="58" y1="54" x2="48" y2="46" stroke="#A78BFA" strokeWidth="1" opacity="0.2" />
          {/* Decorative sparkles */}
          <circle cx="40" cy="12" r="2.5" fill="#C4B5FD" opacity="0.5" />
          <circle cx="68" cy="40" r="2.5" fill="#C4B5FD" opacity="0.5" />
          <circle cx="40" cy="68" r="2.5" fill="#C4B5FD" opacity="0.5" />
          <circle cx="12" cy="40" r="2.5" fill="#C4B5FD" opacity="0.5" />
        </svg>
      ),
      action: () => onNavigate?.("collateral"),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 stagger-children">
      {features.map((f) => (
        <button key={f.title} onClick={f.action} className="feature-card text-left group transition-all duration-200 hover:shadow-lg hover:shadow-[rgba(99,102,241,0.08)] hover:-translate-y-0.5">
          <div className="feature-card-illustration relative flex items-center justify-center" style={{ background: f.gradient, minHeight: 120 }}>
            {f.badge && (
              <span className="absolute top-3 right-3 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-md"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #6366F1)" }}>
                {f.badge}
              </span>
            )}
            {f.icon}
          </div>
          <div className="p-4">
            <h3 className="text-[14px] font-semibold text-[#0F0F10] mb-1">{f.title}</h3>
            <p className="text-[12px] text-[#787881] leading-relaxed">{f.sub}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── Empty state illustration ── */
function EmptySubscriptions({ onNavigate }) {
  return (
    <div className="p-12 text-center">
      <div className="relative w-32 h-32 mx-auto mb-6">
        {/* Gradient background circle */}
        <svg viewBox="0 0 128 128" className="w-full h-full">
          <defs>
            <linearGradient id="emptyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EEF2FF" />
              <stop offset="100%" stopColor="#E0E7FF" />
            </linearGradient>
            <linearGradient id="emptyAccent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
          {/* Background blob */}
          <circle cx="64" cy="64" r="56" fill="url(#emptyGrad)" />
          {/* Document icon */}
          <rect x="38" y="28" width="40" height="52" rx="8" fill="white" stroke="#C7D2FE" strokeWidth="1.5" />
          <rect x="46" y="40" width="24" height="3" rx="1.5" fill="#C7D2FE" />
          <rect x="46" y="48" width="16" height="3" rx="1.5" fill="#DDD6FE" />
          <rect x="46" y="56" width="20" height="3" rx="1.5" fill="#DDD6FE" />
          {/* Plus circle */}
          <circle cx="72" cy="74" r="14" fill="url(#emptyAccent)" />
          <path d="M72 68v12M66 74h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          {/* Floating decorations */}
          <circle cx="30" cy="44" r="4" fill="#A5B4FC" opacity="0.4" />
          <circle cx="96" cy="36" r="3" fill="#C4B5FD" opacity="0.5" />
          <circle cx="24" cy="80" r="2.5" fill="#DDD6FE" opacity="0.6" />
          <rect x="88" y="60" width="8" height="8" rx="4" fill="#A5B4FC" opacity="0.3" transform="rotate(20 92 64)" />
        </svg>
      </div>
      <p className="text-[16px] font-semibold text-[#0F0F10]">Aucune souscription pour le moment</p>
      <p className="text-[13px] text-[#787881] mt-2 max-w-xs mx-auto leading-relaxed">
        Explorez le catalogue pour decouvrir les fonds disponibles et commencer a investir
      </p>
      <button
        onClick={() => onNavigate?.("funds")}
        className="mt-5 px-6 py-2.5 text-white text-[13px] font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[rgba(99,102,241,0.3)] hover:-translate-y-0.5"
        style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
      >
        Explorer les fonds
      </button>
    </div>
  );
}

export default function InvestorDashboard({ onViewFund, onNavigate }) {
  const { user, profile } = useAuth();
  const { orders } = useAppContext();
  const [funds, setFunds] = useState([]);
  const [vaultPositions, setVaultPositions] = useState([]);
  const [tokenTransfers, setTokenTransfers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!supabase) { setLoaded(true); return; }
    supabase.from("funds").select("id, fund_name, slug, nav_per_share, cardano_tx_hash, blockchain_network, cardano_policy_id")
      .eq("status", "active")
      .then(({ data }) => { if (data) setFunds(data); setLoaded(true); });
  }, []);

  useEffect(() => {
    if (!supabase || !user?.id) return;
    supabase.from("vault_positions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setVaultPositions(data); });
  }, [user?.id]);

  useEffect(() => {
    if (!supabase || !profile?.wallet_address) return;
    supabase.from("token_transfers")
      .select("*")
      .or(`from_address.eq.${profile.wallet_address},to_address.eq.${profile.wallet_address}`)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setTokenTransfers(data); });
  }, [profile?.wallet_address]);

  const myOrders = orders.filter((o) => o.userId === user?.id);
  const validatedOrders = myOrders.filter((o) => o.status === "validated");
  const pendingOrders = myOrders.filter((o) => o.status === "pending");

  const totalInvested = validatedOrders.reduce((s, o) => s + o.montant, 0);
  const totalPending = pendingOrders.reduce((s, o) => s + o.montant, 0);
  const totalParts = validatedOrders.reduce((s, o) => s + Math.floor(o.montant / NAV_PER_PART), 0);

  const lockedPositions = vaultPositions.filter((p) => p.status === "locked");
  const totalSynthetic = lockedPositions.reduce((s, p) => s + (p.synthetic_token_count || 0), 0);
  const totalLocked = lockedPositions.reduce((s, p) => s + (p.security_token_count || 0), 0);

  const investmentsByFund = {};
  myOrders.forEach((o) => {
    const fundId = o.fundId || "unknown";
    if (!investmentsByFund[fundId]) investmentsByFund[fundId] = [];
    investmentsByFund[fundId].push(o);
  });

  const getFundName = (fundId) => {
    const f = funds.find((x) => x.id === fundId);
    return f?.fund_name || "—";
  };

  const statusLabel = (s) => s === "pending" ? "En attente" : s === "validated" ? "Approuve" : "Rejete";

  const animPortfolio = useCountUp(loaded ? totalInvested : 0, 1400);
  const animPending = useCountUp(loaded ? totalPending : 0, 1200);
  const animParts = useCountUp(loaded ? totalParts : 0, 1000);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon apres-midi";
    return "Bonsoir";
  };

  /* KPI indicator colors */
  const kpiIndicators = [
    { color: "#6366F1", label: "Portefeuille" },
    { color: "#F59E0B", label: "En attente" },
    { color: "#059669", label: "NAV / part" },
    { color: "#8B5CF6", label: "Tokens synthetiques" },
  ];

  return (
    <div className="space-y-8">
      {/* ── Welcome banner with gradient + illustrations ── */}
      <div className="stagger-hero">
        <WelcomeBanner
          greeting={greeting()}
          name={profile?.full_name?.split(" ")[0] || "Investisseur"}
          totalInvested={totalInvested}
          totalParts={totalParts}
          walletAddress={profile?.wallet_address}
        />
      </div>

      {/* ── Quick action tiles row ── */}
      <QuickActions onNavigate={onNavigate} />

      {/* ── KPI cards with colored indicators ── */}
      <div className="grid grid-cols-4 gap-4 stagger-fast">
        <div className="relative overflow-hidden bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-5">
          <div className="absolute top-0 left-0 w-full h-1 rounded-t-2xl" style={{ background: "linear-gradient(90deg, #6366F1, #818CF8)" }} />
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full" style={{ background: "#6366F1" }} />
            <span className="text-[12px] text-[#787881] font-medium">Portefeuille</span>
          </div>
          <p className="text-[22px] font-bold text-[#0F0F10] tabular-nums">{fmt(animPortfolio)}</p>
          <p className="text-[11px] text-[#A8A29E] mt-1">{animParts} parts detenues</p>
        </div>
        <div className="relative overflow-hidden bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-5">
          <div className="absolute top-0 left-0 w-full h-1 rounded-t-2xl" style={{ background: "linear-gradient(90deg, #F59E0B, #FBBF24)" }} />
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full" style={{ background: "#F59E0B" }} />
            <span className="text-[12px] text-[#787881] font-medium">En attente</span>
          </div>
          <p className="text-[22px] font-bold text-[#0F0F10] tabular-nums">{fmt(animPending)}</p>
          <p className="text-[11px] text-[#A8A29E] mt-1">{pendingOrders.length} souscription{pendingOrders.length > 1 ? "s" : ""}</p>
        </div>
        <div className="relative overflow-hidden bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-5">
          <div className="absolute top-0 left-0 w-full h-1 rounded-t-2xl" style={{ background: "linear-gradient(90deg, #059669, #34D399)" }} />
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full" style={{ background: "#059669" }} />
            <span className="text-[12px] text-[#787881] font-medium">NAV / part</span>
          </div>
          <p className="text-[22px] font-bold text-[#0F0F10] tabular-nums">{fmtFull(NAV_PER_PART)}</p>
          <p className="text-[11px] text-[#A8A29E] mt-1">Derniere valorisation</p>
        </div>
        <div className="relative overflow-hidden bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-5">
          <div className="absolute top-0 left-0 w-full h-1 rounded-t-2xl" style={{ background: "linear-gradient(90deg, #8B5CF6, #A78BFA)" }} />
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full" style={{ background: "#8B5CF6" }} />
            <span className="text-[12px] text-[#787881] font-medium">Tokens synthetiques</span>
          </div>
          <p className="text-[22px] font-bold text-[#0F0F10] tabular-nums">{totalSynthetic} sBF</p>
          <p className="text-[11px] text-[#A8A29E] mt-1">{totalLocked > 0 ? `${totalLocked} BF verrouilles` : "Aucune position"}</p>
        </div>
      </div>

      {/* ── Feature cards ("Selectionne pour vous") ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-[#0F0F10]">Selectionne pour vous</h3>
          <button onClick={() => onNavigate?.("funds")} className="text-[13px] text-[#787881] hover:text-[#6366F1] transition-colors">
            Explorer les fonds →
          </button>
        </div>
        <FeatureCards onNavigate={onNavigate} />
      </div>

      {/* ── Portfolio breakdown ── */}
      {validatedOrders.length > 0 && (
        <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-6 page-slide-in">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[14px] font-semibold text-[#0F0F10]">Mon portefeuille</h3>
              <p className="text-[12px] text-[#787881] mt-0.5">{Object.keys(investmentsByFund).length} fonds · {validatedOrders.length} souscriptions validees</p>
            </div>
            <div className="flex items-center gap-2">
              <ProgressRing value={totalParts > 0 ? Math.min(100, (totalInvested / 1000000) * 100) : 0} size={40} stroke={3} color="#059669" />
              <div className="text-right">
                <p className="text-[13px] font-semibold text-[#0F0F10] tabular-nums">{fmt(totalInvested)}</p>
                <p className="text-[10px] text-[#A8A29E]">total investi</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {Object.entries(investmentsByFund).map(([fundId, fundOrders], idx) => {
              const fund = funds.find((f) => f.id === fundId);
              const validated = fundOrders.filter((o) => o.status === "validated");
              const total = validated.reduce((s, o) => s + o.montant, 0);
              const parts = Math.floor(total / (fund?.nav_per_share || NAV_PER_PART));
              if (validated.length === 0) return null;

              const fundVault = lockedPositions.filter((p) => p.fund_id === fundId);
              const fundSynthetic = fundVault.reduce((s, p) => s + (p.synthetic_token_count || 0), 0);

              /* Rotating accent gradients for portfolio cards */
              const accents = [
                "linear-gradient(135deg, #6366F1, #818CF8)",
                "linear-gradient(135deg, #8B5CF6, #A78BFA)",
                "linear-gradient(135deg, #059669, #34D399)",
              ];

              return (
                <div key={fundId}
                  className="relative overflow-hidden bg-[rgba(0,0,23,0.025)] border border-[rgba(0,0,29,0.06)] rounded-2xl p-4 cursor-pointer hover:bg-[rgba(0,0,23,0.04)] hover:border-[rgba(0,0,29,0.12)] hover:shadow-md transition-all duration-200"
                  onClick={() => fund?.slug && onViewFund?.(fund.slug)}>
                  {/* Top accent gradient bar */}
                  <div className="absolute top-0 left-0 w-full h-1 rounded-t-2xl" style={{ background: accents[idx % accents.length] }} />

                  <div className="flex items-center justify-between mb-3 mt-1">
                    <h4 className="text-[13px] font-semibold text-[#0F0F10]">{fund?.fund_name || "Fonds"}</h4>
                    {fund?.cardano_policy_id && (
                      <span className="text-[10px] font-mono text-[#A8A29E] bg-white px-1.5 py-0.5 rounded-lg border border-[rgba(0,0,29,0.06)]">
                        {shortenHash(fund.cardano_policy_id, 4)}
                      </span>
                    )}
                  </div>

                  <div className="w-full h-1.5 bg-[rgba(0,0,29,0.06)] rounded-full overflow-hidden mb-3">
                    <div className="h-full rounded-full animate-progress"
                      style={{
                        width: `${Math.min(100, (total / (fund?.fundSize || 10000000)) * 100)}%`,
                        background: accents[idx % accents.length],
                      }} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[#787881]">Montant investi</span>
                      <span className="font-medium text-[#0F0F10] tabular-nums">{fmt(total)}</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[#787881]">Parts detenues</span>
                      <span className="font-medium text-[#0F0F10] tabular-nums">{parts}</span>
                    </div>
                    {fundSynthetic > 0 && (
                      <div className="flex justify-between text-[12px] pt-2 mt-1 border-t border-[rgba(0,0,29,0.06)]">
                        <span className="text-[#6366F1]">Tokens synthetiques</span>
                        <span className="font-medium text-[#6366F1] tabular-nums">{fundSynthetic} sBF</span>
                      </div>
                    )}
                  </div>
                  {fund?.cardano_tx_hash && (
                    <a href={getExplorerUrl(fund.cardano_tx_hash, fund.blockchain_network)}
                      target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-[#A8A29E] hover:text-[#6366F1] transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                      Verifier on-chain
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Vault Positions ── */}
      {vaultPositions.length > 0 && (
        <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl overflow-hidden page-slide-in">
          <div className="px-6 py-4 border-b border-[rgba(0,0,29,0.06)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #F5F3FF, #EDE9FE)" }}>
                <svg className="w-3.5 h-3.5 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-[#0F0F10]">Positions Vault</h3>
                <p className="text-[11px] text-[#A8A29E]">Tokens synthetiques (sBF)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B5CF6] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8B5CF6]"></span>
              </span>
              <span className="text-[12px] text-[#A8A29E]">{lockedPositions.length} active{lockedPositions.length > 1 ? "s" : ""}</span>
            </div>
          </div>

          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[rgba(0,0,29,0.06)] bg-[rgba(0,0,23,0.02)]">
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium">Asset</th>
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium text-right">BF verrouilles</th>
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium text-right">sBF detenus</th>
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium">Statut</th>
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium">Transaction</th>
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="stagger-rows">
              {vaultPositions.map((pos, i) => (
                <tr key={pos.id} className={`border-b border-[rgba(0,0,29,0.04)] hover:bg-[rgba(139,92,246,0.03)] transition-colors ${i % 2 === 1 ? "bg-[rgba(0,0,23,0.015)]" : ""}`}>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-[#0F0F10] text-[12px]">{pos.security_asset_name}</p>
                    <p className="text-[10px] font-mono text-[#A8A29E]">{shortenHash(pos.security_policy_id, 6)}</p>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-[12px] text-[#0F0F10] tabular-nums">{pos.security_token_count}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-[12px] text-[#8B5CF6] tabular-nums font-semibold">{pos.synthetic_token_count}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                      pos.status === "locked"
                        ? "bg-[#F5F3FF] text-[#8B5CF6] border border-[rgba(139,92,246,0.1)]"
                        : "bg-[rgba(0,0,23,0.03)] text-[#787881] border border-[rgba(0,0,29,0.06)]"
                    }`}>
                      {pos.status === "locked" ? "Verrouille" : "Deverrouille"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <a href={getExplorerUrl(pos.lock_tx_hash, "preprod")} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-[#8B5CF6] hover:text-[#0F0F10] transition-colors">
                      {shortenHash(pos.lock_tx_hash, 6)}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  </td>
                  <td className="px-5 py-3.5 text-[#A8A29E] text-[12px]">{pos.locked_at ? new Date(pos.locked_at).toLocaleDateString("fr-FR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Subscription History ── */}
      <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl overflow-hidden page-slide-in">
        <div className="px-6 py-4 border-b border-[rgba(0,0,29,0.06)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(0,0,23,0.04), rgba(0,0,23,0.08))" }}>
              <svg className="w-3.5 h-3.5 text-[#787881]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-[14px] font-semibold text-[#0F0F10]">Historique des souscriptions</h3>
          </div>
          <span className="text-[12px] text-[#A8A29E]">{myOrders.length} souscription{myOrders.length > 1 ? "s" : ""}</span>
        </div>

        {myOrders.length === 0 ? (
          <EmptySubscriptions onNavigate={onNavigate} />
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[rgba(0,0,29,0.06)] bg-[rgba(0,0,23,0.02)]">
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium">Ref</th>
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium">Fonds</th>
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium">Classe</th>
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium text-right">Montant</th>
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium">Paiement</th>
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium">Statut</th>
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="stagger-rows">
              {myOrders.sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((o, i) => (
                <tr key={o.id} className={`border-b border-[rgba(0,0,29,0.04)] hover:bg-[rgba(99,102,241,0.03)] transition-colors ${i % 2 === 1 ? "bg-[rgba(0,0,23,0.015)]" : ""}`}>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-[#0F0F10] tabular-nums">{o.id?.slice(0, 8)}...</td>
                  <td className="px-5 py-3.5 text-[#0F0F10] font-medium text-[12px]">{getFundName(o.fundId)}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium bg-[#EEF2FF] text-[#6366F1] border border-[rgba(99,102,241,0.1)]">
                      Classe {o.shareClass || 1}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-[#0F0F10] tabular-nums text-[12px]">{fmt(o.montant)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[12px] font-medium ${o.paymentMethod === "crypto" ? "text-[#8B5CF6]" : "text-[#787881]"}`}>
                      {o.paymentMethod === "crypto" ? "Crypto (ADA)" : "Virement"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5"><Badge status={statusLabel(o.status)} /></td>
                  <td className="px-5 py-3.5 text-[#A8A29E] text-[12px]">{o.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── On-chain activity ── */}
      {tokenTransfers.length > 0 && (
        <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl overflow-hidden page-slide-in">
          <div className="px-6 py-4 border-b border-[rgba(0,0,29,0.06)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)" }}>
                <svg className="w-3.5 h-3.5 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-[#0F0F10]">Activite on-chain</h3>
                <p className="text-[11px] text-[#A8A29E]">Cardano Preprod Testnet</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
              </span>
              <span className="text-[12px] text-[#059669] font-medium">Live</span>
            </div>
          </div>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[rgba(0,0,29,0.06)] bg-[rgba(0,0,23,0.02)]">
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium">Type</th>
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium">Asset</th>
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium text-right">Tokens</th>
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium">Transaction</th>
                <th className="px-5 py-3.5 text-[12px] text-[#A8A29E] font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="stagger-rows">
              {tokenTransfers.map((t, i) => {
                const isIncoming = t.to_address === profile?.wallet_address;
                const typeLabels = {
                  mint: "Mint",
                  transfer: isIncoming ? "Recu" : "Envoye",
                  vault_lock: "Vault Lock",
                  vault_unlock: "Vault Unlock",
                };
                const typeColors = {
                  mint: "bg-[#ECFDF5] text-[#059669] border border-[rgba(5,150,105,0.1)]",
                  transfer: isIncoming ? "bg-[#EEF2FF] text-[#6366F1] border border-[rgba(99,102,241,0.1)]" : "bg-[#FFFBEB] text-[#D97706] border border-[rgba(217,119,6,0.1)]",
                  vault_lock: "bg-[#F5F3FF] text-[#8B5CF6] border border-[rgba(139,92,246,0.1)]",
                  vault_unlock: "bg-[#FFFBEB] text-[#D97706] border border-[rgba(217,119,6,0.1)]",
                };
                return (
                  <tr key={t.id} className={`border-b border-[rgba(0,0,29,0.04)] hover:bg-[rgba(5,150,105,0.03)] transition-colors ${i % 2 === 1 ? "bg-[rgba(0,0,23,0.015)]" : ""}`}>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium ${typeColors[t.transfer_type] || "bg-[rgba(0,0,23,0.03)] text-[#A8A29E]"}`}>
                        {typeLabels[t.transfer_type] || t.transfer_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] font-medium text-[#0F0F10]">{t.asset_name || "—"}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-[12px] text-[#0F0F10] tabular-nums">{t.token_count}</td>
                    <td className="px-5 py-3.5">
                      <a href={getExplorerUrl(t.tx_hash, "preprod")} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-[#8B5CF6] hover:text-[#0F0F10] transition-colors">
                        {shortenHash(t.tx_hash, 6)}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    </td>
                    <td className="px-5 py-3.5 text-[#A8A29E] text-[12px]">{t.created_at ? new Date(t.created_at).toLocaleDateString("fr-FR") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
