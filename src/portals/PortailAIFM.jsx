import { useState } from "react";
import {
  PieChart, Pie, Cell,
} from "recharts";
import { NAV_PER_PART } from "../data";
import { useAppContext } from "../context/AppContext";
import { KPICard, Badge, fmt, fmtFull } from "../components/shared";

/* ─── Sub-tab: Ordres à valider ─── */
function ValidationOrdres({ toast }) {
  const { orders, validateOrder, rejectOrder } = useAppContext();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const validatedOrders = orders.filter((o) => o.status === "validated");
  const rejectedOrders = orders.filter((o) => o.status === "rejected");

  const handleValidate = async (orderId) => {
    try {
      await validateOrder(orderId);
      toast("Ordre " + orderId + " validé — émission des tokens initiée");
      setSelectedOrder(null);
    } catch (err) {
      toast("Erreur validation : " + (err.message || "échec de la mise à jour"));
    }
  };

  const handleReject = async () => {
    if (!selectedOrder) return;
    try {
      await rejectOrder(selectedOrder.id, rejectReason);
      toast("Ordre " + selectedOrder.id + " rejeté — " + rejectReason);
      setShowRejectModal(false);
      setSelectedOrder(null);
      setRejectReason("");
    } catch (err) {
      toast("Erreur rejet : " + (err.message || "échec de la mise à jour"));
    }
  };

  const statusBadge = (status) => {
    const map = { pending: "En attente", validated: "Approuvé", rejected: "Rejeté" };
    return <Badge status={map[status] || status} />;
  };

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-3 gap-4 mb-8">
        <KPICard label="Ordres en attente" value={pendingOrders.length} sub={pendingOrders.length > 0 ? "Action requise" : "Aucun"} />
        <KPICard label="Ordres validés" value={validatedOrders.length} />
        <KPICard label="Ordres rejetés" value={rejectedOrders.length} />
      </div>

      {/* Pending orders */}
      {pendingOrders.length > 0 && (
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 pulse-dot" />
            <h3 className="text-sm font-semibold text-navy">Ordres en attente de validation</h3>
          </div>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Ref</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Souscripteur</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Type</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">Montant</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Class</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Date</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingOrders.map((o) => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-cream/50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-navy">{o.id}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-navy">{o.lpName}</p>
                    {o.societe && <p className="text-xs text-gray-400">{o.societe}</p>}
                    {o.intermediaire && <p className="text-xs text-blue-500">via {o.intermediaire}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${o.type === "direct" ? "bg-navy/10 text-navy" : "bg-blue-50 text-blue-700"}`}>
                      {o.type === "direct" ? "Direct" : "Intermédié"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium">{fmt(o.montant)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${o.shareClass === 1 ? "bg-navy text-white" : "bg-gold/20 text-gold"}`}>{o.shareClass}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{o.date}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedOrder(o)} className="text-xs font-medium text-navy hover:text-gold transition-colors">Détails</button>
                      <button onClick={() => handleValidate(o.id)} className="text-xs font-medium text-emerald-600 hover:text-emerald-800 transition-colors">Valider</button>
                      <button onClick={() => { setSelectedOrder(o); setShowRejectModal(true); }} className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors">Rejeter</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order detail modal */}
      {selectedOrder && !showRejectModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full mx-4 animate-fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-navy">Détail de l'ordre</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Référence</span><span className="font-mono text-navy">{selectedOrder.id}</span></div>
              <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Souscripteur</span><span className="text-navy font-medium">{selectedOrder.lpName}</span></div>
              {selectedOrder.societe && <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Société</span><span className="text-navy">{selectedOrder.societe}</span></div>}
              <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Type</span><span className="text-navy">{selectedOrder.type === "direct" ? "Souscription directe" : "Souscription intermédiée"}</span></div>
              {selectedOrder.intermediaire && <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Intermédiaire</span><span className="text-navy">{selectedOrder.intermediaire}</span></div>}
              <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Montant</span><span className="text-navy font-medium">{fmt(selectedOrder.montant)}</span></div>
              <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Share Class</span><span className="text-navy">Classe {selectedOrder.shareClass}</span></div>
              <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Parts estimées</span><span className="text-navy">{(selectedOrder.montant / NAV_PER_PART).toFixed(2)}</span></div>
              <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Type investisseur</span><span className="text-navy">{selectedOrder.typeInvestisseur}</span></div>
              <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Pays</span><span className="text-navy">{selectedOrder.pays}</span></div>
              <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">KYC</span><Badge status={selectedOrder.kycStatus} /></div>
              <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Paiement</span><Badge status={selectedOrder.paymentStatus} /></div>
              {selectedOrder.origineFonds && <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Origine des fonds</span><span className="text-navy text-xs">{selectedOrder.origineFonds}</span></div>}
              {selectedOrder.adresse && <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Adresse</span><span className="text-navy text-xs">{selectedOrder.adresse}</span></div>}
              {selectedOrder.pepStatus && <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">PEP</span><span className="text-navy">{selectedOrder.pepStatus === "non" ? "Non" : "Oui"}</span></div>}
              <div className="flex justify-between py-2"><span className="text-gray-500">Signature</span><span className="text-xs text-gray-500">{selectedOrder.signatureDate}</span></div>
            </div>

            {/* Documents */}
            {selectedOrder.documents && selectedOrder.documents.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">Pièces justificatives ({selectedOrder.documents.length})</p>
                <div className="space-y-2">
                  {selectedOrder.documents.map((doc, i) => (
                    <div key={i} className="flex items-center gap-3 bg-cream rounded-xl px-4 py-2.5">
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
            )}

            {(!selectedOrder.documents || selectedOrder.documents.length === 0) && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Pièces justificatives</p>
                <p className="text-xs text-amber-600">Aucun document joint à cet ordre</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => handleValidate(selectedOrder.id)} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">Valider l'ordre</button>
              <button onClick={() => setShowRejectModal(true)} className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors border border-red-200">Rejeter</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => { setShowRejectModal(false); setSelectedOrder(null); }}>
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-navy mb-4">Rejeter l'ordre {selectedOrder.id}</h3>
            <p className="text-xs text-gray-500 mb-4">Précisez le motif du rejet. Le souscripteur sera notifié.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motif du rejet..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 resize-none h-24"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowRejectModal(false); setSelectedOrder(null); }} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">Annuler</button>
              <button onClick={handleReject} disabled={!rejectReason} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${rejectReason ? "bg-red-600 text-white hover:bg-red-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>Confirmer le rejet</button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {(validatedOrders.length > 0 || rejectedOrders.length > 0) && (
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-navy">Historique des ordres traités</h3>
          </div>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Ref</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Souscripteur</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">Montant</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Statut</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Date traitement</th>
              </tr>
            </thead>
            <tbody>
              {[...validatedOrders, ...rejectedOrders].map((o) => (
                <tr key={o.id} className="border-b border-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-navy">{o.id}</td>
                  <td className="px-5 py-3 font-medium text-navy">{o.lpName}</td>
                  <td className="px-5 py-3 text-right font-medium">{fmt(o.montant)}</td>
                  <td className="px-5 py-3">{statusBadge(o.status)}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{o.validatedAt || o.rejectedAt ? new Date(o.validatedAt || o.rejectedAt).toLocaleString("fr-FR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-tab: Registre du fonds ─── */
function RegistreFonds({ toast }) {
  const { orders } = useAppContext();
  const [filterClass, setFilterClass] = useState("all");
  const [filterKyc, setFilterKyc] = useState("all");

  // Build LP list from real orders
  const allOrders = orders.filter((o) => o.status !== "rejected");
  const totalAUMAll = allOrders.filter((o) => o.status === "validated").reduce((s, o) => s + o.montant, 0);
  const mergedLPs = allOrders.map((o) => {
    const parts = o.status === "validated" ? +(o.montant / NAV_PER_PART).toFixed(2) : 0;
    return {
      id: o.id,
      nom: o.nom || o.lpName.split(" ").slice(-1)[0],
      prenom: o.prenom || o.lpName.split(" ").slice(0, -1).join(" "),
      societe: o.societe,
      pays: o.pays,
      type: o.personType === "morale" ? "Personne morale" : "Personne physique",
      shareClass: o.shareClass,
      montant: o.montant,
      dateSouscription: o.date,
      kycStatus: o.kycStatus || "Validé",
      paiementStatus: o.status === "validated" ? "Reçu" : "En attente",
      parts,
      pctFonds: totalAUMAll > 0 ? +((o.montant / totalAUMAll) * 100).toFixed(2) : 0,
      intermediaire: o.intermediaire || null,
    };
  });
  const pendingOrders = orders.filter((o) => o.status === "pending");

  const activeLPs = mergedLPs.filter((lp) => lp.paiementStatus === "Reçu");
  const class1 = activeLPs.filter((lp) => lp.shareClass === 1);
  const class2 = activeLPs.filter((lp) => lp.shareClass === 2);
  const class1Total = class1.reduce((s, lp) => s + lp.montant, 0);
  const class2Total = class2.reduce((s, lp) => s + lp.montant, 0);
  const totalAUM = activeLPs.reduce((s, lp) => s + lp.montant, 0);
  const capitalAppele = totalAUM;
  const capitalEngage = totalAUM + pendingOrders.reduce((s, o) => s + o.montant, 0);

  const pieData = [
    { name: "Classe 1", value: class1Total },
    { name: "Classe 2", value: class2Total },
  ];

  const filtered = mergedLPs.filter((lp) => {
    if (filterClass !== "all" && lp.shareClass !== Number(filterClass)) return false;
    if (filterKyc !== "all" && lp.kycStatus !== filterKyc) return false;
    return true;
  });

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-end gap-2 mb-4 text-xs text-gray-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
        Temps réel · dernière mise à jour : 14 mars 2026, 14:32:08
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Total AUM" value={fmt(totalAUM)} />
        <KPICard label="Nombre de LP" value={mergedLPs.length} />
        <KPICard label="Capital appelé" value={fmt(capitalAppele)} sub={capitalEngage > 0 ? `${((capitalAppele / capitalEngage) * 100).toFixed(1)}% du capital engagé` : "—"} />
        <KPICard label="NAV / part" value={fmtFull(NAV_PER_PART)} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-4">Répartition Share Class</p>
          <div className="flex items-center gap-6">
            <PieChart width={140} height={140}>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={60} stroke="none">
                <Cell fill="#1a2332" />
                <Cell fill="#c9a84c" />
              </Pie>
            </PieChart>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-navy" /> Classe 1 — {fmt(class1Total)}</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gold" /> Classe 2 — {fmt(class2Total)}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-4">Capital appelé vs engagé</p>
          <div className="mt-6">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Appelé : {fmt(capitalAppele)}</span>
              <span>Engagé : {fmt(capitalEngage)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-linear-to-r from-navy to-gold h-3 rounded-full transition-all duration-700" style={{ width: `${capitalEngage > 0 ? (capitalAppele / capitalEngage) * 100 : 0}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{capitalEngage > 0 ? ((capitalAppele / capitalEngage) * 100).toFixed(1) : 0}% appelé</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-navy transition-all">
          <option value="all">Toutes classes</option>
          <option value="1">Classe 1</option>
          <option value="2">Classe 2</option>
        </select>
        <select value={filterKyc} onChange={(e) => setFilterKyc(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-navy transition-all">
          <option value="all">Tous statuts KYC</option>
          <option value="Validé">Validé</option>
          <option value="En attente">En attente</option>
        </select>
        <div className="flex-1" />
        <button onClick={() => toast("Export CSV généré — registre_lp_20260314.csv")} className="bg-white text-navy border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-cream transition-colors">Export CSV</button>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">LP</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Class</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">Montant</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Date</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">KYC</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Paiement</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">Parts</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">% Fonds</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lp) => (
                <tr key={lp.id} className="border-b border-gray-50 hover:bg-cream/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy">{lp.nom} {lp.prenom}</p>
                    {lp.societe && <p className="text-xs text-gray-400">{lp.societe}</p>}
                    {lp.intermediaire && <p className="text-xs text-blue-500">via {lp.intermediaire}</p>}
                  </td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${lp.shareClass === 1 ? "bg-navy text-white" : "bg-gold/20 text-gold"}`}>{lp.shareClass}</span></td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(lp.montant)}</td>
                  <td className="px-4 py-3 text-gray-500">{lp.dateSouscription}</td>
                  <td className="px-4 py-3"><Badge status={lp.kycStatus} /></td>
                  <td className="px-4 py-3"><Badge status={lp.paiementStatus} /></td>
                  <td className="px-4 py-3 text-right font-mono">{lp.parts > 0 ? lp.parts.toFixed(2) : "—"}</td>
                  <td className="px-4 py-3 text-right">{lp.pctFonds > 0 ? lp.pctFonds.toFixed(2) + "%" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {mergedLPs.length === 0 && (
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-8 text-center">
          <p className="text-sm text-gray-400">Aucune souscription enregistrée — les données apparaîtront ici après validation des ordres</p>
        </div>
      )}
    </div>
  );
}

/* ─── Main AIFM Portal ─── */
export default function PortailAIFM({ toast }) {
  const [subTab, setSubTab] = useState("validation");

  return (
    <div>
      <div className="flex border-b border-gray-100 mb-8">
        {[
          { id: "validation", label: "Validation des ordres" },
          { id: "registre", label: "Registre du fonds" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setSubTab(tab.id)} className={`px-5 py-3 text-sm font-medium transition-all relative ${subTab === tab.id ? "text-navy" : "text-gray-400 hover:text-gray-600"}`}>
            {tab.label}
            {subTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-navy rounded-full" />}
          </button>
        ))}
      </div>

      {subTab === "validation" && <ValidationOrdres toast={toast} />}
      {subTab === "registre" && <RegistreFonds toast={toast} />}
    </div>
  );
}
