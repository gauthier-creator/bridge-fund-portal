import { useState, useEffect } from "react";
import {
  PieChart, Pie, Cell,
} from "recharts";
import { NAV_PER_PART } from "../data";
import { useAppContext } from "../context/AppContext";
import { KPICard, Badge, fmt, fmtFull, useInView } from "../components/shared";
import { getExplorerUrl, shortenHash } from "../services/cardanoService";
import { listAllFunds } from "../services/fundService";

/* ─── Sub-tab: Ordres à valider ─── */
function ValidationOrdres({ toast, selectedFundId }) {
  const { orders, validateOrder, rejectOrder } = useAppContext();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const fundOrders = selectedFundId ? orders.filter((o) => o.fundId === selectedFundId) : orders;
  const pendingOrders = fundOrders.filter((o) => o.status === "pending");
  const validatedOrders = fundOrders.filter((o) => o.status === "validated");
  const rejectedOrders = fundOrders.filter((o) => o.status === "rejected");

  const [lastMintResult, setLastMintResult] = useState(null);

  const handleValidate = async (orderId) => {
    try {
      const result = await validateOrder(orderId);
      if (result.mintResult?.txHash) {
        setLastMintResult(result.mintResult);
        toast(`Ordre validé — ${result.mintResult.tokenCount} token(s) CIP-113 envoyé(s) on-chain`);
      } else {
        toast("Ordre " + orderId + " validé — émission des tokens initiée");
      }
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

  const [kpiRef, kpiInView] = useInView();

  return (
    <div className="animate-fade-in">
      <div ref={kpiRef} className={`grid grid-cols-3 gap-4 mb-8 stagger-fast ${kpiInView ? "" : "opacity-0"}`}>
        <KPICard label="Ordres en attente" value={pendingOrders.length} sub={pendingOrders.length > 0 ? "Action requise" : "Aucun"} delay={0} />
        <KPICard label="Ordres validés" value={validatedOrders.length} delay={60} />
        <KPICard label="Ordres rejetés" value={rejectedOrders.length} delay={120} />
      </div>

      {/* Last mint result banner */}
      {lastMintResult && (
        <div className="bg-[#ECFDF5] border border-[#059669]/20 rounded-2xl p-4 mb-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#059669]/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#059669]">Token CIP-113 émis avec succès</p>
                <p className="text-xs text-[#059669]/70 mt-0.5">
                  {lastMintResult.tokenCount} token(s) — Policy: {shortenHash(lastMintResult.policyId, 8)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={lastMintResult.explorerUrl || getExplorerUrl(lastMintResult.txHash, "preprod")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#059669] text-white rounded-xl text-xs font-medium hover:bg-[#047857] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                Voir sur Cardanoscan
              </a>
              <button onClick={() => setLastMintResult(null)} className="text-[#059669]/50 hover:text-[#059669] transition-colors p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-[#059669]/70">
            <span className="font-mono bg-[#059669]/10 px-2 py-0.5 rounded">Tx: {shortenHash(lastMintResult.txHash, 10)}</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C]" />
              Whitelist OK
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C]" />
              Freeze OK
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C]" />
              Supply cap OK
            </span>
          </div>
        </div>
      )}

      {/* Pending orders */}
      {pendingOrders.length > 0 && (
        <div className="bg-white border border-[#E8ECF1] rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-[#F0F2F5] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 pulse-dot" />
            <h3 className="text-sm font-semibold text-[#0D0D12]">Ordres en attente de validation</h3>
          </div>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#F7F8FA] border-b border-[#F0F2F5]">
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Ref</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Souscripteur</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Type</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">Montant</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Class</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Date</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="stagger-rows">
              {pendingOrders.map((o) => (
                <tr key={o.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC] transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-[#0D0D12]">{o.id}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-[#0D0D12]">{o.lpName}</p>
                    {o.societe && <p className="text-xs text-[#9AA4B2]">{o.societe}</p>}
                    {o.intermediaire && <p className="text-xs text-[#4F7DF3]">via {o.intermediaire}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${o.type === "direct" ? "bg-[#EEF2FF] text-[#4F7DF3]" : "bg-[#EEF2FF] text-[#4F7DF3]"}`}>
                      {o.type === "direct" ? "Direct" : "Intermédié"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-[#0D0D12]">{fmt(o.montant)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${o.shareClass === 1 ? "bg-[#0D0D12] text-white" : "bg-[#EEF2FF] text-[#4F7DF3]"}`}>{o.shareClass}</span>
                  </td>
                  <td className="px-5 py-3 text-[#5F6B7A]">{o.date}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedOrder(o)} className="text-xs font-medium text-[#0D0D12] hover:text-[#4F7DF3] transition-colors">Détails</button>
                      <button onClick={() => handleValidate(o.id)} className="text-xs font-medium text-[#059669] hover:text-[#047857] transition-colors">Valider</button>
                      <button onClick={() => { setSelectedOrder(o); setShowRejectModal(true); }} className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors">Rejeter</button>
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
        <div className="fixed inset-0 bg-[#0D0D12]/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl border border-[#E8ECF1] p-8 max-w-lg w-full mx-4 animate-fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[#0D0D12]">Détail de l'ordre</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-[#9AA4B2] hover:text-[#0D0D12] text-lg">✕</button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-[#F0F2F5]"><span className="text-[#5F6B7A]">Référence</span><span className="font-mono text-[#0D0D12]">{selectedOrder.id}</span></div>
              <div className="flex justify-between py-2 border-b border-[#F0F2F5]"><span className="text-[#5F6B7A]">Souscripteur</span><span className="text-[#0D0D12] font-medium">{selectedOrder.lpName}</span></div>
              {selectedOrder.societe && <div className="flex justify-between py-2 border-b border-[#F0F2F5]"><span className="text-[#5F6B7A]">Société</span><span className="text-[#0D0D12]">{selectedOrder.societe}</span></div>}
              <div className="flex justify-between py-2 border-b border-[#F0F2F5]"><span className="text-[#5F6B7A]">Type</span><span className="text-[#0D0D12]">{selectedOrder.type === "direct" ? "Souscription directe" : "Souscription intermédiée"}</span></div>
              {selectedOrder.intermediaire && <div className="flex justify-between py-2 border-b border-[#F0F2F5]"><span className="text-[#5F6B7A]">Intermédiaire</span><span className="text-[#0D0D12]">{selectedOrder.intermediaire}</span></div>}
              <div className="flex justify-between py-2 border-b border-[#F0F2F5]"><span className="text-[#5F6B7A]">Montant</span><span className="text-[#0D0D12] font-medium">{fmt(selectedOrder.montant)}</span></div>
              <div className="flex justify-between py-2 border-b border-[#F0F2F5]"><span className="text-[#5F6B7A]">Share Class</span><span className="text-[#0D0D12]">Classe {selectedOrder.shareClass}</span></div>
              <div className="flex justify-between py-2 border-b border-[#F0F2F5]"><span className="text-[#5F6B7A]">Parts estimées</span><span className="text-[#0D0D12]">{(selectedOrder.montant / NAV_PER_PART).toFixed(2)}</span></div>
              <div className="flex justify-between py-2 border-b border-[#F0F2F5]"><span className="text-[#5F6B7A]">Type investisseur</span><span className="text-[#0D0D12]">{selectedOrder.typeInvestisseur}</span></div>
              <div className="flex justify-between py-2 border-b border-[#F0F2F5]"><span className="text-[#5F6B7A]">Pays</span><span className="text-[#0D0D12]">{selectedOrder.pays}</span></div>
              <div className="flex justify-between py-2 border-b border-[#F0F2F5]"><span className="text-[#5F6B7A]">KYC</span><Badge status={selectedOrder.kycStatus} /></div>
              <div className="flex justify-between py-2 border-b border-[#F0F2F5]"><span className="text-[#5F6B7A]">Paiement</span><Badge status={selectedOrder.paymentStatus} /></div>
              {selectedOrder.origineFonds && <div className="flex justify-between py-2 border-b border-[#F0F2F5]"><span className="text-[#5F6B7A]">Origine des fonds</span><span className="text-[#0D0D12] text-xs">{selectedOrder.origineFonds}</span></div>}
              {selectedOrder.adresse && <div className="flex justify-between py-2 border-b border-[#F0F2F5]"><span className="text-[#5F6B7A]">Adresse</span><span className="text-[#0D0D12] text-xs">{selectedOrder.adresse}</span></div>}
              {selectedOrder.pepStatus && <div className="flex justify-between py-2 border-b border-[#F0F2F5]"><span className="text-[#5F6B7A]">PEP</span><span className="text-[#0D0D12]">{selectedOrder.pepStatus === "non" ? "Non" : "Oui"}</span></div>}
              <div className="flex justify-between py-2"><span className="text-[#5F6B7A]">Signature</span><span className="text-xs text-[#5F6B7A]">{selectedOrder.signatureDate}</span></div>
            </div>

            {/* Documents */}
            {selectedOrder.documents && selectedOrder.documents.length > 0 && (
              <div className="mt-5 pt-4 border-t border-[#F0F2F5]">
                <p className="text-[12px] text-[#9AA4B2] font-medium mb-3">Pièces justificatives ({selectedOrder.documents.length})</p>
                <div className="space-y-2">
                  {selectedOrder.documents.map((doc, i) => (
                    <div key={i} className="flex items-center gap-3 bg-[#F7F8FA] rounded-xl px-4 py-2.5">
                      <div className="w-8 h-8 bg-[#EEF2FF] rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-[#4F7DF3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0D0D12] truncate">{doc.name}</p>
                        <p className="text-xs text-[#9AA4B2]">{doc.type} · {doc.size} · {doc.date}</p>
                      </div>
                      {doc.url ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => window.open(doc.url, "_blank")} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-[#EEF2FF] text-[#4F7DF3] hover:bg-[#E0E7FF] transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            Consulter
                          </button>
                          <a href={doc.url} download={doc.name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-[#EEF2FF] text-[#4F7DF3] hover:bg-[#E0E7FF] transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            PDF
                          </a>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#059669] border border-[#059669]/20">Validé</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!selectedOrder.documents || selectedOrder.documents.length === 0) && (
              <div className="mt-5 pt-4 border-t border-[#F0F2F5]">
                <p className="text-[12px] text-[#9AA4B2] font-medium mb-2">Pièces justificatives</p>
                <p className="text-xs text-amber-600">Aucun document joint à cet ordre</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => handleValidate(selectedOrder.id)} className="flex-1 bg-[#0D0D12] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1A1A2E] transition-colors">Valider l'ordre</button>
              <button onClick={() => setShowRejectModal(true)} className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors border border-red-200">Rejeter</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && selectedOrder && (
        <div className="fixed inset-0 bg-[#0D0D12]/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowRejectModal(false); setSelectedOrder(null); }}>
          <div className="bg-white rounded-2xl border border-[#E8ECF1] p-8 max-w-md w-full mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#0D0D12] mb-4">Rejeter l'ordre {selectedOrder.id}</h3>
            <p className="text-xs text-[#5F6B7A] mb-4">Précisez le motif du rejet. Le souscripteur sera notifié.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motif du rejet..."
              className="w-full border border-[#E8ECF1] rounded-xl px-4 py-3 text-sm bg-white text-[#0D0D12] placeholder-[#9AA4B2] focus:outline-none focus:border-[#4F7DF3] focus:ring-1 focus:ring-[#4F7DF3]/20 resize-none h-24"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowRejectModal(false); setSelectedOrder(null); }} className="flex-1 bg-[#F7F8FA] text-[#5F6B7A] py-2.5 rounded-xl text-sm font-medium hover:bg-[#F0F2F5] transition-colors">Annuler</button>
              <button onClick={handleReject} disabled={!rejectReason} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${rejectReason ? "bg-red-600 text-white hover:bg-red-700" : "bg-[#F7F8FA] text-[#9AA4B2] cursor-not-allowed"}`}>Confirmer le rejet</button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {(validatedOrders.length > 0 || rejectedOrders.length > 0) && (
        <div className="bg-white border border-[#E8ECF1] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F0F2F5]">
            <h3 className="text-sm font-semibold text-[#0D0D12]">Historique des ordres traités</h3>
          </div>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#F7F8FA] border-b border-[#F0F2F5]">
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Ref</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Souscripteur</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">Montant</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Statut</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Date traitement</th>
              </tr>
            </thead>
            <tbody className="stagger-rows">
              {[...validatedOrders, ...rejectedOrders].map((o) => (
                <tr key={o.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC] transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-[#0D0D12]">{o.id}</td>
                  <td className="px-5 py-3 font-medium text-[#0D0D12]">{o.lpName}</td>
                  <td className="px-5 py-3 text-right font-medium text-[#0D0D12]">{fmt(o.montant)}</td>
                  <td className="px-5 py-3">{statusBadge(o.status)}</td>
                  <td className="px-5 py-3 text-xs text-[#5F6B7A]">{o.validatedAt || o.rejectedAt ? new Date(o.validatedAt || o.rejectedAt).toLocaleString("fr-FR") : "—"}</td>
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
function RegistreFonds({ toast, selectedFundId, selectedFundName }) {
  const { orders } = useAppContext();
  const [filterClass, setFilterClass] = useState("all");
  const [filterKyc, setFilterKyc] = useState("all");

  // Build LP list from real orders — filtered by fund
  const fundOrders = selectedFundId ? orders.filter((o) => o.fundId === selectedFundId) : orders;
  const allOrders = fundOrders.filter((o) => o.status !== "rejected");
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
      <div className="flex items-center justify-end gap-2 mb-4 text-xs text-[#9AA4B2]">
        <span className="w-2 h-2 rounded-full bg-[#00C48C] pulse-dot" />
        Temps réel · dernière mise à jour : 14 mars 2026, 14:32:08
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6 stagger-fast">
        <KPICard label="Total AUM" value={fmt(totalAUM)} delay={0} />
        <KPICard label="Nombre de LP" value={mergedLPs.length} delay={60} />
        <KPICard label="Capital appelé" value={fmt(capitalAppele)} sub={capitalEngage > 0 ? `${((capitalAppele / capitalEngage) * 100).toFixed(1)}% du capital engagé` : "—"} delay={120} />
        <KPICard label="NAV / part" value={fmtFull(NAV_PER_PART)} delay={180} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 stagger-children">
        <div className="bg-white border border-[#E8ECF1] rounded-2xl p-5 card-elevated">
          <p className="text-[12px] text-[#9AA4B2] font-medium mb-4">Répartition Share Class</p>
          <div className="flex items-center gap-6">
            <PieChart width={140} height={140}>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={60} stroke="none">
                <Cell fill="#0D0D12" />
                <Cell fill="#9AA4B2" />
              </Pie>
            </PieChart>
            <div className="space-y-2 text-sm text-[#0D0D12]">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#0D0D12]" /> Classe 1 — {fmt(class1Total)}</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#9AA4B2]" /> Classe 2 — {fmt(class2Total)}</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#E8ECF1] rounded-2xl p-5 card-elevated">
          <p className="text-[12px] text-[#9AA4B2] font-medium mb-4">Capital appelé vs engagé</p>
          <div className="mt-6">
            <div className="flex justify-between text-xs text-[#5F6B7A] mb-1">
              <span>Appelé : {fmt(capitalAppele)}</span>
              <span>Engagé : {fmt(capitalEngage)}</span>
            </div>
            <div className="w-full bg-[#F0F2F5] rounded-full h-3">
              <div className="bg-[#0D0D12] h-3 rounded-full transition-all duration-700" style={{ width: `${capitalEngage > 0 ? (capitalAppele / capitalEngage) * 100 : 0}%` }} />
            </div>
            <p className="text-xs text-[#9AA4B2] mt-2">{capitalEngage > 0 ? ((capitalAppele / capitalEngage) * 100).toFixed(1) : 0}% appelé</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="border border-[#E8ECF1] rounded-xl px-3 py-2 text-sm bg-white text-[#0D0D12] focus:outline-none focus:border-[#4F7DF3] transition-all">
          <option value="all">Toutes classes</option>
          <option value="1">Classe 1</option>
          <option value="2">Classe 2</option>
        </select>
        <select value={filterKyc} onChange={(e) => setFilterKyc(e.target.value)} className="border border-[#E8ECF1] rounded-xl px-3 py-2 text-sm bg-white text-[#0D0D12] focus:outline-none focus:border-[#4F7DF3] transition-all">
          <option value="all">Tous statuts KYC</option>
          <option value="Validé">Validé</option>
          <option value="En attente">En attente</option>
        </select>
        <div className="flex-1" />
        <button onClick={() => toast("Export CSV généré — registre_lp_20260314.csv")} className="bg-[#F7F8FA] text-[#5F6B7A] border border-[#E8ECF1] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#F0F2F5] transition-colors">Export CSV</button>
      </div>

      <div className="bg-white border border-[#E8ECF1] rounded-2xl overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#F7F8FA] border-b border-[#F0F2F5]">
                <th className="px-4 py-3 text-[12px] text-[#9AA4B2] font-medium">LP</th>
                <th className="px-4 py-3 text-[12px] text-[#9AA4B2] font-medium">Class</th>
                <th className="px-4 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">Montant</th>
                <th className="px-4 py-3 text-[12px] text-[#9AA4B2] font-medium">Date</th>
                <th className="px-4 py-3 text-[12px] text-[#9AA4B2] font-medium">KYC</th>
                <th className="px-4 py-3 text-[12px] text-[#9AA4B2] font-medium">Paiement</th>
                <th className="px-4 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">Parts</th>
                <th className="px-4 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">% Fonds</th>
              </tr>
            </thead>
            <tbody className="stagger-rows">
              {filtered.map((lp) => (
                <tr key={lp.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#0D0D12]">{lp.nom} {lp.prenom}</p>
                    {lp.societe && <p className="text-xs text-[#9AA4B2]">{lp.societe}</p>}
                    {lp.intermediaire && <p className="text-xs text-[#4F7DF3]">via {lp.intermediaire}</p>}
                  </td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${lp.shareClass === 1 ? "bg-[#0D0D12] text-white" : "bg-[#EEF2FF] text-[#4F7DF3]"}`}>{lp.shareClass}</span></td>
                  <td className="px-4 py-3 text-right font-medium text-[#0D0D12]">{fmt(lp.montant)}</td>
                  <td className="px-4 py-3 text-[#5F6B7A]">{lp.dateSouscription}</td>
                  <td className="px-4 py-3"><Badge status={lp.kycStatus} /></td>
                  <td className="px-4 py-3"><Badge status={lp.paiementStatus} /></td>
                  <td className="px-4 py-3 text-right font-mono text-[#0D0D12]">{lp.parts > 0 ? lp.parts.toFixed(2) : "—"}</td>
                  <td className="px-4 py-3 text-right text-[#0D0D12]">{lp.pctFonds > 0 ? lp.pctFonds.toFixed(2) + "%" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {mergedLPs.length === 0 && (
        <div className="bg-white border border-[#E8ECF1] rounded-2xl p-8 text-center">
          <p className="text-sm text-[#9AA4B2]">Aucune souscription enregistrée — les données apparaîtront ici après validation des ordres</p>
        </div>
      )}
    </div>
  );
}

/* ─── Main AIFM Portal ─── */
export default function PortailAIFM({ toast }) {
  const [subTab, setSubTab] = useState("validation");
  const [funds, setFunds] = useState([]);
  const [selectedFundId, setSelectedFundId] = useState("");
  const { orders } = useAppContext();

  useEffect(() => {
    listAllFunds().then((data) => {
      setFunds(data);
      if (data.length > 0) setSelectedFundId(data[0].id);
    });
  }, []);

  const selectedFund = funds.find((f) => f.id === selectedFundId);

  // Count orders per fund for the selector badges
  const orderCountByFund = funds.map((f) => ({
    ...f,
    pendingCount: orders.filter((o) => o.fundId === f.id && o.status === "pending").length,
    totalCount: orders.filter((o) => o.fundId === f.id).length,
  }));

  return (
    <div>
      {/* Fund selector */}
      {funds.length > 1 && (
        <div className="mb-6">
          <p className="text-[12px] text-[#9AA4B2] font-medium uppercase tracking-[0.08em] mb-3">Sélectionnez un fonds</p>
          <div className="flex gap-3 flex-wrap stagger-fast">
            {orderCountByFund.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFundId(f.id)}
                className={`relative px-5 py-3 rounded-2xl border text-sm font-medium transition-all ${
                  selectedFundId === f.id
                    ? "bg-[#0D0D12] text-white border-[#0D0D12]"
                    : "bg-white text-[#0D0D12] border-[#E8ECF1] hover:border-[#D1D5DB]"
                }`}
              >
                <span>{f.fundName}</span>
                <span className={`ml-2 text-xs ${selectedFundId === f.id ? "text-white/60" : "text-[#9AA4B2]"}`}>
                  {f.totalCount} ordre{f.totalCount > 1 ? "s" : ""}
                </span>
                {f.pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#DC2626] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {f.pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#F0F2F5] mb-8">
        {[
          { id: "validation", label: "Validation des ordres" },
          { id: "registre", label: `Registre${selectedFund ? " — " + selectedFund.fundName : ""}` },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setSubTab(tab.id)} className={`px-5 py-3 text-sm font-medium transition-all relative ${subTab === tab.id ? "text-[#0D0D12]" : "text-[#9AA4B2] hover:text-[#5F6B7A]"}`}>
            {tab.label}
            {subTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D0D12] rounded-full" />}
          </button>
        ))}
      </div>

      {subTab === "validation" && <ValidationOrdres toast={toast} selectedFundId={selectedFundId} />}
      {subTab === "registre" && <RegistreFonds toast={toast} selectedFundId={selectedFundId} selectedFundName={selectedFund?.fundName} />}
    </div>
  );
}
