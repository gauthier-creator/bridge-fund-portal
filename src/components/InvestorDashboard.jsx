import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import { KPICard, Badge, fmt, fmtFull, useCountUp, ProgressRing } from "./shared";
import { NAV_PER_PART } from "../data";
import { shortenHash, getExplorerUrl } from "../services/cardanoService";

/* ═══════════════════════════════════════════════════════════════
   Investor Dashboard — Clean, minimal, professional
   ═══════════════════════════════════════════════════════════════ */

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

  const name = profile?.full_name?.split(" ")[0] || "Investisseur";

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="stagger-hero">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[24px] font-semibold text-[#0F0F10] tracking-tight">
              {greeting()}, {name}
            </h2>
            <p className="text-[14px] text-[#787881] mt-0.5">
              Voici un apercu de votre portefeuille
            </p>
          </div>
          {profile?.wallet_address && (
            <div className="flex items-center gap-2 bg-[rgba(0,0,23,0.03)] rounded-lg px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-[#059669]" />
              <span className="font-mono text-[11px] text-[#787881]">
                {profile.wallet_address.slice(0, 12)}...{profile.wallet_address.slice(-6)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 stagger-fast">
        {[
          { label: "Portefeuille", value: fmt(animPortfolio), sub: `${animParts} parts detenues` },
          { label: "En attente", value: fmt(animPending), sub: `${pendingOrders.length} souscription${pendingOrders.length > 1 ? "s" : ""}` },
          { label: "NAV / part", value: fmtFull(NAV_PER_PART), sub: "Derniere valorisation" },
          { label: "Tokens synthetiques", value: `${totalSynthetic} sBF`, sub: totalLocked > 0 ? `${totalLocked} BF verrouilles` : "Aucune position" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-5">
            <p className="text-[12px] text-[#A8A29E] font-medium mb-1">{kpi.label}</p>
            <p className="text-[20px] font-semibold text-[#0F0F10] tabular-nums">{kpi.value}</p>
            <p className="text-[11px] text-[#A8A29E] mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3 stagger-children">
        {[
          { label: "Investir", sub: "Parcourir les fonds", action: () => onNavigate?.("funds") },
          { label: "Tokens & DeFi", sub: "Synthetic tokens et pools", action: () => onNavigate?.("collateral") },
          { label: "Explorer on-chain", sub: "Verifier sur Cardano", action: () => window.open("https://preprod.cardanoscan.io", "_blank") },
        ].map((a) => (
          <button
            key={a.label}
            onClick={a.action}
            className="group text-left rounded-2xl border border-[rgba(0,0,29,0.08)] bg-white p-4 transition-all duration-200 hover:border-[rgba(0,0,29,0.16)] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
          >
            <p className="text-[13px] font-semibold text-[#0F0F10]">{a.label}</p>
            <p className="text-[11px] text-[#787881] mt-0.5">{a.sub}</p>
          </button>
        ))}
      </div>

      {/* Portfolio breakdown */}
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
                  className="bg-[rgba(0,0,23,0.02)] border border-[rgba(0,0,29,0.06)] rounded-2xl p-4 cursor-pointer hover:bg-[rgba(0,0,23,0.04)] hover:border-[rgba(0,0,29,0.12)] transition-all duration-200"
                  onClick={() => fund?.slug && onViewFund?.(fund.slug)}>

                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[13px] font-semibold text-[#0F0F10]">{fund?.fund_name || "Fonds"}</h4>
                    {fund?.cardano_policy_id && (
                      <span className="text-[10px] font-mono text-[#A8A29E]">
                        {shortenHash(fund.cardano_policy_id, 4)}
                      </span>
                    )}
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
                        <span className="text-[#787881]">Tokens synthetiques</span>
                        <span className="font-medium text-[#0F0F10] tabular-nums">{fundSynthetic} sBF</span>
                      </div>
                    )}
                  </div>
                  {fund?.cardano_tx_hash && (
                    <a href={getExplorerUrl(fund.cardano_tx_hash, fund.blockchain_network)}
                      target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-[#A8A29E] hover:text-[#0F0F10] transition-colors">
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

      {/* Vault Positions */}
      {vaultPositions.length > 0 && (
        <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl overflow-hidden page-slide-in">
          <div className="px-6 py-4 border-b border-[rgba(0,0,29,0.06)] flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-[#0F0F10]">Positions Vault</h3>
              <p className="text-[11px] text-[#A8A29E]">Tokens synthetiques (sBF)</p>
            </div>
            <span className="text-[12px] text-[#A8A29E]">{lockedPositions.length} active{lockedPositions.length > 1 ? "s" : ""}</span>
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
              {vaultPositions.map((pos, i) => (
                <tr key={pos.id} className="border-b border-[rgba(0,0,29,0.04)] hover:bg-[rgba(0,0,23,0.02)] transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-[#0F0F10] text-[12px]">{pos.security_asset_name}</p>
                    <p className="text-[10px] font-mono text-[#A8A29E]">{shortenHash(pos.security_policy_id, 6)}</p>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-[12px] text-[#0F0F10] tabular-nums">{pos.security_token_count}</td>
                  <td className="px-5 py-3 text-right font-mono text-[12px] text-[#0F0F10] tabular-nums font-medium">{pos.synthetic_token_count}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                      pos.status === "locked"
                        ? "bg-[rgba(0,0,23,0.04)] text-[#0F0F10]"
                        : "bg-[rgba(0,0,23,0.03)] text-[#787881]"
                    }`}>
                      {pos.status === "locked" ? "Verrouille" : "Deverrouille"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <a href={getExplorerUrl(pos.lock_tx_hash, "preprod")} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-[#787881] hover:text-[#0F0F10] transition-colors">
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

      {/* Subscription History */}
      <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl overflow-hidden page-slide-in">
        <div className="px-6 py-4 border-b border-[rgba(0,0,29,0.06)] flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-[#0F0F10]">Historique des souscriptions</h3>
          <span className="text-[12px] text-[#A8A29E]">{myOrders.length} souscription{myOrders.length > 1 ? "s" : ""}</span>
        </div>

        {myOrders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[14px] font-medium text-[#0F0F10]">Aucune souscription pour le moment</p>
            <p className="text-[13px] text-[#787881] mt-1 max-w-xs mx-auto">
              Explorez le catalogue pour decouvrir les fonds disponibles
            </p>
            <button
              onClick={() => onNavigate?.("funds")}
              className="mt-4 text-[13px] font-medium text-[#0F0F10] hover:text-[#787881] transition-colors"
            >
              Explorer les fonds →
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
                <tr key={o.id} className="border-b border-[rgba(0,0,29,0.04)] hover:bg-[rgba(0,0,23,0.02)] transition-colors">
                  <td className="px-5 py-3 font-mono text-[12px] text-[#0F0F10] tabular-nums">{o.id?.slice(0, 8)}...</td>
                  <td className="px-5 py-3 text-[#0F0F10] font-medium text-[12px]">{getFundName(o.fundId)}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[rgba(0,0,23,0.04)] text-[#0F0F10]">
                      Classe {o.shareClass || 1}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-[#0F0F10] tabular-nums text-[12px]">{fmt(o.montant)}</td>
                  <td className="px-5 py-3 text-[12px] text-[#787881]">
                    {o.paymentMethod === "crypto" ? "Crypto (ADA)" : "Virement"}
                  </td>
                  <td className="px-5 py-3"><Badge status={statusLabel(o.status)} /></td>
                  <td className="px-5 py-3 text-[#A8A29E] text-[12px]">{o.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* On-chain activity */}
      {tokenTransfers.length > 0 && (
        <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl overflow-hidden page-slide-in">
          <div className="px-6 py-4 border-b border-[rgba(0,0,29,0.06)] flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-[#0F0F10]">Activite on-chain</h3>
              <p className="text-[11px] text-[#A8A29E]">Cardano Preprod Testnet</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#059669]" />
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
                return (
                  <tr key={t.id} className="border-b border-[rgba(0,0,29,0.04)] hover:bg-[rgba(0,0,23,0.02)] transition-colors">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[rgba(0,0,23,0.04)] text-[#0F0F10]">
                        {typeLabels[t.transfer_type] || t.transfer_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[12px] font-medium text-[#0F0F10]">{t.asset_name || "—"}</td>
                    <td className="px-5 py-3 text-right font-mono text-[12px] text-[#0F0F10] tabular-nums">{t.token_count}</td>
                    <td className="px-5 py-3">
                      <a href={getExplorerUrl(t.tx_hash, "preprod")} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-[#787881] hover:text-[#0F0F10] transition-colors">
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
