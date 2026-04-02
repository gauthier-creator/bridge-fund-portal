import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import { KPICard, Badge, fmt, fmtFull, useCountUp, ProgressRing } from "./shared";
import { NAV_PER_PART } from "../data";
import { shortenHash, getExplorerUrl } from "../services/cardanoService";

/* ═══════════════════════════════════════════════════════════════
   Investor Dashboard — ElevenLabs-inspired home experience
   Greeting → Quick action tiles → KPIs → Portfolio → Activity
   ═══════════════════════════════════════════════════════════════ */

/* ── Quick action tiles (like ElevenLabs home: "Discours instantané", etc.) ── */
function QuickActions({ onNavigate }) {
  const actions = [
    {
      id: "invest",
      label: "Souscrire",
      sub: "Investir dans un fonds",
      gradient: "from-indigo-100 to-indigo-50",
      glow: "#6366F1",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#6366F1" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      action: () => onNavigate?.("funds"),
    },
    {
      id: "portfolio",
      label: "Portfolio",
      sub: "Vos investissements",
      gradient: "from-emerald-100 to-green-50",
      glow: "#059669",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#059669" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      action: () => {},
    },
    {
      id: "vault",
      label: "Collateral",
      sub: "Tokens synthetiques",
      gradient: "from-violet-100 to-purple-50",
      glow: "#8B5CF6",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#8B5CF6" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
      action: () => onNavigate?.("collateral"),
    },
    {
      id: "defi",
      label: "DeFi",
      sub: "Pools & liquidite",
      gradient: "from-sky-100 to-cyan-50",
      glow: "#0EA5E9",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#0EA5E9" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      ),
      action: () => onNavigate?.("collateral"),
    },
    {
      id: "kyc",
      label: "Mon profil",
      sub: "KYC & documents",
      gradient: "from-amber-100 to-orange-50",
      glow: "#D97706",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#D97706" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
        </svg>
      ),
      action: () => onNavigate?.("profile"),
    },
    {
      id: "blockchain",
      label: "On-chain",
      sub: "Cardano explorer",
      gradient: "from-pink-100 to-rose-50",
      glow: "#EC4899",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#EC4899" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      ),
      action: () => window.open("https://preprod.cardanoscan.io", "_blank"),
    },
  ];

  return (
    <div className="grid grid-cols-6 gap-2 stagger-children">
      {actions.map((a) => (
        <button key={a.id} onClick={a.action} className="action-tile group">
          <div className={`action-tile-icon bg-gradient-to-br ${a.gradient}`}
            style={{ boxShadow: `0 0 0 0 transparent` }}>
            {a.icon}
          </div>
          <div>
            <p className="text-[13px] font-medium text-[#0F0F10]">{a.label}</p>
            <p className="text-[11px] text-[#A8A29E] hidden sm:block">{a.sub}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── Feature highlight cards (like ElevenLabs "Sélectionné pour votre cas d'utilisation") ── */
function FeatureCards({ onNavigate }) {
  const features = [
    {
      title: "Souscription directe",
      sub: "Investissez en quelques clics avec KYC integre, e-signature et paiement SEPA ou crypto",
      gradient: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 50%, #C7D2FE 100%)",
      icon: (
        <svg viewBox="0 0 48 48" className="w-12 h-12">
          <rect x="8" y="6" width="32" height="36" rx="6" fill="#6366F1" opacity="0.12"/>
          <rect x="14" y="14" width="20" height="3" rx="1.5" fill="#6366F1" opacity="0.3"/>
          <rect x="14" y="20" width="14" height="3" rx="1.5" fill="#6366F1" opacity="0.2"/>
          <rect x="14" y="28" width="10" height="6" rx="3" fill="#6366F1"/>
          <circle cx="34" cy="34" r="8" fill="#4F46E5"/>
          <path d="M31 34l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      action: () => onNavigate?.("funds"),
    },
    {
      title: "Tokens on-chain",
      sub: "Verrouillez vos security tokens et obtenez des synthetiques (sBF) pour la DeFi",
      gradient: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 50%, #DDD6FE 100%)",
      icon: (
        <svg viewBox="0 0 48 48" className="w-12 h-12">
          <circle cx="24" cy="24" r="16" fill="#8B5CF6" opacity="0.1"/>
          <circle cx="24" cy="24" r="10" fill="#8B5CF6" opacity="0.2"/>
          <circle cx="24" cy="24" r="6" fill="#7C3AED"/>
          <path d="M22 24l1.5 1.5 3-3" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
          <circle cx="10" cy="14" r="4" fill="#A78BFA" opacity="0.3"/>
          <circle cx="38" cy="34" r="4" fill="#A78BFA" opacity="0.3"/>
          <line x1="14" y1="16" x2="18" y2="20" stroke="#A78BFA" strokeWidth="1" opacity="0.3"/>
          <line x1="30" y1="28" x2="34" y2="32" stroke="#A78BFA" strokeWidth="1" opacity="0.3"/>
        </svg>
      ),
      action: () => onNavigate?.("collateral"),
    },
    {
      title: "Pools DeFi",
      sub: "Accedez aux pools de liquidite Minswap et SundaeSwap directement depuis votre portail",
      gradient: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 50%, #A7F3D0 100%)",
      icon: (
        <svg viewBox="0 0 48 48" className="w-12 h-12">
          <rect x="4" y="18" width="12" height="18" rx="3" fill="#059669" opacity="0.15"/>
          <rect x="18" y="12" width="12" height="24" rx="3" fill="#059669" opacity="0.25"/>
          <rect x="32" y="8" width="12" height="28" rx="3" fill="#059669" opacity="0.4"/>
          <path d="M6 30l8-6 8 4 8-8 8 2" stroke="#059669" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="38" cy="22" r="3" fill="#059669"/>
        </svg>
      ),
      action: () => onNavigate?.("collateral"),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 stagger-children">
      {features.map((f) => (
        <button key={f.title} onClick={f.action} className="feature-card text-left">
          <div className="feature-card-illustration" style={{ background: f.gradient }}>
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

  const statusLabel = (s) => s === "pending" ? "En attente" : s === "validated" ? "Approuvé" : "Rejeté";

  const animPortfolio = useCountUp(loaded ? totalInvested : 0, 1400);
  const animPending = useCountUp(loaded ? totalPending : 0, 1200);
  const animParts = useCountUp(loaded ? totalParts : 0, 1000);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon apres-midi";
    return "Bonsoir";
  };

  return (
    <div className="space-y-8">
      {/* ── Welcome + Quick Actions (ElevenLabs style) ── */}
      <div className="stagger-hero">
        <div>
          <h2 className="text-[24px] font-bold text-[#0F0F10] tracking-tight">
            {greeting()}, {profile?.full_name?.split(" ")[0] || "Investisseur"}
          </h2>
          <p className="text-[14px] text-[#787881] mt-1">Voici un apercu de votre portefeuille</p>
        </div>

        {/* Wallet banner */}
        {profile?.wallet_address && (
          <div className="flex items-center gap-3 bg-[rgba(0,0,23,0.025)] border border-[rgba(0,0,29,0.08)] rounded-xl px-4 py-2.5 mt-4 max-w-fit">
            <div className="relative">
              <span className="w-2 h-2 rounded-full bg-[#059669] block" />
              <span className="w-2 h-2 rounded-full bg-[#059669] block absolute inset-0 pulse-ring" />
            </div>
            <span className="text-[12px] text-[#787881]">Wallet Cardano</span>
            <span className="font-mono text-[11px] text-[#0F0F10] bg-white px-2 py-0.5 rounded-lg border border-[rgba(0,0,29,0.08)]">
              {profile.wallet_address.slice(0, 14)}...{profile.wallet_address.slice(-8)}
            </span>
            <span className="text-[10px] text-[#A8A29E]">Preprod</span>
          </div>
        )}
      </div>

      {/* ── Quick action tiles row ── */}
      <QuickActions onNavigate={onNavigate} />

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-4 gap-4 stagger-fast">
        <KPICard label="Portefeuille" value={fmt(animPortfolio)} sub={`${animParts} parts detenues`} />
        <KPICard label="En attente" value={fmt(animPending)} sub={`${pendingOrders.length} souscription${pendingOrders.length > 1 ? "s" : ""}`} />
        <KPICard label="NAV / part" value={fmtFull(NAV_PER_PART)} sub="Derniere valorisation" />
        <KPICard label="Tokens synthetiques" value={`${totalSynthetic} sBF`} sub={totalLocked > 0 ? `${totalLocked} BF verrouilles` : "Aucune position"} />
      </div>

      {/* ── Feature cards (like ElevenLabs "Sélectionné pour vous") ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-[#0F0F10]">Selectionne pour vous</h3>
          <button onClick={() => onNavigate?.("funds")} className="text-[13px] text-[#787881] hover:text-[#0F0F10] transition-colors">
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
            {Object.entries(investmentsByFund).map(([fundId, fundOrders]) => {
              const fund = funds.find((f) => f.id === fundId);
              const validated = fundOrders.filter((o) => o.status === "validated");
              const total = validated.reduce((s, o) => s + o.montant, 0);
              const parts = Math.floor(total / (fund?.nav_per_share || NAV_PER_PART));
              if (validated.length === 0) return null;

              const fundVault = lockedPositions.filter((p) => p.fund_id === fundId);
              const fundSynthetic = fundVault.reduce((s, p) => s + (p.synthetic_token_count || 0), 0);

              return (
                <div key={fundId}
                  className="bg-[rgba(0,0,23,0.025)] border border-[rgba(0,0,29,0.06)] rounded-2xl p-4 cursor-pointer hover:bg-[rgba(0,0,23,0.04)] hover:border-[rgba(0,0,29,0.12)] transition-all duration-150"
                  onClick={() => fund?.slug && onViewFund?.(fund.slug)}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[13px] font-semibold text-[#0F0F10]">{fund?.fund_name || "Fonds"}</h4>
                    {fund?.cardano_policy_id && (
                      <span className="text-[10px] font-mono text-[#A8A29E] bg-white px-1.5 py-0.5 rounded-lg border border-[rgba(0,0,29,0.06)]">
                        {shortenHash(fund.cardano_policy_id, 4)}
                      </span>
                    )}
                  </div>

                  <div className="w-full h-1 bg-[rgba(0,0,29,0.06)] rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-[#0F0F10] rounded-full animate-progress"
                      style={{ width: `${Math.min(100, (total / (fund?.fundSize || 10000000)) * 100)}%` }} />
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
              <div className="w-7 h-7 rounded-lg bg-[#F5F3FF] flex items-center justify-center">
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
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium">Asset</th>
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium text-right">BF verrouilles</th>
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium text-right">sBF detenus</th>
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium">Statut</th>
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium">Transaction</th>
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="stagger-rows">
              {vaultPositions.map((pos) => (
                <tr key={pos.id} className="border-b border-[rgba(0,0,29,0.04)] hover:bg-[rgba(0,0,23,0.015)] transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-[#0F0F10] text-[12px]">{pos.security_asset_name}</p>
                    <p className="text-[10px] font-mono text-[#A8A29E]">{shortenHash(pos.security_policy_id, 6)}</p>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-[12px] text-[#0F0F10] tabular-nums">{pos.security_token_count}</td>
                  <td className="px-5 py-3 text-right font-mono text-[12px] text-[#8B5CF6] tabular-nums font-semibold">{pos.synthetic_token_count}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                      pos.status === "locked"
                        ? "bg-[#F5F3FF] text-[#8B5CF6] border border-[rgba(139,92,246,0.1)]"
                        : "bg-[rgba(0,0,23,0.03)] text-[#787881] border border-[rgba(0,0,29,0.06)]"
                    }`}>
                      {pos.status === "locked" ? "Verrouille" : "Deverrouille"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <a href={getExplorerUrl(pos.lock_tx_hash, "preprod")} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-[#8B5CF6] hover:text-[#0F0F10] transition-colors">
                      {shortenHash(pos.lock_tx_hash, 6)}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  </td>
                  <td className="px-5 py-3 text-[#A8A29E] text-[12px]">{pos.locked_at ? new Date(pos.locked_at).toLocaleDateString("fr-FR") : "—"}</td>
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
            <div className="w-7 h-7 rounded-lg bg-[rgba(0,0,23,0.04)] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[#787881]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-[14px] font-semibold text-[#0F0F10]">Historique des souscriptions</h3>
          </div>
          <span className="text-[12px] text-[#A8A29E]">{myOrders.length} souscription{myOrders.length > 1 ? "s" : ""}</span>
        </div>

        {myOrders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-[rgba(0,0,23,0.03)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#D6D3D1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <p className="text-[14px] font-medium text-[#787881]">Aucune souscription pour le moment</p>
            <p className="text-[12px] text-[#A8A29E] mt-1.5">Explorez le catalogue pour investir dans un fonds</p>
            <button onClick={() => onNavigate?.("funds")}
              className="mt-4 px-5 py-2 bg-[#0F0F10] text-white text-[13px] font-medium rounded-[9.6px] hover:bg-[#292524] transition-colors">
              Explorer les fonds
            </button>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[rgba(0,0,29,0.06)] bg-[rgba(0,0,23,0.02)]">
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium">Ref</th>
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium">Fonds</th>
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium">Classe</th>
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium text-right">Montant</th>
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium">Paiement</th>
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium">Statut</th>
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="stagger-rows">
              {myOrders.sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((o) => (
                <tr key={o.id} className="border-b border-[rgba(0,0,29,0.04)] hover:bg-[rgba(0,0,23,0.015)] transition-colors">
                  <td className="px-5 py-3 font-mono text-[12px] text-[#0F0F10] tabular-nums">{o.id?.slice(0, 8)}...</td>
                  <td className="px-5 py-3 text-[#0F0F10] font-medium text-[12px]">{getFundName(o.fundId)}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium bg-[#EEF2FF] text-[#6366F1] border border-[rgba(99,102,241,0.1)]">
                      Classe {o.shareClass || 1}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-[#0F0F10] tabular-nums text-[12px]">{fmt(o.montant)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[12px] font-medium ${o.paymentMethod === "crypto" ? "text-[#8B5CF6]" : "text-[#787881]"}`}>
                      {o.paymentMethod === "crypto" ? "Crypto (ADA)" : "Virement"}
                    </span>
                  </td>
                  <td className="px-5 py-3"><Badge status={statusLabel(o.status)} /></td>
                  <td className="px-5 py-3 text-[#A8A29E] text-[12px]">{o.date}</td>
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
              <div className="w-7 h-7 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
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
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium">Type</th>
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium">Asset</th>
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium text-right">Tokens</th>
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium">Transaction</th>
                <th className="px-5 py-3 text-[12px] text-[#A8A29E] font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="stagger-rows">
              {tokenTransfers.map((t) => {
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
                  <tr key={t.id} className="border-b border-[rgba(0,0,29,0.04)] hover:bg-[rgba(0,0,23,0.015)] transition-colors">
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium ${typeColors[t.transfer_type] || "bg-[rgba(0,0,23,0.03)] text-[#A8A29E]"}`}>
                        {typeLabels[t.transfer_type] || t.transfer_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[12px] font-medium text-[#0F0F10]">{t.asset_name || "—"}</td>
                    <td className="px-5 py-3 text-right font-mono text-[12px] text-[#0F0F10] tabular-nums">{t.token_count}</td>
                    <td className="px-5 py-3">
                      <a href={getExplorerUrl(t.tx_hash, "preprod")} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-[#8B5CF6] hover:text-[#0F0F10] transition-colors">
                        {shortenHash(t.tx_hash, 6)}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    </td>
                    <td className="px-5 py-3 text-[#A8A29E] text-[12px]">{t.created_at ? new Date(t.created_at).toLocaleDateString("fr-FR") : "—"}</td>
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
