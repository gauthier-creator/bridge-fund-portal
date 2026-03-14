import { useState, useEffect } from "react";
import { PieChart, Pie, Cell } from "recharts";
import { NAV_PER_PART } from "../data";
import { useAppContext } from "../context/AppContext";
import { KPICard, Badge, fmt, fmtFull, inputCls, selectCls, labelCls } from "../components/shared";
import { supabase } from "../lib/supabase";
import { listProfiles, createUser, updateUserProfile } from "../services/profileService";
import { getFundConfig, updateFundConfig, uploadFundAsset } from "../services/fundConfigService";

const ROLE_LABELS = { investor: "Investisseur", intermediary: "Intermédiaire", aifm: "AIFM", admin: "Admin" };

export default function PortailAdmin({ toast }) {
  const { orders, collateralPositions } = useAppContext();
  const [adminTab, setAdminTab] = useState("dashboard");
  const [docModal, setDocModal] = useState(null);

  // Compute KPIs from real orders
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const validatedOrders = orders.filter((o) => o.status === "validated");
  const totalAUM = orders.filter((o) => o.status !== "rejected").reduce((s, o) => s + o.montant, 0);
  const totalCollateral = collateralPositions.reduce((s, p) => s + p.tokens, 0);

  // Share class distribution from orders
  const class1Total = orders.filter((o) => o.shareClass === 1 && o.status !== "rejected").reduce((s, o) => s + o.montant, 0);
  const class2Total = orders.filter((o) => o.shareClass === 2 && o.status !== "rejected").reduce((s, o) => s + o.montant, 0);
  const pieData = [
    { name: "Classe 1", value: class1Total },
    { name: "Classe 2", value: class2Total },
  ];

  // Country distribution from orders
  const countryData = {};
  orders.filter((o) => o.status !== "rejected").forEach((o) => { if (o.pays) countryData[o.pays] = (countryData[o.pays] || 0) + o.montant; });
  const countryPie = Object.entries(countryData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const countryColors = ["#1a2332", "#c9a84c", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"];

  return (
    <div className="animate-fade-in">
      {/* Admin tabs */}
      <div className="flex border-b border-gray-100 mb-8">
        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "users", label: "Gestion des utilisateurs" },
          { id: "fund", label: "Page Fonds" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setAdminTab(tab.id)} className={`px-5 py-3 text-sm font-medium transition-all relative ${adminTab === tab.id ? "text-navy" : "text-gray-400 hover:text-gray-600"}`}>
            {tab.label}
            {adminTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-navy rounded-full" />}
          </button>
        ))}
      </div>

      {adminTab === "users" && <UserManagement toast={toast} />}
      {adminTab === "fund" && <FundEditor toast={toast} />}

      {adminTab === "dashboard" && <>
      {/* Overview KPIs */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <KPICard label="AUM Total" value={fmt(totalAUM)} sub="Bridge Fund SCSp" />
        <KPICard label="Souscriptions" value={orders.length} sub={`${validatedOrders.length} validées`} />
        <KPICard label="NAV / part" value={fmtFull(NAV_PER_PART)} sub="Bridge Fund SCSp" />
        <KPICard label="En attente" value={pendingOrders.length} sub={pendingOrders.length > 0 ? fmt(pendingOrders.reduce((s, o) => s + o.montant, 0)) : "—"} />
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

        {/* Summary */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-4">Résumé du fonds</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">NAV / part</span><span className="font-medium text-navy">{fmtFull(NAV_PER_PART)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total souscriptions</span><span className="font-medium text-navy">{orders.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Montant total</span><span className="font-medium text-navy">{fmt(totalAUM)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Positions collatérales</span><span className="font-medium text-navy">{collateralPositions.length}</span></div>
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
          <h3 className="text-sm font-semibold text-navy mb-4">Registre des souscriptions</h3>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Aucune souscription enregistrée</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">Souscripteur</th>
                  <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">Montant</th>
                  <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-gray-50">
                    <td className="py-2 text-navy text-xs font-medium">{o.lpName}</td>
                    <td className="py-2 text-right font-medium text-xs">{fmt(o.montant)}</td>
                    <td className="py-2"><Badge status={o.status === "pending" ? "En attente" : o.status === "validated" ? "Approuvé" : "Rejeté"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
      </>}

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

/* ─── Fund Editor Component ─── */
function FundEditor({ toast }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [highlightsText, setHighlightsText] = useState("");

  useEffect(() => {
    getFundConfig()
      .then((data) => {
        if (data) {
          setConfig(data);
          setHighlightsText(Array.isArray(data.highlights) ? data.highlights.join("\n") : "");
        } else {
          // Default empty config
          setConfig({
            fund_name: "", fund_subtitle: "", description: "", strategy: "", investment_thesis: "",
            target_return: "", minimum_investment: 0, fund_size: 0, nav_per_share: 0,
            jurisdiction: "", legal_form: "", aifm: "", custodian: "", auditor: "",
            administrator: "", regulatory_status: "", highlights: [],
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const update = (field, value) => setConfig((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...config,
        highlights: highlightsText.split("\n").map((s) => s.trim()).filter(Boolean),
        minimum_investment: Number(config.minimum_investment) || 0,
        fund_size: Number(config.fund_size) || 0,
        nav_per_share: Number(config.nav_per_share) || 0,
      };
      await updateFundConfig(payload);
      toast("Configuration du fonds sauvegardée");
    } catch (err) {
      toast("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400 text-sm">Chargement de la configuration…</div>;
  if (!config) return <div className="text-center py-12 text-gray-400 text-sm">Impossible de charger la configuration</div>;

  const fieldCls = "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20";
  const lblCls = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-navy">Configuration de la page fonds</h3>
          <p className="text-xs text-gray-400 mt-1">Ces informations sont affichées sur la page publique du fonds</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/#/fund" target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-gray-200 text-gray-600 text-xs rounded-xl hover:bg-gray-50 transition-colors">
            Voir la page publique
          </a>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-navy text-white text-xs rounded-xl hover:bg-navy-light transition-colors disabled:opacity-50">
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        </div>
      </div>

      {/* General info */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6 mb-6">
        <h4 className="text-sm font-semibold text-navy mb-4">Informations générales</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lblCls}>Nom du fonds</label>
            <input value={config.fund_name || ""} onChange={(e) => update("fund_name", e.target.value)} className={fieldCls} placeholder="Bridge Fund SCSp" />
          </div>
          <div>
            <label className={lblCls}>Sous-titre</label>
            <input value={config.fund_subtitle || ""} onChange={(e) => update("fund_subtitle", e.target.value)} className={fieldCls} placeholder="Fonds de dette privée tokenisé..." />
          </div>
          <div className="col-span-2">
            <label className={lblCls}>Description</label>
            <textarea value={config.description || ""} onChange={(e) => update("description", e.target.value)} rows={3} className={fieldCls} placeholder="Description du fonds…" />
          </div>
          <div className="col-span-2">
            <label className={lblCls}>Stratégie d'investissement</label>
            <textarea value={config.strategy || ""} onChange={(e) => update("strategy", e.target.value)} rows={3} className={fieldCls} placeholder="Stratégie du fonds…" />
          </div>
          <div className="col-span-2">
            <label className={lblCls}>Thèse d'investissement</label>
            <textarea value={config.investment_thesis || ""} onChange={(e) => update("investment_thesis", e.target.value)} rows={3} className={fieldCls} placeholder="Thèse d'investissement…" />
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6 mb-6">
        <h4 className="text-sm font-semibold text-navy mb-4">Métriques clés</h4>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className={lblCls}>Rendement cible</label>
            <input value={config.target_return || ""} onChange={(e) => update("target_return", e.target.value)} className={fieldCls} placeholder="8-12% net" />
          </div>
          <div>
            <label className={lblCls}>NAV / Part (€)</label>
            <input type="number" step="0.01" value={config.nav_per_share || ""} onChange={(e) => update("nav_per_share", e.target.value)} className={fieldCls} placeholder="1043.27" />
          </div>
          <div>
            <label className={lblCls}>Investissement minimum (€)</label>
            <input type="number" value={config.minimum_investment || ""} onChange={(e) => update("minimum_investment", e.target.value)} className={fieldCls} placeholder="125000" />
          </div>
          <div>
            <label className={lblCls}>Taille du fonds (€)</label>
            <input type="number" value={config.fund_size || ""} onChange={(e) => update("fund_size", e.target.value)} className={fieldCls} placeholder="50000000" />
          </div>
        </div>
      </div>

      {/* Structure */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6 mb-6">
        <h4 className="text-sm font-semibold text-navy mb-4">Structure du fonds</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lblCls}>Juridiction</label>
            <input value={config.jurisdiction || ""} onChange={(e) => update("jurisdiction", e.target.value)} className={fieldCls} placeholder="Luxembourg" />
          </div>
          <div>
            <label className={lblCls}>Forme juridique</label>
            <input value={config.legal_form || ""} onChange={(e) => update("legal_form", e.target.value)} className={fieldCls} placeholder="SCSp" />
          </div>
          <div>
            <label className={lblCls}>AIFM</label>
            <input value={config.aifm || ""} onChange={(e) => update("aifm", e.target.value)} className={fieldCls} placeholder="Bridge Capital Management" />
          </div>
          <div>
            <label className={lblCls}>Dépositaire</label>
            <input value={config.custodian || ""} onChange={(e) => update("custodian", e.target.value)} className={fieldCls} placeholder="Banque de Luxembourg" />
          </div>
          <div>
            <label className={lblCls}>Auditeur</label>
            <input value={config.auditor || ""} onChange={(e) => update("auditor", e.target.value)} className={fieldCls} placeholder="PricewaterhouseCoopers" />
          </div>
          <div>
            <label className={lblCls}>Administrateur</label>
            <input value={config.administrator || ""} onChange={(e) => update("administrator", e.target.value)} className={fieldCls} placeholder="Apex Fund Services" />
          </div>
          <div>
            <label className={lblCls}>Statut réglementaire</label>
            <input value={config.regulatory_status || ""} onChange={(e) => update("regulatory_status", e.target.value)} className={fieldCls} placeholder="CSSF regulated" />
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6 mb-6">
        <h4 className="text-sm font-semibold text-navy mb-2">Points clés</h4>
        <p className="text-xs text-gray-400 mb-3">Un point clé par ligne. Ces éléments apparaissent dans la section "Points clés" de la page publique.</p>
        <textarea
          value={highlightsText}
          onChange={(e) => setHighlightsText(e.target.value)}
          rows={6}
          className={fieldCls}
          placeholder={"Rendement cible 8-12% net annuel\nTokenisé sur blockchain Cardano\nLiquidité améliorée via marché secondaire"}
        />
      </div>

      {/* Save button bottom */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-8 py-2.5 bg-navy text-white text-sm rounded-xl hover:bg-navy-light transition-colors disabled:opacity-50">
          {saving ? "Sauvegarde…" : "Sauvegarder les modifications"}
        </button>
      </div>
    </div>
  );
}

/* ─── User Management Component ─── */
function UserManagement({ toast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [newUser, setNewUser] = useState({ email: "", password: "", fullName: "", role: "investor", company: "", intermediaryId: "" });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await listProfiles();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newUser.email || !newUser.password || !newUser.fullName) {
      toast("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setCreating(true);
    try {
      await createUser(newUser);
      toast(`Compte créé pour ${newUser.fullName} (${ROLE_LABELS[newUser.role]})`);
      setNewUser({ email: "", password: "", fullName: "", role: "investor", company: "", intermediaryId: "" });
      setShowForm(false);
      await loadUsers();
    } catch (err) {
      toast("Erreur : " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRoleUpdate = async (userId) => {
    try {
      await updateUserProfile(userId, { role: editRole });
      toast("Rôle mis à jour");
      setEditingId(null);
      await loadUsers();
    } catch (err) {
      toast("Erreur : " + err.message);
    }
  };

  const intermediaries = users.filter((u) => u.role === "intermediary");

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-navy">Utilisateurs de la plateforme</h3>
          <p className="text-xs text-gray-400 mt-1">{users.length} comptes enregistrés</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-navy text-white text-xs rounded-xl hover:bg-navy-light transition-colors">
          {showForm ? "Annuler" : "+ Créer un compte"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6 mb-6">
          <h4 className="text-sm font-semibold text-navy mb-4">Nouveau compte utilisateur</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nom complet *</label>
              <input value={newUser.fullName} onChange={(e) => setNewUser((p) => ({ ...p, fullName: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" placeholder="Jean Dupont" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
              <input type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" placeholder="user@email.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Mot de passe *</label>
              <input type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" placeholder="Min. 6 caractères" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Rôle *</label>
              <select value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white">
                <option value="investor">Investisseur</option>
                <option value="intermediary">Intermédiaire</option>
                <option value="aifm">AIFM</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Société</label>
              <input value={newUser.company} onChange={(e) => setNewUser((p) => ({ ...p, company: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" placeholder="Optionnel" />
            </div>
            {newUser.role === "investor" && intermediaries.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Intermédiaire rattaché</label>
                <select value={newUser.intermediaryId} onChange={(e) => setNewUser((p) => ({ ...p, intermediaryId: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white">
                  <option value="">Aucun (direct)</option>
                  {intermediaries.map((i) => <option key={i.id} value={i.id}>{i.full_name} — {i.company || i.email}</option>)}
                </select>
              </div>
            )}
          </div>
          <button onClick={handleCreate} disabled={creating} className="px-6 py-2 bg-navy text-white text-sm rounded-xl hover:bg-navy-light transition-colors disabled:opacity-50">
            {creating ? "Création…" : "Créer le compte"}
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Chargement…</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Nom</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Email</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Rôle</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Société</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Rattaché à</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Créé le</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const linked = u.intermediary_id ? users.find((x) => x.id === u.intermediary_id) : null;
                return (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-cream/50">
                    <td className="px-5 py-3 font-medium text-navy">{u.full_name || "—"}</td>
                    <td className="px-5 py-3 text-gray-500">{u.email}</td>
                    <td className="px-5 py-3">
                      {editingId === u.id ? (
                        <div className="flex items-center gap-2">
                          <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="px-2 py-1 rounded-lg border border-gray-200 text-xs bg-white">
                            <option value="investor">Investisseur</option>
                            <option value="intermediary">Intermédiaire</option>
                            <option value="aifm">AIFM</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button onClick={() => handleRoleUpdate(u.id)} className="text-xs text-emerald-600 font-medium">OK</button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">Annuler</button>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                          u.role === "admin" ? "bg-emerald-50 text-emerald-700" :
                          u.role === "aifm" ? "bg-gold/10 text-gold" :
                          u.role === "intermediary" ? "bg-blue-50 text-blue-700" :
                          "bg-navy/10 text-navy"
                        }`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{u.company || "—"}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{linked ? linked.full_name : "—"}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{u.created_at?.split("T")[0]}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => { setEditingId(u.id); setEditRole(u.role); }} className="text-xs text-navy hover:text-gold transition-colors font-medium">
                        Modifier rôle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
