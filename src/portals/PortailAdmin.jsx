import { useState, useEffect } from "react";
import { PieChart, Pie, Cell } from "recharts";
import { NAV_PER_PART } from "../data";
import { useAppContext } from "../context/AppContext";
import { KPICard, Badge, fmt, fmtFull, inputCls, selectCls, labelCls } from "../components/shared";
import { supabase } from "../lib/supabase";
import { listProfiles, createUser, updateUserProfile } from "../services/profileService";
import FundEditorComponent from "../components/FundEditor";

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
  const countryColors = ["#4F7DF3", "#7C3AED", "#059669", "#D97706", "#EC4899", "#DC2626"];

  return (
    <div className="animate-fade-in">
      {/* Admin tabs */}
      <div className="flex border-b border-[#E8ECF1] mb-8">
        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "users", label: "Gestion des utilisateurs" },
          { id: "fund", label: "Gestion des fonds" },
          { id: "compliance", label: "Compliance CIP-113" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setAdminTab(tab.id)} className={`px-5 py-3 text-sm font-medium transition-all relative ${adminTab === tab.id ? "text-[#0D0D12]" : "text-[#9AA4B2] hover:text-[#5F6B7A]"}`}>
            {tab.label}
            {adminTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D0D12] rounded-full" />}
          </button>
        ))}
      </div>

      {adminTab === "users" && <UserManagement toast={toast} />}
      {adminTab === "fund" && <FundEditorComponent toast={toast} />}
      {adminTab === "compliance" && <ComplianceManager toast={toast} />}

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
        <div className="bg-white rounded-2xl border border-[#E8ECF1] p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <p className="text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Ordres en attente</p>
          </div>
          <p className="text-3xl font-semibold text-[#0D0D12]">{pendingOrders.length}</p>
          {pendingOrders.length > 0 && (
            <p className="text-xs text-amber-600 mt-2">
              {fmt(pendingOrders.reduce((s, o) => s + o.montant, 0))} en attente de validation
            </p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-[#E8ECF1] p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#00C48C]" />
            <p className="text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Ordres validés</p>
          </div>
          <p className="text-3xl font-semibold text-[#0D0D12]">{validatedOrders.length}</p>
          <p className="text-xs text-[#059669] mt-2">
            {fmt(validatedOrders.reduce((s, o) => s + o.montant, 0))} validés
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8ECF1] p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#4F7DF3]" />
            <p className="text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Total ordres</p>
          </div>
          <p className="text-3xl font-semibold text-[#0D0D12]">{orders.length}</p>
          <p className="text-xs text-[#9AA4B2] mt-2">
            {fmt(orders.reduce((s, o) => s + o.montant, 0))} total
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {/* Share class distribution */}
        <div className="bg-white rounded-2xl border border-[#E8ECF1] p-5">
          <p className="text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] mb-4">Répartition Share Class</p>
          <div className="flex items-center gap-4">
            <PieChart width={120} height={120}>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={50} stroke="none">
                <Cell fill="#0D0D12" />
                <Cell fill="#D1D5DB" />
              </Pie>
            </PieChart>
            <div className="space-y-2 text-xs text-[#0D0D12]">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#0D0D12]" /> Classe 1 — {fmt(pieData[0].value)}</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#D1D5DB]" /> Classe 2 — {fmt(pieData[1].value)}</div>
            </div>
          </div>
        </div>

        {/* Country distribution */}
        <div className="bg-white rounded-2xl border border-[#E8ECF1] p-5">
          <p className="text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] mb-4">Répartition géographique</p>
          <div className="flex items-center gap-4">
            <PieChart width={120} height={120}>
              <Pie data={countryPie} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={50} stroke="none">
                {countryPie.map((_, i) => <Cell key={i} fill={countryColors[i % countryColors.length]} />)}
              </Pie>
            </PieChart>
            <div className="space-y-1 text-xs text-[#0D0D12]">
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
        <div className="bg-white rounded-2xl border border-[#E8ECF1] p-5">
          <p className="text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] mb-4">Résumé du fonds</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-[#5F6B7A]">NAV / part</span><span className="font-medium text-[#0D0D12]">{fmtFull(NAV_PER_PART)}</span></div>
            <div className="flex justify-between"><span className="text-[#5F6B7A]">Total souscriptions</span><span className="font-medium text-[#0D0D12]">{orders.length}</span></div>
            <div className="flex justify-between"><span className="text-[#5F6B7A]">Montant total</span><span className="font-medium text-[#0D0D12]">{fmt(totalAUM)}</span></div>
            <div className="flex justify-between"><span className="text-[#5F6B7A]">Positions collatérales</span><span className="font-medium text-[#0D0D12]">{collateralPositions.length}</span></div>
          </div>
        </div>
      </div>

      {/* Recent orders table */}
      <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-[#F0F2F5]">
          <h3 className="text-sm font-semibold text-[#0D0D12]">Derniers ordres de souscription</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[#F0F2F5] bg-[#F7F8FA]">
              <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Ref</th>
              <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Souscripteur</th>
              <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Type</th>
              <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] text-right">Montant</th>
              <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Statut</th>
              <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Docs</th>
              <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC] transition-colors">
                <td className="px-5 py-3 font-mono text-xs text-[#0D0D12]">{o.id}</td>
                <td className="px-5 py-3">
                  <p className="font-medium text-[#0D0D12]">{o.lpName}</p>
                  {o.intermediaire && <p className="text-xs text-[#4F7DF3]">via {o.intermediaire}</p>}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ${o.type === "direct" ? "ring-slate-600/10 bg-slate-50 text-slate-700" : "ring-[#4F7DF3]/10 bg-[#EEF2FF] text-[#4F7DF3]"}`}>
                    {o.type === "direct" ? "Direct" : "Intermédié"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-medium text-[#0D0D12]">{fmt(o.montant)}</td>
                <td className="px-5 py-3"><Badge status={o.status === "pending" ? "En attente" : o.status === "validated" ? "Approuvé" : "Rejeté"} /></td>
                <td className="px-5 py-3">
                  {o.documents && o.documents.length > 0 ? (
                    <button onClick={() => setDocModal(o)} className="inline-flex items-center gap-1 text-xs text-[#059669] font-medium hover:text-[#4F7DF3] transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      {o.documents.length}
                    </button>
                  ) : (
                    <span className="text-xs text-[#9AA4B2]">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-[#5F6B7A]">{o.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Capital calls + Collateral side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#E8ECF1] p-6">
          <h3 className="text-sm font-semibold text-[#0D0D12] mb-4">Registre des souscriptions</h3>
          {orders.length === 0 ? (
            <p className="text-sm text-[#9AA4B2] py-4 text-center">Aucune souscription enregistrée</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[#F0F2F5]">
                  <th className="pb-2 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Souscripteur</th>
                  <th className="pb-2 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] text-right">Montant</th>
                  <th className="pb-2 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Statut</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-[#F0F2F5]">
                    <td className="py-2 text-[#0D0D12] text-xs font-medium">{o.lpName}</td>
                    <td className="py-2 text-right font-medium text-xs text-[#0D0D12]">{fmt(o.montant)}</td>
                    <td className="py-2"><Badge status={o.status === "pending" ? "En attente" : o.status === "validated" ? "Approuvé" : "Rejeté"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#E8ECF1] p-6">
          <h3 className="text-sm font-semibold text-[#0D0D12] mb-4">Positions collatérales</h3>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#F0F2F5]">
                <th className="pb-2 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Client</th>
                <th className="pb-2 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] text-right">Tokens</th>
                <th className="pb-2 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] text-right">APY</th>
              </tr>
            </thead>
            <tbody>
              {collateralPositions.map((p) => (
                <tr key={p.id} className="border-b border-[#F0F2F5]">
                  <td className="py-2 text-[#0D0D12] text-xs font-medium">{p.owner}</td>
                  <td className="py-2 text-right font-mono text-xs text-[#0D0D12]">{p.tokens}</td>
                  <td className="py-2 text-right text-[#059669] text-xs font-medium">{p.apy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>}

      {/* Document viewer modal */}
      {docModal && (
        <div className="fixed inset-0 bg-[#0D0D12]/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDocModal(null)}>
          <div className="bg-white rounded-2xl border border-[#E8ECF1] p-8 max-w-lg w-full mx-4 animate-fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-[#0D0D12]">Documents justificatifs</h3>
                <p className="text-xs text-[#9AA4B2] mt-1">{docModal.lpName} — {docModal.id}</p>
              </div>
              <button onClick={() => setDocModal(null)} className="text-[#9AA4B2] hover:text-[#5F6B7A] text-lg">&#x2715;</button>
            </div>
            <div className="space-y-2">
              {docModal.documents.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 bg-[#F7F8FA] rounded-xl px-4 py-3">
                  <div className="w-8 h-8 bg-[#EEF2FF] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[#4F7DF3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0D0D12] truncate">{doc.name}</p>
                    <p className="text-xs text-[#9AA4B2]">{doc.type} · {doc.size} · {doc.date}</p>
                  </div>
                  {doc.url ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => window.open(doc.url, "_blank")} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-[#0D0D12] text-white hover:bg-[#1A1A2E] transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Consulter
                      </button>
                      <a href={doc.url} download={doc.name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-white text-[#4F7DF3] hover:bg-[#F7F8FA] transition-colors border border-[#E8ECF1]">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        PDF
                      </a>
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-[#059669]/10 bg-[#ECFDF5] text-[#059669]">Validé</span>
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
          <h3 className="text-sm font-semibold text-[#0D0D12]">Utilisateurs de la plateforme</h3>
          <p className="text-xs text-[#9AA4B2] mt-1">{users.length} comptes enregistrés</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#0D0D12] hover:bg-[#1A1A2E] text-white text-xs rounded-xl transition-colors">
          {showForm ? "Annuler" : "+ Créer un compte"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E8ECF1] p-6 mb-6">
          <h4 className="text-sm font-semibold text-[#0D0D12] mb-4">Nouveau compte utilisateur</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] mb-1">Nom complet *</label>
              <input value={newUser.fullName} onChange={(e) => setNewUser((p) => ({ ...p, fullName: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8ECF1] text-[#0D0D12] placeholder-[#9AA4B2] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7DF3]/10 focus:border-[#4F7DF3]" placeholder="Jean Dupont" />
            </div>
            <div>
              <label className="block text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] mb-1">Email *</label>
              <input type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8ECF1] text-[#0D0D12] placeholder-[#9AA4B2] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7DF3]/10 focus:border-[#4F7DF3]" placeholder="user@email.com" />
            </div>
            <div>
              <label className="block text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] mb-1">Mot de passe *</label>
              <input type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8ECF1] text-[#0D0D12] placeholder-[#9AA4B2] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7DF3]/10 focus:border-[#4F7DF3]" placeholder="Min. 6 caractères" />
            </div>
            <div>
              <label className="block text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] mb-1">Rôle *</label>
              <select value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8ECF1] text-[#0D0D12] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7DF3]/10 focus:border-[#4F7DF3]">
                <option value="investor">Investisseur</option>
                <option value="intermediary">Intermédiaire</option>
                <option value="aifm">AIFM</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] mb-1">Société</label>
              <input value={newUser.company} onChange={(e) => setNewUser((p) => ({ ...p, company: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8ECF1] text-[#0D0D12] placeholder-[#9AA4B2] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7DF3]/10 focus:border-[#4F7DF3]" placeholder="Optionnel" />
            </div>
            {newUser.role === "investor" && intermediaries.length > 0 && (
              <div>
                <label className="block text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] mb-1">Intermédiaire rattaché</label>
                <select value={newUser.intermediaryId} onChange={(e) => setNewUser((p) => ({ ...p, intermediaryId: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8ECF1] text-[#0D0D12] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7DF3]/10 focus:border-[#4F7DF3]">
                  <option value="">Aucun (direct)</option>
                  {intermediaries.map((i) => <option key={i.id} value={i.id}>{i.full_name} — {i.company || i.email}</option>)}
                </select>
              </div>
            )}
          </div>
          <button onClick={handleCreate} disabled={creating} className="px-6 py-2 bg-[#0D0D12] hover:bg-[#1A1A2E] text-white text-sm rounded-xl transition-colors disabled:opacity-50">
            {creating ? "Création…" : "Créer le compte"}
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#9AA4B2] text-sm">Chargement…</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#F0F2F5] bg-[#F7F8FA]">
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Nom</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Email</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Rôle</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Wallet Cardano</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Société</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Rattaché à</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Créé le</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const linked = u.intermediary_id ? users.find((x) => x.id === u.intermediary_id) : null;
                return (
                  <tr key={u.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC]">
                    <td className="px-5 py-3 font-medium text-[#0D0D12]">{u.full_name || "—"}</td>
                    <td className="px-5 py-3 text-[#5F6B7A]">{u.email}</td>
                    <td className="px-5 py-3">
                      {editingId === u.id ? (
                        <div className="flex items-center gap-2">
                          <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="px-2 py-1 rounded-xl bg-white border border-[#E8ECF1] text-[#0D0D12] text-xs">
                            <option value="investor">Investisseur</option>
                            <option value="intermediary">Intermédiaire</option>
                            <option value="aifm">AIFM</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button onClick={() => handleRoleUpdate(u.id)} className="text-xs text-[#059669] font-medium">OK</button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-[#9AA4B2]">Annuler</button>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ${
                          u.role === "admin" ? "ring-[#059669]/10 bg-[#ECFDF5] text-[#059669]" :
                          u.role === "aifm" ? "ring-[#4F7DF3]/10 bg-[#EEF2FF] text-[#4F7DF3]" :
                          u.role === "intermediary" ? "ring-violet-600/10 bg-violet-50 text-violet-700" :
                          "ring-slate-600/10 bg-slate-50 text-slate-700"
                        }`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {u.wallet_address ? (
                        <span className="font-mono text-[10px] text-[#0D0D12] bg-[#F7F8FA] px-1.5 py-0.5 rounded border border-[#E8ECF1]" title={u.wallet_address}>
                          {u.wallet_address.slice(0, 12)}...{u.wallet_address.slice(-6)}
                        </span>
                      ) : (
                        <span className="text-xs text-[#9AA4B2]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#5F6B7A] text-xs">{u.company || "—"}</td>
                    <td className="px-5 py-3 text-[#5F6B7A] text-xs">{linked ? linked.full_name : "—"}</td>
                    <td className="px-5 py-3 text-[#9AA4B2] text-xs">{u.created_at?.split("T")[0]}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => { setEditingId(u.id); setEditRole(u.role); }} className="text-xs text-[#4F7DF3] hover:text-[#0D0D12] transition-colors font-medium">
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

/* ═══════════════════════════════════════════════════════════════
   COMPLIANCE CIP-113 MANAGER
   ═══════════════════════════════════════════════════════════════ */
function ComplianceManager({ toast }) {
  const [subTab, setSubTab] = useState("whitelist");
  const [funds, setFunds] = useState([]);
  const [selectedFund, setSelectedFund] = useState(null);
  const [whitelist, setWhitelist] = useState([]);
  const [freezes, setFreezes] = useState([]);
  const [supply, setSupply] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [newAddress, setNewAddress] = useState("");
  const [freezeAddress, setFreezeAddress] = useState("");
  const [freezeReason, setFreezeReason] = useState("");
  const [supplyCap, setSupplyCap] = useState("");

  // Load funds
  useEffect(() => {
    if (!supabase) return;
    supabase.from("funds").select("id, fund_name, slug, cardano_policy_id").then(({ data }) => {
      if (data?.length) { setFunds(data); setSelectedFund(data[0]); }
    });
  }, []);

  // Load compliance data when fund changes
  useEffect(() => {
    if (!supabase || !selectedFund) return;
    setLoading(true);
    const fid = selectedFund.id;
    Promise.all([
      supabase.from("token_whitelist").select("*").eq("fund_id", fid).is("revoked_at", null).order("approved_at", { ascending: false }),
      supabase.from("token_freezes").select("*").eq("fund_id", fid).is("unfrozen_at", null).order("frozen_at", { ascending: false }),
      supabase.from("token_supply").select("*").eq("fund_id", fid).maybeSingle(),
      supabase.from("token_transfers").select("*").eq("fund_id", fid).order("created_at", { ascending: false }).limit(50),
    ]).then(([wl, fr, sp, tr]) => {
      setWhitelist(wl.data || []);
      setFreezes(fr.data || []);
      setSupply(sp.data);
      setTransfers(tr.data || []);
      setLoading(false);
    });
  }, [selectedFund]);

  const handleAddWhitelist = async () => {
    if (!newAddress.startsWith("addr") || !selectedFund) return;
    const { error } = await supabase.from("token_whitelist").upsert({
      fund_id: selectedFund.id,
      wallet_address: newAddress,
      kyc_status: "validated",
    }, { onConflict: "fund_id,wallet_address" });
    if (error) { toast("Erreur : " + error.message); return; }
    toast("Adresse ajoutée à la whitelist");
    setNewAddress("");
    // Refresh
    const { data } = await supabase.from("token_whitelist").select("*").eq("fund_id", selectedFund.id).is("revoked_at", null).order("approved_at", { ascending: false });
    setWhitelist(data || []);
  };

  const handleRevoke = async (id) => {
    await supabase.from("token_whitelist").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    toast("Adresse révoquée");
    setWhitelist((prev) => prev.filter((w) => w.id !== id));
  };

  const handleFreeze = async () => {
    if (!freezeAddress.startsWith("addr") || !freezeReason || !selectedFund) return;
    const { error } = await supabase.from("token_freezes").upsert({
      fund_id: selectedFund.id,
      wallet_address: freezeAddress,
      reason: freezeReason,
    }, { onConflict: "fund_id,wallet_address" });
    if (error) { toast("Erreur : " + error.message); return; }
    toast("Adresse gelée");
    setFreezeAddress(""); setFreezeReason("");
    const { data } = await supabase.from("token_freezes").select("*").eq("fund_id", selectedFund.id).is("unfrozen_at", null);
    setFreezes(data || []);
  };

  const handleUnfreeze = async (id) => {
    await supabase.from("token_freezes").update({ unfrozen_at: new Date().toISOString() }).eq("id", id);
    toast("Adresse dégelée");
    setFreezes((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSetCap = async () => {
    if (!selectedFund || !supplyCap) return;
    const cap = parseInt(supplyCap, 10);
    if (isNaN(cap) || cap <= 0) return;
    await supabase.from("token_supply").upsert({
      fund_id: selectedFund.id,
      supply_cap: cap,
      total_minted: supply?.total_minted || 0,
    }, { onConflict: "fund_id" });
    toast(`Supply cap fixé à ${cap.toLocaleString("fr-FR")} tokens`);
    setSupply((prev) => ({ ...prev, supply_cap: cap }));
    setSupplyCap("");
  };

  const short = (addr) => addr ? `${addr.slice(0, 12)}...${addr.slice(-8)}` : "—";
  const subTabs = [
    { id: "whitelist", label: "Whitelist", count: whitelist.length },
    { id: "freeze", label: "Freeze", count: freezes.length },
    { id: "supply", label: "Supply Cap" },
    { id: "audit", label: "Audit Trail", count: transfers.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#0D0D12]">Compliance CIP-113</h2>
        <p className="text-sm text-[#9AA4B2] mt-1">Gestion des tokens programmables — whitelist, freeze, supply cap, audit trail</p>
      </div>

      {/* Fund selector */}
      <div className="flex items-center gap-4">
        <label className="text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Fond :</label>
        <select
          value={selectedFund?.id || ""}
          onChange={(e) => setSelectedFund(funds.find((f) => f.id === e.target.value))}
          className={selectCls + " max-w-xs"}
        >
          {funds.map((f) => (
            <option key={f.id} value={f.id}>{f.fund_name} ({f.slug})</option>
          ))}
        </select>
        {selectedFund?.cardano_policy_id && (
          <span className="text-xs font-mono text-[#9AA4B2]">Policy: {selectedFund.cardano_policy_id.slice(0, 16)}...</span>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-[#F0F2F5] rounded-xl p-1">
        {subTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-4 py-2 text-xs font-medium rounded-xl transition-all ${subTab === t.id ? "bg-white text-[#0D0D12] border border-[#E8ECF1]" : "text-[#5F6B7A] hover:text-[#0D0D12]"}`}
          >
            {t.label} {t.count != null && <span className="ml-1 text-[10px] ring-1 ring-[#4F7DF3]/10 bg-[#EEF2FF] text-[#4F7DF3] px-1.5 py-0.5 rounded-md">{t.count}</span>}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-[#9AA4B2] text-center py-8">Chargement...</p>}

      {/* WHITELIST TAB */}
      {!loading && subTab === "whitelist" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="addr_test1q..." className={inputCls + " flex-1 font-mono text-xs"} />
            <button onClick={handleAddWhitelist} disabled={!newAddress.startsWith("addr")} className="px-4 py-2 bg-[#0D0D12] hover:bg-[#1A1A2E] text-white text-xs rounded-xl transition-colors disabled:opacity-50">
              Ajouter
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[#F0F2F5] bg-[#F7F8FA]">
                  <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Adresse</th>
                  <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">KYC</th>
                  <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Date</th>
                  <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {whitelist.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-[#9AA4B2] text-xs">Aucune adresse whitelistée</td></tr>
                )}
                {whitelist.map((w) => (
                  <tr key={w.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC]">
                    <td className="px-5 py-3 font-mono text-xs text-[#0D0D12]" title={w.wallet_address}>{short(w.wallet_address)}</td>
                    <td className="px-5 py-3"><Badge status={["validated", "verified"].includes(w.kyc_status) ? "Validé" : "En attente"} /></td>
                    <td className="px-5 py-3 text-[#9AA4B2] text-xs">{w.approved_at?.split("T")[0]}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => handleRevoke(w.id)} className="text-xs text-red-500 hover:text-red-600 font-medium">Révoquer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FREEZE TAB */}
      {!loading && subTab === "freeze" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input value={freezeAddress} onChange={(e) => setFreezeAddress(e.target.value)} placeholder="addr_test1q..." className={inputCls + " flex-1 font-mono text-xs"} />
            <input value={freezeReason} onChange={(e) => setFreezeReason(e.target.value)} placeholder="Raison (sanctions, fraude...)" className={inputCls + " w-64"} />
            <button onClick={handleFreeze} disabled={!freezeAddress.startsWith("addr") || !freezeReason} className="px-4 py-2 bg-red-500 text-white text-xs rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50">
              Geler
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[#F0F2F5] bg-[#F7F8FA]">
                  <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Adresse</th>
                  <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Raison</th>
                  <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Date</th>
                  <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {freezes.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-[#9AA4B2] text-xs">Aucune adresse gelée</td></tr>
                )}
                {freezes.map((f) => (
                  <tr key={f.id} className="border-b border-[#F0F2F5] hover:bg-red-50">
                    <td className="px-5 py-3 font-mono text-xs text-[#0D0D12]" title={f.wallet_address}>{short(f.wallet_address)}</td>
                    <td className="px-5 py-3 text-xs text-red-500">{f.reason}</td>
                    <td className="px-5 py-3 text-[#9AA4B2] text-xs">{f.frozen_at?.split("T")[0]}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => handleUnfreeze(f.id)} className="text-xs text-[#059669] hover:text-[#00C48C] font-medium">Dégeler</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUPPLY CAP TAB */}
      {!loading && subTab === "supply" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <KPICard label="Tokens mintés" value={(supply?.total_minted || 0).toLocaleString("fr-FR")} sub="Total émis" />
            <KPICard label="Supply Cap" value={supply?.supply_cap ? supply.supply_cap.toLocaleString("fr-FR") : "Illimité"} sub={supply?.supply_cap ? `${Math.round(((supply?.total_minted || 0) / supply.supply_cap) * 100)}% utilisé` : "Aucun plafond défini"} />
            <KPICard label="Disponible" value={supply?.supply_cap ? (supply.supply_cap - (supply?.total_minted || 0)).toLocaleString("fr-FR") : "∞"} sub="Tokens restants" />
          </div>
          {supply?.last_mint_tx && (
            <div className="bg-[#F7F8FA] rounded-xl p-4 text-sm border border-[#E8ECF1]">
              <p className="text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] mb-1">Dernier mint</p>
              <p className="font-mono text-xs text-[#0D0D12]">{supply.last_mint_tx}</p>
              <p className="text-xs text-[#9AA4B2] mt-1">{supply.last_mint_at?.split("T")[0]}</p>
            </div>
          )}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className={labelCls}>Définir le supply cap (nombre total de tokens)</label>
              <input type="number" value={supplyCap} onChange={(e) => setSupplyCap(e.target.value)} placeholder="Ex: 10000" className={inputCls} />
            </div>
            <button onClick={handleSetCap} disabled={!supplyCap} className="px-4 py-2.5 bg-[#0D0D12] hover:bg-[#1A1A2E] text-white text-xs rounded-xl transition-colors disabled:opacity-50">
              Appliquer
            </button>
          </div>
        </div>
      )}

      {/* AUDIT TRAIL TAB */}
      {!loading && subTab === "audit" && (
        <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F0F2F5]">
            <h3 className="text-sm font-semibold text-[#0D0D12]">Journal des opérations on-chain</h3>
          </div>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#F0F2F5] bg-[#F7F8FA]">
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Type</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Destinataire</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] text-right">Tokens</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Tx Hash</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Ordre</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em]">Date</th>
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-[#9AA4B2] text-xs">Aucune opération enregistrée</td></tr>
              )}
              {transfers.map((t) => (
                <tr key={t.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC]">
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ${t.transfer_type === "mint" ? "ring-[#059669]/10 bg-[#ECFDF5] text-[#059669]" : t.transfer_type === "burn" ? "ring-red-600/10 bg-red-50 text-red-700" : "ring-[#4F7DF3]/10 bg-[#EEF2FF] text-[#4F7DF3]"}`}>
                      {t.transfer_type === "mint" ? "Mint" : t.transfer_type === "burn" ? "Burn" : "Transfert"}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-[#0D0D12]" title={t.to_address}>{short(t.to_address)}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-[#0D0D12]">{t.token_count}</td>
                  <td className="px-5 py-3">
                    {t.tx_hash ? (
                      <a href={`https://preprod.cardanoscan.io/transaction/${t.tx_hash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-[#4F7DF3] hover:underline">
                        {t.tx_hash.slice(0, 12)}...
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3 text-xs text-[#5F6B7A]">{t.order_id || "—"}</td>
                  <td className="px-5 py-3 text-xs text-[#9AA4B2]">{t.created_at?.split("T")[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
