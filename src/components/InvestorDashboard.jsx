import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import { KPICard, Badge, fmt, fmtFull } from "./shared";
import { NAV_PER_PART } from "../data";
import { shortenHash, getExplorerUrl } from "../services/cardanoService";

export default function InvestorDashboard({ onViewFund }) {
  const { user, profile } = useAuth();
  const { orders, collateralPositions } = useAppContext();
  const [funds, setFunds] = useState([]);

  // Load funds to display names
  useEffect(() => {
    if (!supabase) return;
    supabase.from("funds").select("id, fund_name, slug, nav_per_share, cardano_tx_hash, blockchain_network, cardano_policy_id")
      .eq("status", "active")
      .then(({ data }) => { if (data) setFunds(data); });
  }, []);

  // Filter orders for this user
  const myOrders = orders.filter((o) => o.userId === user?.id);
  const validatedOrders = myOrders.filter((o) => o.status === "validated");
  const pendingOrders = myOrders.filter((o) => o.status === "pending");
  const rejectedOrders = myOrders.filter((o) => o.status === "rejected");

  const totalInvested = validatedOrders.reduce((s, o) => s + o.montant, 0);
  const totalPending = pendingOrders.reduce((s, o) => s + o.montant, 0);
  const totalParts = validatedOrders.reduce((s, o) => s + Math.floor(o.montant / NAV_PER_PART), 0);

  // My collateral positions
  const myCollateral = collateralPositions.filter((p) => p.userId === user?.id);
  const totalStaked = myCollateral.reduce((s, p) => s + p.tokens, 0);

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
        <h2 className="text-xl font-semibold text-navy">Bonjour, {profile?.full_name?.split(" ")[0] || "Investisseur"}</h2>
        <p className="text-sm text-gray-400 mt-1">Voici un aperçu de vos investissements</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Portefeuille" value={fmt(totalInvested)} sub={`${totalParts} parts`} />
        <KPICard label="En attente" value={fmt(totalPending)} sub={`${pendingOrders.length} souscription${pendingOrders.length > 1 ? "s" : ""}`} />
        <KPICard label="NAV / part" value={fmtFull(NAV_PER_PART)} sub="Dernière valorisation" />
        <KPICard label="Tokens stakés" value={`${totalStaked} BF`} sub={myCollateral.length > 0 ? `${myCollateral.length} position${myCollateral.length > 1 ? "s" : ""}` : "Aucune position"} />
      </div>

      {/* Portfolio breakdown */}
      {validatedOrders.length > 0 && (
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-navy mb-4">Mon portefeuille</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(investmentsByFund).map(([fundId, fundOrders]) => {
              const fund = funds.find((f) => f.id === fundId);
              const validated = fundOrders.filter((o) => o.status === "validated");
              const total = validated.reduce((s, o) => s + o.montant, 0);
              const parts = Math.floor(total / (fund?.nav_per_share || NAV_PER_PART));
              if (validated.length === 0) return null;

              return (
                <div key={fundId} className="bg-cream rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => fund?.slug && onViewFund?.(fund.slug)}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-navy">{fund?.fund_name || "Fonds"}</h4>
                    {fund?.cardano_policy_id && (
                      <span className="text-[10px] font-mono text-gray-400">{shortenHash(fund.cardano_policy_id, 4)}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Montant investi</span>
                      <span className="font-medium text-navy">{fmt(total)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Parts détenues</span>
                      <span className="font-medium text-navy">{parts}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Souscriptions</span>
                      <span className="font-medium text-navy">{validated.length}</span>
                    </div>
                  </div>
                  {fund?.cardano_tx_hash && (
                    <a
                      href={getExplorerUrl(fund.cardano_tx_hash, fund.blockchain_network)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-navy transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Voir sur Cardano
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All orders table */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy">Historique des souscriptions</h3>
          <span className="text-xs text-gray-400">{myOrders.length} souscription{myOrders.length > 1 ? "s" : ""}</span>
        </div>

        {myOrders.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-cream rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <p className="text-sm text-gray-400">Aucune souscription pour le moment</p>
            <p className="text-xs text-gray-300 mt-1">Explorez le catalogue pour investir dans un fonds</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Ref</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Fonds</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Classe</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">Montant</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Paiement</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Statut</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {myOrders.sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((o) => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-cream/50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-navy">{o.id?.slice(0, 8)}...</td>
                  <td className="px-5 py-3 text-navy font-medium text-xs">{getFundName(o.fundId)}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-navy/10 text-navy">
                      Classe {o.shareClass || 1}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium">{fmt(o.montant)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium ${o.paymentMethod === "crypto" ? "text-gold" : "text-gray-500"}`}>
                      {o.paymentMethod === "crypto" ? "Crypto (ADA)" : "Virement"}
                    </span>
                  </td>
                  <td className="px-5 py-3"><Badge status={statusLabel(o.status)} /></td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{o.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Collateral positions */}
      {myCollateral.length > 0 && (
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-navy mb-4">Positions collatérales</h3>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">Type</th>
                <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">Pool</th>
                <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">Tokens</th>
                <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">APY</th>
                <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {myCollateral.map((p) => (
                <tr key={p.id} className="border-b border-gray-50">
                  <td className="py-2 text-navy text-xs font-medium">{p.type || "Staking"}</td>
                  <td className="py-2 text-xs text-gray-500">{p.pool || "BF/ADA"}</td>
                  <td className="py-2 text-right font-mono text-xs text-navy">{p.tokens} BF</td>
                  <td className="py-2 text-right text-emerald-600 text-xs font-medium">{p.apy}%</td>
                  <td className="py-2 text-gray-400 text-xs">{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
