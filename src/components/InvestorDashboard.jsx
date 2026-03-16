import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import { KPICard, Badge, fmt, fmtFull, useCountUp, useInView, ProgressRing } from "./shared";
import { NAV_PER_PART } from "../data";
import { shortenHash, getExplorerUrl } from "../services/cardanoService";

export default function InvestorDashboard({ onViewFund }) {
  const { user, profile } = useAuth();
  const { orders } = useAppContext();
  const [funds, setFunds] = useState([]);
  const [vaultPositions, setVaultPositions] = useState([]);
  const [tokenTransfers, setTokenTransfers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Load funds
  useEffect(() => {
    if (!supabase) { setLoaded(true); return; }
    supabase.from("funds").select("id, fund_name, slug, nav_per_share, cardano_tx_hash, blockchain_network, cardano_policy_id")
      .eq("status", "active")
      .then(({ data }) => { if (data) setFunds(data); setLoaded(true); });
  }, []);

  // Load vault positions for this user
  useEffect(() => {
    if (!supabase || !user?.id) return;
    supabase.from("vault_positions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setVaultPositions(data); });
  }, [user?.id]);

  // Load token transfers for this user's wallet
  useEffect(() => {
    if (!supabase || !profile?.wallet_address) return;
    supabase.from("token_transfers")
      .select("*")
      .or(`from_address.eq.${profile.wallet_address},to_address.eq.${profile.wallet_address}`)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setTokenTransfers(data); });
  }, [profile?.wallet_address]);

  // Filter orders for this user
  const myOrders = orders.filter((o) => o.userId === user?.id);
  const validatedOrders = myOrders.filter((o) => o.status === "validated");
  const pendingOrders = myOrders.filter((o) => o.status === "pending");

  const totalInvested = validatedOrders.reduce((s, o) => s + o.montant, 0);
  const totalPending = pendingOrders.reduce((s, o) => s + o.montant, 0);
  const totalParts = validatedOrders.reduce((s, o) => s + Math.floor(o.montant / NAV_PER_PART), 0);

  // Vault stats
  const lockedPositions = vaultPositions.filter((p) => p.status === "locked");
  const totalSynthetic = lockedPositions.reduce((s, p) => s + (p.synthetic_token_count || 0), 0);
  const totalLocked = lockedPositions.reduce((s, p) => s + (p.security_token_count || 0), 0);

  // Group investments by fund
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

  // Animated counters
  const animPortfolio = useCountUp(loaded ? totalInvested : 0, 1400);
  const animPending = useCountUp(loaded ? totalPending : 0, 1200);
  const animParts = useCountUp(loaded ? totalParts : 0, 1000);

  // InView refs for scroll-triggered sections
  const [portfolioRef, portfolioVisible] = useInView();
  const [ordersRef, ordersVisible] = useInView();
  const [onchainRef, onchainVisible] = useInView();
  const [vaultRef, vaultVisible] = useInView();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  return (
    <div className="space-y-8">
      {/* Welcome section — cinematic entrance */}
      <div className="stagger-hero">
        <div>
          <h2 className="text-2xl font-bold text-[#0D0D12] tracking-tight">
            {greeting()}, {profile?.full_name?.split(" ")[0] || "Investisseur"}
          </h2>
          <p className="text-sm text-[#9AA4B2] mt-1.5">Voici un aperçu de votre portefeuille d'investissement</p>
        </div>

        {/* Wallet banner */}
        {profile?.wallet_address && (
          <div className="flex items-center gap-3 bg-[#F7F8FA] border border-[#E8ECF1] rounded-xl px-4 py-3 mt-4 max-w-fit">
            <div className="relative">
              <span className="w-2 h-2 rounded-full bg-[#00C48C] block" />
              <span className="w-2 h-2 rounded-full bg-[#00C48C] block absolute inset-0 pulse-ring" />
            </div>
            <span className="text-xs text-[#5F6B7A]">Wallet Cardano</span>
            <span className="font-mono text-[11px] text-[#0D0D12] bg-white px-2 py-0.5 rounded-md border border-[#E8ECF1]">
              {profile.wallet_address.slice(0, 14)}...{profile.wallet_address.slice(-8)}
            </span>
            <span className="text-[10px] text-[#9AA4B2]">Preprod</span>
          </div>
        )}
      </div>

      {/* KPIs with staggered card-lift animation */}
      <div className="grid grid-cols-4 gap-4 stagger-fast">
        <KPICard label="Portefeuille" value={fmt(animPortfolio)} sub={`${animParts} parts détenues`} />
        <KPICard label="En attente" value={fmt(animPending)} sub={`${pendingOrders.length} souscription${pendingOrders.length > 1 ? "s" : ""}`} />
        <KPICard label="NAV / part" value={fmtFull(NAV_PER_PART)} sub="Dernière valorisation" />
        <KPICard label="Tokens synthétiques" value={`${totalSynthetic} sBF`} sub={totalLocked > 0 ? `${totalLocked} BF verrouillés` : "Aucune position"} />
      </div>

      {/* Portfolio breakdown — scroll-triggered */}
      {validatedOrders.length > 0 && (
        <div
          ref={portfolioRef}
          className={`bg-white border border-[#E8ECF1] rounded-2xl p-6 transition-all duration-700 ${portfolioVisible ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-[#0D0D12]">Mon portefeuille</h3>
              <p className="text-xs text-[#9AA4B2] mt-0.5">{Object.keys(investmentsByFund).length} fonds · {validatedOrders.length} souscriptions validées</p>
            </div>
            <div className="flex items-center gap-2">
              <ProgressRing value={totalParts > 0 ? Math.min(100, (totalInvested / 1000000) * 100) : 0} size={40} stroke={3} color="#059669" />
              <div className="text-right">
                <p className="text-xs font-semibold text-[#0D0D12]">{fmt(totalInvested)}</p>
                <p className="text-[10px] text-[#9AA4B2]">total investi</p>
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${portfolioVisible ? "stagger-children" : ""}`}>
            {Object.entries(investmentsByFund).map(([fundId, fundOrders]) => {
              const fund = funds.find((f) => f.id === fundId);
              const validated = fundOrders.filter((o) => o.status === "validated");
              const total = validated.reduce((s, o) => s + o.montant, 0);
              const parts = Math.floor(total / (fund?.nav_per_share || NAV_PER_PART));
              if (validated.length === 0) return null;

              const fundVault = lockedPositions.filter((p) => p.fund_id === fundId);
              const fundSynthetic = fundVault.reduce((s, p) => s + (p.synthetic_token_count || 0), 0);

              return (
                <div
                  key={fundId}
                  className="card-interactive rounded-2xl p-4 cursor-pointer"
                  onClick={() => fund?.slug && onViewFund?.(fund.slug)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-[#0D0D12]">{fund?.fund_name || "Fonds"}</h4>
                    {fund?.cardano_policy_id && (
                      <span className="text-[10px] font-mono text-[#9AA4B2] bg-[#F7F8FA] px-1.5 py-0.5 rounded border border-[#E8ECF1]">
                        {shortenHash(fund.cardano_policy_id, 4)}
                      </span>
                    )}
                  </div>

                  {/* Mini progress bar */}
                  <div className="w-full h-1 bg-[#F0F2F5] rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-[#0D0D12] rounded-full animate-progress"
                      style={{ width: `${Math.min(100, (total / (fund?.fundSize || 10000000)) * 100)}%` }}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#5F6B7A]">Montant investi</span>
                      <span className="font-medium text-[#0D0D12] tabular-nums">{fmt(total)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#5F6B7A]">Parts détenues</span>
                      <span className="font-medium text-[#0D0D12] tabular-nums">{parts}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#5F6B7A]">Souscriptions</span>
                      <span className="font-medium text-[#0D0D12] tabular-nums">{validated.length}</span>
                    </div>
                    {fundSynthetic > 0 && (
                      <div className="flex justify-between text-xs pt-2 mt-1 border-t border-[#E8ECF1]">
                        <span className="text-[#4F7DF3]">Tokens synthétiques</span>
                        <span className="font-medium text-[#4F7DF3] tabular-nums">{fundSynthetic} sBF</span>
                      </div>
                    )}
                  </div>
                  {fund?.cardano_tx_hash && (
                    <a
                      href={getExplorerUrl(fund.cardano_tx_hash, fund.blockchain_network)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-[#9AA4B2] hover:text-[#4F7DF3] transition-colors"
                    >
                      <span className="relative">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#059669] block" />
                      </span>
                      Vérifier on-chain
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vault Positions — with reveal animation */}
      {vaultPositions.length > 0 && (
        <div
          ref={vaultRef}
          className={`bg-white border border-[#E8ECF1] rounded-2xl overflow-hidden transition-all duration-700 ${vaultVisible ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <div className="px-6 py-4 border-b border-[#E8ECF1] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#4F7DF3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0D0D12]">Positions Vault</h3>
                <p className="text-[11px] text-[#9AA4B2]">Tokens synthétiques (sBF)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4F7DF3] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4F7DF3]"></span>
              </span>
              <span className="text-xs text-[#9AA4B2]">{lockedPositions.length} active{lockedPositions.length > 1 ? "s" : ""}</span>
            </div>
          </div>

          <div className="px-6 py-3 bg-[#EEF2FF]/50 border-b border-[#E8ECF1]">
            <p className="text-xs text-[#4F7DF3]">
              Vos tokens de sécurité (BF) sont verrouillés dans le vault on-chain. En échange, vous détenez des tokens synthétiques (sBF) librement transférables.
            </p>
          </div>

          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#E8ECF1] bg-[#F7F8FA]">
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Asset</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">BF verrouillés</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">sBF détenus</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Statut</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Transaction</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Date</th>
              </tr>
            </thead>
            <tbody className={vaultVisible ? "stagger-rows" : ""}>
              {vaultPositions.map((pos) => (
                <tr key={pos.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC] transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-[#0D0D12] text-xs">{pos.security_asset_name}</p>
                    <p className="text-[10px] font-mono text-[#9AA4B2]">{shortenHash(pos.security_policy_id, 6)}</p>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-[#0D0D12] tabular-nums">{pos.security_token_count}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-[#4F7DF3] tabular-nums font-semibold">{pos.synthetic_token_count}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                      pos.status === "locked"
                        ? "ring-1 ring-[#4F7DF3]/10 bg-[#EEF2FF] text-[#4F7DF3]"
                        : "ring-1 ring-[#E8ECF1] bg-[#F7F8FA] text-[#5F6B7A]"
                    }`}>
                      {pos.status === "locked" ? "Verrouillé" : "Déverrouillé"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <a href={getExplorerUrl(pos.lock_tx_hash, "preprod")} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-[#4F7DF3] hover:text-[#0D0D12] transition-colors">
                      {shortenHash(pos.lock_tx_hash, 6)}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  </td>
                  <td className="px-5 py-3 text-[#9AA4B2] text-xs">{pos.locked_at ? new Date(pos.locked_at).toLocaleDateString("fr-FR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Subscription History — scroll-triggered */}
      <div
        ref={ordersRef}
        className={`bg-white border border-[#E8ECF1] rounded-2xl overflow-hidden transition-all duration-700 ${ordersVisible ? "animate-fade-in-up" : "opacity-0"}`}
      >
        <div className="px-6 py-4 border-b border-[#E8ECF1] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#F7F8FA] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[#5F6B7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-[#0D0D12]">Historique des souscriptions</h3>
          </div>
          <span className="text-xs text-[#9AA4B2]">{myOrders.length} souscription{myOrders.length > 1 ? "s" : ""}</span>
        </div>

        {myOrders.length === 0 ? (
          <div className="p-12 text-center animate-fade-in">
            <div className="w-14 h-14 bg-[#F7F8FA] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#C4CAD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <p className="text-sm font-medium text-[#5F6B7A]">Aucune souscription pour le moment</p>
            <p className="text-xs text-[#9AA4B2] mt-1.5">Explorez le catalogue pour investir dans un fonds</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#E8ECF1] bg-[#F7F8FA]">
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Ref</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Fonds</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Classe</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">Montant</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Paiement</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Statut</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Date</th>
              </tr>
            </thead>
            <tbody className={ordersVisible ? "stagger-rows" : ""}>
              {myOrders.sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((o) => (
                <tr key={o.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC] transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-[#0D0D12] tabular-nums">{o.id?.slice(0, 8)}...</td>
                  <td className="px-5 py-3 text-[#0D0D12] font-medium text-xs">{getFundName(o.fundId)}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-[#4F7DF3]/10 bg-[#EEF2FF] text-[#4F7DF3]">
                      Classe {o.shareClass || 1}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-[#0D0D12] tabular-nums">{fmt(o.montant)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium ${o.paymentMethod === "crypto" ? "text-[#4F7DF3]" : "text-[#5F6B7A]"}`}>
                      {o.paymentMethod === "crypto" ? "Crypto (ADA)" : "Virement"}
                    </span>
                  </td>
                  <td className="px-5 py-3"><Badge status={statusLabel(o.status)} /></td>
                  <td className="px-5 py-3 text-[#9AA4B2] text-xs">{o.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* On-chain activity — scroll-triggered */}
      {tokenTransfers.length > 0 && (
        <div
          ref={onchainRef}
          className={`bg-white border border-[#E8ECF1] rounded-2xl overflow-hidden transition-all duration-700 ${onchainVisible ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <div className="px-6 py-4 border-b border-[#E8ECF1] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0D0D12]">Activité on-chain</h3>
                <p className="text-[11px] text-[#9AA4B2]">Cardano Preprod Testnet</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
              </span>
              <span className="text-xs text-[#059669] font-medium">Live</span>
            </div>
          </div>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#E8ECF1] bg-[#F7F8FA]">
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Type</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Asset</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">Tokens</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Transaction</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Date</th>
              </tr>
            </thead>
            <tbody className={onchainVisible ? "stagger-rows" : ""}>
              {tokenTransfers.map((t) => {
                const isIncoming = t.to_address === profile?.wallet_address;
                const typeLabels = {
                  mint: "Mint",
                  transfer: isIncoming ? "Reçu" : "Envoyé",
                  vault_lock: "Vault Lock",
                  vault_unlock: "Vault Unlock",
                };
                const typeColors = {
                  mint: "ring-1 ring-[#059669]/10 bg-[#ECFDF5] text-[#059669]",
                  transfer: isIncoming ? "ring-1 ring-[#4F7DF3]/10 bg-[#EEF2FF] text-[#4F7DF3]" : "ring-1 ring-amber-600/10 bg-amber-50 text-amber-700",
                  vault_lock: "ring-1 ring-[#4F7DF3]/10 bg-[#EEF2FF] text-[#4F7DF3]",
                  vault_unlock: "ring-1 ring-amber-600/10 bg-amber-50 text-amber-700",
                };
                return (
                  <tr key={t.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC] transition-colors">
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${typeColors[t.transfer_type] || "ring-1 ring-[#E8ECF1] bg-[#F7F8FA] text-[#9AA4B2]"}`}>
                        {typeLabels[t.transfer_type] || t.transfer_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-medium text-[#0D0D12]">{t.asset_name || "—"}</td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-[#0D0D12] tabular-nums">{t.token_count}</td>
                    <td className="px-5 py-3">
                      <a href={getExplorerUrl(t.tx_hash, "preprod")} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-[#4F7DF3] hover:text-[#0D0D12] transition-colors">
                        {shortenHash(t.tx_hash, 6)}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    </td>
                    <td className="px-5 py-3 text-[#9AA4B2] text-xs">{t.created_at ? new Date(t.created_at).toLocaleDateString("fr-FR") : "—"}</td>
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
