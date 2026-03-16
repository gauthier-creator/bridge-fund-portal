import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import { KPICard, Badge, fmt, fmtFull } from "./shared";
import { NAV_PER_PART } from "../data";
import { shortenHash, getExplorerUrl } from "../services/cardanoService";

export default function InvestorDashboard({ onViewFund }) {
  const { user, profile } = useAuth();
  const { orders } = useAppContext();
  const [funds, setFunds] = useState([]);
  const [vaultPositions, setVaultPositions] = useState([]);
  const [tokenTransfers, setTokenTransfers] = useState([]);

  // Load funds
  useEffect(() => {
    if (!supabase) return;
    supabase.from("funds").select("id, fund_name, slug, nav_per_share, cardano_tx_hash, blockchain_network, cardano_policy_id")
      .eq("status", "active")
      .then(({ data }) => { if (data) setFunds(data); });
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
  const totalLocked = lockedPositions.reduce((s, p) => s + (p.security_token_count || 0), 0);
  const totalSynthetic = lockedPositions.reduce((s, p) => s + (p.synthetic_token_count || 0), 0);

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

  return (
    <div className="animate-fade-in space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-semibold text-[#0D0D12]">Bonjour, {profile?.full_name?.split(" ")[0] || "Investisseur"}</h2>
        <p className="text-sm text-[#9AA4B2] mt-1">Voici un aperçu de vos investissements</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Portefeuille" value={fmt(totalInvested)} sub={`${totalParts} parts`} />
        <KPICard label="En attente" value={fmt(totalPending)} sub={`${pendingOrders.length} souscription${pendingOrders.length > 1 ? "s" : ""}`} />
        <KPICard label="NAV / part" value={fmtFull(NAV_PER_PART)} sub="Dernière valorisation" />
        <KPICard label="Tokens synthétiques" value={`${totalSynthetic} sBF`} sub={totalLocked > 0 ? `${totalLocked} BF verrouillés` : "Aucune position"} />
      </div>

      {/* Portfolio breakdown */}
      {validatedOrders.length > 0 && (
        <div className="bg-white border border-[#E8ECF1] rounded-2xl p-6 hover:border-[#D1D5DB] transition-colors">
          <h3 className="text-sm font-semibold text-[#0D0D12] mb-4">Mon portefeuille</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(investmentsByFund).map(([fundId, fundOrders]) => {
              const fund = funds.find((f) => f.id === fundId);
              const validated = fundOrders.filter((o) => o.status === "validated");
              const total = validated.reduce((s, o) => s + o.montant, 0);
              const parts = Math.floor(total / (fund?.nav_per_share || NAV_PER_PART));
              if (validated.length === 0) return null;

              // Vault positions for this fund
              const fundVault = lockedPositions.filter((p) => p.fund_id === fundId);
              const fundSynthetic = fundVault.reduce((s, p) => s + (p.synthetic_token_count || 0), 0);

              return (
                <div key={fundId} className="bg-[#F7F8FA] border border-[#E8ECF1] rounded-2xl p-4 hover:border-[#D1D5DB] transition-colors cursor-pointer" onClick={() => fund?.slug && onViewFund?.(fund.slug)}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-[#0D0D12]">{fund?.fund_name || "Fonds"}</h4>
                    {fund?.cardano_policy_id && (
                      <span className="text-[10px] font-mono text-[#9AA4B2]">{shortenHash(fund.cardano_policy_id, 4)}</span>
                    )}
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
                      <div className="flex justify-between text-xs pt-1 border-t border-[#E8ECF1]">
                        <span className="text-purple-700">Tokens synthétiques</span>
                        <span className="font-medium text-purple-700 tabular-nums">{fundSynthetic} sBF</span>
                      </div>
                    )}
                  </div>
                  {fund?.cardano_tx_hash && (
                    <a
                      href={getExplorerUrl(fund.cardano_tx_hash, fund.blockchain_network)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 inline-flex items-center gap-1 text-[10px] text-[#9AA4B2] hover:text-[#4F7DF3] transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      Voir sur Cardano
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
        <div className="bg-white border border-[#E8ECF1] rounded-2xl overflow-hidden hover:border-[#D1D5DB] transition-colors">
          <div className="px-6 py-4 border-b border-[#E8ECF1] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              <h3 className="text-sm font-semibold text-[#0D0D12]">Positions Vault (Tokens synthétiques)</h3>
            </div>
            <span className="text-xs text-[#9AA4B2]">{lockedPositions.length} active{lockedPositions.length > 1 ? "s" : ""}</span>
          </div>

          <div className="px-6 py-3 bg-purple-50 border-b border-purple-100">
            <p className="text-xs text-purple-700">
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
            <tbody>
              {vaultPositions.map((pos) => (
                <tr key={pos.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC] transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-[#0D0D12] text-xs">{pos.security_asset_name}</p>
                    <p className="text-[10px] font-mono text-[#9AA4B2]">{shortenHash(pos.security_policy_id, 6)}</p>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-[#0D0D12] tabular-nums">{pos.security_token_count}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-purple-700 tabular-nums">{pos.synthetic_token_count}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                      pos.status === "locked"
                        ? "ring-1 ring-purple-600/10 bg-purple-50 text-purple-700"
                        : "ring-1 ring-slate-600/10 bg-[#F7F8FA] text-[#5F6B7A]"
                    }`}>
                      {pos.status === "locked" ? "Verrouillé" : "Déverrouillé"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <a
                      href={getExplorerUrl(pos.lock_tx_hash, "preprod")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-[#4F7DF3] hover:text-blue-800 transition-colors"
                    >
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

      {/* All orders table */}
      <div className="bg-white border border-[#E8ECF1] rounded-2xl overflow-hidden hover:border-[#D1D5DB] transition-colors">
        <div className="px-6 py-4 border-b border-[#E8ECF1] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0D0D12]">Historique des souscriptions</h3>
          <span className="text-xs text-[#9AA4B2]">{myOrders.length} souscription{myOrders.length > 1 ? "s" : ""}</span>
        </div>

        {myOrders.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-[#F7F8FA] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#9AA4B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <p className="text-sm text-[#9AA4B2]">Aucune souscription pour le moment</p>
            <p className="text-xs text-[#5F6B7A] mt-1">Explorez le catalogue pour investir dans un fonds</p>
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
            <tbody>
              {myOrders.sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((o) => (
                <tr key={o.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC] transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-[#0D0D12] tabular-nums">{o.id?.slice(0, 8)}...</td>
                  <td className="px-5 py-3 text-[#0D0D12] font-medium text-xs">{getFundName(o.fundId)}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-blue-600/10 bg-[#EEF2FF] text-blue-700">
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

      {/* On-chain activity */}
      {tokenTransfers.length > 0 && (
        <div className="bg-white border border-[#E8ECF1] rounded-2xl overflow-hidden hover:border-[#D1D5DB] transition-colors">
          <div className="px-6 py-4 border-b border-[#E8ECF1] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <h3 className="text-sm font-semibold text-[#0D0D12]">Activité on-chain</h3>
            </div>
            <span className="text-xs text-[#9AA4B2]">Cardano Preprod</span>
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
            <tbody>
              {tokenTransfers.map((t) => {
                const isIncoming = t.to_address === profile?.wallet_address;
                const typeLabels = {
                  mint: "Mint",
                  transfer: isIncoming ? "Reçu" : "Envoyé",
                  vault_lock: "Vault Lock",
                  vault_unlock: "Vault Unlock",
                };
                const typeColors = {
                  mint: "ring-1 ring-emerald-600/10 bg-emerald-50 text-emerald-700",
                  transfer: isIncoming ? "ring-1 ring-blue-600/10 bg-[#EEF2FF] text-blue-700" : "ring-1 ring-amber-600/10 bg-amber-50 text-amber-700",
                  vault_lock: "ring-1 ring-purple-600/10 bg-purple-50 text-purple-700",
                  vault_unlock: "ring-1 ring-amber-600/10 bg-amber-50 text-amber-700",
                };
                return (
                  <tr key={t.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC] transition-colors">
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${typeColors[t.transfer_type] || "ring-1 ring-slate-600/10 bg-[#F7F8FA] text-[#9AA4B2]"}`}>
                        {typeLabels[t.transfer_type] || t.transfer_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-medium text-[#0D0D12]">{t.asset_name || "—"}</td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-[#0D0D12] tabular-nums">{t.token_count}</td>
                    <td className="px-5 py-3">
                      <a
                        href={getExplorerUrl(t.tx_hash, "preprod")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-[#4F7DF3] hover:text-blue-800 transition-colors"
                      >
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
