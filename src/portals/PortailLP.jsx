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
import CryptoCheckout from "../components/CryptoCheckout";

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

  const steps = ["KYC / KYB", formData.paymentMethod === "crypto" ? "Paiement crypto" : "Virement", "Signature", "Confirmation"];
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
    if (formData.paymentMethod === "crypto") {
      toast("Transaction crypto en cours de confirmation on-chain...");
      setTimeout(() => { setPaymentReceived(true); toast("Paiement crypto confirmé — " + fmt(formData.montant) + " · transaction vérifiée on-chain"); }, 2500);
    } else {
      toast("Virement en cours de vérification — contrôle origine des fonds");
      setTimeout(() => { setPaymentReceived(true); toast("Virement reçu et validé — €" + formData.montant.toLocaleString("fr-FR") + " · origine des fonds conforme"); }, 2500);
    }
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
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${i < step ? "bg-[#0D0D12] text-white" : i === step ? "bg-[#0D0D12] text-white" : "bg-[#F0F2F5] text-[#9AA4B2]"}`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs mt-2 font-medium ${i <= step ? "text-[#0D0D12]" : "text-[#9AA4B2]"}`}>{s}</span>
            </div>
            {i < 3 && <div className={`w-20 h-px mx-3 mt-[-16px] ${i < step ? "bg-[#0D0D12]" : "bg-[#E8ECF1]"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-8 max-w-2xl mx-auto border border-[#E8ECF1]">

        {/* ── STEP 0: KYC/KYB ── */}
        {step === 0 && (
          <div className="animate-fade-in">
            <h3 className="text-lg font-semibold text-[#0D0D12] mb-2">Vérification d'identité</h3>
            <p className="text-xs text-[#9AA4B2] mb-5">Conformément à la directive (UE) 2015/849 (AMLD5) et au règlement CSSF 12-02</p>

            {/* KYC already validated — skip */}
            {kycAlreadyDone ? (
              <div className="space-y-4">
                <div className="bg-[#ECFDF5] ring-1 ring-[#059669]/10 rounded-2xl p-5 text-center">
                  <div className="w-12 h-12 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-sm font-semibold text-[#059669]">KYC/KYB déjà validé</p>
                  <p className="text-xs text-[#059669] mt-1">Votre identité a été vérifiée lors d'une précédente souscription — aucune action requise</p>
                  {profile?.investor_classification && (
                    <p className="text-xs text-[#00C48C] mt-2">Classification : <strong>{profile.investor_classification}</strong></p>
                  )}
                </div>
                <div className="flex justify-end">
                  <button onClick={() => setStep(1)} className="bg-[#0D0D12] hover:bg-[#1A1A2E] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
                    Continuer vers le paiement →
                  </button>
                </div>
              </div>
            ) : (
            <>
            <div className="flex border-b border-[#E8ECF1] mb-6">
              {[{ i: 0, label: "Identité" }, { i: 1, label: "Compliance AML" }, { i: 2, label: "Éligibilité investisseur" }].map(({ i, label }) => (
                <button key={i} onClick={() => setKycSubStep(i)} className={`px-4 py-2 text-xs font-medium transition-all relative ${kycSubStep === i ? "text-[#0D0D12]" : "text-[#9AA4B2] hover:text-[#5F6B7A]"}`}>
                  {label}
                  {kycSubStep === i && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D0D12] rounded-full" />}
                </button>
              ))}
            </div>

            {/* Sub-step 0: Identité */}
            {kycSubStep === 0 && (
              <div className="animate-fade-in">
                <div className="flex bg-[#F0F2F5] rounded-xl p-1 mb-6 max-w-xs mx-auto">
                  <button onClick={() => setPersonType("physique")} className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${personType === "physique" ? "bg-white text-[#0D0D12]" : "text-[#5F6B7A]"}`}>Personne physique</button>
                  <button onClick={() => setPersonType("morale")} className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${personType === "morale" ? "bg-white text-[#0D0D12]" : "text-[#5F6B7A]"}`}>Personne morale</button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <label className={labelCls}>Nom <span className="text-[#DC2626]">*</span></label>
                    <input type="text" value={formData.nom} onChange={(e) => set("nom", e.target.value)} placeholder="Dupont" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Prénom <span className="text-[#DC2626]">*</span></label>
                    <input type="text" value={formData.prenom} onChange={(e) => set("prenom", e.target.value)} placeholder="Jean-Marc" className={inputCls} />
                  </div>

                  {personType === "physique" && (
                    <>
                      <div>
                        <label className={labelCls}>Date de naissance <span className="text-[#DC2626]">*</span></label>
                        <input type="date" value={formData.dateNaissance} onChange={(e) => set("dateNaissance", e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Nationalité <span className="text-[#DC2626]">*</span></label>
                        <select value={formData.nationalite} onChange={(e) => set("nationalite", e.target.value)} className={selectCls}>
                          {["Française", "Luxembourgeoise", "Belge", "Suisse", "Néerlandaise", "Allemande", "Autre"].map((n) => <option key={n}>{n}</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  {personType === "morale" && (
                    <>
                      <div className="col-span-2">
                        <label className={labelCls}>Dénomination sociale <span className="text-[#DC2626]">*</span></label>
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
                        <p className="text-xs text-[#9AA4B2] mt-1">20 caractères alphanumériques — obligatoire pour les entités MiFID II</p>
                      </div>
                    </>
                  )}

                  <div className="col-span-2">
                    <label className={labelCls}>Adresse <span className="text-[#DC2626]">*</span></label>
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
                    <label className={labelCls}>Pays de résidence <span className="text-[#DC2626]">*</span></label>
                    <select value={formData.pays} onChange={(e) => set("pays", e.target.value)} className={selectCls}>
                      {["France", "Luxembourg", "Belgique", "Suisse", "Pays-Bas", "Allemagne"].map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Classification investisseur <span className="text-[#DC2626]">*</span></label>
                    <select value={formData.typeInvestisseur} onChange={(e) => set("typeInvestisseur", e.target.value)} className={selectCls}>
                      <option>Professionnel</option>
                      <option>Averti (well-informed)</option>
                      <option>Institutionnel</option>
                    </select>
                  </div>

                  <div className="col-span-2 space-y-3">
                    <label className={labelCls}>Documents justificatifs <span className="text-[#DC2626]">*</span></label>

                    {/* Pièce d'identité */}
                    {documents.find((d) => d.type === "Pièce d'identité") ? (
                      <div className="flex items-center gap-2 ring-1 ring-[#059669]/10 bg-[#ECFDF5] rounded-xl p-3 text-sm">
                        <svg className="w-4 h-4 text-[#059669] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span className="text-[#059669] font-medium flex-1">{documents.find((d) => d.type === "Pièce d'identité").name}</span>
                        <span className="text-xs text-[#059669]">{documents.find((d) => d.type === "Pièce d'identité").size}</span>
                        <button onClick={() => window.open(documents.find((d) => d.type === "Pièce d'identité").url, "_blank")} className="text-xs font-medium text-[#4F7DF3] hover:text-[#1A1A2E] transition-colors">Consulter</button>
                      </div>
                    ) : (
                      <>
                        <input type="file" ref={fileRefs.id} onChange={handleFileSelect("Pièce d'identité")} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
                        <div className="border-2 border-dashed border-[#E8ECF1] rounded-xl p-3 text-center hover:border-[#4F7DF3]/30 transition-colors cursor-pointer"
                          onClick={() => fileRefs.id.current?.click()}>
                          <p className="text-sm text-[#9AA4B2]">{personType === "physique" ? "Passeport ou carte d'identité" : "Extrait K-bis / Registre de commerce"}</p>
                          <p className="text-xs text-[#9AA4B2] mt-0.5">Cliquez pour sélectionner · PDF, JPG, PNG — max 10 Mo</p>
                        </div>
                      </>
                    )}

                    {/* Justificatif de domicile */}
                    {documents.find((d) => d.type === "Justificatif de domicile") ? (
                      <div className="flex items-center gap-2 ring-1 ring-[#059669]/10 bg-[#ECFDF5] rounded-xl p-3 text-sm">
                        <svg className="w-4 h-4 text-[#059669] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span className="text-[#059669] font-medium flex-1">{documents.find((d) => d.type === "Justificatif de domicile").name}</span>
                        <span className="text-xs text-[#059669]">{documents.find((d) => d.type === "Justificatif de domicile").size}</span>
                        <button onClick={() => window.open(documents.find((d) => d.type === "Justificatif de domicile").url, "_blank")} className="text-xs font-medium text-[#4F7DF3] hover:text-[#1A1A2E] transition-colors">Consulter</button>
                      </div>
                    ) : (
                      <>
                        <input type="file" ref={fileRefs.domicile} onChange={handleFileSelect("Justificatif de domicile")} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
                        <div className="border-2 border-dashed border-[#E8ECF1] rounded-xl p-3 text-center hover:border-[#4F7DF3]/30 transition-colors cursor-pointer"
                          onClick={() => fileRefs.domicile.current?.click()}>
                          <p className="text-sm text-[#9AA4B2]">Justificatif de domicile (moins de 3 mois)</p>
                          <p className="text-xs text-[#9AA4B2] mt-0.5">Facture énergie, téléphone, avis d'imposition</p>
                        </div>
                      </>
                    )}

                    {/* Justificatif origine des fonds */}
                    {documents.find((d) => d.type === "Justificatif origine des fonds") ? (
                      <div className="flex items-center gap-2 ring-1 ring-[#059669]/10 bg-[#ECFDF5] rounded-xl p-3 text-sm">
                        <svg className="w-4 h-4 text-[#059669] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span className="text-[#059669] font-medium flex-1">{documents.find((d) => d.type === "Justificatif origine des fonds").name}</span>
                        <span className="text-xs text-[#059669]">{documents.find((d) => d.type === "Justificatif origine des fonds").size}</span>
                        <button onClick={() => window.open(documents.find((d) => d.type === "Justificatif origine des fonds").url, "_blank")} className="text-xs font-medium text-[#4F7DF3] hover:text-[#1A1A2E] transition-colors">Consulter</button>
                      </div>
                    ) : (
                      <>
                        <input type="file" ref={fileRefs.fonds} onChange={handleFileSelect("Justificatif origine des fonds")} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
                        <div className="border-2 border-dashed border-[#E8ECF1] rounded-xl p-3 text-center hover:border-[#4F7DF3]/30 transition-colors cursor-pointer"
                          onClick={() => fileRefs.fonds.current?.click()}>
                          <p className="text-sm text-[#9AA4B2]">Justificatif d'origine des fonds</p>
                          <p className="text-xs text-[#9AA4B2] mt-0.5">Relevé bancaire, acte de cession, attestation employeur</p>
                        </div>
                      </>
                    )}

                    {/* Statuts (personne morale) */}
                    {personType === "morale" && (
                      documents.find((d) => d.type === "Statuts société") ? (
                        <div className="flex items-center gap-2 ring-1 ring-[#059669]/10 bg-[#ECFDF5] rounded-xl p-3 text-sm">
                          <svg className="w-4 h-4 text-[#059669] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          <span className="text-[#059669] font-medium flex-1">{documents.find((d) => d.type === "Statuts société").name}</span>
                          <span className="text-xs text-[#059669]">{documents.find((d) => d.type === "Statuts société").size}</span>
                          <button onClick={() => window.open(documents.find((d) => d.type === "Statuts société").url, "_blank")} className="text-xs font-medium text-[#4F7DF3] hover:text-[#1A1A2E] transition-colors">Consulter</button>
                        </div>
                      ) : (
                        <>
                          <input type="file" ref={fileRefs.statuts} onChange={handleFileSelect("Statuts société")} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
                          <div className="border-2 border-dashed border-[#E8ECF1] rounded-xl p-3 text-center hover:border-[#4F7DF3]/30 transition-colors cursor-pointer"
                            onClick={() => fileRefs.statuts.current?.click()}>
                            <p className="text-sm text-[#9AA4B2]">Statuts à jour + liste des bénéficiaires effectifs</p>
                            <p className="text-xs text-[#9AA4B2] mt-0.5">PDF — max 10 Mo</p>
                          </div>
                        </>
                      )
                    )}

                    {documents.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-[#059669] font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {documents.length} document{documents.length > 1 ? "s" : ""} déposé{documents.length > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button onClick={() => setKycSubStep(1)} className="bg-[#0D0D12] hover:bg-[#1A1A2E] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
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
                  <label className={labelCls}>Personne Politiquement Exposée (PEP) <span className="text-[#DC2626]">*</span></label>
                  <p className="text-xs text-[#9AA4B2] mb-2">Exercez-vous ou avez-vous exercé au cours des 12 derniers mois une fonction politique, juridictionnelle ou administrative de haut niveau ?</p>
                  <div className="flex gap-3">
                    {[{ val: "non", label: "Non" }, { val: "oui", label: "Oui, PEP directe" }, { val: "proche", label: "Oui, proche d'un PEP" }].map(({ val, label }) => (
                      <button key={val} onClick={() => set("pepStatus", val)} className={`px-4 py-2 rounded-xl text-xs font-medium border-2 transition-all ${formData.pepStatus === val ? "border-[#4F7DF3] bg-[#EEF2FF] text-[#0D0D12]" : "border-[#E8ECF1] text-[#5F6B7A]"}`}>
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
                  <label className={labelCls}>Origine des fonds investis <span className="text-[#DC2626]">*</span></label>
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
                    <label className={labelCls}>Bénéficiaire(s) effectif(s) — UBO <span className="text-[#DC2626]">*</span></label>
                    <p className="text-xs text-[#9AA4B2] mb-2">Toute personne physique détenant directement ou indirectement plus de 25% du capital ou des droits de vote</p>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={formData.beneficiaireNom} onChange={(e) => set("beneficiaireNom", e.target.value)} placeholder="Nom complet du bénéficiaire" className={inputCls} />
                      <input type="text" value={formData.beneficiairePct} onChange={(e) => set("beneficiairePct", e.target.value)} placeholder="% de détention (ex: 65%)" className={inputCls} />
                    </div>
                    <button onClick={() => toast("Bénéficiaire effectif ajouté")} className="mt-2 text-xs text-[#4F7DF3] font-medium hover:underline">+ Ajouter un autre bénéficiaire</button>
                  </div>
                )}

                <ComplianceAlert type="warning">
                  <strong>Échange automatique d'informations (CRS/FATCA)</strong> — Les informations relatives à ce compte seront communiquées aux autorités fiscales compétentes conformément aux accords CRS et FATCA.
                </ComplianceAlert>

                {kycStatus && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge status={kycStatus} />
                      <span className="text-xs text-[#5F6B7A]">Vérification d'identité</span>
                    </div>
                    {amlStatus === "clear" && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium ring-1 ring-[#059669]/10 bg-[#ECFDF5] text-[#059669]">AML Clear</span>
                        <span className="text-xs text-[#5F6B7A]">Screening sanctions / PEP / médias négatifs</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <button onClick={() => setKycSubStep(0)} className="text-sm text-[#5F6B7A] hover:text-[#0D0D12] transition-colors">← Identité</button>
                  <div className="flex gap-3">
                    {!kycStatus && <button onClick={handleKycSubmit} className="bg-[#0D0D12] hover:bg-[#1A1A2E] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">Lancer la vérification KYC / AML</button>}
                    {amlStatus === "clear" && <button onClick={() => setKycSubStep(2)} className="bg-[#0D0D12] hover:bg-[#1A1A2E] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">Suivant : Éligibilité →</button>}
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
                  <label className={labelCls}>Patrimoine financier net (hors résidence principale) <span className="text-[#DC2626]">*</span></label>
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
                  <label className={labelCls}>Expérience en produits de dette / crédit privé <span className="text-[#DC2626]">*</span></label>
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
                  <label className={labelCls}>Horizon d'investissement envisagé <span className="text-[#DC2626]">*</span></label>
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
                  <label className={labelCls}>Tolérance au risque <span className="text-[#DC2626]">*</span></label>
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
                  <button onClick={() => setKycSubStep(1)} className="text-sm text-[#5F6B7A] hover:text-[#0D0D12] transition-colors">← Compliance</button>
                  <div className="flex gap-3">
                    {!eligibilityDone && <button onClick={handleEligibility} className="bg-[#0D0D12] hover:bg-[#1A1A2E] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">Valider l'éligibilité</button>}
                    {eligibilityDone && <button onClick={() => setStep(1)} className="bg-[#0D0D12] hover:bg-[#1A1A2E] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">Continuer vers le virement →</button>}
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
            <h3 className="text-lg font-semibold text-[#0D0D12] mb-2">Instruction de paiement</h3>
            <p className="text-xs text-[#9AA4B2] mb-5">Le virement doit provenir d'un compte au nom du souscripteur (AMLD5 art. 18)</p>

            <div className="flex bg-[#F0F2F5] rounded-xl p-1 mb-6 max-w-xs mx-auto">
              <button onClick={() => set("paymentMethod", "fiat")} className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${formData.paymentMethod === "fiat" ? "bg-white text-[#0D0D12]" : "text-[#5F6B7A]"}`}>Virement EUR</button>
              <button onClick={() => set("paymentMethod", "crypto")} className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${formData.paymentMethod === "crypto" ? "bg-white text-[#0D0D12]" : "text-[#5F6B7A]"}`}>Crypto (ADA)</button>
            </div>

            <div className="mb-6">
              <label className="block text-[11px] uppercase tracking-[0.08em] text-[#9AA4B2] font-semibold mb-1 text-left">Montant de souscription <span className="text-[#DC2626]">*</span></label>
              <div className="relative">
                <input type="number" value={formData.montant} onChange={(e) => set("montant", Number(e.target.value))} min={100000} step={50000} className={inputCls} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#9AA4B2]">min. €100 000</span>
              </div>
              {formData.montant < 100000 && formData.montant > 0 && <p className="text-xs text-[#DC2626] mt-1 text-left">Le montant minimum de souscription est de €100 000</p>}
            </div>

            <div className="flex gap-4 mb-6">
              <button onClick={() => set("shareClass", 1)} className={`flex-1 p-4 rounded-2xl border-2 text-left transition-all ${formData.shareClass === 1 ? "border-[#4F7DF3] bg-[#EEF2FF]" : "border-[#E8ECF1]"}`}>
                <p className="text-sm font-semibold text-[#0D0D12]">Share Class A</p>
                <p className="text-xs text-[#5F6B7A] mt-1">Rendement cible 7-9% · Durée 36 mois</p>
                <p className="text-xs text-[#9AA4B2] mt-0.5">Profil : dynamique · Risque : 5/7</p>
              </button>
              <div className="flex-1 p-4 rounded-2xl border-2 border-[#E8ECF1] bg-[#F0F2F5] text-left opacity-60 cursor-not-allowed relative">
                <p className="text-sm font-semibold text-[#9AA4B2]">Share Class B</p>
                <p className="text-xs text-[#9AA4B2] mt-1">Rendement cible 5-6% · Durée 24 mois</p>
                <p className="text-xs text-[#9AA4B2] mt-0.5">Profil : équilibré · Risque : 4/7</p>
                <span className="absolute top-2 right-2 text-[10px] bg-[#EEF2FF] text-[#4F7DF3] px-2 py-0.5 rounded-md font-medium">Intermédiaires uniquement</span>
              </div>
            </div>

            {formData.paymentMethod === "fiat" ? (
              <div className="bg-[#F7F8FA] rounded-xl p-5 text-left text-sm space-y-2">
                <p className="text-[11px] uppercase tracking-[0.08em] text-[#9AA4B2] font-semibold mb-3">Coordonnées bancaires — Ebury Partners Belgium NV/SA</p>
                <div className="flex justify-between"><span className="text-[#5F6B7A]">IBAN</span><span className="font-mono text-[#0D0D12] text-xs tabular-nums">LU28 0019 4006 4475 0000</span></div>
                <div className="flex justify-between"><span className="text-[#5F6B7A]">BIC / SWIFT</span><span className="font-mono text-[#0D0D12] text-xs tabular-nums">BABORLULLXXX</span></div>
                <div className="flex justify-between"><span className="text-[#5F6B7A]">Bénéficiaire</span><span className="text-[#0D0D12]">Bridge Fund SCSp</span></div>
                <div className="flex justify-between"><span className="text-[#5F6B7A]">Référence</span><span className="font-mono text-[#4F7DF3] text-xs">{subRef}</span></div>
              </div>
            ) : (
              <CryptoCheckout
                montant={formData.montant}
                subRef={subRef}
                onPaymentComplete={() => {
                  setPaymentReceived(true);
                  toast("Paiement crypto confirmé — " + fmt(formData.montant) + " · transaction vérifiée on-chain");
                }}
              />
            )}

            {formData.paymentMethod === "crypto" && (
              <ComplianceAlert type="warning">
                <strong>Travel Rule (Règlement TFR 2023/1113)</strong> — Pour les transferts crypto supérieurs à 1 000 €, les informations du donneur d'ordre et du bénéficiaire seront transmises conformément au règlement européen.
              </ComplianceAlert>
            )}

            <div className="mt-4">
              {paymentReceived ? (
                <div className="flex items-center justify-center gap-2 text-[#059669] text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#00C48C]" />
                  {formData.paymentMethod === "crypto" ? "Paiement crypto confirmé — transaction vérifiée on-chain" : "Paiement reçu — origine des fonds vérifiée"}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-amber-600 text-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-500 pulse-dot" />
                  {formData.paymentMethod === "crypto" ? "En attente de confirmation on-chain" : "En attente de réception et vérification"}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(0)} className="text-sm text-[#5F6B7A] hover:text-[#0D0D12] transition-colors">← Retour</button>
              <div className="flex gap-3">
                {!paymentReceived && <button onClick={handlePaymentSent} className="bg-[#EEF2FF] text-[#4F7DF3] px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#C7D2FE] transition-colors">{formData.paymentMethod === "crypto" ? "Simuler confirmation on-chain" : "Simuler réception"}</button>}
                {paymentReceived && <button onClick={() => setStep(2)} className="bg-[#0D0D12] hover:bg-[#1A1A2E] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">Continuer →</button>}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Signature ── */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h3 className="text-lg font-semibold text-[#0D0D12] mb-2">Bulletin de souscription</h3>
            <p className="text-xs text-[#9AA4B2] mb-5">Signature électronique qualifiée au sens du règlement eIDAS (UE) 910/2014</p>

            <div className="flex items-center justify-between mb-5">
              <p className="text-xs text-[#5F6B7A]">Le bulletin PDF sera généré avec votre signature à la validation.</p>
              <button onClick={handlePreviewPDF} className="flex items-center gap-1.5 text-xs font-medium text-[#4F7DF3] hover:text-[#1A1A2E] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                Aperçu PDF
              </button>
            </div>

            <div className="bg-[#F7F8FA] rounded-xl p-6 text-left text-sm space-y-3 mb-6">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#9AA4B2] font-semibold mb-3">Termes clés de la souscription</p>
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
                <div key={i} className={`flex justify-between py-1 ${i < 11 ? "border-b border-[#F0F2F5]" : ""}`}>
                  <span className="text-[#5F6B7A]">{label}</span>
                  <span className={`text-[#0D0D12] font-medium tabular-nums ${label === "Rendement cible" ? "text-[#4F7DF3]" : ""}`}>{value}</span>
                </div>
              ))}
            </div>

            <div className="bg-[#FEF2F2] ring-1 ring-[#DC2626]/10 rounded-xl p-5 text-left mb-6">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#DC2626] font-semibold mb-3">Avertissements réglementaires</p>
              <div className="text-xs text-[#DC2626]/80 space-y-2 leading-relaxed">
                <p>L'investissement dans le Bridge Fund SCSp comporte un risque de perte en capital partielle ou totale.</p>
                <p>Ce fonds est un FIA réservé aux investisseurs avertis/professionnels au sens de la loi luxembourgeoise du 13 février 2007.</p>
                <p>La liquidité des parts est limitée. La tokenisation ne garantit pas la liquidité sur un marché secondaire.</p>
              </div>
            </div>

            <div className="text-left space-y-3 mb-6">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#9AA4B2] font-semibold">Consentements obligatoires</p>
              <Checkbox checked={consents.prospectus} onChange={() => setConsents({ ...consents, prospectus: !consents.prospectus })} required>J'ai lu et compris le <span className="text-[#4F7DF3] font-medium underline">prospectus complet</span> du Bridge Fund SCSp.</Checkbox>
              <Checkbox checked={consents.dici} onChange={() => setConsents({ ...consents, dici: !consents.dici })} required>J'ai pris connaissance du <span className="text-[#4F7DF3] font-medium underline">Document d'Informations Clés (DIC/KID)</span> conformément au règlement PRIIPs.</Checkbox>
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
                  <div className="mt-3 flex items-center gap-2 text-[#059669] text-xs font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Signature capturée
                  </div>
                )}
              </div>
            )}

            {!signed ? (
              <button onClick={handleSign} disabled={!canSign} className={`w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${canSign ? "bg-[#0D0D12] hover:bg-[#1A1A2E] text-white" : "bg-[#F0F2F5] text-[#9AA4B2] cursor-not-allowed"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Signer et générer le bulletin PDF
              </button>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-sm font-medium text-[#059669]">Bulletin signé avec succès</p>
                  <p className="text-xs text-[#9AA4B2] mt-1">Signature qualifiée eIDAS · horodatage : {new Date().toLocaleString("fr-FR")}</p>
                </div>
                {pdfUrl && (
                  <div className="border border-[#E8ECF1] rounded-2xl overflow-hidden">
                    <div className="bg-[#F7F8FA] px-4 py-2 flex items-center justify-between border-b border-[#E8ECF1]">
                      <span className="text-xs font-medium text-[#0D0D12]">Bulletin_Souscription_{subRef}.pdf</span>
                      <div className="flex gap-2">
                        <button onClick={() => window.open(pdfUrl, "_blank")} className="text-xs text-[#5F6B7A] hover:text-[#0D0D12] transition-colors">Ouvrir</button>
                        <button onClick={handleDownloadPDF} className="text-xs font-medium text-[#4F7DF3] hover:text-[#1A1A2E] transition-colors">Télécharger</button>
                      </div>
                    </div>
                    <iframe src={pdfUrl} className="w-full border-0" style={{ height: 400 }} title="Bulletin de souscription" />
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(1)} className="text-sm text-[#5F6B7A] hover:text-[#0D0D12] transition-colors">← Retour</button>
              {signed && <button onClick={() => setStep(3)} className="bg-[#0D0D12] hover:bg-[#1A1A2E] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">Continuer →</button>}
            </div>
          </div>
        )}

        {/* ── STEP 3: Confirmation ── */}
        {step === 3 && (
          <div className="animate-fade-in text-left">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-[#EEF2FF] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#4F7DF3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-[#0D0D12]">Souscription confirmée</h3>
              <p className="text-sm text-[#5F6B7A] mt-1">Votre investissement est en cours de traitement</p>
            </div>

            <div className="bg-[#F7F8FA] rounded-xl p-5 text-sm space-y-2 mb-6">
              <div className="flex justify-between"><span className="text-[#5F6B7A]">N° de souscription</span><span className="font-mono text-[#0D0D12] tabular-nums">{subRef}</span></div>
              <div className="flex justify-between"><span className="text-[#5F6B7A]">Montant</span><span className="text-[#0D0D12] font-medium tabular-nums">{fmt(formData.montant)}</span></div>
              <div className="flex justify-between"><span className="text-[#5F6B7A]">Share Class</span><span className="text-[#0D0D12]">Classe {formData.shareClass}</span></div>
              <div className="flex justify-between"><span className="text-[#5F6B7A]">Parts estimées</span><span className="text-[#0D0D12] font-medium tabular-nums">{(formData.montant / NAV_PER_PART).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-[#5F6B7A]">NAV / part</span><span className="text-[#4F7DF3] font-medium tabular-nums">{fmtFull(NAV_PER_PART)}</span></div>
              <div className="flex justify-between"><span className="text-[#5F6B7A]">Mode de paiement</span><span className={`font-medium ${formData.paymentMethod === "crypto" ? "text-[#4F7DF3]" : "text-[#0D0D12]"}`}>{formData.paymentMethod === "crypto" ? "Crypto (multi-chain)" : "Virement SEPA"}</span></div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Badge status="En attente" />
              <span className="text-xs text-[#9AA4B2]">En attente de validation AIFM — puis émission on-chain</span>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#9AA4B2] font-semibold">Workflow compliance & émission</p>
              {[
                { label: "KYC/KYB validé", sub: "Identité vérifiée", done: true },
                { label: "Screening AML/CFT", sub: "PEP, sanctions, médias négatifs — clear", done: true },
                { label: "Éligibilité investisseur", sub: "MiFID II — profil adéquat", done: true },
                { label: "Origine des fonds vérifiée", sub: "Conformité AMLD5", done: true },
                { label: "Paiement reçu et réconcilié", sub: fmt(formData.montant) + (formData.paymentMethod === "crypto" ? " — confirmation on-chain" : " — compte ségrégué"), done: true },
                { label: "Bulletin signé (eIDAS)", sub: "Signature qualifiée horodatée", done: true },
                { label: "Validation AIFM", sub: "Approbation du gestionnaire", done: false },
                { label: "Émission des tokens", sub: "Mint on-chain Cardano · CIP-68", done: false },
                { label: "Transfert au custodian", sub: "SwissLife Banque Privée — custody wallet", done: false },
                { label: "Inscription au registre", sub: "Registre des LP mis à jour", done: false },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${item.done ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#F0F2F5] text-[#9AA4B2]"}`}>
                    {item.done ? "✓" : i + 1}
                  </div>
                  <div>
                    <span className={`text-sm font-medium ${item.done ? "text-[#0D0D12]" : "text-[#9AA4B2]"}`}>{item.label}</span>
                    <p className={`text-xs ${item.done ? "text-[#9AA4B2]" : "text-[#C4CAD4]"}`}>{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[#E8ECF1]">
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

/* ─── DeFi Pools — In-app Swap & Liquidity ─── */
function DeFiPoolsEmbed({ syntheticTokens, toast }) {
  const [pools, setPools] = useState([]);
  const [activePool, setActivePool] = useState(null);
  const [poolsLoading, setPoolsLoading] = useState(true);
  const [tab, setTab] = useState("swap");
  const [swapDirection, setSwapDirection] = useState("sell");
  const [swapAmount, setSwapAmount] = useState("");
  const [lpAmountSbf, setLpAmountSbf] = useState("");
  const [lpAmountAda, setLpAmountAda] = useState("");
  const [processing, setProcessing] = useState(false);
  const [txHistory, setTxHistory] = useState([]);
  const [lpPositions, setLpPositions] = useState([]);
  const chartData = [42, 45, 48, 44, 52, 58, 55, 60, 62, 58, 65, 68, 72, 70, 75, 78, 82, 80, 85, 88, 92, 90, 95, 98];

  // Fetch pools from Supabase
  useEffect(() => {
    async function loadPools() {
      if (!supabase) { setPoolsLoading(false); return; }
      const { data } = await supabase.from("defi_pools").select("*").eq("status", "active").order("created_at");
      const activePools = data || [];
      setPools(activePools);
      if (activePools.length > 0 && !activePool) setActivePool(activePools[0]);
      setPoolsLoading(false);
    }
    loadPools();
  }, []);

  // Pool config from active pool or defaults
  const POOL_RATE = activePool?.initial_price || 98.5;
  const POOL_FEE = (activePool?.fee_percent || 0.3) / 100;
  const POOL_APY = 12.4;
  const POOL_TVL = 125000;
  const tokenA = activePool?.pair_token_a || "sBF";
  const tokenB = activePool?.pair_token_b || "ADA";
  const dexName = activePool?.dex || "Minswap";
  const poolUrl = activePool?.minswap_url || "";

  const swapOutput = swapAmount ? (
    swapDirection === "sell"
      ? (Number(swapAmount) * POOL_RATE * (1 - POOL_FEE)).toFixed(2)
      : (Number(swapAmount) / POOL_RATE * (1 - POOL_FEE)).toFixed(4)
  ) : "0";
  const swapFee = swapAmount ? (Number(swapAmount) * POOL_FEE).toFixed(4) : "0";
  const priceImpact = swapAmount ? Math.min(Number(swapAmount) * 0.01, 5).toFixed(2) : "0";

  const handleSwap = async () => {
    if (!swapAmount || Number(swapAmount) <= 0) return;
    setProcessing(true);
    // In production, this would call a Supabase Edge Function that interacts with Minswap smart contracts
    await new Promise((r) => setTimeout(r, 2000));
    const fromToken = swapDirection === "sell" ? tokenA : tokenB;
    const toToken = swapDirection === "sell" ? tokenB : tokenA;
    const tx = {
      id: "tx-" + Date.now(),
      type: `Swap ${fromToken} → ${toToken}`,
      amountIn: `${swapAmount} ${fromToken}`,
      amountOut: `${swapOutput} ${toToken}`,
      date: new Date().toLocaleString("fr-FR"),
      status: "confirmed",
      pool: activePool?.pool_name,
    };
    setTxHistory((prev) => [tx, ...prev]);
    toast?.(`Swap execute — ${tx.amountIn} → ${tx.amountOut}`);
    setSwapAmount("");
    setProcessing(false);
  };

  const handleAddLiquidity = async () => {
    if (!lpAmountSbf || Number(lpAmountSbf) <= 0) return;
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 2500));
    const lpTokens = (Number(lpAmountSbf) * 2).toFixed(2);
    const pos = {
      id: "lp-" + Date.now(),
      sbf: lpAmountSbf,
      ada: lpAmountAda || (Number(lpAmountSbf) * POOL_RATE).toFixed(0),
      lpTokens,
      share: ((Number(lpAmountSbf) / POOL_TVL) * 100).toFixed(3),
      date: new Date().toLocaleString("fr-FR"),
    };
    setLpPositions((prev) => [pos, ...prev]);
    setTxHistory((prev) => [{ id: pos.id, type: "Add Liquidity", amountIn: `${pos.sbf} ${tokenA} + ${pos.ada} ${tokenB}`, amountOut: `${lpTokens} LP`, date: pos.date, status: "confirmed" }, ...prev]);
    toast?.(`Liquidite ajoutee — ${pos.sbf} ${tokenA} + ${pos.ada} ${tokenB} → ${lpTokens} LP tokens`);
    setLpAmountSbf("");
    setLpAmountAda("");
    setProcessing(false);
  };

  const handleRemoveLp = async (posId) => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1500));
    const pos = lpPositions.find((p) => p.id === posId);
    setLpPositions((prev) => prev.filter((p) => p.id !== posId));
    if (pos) {
      setTxHistory((prev) => [{ id: "rm-" + Date.now(), type: "Remove Liquidity", amountIn: `${pos.lpTokens} LP`, amountOut: `${pos.sbf} ${tokenA} + ${pos.ada} ${tokenB}`, date: new Date().toLocaleString("fr-FR"), status: "confirmed" }, ...prev]);
      toast?.(`Liquidite retiree — ${pos.sbf} ${tokenA} + ${pos.ada} ${tokenB} recuperes`);
    }
    setProcessing(false);
  };

  // Sparkline
  const Sparkline = ({ data, color, w = 200, h = 48 }) => {
    const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
    const fillPts = pts + ` ${w},${h} 0,${h}`;
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <defs><linearGradient id="spFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.15" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <polygon fill="url(#spFill)" points={fillPts} />
        <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      </svg>
    );
  };

  const tabCls = (t) => `px-4 py-2 text-xs font-medium rounded-xl transition-colors ${tab === t ? "bg-[#0D0D12] text-white" : "text-[#5F6B7A] hover:bg-[#F0F2F5]"}`;

  if (poolsLoading) return <div className="bg-white rounded-2xl border border-[#E8ECF1] p-8 text-center text-sm text-[#9AA4B2]">Chargement des pools...</div>;

  if (pools.length === 0) return (
    <div className="bg-white rounded-2xl border border-[#E8ECF1] p-8 text-center">
      <div className="w-12 h-12 bg-[#F0F2F5] rounded-full flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-[#9AA4B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
      </div>
      <p className="text-sm font-medium text-[#0D0D12]">Aucune pool DeFi disponible</p>
      <p className="text-xs text-[#9AA4B2] mt-1">L'administrateur n'a pas encore configure de pool de liquidite pour les synthetic tokens.</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#E8ECF1]">
      {/* Header with pool stats */}
      <div className="px-6 py-4 border-b border-[#F0F2F5]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              {pools.length > 1 ? (
                <select
                  value={activePool?.id || ""}
                  onChange={(e) => setActivePool(pools.find((p) => p.id === e.target.value))}
                  className="text-sm font-semibold text-[#0D0D12] bg-transparent border-none outline-none cursor-pointer pr-1"
                >
                  {pools.map((p) => <option key={p.id} value={p.id}>{p.pool_name}</option>)}
                </select>
              ) : (
                <h3 className="text-sm font-semibold text-[#0D0D12]">{activePool?.pool_name || "Pool"}</h3>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full ring-1 ring-[#059669]/10">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse" />
                Live
              </span>
              <span className="text-[10px] text-[#9AA4B2] bg-[#F0F2F5] px-1.5 py-0.5 rounded capitalize">{dexName}</span>
              {poolUrl && (
                <a href={poolUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#4F7DF3] hover:underline flex items-center gap-0.5">
                  Voir sur {dexName}
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              )}
            </div>
            <p className="text-xs text-[#9AA4B2] mt-0.5">Swappez et fournissez de la liquidite directement depuis votre portail</p>
          </div>
          <span className="text-[11px] font-medium text-[#059669] ring-1 ring-[#059669]/10 bg-[#ECFDF5] px-3 py-1 rounded-md tabular-nums">{syntheticTokens.toLocaleString("fr-FR")} {tokenA}</span>
        </div>
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-[#F7F8FA] rounded-xl p-3">
            <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider">Prix</p>
            <p className="text-base font-bold text-[#0D0D12] tabular-nums mt-0.5">{POOL_RATE} <span className="text-[10px] font-normal text-[#9AA4B2]">{tokenB}</span></p>
          </div>
          <div className="bg-[#F7F8FA] rounded-xl p-3">
            <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider">TVL</p>
            <p className="text-base font-bold text-[#0D0D12] tabular-nums mt-0.5">{POOL_TVL.toLocaleString("fr-FR")} <span className="text-[10px] font-normal text-[#9AA4B2]">{tokenB}</span></p>
          </div>
          <div className="bg-[#F7F8FA] rounded-xl p-3">
            <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider">APY</p>
            <p className="text-base font-bold text-[#059669] tabular-nums mt-0.5">{POOL_APY}%</p>
          </div>
          <div className="bg-[#F7F8FA] rounded-xl p-3">
            <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider">Fee</p>
            <p className="text-base font-bold text-[#0D0D12] tabular-nums mt-0.5">{activePool?.fee_percent || 0.3}%</p>
          </div>
          <div className="bg-[#F7F8FA] rounded-xl p-3 flex items-center justify-center">
            <Sparkline data={chartData} color="#4F7DF3" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-3 border-b border-[#F0F2F5] flex items-center gap-2">
        <button onClick={() => setTab("swap")} className={tabCls("swap")}>Swap</button>
        <button onClick={() => setTab("liquidity")} className={tabCls("liquidity")}>Ajouter liquidite</button>
        <button onClick={() => setTab("positions")} className={tabCls("positions")}>
          Mes positions {lpPositions.length > 0 && <span className="ml-1 bg-[#4F7DF3] text-white text-[9px] px-1.5 py-0.5 rounded-full">{lpPositions.length}</span>}
        </button>
        {txHistory.length > 0 && (
          <button onClick={() => setTab("history")} className={tabCls("history")}>
            Historique <span className="ml-1 bg-[#9AA4B2] text-white text-[9px] px-1.5 py-0.5 rounded-full">{txHistory.length}</span>
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {/* ─── SWAP ─── */}
        {tab === "swap" && (
          <div className="max-w-md mx-auto">
            {/* From */}
            <div className="bg-[#F7F8FA] rounded-2xl p-4 border border-[#E8ECF1]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#9AA4B2]">Vous envoyez</p>
                <p className="text-xs text-[#9AA4B2]">Solde : <span className="font-medium text-[#5F6B7A]">{swapDirection === "sell" ? syntheticTokens : "—"} {swapDirection === "sell" ? tokenA : tokenB}</span></p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-2xl font-bold text-[#0D0D12] placeholder-[#C4CAD4] outline-none tabular-nums"
                />
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#E8ECF1]">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${swapDirection === "sell" ? "bg-[#EEF2FF]" : "bg-[#F0F2F5]"}`}>
                    <span className={`text-[10px] font-bold ${swapDirection === "sell" ? "text-[#4F7DF3]" : "text-[#0D0D12]"}`}>{swapDirection === "sell" ? tokenA : tokenB.charAt(0)}</span>
                  </div>
                  <span className="text-sm font-semibold text-[#0D0D12]">{swapDirection === "sell" ? tokenA : tokenB}</span>
                </div>
              </div>
              {swapDirection === "sell" && syntheticTokens > 0 && (
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map((pct) => (
                    <button key={pct} onClick={() => setSwapAmount(String(Math.floor(syntheticTokens * pct / 100)))} className="text-[10px] font-medium text-[#4F7DF3] bg-[#EEF2FF] px-2 py-1 rounded-lg hover:bg-[#E0E7FF] transition-colors">{pct}%</button>
                  ))}
                </div>
              )}
            </div>

            {/* Swap direction button */}
            <div className="flex justify-center -my-3 relative z-10">
              <button onClick={() => setSwapDirection(swapDirection === "sell" ? "buy" : "sell")} className="w-10 h-10 bg-white border-4 border-[#F7F8FA] rounded-xl flex items-center justify-center hover:bg-[#F0F2F5] transition-colors shadow-sm">
                <svg className="w-4 h-4 text-[#5F6B7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
              </button>
            </div>

            {/* To */}
            <div className="bg-[#F7F8FA] rounded-2xl p-4 border border-[#E8ECF1]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#9AA4B2]">Vous recevez</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="flex-1 text-2xl font-bold text-[#0D0D12] tabular-nums">{swapOutput}</p>
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#E8ECF1]">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${swapDirection === "sell" ? "bg-[#F0F2F5]" : "bg-[#EEF2FF]"}`}>
                    <span className={`text-[10px] font-bold ${swapDirection === "sell" ? "text-[#0D0D12]" : "text-[#4F7DF3]"}`}>{swapDirection === "sell" ? tokenB.charAt(0) : tokenA}</span>
                  </div>
                  <span className="text-sm font-semibold text-[#0D0D12]">{swapDirection === "sell" ? tokenB : tokenA}</span>
                </div>
              </div>
            </div>

            {/* Swap details */}
            {swapAmount && Number(swapAmount) > 0 && (
              <div className="mt-3 bg-[#FAFBFC] rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-[#9AA4B2]">Taux</span><span className="text-[#0D0D12] tabular-nums">1 {tokenA} = {POOL_RATE} {tokenB}</span></div>
                <div className="flex justify-between text-xs"><span className="text-[#9AA4B2]">Frais pool (0.3%)</span><span className="text-[#0D0D12] tabular-nums">{swapFee} {swapDirection === "sell" ? tokenA : tokenB}</span></div>
                <div className="flex justify-between text-xs"><span className="text-[#9AA4B2]">Impact prix</span><span className={`tabular-nums ${Number(priceImpact) > 1 ? "text-amber-600" : "text-[#059669]"}`}>{priceImpact}%</span></div>
              </div>
            )}

            {/* Swap button */}
            <button
              onClick={handleSwap}
              disabled={processing || !swapAmount || Number(swapAmount) <= 0 || (swapDirection === "sell" && Number(swapAmount) > syntheticTokens)}
              className={`w-full mt-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${processing || !swapAmount || Number(swapAmount) <= 0 ? "bg-[#F0F2F5] text-[#9AA4B2] cursor-not-allowed" : "bg-[#0D0D12] text-white hover:bg-[#1A1A2E] active:scale-[0.98]"}`}
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Transaction en cours...</span>
              ) : swapDirection === "sell" && Number(swapAmount) > syntheticTokens ? (
                `Solde ${tokenA} insuffisant`
              ) : (
                `Swap ${swapAmount || "0"} ${swapDirection === "sell" ? tokenA : tokenB} → ${swapOutput} ${swapDirection === "sell" ? tokenB : tokenA}`
              )}
            </button>
          </div>
        )}

        {/* ─── ADD LIQUIDITY ─── */}
        {tab === "liquidity" && (
          <div className="max-w-md mx-auto">
            <div className="bg-[#EEF2FF] rounded-xl p-3 mb-4">
              <p className="text-xs text-[#4F7DF3] font-medium">En fournissant de la liquidite, vous gagnez {POOL_APY}% APY en frais de swap sur la paire {tokenA}/{tokenB}.</p>
            </div>

            {/* sBF input */}
            <div className="bg-[#F7F8FA] rounded-2xl p-4 border border-[#E8ECF1] mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#9AA4B2]">{tokenA} a deposer</p>
                <p className="text-xs text-[#9AA4B2]">Solde : <span className="font-medium text-[#5F6B7A]">{syntheticTokens} {tokenA}</span></p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={lpAmountSbf}
                  onChange={(e) => { setLpAmountSbf(e.target.value); setLpAmountAda(e.target.value ? (Number(e.target.value) * POOL_RATE).toFixed(0) : ""); }}
                  placeholder="0"
                  className="flex-1 bg-transparent text-2xl font-bold text-[#0D0D12] placeholder-[#C4CAD4] outline-none tabular-nums"
                />
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#E8ECF1]">
                  <div className="w-6 h-6 rounded-full bg-[#EEF2FF] flex items-center justify-center"><span className="text-[10px] font-bold text-[#4F7DF3]">{tokenA}</span></div>
                  <span className="text-sm font-semibold text-[#0D0D12]">{tokenA}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center -my-1.5 relative z-10">
              <div className="w-8 h-8 bg-white border-4 border-[#F7F8FA] rounded-lg flex items-center justify-center">
                <span className="text-[#9AA4B2] text-lg font-bold">+</span>
              </div>
            </div>

            {/* ADA input */}
            <div className="bg-[#F7F8FA] rounded-2xl p-4 border border-[#E8ECF1] mt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#9AA4B2]">{tokenB} a deposer</p>
                <p className="text-xs text-[#9AA4B2]">Auto-calcule au ratio de la pool</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={lpAmountAda}
                  onChange={(e) => setLpAmountAda(e.target.value)}
                  placeholder="0"
                  className="flex-1 bg-transparent text-2xl font-bold text-[#0D0D12] placeholder-[#C4CAD4] outline-none tabular-nums"
                />
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#E8ECF1]">
                  <div className="w-6 h-6 rounded-full bg-[#F0F2F5] flex items-center justify-center"><span className="text-[10px] font-bold text-[#0D0D12]">A</span></div>
                  <span className="text-sm font-semibold text-[#0D0D12]">{tokenB}</span>
                </div>
              </div>
            </div>

            {/* LP details */}
            {lpAmountSbf && Number(lpAmountSbf) > 0 && (
              <div className="mt-3 bg-[#FAFBFC] rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-[#9AA4B2]">LP tokens recus</span><span className="font-semibold text-[#0D0D12] tabular-nums">{(Number(lpAmountSbf) * 2).toFixed(2)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-[#9AA4B2]">Part de la pool</span><span className="font-semibold text-[#0D0D12] tabular-nums">{((Number(lpAmountSbf) / POOL_TVL) * 100).toFixed(3)}%</span></div>
                <div className="flex justify-between text-xs"><span className="text-[#9AA4B2]">APY estime</span><span className="font-bold text-[#059669] tabular-nums">{POOL_APY}%</span></div>
              </div>
            )}

            <button
              onClick={handleAddLiquidity}
              disabled={processing || !lpAmountSbf || Number(lpAmountSbf) <= 0 || Number(lpAmountSbf) > syntheticTokens}
              className={`w-full mt-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${processing || !lpAmountSbf || Number(lpAmountSbf) <= 0 ? "bg-[#F0F2F5] text-[#9AA4B2] cursor-not-allowed" : "bg-[#059669] text-white hover:bg-[#047857] active:scale-[0.98]"}`}
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Ajout en cours...</span>
              ) : (
                `Ajouter liquidite — ${lpAmountSbf || "0"} ${tokenA} + ${lpAmountAda || "0"} ${tokenB}`
              )}
            </button>
          </div>
        )}

        {/* ─── POSITIONS ─── */}
        {tab === "positions" && (
          <div>
            {lpPositions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-[#F0F2F5] rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#9AA4B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <p className="text-sm text-[#9AA4B2]">Aucune position LP active</p>
                <p className="text-xs text-[#C4CAD4] mt-1">Ajoutez de la liquidite pour commencer a gagner des frais</p>
                <button onClick={() => setTab("liquidity")} className="mt-3 text-xs font-medium text-[#4F7DF3] hover:underline">Ajouter liquidite →</button>
              </div>
            ) : (
              <div className="space-y-3">
                {lpPositions.map((pos) => (
                  <div key={pos.id} className="bg-[#F7F8FA] rounded-2xl p-4 border border-[#E8ECF1]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full bg-[#EEF2FF] border-2 border-white flex items-center justify-center"><span className="text-[9px] font-bold text-[#4F7DF3]">{tokenA}</span></div>
                          <div className="w-8 h-8 rounded-full bg-[#F0F2F5] border-2 border-white flex items-center justify-center"><span className="text-[9px] font-bold text-[#0D0D12]">{tokenB}</span></div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#0D0D12]">{tokenA} / {tokenB}</p>
                          <p className="text-[10px] text-[#9AA4B2]">{pos.date}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveLp(pos.id)}
                        disabled={processing}
                        className="text-xs font-medium px-3 py-1.5 rounded-xl ring-1 ring-[#DC2626]/10 bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FECACA] transition-colors disabled:opacity-50"
                      >
                        Retirer
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div><p className="text-[10px] text-[#9AA4B2]">{tokenA} depose</p><p className="text-sm font-semibold text-[#0D0D12] tabular-nums">{pos.sbf}</p></div>
                      <div><p className="text-[10px] text-[#9AA4B2]">{tokenB} depose</p><p className="text-sm font-semibold text-[#0D0D12] tabular-nums">{Number(pos.ada).toLocaleString("fr-FR")}</p></div>
                      <div><p className="text-[10px] text-[#9AA4B2]">LP tokens</p><p className="text-sm font-semibold text-[#4F7DF3] tabular-nums">{pos.lpTokens}</p></div>
                      <div><p className="text-[10px] text-[#9AA4B2]">Part pool</p><p className="text-sm font-semibold text-[#059669] tabular-nums">{pos.share}%</p></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── HISTORY ─── */}
        {tab === "history" && (
          <div>
            {txHistory.length === 0 ? (
              <p className="text-center text-sm text-[#9AA4B2] py-12">Aucune transaction</p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#F0F2F5]">
                    <th className="pb-2 text-[10px] text-[#9AA4B2] font-medium">Type</th>
                    <th className="pb-2 text-[10px] text-[#9AA4B2] font-medium">Envoye</th>
                    <th className="pb-2 text-[10px] text-[#9AA4B2] font-medium">Recu</th>
                    <th className="pb-2 text-[10px] text-[#9AA4B2] font-medium">Date</th>
                    <th className="pb-2 text-[10px] text-[#9AA4B2] font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {txHistory.map((tx) => (
                    <tr key={tx.id} className="border-b border-[#F0F2F5]">
                      <td className="py-2.5 text-xs font-medium text-[#0D0D12]">{tx.type}</td>
                      <td className="py-2.5 text-xs text-[#5F6B7A] tabular-nums">{tx.amountIn}</td>
                      <td className="py-2.5 text-xs text-[#059669] font-medium tabular-nums">{tx.amountOut}</td>
                      <td className="py-2.5 text-xs text-[#9AA4B2]">{tx.date}</td>
                      <td className="py-2.5"><span className="text-[10px] font-medium text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full">{tx.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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

  // Compute synthetic token breakdown per fund
  const syntheticByFund = funds.map((f) => {
    const fundPositions = vaultPositions.filter((p) => p.fund_id === f.id && p.status === "locked");
    const sBF = fundPositions.reduce((s, p) => s + (p.synthetic_token_count || 0), 0);
    const locked = fundPositions.reduce((s, p) => s + (p.security_token_count || 0), 0);
    const fundOrders = myOrders.filter((o) => o.fundId === f.id);
    const totalParts = fundOrders.reduce((s, o) => s + Math.floor(o.montant / NAV_PER_PART), 0);
    return { ...f, sBF, locked, totalParts, available: totalParts - locked, positions: fundPositions.length };
  }).filter((f) => f.totalParts > 0 || f.sBF > 0);

  // Load funds and vault positions
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [fundsRes, vaultRes] = await Promise.all([
        supabase.from("funds").select("id, fund_name, slug, cardano_policy_id").eq("status", "active").order("fund_name"),
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

  if (loading) return <div className="text-center py-12 text-[#9AA4B2] text-sm">Chargement...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#0D0D12]">Collateral & DeFi</h2>
        <p className="text-sm text-[#9AA4B2] mt-1">Tokenisez vos parts en synthetic tokens librement transferables</p>
      </div>

      {/* Explainer banner */}
      <div className="bg-[#EEF2FF] rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 bg-[#C7D2FE] rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-[#4F7DF3] font-bold text-xs">sBF</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0D0D12]">Synthetic Tokens — Modele BlackRock BUIDL</p>
          <p className="text-xs text-[#5F6B7A] mt-1 leading-relaxed">
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
      <div className="bg-white rounded-2xl p-6 border border-[#E8ECF1]">
        <h3 className="text-sm font-semibold text-[#0D0D12] mb-1">Mint Synthetic Tokens</h3>
        <p className="text-xs text-[#9AA4B2] mb-4">Lock vos security tokens → Recevez des synthetic tokens 1:1</p>

        <div className="mb-4">
          <label className={labelCls}>Fonds</label>
          {funds.length === 0 ? (
            <p className="text-sm text-amber-600">Aucun fonds disponible — veuillez contacter l'administrateur</p>
          ) : (
            <select
              value={selectedFund?.id || ""}
              onChange={(e) => setSelectedFund(funds.find((f) => f.id === e.target.value))}
              className={selectCls}
            >
              {funds.map((f) => <option key={f.id} value={f.id}>{f.fund_name}</option>)}
            </select>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 items-end">
          <div>
            <label className={labelCls}>Security tokens a lock (BF)</label>
            <input type="number" min={1} max={availableTokens} value={mintAmount} onChange={(e) => setMintAmount(Number(e.target.value))} className={inputCls} />
            <p className="text-xs text-[#9AA4B2] mt-1">Disponible : {availableTokens} BF</p>
          </div>
          <div>
            <label className={labelCls}>Synthetic tokens recus</label>
            <p className="text-lg font-semibold text-[#4F7DF3] tabular-nums">
              {mintAmount} sBF
            </p>
          </div>
          <button
            disabled={minting || mintAmount <= 0 || mintAmount > availableTokens || !profile?.wallet_address}
            onClick={handleMintSynthetic}
            className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${minting || mintAmount <= 0 || mintAmount > availableTokens ? "bg-[#F0F2F5] text-[#9AA4B2] cursor-not-allowed" : "bg-[#0D0D12] hover:bg-[#1A1A2E] text-white"}`}
          >
            {minting ? "Transaction en cours..." : `Lock ${mintAmount} BF → Mint ${mintAmount} sBF`}
          </button>
        </div>

        {!profile?.wallet_address && (
          <p className="text-xs text-amber-600 mt-3">Vous devez renseigner votre adresse wallet dans votre profil pour utiliser le vault.</p>
        )}
      </div>

      {/* Synthetic tokens per fund */}
      {syntheticByFund.length > 0 && (
        <div className="bg-white rounded-2xl overflow-hidden border border-[#E8ECF1]">
          <div className="px-6 py-4 border-b border-[#F0F2F5]">
            <h3 className="text-sm font-semibold text-[#0D0D12]">Mes tokens synthetiques par fonds</h3>
          </div>
          <div className="grid gap-4 p-5">
            {syntheticByFund.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-4 bg-[#F7F8FA] rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center">
                    <span className="text-[#4F7DF3] font-bold text-xs">sBF</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0D0D12]">{f.fund_name}</p>
                    <p className="text-xs text-[#9AA4B2]">{f.positions} position{f.positions > 1 ? "s" : ""} active{f.positions > 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8 text-right">
                  <div>
                    <p className="text-xs text-[#9AA4B2]">Parts detenues</p>
                    <p className="text-sm font-semibold text-[#0D0D12] tabular-nums">{f.totalParts.toLocaleString("fr-FR")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9AA4B2]">BF lockes</p>
                    <p className="text-sm font-semibold text-[#0D0D12] tabular-nums">{f.locked.toLocaleString("fr-FR")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9AA4B2]">sBF detenus</p>
                    <p className="text-sm font-bold text-[#059669] tabular-nums">{f.sBF.toLocaleString("fr-FR")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9AA4B2]">Disponible</p>
                    <p className="text-sm font-semibold text-[#5F6B7A] tabular-nums">{f.available.toLocaleString("fr-FR")} BF</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DeFi Pools — Embedded protocols */}
      {syntheticTokens > 0 && (
        <DeFiPoolsEmbed syntheticTokens={syntheticTokens} toast={toast} />
      )}

      {/* Transaction result */}
      {txResult && (
        <div className="bg-[#ECFDF5] ring-1 ring-[#059669]/10 rounded-xl p-5">
          <p className="text-sm font-medium text-[#059669] mb-1">{txResult.type === "mint" ? "Synthetic tokens mintes" : "Synthetic tokens brules — Security tokens deverrouilles"}</p>
          <p className="text-xs text-[#5F6B7A]">
            Tx : <a href={getExplorerUrl(txResult.txHash)} target="_blank" rel="noopener noreferrer" className="text-[#4F7DF3] underline font-mono">{shortenHash(txResult.txHash)}</a>
          </p>
        </div>
      )}

      {/* Active vault positions */}
      <div className="bg-white rounded-2xl overflow-hidden border border-[#E8ECF1]">
        <div className="px-6 py-4 border-b border-[#F0F2F5]">
          <h3 className="text-sm font-semibold text-[#0D0D12]">Positions vault actives</h3>
        </div>

        {lockedPositions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-[#F0F2F5] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#9AA4B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <p className="text-sm text-[#9AA4B2]">Aucune position active</p>
            <p className="text-xs text-[#C4CAD4] mt-1">Mintez des synthetic tokens pour creer une position</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#F7F8FA] border-b border-[#F0F2F5]">
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Date</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Vault</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">BF lockes</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">sBF mintes</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Tx</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {lockedPositions.map((p) => (
                <tr key={p.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC] transition-colors">
                  <td className="px-5 py-3 text-xs text-[#5F6B7A]">{new Date(p.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-5 py-3 font-mono text-xs text-[#5F6B7A]">{p.vault_address?.slice(0, 16)}...</td>
                  <td className="px-5 py-3 text-right font-mono text-[#0D0D12] font-medium tabular-nums">{p.security_token_count}</td>
                  <td className="px-5 py-3 text-right font-mono text-[#059669] tabular-nums">{p.synthetic_token_count}</td>
                  <td className="px-5 py-3">
                    <a href={getExplorerUrl(p.lock_tx_hash)} target="_blank" rel="noopener noreferrer" className="text-xs text-[#4F7DF3] underline font-mono">
                      {shortenHash(p.lock_tx_hash)}
                    </a>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      disabled={burning === p.id}
                      onClick={() => handleBurnSynthetic(p)}
                      className="text-xs font-medium px-3 py-1.5 rounded-xl ring-1 ring-[#DC2626]/10 bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FECACA] transition-colors disabled:opacity-50"
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
        <div className="bg-white rounded-2xl overflow-hidden border border-[#E8ECF1]">
          <div className="px-6 py-4 border-b border-[#F0F2F5]">
            <h3 className="text-sm font-semibold text-[#0D0D12]">Historique (positions cloturees)</h3>
          </div>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#F7F8FA] border-b border-[#F0F2F5]">
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Lock</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Unlock</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">Tokens</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Tx unlock</th>
              </tr>
            </thead>
            <tbody>
              {unlockedPositions.map((p) => (
                <tr key={p.id} className="border-b border-[#F0F2F5]">
                  <td className="px-5 py-3 text-xs text-[#9AA4B2]">{new Date(p.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-5 py-3 text-xs text-[#9AA4B2]">{p.unlocked_at ? new Date(p.unlocked_at).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="px-5 py-3 text-right font-mono text-[#5F6B7A] tabular-nums">{p.security_token_count} BF</td>
                  <td className="px-5 py-3">
                    {p.unlock_tx_hash ? (
                      <a href={getExplorerUrl(p.unlock_tx_hash)} target="_blank" rel="noopener noreferrer" className="text-xs text-[#4F7DF3] underline font-mono">
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
      <div className="flex border-b border-[#E8ECF1] mb-8">
        {mainTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setSection(tab.id); if (tab.id === "funds") { setFundView("catalog"); setSelectedFund(null); } }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all relative ${section === tab.id ? "text-[#0D0D12]" : "text-[#9AA4B2] hover:text-[#5F6B7A]"}`}
          >
            {tab.icon}
            {tab.label}
            {section === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D0D12] rounded-full" />}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {section === "dashboard" && (
        <InvestorDashboard onViewFund={(slug) => { setSection("funds"); setFundView("detail:" + slug); }} onNavigate={(s) => { setSection(s); if (s === "funds") { setFundView("catalog"); setSelectedFund(null); } }} />
      )}

      {/* Funds section */}
      {section === "funds" && (
        <>
          {fundView === "subscribe" && (
            <div className="flex border-b border-[#E8ECF1] mb-8">
              <button onClick={handleBackToFunds} className="px-5 py-3 text-sm text-[#9AA4B2] hover:text-[#0D0D12] transition-all font-medium">
                ← Fonds
              </button>
              <button className="px-5 py-3 text-sm font-medium text-[#0D0D12] relative">
                Souscription directe
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D0D12] rounded-full" />
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
