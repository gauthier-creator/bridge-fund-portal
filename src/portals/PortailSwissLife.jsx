import { useState, useRef, useEffect } from "react";
import { NAV_PER_PART } from "../data";
import { generateBulletinPDF } from "../generateBulletin";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { uploadGeneratedPDF } from "../utils/generateDocument";
import { supabase } from "../lib/supabase";
import { listMyClients, createClientAccount } from "../services/profileService";
import {
  KPICard, Badge, fmt, fmtFull, inputCls, selectCls, labelCls,
  Checkbox, ComplianceAlert, SignaturePad,
} from "../components/shared";
import FundCatalog from "../components/FundCatalog";
import FundDetail from "../components/FundDetail";

/* ─── Sub-tab: Souscription intermédiée ─── */
function SouscriptionIntermediee({ toast }) {
  const { submitOrder } = useAppContext();
  const { profile, user } = useAuth();
  const intermediaireName = profile?.company || profile?.full_name || "Intermédiaire";
  const [step, setStep] = useState(0);
  const [personType, setPersonType] = useState("physique");
  const [formData, setFormData] = useState({
    nom: "", prenom: "", societe: "", pays: "France",
    typeInvestisseur: "Averti (well-informed)", montant: 150000,
    shareClass: 2, paymentMethod: "fiat",
    dateNaissance: "", nationalite: "Française", adresse: "", codePostal: "", ville: "",
    lei: "", rcs: "", formeJuridique: "SAS",
    beneficiaireNom: "", beneficiairePct: "",
    origineFonds: "", pepStatus: "non", pepDetail: "",
  });
  const [kycDone, setKycDone] = useState(false);
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [subRef] = useState(() => "BF-SL-2026-" + String(Math.floor(Math.random() * 9000) + 1000));
  const [consents, setConsents] = useState({ prospectus: false, dici: false, risques: false, illiquidite: false, donnees: false, fiscalite: false });
  const [documents, setDocuments] = useState([]);
  const fileRefs = { id: useRef(null), domicile: useRef(null), fonds: useRef(null), statuts: useRef(null), ubo: useRef(null) };

  const handleFileSelect = (docType) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const date = new Date().toISOString().split("T")[0];
    const size = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} Mo` : `${(file.size / 1024).toFixed(0)} Ko`;

    if (supabase) {
      const path = `${subRef}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
      if (!error) {
        const { data } = await supabase.storage.from("documents").createSignedUrl(path, 7 * 24 * 3600);
        setDocuments((prev) => [...prev, { name: file.name, type: docType, size, date, url: data?.signedUrl, storagePath: path }]);
      } else {
        console.error("Upload failed:", error.message);
        setDocuments((prev) => [...prev, { name: file.name, type: docType, size, date, url: URL.createObjectURL(file) }]);
      }
    } else {
      setDocuments((prev) => [...prev, { name: file.name, type: docType, size, date, url: URL.createObjectURL(file) }]);
    }
    toast(`Document uploadé — ${file.name}`);
  };

  const allConsentsChecked = Object.values(consents).every(Boolean);
  const canSign = allConsentsChecked && signatureData;
  const set = (key, val) => setFormData((prev) => ({ ...prev, [key]: val }));
  const steps = ["Client & KYC", "Virement", "Signature", "Confirmation"];

  const handleKyc = () => {
    toast("KYC client lancé par SwissLife — vérification en cours");
    setTimeout(() => { setKycDone(true); toast("KYC validé pour " + (formData.prenom + " " + formData.nom).trim()); }, 2000);
  };

  const handlePayment = () => {
    toast("Virement en cours de vérification");
    setTimeout(() => { setPaymentReceived(true); toast("Virement reçu — " + fmt(formData.montant)); }, 2000);
  };

  const handleSign = () => {
    const doc = generateBulletinPDF({ formData, subRef, personType, signatureDataUrl: signatureData });
    const blob = doc.output("blob");
    setPdfUrl(URL.createObjectURL(blob));
    setSigned(true);
    toast(`Bulletin signé — souscription intermédiée par ${intermediaireName}`);
    submitOrder({
      id: subRef,
      type: "intermediated",
      intermediaire: intermediaireName,
      intermediaryId: user?.id || null,
      lpName: (formData.prenom + " " + formData.nom).trim(),
      nom: formData.nom,
      prenom: formData.prenom,
      societe: formData.societe || null,
      shareClass: formData.shareClass,
      montant: formData.montant,
      date: new Date().toISOString().split("T")[0],
      status: "pending",
      kycStatus: "Validé",
      paymentStatus: "Reçu",
      personType,
      pays: formData.pays,
      typeInvestisseur: formData.typeInvestisseur,
      signatureDate: new Date().toISOString(),
      origineFonds: formData.origineFonds,
      adresse: [formData.adresse, formData.codePostal, formData.ville].filter(Boolean).join(", ") || null,
      pepStatus: formData.pepStatus,
      documents,
    });
  };

  return (
    <div className="animate-fade-in">
      {/* Stepper */}
      <div className="flex items-center justify-center mb-10">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${i < step ? "bg-gold text-white" : i === step ? "bg-navy text-white" : "bg-gray-200 text-gray-400"}`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs mt-2 font-medium ${i <= step ? "text-navy" : "text-gray-400"}`}>{s}</span>
            </div>
            {i < 3 && <div className={`w-20 h-px mx-3 mt-[-16px] ${i < step ? "bg-gold" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-8 max-w-2xl mx-auto">
        {/* Intermediary banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 flex items-center gap-2 text-xs text-blue-800">
          <span className="font-bold text-sm">SL</span>
          <span>Souscription intermédiée par <strong>SwissLife Banque Privée</strong> — dépositaire / custodian</span>
        </div>

        {/* Step 0: Client info */}
        {step === 0 && (
          <div className="animate-fade-in">
            <h3 className="text-lg font-semibold text-navy mb-2">Informations client</h3>
            <p className="text-xs text-gray-400 mb-5">Saisissez les informations du client pour lequel vous souscrivez</p>

            <div className="flex bg-cream rounded-xl p-1 mb-6 max-w-xs mx-auto">
              <button onClick={() => setPersonType("physique")} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${personType === "physique" ? "bg-white text-navy shadow-sm" : "text-gray-500"}`}>Personne physique</button>
              <button onClick={() => setPersonType("morale")} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${personType === "morale" ? "bg-white text-navy shadow-sm" : "text-gray-500"}`}>Personne morale</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <label className={labelCls}>Nom <span className="text-red-400">*</span></label>
                <input type="text" value={formData.nom} onChange={(e) => set("nom", e.target.value)} placeholder="Duval" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Prénom <span className="text-red-400">*</span></label>
                <input type="text" value={formData.prenom} onChange={(e) => set("prenom", e.target.value)} placeholder="Marie-Claire" className={inputCls} />
              </div>
              {personType === "morale" && (
                <div className="col-span-2">
                  <label className={labelCls}>Dénomination sociale <span className="text-red-400">*</span></label>
                  <input type="text" value={formData.societe} onChange={(e) => set("societe", e.target.value)} className={inputCls} />
                </div>
              )}
              <div>
                <label className={labelCls}>Pays <span className="text-red-400">*</span></label>
                <select value={formData.pays} onChange={(e) => set("pays", e.target.value)} className={selectCls}>
                  {["France", "Luxembourg", "Belgique", "Suisse", "Pays-Bas", "Allemagne"].map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Classification investisseur <span className="text-red-400">*</span></label>
                <select value={formData.typeInvestisseur} onChange={(e) => set("typeInvestisseur", e.target.value)} className={selectCls}>
                  <option>Professionnel</option>
                  <option>Averti (well-informed)</option>
                  <option>Institutionnel</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Origine des fonds <span className="text-red-400">*</span></label>
                <select value={formData.origineFonds} onChange={(e) => set("origineFonds", e.target.value)} className={selectCls}>
                  <option value="">Sélectionnez...</option>
                  <option>Revenus d'activité professionnelle</option>
                  <option>Cession d'actifs</option>
                  <option>Héritage / donation</option>
                  <option>Épargne accumulée</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Statut PEP</label>
                <select value={formData.pepStatus} onChange={(e) => set("pepStatus", e.target.value)} className={selectCls}>
                  <option value="non">Non</option>
                  <option value="oui">Oui</option>
                  <option value="proche">Proche d'un PEP</option>
                </select>
              </div>
            </div>

            {/* Documents justificatifs */}
            <div className="mt-6 text-left">
              <label className={labelCls}>Pièces justificatives du client <span className="text-red-400">*</span></label>
              <p className="text-xs text-gray-400 mb-3">Déposez les documents KYC/KYB du client — AMLD5 & CSSF 12-02</p>
              <div className="space-y-2">
                {/* Pièce d'identité */}
                {documents.find((d) => d.type === "Pièce d'identité") ? (
                  <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50/50 rounded-xl p-3 text-sm">
                    <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span className="text-emerald-700 font-medium flex-1">{documents.find((d) => d.type === "Pièce d'identité").name}</span>
                    <span className="text-xs text-emerald-500">{documents.find((d) => d.type === "Pièce d'identité").size}</span>
                    <button onClick={() => window.open(documents.find((d) => d.type === "Pièce d'identité").url, "_blank")} className="text-xs font-medium text-navy hover:text-gold transition-colors">Consulter</button>
                  </div>
                ) : (
                  <>
                    <input type="file" ref={fileRefs.id} onChange={handleFileSelect("Pièce d'identité")} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center hover:border-navy/30 transition-colors cursor-pointer"
                      onClick={() => fileRefs.id.current?.click()}>
                      <p className="text-sm text-gray-400">{personType === "physique" ? "Passeport ou carte d'identité" : "K-bis / Registre de commerce"}</p>
                      <p className="text-xs text-gray-300 mt-0.5">Cliquez pour sélectionner · PDF, JPG, PNG — max 10 Mo</p>
                    </div>
                  </>
                )}

                {/* Justificatif de domicile */}
                {documents.find((d) => d.type === "Justificatif de domicile") ? (
                  <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50/50 rounded-xl p-3 text-sm">
                    <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span className="text-emerald-700 font-medium flex-1">{documents.find((d) => d.type === "Justificatif de domicile").name}</span>
                    <span className="text-xs text-emerald-500">{documents.find((d) => d.type === "Justificatif de domicile").size}</span>
                    <button onClick={() => window.open(documents.find((d) => d.type === "Justificatif de domicile").url, "_blank")} className="text-xs font-medium text-navy hover:text-gold transition-colors">Consulter</button>
                  </div>
                ) : (
                  <>
                    <input type="file" ref={fileRefs.domicile} onChange={handleFileSelect("Justificatif de domicile")} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center hover:border-navy/30 transition-colors cursor-pointer"
                      onClick={() => fileRefs.domicile.current?.click()}>
                      <p className="text-sm text-gray-400">Justificatif de domicile (moins de 3 mois)</p>
                      <p className="text-xs text-gray-300 mt-0.5">Facture énergie, téléphone, avis d'imposition</p>
                    </div>
                  </>
                )}

                {/* Justificatif origine des fonds */}
                {documents.find((d) => d.type === "Justificatif origine des fonds") ? (
                  <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50/50 rounded-xl p-3 text-sm">
                    <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span className="text-emerald-700 font-medium flex-1">{documents.find((d) => d.type === "Justificatif origine des fonds").name}</span>
                    <span className="text-xs text-emerald-500">{documents.find((d) => d.type === "Justificatif origine des fonds").size}</span>
                    <button onClick={() => window.open(documents.find((d) => d.type === "Justificatif origine des fonds").url, "_blank")} className="text-xs font-medium text-navy hover:text-gold transition-colors">Consulter</button>
                  </div>
                ) : (
                  <>
                    <input type="file" ref={fileRefs.fonds} onChange={handleFileSelect("Justificatif origine des fonds")} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center hover:border-navy/30 transition-colors cursor-pointer"
                      onClick={() => fileRefs.fonds.current?.click()}>
                      <p className="text-sm text-gray-400">Justificatif d'origine des fonds</p>
                      <p className="text-xs text-gray-300 mt-0.5">Relevé bancaire, acte de cession, attestation employeur</p>
                    </div>
                  </>
                )}

                {/* Statuts / UBO (personne morale) */}
                {personType === "morale" && (
                  <>
                    {documents.find((d) => d.type === "Statuts société") ? (
                      <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50/50 rounded-xl p-3 text-sm">
                        <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span className="text-emerald-700 font-medium flex-1">{documents.find((d) => d.type === "Statuts société").name}</span>
                        <span className="text-xs text-emerald-500">{documents.find((d) => d.type === "Statuts société").size}</span>
                        <button onClick={() => window.open(documents.find((d) => d.type === "Statuts société").url, "_blank")} className="text-xs font-medium text-navy hover:text-gold transition-colors">Consulter</button>
                      </div>
                    ) : (
                      <>
                        <input type="file" ref={fileRefs.statuts} onChange={handleFileSelect("Statuts société")} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center hover:border-navy/30 transition-colors cursor-pointer"
                          onClick={() => fileRefs.statuts.current?.click()}>
                          <p className="text-sm text-gray-400">Statuts à jour de la société</p>
                          <p className="text-xs text-gray-300 mt-0.5">Dernière version certifiée conforme</p>
                        </div>
                      </>
                    )}
                    {documents.find((d) => d.type === "Déclaration UBO") ? (
                      <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50/50 rounded-xl p-3 text-sm">
                        <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span className="text-emerald-700 font-medium flex-1">{documents.find((d) => d.type === "Déclaration UBO").name}</span>
                        <span className="text-xs text-emerald-500">{documents.find((d) => d.type === "Déclaration UBO").size}</span>
                        <button onClick={() => window.open(documents.find((d) => d.type === "Déclaration UBO").url, "_blank")} className="text-xs font-medium text-navy hover:text-gold transition-colors">Consulter</button>
                      </div>
                    ) : (
                      <>
                        <input type="file" ref={fileRefs.ubo} onChange={handleFileSelect("Déclaration UBO")} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center hover:border-navy/30 transition-colors cursor-pointer"
                          onClick={() => fileRefs.ubo.current?.click()}>
                          <p className="text-sm text-gray-400">Déclaration des bénéficiaires effectifs (UBO)</p>
                          <p className="text-xs text-gray-300 mt-0.5">Formulaire UBO + pièces d'identité des UBO &gt; 25%</p>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {documents.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {documents.length} document{documents.length > 1 ? "s" : ""} déposé{documents.length > 1 ? "s" : ""}
                </div>
              )}
            </div>

            {kycDone ? (
              <div className="mt-6 flex items-center gap-2 text-emerald-600 text-sm font-medium">
                <Badge status="Validé" /> KYC client validé
              </div>
            ) : (
              <button onClick={handleKyc} className="mt-6 bg-navy text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-navy-light transition-colors">
                Lancer la vérification KYC
              </button>
            )}

            {kycDone && (
              <div className="mt-4 flex justify-end">
                <button onClick={() => setStep(1)} className="bg-navy text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-navy-light transition-colors">Continuer →</button>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Payment */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h3 className="text-lg font-semibold text-navy mb-2">Paramètres de souscription</h3>

            <div className="grid grid-cols-2 gap-4 text-left mb-6">
              <div className="col-span-2">
                <label className={labelCls}>Montant <span className="text-red-400">*</span></label>
                <input type="number" value={formData.montant} onChange={(e) => set("montant", Number(e.target.value))} min={100000} step={50000} className={inputCls} />
              </div>
              <button onClick={() => set("shareClass", 1)} className={`p-4 rounded-xl border-2 text-left transition-all ${formData.shareClass === 1 ? "border-navy bg-navy/5" : "border-gray-200"}`}>
                <p className="text-sm font-semibold text-navy">Share Class 1</p>
                <p className="text-xs text-gray-500 mt-1">7-9% · 36 mois · Risque 5/7</p>
              </button>
              <button onClick={() => set("shareClass", 2)} className={`p-4 rounded-xl border-2 text-left transition-all ${formData.shareClass === 2 ? "border-navy bg-navy/5" : "border-gray-200"}`}>
                <p className="text-sm font-semibold text-navy">Share Class 2</p>
                <p className="text-xs text-gray-500 mt-1">5-6% · 24 mois · Risque 4/7</p>
              </button>
            </div>

            <div className="bg-cream rounded-xl p-5 text-left text-sm space-y-2 mb-4">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">Coordonnées bancaires</p>
              <div className="flex justify-between"><span className="text-gray-500">IBAN</span><span className="font-mono text-navy text-xs">LU28 0019 4006 4475 0000</span></div>
              <div className="flex justify-between"><span className="text-gray-500">BIC</span><span className="font-mono text-navy text-xs">BABORLULLXXX</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Référence</span><span className="font-mono text-gold text-xs">{subRef}</span></div>
            </div>

            <div className="mt-4 mb-6">
              {paymentReceived ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Paiement reçu
                </div>
              ) : (
                <button onClick={handlePayment} className="bg-gold/10 text-gold px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gold/20 transition-colors">Simuler réception</button>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(0)} className="text-sm text-gray-500 hover:text-navy transition-colors">← Retour</button>
              {paymentReceived && <button onClick={() => setStep(2)} className="bg-navy text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-navy-light transition-colors">Continuer →</button>}
            </div>
          </div>
        )}

        {/* Step 2: Signature */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h3 className="text-lg font-semibold text-navy mb-2">Signature du bulletin</h3>
            <p className="text-xs text-gray-400 mb-5">Souscription intermédiée — signature du représentant SwissLife</p>

            <div className="bg-cream rounded-xl p-5 text-left text-sm space-y-2 mb-6">
              <div className="flex justify-between"><span className="text-gray-500">Client</span><span className="text-navy font-medium">{(formData.prenom + " " + formData.nom).trim()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Montant</span><span className="text-navy font-medium">{fmt(formData.montant)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Share Class</span><span className="text-navy">Classe {formData.shareClass}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Intermédiaire</span><span className="text-navy font-medium">SwissLife Banque Privée</span></div>
            </div>

            <div className="text-left space-y-3 mb-6">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Consentements</p>
              <Checkbox checked={consents.prospectus} onChange={() => setConsents({ ...consents, prospectus: !consents.prospectus })} required>Prospectus lu et remis au client</Checkbox>
              <Checkbox checked={consents.dici} onChange={() => setConsents({ ...consents, dici: !consents.dici })} required>DIC/KID remis au client (PRIIPs)</Checkbox>
              <Checkbox checked={consents.risques} onChange={() => setConsents({ ...consents, risques: !consents.risques })} required>Client informé des risques de perte en capital</Checkbox>
              <Checkbox checked={consents.illiquidite} onChange={() => setConsents({ ...consents, illiquidite: !consents.illiquidite })} required>Client informé de la nature illiquide</Checkbox>
              <Checkbox checked={consents.fiscalite} onChange={() => setConsents({ ...consents, fiscalite: !consents.fiscalite })} required>Déclarations CRS/FATCA effectuées</Checkbox>
              <Checkbox checked={consents.donnees} onChange={() => setConsents({ ...consents, donnees: !consents.donnees })} required>Consentement RGPD collecté</Checkbox>
            </div>

            {allConsentsChecked && !signed && (
              <div className="mb-6">
                <SignaturePad onSignature={setSignatureData} />
              </div>
            )}

            {!signed ? (
              <button onClick={handleSign} disabled={!canSign} className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${canSign ? "bg-navy text-white hover:bg-navy-light" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                Signer le bulletin intermédiaire
              </button>
            ) : (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-sm font-medium text-emerald-700">Bulletin signé — en attente de validation AIFM</p>
                {pdfUrl && (
                  <button onClick={() => window.open(pdfUrl, "_blank")} className="text-xs font-medium text-gold hover:text-gold-light transition-colors">Voir le PDF</button>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-navy transition-colors">← Retour</button>
              {signed && <button onClick={() => setStep(3)} className="bg-navy text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-navy-light transition-colors">Continuer →</button>}
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-navy">Souscription envoyée</h3>
            <p className="text-sm text-gray-500 mt-1">Ref: {subRef} · En attente de validation AIFM</p>
            <div className="bg-cream rounded-xl p-5 text-sm space-y-2 mt-6 text-left">
              <div className="flex justify-between"><span className="text-gray-500">Client</span><span className="text-navy font-medium">{(formData.prenom + " " + formData.nom).trim()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Montant</span><span className="text-navy font-medium">{fmt(formData.montant)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Parts estimées</span><span className="text-navy font-medium">{(formData.montant / NAV_PER_PART).toFixed(2)}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-tab: Custody ─── */
function Custody({ toast }) {
  const { orders } = useAppContext();
  const validatedOrders = orders.filter((o) => o.status === "validated" && o.intermediaire);
  const totalTokens = validatedOrders.reduce((s, o) => s + Math.floor(o.montant / NAV_PER_PART), 0);
  const totalNav = validatedOrders.reduce((s, o) => s + o.montant, 0);

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-4 gap-4 mb-8">
        <KPICard label="Tokens sous custody" value={totalTokens.toLocaleString("fr-FR")} />
        <KPICard label="Valeur totale AUM" value={fmt(totalNav)} />
        <KPICard label="Clients" value={validatedOrders.length} />
        <KPICard label="Dernière NAV" value={fmtFull(NAV_PER_PART)} />
      </div>

      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {validatedOrders.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Aucun client en custody — les souscriptions validées apparaîtront ici</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3.5 text-xs uppercase tracking-wider text-gray-400 font-semibold">Client</th>
                <th className="px-5 py-3.5 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">Tokens</th>
                <th className="px-5 py-3.5 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">Valeur NAV</th>
                <th className="px-5 py-3.5 text-xs uppercase tracking-wider text-gray-400 font-semibold">Date</th>
                <th className="px-5 py-3.5 text-xs uppercase tracking-wider text-gray-400 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody>
              {validatedOrders.map((o) => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-cream/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-navy">{o.lpName}</td>
                  <td className="px-5 py-3.5 text-right font-mono">{Math.floor(o.montant / NAV_PER_PART).toLocaleString("fr-FR")}</td>
                  <td className="px-5 py-3.5 text-right">{fmt(o.montant)}</td>
                  <td className="px-5 py-3.5 text-gray-500">{o.date}</td>
                  <td className="px-5 py-3.5"><Badge status="Actif" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-tab: Collatéral clients ─── */
function CollateralClients({ toast }) {
  const { orders, collateralPositions, addCollateral } = useAppContext();
  const [selectedClient, setSelectedClient] = useState("");
  const [stakeAmount, setStakeAmount] = useState(100);

  const validatedClients = orders.filter((o) => o.status === "validated");

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-3 gap-4 mb-8">
        <KPICard label="Positions collatérales" value={collateralPositions.length} />
        <KPICard label="Total tokens stakés" value={collateralPositions.reduce((s, p) => s + p.tokens, 0).toLocaleString("fr-FR")} />
        <KPICard label="APY moyen" value="7.6%" />
      </div>

      {/* Existing positions */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6 mb-6">
        <h3 className="text-sm font-semibold text-navy mb-4">Positions actives</h3>
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">Client</th>
              <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">Tokens</th>
              <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">Type</th>
              <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">Pool</th>
              <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">APY</th>
              <th className="pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {collateralPositions.map((p) => (
              <tr key={p.id} className="border-b border-gray-50">
                <td className="py-2.5 font-medium text-navy">{p.owner}</td>
                <td className="py-2.5 text-right font-mono">{p.tokens}</td>
                <td className="py-2.5"><span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${p.type === "Staking" ? "bg-navy/10 text-navy" : "bg-gold/10 text-gold"}`}>{p.type}</span></td>
                <td className="py-2.5 text-gray-500">{p.pool}</td>
                <td className="py-2.5 text-right text-emerald-600 font-medium">{p.apy}%</td>
                <td className="py-2.5 text-gray-500">{p.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New position */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-navy mb-4">Nouvelle mise en collatéral</h3>
        <div className="grid grid-cols-2 gap-4 text-left">
          <div>
            <label className={labelCls}>Client</label>
            <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className={selectCls}>
              <option value="">Sélectionnez un client...</option>
              {validatedClients.map((c) => <option key={c.id} value={c.lpName}>{c.lpName} ({Math.floor(c.montant / NAV_PER_PART)} BF)</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Montant (tokens)</label>
            <input type="number" value={stakeAmount} onChange={(e) => setStakeAmount(Number(e.target.value))} min={1} className={inputCls} />
          </div>
        </div>
        <button
          onClick={() => {
            if (!selectedClient) { toast("Veuillez sélectionner un client"); return; }
            addCollateral({ owner: selectedClient, tokens: stakeAmount, type: "Staking", pool: "BF/ADA", apy: 8.2, date: new Date().toISOString().split("T")[0] });
            toast(`${stakeAmount} BF mis en staking pour ${selectedClient}`);
          }}
          className="mt-4 bg-navy text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-navy-light transition-colors"
        >
          Staker pour le client
        </button>
      </div>
    </div>
  );
}

/* ─── Main SwissLife Portal ─── */
/* ─── Mes Clients tab ─── */
function MesClients({ toast }) {
  const { profile, user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newClient, setNewClient] = useState({ email: "", fullName: "", company: "", password: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (supabase && user) {
      listMyClients()
        .then(setClients)
        .catch((err) => console.error("Failed to load clients:", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleCreateClient = async () => {
    if (!newClient.email || !newClient.fullName || !newClient.password) {
      toast("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setCreating(true);
    try {
      await createClientAccount(newClient);
      toast(`Compte client créé pour ${newClient.fullName}`);
      setNewClient({ email: "", fullName: "", company: "", password: "" });
      setShowForm(false);
      // Refresh client list
      const updated = await listMyClients();
      setClients(updated);
    } catch (err) {
      toast("Erreur : " + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-navy">Clients liés à votre compte</h3>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-navy text-white text-xs rounded-xl hover:bg-navy-light transition-colors">
          {showForm ? "Annuler" : "+ Nouveau client"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6 mb-6">
          <h4 className="text-sm font-semibold text-navy mb-4">Créer un compte client</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nom complet *</label>
              <input value={newClient.fullName} onChange={(e) => setNewClient((p) => ({ ...p, fullName: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" placeholder="Jean Dupont" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
              <input type="email" value={newClient.email} onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" placeholder="client@email.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Mot de passe *</label>
              <input type="password" value={newClient.password} onChange={(e) => setNewClient((p) => ({ ...p, password: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" placeholder="Min. 6 caractères" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Société</label>
              <input value={newClient.company} onChange={(e) => setNewClient((p) => ({ ...p, company: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" placeholder="Optionnel" />
            </div>
          </div>
          <button onClick={handleCreateClient} disabled={creating} className="px-6 py-2 bg-navy text-white text-sm rounded-xl hover:bg-navy-light transition-colors disabled:opacity-50">
            {creating ? "Création…" : "Créer le compte"}
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Chargement…</div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Aucun client enregistré — créez votre premier compte client</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Nom</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Email</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Société</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Créé le</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-cream/50">
                  <td className="px-5 py-3 font-medium text-navy">{c.full_name}</td>
                  <td className="px-5 py-3 text-gray-500">{c.email}</td>
                  <td className="px-5 py-3 text-gray-500">{c.company || "—"}</td>
                  <td className="px-5 py-3 text-gray-400">{c.created_at?.split("T")[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function PortailSwissLife({ toast }) {
  // view: "catalog" | "detail:slug" | "souscription" | "clients" | "custody" | "collateral"
  const [view, setView] = useState("catalog");
  const [selectedFund, setSelectedFund] = useState(null);

  const handleSelectFund = (slug) => setView("detail:" + slug);
  const handleInvest = (fund) => { setSelectedFund(fund); setView("souscription"); };
  const handleBack = () => { setView("catalog"); setSelectedFund(null); };

  const fundSlug = view.startsWith("detail:") ? view.slice(7) : null;
  const showTabs = !["catalog"].includes(view) && !fundSlug;

  return (
    <div>
      {showTabs && (
        <div className="flex border-b border-gray-100 mb-8">
          <button onClick={handleBack} className="px-5 py-3 text-sm text-gray-400 hover:text-navy transition-all font-medium">
            ← Fonds
          </button>
          {[
            { id: "souscription", label: "Souscription intermédiée" },
            { id: "clients", label: "Mes clients" },
            { id: "custody", label: "Custody" },
            { id: "collateral", label: "Collatéral clients" },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setView(tab.id)} className={`px-5 py-3 text-sm font-medium transition-all relative ${view === tab.id ? "text-navy" : "text-gray-400 hover:text-gray-600"}`}>
              {tab.label}
              {view === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-navy rounded-full" />}
            </button>
          ))}
        </div>
      )}

      {view === "catalog" && <FundCatalog onSelectFund={handleSelectFund} />}
      {fundSlug && <FundDetail fundSlug={fundSlug} onBack={handleBack} onInvest={handleInvest} />}
      {view === "souscription" && <SouscriptionIntermediee toast={toast} />}
      {view === "clients" && <MesClients toast={toast} />}
      {view === "custody" && <Custody toast={toast} />}
      {view === "collateral" && <CollateralClients toast={toast} />}
    </div>
  );
}
