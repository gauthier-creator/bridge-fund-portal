import { useState, useCallback, useRef } from "react";
import { NAV_PER_PART } from "../data";
import { generateBulletinPDF } from "../generateBulletin";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  KPICard, Badge, fmt, fmtFull, inputCls, selectCls, labelCls,
  Checkbox, ComplianceAlert, SignaturePad,
} from "../components/shared";
import FundCatalog from "../components/FundCatalog";
import FundDetail from "../components/FundDetail";
import InvestorDashboard from "../components/InvestorDashboard";
import InvestorProfile from "../components/InvestorProfile";

/* ─── Sub-tab: Souscription directe ─── */
function Souscription({ toast, fund }) {
  const { submitOrder } = useAppContext();
  const { profile } = useAuth();
  const [step, setStep] = useState(0);
  const [personType, setPersonType] = useState("morale");

  // Pre-fill from authenticated user profile
  const nameParts = (profile?.full_name || "").split(" ");
  const defaultPrenom = nameParts.slice(0, -1).join(" ") || "";
  const defaultNom = nameParts.slice(-1)[0] || "";

  const [formData, setFormData] = useState({
    nom: defaultNom, prenom: defaultPrenom, societe: profile?.company || "", pays: "France",
    typeInvestisseur: "Professionnel", montant: 250000,
    shareClass: 1, paymentMethod: "fiat",
    dateNaissance: "", nationalite: "Française", adresse: "", codePostal: "", ville: "",
    lei: "", rcs: "", formeJuridique: "SAS",
    beneficiaireNom: "", beneficiairePct: "",
    origineFonds: "", pepStatus: "non", pepDetail: "",
  });
  const [kycStatus, setKycStatus] = useState(null);
  const [amlStatus, setAmlStatus] = useState(null);
  const [eligibilityDone, setEligibilityDone] = useState(false);
  const [eligibilityAnswers, setEligibilityAnswers] = useState({ patrimoine: "", experience: "", horizon: "", risque: "" });
  const [signed, setSigned] = useState(false);
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [subRef] = useState(() => "BF-2026-" + String(Math.floor(Math.random() * 9000) + 1000));
  const [consents, setConsents] = useState({ prospectus: false, dici: false, risques: false, illiquidite: false, donnees: false, fiscalite: false });
  const [documents, setDocuments] = useState([]);
  const fileRefs = { id: useRef(null), domicile: useRef(null), fonds: useRef(null), statuts: useRef(null) };
  const [kycSubStep, setKycSubStep] = useState(0);
  const [signatureData, setSignatureData] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  const steps = ["KYC / KYB", "Virement", "Signature", "Confirmation"];
  const allConsentsChecked = Object.values(consents).every(Boolean);
  const canSign = allConsentsChecked && signatureData;
  const set = (key, val) => setFormData((prev) => ({ ...prev, [key]: val }));

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

  const handleKycSubmit = () => {
    setKycStatus("En attente");
    toast("Vérification d'identité en cours — screening AML/CFT lancé");
    setTimeout(() => { setKycStatus("Validé"); toast("KYC validé — identité vérifiée, aucune alerte AML"); }, 1800);
    setTimeout(() => { setAmlStatus("clear"); toast("Screening AML/CFT terminé — aucune correspondance PEP/sanctions"); }, 2800);
  };

  const handleEligibility = () => {
    if (!eligibilityAnswers.patrimoine || !eligibilityAnswers.experience || !eligibilityAnswers.horizon || !eligibilityAnswers.risque) {
      toast("Veuillez compléter toutes les questions d'éligibilité"); return;
    }
    setEligibilityDone(true);
    toast("Éligibilité confirmée — profil investisseur qualifié validé (MiFID II)");
  };

  const handlePaymentSent = () => {
    toast("Virement en cours de vérification — contrôle origine des fonds");
    setTimeout(() => { setPaymentReceived(true); toast("Virement reçu et validé — €" + formData.montant.toLocaleString("fr-FR") + " · origine des fonds conforme"); }, 2500);
  };

  const handleSign = async () => {
    const doc = generateBulletinPDF({ formData, subRef, personType, signatureDataUrl: signatureData });
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    setSigned(true);
    toast("Bulletin de souscription signé électroniquement via eIDAS");

    submitOrder({
      id: subRef,
      type: "direct",
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
      codePostal: formData.codePostal || null,
      ville: formData.ville || null,
      pepStatus: formData.pepStatus,
      pepDetail: formData.pepDetail || null,
      dateNaissance: formData.dateNaissance || null,
      nationalite: formData.nationalite || null,
      formeJuridique: formData.formeJuridique || null,
      rcs: formData.rcs || null,
      lei: formData.lei || null,
      beneficiaireNom: formData.beneficiaireNom || null,
      beneficiairePct: formData.beneficiairePct || null,
      paymentMethod: formData.paymentMethod || "fiat",
      documents,
    });
  };

  const handleDownloadPDF = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `Bulletin_Souscription_${subRef}.pdf`;
    a.click();
    toast("PDF téléchargé — " + `Bulletin_Souscription_${subRef}.pdf`);
  };

  const handlePreviewPDF = () => {
    const doc = generateBulletinPDF({ formData, subRef, personType, signatureDataUrl: null });
    const blob = doc.output("blob");
    window.open(URL.createObjectURL(blob), "_blank");
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

        {/* ── STEP 0: KYC/KYB ── */}
        {step === 0 && (
          <div className="animate-fade-in">
            <h3 className="text-lg font-semibold text-navy mb-2">Vérification d'identité</h3>
            <p className="text-xs text-gray-400 mb-5">Conformément à la directive (UE) 2015/849 (AMLD5) et au règlement CSSF 12-02</p>

            <div className="flex border-b border-gray-100 mb-6">
              {[{ i: 0, label: "Identité" }, { i: 1, label: "Compliance AML" }, { i: 2, label: "Éligibilité investisseur" }].map(({ i, label }) => (
                <button key={i} onClick={() => setKycSubStep(i)} className={`px-4 py-2 text-xs font-medium transition-all relative ${kycSubStep === i ? "text-navy" : "text-gray-400"}`}>
                  {label}
                  {kycSubStep === i && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-navy rounded-full" />}
                </button>
              ))}
            </div>

            {/* Sub-step 0: Identité */}
            {kycSubStep === 0 && (
              <div className="animate-fade-in">
                <div className="flex bg-cream rounded-xl p-1 mb-6 max-w-xs mx-auto">
                  <button onClick={() => setPersonType("physique")} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${personType === "physique" ? "bg-white text-navy shadow-sm" : "text-gray-500"}`}>Personne physique</button>
                  <button onClick={() => setPersonType("morale")} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${personType === "morale" ? "bg-white text-navy shadow-sm" : "text-gray-500"}`}>Personne morale</button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <label className={labelCls}>Nom <span className="text-red-400">*</span></label>
                    <input type="text" value={formData.nom} onChange={(e) => set("nom", e.target.value)} placeholder="Dupont" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Prénom <span className="text-red-400">*</span></label>
                    <input type="text" value={formData.prenom} onChange={(e) => set("prenom", e.target.value)} placeholder="Jean-Marc" className={inputCls} />
                  </div>

                  {personType === "physique" && (
                    <>
                      <div>
                        <label className={labelCls}>Date de naissance <span className="text-red-400">*</span></label>
                        <input type="date" value={formData.dateNaissance} onChange={(e) => set("dateNaissance", e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Nationalité <span className="text-red-400">*</span></label>
                        <select value={formData.nationalite} onChange={(e) => set("nationalite", e.target.value)} className={selectCls}>
                          {["Française", "Luxembourgeoise", "Belge", "Suisse", "Néerlandaise", "Allemande", "Autre"].map((n) => <option key={n}>{n}</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  {personType === "morale" && (
                    <>
                      <div className="col-span-2">
                        <label className={labelCls}>Dénomination sociale <span className="text-red-400">*</span></label>
                        <input type="text" value={formData.societe} onChange={(e) => set("societe", e.target.value)} placeholder="Dupont Patrimoine SAS" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Forme juridique</label>
                        <select value={formData.formeJuridique} onChange={(e) => set("formeJuridique", e.target.value)} className={selectCls}>
                          {["SAS", "SARL", "SA", "SCI", "GmbH", "AG", "BV", "LP", "Autre"].map((f) => <option key={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>N° RCS / Registre</label>
                        <input type="text" value={formData.rcs} onChange={(e) => set("rcs", e.target.value)} placeholder="B 123456" className={inputCls} />
                      </div>
                      <div className="col-span-2">
                        <label className={labelCls}>Code LEI (Legal Entity Identifier)</label>
                        <input type="text" value={formData.lei} onChange={(e) => set("lei", e.target.value)} placeholder="5493001KJTIIGC8Y1R12" maxLength={20} className={inputCls} />
                        <p className="text-xs text-gray-300 mt-1">20 caractères alphanumériques — obligatoire pour les entités MiFID II</p>
                      </div>
                    </>
                  )}

                  <div className="col-span-2">
                    <label className={labelCls}>Adresse <span className="text-red-400">*</span></label>
                    <input type="text" value={formData.adresse} onChange={(e) => set("adresse", e.target.value)} placeholder="12 avenue des Champs-Élysées" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Code postal</label>
                    <input type="text" value={formData.codePostal} onChange={(e) => set("codePostal", e.target.value)} placeholder="75008" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Ville</label>
                    <input type="text" value={formData.ville} onChange={(e) => set("ville", e.target.value)} placeholder="Paris" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Pays de résidence <span className="text-red-400">*</span></label>
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

                  <div className="col-span-2 space-y-3">
                    <label className={labelCls}>Documents justificatifs <span className="text-red-400">*</span></label>

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
                          <p className="text-sm text-gray-400">{personType === "physique" ? "Passeport ou carte d'identité" : "Extrait K-bis / Registre de commerce"}</p>
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

                    {/* Statuts (personne morale) */}
                    {personType === "morale" && (
                      documents.find((d) => d.type === "Statuts société") ? (
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
                            <p className="text-sm text-gray-400">Statuts à jour + liste des bénéficiaires effectifs</p>
                            <p className="text-xs text-gray-300 mt-0.5">PDF — max 10 Mo</p>
                          </div>
                        </>
                      )
                    )}

                    {documents.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {documents.length} document{documents.length > 1 ? "s" : ""} déposé{documents.length > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button onClick={() => setKycSubStep(1)} className="bg-navy text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-navy-light transition-colors">
                    Suivant : Compliance →
                  </button>
                </div>
              </div>
            )}

            {/* Sub-step 1: Compliance AML */}
            {kycSubStep === 1 && (
              <div className="animate-fade-in text-left space-y-5">
                <ComplianceAlert type="info">
                  <strong>Obligations réglementaires</strong> — En application de la loi luxembourgeoise du 12 novembre 2004 relative à la lutte contre le blanchiment et le financement du terrorisme, nous devons collecter les informations suivantes.
                </ComplianceAlert>

                <div>
                  <label className={labelCls}>Personne Politiquement Exposée (PEP) <span className="text-red-400">*</span></label>
                  <p className="text-xs text-gray-400 mb-2">Exercez-vous ou avez-vous exercé au cours des 12 derniers mois une fonction politique, juridictionnelle ou administrative de haut niveau ?</p>
                  <div className="flex gap-3">
                    {[{ val: "non", label: "Non" }, { val: "oui", label: "Oui, PEP directe" }, { val: "proche", label: "Oui, proche d'un PEP" }].map(({ val, label }) => (
                      <button key={val} onClick={() => set("pepStatus", val)} className={`px-4 py-2 rounded-xl text-xs font-medium border-2 transition-all ${formData.pepStatus === val ? "border-navy bg-navy/5 text-navy" : "border-gray-200 text-gray-500"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {formData.pepStatus !== "non" && (
                    <div className="mt-3">
                      <input type="text" value={formData.pepDetail} onChange={(e) => set("pepDetail", e.target.value)} placeholder="Précisez la fonction exercée et la période" className={inputCls} />
                    </div>
                  )}
                </div>

                <div>
                  <label className={labelCls}>Origine des fonds investis <span className="text-red-400">*</span></label>
                  <select value={formData.origineFonds} onChange={(e) => set("origineFonds", e.target.value)} className={selectCls}>
                    <option value="">Sélectionnez...</option>
                    <option>Revenus d'activité professionnelle</option>
                    <option>Cession d'actifs immobiliers</option>
                    <option>Cession d'actifs financiers / entreprise</option>
                    <option>Héritage / donation</option>
                    <option>Épargne accumulée</option>
                    <option>Autre (à préciser)</option>
                  </select>
                </div>

                {personType === "morale" && (
                  <div>
                    <label className={labelCls}>Bénéficiaire(s) effectif(s) — UBO <span className="text-red-400">*</span></label>
                    <p className="text-xs text-gray-400 mb-2">Toute personne physique détenant directement ou indirectement plus de 25% du capital ou des droits de vote</p>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={formData.beneficiaireNom} onChange={(e) => set("beneficiaireNom", e.target.value)} placeholder="Nom complet du bénéficiaire" className={inputCls} />
                      <input type="text" value={formData.beneficiairePct} onChange={(e) => set("beneficiairePct", e.target.value)} placeholder="% de détention (ex: 65%)" className={inputCls} />
                    </div>
                    <button onClick={() => toast("Bénéficiaire effectif ajouté")} className="mt-2 text-xs text-navy font-medium hover:underline">+ Ajouter un autre bénéficiaire</button>
                  </div>
                )}

                <ComplianceAlert type="warning">
                  <strong>Échange automatique d'informations (CRS/FATCA)</strong> — Les informations relatives à ce compte seront communiquées aux autorités fiscales compétentes conformément aux accords CRS et FATCA.
                </ComplianceAlert>

                {kycStatus && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge status={kycStatus} />
                      <span className="text-xs text-gray-500">Vérification d'identité</span>
                    </div>
                    {amlStatus === "clear" && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">AML Clear</span>
                        <span className="text-xs text-gray-500">Screening sanctions / PEP / médias négatifs</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <button onClick={() => setKycSubStep(0)} className="text-sm text-gray-500 hover:text-navy transition-colors">← Identité</button>
                  <div className="flex gap-3">
                    {!kycStatus && <button onClick={handleKycSubmit} className="bg-navy text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-navy-light transition-colors">Lancer la vérification KYC / AML</button>}
                    {amlStatus === "clear" && <button onClick={() => setKycSubStep(2)} className="bg-navy text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-navy-light transition-colors">Suivant : Éligibilité →</button>}
                  </div>
                </div>
              </div>
            )}

            {/* Sub-step 2: Éligibilité */}
            {kycSubStep === 2 && (
              <div className="animate-fade-in text-left space-y-5">
                <ComplianceAlert type="info">
                  <strong>Test d'adéquation — MiFID II / Loi du 5 avril 1993</strong> — Ce questionnaire détermine si l'investissement dans le Bridge Fund est adapté à votre profil.
                </ComplianceAlert>

                <div>
                  <label className={labelCls}>Patrimoine financier net (hors résidence principale) <span className="text-red-400">*</span></label>
                  <select value={eligibilityAnswers.patrimoine} onChange={(e) => setEligibilityAnswers({ ...eligibilityAnswers, patrimoine: e.target.value })} className={selectCls}>
                    <option value="">Sélectionnez...</option>
                    <option value="<500k">Moins de 500 000 €</option>
                    <option value="500k-1m">500 000 € — 1 000 000 €</option>
                    <option value="1m-5m">1 000 000 € — 5 000 000 €</option>
                    <option value=">5m">Plus de 5 000 000 €</option>
                  </select>
                  {eligibilityAnswers.patrimoine === "<500k" && <ComplianceAlert type="warning"><strong>Attention</strong> — Le seuil minimum pour les investisseurs avertis est fixé à 100 000 € avec une déclaration d'expertise.</ComplianceAlert>}
                </div>

                <div>
                  <label className={labelCls}>Expérience en produits de dette / crédit privé <span className="text-red-400">*</span></label>
                  <select value={eligibilityAnswers.experience} onChange={(e) => setEligibilityAnswers({ ...eligibilityAnswers, experience: e.target.value })} className={selectCls}>
                    <option value="">Sélectionnez...</option>
                    <option value="none">Aucune expérience</option>
                    <option value="basic">Connaissances de base (1-3 ans)</option>
                    <option value="advanced">Expérience significative (3-10 ans)</option>
                    <option value="expert">Expert / professionnel du secteur</option>
                  </select>
                  {eligibilityAnswers.experience === "none" && <ComplianceAlert type="error"><strong>Investissement potentiellement inadapté</strong> — Une expérience préalable en dette privée est recommandée.</ComplianceAlert>}
                </div>

                <div>
                  <label className={labelCls}>Horizon d'investissement envisagé <span className="text-red-400">*</span></label>
                  <select value={eligibilityAnswers.horizon} onChange={(e) => setEligibilityAnswers({ ...eligibilityAnswers, horizon: e.target.value })} className={selectCls}>
                    <option value="">Sélectionnez...</option>
                    <option value="<1y">Moins de 1 an</option>
                    <option value="1-3y">1 à 3 ans</option>
                    <option value="3-5y">3 à 5 ans</option>
                    <option value=">5y">Plus de 5 ans</option>
                  </select>
                  {eligibilityAnswers.horizon === "<1y" && <ComplianceAlert type="warning">La durée minimale recommandée est de 24 mois (Share Class 2) à 36 mois (Share Class 1).</ComplianceAlert>}
                </div>

                <div>
                  <label className={labelCls}>Tolérance au risque <span className="text-red-400">*</span></label>
                  <select value={eligibilityAnswers.risque} onChange={(e) => setEligibilityAnswers({ ...eligibilityAnswers, risque: e.target.value })} className={selectCls}>
                    <option value="">Sélectionnez...</option>
                    <option value="conservative">Conservateur — préservation du capital</option>
                    <option value="balanced">Équilibré — rendement modéré avec risque mesuré</option>
                    <option value="dynamic">Dynamique — rendement élevé, tolérance aux pertes</option>
                    <option value="aggressive">Agressif — maximisation du rendement</option>
                  </select>
                </div>

                {eligibilityDone && (
                  <ComplianceAlert type="success">
                    <strong>Éligibilité confirmée</strong> — Votre profil est compatible avec un investissement dans le Bridge Fund SCSp.
                  </ComplianceAlert>
                )}

                <div className="flex justify-between pt-2">
                  <button onClick={() => setKycSubStep(1)} className="text-sm text-gray-500 hover:text-navy transition-colors">← Compliance</button>
                  <div className="flex gap-3">
                    {!eligibilityDone && <button onClick={handleEligibility} className="bg-navy text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-navy-light transition-colors">Valider l'éligibilité</button>}
                    {eligibilityDone && <button onClick={() => setStep(1)} className="bg-navy text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-navy-light transition-colors">Continuer vers le virement →</button>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 1: Virement ── */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h3 className="text-lg font-semibold text-navy mb-2">Instruction de paiement</h3>
            <p className="text-xs text-gray-400 mb-5">Le virement doit provenir d'un compte au nom du souscripteur (AMLD5 art. 18)</p>

            <div className="flex bg-cream rounded-xl p-1 mb-6 max-w-xs mx-auto">
              <button onClick={() => set("paymentMethod", "fiat")} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${formData.paymentMethod === "fiat" ? "bg-white text-navy shadow-sm" : "text-gray-500"}`}>Virement EUR</button>
              <button onClick={() => set("paymentMethod", "crypto")} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${formData.paymentMethod === "crypto" ? "bg-white text-navy shadow-sm" : "text-gray-500"}`}>Crypto (ADA)</button>
            </div>

            <div className="mb-6">
              <label className="block text-xs text-gray-500 mb-1 font-medium text-left">Montant de souscription <span className="text-red-400">*</span></label>
              <div className="relative">
                <input type="number" value={formData.montant} onChange={(e) => set("montant", Number(e.target.value))} min={100000} step={50000} className={inputCls} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">min. €100 000</span>
              </div>
              {formData.montant < 100000 && formData.montant > 0 && <p className="text-xs text-red-500 mt-1 text-left">Le montant minimum de souscription est de €100 000</p>}
            </div>

            <div className="flex gap-4 mb-6">
              <button onClick={() => set("shareClass", 1)} className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${formData.shareClass === 1 ? "border-navy bg-navy/5" : "border-gray-200"}`}>
                <p className="text-sm font-semibold text-navy">Share Class 1</p>
                <p className="text-xs text-gray-500 mt-1">Rendement cible 7-9% · Durée 36 mois</p>
                <p className="text-xs text-gray-400 mt-0.5">Profil : dynamique · Risque : 5/7</p>
              </button>
              <button onClick={() => set("shareClass", 2)} className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${formData.shareClass === 2 ? "border-navy bg-navy/5" : "border-gray-200"}`}>
                <p className="text-sm font-semibold text-navy">Share Class 2</p>
                <p className="text-xs text-gray-500 mt-1">Rendement cible 5-6% · Durée 24 mois</p>
                <p className="text-xs text-gray-400 mt-0.5">Profil : équilibré · Risque : 4/7</p>
              </button>
            </div>

            {formData.paymentMethod === "fiat" ? (
              <div className="bg-cream rounded-xl p-5 text-left text-sm space-y-2">
                <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">Coordonnées bancaires — Ebury Partners Belgium NV/SA</p>
                <div className="flex justify-between"><span className="text-gray-500">IBAN</span><span className="font-mono text-navy text-xs">LU28 0019 4006 4475 0000</span></div>
                <div className="flex justify-between"><span className="text-gray-500">BIC / SWIFT</span><span className="font-mono text-navy text-xs">BABORLULLXXX</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Bénéficiaire</span><span className="text-navy">Bridge Fund SCSp</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Référence</span><span className="font-mono text-gold text-xs">{subRef}</span></div>
              </div>
            ) : (
              <div className="bg-cream rounded-xl p-5 text-left text-sm space-y-2">
                <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">Wallet de dépôt — Kraken Institutional (Travel Rule compliant)</p>
                <div className="flex justify-between"><span className="text-gray-500">Réseau</span><span className="text-navy">Cardano (ADA)</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Adresse</span><span className="font-mono text-navy text-xs">addr1q92hn8f...4m7xk2</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Memo</span><span className="font-mono text-gold text-xs">BFUND-SUB</span></div>
              </div>
            )}

            {formData.paymentMethod === "crypto" && (
              <ComplianceAlert type="warning">
                <strong>Travel Rule (Règlement TFR 2023/1113)</strong> — Pour les transferts crypto supérieurs à 1 000 €, les informations du donneur d'ordre et du bénéficiaire seront transmises conformément au règlement européen.
              </ComplianceAlert>
            )}

            <div className="mt-4">
              {paymentReceived ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Paiement reçu — origine des fonds vérifiée
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-amber-600 text-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-500 pulse-dot" /> En attente de réception et vérification
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(0)} className="text-sm text-gray-500 hover:text-navy transition-colors">← Retour</button>
              <div className="flex gap-3">
                {!paymentReceived && <button onClick={handlePaymentSent} className="bg-gold/10 text-gold px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gold/20 transition-colors">Simuler réception</button>}
                {paymentReceived && <button onClick={() => setStep(2)} className="bg-navy text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-navy-light transition-colors">Continuer →</button>}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Signature ── */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h3 className="text-lg font-semibold text-navy mb-2">Bulletin de souscription</h3>
            <p className="text-xs text-gray-400 mb-5">Signature électronique qualifiée au sens du règlement eIDAS (UE) 910/2014</p>

            <div className="flex items-center justify-between mb-5">
              <p className="text-xs text-gray-500">Le bulletin PDF sera généré avec votre signature à la validation.</p>
              <button onClick={handlePreviewPDF} className="flex items-center gap-1.5 text-xs font-medium text-navy hover:text-gold transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                Aperçu PDF
              </button>
            </div>

            <div className="bg-cream rounded-xl p-6 text-left text-sm space-y-3 mb-6">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">Termes clés de la souscription</p>
              {[
                ["Fonds", "Bridge Fund SCSp — SLP"],
                ["AIFM", "Bridge Fund Management S.à r.l."],
                ["Dépositaire", "SwissLife Banque Privée"],
                ["Share Class", `Classe ${formData.shareClass}`],
                ["Montant souscrit", fmt(formData.montant)],
                ["Rendement cible", (formData.shareClass === 1 ? "7 – 9%" : "5 – 6%") + " net"],
                ["Durée", formData.shareClass === 1 ? "36 mois" : "24 mois"],
                ["Lock-up", formData.shareClass === 1 ? "12 mois" : "6 mois"],
                ["Frais de gestion", "1.5% / an"],
                ["Commission de performance", "15% au-delà du hurdle rate (5%)"],
                ["Juridiction / Régulateur", "Luxembourg · CSSF"],
                ["Tokenisation", "Cardano · CIP-68 · registre on-chain"],
              ].map(([label, value], i) => (
                <div key={i} className={`flex justify-between py-1 ${i < 11 ? "border-b border-gray-200" : ""}`}>
                  <span className="text-gray-500">{label}</span>
                  <span className={`text-navy font-medium ${label === "Rendement cible" ? "text-gold" : ""}`}>{value}</span>
                </div>
              ))}
            </div>

            <div className="bg-red-50/50 border border-red-100 rounded-xl p-5 text-left mb-6">
              <p className="text-xs uppercase tracking-wider text-red-400 font-semibold mb-3">Avertissements réglementaires</p>
              <div className="text-xs text-red-700/80 space-y-2 leading-relaxed">
                <p>L'investissement dans le Bridge Fund SCSp comporte un risque de perte en capital partielle ou totale.</p>
                <p>Ce fonds est un FIA réservé aux investisseurs avertis/professionnels au sens de la loi luxembourgeoise du 13 février 2007.</p>
                <p>La liquidité des parts est limitée. La tokenisation ne garantit pas la liquidité sur un marché secondaire.</p>
              </div>
            </div>

            <div className="text-left space-y-3 mb-6">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Consentements obligatoires</p>
              <Checkbox checked={consents.prospectus} onChange={() => setConsents({ ...consents, prospectus: !consents.prospectus })} required>J'ai lu et compris le <span className="text-navy font-medium underline">prospectus complet</span> du Bridge Fund SCSp.</Checkbox>
              <Checkbox checked={consents.dici} onChange={() => setConsents({ ...consents, dici: !consents.dici })} required>J'ai pris connaissance du <span className="text-navy font-medium underline">Document d'Informations Clés (DIC/KID)</span> conformément au règlement PRIIPs.</Checkbox>
              <Checkbox checked={consents.risques} onChange={() => setConsents({ ...consents, risques: !consents.risques })} required>Je reconnais que cet investissement comporte un <strong>risque de perte en capital</strong>.</Checkbox>
              <Checkbox checked={consents.illiquidite} onChange={() => setConsents({ ...consents, illiquidite: !consents.illiquidite })} required>Je comprends la <strong>nature illiquide</strong> de cet investissement et la période de lock-up applicable.</Checkbox>
              <Checkbox checked={consents.fiscalite} onChange={() => setConsents({ ...consents, fiscalite: !consents.fiscalite })} required>Je reconnais avoir été informé(e) des <strong>implications fiscales</strong> et des déclarations CRS/FATCA.</Checkbox>
              <Checkbox checked={consents.donnees} onChange={() => setConsents({ ...consents, donnees: !consents.donnees })} required>J'autorise le traitement de mes données personnelles conformément au <strong>RGPD (UE) 2016/679</strong>.</Checkbox>
            </div>

            {!allConsentsChecked && <p className="text-xs text-amber-600 text-left mb-4">Tous les consentements sont requis pour procéder à la signature.</p>}

            {allConsentsChecked && !signed && (
              <div className="mb-6">
                <SignaturePad onSignature={setSignatureData} />
                {signatureData && (
                  <div className="mt-3 flex items-center gap-2 text-emerald-600 text-xs font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Signature capturée
                  </div>
                )}
              </div>
            )}

            {!signed ? (
              <button onClick={handleSign} disabled={!canSign} className={`w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${canSign ? "bg-navy text-white hover:bg-navy-light" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Signer et générer le bulletin PDF
              </button>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-sm font-medium text-emerald-700">Bulletin signé avec succès</p>
                  <p className="text-xs text-gray-400 mt-1">Signature qualifiée eIDAS · horodatage : {new Date().toLocaleString("fr-FR")}</p>
                </div>
                {pdfUrl && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-cream px-4 py-2 flex items-center justify-between border-b border-gray-200">
                      <span className="text-xs font-medium text-navy">Bulletin_Souscription_{subRef}.pdf</span>
                      <div className="flex gap-2">
                        <button onClick={() => window.open(pdfUrl, "_blank")} className="text-xs text-gray-500 hover:text-navy transition-colors">Ouvrir</button>
                        <button onClick={handleDownloadPDF} className="text-xs font-medium text-gold hover:text-gold-light transition-colors">Télécharger</button>
                      </div>
                    </div>
                    <iframe src={pdfUrl} className="w-full border-0" style={{ height: 400 }} title="Bulletin de souscription" />
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-navy transition-colors">← Retour</button>
              {signed && <button onClick={() => setStep(3)} className="bg-navy text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-navy-light transition-colors">Continuer →</button>}
            </div>
          </div>
        )}

        {/* ── STEP 3: Confirmation ── */}
        {step === 3 && (
          <div className="animate-fade-in text-left">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-navy">Souscription confirmée</h3>
              <p className="text-sm text-gray-500 mt-1">Votre investissement est en cours de traitement</p>
            </div>

            <div className="bg-cream rounded-xl p-5 text-sm space-y-2 mb-6">
              <div className="flex justify-between"><span className="text-gray-500">N° de souscription</span><span className="font-mono text-navy">{subRef}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Montant</span><span className="text-navy font-medium">{fmt(formData.montant)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Share Class</span><span className="text-navy">Classe {formData.shareClass}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Parts estimées</span><span className="text-navy font-medium">{(formData.montant / NAV_PER_PART).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">NAV / part</span><span className="text-gold font-medium">{fmtFull(NAV_PER_PART)}</span></div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Badge status="En attente" />
              <span className="text-xs text-gray-400">En attente de validation AIFM — puis émission on-chain</span>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Workflow compliance & émission</p>
              {[
                { label: "KYC/KYB validé", sub: "Identité vérifiée", done: true },
                { label: "Screening AML/CFT", sub: "PEP, sanctions, médias négatifs — clear", done: true },
                { label: "Éligibilité investisseur", sub: "MiFID II — profil adéquat", done: true },
                { label: "Origine des fonds vérifiée", sub: "Conformité AMLD5", done: true },
                { label: "Paiement reçu et réconcilié", sub: fmt(formData.montant) + " — compte ségrégué", done: true },
                { label: "Bulletin signé (eIDAS)", sub: "Signature qualifiée horodatée", done: true },
                { label: "Validation AIFM", sub: "Approbation du gestionnaire", done: false },
                { label: "Émission des tokens", sub: "Mint on-chain Cardano · CIP-68", done: false },
                { label: "Transfert au custodian", sub: "SwissLife Banque Privée — custody wallet", done: false },
                { label: "Inscription au registre", sub: "Registre des LP mis à jour", done: false },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${item.done ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                    {item.done ? "✓" : i + 1}
                  </div>
                  <div>
                    <span className={`text-sm font-medium ${item.done ? "text-navy" : "text-gray-400"}`}>{item.label}</span>
                    <p className={`text-xs ${item.done ? "text-gray-400" : "text-gray-300"}`}>{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <ComplianceAlert type="info">
                <strong>Droit de rétractation</strong> — Vous disposez d'un délai de 14 jours calendaires pour exercer votre droit de rétractation sans pénalité.
              </ComplianceAlert>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-tab: Collatéral / DeFi ─── */
function Collateral({ toast }) {
  const { collateralPositions, addCollateral } = useAppContext();
  const [stakeAmount, setStakeAmount] = useState(100);
  const [swapFrom, setSwapFrom] = useState(50);
  const lpBalance = 479;
  const stakedBalance = collateralPositions.filter((p) => p.owner === "Dupont Patrimoine SAS").reduce((s, p) => s + p.tokens, 0);
  const bfPrice = 2.44;

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Votre solde Bridge Fund</p>
            <p className="text-3xl font-semibold text-navy mt-1">{lpBalance} <span className="text-lg text-gray-400">BF</span></p>
            <p className="text-sm text-gray-400 mt-1">≈ {fmt(lpBalance * NAV_PER_PART)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Tokens stakés</p>
            <p className="text-xl font-semibold text-gold">{stakedBalance} BF</p>
            <p className="text-xs text-gray-400 mt-1">Disponible : {lpBalance - stakedBalance} BF</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Staking */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-navy">Staking</h3>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">APY 8.2%</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">Pool de liquidité BF / ADA — Cardano DEX</p>
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Montant à staker</span>
              <span className="font-mono">{stakeAmount} BF</span>
            </div>
            <input type="range" min={0} max={lpBalance - stakedBalance} value={stakeAmount} onChange={(e) => setStakeAmount(Number(e.target.value))} className="w-full accent-navy h-1.5 rounded-full" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0</span>
              <span>{lpBalance - stakedBalance} BF</span>
            </div>
          </div>
          <div className="bg-cream rounded-xl p-3 text-xs space-y-1 mb-4">
            <div className="flex justify-between"><span className="text-gray-500">Rendement estimé (30j)</span><span className="text-navy font-medium">{(stakeAmount * 0.082 / 12).toFixed(2)} BF</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Pool TVL</span><span className="text-navy">1.2M ADA</span></div>
          </div>
          <button onClick={() => { addCollateral({ owner: "Dupont Patrimoine SAS", tokens: stakeAmount, type: "Staking", pool: "BF/ADA", apy: 8.2, date: new Date().toISOString().split("T")[0] }); toast(`${stakeAmount} BF stakés avec succès dans le pool BF/ADA`); }} className="w-full bg-navy text-white py-2.5 rounded-xl text-sm font-medium hover:bg-navy-light transition-colors">
            Staker mes tokens
          </button>
        </div>

        {/* Swap */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-navy mb-4">Swap</h3>
          <p className="text-xs text-gray-400 mb-4">Échangez vos tokens sur le marché secondaire</p>
          <div className="bg-cream rounded-xl p-4 mb-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Vous envoyez</span>
              <span>Solde : {lpBalance - stakedBalance} BF</span>
            </div>
            <div className="flex items-center gap-3">
              <input type="number" value={swapFrom} onChange={(e) => setSwapFrom(Number(e.target.value))} className="flex-1 bg-transparent text-xl font-semibold text-navy outline-none" />
              <span className="bg-navy text-white px-3 py-1 rounded-lg text-sm font-medium">BF</span>
            </div>
          </div>
          <div className="flex justify-center my-2">
            <div className="w-8 h-8 bg-cream rounded-full flex items-center justify-center text-gray-400">↓</div>
          </div>
          <div className="bg-cream rounded-xl p-4 mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Vous recevez (estimé)</span></div>
            <div className="flex items-center gap-3">
              <span className="flex-1 text-xl font-semibold text-navy">{(swapFrom * bfPrice).toFixed(2)}</span>
              <span className="bg-gold/20 text-gold px-3 py-1 rounded-lg text-sm font-medium">ADA</span>
            </div>
          </div>
          <div className="bg-cream/50 rounded-xl p-3 text-xs space-y-1 mb-4">
            <div className="flex justify-between"><span className="text-gray-500">Prix</span><span className="text-navy">1 BF = {bfPrice} ADA</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Slippage max</span><span className="text-navy">0.5%</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Frais réseau</span><span className="text-navy">~0.17 ADA</span></div>
          </div>
          <button onClick={() => toast(`Swap exécuté — ${swapFrom} BF → ${(swapFrom * bfPrice).toFixed(2)} ADA`)} className="w-full bg-gold text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gold-light transition-colors">Swap</button>
        </div>
      </div>

      {/* Price info */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-navy">Prix BF / ADA</h3>
            <p className="text-xs text-gray-400">Cours actuel</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold text-navy">{bfPrice} ADA</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main LP Portal ─── */
export default function PortailLP({ toast }) {
  // Main section: "dashboard" | "funds" | "profile"
  const [section, setSection] = useState("dashboard");
  // Fund sub-view: "catalog" | "detail:slug" | "subscribe" | "collateral"
  const [fundView, setFundView] = useState("catalog");
  const [selectedFund, setSelectedFund] = useState(null);

  const handleSelectFund = (slug) => setFundView("detail:" + slug);
  const handleInvest = (fund) => { setSelectedFund(fund); setFundView("subscribe"); };
  const handleBackToFunds = () => { setFundView("catalog"); setSelectedFund(null); };

  // Extract slug from fund view
  const fundSlug = fundView.startsWith("detail:") ? fundView.slice(7) : null;

  // Show fund sub-tabs only when in subscribe/collateral mode
  const showFundSubTabs = fundView === "subscribe" || fundView === "collateral";

  // Main navigation tabs
  const mainTabs = [
    { id: "dashboard", label: "Tableau de bord", icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" /></svg>
    )},
    { id: "funds", label: "Fonds", icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    )},
    { id: "profile", label: "Mon profil", icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    )},
  ];

  return (
    <div>
      {/* Main navigation */}
      <div className="flex border-b border-gray-100 mb-8">
        {mainTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setSection(tab.id); if (tab.id === "funds") { setFundView("catalog"); setSelectedFund(null); } }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all relative ${section === tab.id ? "text-navy" : "text-gray-400 hover:text-gray-600"}`}
          >
            {tab.icon}
            {tab.label}
            {section === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-navy rounded-full" />}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {section === "dashboard" && (
        <InvestorDashboard onViewFund={(slug) => { setSection("funds"); setFundView("detail:" + slug); }} />
      )}

      {/* Funds section */}
      {section === "funds" && (
        <>
          {showFundSubTabs && (
            <div className="flex border-b border-gray-100 mb-8">
              <button onClick={handleBackToFunds} className="px-5 py-3 text-sm text-gray-400 hover:text-navy transition-all font-medium">
                ← Fonds
              </button>
              {[
                { id: "subscribe", label: "Souscription directe" },
                { id: "collateral", label: "Collatéral & DeFi" },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setFundView(tab.id)} className={`px-5 py-3 text-sm font-medium transition-all relative ${fundView === tab.id ? "text-navy" : "text-gray-400 hover:text-gray-600"}`}>
                  {tab.label}
                  {fundView === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-navy rounded-full" />}
                </button>
              ))}
            </div>
          )}

          {fundView === "catalog" && <FundCatalog onSelectFund={handleSelectFund} />}
          {fundSlug && <FundDetail fundSlug={fundSlug} onBack={handleBackToFunds} onInvest={handleInvest} />}
          {fundView === "subscribe" && <Souscription toast={toast} fund={selectedFund} />}
          {fundView === "collateral" && <Collateral toast={toast} />}
        </>
      )}

      {/* Profile */}
      {section === "profile" && <InvestorProfile toast={toast} />}
    </div>
  );
}
