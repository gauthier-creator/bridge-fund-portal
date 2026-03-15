import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const COUNTRIES = ["France", "Luxembourg", "Suisse", "Belgique", "Monaco", "Allemagne", "Italie", "Espagne", "Royaume-Uni", "États-Unis", "Autre"];
const INVESTOR_TYPES = ["Professionnel", "Averti", "Institutionnel"];

export default function InvestorProfile({ toast }) {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const kycColor = kycStatus === "approved" ? "emerald" : kycStatus === "rejected" ? "red" : "amber";
  const kycLabel = kycStatus === "approved" ? "Vérifié" : kycStatus === "rejected" ? "Rejeté" : "En attente";

  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all";
  const inputDisabled = "w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-500";
  const labelCls = "block text-xs font-medium text-gray-500 mb-1.5";

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-navy">Mon profil</h2>
          <p className="text-sm text-gray-400 mt-1">Gérez vos informations personnelles et votre statut KYC</p>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="px-4 py-2 bg-navy text-white text-xs rounded-xl hover:bg-navy-light transition-colors">
            Modifier
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-200 text-gray-500 text-xs rounded-xl hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-navy text-white text-xs rounded-xl hover:bg-navy-light transition-colors disabled:opacity-50">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        )}
      </div>

      {/* KYC Status banner */}
      <div className={`bg-${kycColor}-50 border border-${kycColor}-200 rounded-2xl p-4 flex items-center gap-3`}>
        <div className={`w-10 h-10 bg-${kycColor}-100 rounded-xl flex items-center justify-center`}>
          {kycStatus === "approved" ? (
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          ) : (
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
        </div>
        <div>
          <p className={`text-sm font-semibold text-${kycColor}-800`}>Statut KYC : {kycLabel}</p>
          <p className={`text-xs text-${kycColor}-600 mt-0.5`}>
            {kycStatus === "approved" ? "Votre identité a été vérifiée. Vous pouvez souscrire à tous les fonds." :
              "Complétez votre profil et soumettez vos documents pour la vérification KYC."}
          </p>
        </div>
      </div>

      {/* Personal information */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-navy mb-5">Informations personnelles</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label className={labelCls}>Nom complet</label>
            {editing ? (
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputCls} />
            ) : (
              <p className="text-sm text-navy font-medium py-2.5">{profile?.full_name || "—"}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <p className={`text-sm text-gray-500 py-2.5 ${!editing ? "" : ""}`}>{profile?.email || "—"}</p>
          </div>
          <div>
            <label className={labelCls}>Téléphone</label>
            {editing ? (
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="+33 6 00 00 00 00" />
            ) : (
              <p className="text-sm text-navy py-2.5">{profile?.phone || "—"}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Date de naissance</label>
            {editing ? (
              <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className={inputCls} />
            ) : (
              <p className="text-sm text-navy py-2.5">{profile?.date_of_birth || "—"}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Nationalité</label>
            {editing ? (
              <input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} className={inputCls} placeholder="Française" />
            ) : (
              <p className="text-sm text-navy py-2.5">{profile?.nationality || "—"}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Société</label>
            {editing ? (
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputCls} placeholder="Nom de la société" />
            ) : (
              <p className="text-sm text-navy py-2.5">{profile?.company || "—"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-navy mb-5">Adresse</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="col-span-2">
            <label className={labelCls}>Adresse</label>
            {editing ? (
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} placeholder="12 rue de la Paix" />
            ) : (
              <p className="text-sm text-navy py-2.5">{profile?.address || "—"}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Code postal</label>
            {editing ? (
              <input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className={inputCls} placeholder="75002" />
            ) : (
              <p className="text-sm text-navy py-2.5">{profile?.postal_code || "—"}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Ville</label>
            {editing ? (
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} placeholder="Paris" />
            ) : (
              <p className="text-sm text-navy py-2.5">{profile?.city || "—"}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Pays</label>
            {editing ? (
              <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputCls + " bg-white"}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <p className="text-sm text-navy py-2.5">{profile?.country || "—"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Investor profile */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-navy mb-5">Profil investisseur</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label className={labelCls}>Type d'investisseur</label>
            {editing ? (
              <select value={form.investor_type} onChange={(e) => setForm({ ...form, investor_type: e.target.value })} className={inputCls + " bg-white"}>
                {INVESTOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <p className="text-sm text-navy py-2.5">{profile?.investor_type || "Professionnel"}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Rôle</label>
            <p className="text-sm text-navy py-2.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-navy/10 text-navy">
                Investisseur
              </span>
            </p>
          </div>
          <div>
            <label className={labelCls}>Membre depuis</label>
            <p className="text-sm text-navy py-2.5">{profile?.created_at?.split("T")[0] || "—"}</p>
          </div>
          {profile?.intermediary_id && (
            <div>
              <label className={labelCls}>Intermédiaire</label>
              <p className="text-sm text-navy py-2.5">Rattaché à un intermédiaire</p>
            </div>
          )}
        </div>
      </div>

      {/* Account info */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-navy mb-4">Compte</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Identifiant</span>
            <span className="font-mono text-xs text-gray-400">{profile?.id?.slice(0, 8)}...{profile?.id?.slice(-4)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Email vérifié</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">Oui</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-500">Réseau blockchain</span>
            <span className="text-xs text-gray-400">Cardano Preprod Testnet</span>
          </div>
        </div>
      </div>
    </div>
  );
}
