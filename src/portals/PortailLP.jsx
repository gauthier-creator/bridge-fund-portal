import { useState, useCallback, useRef, useEffect } from "react";
import { NAV_PER_PART } from "../data";
import { generateBulletinPDF } from "../generateBulletin";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { updateUserProfile } from "../services/profileService";
import { mintSynthetic, burnSynthetic, shortenHash, getExplorerUrl } from "../services/cardanoService";
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
    shareClass: 1, /* Class B reserved for intermediaries */ paymentMethod: "fiat",
    dateNaissance: "", nationalite: "Française", adresse: "", codePostal: "", ville: "",
    lei: "", rcs: "", formeJuridique: "SAS",
    beneficiaireNom: "", beneficiairePct: "",
    origineFonds: "", pepStatus: "non", pepDetail: "",
  });
  // Skip KYC entirely if the investor's profile is already validated
  const kycAlreadyDone = profile?.kyc_status === "validated";
  const [kycStatus, setKycStatus] = useState(kycAlreadyDone ? "Validé" : null);
  const [amlStatus, setAmlStatus] = useState(kycAlreadyDone ? "clear" : null);
  const [eligibilityDone, setEligibilityDone] = useState(kycAlreadyDone);
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

  const handleEligibility = async () => {
    if (!eligibilityAnswers.patrimoine || !eligibilityAnswers.experience || !eligibilityAnswers.horizon || !eligibilityAnswers.risque) {
      toast("Veuillez compléter toutes les questions d'éligibilité"); return;
    }
    setEligibilityDone(true);
    toast("Éligibilité confirmée — profil investisseur qualifié validé (MiFID II)");

    // Persist KYC validation so next subscription skips this step
    if (profile?.id) {
      try {
        await updateUserProfile(profile.id, {
          kyc_status: "validated",
          person_type: personType,
          investor_classification: formData.typeInvestisseur,
          source_of_funds: formData.origineFonds,
          pep_status: formData.pepStatus,
          country: formData.pays,
        });
      } catch (err) {
        console.error("Failed to persist KYC status:", err);
      }
    }
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
      fundId: fund?.id || null,
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

            {/* KYC already validated — skip */}
            {kycAlreadyDone ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-sm font-semibold text-emerald-800">KYC/KYB déjà validé</p>
                  <p className="text-xs text-emerald-600 mt-1">Votre identité a été vérifiée lors d'une précédente souscription — aucune action requise</p>
                  {profile?.investor_classification && (
                    <p className="text-xs text-emerald-500 mt-2">Classification : <strong>{profile.investor_classification}</strong></p>
                  )}
                </div>
                <div className="flex justify-end">
                  <button onClick={() => setStep(1)} className="bg-navy text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-navy-light transition-colors">
                    Continuer vers le paiement →
                  </button>
                </div>
              </div>
            ) : (
            <>
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
            </>
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
                <p className="text-sm font-semibold text-navy">Share Class A</p>
                <p className="text-xs text-gray-500 mt-1">Rendement cible 7-9% · Durée 36 mois</p>
                <p className="text-xs text-gray-400 mt-0.5">Profil : dynamique · Risque : 5/7</p>
              </button>
              <div className="flex-1 p-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-left opacity-60 cursor-not-allowed relative">
                <p className="text-sm font-semibold text-gray-400">Share Class B</p>
                <p className="text-xs text-gray-400 mt-1">Rendement cible 5-6% · Durée 24 mois</p>
                <p className="text-xs text-gray-300 mt-0.5">Profil : équilibré · Risque : 4/7</p>
                <span className="absolute top-2 right-2 text-[10px] bg-navy/10 text-navy px-2 py-0.5 rounded-full font-medium">Intermédiaires uniquement</span>
              </div>
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

/* ─── Sub-tab: Collatéral / DeFi — Synthetic Token Vault ─── */
function Collateral({ toast }) {
  const { orders } = useAppContext();
  const { user, profile } = useAuth();
  const [mintAmount, setMintAmount] = useState(10);
  const [minting, setMinting] = useState(false);
  const [burning, setBurning] = useState(null);
  const [txResult, setTxResult] = useState(null);
  const [vaultPositions, setVaultPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFund, setSelectedFund] = useState(null);
  const [funds, setFunds] = useState([]);

  // Compute security token balance from validated orders
  const myOrders = orders.filter((o) => o.userId === user?.id && o.status === "validated");
  const totalSecurityTokens = myOrders.reduce((s, o) => s + Math.floor(o.montant / NAV_PER_PART), 0);
  const lockedTokens = vaultPositions.filter((p) => p.status === "locked").reduce((s, p) => s + p.security_token_count, 0);
  const availableTokens = totalSecurityTokens - lockedTokens;
  const syntheticTokens = vaultPositions.filter((p) => p.status === "locked").reduce((s, p) => s + p.synthetic_token_count, 0);

  // Load funds and vault positions
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [fundsRes, vaultRes] = await Promise.all([
        supabase.from("funds").select("id, name, slug, policy_id").order("name"),
        supabase.from("vault_positions").select("*").eq("user_id", user?.id).order("created_at", { ascending: false }),
      ]);
      if (fundsRes.data) {
        setFunds(fundsRes.data);
        if (fundsRes.data.length > 0) setSelectedFund(fundsRes.data[0]);
      }
      if (vaultRes.data) setVaultPositions(vaultRes.data);
      setLoading(false);
    })();
  }, [user?.id]);

  const handleMintSynthetic = async () => {
    if (!profile?.wallet_address) { toast("Veuillez renseigner votre adresse wallet dans votre profil"); return; }
    if (!selectedFund) { toast("Aucun fonds sélectionné"); return; }
    if (mintAmount <= 0 || mintAmount > availableTokens) { toast("Montant invalide"); return; }
    setMinting(true);
    try {
      const result = await mintSynthetic({
        userAddress: profile.wallet_address,
        fundSlug: selectedFund.slug,
        fundId: selectedFund.id,
        tokenCount: mintAmount,
        userId: user.id,
      });
      if (result.error) throw new Error(result.error);
      setTxResult({ type: "mint", ...result });
      toast(`${mintAmount} sBF mintes — security tokens verrouilles dans le vault`);
      // Refresh vault positions
      const { data } = await supabase.from("vault_positions").select("*").eq("user_id", user?.id).order("created_at", { ascending: false });
      if (data) setVaultPositions(data);
    } catch (err) {
      toast(`Erreur mint synthetic : ${err.message}`);
    } finally {
      setMinting(false);
    }
  };

  const handleBurnSynthetic = async (position) => {
    if (!profile?.wallet_address) { toast("Wallet manquant"); return; }
    setBurning(position.id);
    try {
      const result = await burnSynthetic({
        userAddress: profile.wallet_address,
        fundSlug: selectedFund?.slug || position.security_asset_name?.toLowerCase(),
        fundId: position.fund_id,
        tokenCount: position.synthetic_token_count,
        vaultPositionId: position.id,
        userId: user.id,
      });
      if (result.error) throw new Error(result.error);
      setTxResult({ type: "burn", ...result });
      toast(`${position.synthetic_token_count} sBF brules — security tokens deverrouilles`);
      const { data } = await supabase.from("vault_positions").select("*").eq("user_id", user?.id).order("created_at", { ascending: false });
      if (data) setVaultPositions(data);
    } catch (err) {
      toast(`Erreur burn synthetic : ${err.message}`);
    } finally {
      setBurning(null);
    }
  };

  const lockedPositions = vaultPositions.filter((p) => p.status === "locked");
  const unlockedPositions = vaultPositions.filter((p) => p.status === "unlocked");

  if (loading) return <div className="text-center py-12 text-gray-400 text-sm">Chargement...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-navy">Collateral & DeFi</h2>
        <p className="text-sm text-gray-400 mt-1">Tokenisez vos parts en synthetic tokens librement transferables</p>
      </div>

      {/* Explainer banner */}
      <div className="bg-gradient-to-r from-navy/5 to-gold/5 border border-navy/10 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 bg-gold/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-gold font-bold text-xs">sBF</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-navy">Synthetic Tokens — Modele BlackRock BUIDL</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Vos <strong>security tokens (BF)</strong> sont restricted (whitelist CIP-113). En les verrouillant dans le vault,
            vous recevez des <strong>synthetic tokens (sBF)</strong> librement transferables, utilisables comme collateral
            DeFi ou echangeables sans restriction de whitelist. Le ratio est toujours 1:1.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Security Tokens (BF)" value={totalSecurityTokens.toLocaleString("fr-FR")} sub="Total recu" />
        <KPICard label="Disponibles" value={availableTokens.toLocaleString("fr-FR")} sub="Non verrouilles" />
        <KPICard label="Verrouilles (vault)" value={lockedTokens.toLocaleString("fr-FR")} sub="Security tokens lockes" />
        <KPICard label="Synthetic (sBF)" value={syntheticTokens.toLocaleString("fr-FR")} sub="Librement transferables" />
      </div>

      {/* Fund selector + Mint form */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-navy mb-1">Mint Synthetic Tokens</h3>
        <p className="text-xs text-gray-400 mb-4">Lock vos security tokens → Recevez des synthetic tokens 1:1</p>

        {funds.length > 1 && (
          <div className="mb-4">
            <label className={labelCls}>Fonds</label>
            <select
              value={selectedFund?.id || ""}
              onChange={(e) => setSelectedFund(funds.find((f) => f.id === e.target.value))}
              className={selectCls}
            >
              {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 items-end">
          <div>
            <label className={labelCls}>Security tokens a lock (BF)</label>
            <input type="number" min={1} max={availableTokens} value={mintAmount} onChange={(e) => setMintAmount(Number(e.target.value))} className={inputCls} />
            <p className="text-xs text-gray-300 mt-1">Disponible : {availableTokens} BF</p>
          </div>
          <div>
            <label className={labelCls}>Synthetic tokens recus</label>
            <p className="text-lg font-semibold text-gold">
              {mintAmount} sBF
            </p>
          </div>
          <button
            disabled={minting || mintAmount <= 0 || mintAmount > availableTokens || !profile?.wallet_address}
            onClick={handleMintSynthetic}
            className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${minting || mintAmount <= 0 || mintAmount > availableTokens ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-navy text-white hover:bg-navy-light"}`}
          >
            {minting ? "Transaction en cours..." : `Lock ${mintAmount} BF → Mint ${mintAmount} sBF`}
          </button>
        </div>

        {!profile?.wallet_address && (
          <p className="text-xs text-amber-600 mt-3">Vous devez renseigner votre adresse wallet dans votre profil pour utiliser le vault.</p>
        )}
      </div>

      {/* Transaction result */}
      {txResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <p className="text-sm font-medium mb-1">{txResult.type === "mint" ? "Synthetic tokens mintes" : "Synthetic tokens brules — Security tokens deverrouilles"}</p>
          <p className="text-xs text-gray-500">
            Tx : <a href={getExplorerUrl(txResult.txHash)} target="_blank" rel="noopener noreferrer" className="text-navy underline font-mono">{shortenHash(txResult.txHash)}</a>
          </p>
        </div>
      )}

      {/* Active vault positions */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-navy">Positions vault actives</h3>
        </div>

        {lockedPositions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-cream rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <p className="text-sm text-gray-400">Aucune position active</p>
            <p className="text-xs text-gray-300 mt-1">Mintez des synthetic tokens pour creer une position</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Date</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Vault</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">BF lockes</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">sBF mintes</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Tx</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {lockedPositions.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-cream/50 transition-colors">
                  <td className="px-5 py-3 text-xs text-gray-500">{new Date(p.locked_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{p.vault_address?.slice(0, 16)}...</td>
                  <td className="px-5 py-3 text-right font-mono text-navy font-medium">{p.security_token_count}</td>
                  <td className="px-5 py-3 text-right font-mono text-emerald-600">{p.synthetic_token_count}</td>
                  <td className="px-5 py-3">
                    <a href={getExplorerUrl(p.lock_tx_hash)} target="_blank" rel="noopener noreferrer" className="text-xs text-navy underline font-mono">
                      {shortenHash(p.lock_tx_hash)}
                    </a>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      disabled={burning === p.id}
                      onClick={() => handleBurnSynthetic(p)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {burning === p.id ? "Burn..." : "Burn sBF → Unlock BF"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Unlocked positions history */}
      {unlockedPositions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-navy">Historique (positions cloturees)</h3>
          </div>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Lock</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Unlock</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">Tokens</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Tx unlock</th>
              </tr>
            </thead>
            <tbody>
              {unlockedPositions.map((p) => (
                <tr key={p.id} className="border-b border-gray-50">
                  <td className="px-5 py-3 text-xs text-gray-400">{new Date(p.locked_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{p.unlocked_at ? new Date(p.unlocked_at).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="px-5 py-3 text-right font-mono text-gray-500">{p.security_token_count} BF</td>
                  <td className="px-5 py-3">
                    {p.unlock_tx_hash ? (
                      <a href={getExplorerUrl(p.unlock_tx_hash)} target="_blank" rel="noopener noreferrer" className="text-xs text-navy underline font-mono">
                        {shortenHash(p.unlock_tx_hash)}
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Main LP Portal ─── */
export default function PortailLP({ toast }) {
  // Main section: "dashboard" | "funds" | "profile"
  const [section, setSection] = useState("dashboard");
  // Fund sub-view: "catalog" | "detail:slug" | "subscribe"
  const [fundView, setFundView] = useState("catalog");
  const [selectedFund, setSelectedFund] = useState(null);

  const handleSelectFund = (slug) => setFundView("detail:" + slug);
  const handleInvest = (fund) => { setSelectedFund(fund); setFundView("subscribe"); };
  const handleBackToFunds = () => { setFundView("catalog"); setSelectedFund(null); };

  // Extract slug from fund view
  const fundSlug = fundView.startsWith("detail:") ? fundView.slice(7) : null;

  // Main navigation tabs
  const mainTabs = [
    { id: "dashboard", label: "Tableau de bord", icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" /></svg>
    )},
    { id: "funds", label: "Fonds", icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    )},
    { id: "collateral", label: "Collatéral & DeFi", icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
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
          {fundView === "subscribe" && (
            <div className="flex border-b border-gray-100 mb-8">
              <button onClick={handleBackToFunds} className="px-5 py-3 text-sm text-gray-400 hover:text-navy transition-all font-medium">
                ← Fonds
              </button>
              <button className="px-5 py-3 text-sm font-medium text-navy relative">
                Souscription directe
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-navy rounded-full" />
              </button>
            </div>
          )}

          {fundView === "catalog" && <FundCatalog onSelectFund={handleSelectFund} />}
          {fundSlug && <FundDetail fundSlug={fundSlug} onBack={handleBackToFunds} onInvest={handleInvest} />}
          {fundView === "subscribe" && <Souscription toast={toast} fund={selectedFund} />}
        </>
      )}

      {/* Collateral & DeFi */}
      {section === "collateral" && <Collateral toast={toast} />}

      {/* Profile */}
      {section === "profile" && <InvestorProfile toast={toast} />}
    </div>
  );
}
