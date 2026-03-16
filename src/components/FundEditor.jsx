import { useState, useEffect } from "react";
import { listAllFunds, createFund, updateFund, deleteFund } from "../services/fundService";
import { shortenHash, getExplorerUrl } from "../services/cardanoService";
import { Badge } from "./shared";

const fieldCls = "w-full bg-white border border-[#E8ECF1] rounded-xl px-3.5 py-2.5 text-sm text-[#0D0D12] placeholder-[#C4CAD4] focus:outline-none focus:border-[#4F7DF3] focus:ring-2 focus:ring-[#4F7DF3]/10 transition-all";
const lblCls = "block text-[13px] font-medium text-[#5F6B7A] mb-1";
const fmt = (n) => Number(n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const EMPTY_FUND = {
  fundName: "", fundSubtitle: "", description: "", strategy: "", investmentThesis: "",
  targetReturn: "", minimumInvestment: 125000, fundSize: 0, navPerShare: 1000,
  jurisdiction: "Luxembourg", legalForm: "SCSp", aifm: "", custodian: "", auditor: "",
  administrator: "", regulatoryStatus: "CSSF regulated",
  highlights: [], shareClasses: [
    { id: 1, name: "Classe 1", targetReturn: "7-9%", duration: "36 mois", risk: "5/7" },
    { id: 2, name: "Classe 2", targetReturn: "5-6%", duration: "24 mois", risk: "4/7" },
  ],
};

export default function FundEditor({ toast }) {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = list view, "new" | fund object = form
  const [form, setForm] = useState(EMPTY_FUND);
  const [highlightsText, setHighlightsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);

  const loadFunds = () => {
    setLoading(true);
    listAllFunds().then(setFunds).finally(() => setLoading(false));
  };

  useEffect(() => { loadFunds(); }, []);

  const startCreate = () => {
    setForm({ ...EMPTY_FUND });
    setHighlightsText("");
    setEditing("new");
  };

  const startEdit = (fund) => {
    setForm({ ...fund });
    setHighlightsText(Array.isArray(fund.highlights) ? fund.highlights.join("\n") : "");
    setEditing(fund);
  };

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.fundName) { toast("Veuillez saisir un nom de fonds"); return; }
    setSaving(true);
    if (editing === "new") setDeploying(true);

    try {
      const payload = {
        ...form,
        highlights: highlightsText.split("\n").map((s) => s.trim()).filter(Boolean),
        minimumInvestment: Number(form.minimumInvestment) || 0,
        fundSize: Number(form.fundSize) || 0,
        navPerShare: Number(form.navPerShare) || 0,
      };

      if (editing === "new") {
        await createFund(payload);
        toast(`Fonds "${form.fundName}" créé — Token registre déployé sur Cardano Preprod`);
      } else {
        await updateFund(editing.id, payload);
        toast(`Fonds "${form.fundName}" mis à jour`);
      }

      setEditing(null);
      loadFunds();
    } catch (err) {
      toast("Erreur : " + err.message);
    } finally {
      setSaving(false);
      setDeploying(false);
    }
  };

  const handleDelete = async (fund) => {
    if (!confirm(`Supprimer le fonds "${fund.fundName}" ?`)) return;
    try {
      await deleteFund(fund.id);
      toast(`Fonds "${fund.fundName}" supprimé`);
      loadFunds();
    } catch (err) {
      toast("Erreur : " + err.message);
    }
  };

  // ─── Deploying overlay ───
  if (deploying) {
    return (
      <div className="animate-fade-in text-center py-20">
        <div className="w-20 h-20 bg-[#F7F8FA] border border-[#E8ECF1] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <div className="w-10 h-10 border-4 border-[#0D0D12]/20 border-t-[#0D0D12] rounded-full animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-[#0D0D12] mb-2">Déploiement sur Cardano Preprod…</h3>
        <p className="text-sm text-[#5F6B7A] max-w-md mx-auto">
          Mint du token registre (CIP-25) pour "{form.fundName}" sur le réseau Cardano Preprod. La transaction sera vérifiable sur preprod.cardanoscan.io.
        </p>
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs text-[#5F6B7A]">
            <span className="w-2 h-2 rounded-full bg-[#0D0D12] animate-pulse" />
            Construction et soumission de la transaction…
          </div>
          <p className="text-xs text-[#9AA4B2]">Réseau : Cardano Preprod Testnet</p>
        </div>
      </div>
    );
  }

  // ─── Form view ───
  if (editing) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold text-[#0D0D12]">
              {editing === "new" ? "Créer un nouveau fonds" : `Modifier — ${editing.fundName}`}
            </h3>
            <p className="text-xs text-[#5F6B7A] mt-1">
              {editing === "new"
                ? "Un smart contract sera automatiquement déployé sur Cardano"
                : "Les modifications seront immédiatement visibles"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setEditing(null)} className="px-4 py-2 bg-white border border-[#E8ECF1] text-[#5F6B7A] text-xs rounded-xl hover:bg-[#F7F8FA] transition-colors">
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-[#0D0D12] text-white text-xs rounded-xl hover:bg-[#1A1A2E] transition-colors disabled:opacity-50">
              {saving ? "Sauvegarde…" : editing === "new" ? "Créer le fonds" : "Sauvegarder"}
            </button>
          </div>
        </div>

        {/* General info */}
        <div className="bg-white border border-[#E8ECF1] rounded-2xl p-6 mb-6">
          <h4 className="text-sm font-semibold text-[#0D0D12] mb-4">Informations générales</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lblCls}>Nom du fonds *</label>
              <input value={form.fundName} onChange={(e) => update("fundName", e.target.value)} className={fieldCls} placeholder="Mon Fonds SCSp" />
            </div>
            <div>
              <label className={lblCls}>Sous-titre</label>
              <input value={form.fundSubtitle || ""} onChange={(e) => update("fundSubtitle", e.target.value)} className={fieldCls} placeholder="Fonds de dette privée tokenisé..." />
            </div>
            <div className="col-span-2">
              <label className={lblCls}>Description</label>
              <textarea value={form.description || ""} onChange={(e) => update("description", e.target.value)} rows={3} className={fieldCls} />
            </div>
            <div className="col-span-2">
              <label className={lblCls}>Stratégie d'investissement</label>
              <textarea value={form.strategy || ""} onChange={(e) => update("strategy", e.target.value)} rows={3} className={fieldCls} />
            </div>
            <div className="col-span-2">
              <label className={lblCls}>Thèse d'investissement</label>
              <textarea value={form.investmentThesis || ""} onChange={(e) => update("investmentThesis", e.target.value)} rows={3} className={fieldCls} />
            </div>
          </div>
        </div>

        {/* Key metrics */}
        <div className="bg-white border border-[#E8ECF1] rounded-2xl p-6 mb-6">
          <h4 className="text-sm font-semibold text-[#0D0D12] mb-4">Métriques clés</h4>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className={lblCls}>Rendement cible</label>
              <input value={form.targetReturn || ""} onChange={(e) => update("targetReturn", e.target.value)} className={fieldCls} placeholder="8-12% net" />
            </div>
            <div>
              <label className={lblCls}>NAV / Part (EUR)</label>
              <input type="number" step="0.01" value={form.navPerShare || ""} onChange={(e) => update("navPerShare", e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label className={lblCls}>Invest. minimum (EUR)</label>
              <input type="number" value={form.minimumInvestment || ""} onChange={(e) => update("minimumInvestment", e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label className={lblCls}>Taille du fonds (EUR)</label>
              <input type="number" value={form.fundSize || ""} onChange={(e) => update("fundSize", e.target.value)} className={fieldCls} />
            </div>
          </div>
        </div>

        {/* Structure */}
        <div className="bg-white border border-[#E8ECF1] rounded-2xl p-6 mb-6">
          <h4 className="text-sm font-semibold text-[#0D0D12] mb-4">Structure du fonds</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lblCls}>Juridiction</label>
              <input value={form.jurisdiction || ""} onChange={(e) => update("jurisdiction", e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label className={lblCls}>Forme juridique</label>
              <input value={form.legalForm || ""} onChange={(e) => update("legalForm", e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label className={lblCls}>AIFM</label>
              <input value={form.aifm || ""} onChange={(e) => update("aifm", e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label className={lblCls}>Dépositaire</label>
              <input value={form.custodian || ""} onChange={(e) => update("custodian", e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label className={lblCls}>Auditeur</label>
              <input value={form.auditor || ""} onChange={(e) => update("auditor", e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label className={lblCls}>Administrateur</label>
              <input value={form.administrator || ""} onChange={(e) => update("administrator", e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label className={lblCls}>Statut réglementaire</label>
              <input value={form.regulatoryStatus || ""} onChange={(e) => update("regulatoryStatus", e.target.value)} className={fieldCls} />
            </div>
          </div>
        </div>

        {/* Highlights */}
        <div className="bg-white border border-[#E8ECF1] rounded-2xl p-6 mb-6">
          <h4 className="text-sm font-semibold text-[#0D0D12] mb-2">Points clés</h4>
          <p className="text-xs text-[#5F6B7A] mb-3">Un point clé par ligne</p>
          <textarea
            value={highlightsText}
            onChange={(e) => setHighlightsText(e.target.value)}
            rows={5}
            className={fieldCls}
            placeholder={"Rendement cible 8-12% net\nTokenisé sur Cardano\nRégulé CSSF"}
          />
        </div>

        {/* Save button bottom */}
        <div className="flex justify-end gap-3">
          <button onClick={() => setEditing(null)} className="px-6 py-2.5 bg-white border border-[#E8ECF1] text-[#5F6B7A] text-sm rounded-xl hover:bg-[#F7F8FA] transition-colors">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving} className="px-8 py-2.5 bg-[#0D0D12] text-white text-sm rounded-xl hover:bg-[#1A1A2E] transition-colors disabled:opacity-50">
            {saving ? "Sauvegarde…" : editing === "new" ? "Créer et déployer" : "Sauvegarder"}
          </button>
        </div>
      </div>
    );
  }

  // ─── List view ───
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-[#0D0D12]">Gestion des fonds</h3>
          <p className="text-xs text-[#9AA4B2] mt-1">{funds.length} fonds enregistrés</p>
        </div>
        <button onClick={startCreate} className="px-5 py-2 bg-[#0D0D12] text-white text-xs rounded-xl hover:bg-[#1A1A2E] transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Créer un fonds
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#9AA4B2] text-sm">Chargement…</div>
      ) : funds.length === 0 ? (
        <div className="bg-[#F7F8FA] border border-[#E8ECF1] rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-white border border-[#E8ECF1] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#C4CAD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-[#0D0D12] mb-1">Aucun fonds créé</h4>
          <p className="text-xs text-[#9AA4B2] mb-4">Créez votre premier fonds pour commencer</p>
          <button onClick={startCreate} className="px-6 py-2 bg-[#0D0D12] text-white text-xs rounded-xl hover:bg-[#1A1A2E] transition-colors">
            Créer un fonds
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {funds.map((fund) => (
            <div key={fund.id} className="bg-white border border-[#E8ECF1] rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-sm font-semibold text-[#0D0D12]">{fund.fundName}</h4>
                    <Badge status={fund.status === "active" ? "Actif" : fund.status === "draft" ? "Brouillon" : "Fermé"} />
                  </div>
                  <p className="text-xs text-[#5F6B7A] mb-3">{fund.fundSubtitle}</p>

                  <div className="flex items-center gap-6 text-xs">
                    <span className="text-[#5F6B7A]">Rendement: <span className="text-[#0D0D12] font-medium">{fund.targetReturn || "—"}</span></span>
                    <span className="text-[#5F6B7A]">NAV: <span className="text-[#0D0D12] font-medium">{fund.navPerShare ? fmt(fund.navPerShare) : "—"}</span></span>
                    <span className="text-[#5F6B7A]">Taille: <span className="text-[#0D0D12] font-medium">{fund.fundSize ? fmt(fund.fundSize) : "—"}</span></span>
                    {fund.cardanoPolicyId && (
                      <span className="flex items-center gap-1 text-[#5F6B7A]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C]" />
                        Cardano: <span className="font-mono text-[#9AA4B2]">{shortenHash(fund.cardanoPolicyId, 6)}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {fund.cardanoTxHash && (
                    <a
                      href={getExplorerUrl(fund.cardanoTxHash, fund.blockchainNetwork)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs bg-white border border-[#E8ECF1] rounded-xl text-[#5F6B7A] hover:bg-[#F7F8FA] transition-colors"
                    >
                      Explorer
                    </a>
                  )}
                  <button onClick={() => startEdit(fund)} className="px-3 py-1.5 text-xs bg-[#EEF2FF] text-[#4F7DF3] rounded-xl hover:bg-[#E0E7FF] transition-colors font-medium">
                    Modifier
                  </button>
                  <button onClick={() => handleDelete(fund)} className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
