import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { shortenHash, getExplorerUrl } from "../services/cardanoService";

const COUNTRIES = ["France", "Luxembourg", "Suisse", "Belgique", "Monaco", "Allemagne", "Italie", "Espagne", "Royaume-Uni", "États-Unis", "Autre"];
const INVESTOR_TYPES = ["Professionnel", "Averti", "Institutionnel"];

export default function InvestorProfile({ toast, compact = false }) {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [whitelistStatus, setWhitelistStatus] = useState([]);
  const [frozenFunds, setFrozenFunds] = useState([]);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    company: profile?.company || "",
    address: profile?.address || "",
    city: profile?.city || "",
    postal_code: profile?.postal_code || "",
    country: profile?.country || "France",
    nationality: profile?.nationality || "",
    date_of_birth: profile?.date_of_birth || "",
    investor_type: profile?.investor_type || "Professionnel",
  });

  useEffect(() => {
    if (!supabase || !profile?.wallet_address) return;
    supabase.from("token_whitelist")
      .select("fund_id, kyc_status, created_at")
      .eq("wallet_address", profile.wallet_address)
      .then(({ data }) => { if (data) setWhitelistStatus(data); });
    supabase.from("token_freeze")
      .select("fund_id, reason, created_at")
      .eq("wallet_address", profile.wallet_address)
      .then(({ data }) => { if (data) setFrozenFunds(data); });
  }, [profile?.wallet_address]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          phone: form.phone,
          company: form.company,
          address: form.address,
          city: form.city,
          postal_code: form.postal_code,
          country: form.country,
          nationality: form.nationality,
          date_of_birth: form.date_of_birth,
          investor_type: form.investor_type,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;
      await refreshProfile();
      setEditing(false);
      toast("Profil mis à jour avec succès");
    } catch (err) {
      toast("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const kycStatus = profile?.kyc_status || "pending";
  const kycLabel = kycStatus === "approved" ? "Verifie" : kycStatus === "rejected" ? "Rejete" : "En attente";

  const iCls = "w-full bg-[rgba(0,0,23,0.043)] border border-[rgba(0,0,29,0.1)] rounded-[10px] px-3 py-2.5 text-[14px] text-[#0F0F10] placeholder-[#A8A29E] focus:outline-none focus:border-[rgba(0,0,29,0.3)] focus:ring-2 focus:ring-[rgba(0,0,29,0.05)] transition-all duration-75";
  const lCls = "block text-[12px] font-medium text-[#A8A29E] mb-1.5";

  return (
    <div className={`${compact ? "" : "page-slide-in"} space-y-6 ${compact ? "" : "max-w-4xl"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {!compact && <h2 className="text-[22px] font-bold text-[#0F0F10] tracking-tight">Mon profil</h2>}
          <p className="text-[14px] text-[#787881] mt-1">{compact ? "Informations personnelles et statut KYC" : "Gerez vos informations personnelles et votre statut KYC"}</p>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="px-4 py-2 bg-[#0F0F10] text-white text-[13px] font-medium rounded-[9.6px] hover:bg-[#292524] transition-colors active:scale-[0.98]">
            Modifier
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="px-4 py-2 bg-white border border-[rgba(0,0,29,0.1)] text-[#787881] text-[13px] font-medium rounded-[9.6px] hover:bg-[rgba(0,0,23,0.03)] transition-colors">
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#0F0F10] text-white text-[13px] font-medium rounded-[9.6px] hover:bg-[#292524] transition-colors disabled:opacity-50">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        )}
      </div>

      {/* KYC Status banner */}
      <div className={`rounded-2xl p-4 flex items-center gap-3 border ${
        kycStatus === "approved" ? "bg-[#ECFDF5] border-[rgba(5,150,105,0.15)]" :
        kycStatus === "rejected" ? "bg-[#FEF2F2] border-[rgba(220,38,38,0.15)]" :
        "bg-[#FFFBEB] border-[rgba(217,119,6,0.15)]"
      }`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          kycStatus === "approved" ? "bg-[#D1FAE5]" : kycStatus === "rejected" ? "bg-[#FEE2E2]" : "bg-[#FEF3C7]"
        }`}>
          {kycStatus === "approved" ? (
            <svg className="w-4.5 h-4.5 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          ) : (
            <svg className="w-4.5 h-4.5 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
        </div>
        <div>
          <p className={`text-[14px] font-semibold ${kycStatus === "approved" ? "text-[#059669]" : kycStatus === "rejected" ? "text-[#DC2626]" : "text-[#D97706]"}`}>Statut KYC : {kycLabel}</p>
          <p className={`text-[12px] mt-0.5 ${kycStatus === "approved" ? "text-[#059669]/80" : kycStatus === "rejected" ? "text-[#DC2626]/80" : "text-[#D97706]/80"}`}>
            {kycStatus === "approved" ? "Votre identite a ete verifiee. Vous pouvez souscrire a tous les fonds." :
              "Completez votre profil et soumettez vos documents pour la verification KYC."}
          </p>
        </div>
      </div>

      {/* Freeze alert */}
      {frozenFunds.length > 0 && (
        <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.15)] rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-[#FEE2E2] rounded-xl flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#DC2626]">Adresse gelee sur {frozenFunds.length} fonds</p>
            <p className="text-[12px] text-[#DC2626]/80 mt-0.5">Votre adresse est temporairement gelee. Contactez votre administrateur.</p>
          </div>
        </div>
      )}

      {/* Personal information */}
      <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-6">
        <h3 className="text-[14px] font-semibold text-[#0F0F10] mb-5">Informations personnelles</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label className={lCls}>Nom complet</label>
            {editing ? (
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={iCls} />
            ) : (
              <p className="text-[14px] text-[#0F0F10] font-medium py-2.5">{profile?.full_name || "—"}</p>
            )}
          </div>
          <div>
            <label className={lCls}>Email</label>
            <p className="text-[14px] text-[#787881] py-2.5">{profile?.email || "—"}</p>
          </div>
          <div>
            <label className={lCls}>Telephone</label>
            {editing ? (
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={iCls} placeholder="+33 6 00 00 00 00" />
            ) : (
              <p className="text-[14px] text-[#0F0F10] py-2.5">{profile?.phone || "—"}</p>
            )}
          </div>
          <div>
            <label className={lCls}>Date de naissance</label>
            {editing ? (
              <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className={iCls} />
            ) : (
              <p className="text-[14px] text-[#0F0F10] py-2.5">{profile?.date_of_birth || "—"}</p>
            )}
          </div>
          <div>
            <label className={lCls}>Nationalite</label>
            {editing ? (
              <input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} className={iCls} placeholder="Francaise" />
            ) : (
              <p className="text-[14px] text-[#0F0F10] py-2.5">{profile?.nationality || "—"}</p>
            )}
          </div>
          <div>
            <label className={lCls}>Societe</label>
            {editing ? (
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={iCls} placeholder="Nom de la societe" />
            ) : (
              <p className="text-[14px] text-[#0F0F10] py-2.5">{profile?.company || "—"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-6">
        <h3 className="text-[14px] font-semibold text-[#0F0F10] mb-5">Adresse</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="col-span-2">
            <label className={lCls}>Adresse</label>
            {editing ? (
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={iCls} placeholder="12 rue de la Paix" />
            ) : (
              <p className="text-[14px] text-[#0F0F10] py-2.5">{profile?.address || "—"}</p>
            )}
          </div>
          <div>
            <label className={lCls}>Code postal</label>
            {editing ? (
              <input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className={iCls} placeholder="75002" />
            ) : (
              <p className="text-[14px] text-[#0F0F10] py-2.5">{profile?.postal_code || "—"}</p>
            )}
          </div>
          <div>
            <label className={lCls}>Ville</label>
            {editing ? (
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={iCls} placeholder="Paris" />
            ) : (
              <p className="text-[14px] text-[#0F0F10] py-2.5">{profile?.city || "—"}</p>
            )}
          </div>
          <div>
            <label className={lCls}>Pays</label>
            {editing ? (
              <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={iCls}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <p className="text-[14px] text-[#0F0F10] py-2.5">{profile?.country || "—"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Investor profile */}
      <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-6">
        <h3 className="text-[14px] font-semibold text-[#0F0F10] mb-5">Profil investisseur</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label className={lCls}>Type d'investisseur</label>
            {editing ? (
              <select value={form.investor_type} onChange={(e) => setForm({ ...form, investor_type: e.target.value })} className={iCls}>
                {INVESTOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <p className="text-[14px] text-[#0F0F10] py-2.5">{profile?.investor_type || "Professionnel"}</p>
            )}
          </div>
          <div>
            <label className={lCls}>Role</label>
            <p className="text-[14px] py-2.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-[#EEF2FF] text-[#6366F1] border border-[rgba(99,102,241,0.1)]">
                Investisseur
              </span>
            </p>
          </div>
          <div>
            <label className={lCls}>Membre depuis</label>
            <p className="text-[14px] text-[#0F0F10] py-2.5">{profile?.created_at?.split("T")[0] || "—"}</p>
          </div>
          {profile?.intermediary_id && (
            <div>
              <label className={lCls}>Intermediaire</label>
              <p className="text-[14px] text-[#0F0F10] py-2.5">Rattache a un intermediaire</p>
            </div>
          )}
        </div>
      </div>

      {/* Wallet & Blockchain */}
      <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-6">
        <h3 className="text-[14px] font-semibold text-[#0F0F10] mb-5">Portefeuille Cardano</h3>
        <div className="space-y-0 text-[14px]">
          <div className="flex items-center justify-between py-3 border-b border-[rgba(0,0,29,0.05)]">
            <span className="text-[#787881]">Adresse publique</span>
            {profile?.wallet_address ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-[#0F0F10] bg-[rgba(0,0,23,0.03)] px-2 py-1 rounded-lg border border-[rgba(0,0,29,0.06)]">
                  {profile.wallet_address.slice(0, 16)}...{profile.wallet_address.slice(-8)}
                </span>
                <button onClick={() => { navigator.clipboard.writeText(profile.wallet_address); toast("Adresse copiee"); }}
                  className="text-[12px] text-[#6366F1] hover:text-[#0F0F10] transition-colors font-medium">
                  Copier
                </button>
              </div>
            ) : (
              <span className="text-[12px] text-[#A8A29E]">Non genere</span>
            )}
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[rgba(0,0,29,0.05)]">
            <span className="text-[#787881]">Reseau</span>
            <span className="text-[12px] text-[#A8A29E]">Cardano Preprod Testnet</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[rgba(0,0,29,0.05)]">
            <span className="text-[#787881]">Email verifie</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium bg-[#ECFDF5] text-[#059669] border border-[rgba(5,150,105,0.1)]">Oui</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-[#787881]">Identifiant</span>
            <span className="font-mono text-[11px] text-[#A8A29E]">{profile?.id?.slice(0, 8)}...{profile?.id?.slice(-4)}</span>
          </div>
        </div>
        {profile?.wallet_address && (
          <div className="mt-4 bg-[rgba(0,0,23,0.025)] border border-[rgba(0,0,29,0.06)] rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#A8A29E] font-semibold mb-1">Adresse complete</p>
            <p className="font-mono text-[12px] text-[#0F0F10] break-all leading-relaxed">{profile.wallet_address}</p>
          </div>
        )}
      </div>

      {/* CIP-113 Compliance Status */}
      <div className="bg-white border border-[rgba(0,0,29,0.08)] rounded-2xl p-6">
        <h3 className="text-[14px] font-semibold text-[#0F0F10] mb-5">Statut compliance (CIP-113)</h3>
        <div className="space-y-0">
          <div className="flex items-center justify-between py-3 border-b border-[rgba(0,0,29,0.05)]">
            <div>
              <p className="text-[14px] text-[#0F0F10] font-medium">Whitelist on-chain</p>
              <p className="text-[12px] text-[#A8A29E] mt-0.5">Fonds autorises pour votre adresse</p>
            </div>
            {whitelistStatus.length > 0 ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#ECFDF5] text-[#059669] border border-[rgba(5,150,105,0.1)]">
                {whitelistStatus.length} fonds autorise{whitelistStatus.length > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[rgba(0,0,23,0.03)] text-[#787881] border border-[rgba(0,0,29,0.06)]">
                Aucun
              </span>
            )}
          </div>

          <div className="flex items-center justify-between py-3 border-b border-[rgba(0,0,29,0.05)]">
            <div>
              <p className="text-[14px] text-[#0F0F10] font-medium">Statut Freeze</p>
              <p className="text-[12px] text-[#A8A29E] mt-0.5">Restrictions de transfert actives</p>
            </div>
            {frozenFunds.length > 0 ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#FEF2F2] text-[#DC2626] border border-[rgba(220,38,38,0.1)]">
                {frozenFunds.length} fonds gele{frozenFunds.length > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#ECFDF5] text-[#059669] border border-[rgba(5,150,105,0.1)]">
                Aucune restriction
              </span>
            )}
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[14px] text-[#0F0F10] font-medium">Standard</p>
              <p className="text-[12px] text-[#A8A29E] mt-0.5">Framework de compliance utilise</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#EEF2FF] text-[#6366F1] border border-[rgba(99,102,241,0.1)]">
              CIP-113 / AMLD5 / MiFID2
            </span>
          </div>
        </div>

        {whitelistStatus.length > 0 && (
          <div className="mt-4 bg-[rgba(0,0,23,0.025)] border border-[rgba(0,0,29,0.06)] rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#A8A29E] font-semibold mb-3">Detail des autorisations</p>
            <div className="space-y-2">
              {whitelistStatus.map((w, i) => (
                <div key={i} className="flex items-center justify-between text-[12px]">
                  <span className="font-mono text-[#787881]">{shortenHash(w.fund_id, 6)}</span>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[10px] font-medium ${
                      w.kyc_status === "validated" ? "bg-[#ECFDF5] text-[#059669] border border-[rgba(5,150,105,0.1)]" : "bg-[#FFFBEB] text-[#D97706] border border-[rgba(217,119,6,0.1)]"
                    }`}>
                      {w.kyc_status === "validated" ? "KYC OK" : w.kyc_status}
                    </span>
                    <span className="text-[#A8A29E]">{w.created_at ? new Date(w.created_at).toLocaleDateString("fr-FR") : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
