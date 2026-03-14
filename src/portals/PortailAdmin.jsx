import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { LPs, NAV_PER_PART, capitalCalls, custodyClients, priceHistory } from "../data";
import { useAppContext } from "../context/AppContext";
import { KPICard, Badge, fmt, fmtFull } from "../components/shared";

export default function PortailAdmin({ toast }) {
  const { orders, collateralPositions } = useAppContext();
  const [docModal, setDocModal] = useState(null);

  // Merge validated orders into LP list for accurate KPIs
  const validatedOrderLPs = orders.filter((o) => o.status === "validated").map((o) => ({
    shareClass: o.shareClass, montant: o.montant, pays: o.pays, kycStatus: "Validé",
  }));
  const allLPData = [...LPs, ...validatedOrderLPs];
  const activeLPs = allLPData.filter((lp) => lp.kycStatus === "Validé");
  const totalAUM = activeLPs.reduce((s, lp) => s + lp.montant, 0);

  const totalTokensCustody = custodyClients.reduce((s, c) => s + c.tokens, 0);
  const totalNavCustody = custodyClients.reduce((s, c) => s + c.nav, 0);
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const validatedOrders = orders.filter((o) => o.status === "validated");
  const totalCollateral = collateralPositions.reduce((s, p) => s + p.tokens, 0);

  const class1 = activeLPs.filter((lp) => lp.shareClass === 1);
  const class2 = activeLPs.filter((lp) => lp.shareClass === 2);
  const pieData = [
    { name: "Classe 1", value: class1.reduce((s, lp) => s + lp.montant, 0) },
    { name: "Classe 2", value: class2.reduce((s, lp) => s + lp.montant, 0) },
  ];

  const countryData = {};
  allLPData.forEach((lp) => { if (lp.pays) countryData[lp.pays] = (countryData[lp.pays] || 0) + lp.montant; });
  const countryPie = Object.entries(countryData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const countryColors = ["#1a2332", "#c9a84c", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"];

  return (
    <div className="animate-fade-in">
      {/* Overview KPIs */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <KPICard label="AUM Total" value={fmt(totalAUM)} sub="Bridge Fund SCSp" />
        <KPICard label="LP inscrits" value={allLPData.length} sub={`${activeLPs.length} actifs`} />
        <KPICard label="NAV / part" value={fmtFull(NAV_PER_PART)} sub="+4.3% depuis lancement" />
        <KPICard label="Tokens custody" value={totalTokensCustody.toLocaleString("fr-FR")} sub={fmt(totalNavCustody)} />
        <KPICard label="Collatéral total" value={totalCollateral + " BF"} sub={collateralPositions.length + " positions"} />
      </div>

      {/* Orders status */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Ordres en attente</p>
          </div>
          <p className="text-3xl font-semibold text-navy">{pendingOrders.length}</p>
          {pendingOrders.length > 0 && (
            <p className="text-xs text-amber-600 mt-2">
              {fmt(pendingOrders.reduce((s, o) => s + o.montant, 0))} en attente de validation
            </p>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Ordres validés</p>
          </div>
          <p className="text-3xl font-semibold text-navy">{validatedOrders.length}</p>
          <p className="text-xs text-emerald-600 mt-2">
            {fmt(validatedOrders.reduce((s, o) => s + o.montant, 0))} validés
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Total ordres</p>
          </div>
          <p className="text-3xl font-semibold text-navy">{orders.length}</p>
          <p className="text-xs text-gray-400 mt-2">
            {fmt(orders.reduce((s, o) => s + o.montant, 0))} total
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {/* Share class distribution */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-4">Répartition Share Class</p>
          <div className="flex items-center gap-4">
            <PieChart width={120} height={120}>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={50} stroke="none">
                <Cell fill="#1a2332" />
                <Cell fill="#c9a84c" />
              </Pie>
            </PieChart>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-navy" /> Classe 1 — {fmt(pieData[0].value)}</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-gold" /> Classe 2 — {fmt(pieData[1].value)}</div>
            </div>
          </div>
        </div>

        {/* Country distribution */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-4">Répartition géographique</p>
          <div className="flex items-center gap-4">
            <PieChart width={120} height={120}>
              <Pie data={countryPie} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={50} stroke="none">
                {countryPie.map((_, i) => <Cell key={i} fill={countryColors[i % countryColors.length]} />)}
              </Pie>
            </PieChart>
            <div className="space-y-1 text-xs">
              {countryPie.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: countryColors[i % countryColors.length] }} />
                  {c.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Price chart */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-4">Prix BF / ADA (30j)</p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={priceHistory}>
              <defs>
                <linearGradient id="colorPrixAdmin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a2332" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1a2332" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="jour" hide />
              <YAxis domain={["auto", "auto"]} hide />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 11 }} />
              <Area type="monotone" dataKey="prix" stroke="#1a2332" strokeWidth={2} fill="url(#colorPrixAdmin)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>2.12 ADA</span>
            <span className="text-emerald-600 font-medium">2.44 ADA (+5.2%)</span>
          </div>
        </div>
      </div>

      {/* Recent orders table */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-navy">Derniers ordres de souscription</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Ref</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Souscripteur</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Type</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">Montant</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Statut</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Docs</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-gray-50 hover:bg-cream/50 transition-colors">
                <td className="px-5 py-3 font-mono text-xs text-navy">{o.id}</td>
                <td className="px-5 py-3">
                  <p className="font-medium text-navy">{o.lpName}</p>
                  {o.intermediaire && <p className="text-xs text-blue-500">via {o.intermediaire}</p>}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${o.type === "direct" ? "bg-navy/10 text-navy" : "bg-blue-50 text-blue-700"}`}>
                    {o.type === "direct" ? "Direct" : "Intermédié"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-medium">{fmt(o.montant)}</td>
                <td className="px-5 py-3"><Badge status={o.status === "pending" ? "En attente" : o.status === "validated" ? "Approuvé" : "Rejeté"} /></td>
                <td className="px-5 py-3">
                  {o.documents && o.documents.length > 0 ? (
                    <button onClick={() => setDocModal(o)} className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium hover:text-navy transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      {o.documents.length}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-500">{o.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Capital calls + Collateral side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-navy mb-4">Capital Calls</h3>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">Tranche</th>
                <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">Montant</th>
                <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody>
              {capitalCalls.map((cc) => (
                <tr key={cc.id} className="border-b border-gray-50">
                  <td className="py-2 text-navy text-xs">{cc.description}</td>
                  <td className="py-2 text-right font-medium text-xs">{fmt(cc.montant)}</td>
                  <td className="py-2"><Badge status={cc.statut} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-navy mb-4">Positions collatérales</h3>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">Client</th>
                <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">Tokens</th>
                <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">APY</th>
              </tr>
            </thead>
            <tbody>
              {collateralPositions.map((p) => (
                <tr key={p.id} className="border-b border-gray-50">
                  <td className="py-2 text-navy text-xs font-medium">{p.owner}</td>
                  <td className="py-2 text-right font-mono text-xs">{p.tokens}</td>
                  <td className="py-2 text-right text-emerald-600 text-xs font-medium">{p.apy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document viewer modal */}
      {docModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setDocModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full mx-4 animate-fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-navy">Documents justificatifs</h3>
                <p className="text-xs text-gray-400 mt-1">{docModal.lpName} — {docModal.id}</p>
              </div>
              <button onClick={() => setDocModal(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="space-y-2">
              {docModal.documents.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 bg-cream rounded-xl px-4 py-3">
                  <div className="w-8 h-8 bg-navy/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{doc.name}</p>
                    <p className="text-xs text-gray-400">{doc.type} · {doc.size} · {doc.date}</p>
                  </div>
                  {doc.url ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => window.open(doc.url, "_blank")} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-navy/10 text-navy hover:bg-navy/20 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Consulter
                      </button>
                      <a href={doc.url} download={doc.name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gold/10 text-gold hover:bg-gold/20 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        PDF
                      </a>
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Validé</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
