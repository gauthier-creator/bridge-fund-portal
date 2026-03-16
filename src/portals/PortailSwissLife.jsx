import { useState, useRef, useEffect } from "react";
import { NAV_PER_PART } from "../data";
import { generateBulletinPDF } from "../generateBulletin";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { uploadGeneratedPDF } from "../utils/generateDocument";
import { supabase } from "../lib/supabase";
import { listMyClients, createClientAccount, updateUserProfile } from "../services/profileService";
import {
  KPICard, Badge, fmt, fmtFull, inputCls, selectCls, labelCls,
  Checkbox, ComplianceAlert, SignaturePad, useInView, useCountUp,
} from "../components/shared";
import { transferToken, mintSynthetic, burnSynthetic, generateWallet } from "../services/cardanoService";
import FundCatalog from "../components/FundCatalog";
import FundDetail from "../components/FundDetail";

/* ─────────────────────────────────────────────────────
   1. TABLEAU DE BORD
   ───────────────────────────────────────────────────── */
function DashboardIntermediaire({ toast, onViewClients, onViewCustody }) {
  const { orders, collateralPositions } = useAppContext();
  const { user, profile } = useAuth();

  const myOrders = orders.filter((o) => o.intermediaryId === user?.id || o.intermediaire);
  const validatedOrders = myOrders.filter((o) => o.status === "validated");
  const pendingOrders = myOrders.filter((o) => o.status === "pending");

  const totalAUM = validatedOrders.reduce((s, o) => s + o.montant, 0);
  const totalPending = pendingOrders.reduce((s, o) => s + o.montant, 0);
  const totalTokens = validatedOrders.reduce((s, o) => s + Math.floor(o.montant / NAV_PER_PART), 0);
  const totalStaked = collateralPositions.reduce((s, p) => s + p.tokens, 0);

  const statusLabel = (s) => s === "pending" ? "En attente" : s === "validated" ? "Approuvé" : "Rejeté";

  const [dashRef, dashInView] = useInView();
  const [tableRef, tableInView] = useInView();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="stagger-hero">
        <h2 className="text-xl font-semibold text-[#0D0D12]">Bonjour, {profile?.full_name?.split(" ")[0] || "Intermédiaire"}</h2>
        <p className="text-sm text-[#5F6B7A] mt-1">Pilotez votre activité d'intermédiation</p>
      </div>

      {/* KPIs */}
      <div ref={dashRef} className={`grid grid-cols-4 gap-4 stagger-fast ${dashInView ? "" : "opacity-0"}`}>
        <KPICard label="AUM total" value={fmt(totalAUM)} sub={`${totalTokens} tokens BF`} delay={0} />
        <KPICard label="En attente" value={fmt(totalPending)} sub={`${pendingOrders.length} souscription${pendingOrders.length > 1 ? "s" : ""}`} delay={60} />
        <KPICard label="Souscriptions validées" value={validatedOrders.length} sub="Tous fonds confondus" delay={120} />
        <KPICard label="Tokens stakés" value={`${totalStaked} BF`} sub={`${collateralPositions.length} position${collateralPositions.length > 1 ? "s" : ""}`} delay={180} />
      </div>

      {/* Recent subscriptions */}
      <div ref={tableRef} className={`bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden card-elevated ${tableInView ? "" : "opacity-0"}`}>
        <div className="px-6 py-4 border-b border-[#E8ECF1] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0D0D12]">Souscriptions récentes</h3>
          <span className="text-xs text-[#9AA4B2]">{myOrders.length} souscription{myOrders.length > 1 ? "s" : ""}</span>
        </div>

        {myOrders.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-[#F7F8FA] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#5F6B7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <p className="text-sm text-[#9AA4B2]">Aucune souscription pour le moment</p>
            <p className="text-xs text-[#5F6B7A] mt-1">Souscrivez pour le compte de vos clients depuis le catalogue de fonds</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#E8ECF1] bg-[#F7F8FA]">
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Ref</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Client</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Classe</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">Montant</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Paiement</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Statut</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="stagger-rows">
              {myOrders.sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 10).map((o) => (
                <tr key={o.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC] transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-[#0D0D12]">{o.id?.slice(0, 12)}...</td>
                  <td className="px-5 py-3 text-[#0D0D12] font-medium text-xs">{o.lpName}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#EEF2FF] text-[#4F7DF3]">
                      Classe {o.shareClass || 1}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-[#0D0D12]">{fmt(o.montant)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium ${o.paymentMethod === "crypto" ? "text-[#4F7DF3]" : "text-[#9AA4B2]"}`}>
                      {o.paymentMethod === "crypto" ? "Crypto (ADA)" : "Virement"}
                    </span>
                  </td>
                  <td className="px-5 py-3"><Badge status={statusLabel(o.status)} /></td>
                  <td className="px-5 py-3 text-[#9AA4B2] text-xs">{o.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   2. SOUSCRIPTION INTERMEDIEE (simplifiée)
   Le client est déjà onboardé via MesClients (KYC/KYB fait).
   Ici : sélection client → paramètres → paiement → signature → confirmation
   ───────────────────────────────────────────────────── */
function SouscriptionIntermediee({ toast, fund, clients }) {
  const { submitOrder } = useAppContext();
  const { profile, user } = useAuth();
  const intermediaireName = profile?.company || profile?.full_name || "Intermédiaire";
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    clientId: "",
    montant: 150000,
    shareClass: 2,
    paymentMethod: "fiat",
  });
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [subRef] = useState(() => "BF-SL-2026-" + String(Math.floor(Math.random() * 9000) + 1000));
  const [consents, setConsents] = useState({ prospectus: false, dici: false, risques: false, illiquidite: false, donnees: false, fiscalite: false });

  // Only show KYC-validated clients
  const kycClients = clients.filter((c) => c.kyc_status === "validated");
  const selectedClient = kycClients.find((c) => c.id === formData.clientId);

  const allConsentsChecked = Object.values(consents).every(Boolean);
  const canSign = allConsentsChecked && signatureData;
  const set = (key, val) => setFormData((prev) => ({ ...prev, [key]: val }));
  const steps = ["Client & Fonds", "Paiement", "Signature", "Confirmation"];

  const handlePayment = () => {
    toast("Virement en cours de vérification");
    setTimeout(() => { setPaymentReceived(true); toast("Virement reçu — " + fmt(formData.montant)); }, 2000);
  };

  const handleSign = () => {
    const clientName = selectedClient ? selectedClient.full_name : "";
    const doc = generateBulletinPDF({
      formData: {
        nom: clientName.split(" ").slice(1).join(" ") || clientName,
        prenom: clientName.split(" ")[0] || "",
        societe: selectedClient?.company || "",
        pays: selectedClient?.country || "France",
        typeInvestisseur: selectedClient?.investor_classification || "Averti",
        montant: formData.montant,
        shareClass: formData.shareClass,
        origineFonds: selectedClient?.source_of_funds || "",
        pepStatus: selectedClient?.pep_status || "non",
      },
      subRef,
      personType: selectedClient?.person_type || "physique",
      signatureDataUrl: signatureData,
    });
    const blob = doc.output("blob");
    setPdfUrl(URL.createObjectURL(blob));
    setSigned(true);
    toast(`Bulletin signé — souscription intermédiée par ${intermediaireName}`);
    submitOrder({
      id: subRef,
      type: "intermediated",
      intermediaire: intermediaireName,
      intermediaryId: user?.id || null,
      lpName: selectedClient?.full_name || "",
      userId: selectedClient?.id || null,
      fundId: fund?.id || null,
      shareClass: formData.shareClass,
      montant: formData.montant,
      date: new Date().toISOString().split("T")[0],
      status: "pending",
      kycStatus: "Validé",
      paymentStatus: "Reçu",
      personType: selectedClient?.person_type || "physique",
      pays: selectedClient?.country || "France",
      typeInvestisseur: selectedClient?.investor_classification || "Averti",
      signatureDate: new Date().toISOString(),
      origineFonds: selectedClient?.source_of_funds || "",
      fundName: fund?.name || "Bridge Fund",
      documents: [],
    });
  };

  return (
    <div className="animate-fade-in">
      {/* Fund context banner */}
      {fund && (
        <div className="bg-[#F7F8FA] border border-[#E8ECF1] rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0D0D12] rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">BF</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0D0D12]">{fund.name}</p>
            <p className="text-xs text-[#9AA4B2]">{fund.legalForm} · {fund.jurisdiction} · {fund.targetReturn}</p>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center justify-center mb-10">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${i < step ? "bg-[#0D0D12] text-white" : i === step ? "bg-[#0D0D12] text-white" : "bg-[#F7F8FA] text-[#9AA4B2]"}`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs mt-2 font-medium ${i <= step ? "text-[#0D0D12]" : "text-[#9AA4B2]"}`}>{s}</span>
            </div>
            {i < 3 && <div className={`w-20 h-px mx-3 mt-[-16px] ${i < step ? "bg-[#0D0D12]" : "bg-[#E8ECF1]"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E8ECF1] p-8 max-w-2xl mx-auto">
        {/* Intermediary banner */}
        <div className="bg-[#EEF2FF] border border-[#E8ECF1] rounded-xl p-3 mb-6 flex items-center gap-2 text-xs text-[#4F7DF3]">
          <span className="font-bold text-sm">SL</span>
          <span>Souscription intermédiée par <strong>{intermediaireName}</strong> — dépositaire / custodian</span>
        </div>

        {/* Step 0: Select client & fund parameters */}
        {step === 0 && (
          <div className="animate-fade-in">
            <h3 className="text-lg font-semibold text-[#0D0D12] mb-2">Sélection du client</h3>
            <p className="text-xs text-[#9AA4B2] mb-5">Sélectionnez un client dont le KYC/KYB est validé puis définissez les paramètres de souscription</p>

            <div className="space-y-4 text-left">
              <div>
                <label className={labelCls}>Client <span className="text-[#DC2626]">*</span></label>
                {kycClients.length === 0 ? (
                  <div className="bg-[#FFFBEB] border border-[#E8ECF1] rounded-xl p-3 text-xs text-[#D97706]">
                    Aucun client avec KYC validé. Onboardez d'abord un client depuis l'onglet "Mes clients".
                  </div>
                ) : (
                  <select value={formData.clientId} onChange={(e) => set("clientId", e.target.value)} className={selectCls}>
                    <option value="">Sélectionnez un client...</option>
                    {kycClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} {c.company ? `(${c.company})` : ""} — {c.investor_classification || "Averti"}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedClient && (
                <div className="bg-[#F7F8FA] rounded-xl p-4 space-y-1.5 text-sm">
                  <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-2">Fiche client</p>
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">Nom</span><span className="text-[#0D0D12] font-medium">{selectedClient.full_name}</span></div>
                  {selectedClient.company && <div className="flex justify-between"><span className="text-[#9AA4B2]">Société</span><span className="text-[#0D0D12]">{selectedClient.company}</span></div>}
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">Classification</span><span className="text-[#0D0D12]">{selectedClient.investor_classification || "Averti"}</span></div>
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">Type</span><span className="text-[#0D0D12]">{selectedClient.person_type === "morale" ? "Personne morale" : "Personne physique"}</span></div>
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">KYC</span><Badge status="Validé" /></div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="col-span-2">
                  <label className={labelCls}>Montant de souscription <span className="text-[#DC2626]">*</span></label>
                  <input type="number" value={formData.montant} onChange={(e) => set("montant", Number(e.target.value))} min={100000} step={50000} className={inputCls} />
                  <p className="text-xs text-[#9AA4B2] mt-1">Minimum : 100 000 EUR · Parts estimées : {(formData.montant / NAV_PER_PART).toFixed(2)}</p>
                </div>
                <div className="p-4 rounded-xl border-2 border-[#E8ECF1] bg-[#FAFBFC] text-left opacity-60 cursor-not-allowed relative">
                  <p className="text-sm font-semibold text-[#9AA4B2]">Share Class A</p>
                  <p className="text-xs text-[#9AA4B2] mt-1">7-9% · 36 mois · Risque 5/7</p>
                  <span className="absolute top-2 right-2 text-[10px] bg-[#EEF2FF] text-[#4F7DF3] px-2 py-0.5 rounded-full font-medium">Souscription directe</span>
                </div>
                <button onClick={() => set("shareClass", 2)} className="p-4 rounded-xl border-2 border-[#4F7DF3] bg-[#FAFBFC] text-left transition-all">
                  <p className="text-sm font-semibold text-[#0D0D12]">Share Class B</p>
                  <p className="text-xs text-[#9AA4B2] mt-1">5-6% · 24 mois · Risque 4/7</p>
                  <p className="text-xs text-[#4F7DF3] mt-0.5 font-medium">Exclusivité intermédiaires</p>
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep(1)}
                disabled={!formData.clientId || formData.montant < 100000}
                className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-colors ${formData.clientId && formData.montant >= 100000 ? "bg-[#0D0D12] text-white hover:bg-[#1A1A2E]" : "bg-[#F7F8FA] text-[#9AA4B2] cursor-not-allowed"}`}
              >
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Payment */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h3 className="text-lg font-semibold text-[#0D0D12] mb-2">Virement de souscription</h3>
            <p className="text-xs text-[#9AA4B2] mb-5">Le client doit effectuer le virement aux coordonnées ci-dessous</p>

            <div className="bg-[#F7F8FA] rounded-xl p-5 text-left text-sm space-y-2 mb-4">
              <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-3">Coordonnées bancaires du fonds</p>
              <div className="flex justify-between"><span className="text-[#9AA4B2]">IBAN</span><span className="font-mono text-[#0D0D12] text-xs">LU28 0019 4006 4475 0000</span></div>
              <div className="flex justify-between"><span className="text-[#9AA4B2]">BIC</span><span className="font-mono text-[#0D0D12] text-xs">BABORLULLXXX</span></div>
              <div className="flex justify-between"><span className="text-[#9AA4B2]">Référence</span><span className="font-mono text-[#4F7DF3] text-xs">{subRef}</span></div>
              <div className="flex justify-between"><span className="text-[#9AA4B2]">Montant</span><span className="font-semibold text-[#0D0D12]">{fmt(formData.montant)}</span></div>
              <div className="flex justify-between"><span className="text-[#9AA4B2]">Client</span><span className="text-[#0D0D12]">{selectedClient?.full_name}</span></div>
            </div>

            <div className="mt-4 mb-6">
              {paymentReceived ? (
                <div className="flex items-center justify-center gap-2 text-[#059669] text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#ECFDF5]0" /> Paiement reçu
                </div>
              ) : (
                <button onClick={handlePayment} className="bg-[#EEF2FF] text-[#4F7DF3] px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#EEF2FF] transition-colors">Simuler réception</button>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(0)} className="text-sm text-[#9AA4B2] hover:text-[#0D0D12] transition-colors">← Retour</button>
              {paymentReceived && <button onClick={() => setStep(2)} className="bg-[#0D0D12] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1A1A2E] transition-colors">Continuer →</button>}
            </div>
          </div>
        )}

        {/* Step 2: Signature */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h3 className="text-lg font-semibold text-[#0D0D12] mb-2">Signature du bulletin</h3>
            <p className="text-xs text-[#9AA4B2] mb-5">Souscription intermédiée — signature du représentant habilité</p>

            <div className="bg-[#F7F8FA] rounded-xl p-5 text-left text-sm space-y-2 mb-6">
              <div className="flex justify-between"><span className="text-[#9AA4B2]">Client</span><span className="text-[#0D0D12] font-medium">{selectedClient?.full_name}</span></div>
              <div className="flex justify-between"><span className="text-[#9AA4B2]">Fonds</span><span className="text-[#0D0D12] font-medium">{fund?.name || "Bridge Fund"}</span></div>
              <div className="flex justify-between"><span className="text-[#9AA4B2]">Montant</span><span className="text-[#0D0D12] font-medium">{fmt(formData.montant)}</span></div>
              <div className="flex justify-between"><span className="text-[#9AA4B2]">Share Class</span><span className="text-[#0D0D12]">Classe {formData.shareClass}</span></div>
              <div className="flex justify-between"><span className="text-[#9AA4B2]">Parts estimées</span><span className="text-[#0D0D12]">{(formData.montant / NAV_PER_PART).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-[#9AA4B2]">Intermédiaire</span><span className="text-[#0D0D12] font-medium">{intermediaireName}</span></div>
            </div>

            <div className="text-left space-y-3 mb-6">
              <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold">Attestations réglementaires (CGP-CIF / Family Office)</p>
              <Checkbox checked={consents.prospectus} onChange={() => setConsents({ ...consents, prospectus: !consents.prospectus })} required>Prospectus lu et remis au client (CSSF)</Checkbox>
              <Checkbox checked={consents.dici} onChange={() => setConsents({ ...consents, dici: !consents.dici })} required>DIC/KID remis au client (PRIIPs / Règlement 1286/2014)</Checkbox>
              <Checkbox checked={consents.risques} onChange={() => setConsents({ ...consents, risques: !consents.risques })} required>Client informé des risques de perte en capital (MiFID II)</Checkbox>
              <Checkbox checked={consents.illiquidite} onChange={() => setConsents({ ...consents, illiquidite: !consents.illiquidite })} required>Client informé de la nature illiquide de l'investissement</Checkbox>
              <Checkbox checked={consents.fiscalite} onChange={() => setConsents({ ...consents, fiscalite: !consents.fiscalite })} required>Déclarations CRS/FATCA effectuées</Checkbox>
              <Checkbox checked={consents.donnees} onChange={() => setConsents({ ...consents, donnees: !consents.donnees })} required>Consentement RGPD collecté auprès du client</Checkbox>
            </div>

            {allConsentsChecked && !signed && (
              <div className="mb-6">
                <SignaturePad onSignature={setSignatureData} />
              </div>
            )}

            {!signed ? (
              <button onClick={handleSign} disabled={!canSign} className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${canSign ? "bg-[#0D0D12] text-white hover:bg-[#1A1A2E]" : "bg-[#F7F8FA] text-[#9AA4B2] cursor-not-allowed"}`}>
                Signer le bulletin intermédiaire
              </button>
            ) : (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-sm font-medium text-[#059669]">Bulletin signé — en attente de validation AIFM</p>
                {pdfUrl && (
                  <button onClick={() => window.open(pdfUrl, "_blank")} className="text-xs font-medium text-[#4F7DF3] hover:text-[#4F7DF3]-light transition-colors">Voir le PDF</button>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(1)} className="text-sm text-[#9AA4B2] hover:text-[#0D0D12] transition-colors">← Retour</button>
              {signed && <button onClick={() => setStep(3)} className="bg-[#0D0D12] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1A1A2E] transition-colors">Continuer →</button>}
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 bg-[#EEF2FF] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-[#4F7DF3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-[#0D0D12]">Souscription envoyée</h3>
            <p className="text-sm text-[#9AA4B2] mt-1">Ref: {subRef} · En attente de validation AIFM</p>
            <div className="bg-[#F7F8FA] rounded-xl p-5 text-sm space-y-2 mt-6 text-left">
              <div className="flex justify-between"><span className="text-[#9AA4B2]">Client</span><span className="text-[#0D0D12] font-medium">{selectedClient?.full_name}</span></div>
              <div className="flex justify-between"><span className="text-[#9AA4B2]">Fonds</span><span className="text-[#0D0D12] font-medium">{fund?.name || "Bridge Fund"}</span></div>
              <div className="flex justify-between"><span className="text-[#9AA4B2]">Montant</span><span className="text-[#0D0D12] font-medium">{fmt(formData.montant)}</span></div>
              <div className="flex justify-between"><span className="text-[#9AA4B2]">Parts estimées</span><span className="text-[#0D0D12] font-medium">{(formData.montant / NAV_PER_PART).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-[#9AA4B2]">Intermédiaire</span><span className="text-[#0D0D12] font-medium">{intermediaireName}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   3. MES CLIENTS — Onboarding KYC/KYB complet
   Parcours multi-étapes conforme CGP-CIF, Family Office, Banquier Privé
   AMLD5, CSSF 12-02, MiFID II, PRIIPs, CRS/FATCA
   ───────────────────────────────────────────────────── */
const KYC_STEPS = ["Identité", "Documents", "Connaissance client", "Classification", "Conformité", "Validation"];

function MesClients({ toast, clients, clientsLoaded, onClientsChange }) {
  const { profile, user } = useAuth();
  const { orders } = useAppContext();
  const loading = !clientsLoaded;
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [kycStep, setKycStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [selectedClientDetail, setSelectedClientDetail] = useState(null);

  // Onboarding form state
  const [personType, setPersonType] = useState("physique");
  const [clientData, setClientData] = useState({
    // Account
    email: "", password: "",
    // Identity
    nom: "", prenom: "", dateNaissance: "", nationalite: "Française",
    adresse: "", codePostal: "", ville: "", pays: "France",
    telephone: "", profession: "",
    // Personne morale
    societe: "", formeJuridique: "SAS", rcs: "", lei: "", dateCreation: "",
    siegeSocial: "", representantLegal: "",
    // UBO
    ubo1Nom: "", ubo1Pct: "", ubo1Nationalite: "",
    ubo2Nom: "", ubo2Pct: "", ubo2Nationalite: "",
    // Connaissance client
    experienceInvestissement: "intermediaire",
    objectifInvestissement: "rendement",
    horizonPlacement: "3-5 ans",
    toleranceRisque: "modere",
    patrimoineTotalTranche: "500k-1M",
    revenusAnnuelsTranche: "100k-250k",
    autresInvestissementsAlternatifs: "non",
    connaissanceProduitsDette: "oui",
    // Classification
    investorClassification: "Averti (well-informed)",
    // Compliance
    origineFonds: "",
    pepStatus: "non", pepDetail: "",
    sanctionsCheck: false,
    fatcaCrs: "non_us",
    tinFiscal: "",
    paysResidenceFiscale: "France",
  });
  const [walletMode, setWalletMode] = useState("generate");
  const [walletAddress, setWalletAddress] = useState("");
  const [documents, setDocuments] = useState([]);
  const fileRefs = {
    id: useRef(null), domicile: useRef(null), fonds: useRef(null),
    statuts: useRef(null), ubo: useRef(null), kbis: useRef(null),
    rib: useRef(null),
  };

  const setField = (key, val) => setClientData((prev) => ({ ...prev, [key]: val }));

  const handleFileSelect = (docType) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const date = new Date().toISOString().split("T")[0];
    const size = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} Mo` : `${(file.size / 1024).toFixed(0)} Ko`;
    if (supabase) {
      const path = `kyc/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
      if (!error) {
        const { data } = await supabase.storage.from("documents").createSignedUrl(path, 7 * 24 * 3600);
        setDocuments((prev) => [...prev, { name: file.name, type: docType, size, date, url: data?.signedUrl, storagePath: path }]);
      } else {
        setDocuments((prev) => [...prev, { name: file.name, type: docType, size, date, url: URL.createObjectURL(file) }]);
      }
    } else {
      setDocuments((prev) => [...prev, { name: file.name, type: docType, size, date, url: URL.createObjectURL(file) }]);
    }
    toast(`Document uploadé — ${file.name}`);
  };

  const DocUploadRow = ({ type, refKey, label, sub }) => {
    const doc = documents.find((d) => d.type === type);
    return doc ? (
      <div className="flex items-center gap-2 border border-[#E8ECF1] bg-[#ECFDF5] rounded-xl p-3 text-sm">
        <svg className="w-4 h-4 text-[#059669] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        <span className="text-[#059669] font-medium flex-1">{doc.name}</span>
        <span className="text-xs text-[#059669]">{doc.size}</span>
        <button onClick={() => window.open(doc.url, "_blank")} className="text-xs font-medium text-[#0D0D12] hover:text-[#4F7DF3] transition-colors">Consulter</button>
      </div>
    ) : (
      <div>
        <input type="file" ref={fileRefs[refKey]} onChange={handleFileSelect(type)} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
        <div className="border-2 border-dashed border-[#E8ECF1] rounded-xl p-3 text-center hover:border-[#4F7DF3]/30 transition-colors cursor-pointer" onClick={() => fileRefs[refKey]?.current?.click()}>
          <p className="text-sm text-[#9AA4B2]">{label}</p>
          <p className="text-xs text-[#5F6B7A] mt-0.5">{sub}</p>
        </div>
      </div>
    );
  };

  const handleCreateClient = async () => {
    if (walletMode === "existing" && !walletAddress.trim()) {
      toast("Veuillez renseigner l'adresse du wallet");
      return;
    }
    setCreating(true);
    try {
      const result = await createClientAccount({
        email: clientData.email,
        password: clientData.password,
        fullName: `${clientData.prenom} ${clientData.nom}`.trim(),
        company: clientData.societe || null,
        walletAddress: walletMode === "existing" ? walletAddress.trim() : undefined,
        kycData: {
          kyc_status: "validated",
          person_type: personType,
          investor_classification: clientData.investorClassification,
          source_of_funds: clientData.origineFonds,
          pep_status: clientData.pepStatus,
          country: clientData.pays,
          fatca_status: clientData.fatcaCrs,
          tax_residence: clientData.paysResidenceFiscale,
        },
      });

      // Refresh client list in parent
      if (onClientsChange) {
        const updated = await listMyClients();
        onClientsChange(updated);
      }

      toast(`Client onboardé avec succès — ${clientData.prenom} ${clientData.nom}`);
      resetOnboarding();
    } catch (err) {
      toast("Erreur : " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const resetOnboarding = () => {
    setShowOnboarding(false);
    setKycStep(0);
    setPersonType("physique");
    setWalletMode("generate");
    setWalletAddress("");
    setClientData({
      email: "", password: "",
      nom: "", prenom: "", dateNaissance: "", nationalite: "Française",
      adresse: "", codePostal: "", ville: "", pays: "France",
      telephone: "", profession: "",
      societe: "", formeJuridique: "SAS", rcs: "", lei: "", dateCreation: "",
      siegeSocial: "", representantLegal: "",
      ubo1Nom: "", ubo1Pct: "", ubo1Nationalite: "",
      ubo2Nom: "", ubo2Pct: "", ubo2Nationalite: "",
      experienceInvestissement: "intermediaire",
      objectifInvestissement: "rendement",
      horizonPlacement: "3-5 ans",
      toleranceRisque: "modere",
      patrimoineTotalTranche: "500k-1M",
      revenusAnnuelsTranche: "100k-250k",
      autresInvestissementsAlternatifs: "non",
      connaissanceProduitsDette: "oui",
      investorClassification: "Averti (well-informed)",
      origineFonds: "",
      pepStatus: "non", pepDetail: "",
      sanctionsCheck: false,
      fatcaCrs: "non_us",
      tinFiscal: "",
      paysResidenceFiscale: "France",
    });
    setDocuments([]);
  };

  // Enrich clients with order stats
  const getClientStats = (clientId) => {
    const clientOrders = orders.filter((o) => o.userId === clientId);
    const validated = clientOrders.filter((o) => o.status === "validated");
    const totalInvested = validated.reduce((s, o) => s + o.montant, 0);
    return { orderCount: clientOrders.length, validatedCount: validated.length, totalInvested };
  };

  // ─── Onboarding wizard ───
  if (showOnboarding) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#0D0D12]">Onboarding client</h2>
            <p className="text-sm text-[#9AA4B2] mt-1">Parcours KYC/KYB conforme — AMLD5, CSSF 12-02, MiFID II</p>
          </div>
          <button onClick={resetOnboarding} className="px-4 py-2 text-xs text-[#9AA4B2] hover:text-[#0D0D12] transition-colors">Annuler</button>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center">
          {KYC_STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${i < kycStep ? "bg-[#0D0D12] text-white" : i === kycStep ? "bg-[#0D0D12] text-white" : "bg-[#F7F8FA] text-[#9AA4B2]"}`}>
                  {i < kycStep ? "✓" : i + 1}
                </div>
                <span className={`text-[10px] mt-1.5 font-medium max-w-[70px] text-center ${i <= kycStep ? "text-[#0D0D12]" : "text-[#9AA4B2]"}`}>{s}</span>
              </div>
              {i < KYC_STEPS.length - 1 && <div className={`w-12 h-px mx-1.5 mt-[-14px] ${i < kycStep ? "bg-[#0D0D12]" : "bg-[#F7F8FA]"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[#E8ECF1] p-8 max-w-3xl mx-auto">

          {/* ── Step 0: Identité ── */}
          {kycStep === 0 && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-semibold text-[#0D0D12] mb-1">Identification du client</h3>
              <p className="text-xs text-[#9AA4B2] mb-5">Informations d'identité et coordonnées — Art. L.561-5 CMF</p>

              <div className="flex bg-[#F7F8FA] rounded-xl p-1 mb-6 max-w-xs">
                <button onClick={() => setPersonType("physique")} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${personType === "physique" ? "bg-white text-[#0D0D12]" : "text-[#9AA4B2]"}`}>Personne physique</button>
                <button onClick={() => setPersonType("morale")} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${personType === "morale" ? "bg-white text-[#0D0D12]" : "text-[#9AA4B2]"}`}>Personne morale</button>
              </div>

              {/* Account info */}
              <div className="mb-4">
                <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-3">Accès plateforme</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Email <span className="text-[#DC2626]">*</span></label>
                    <input type="email" value={clientData.email} onChange={(e) => setField("email", e.target.value)} className={inputCls} placeholder="client@email.com" />
                  </div>
                  <div>
                    <label className={labelCls}>Mot de passe <span className="text-[#DC2626]">*</span></label>
                    <input type="password" value={clientData.password} onChange={(e) => setField("password", e.target.value)} className={inputCls} placeholder="Min. 6 caractères" />
                  </div>
                </div>
              </div>

              {/* Wallet choice */}
              <div className="mb-4 p-4 rounded-xl border border-[#E8ECF1] bg-[#FAFBFC]">
                <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-3">Wallet Cardano</p>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="clientWalletMode" checked={walletMode === "generate"} onChange={() => { setWalletMode("generate"); setWalletAddress(""); }} className="w-4 h-4 accent-[#0D0D12]" />
                    <span className="text-sm text-[#0D0D12]">Générer un nouveau wallet</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="clientWalletMode" checked={walletMode === "existing"} onChange={() => setWalletMode("existing")} className="w-4 h-4 accent-[#0D0D12]" />
                    <span className="text-sm text-[#0D0D12]">Renseigner une adresse existante</span>
                  </label>
                </div>
                {walletMode === "existing" ? (
                  <input value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} className={`${inputCls} font-mono`} placeholder="addr_test1q..." />
                ) : (
                  <p className="text-xs text-[#9AA4B2]">Un wallet sera automatiquement généré à la création du compte.</p>
                )}
              </div>

              {personType === "physique" ? (
                <>
                  <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-3">État civil</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelCls}>Nom <span className="text-[#DC2626]">*</span></label><input value={clientData.nom} onChange={(e) => setField("nom", e.target.value)} className={inputCls} placeholder="Duval" /></div>
                    <div><label className={labelCls}>Prénom <span className="text-[#DC2626]">*</span></label><input value={clientData.prenom} onChange={(e) => setField("prenom", e.target.value)} className={inputCls} placeholder="Marie-Claire" /></div>
                    <div><label className={labelCls}>Date de naissance <span className="text-[#DC2626]">*</span></label><input type="date" value={clientData.dateNaissance} onChange={(e) => setField("dateNaissance", e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>Nationalité <span className="text-[#DC2626]">*</span></label><input value={clientData.nationalite} onChange={(e) => setField("nationalite", e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>Profession</label><input value={clientData.profession} onChange={(e) => setField("profession", e.target.value)} className={inputCls} placeholder="Directeur financier" /></div>
                    <div><label className={labelCls}>Téléphone</label><input value={clientData.telephone} onChange={(e) => setField("telephone", e.target.value)} className={inputCls} placeholder="+33 6 12 34 56 78" /></div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-3">Adresse</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2"><label className={labelCls}>Adresse <span className="text-[#DC2626]">*</span></label><input value={clientData.adresse} onChange={(e) => setField("adresse", e.target.value)} className={inputCls} placeholder="12 rue de la Paix" /></div>
                      <div><label className={labelCls}>Code postal <span className="text-[#DC2626]">*</span></label><input value={clientData.codePostal} onChange={(e) => setField("codePostal", e.target.value)} className={inputCls} /></div>
                      <div><label className={labelCls}>Ville <span className="text-[#DC2626]">*</span></label><input value={clientData.ville} onChange={(e) => setField("ville", e.target.value)} className={inputCls} /></div>
                      <div><label className={labelCls}>Pays <span className="text-[#DC2626]">*</span></label><select value={clientData.pays} onChange={(e) => setField("pays", e.target.value)} className={selectCls}>{["France", "Luxembourg", "Belgique", "Suisse", "Pays-Bas", "Allemagne", "Italie", "Espagne", "Royaume-Uni"].map((p) => <option key={p}>{p}</option>)}</select></div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-3">Informations société</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2"><label className={labelCls}>Dénomination sociale <span className="text-[#DC2626]">*</span></label><input value={clientData.societe} onChange={(e) => setField("societe", e.target.value)} className={inputCls} placeholder="Duval Patrimoine SAS" /></div>
                    <div><label className={labelCls}>Forme juridique</label><select value={clientData.formeJuridique} onChange={(e) => setField("formeJuridique", e.target.value)} className={selectCls}><option>SAS</option><option>SARL</option><option>SA</option><option>SCI</option><option>SCSp</option><option>GmbH</option><option>Ltd</option><option>Autre</option></select></div>
                    <div><label className={labelCls}>RCS / Registre</label><input value={clientData.rcs} onChange={(e) => setField("rcs", e.target.value)} className={inputCls} placeholder="Paris B 123 456 789" /></div>
                    <div><label className={labelCls}>LEI</label><input value={clientData.lei} onChange={(e) => setField("lei", e.target.value)} className={inputCls} placeholder="Code LEI 20 caractères" /></div>
                    <div><label className={labelCls}>Date de création</label><input type="date" value={clientData.dateCreation} onChange={(e) => setField("dateCreation", e.target.value)} className={inputCls} /></div>
                    <div className="col-span-2"><label className={labelCls}>Siège social <span className="text-[#DC2626]">*</span></label><input value={clientData.siegeSocial} onChange={(e) => setField("siegeSocial", e.target.value)} className={inputCls} placeholder="12 rue de la Paix, 75002 Paris" /></div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-3">Représentant légal</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={labelCls}>Nom <span className="text-[#DC2626]">*</span></label><input value={clientData.nom} onChange={(e) => setField("nom", e.target.value)} className={inputCls} /></div>
                      <div><label className={labelCls}>Prénom <span className="text-[#DC2626]">*</span></label><input value={clientData.prenom} onChange={(e) => setField("prenom", e.target.value)} className={inputCls} /></div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-3">Bénéficiaires effectifs (UBO > 25%)</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div><label className={labelCls}>Nom UBO 1</label><input value={clientData.ubo1Nom} onChange={(e) => setField("ubo1Nom", e.target.value)} className={inputCls} /></div>
                      <div><label className={labelCls}>% détention</label><input value={clientData.ubo1Pct} onChange={(e) => setField("ubo1Pct", e.target.value)} className={inputCls} placeholder="ex: 60%" /></div>
                      <div><label className={labelCls}>Nationalité</label><input value={clientData.ubo1Nationalite} onChange={(e) => setField("ubo1Nationalite", e.target.value)} className={inputCls} /></div>
                      <div><label className={labelCls}>Nom UBO 2</label><input value={clientData.ubo2Nom} onChange={(e) => setField("ubo2Nom", e.target.value)} className={inputCls} /></div>
                      <div><label className={labelCls}>% détention</label><input value={clientData.ubo2Pct} onChange={(e) => setField("ubo2Pct", e.target.value)} className={inputCls} /></div>
                      <div><label className={labelCls}>Nationalité</label><input value={clientData.ubo2Nationalite} onChange={(e) => setField("ubo2Nationalite", e.target.value)} className={inputCls} /></div>
                    </div>
                  </div>
                </>
              )}

              <div className="mt-6 flex justify-end">
                <button onClick={() => setKycStep(1)} disabled={!clientData.nom || !clientData.prenom || !clientData.email || !clientData.password} className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-colors ${clientData.nom && clientData.prenom && clientData.email && clientData.password ? "bg-[#0D0D12] text-white hover:bg-[#1A1A2E]" : "bg-[#F7F8FA] text-[#9AA4B2] cursor-not-allowed"}`}>
                  Continuer →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 1: Documents KYC/KYB ── */}
          {kycStep === 1 && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-semibold text-[#0D0D12] mb-1">Pièces justificatives</h3>
              <p className="text-xs text-[#9AA4B2] mb-5">Documents requis — AMLD5 & Circulaire CSSF 12-02</p>

              <div className="space-y-3">
                <DocUploadRow type="Pièce d'identité" refKey="id" label={personType === "physique" ? "Passeport ou carte nationale d'identité" : "K-bis ou extrait du registre de commerce"} sub="PDF, JPG, PNG — max 10 Mo" />
                <DocUploadRow type="Justificatif de domicile" refKey="domicile" label="Justificatif de domicile (moins de 3 mois)" sub="Facture énergie, téléphone, avis d'imposition" />
                <DocUploadRow type="Justificatif origine des fonds" refKey="fonds" label="Justificatif d'origine des fonds" sub="Relevé bancaire, acte de cession, attestation employeur" />
                <DocUploadRow type="RIB" refKey="rib" label="RIB / Coordonnées bancaires" sub="Relevé d'identité bancaire au nom du souscripteur" />
                {personType === "morale" && (
                  <>
                    <DocUploadRow type="Statuts société" refKey="statuts" label="Statuts à jour de la société" sub="Dernière version certifiée conforme" />
                    <DocUploadRow type="Déclaration UBO" refKey="ubo" label="Déclaration des bénéficiaires effectifs (UBO)" sub="Formulaire UBO + pièces d'identité des UBO > 25%" />
                    <DocUploadRow type="K-bis" refKey="kbis" label="K-bis ou équivalent (moins de 3 mois)" sub="Extrait du registre du commerce et des sociétés" />
                  </>
                )}
              </div>

              {documents.length > 0 && (
                <div className="mt-4 flex items-center gap-2 text-xs text-[#059669] font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {documents.length} document{documents.length > 1 ? "s" : ""} déposé{documents.length > 1 ? "s" : ""}
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <button onClick={() => setKycStep(0)} className="text-sm text-[#9AA4B2] hover:text-[#0D0D12] transition-colors">← Retour</button>
                <button onClick={() => setKycStep(2)} className="bg-[#0D0D12] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1A1A2E] transition-colors">Continuer →</button>
              </div>
            </div>
          )}

          {/* ── Step 2: Connaissance client ── */}
          {kycStep === 2 && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-semibold text-[#0D0D12] mb-1">Connaissance client</h3>
              <p className="text-xs text-[#9AA4B2] mb-5">Évaluation du profil investisseur — MiFID II, Art. 25 Directive 2014/65/UE</p>

              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-3">Situation patrimoniale</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Patrimoine financier total</label>
                      <select value={clientData.patrimoineTotalTranche} onChange={(e) => setField("patrimoineTotalTranche", e.target.value)} className={selectCls}>
                        <option value="0-100k">Moins de 100 000 EUR</option>
                        <option value="100k-500k">100 000 — 500 000 EUR</option>
                        <option value="500k-1M">500 000 — 1 000 000 EUR</option>
                        <option value="1M-5M">1 000 000 — 5 000 000 EUR</option>
                        <option value="5M+">Plus de 5 000 000 EUR</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Revenus annuels</label>
                      <select value={clientData.revenusAnnuelsTranche} onChange={(e) => setField("revenusAnnuelsTranche", e.target.value)} className={selectCls}>
                        <option value="0-50k">Moins de 50 000 EUR</option>
                        <option value="50k-100k">50 000 — 100 000 EUR</option>
                        <option value="100k-250k">100 000 — 250 000 EUR</option>
                        <option value="250k-500k">250 000 — 500 000 EUR</option>
                        <option value="500k+">Plus de 500 000 EUR</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-3">Expérience & connaissances</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Expérience en investissement</label>
                      <select value={clientData.experienceInvestissement} onChange={(e) => setField("experienceInvestissement", e.target.value)} className={selectCls}>
                        <option value="debutant">Débutant (0-2 ans)</option>
                        <option value="intermediaire">Intermédiaire (2-5 ans)</option>
                        <option value="experimente">Expérimenté (5-10 ans)</option>
                        <option value="expert">Expert (10+ ans)</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Connaissance dette privée</label>
                      <select value={clientData.connaissanceProduitsDette} onChange={(e) => setField("connaissanceProduitsDette", e.target.value)} className={selectCls}>
                        <option value="non">Non</option>
                        <option value="basique">Basique</option>
                        <option value="oui">Oui, bonne connaissance</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Investissements alternatifs existants</label>
                      <select value={clientData.autresInvestissementsAlternatifs} onChange={(e) => setField("autresInvestissementsAlternatifs", e.target.value)} className={selectCls}>
                        <option value="non">Non</option>
                        <option value="oui_pe">Oui — Private Equity</option>
                        <option value="oui_dette">Oui — Dette Privée</option>
                        <option value="oui_immo">Oui — Immobilier</option>
                        <option value="oui_multi">Oui — Plusieurs classes</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-3">Objectifs & horizon</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Objectif principal</label>
                      <select value={clientData.objectifInvestissement} onChange={(e) => setField("objectifInvestissement", e.target.value)} className={selectCls}>
                        <option value="rendement">Recherche de rendement</option>
                        <option value="diversification">Diversification patrimoniale</option>
                        <option value="preservation">Préservation du capital</option>
                        <option value="croissance">Croissance du capital</option>
                        <option value="revenus">Revenus réguliers</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Horizon de placement</label>
                      <select value={clientData.horizonPlacement} onChange={(e) => setField("horizonPlacement", e.target.value)} className={selectCls}>
                        <option value="1-3 ans">Court terme (1-3 ans)</option>
                        <option value="3-5 ans">Moyen terme (3-5 ans)</option>
                        <option value="5-10 ans">Long terme (5-10 ans)</option>
                        <option value="10+ ans">Très long terme (10+ ans)</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Tolérance au risque</label>
                      <select value={clientData.toleranceRisque} onChange={(e) => setField("toleranceRisque", e.target.value)} className={selectCls}>
                        <option value="faible">Faible — Préservation avant tout</option>
                        <option value="modere">Modéré — Équilibre risque/rendement</option>
                        <option value="eleve">Élevé — Rendement prioritaire</option>
                        <option value="tres_eleve">Très élevé — Risque assumé</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button onClick={() => setKycStep(1)} className="text-sm text-[#9AA4B2] hover:text-[#0D0D12] transition-colors">← Retour</button>
                <button onClick={() => setKycStep(3)} className="bg-[#0D0D12] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1A1A2E] transition-colors">Continuer →</button>
              </div>
            </div>
          )}

          {/* ── Step 3: Classification investisseur ── */}
          {kycStep === 3 && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-semibold text-[#0D0D12] mb-1">Classification investisseur</h3>
              <p className="text-xs text-[#9AA4B2] mb-5">Catégorisation selon la Loi du 12 juillet 2013 (AIFMD) et la CSSF — Art. 2 RAIF</p>

              <div className="space-y-4">
                {[
                  {
                    value: "Professionnel",
                    title: "Investisseur professionnel",
                    desc: "Annexe II MiFID II — Établissements de crédit, entreprises d'investissement, fonds de pension, grandes entreprises remplissant au moins 2/3 critères (bilan > 20M EUR, CA > 40M EUR, fonds propres > 2M EUR).",
                  },
                  {
                    value: "Averti (well-informed)",
                    title: "Investisseur averti (well-informed)",
                    desc: "Art. 2 RAIF Luxembourg — Investit minimum 125 000 EUR, ou certifié par un établissement de crédit / PSF / société de gestion attestant de son expertise et expérience.",
                  },
                  {
                    value: "Institutionnel",
                    title: "Investisseur institutionnel",
                    desc: "Supranational — Compagnies d'assurance, fonds de retraite, banques centrales, fonds souverains, organismes de placement collectif.",
                  },
                ].map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setField("investorClassification", cat.value)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${clientData.investorClassification === cat.value ? "border-blue-500 bg-[#FAFBFC]" : "border-[#E8ECF1] hover:border-[#E8ECF1]"}`}
                  >
                    <p className="text-sm font-semibold text-[#0D0D12]">{cat.title}</p>
                    <p className="text-xs text-[#9AA4B2] mt-1 leading-relaxed">{cat.desc}</p>
                  </button>
                ))}
              </div>

              {clientData.investorClassification === "Averti (well-informed)" && (
                <div className="mt-4 bg-[#FFFBEB] border border-[#E8ECF1] rounded-xl p-3 text-xs text-[#D97706]">
                  L'investisseur averti doit investir au minimum 125 000 EUR ou fournir une attestation d'un établissement de crédit, PSF ou société de gestion certifiant son expertise (CSSF FAQ RAIF, Q2).
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <button onClick={() => setKycStep(2)} className="text-sm text-[#9AA4B2] hover:text-[#0D0D12] transition-colors">← Retour</button>
                <button onClick={() => setKycStep(4)} className="bg-[#0D0D12] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1A1A2E] transition-colors">Continuer →</button>
              </div>
            </div>
          )}

          {/* ── Step 4: Conformité — PEP, sanctions, FATCA/CRS ── */}
          {kycStep === 4 && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-semibold text-[#0D0D12] mb-1">Vérifications de conformité</h3>
              <p className="text-xs text-[#9AA4B2] mb-5">PEP, sanctions, origine des fonds, FATCA/CRS — AMLD5, Loi du 12 nov. 2004</p>

              <div className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-3">Origine des fonds</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className={labelCls}>Source principale des fonds investis <span className="text-[#DC2626]">*</span></label>
                      <select value={clientData.origineFonds} onChange={(e) => setField("origineFonds", e.target.value)} className={selectCls}>
                        <option value="">Sélectionnez...</option>
                        <option>Revenus d'activité professionnelle</option>
                        <option>Cession d'actifs (immobilier, entreprise)</option>
                        <option>Héritage / donation</option>
                        <option>Épargne accumulée</option>
                        <option>Gains de placement</option>
                        <option>Indemnités (assurance, licenciement)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-3">Personne politiquement exposée (PEP)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Statut PEP</label>
                      <select value={clientData.pepStatus} onChange={(e) => setField("pepStatus", e.target.value)} className={selectCls}>
                        <option value="non">Non — Aucun lien PEP</option>
                        <option value="oui">Oui — PEP actif</option>
                        <option value="proche">Proche d'un PEP</option>
                        <option value="ancien">Ancien PEP (cessation &lt; 12 mois)</option>
                      </select>
                    </div>
                    {clientData.pepStatus !== "non" && (
                      <div>
                        <label className={labelCls}>Précisions PEP <span className="text-[#DC2626]">*</span></label>
                        <input value={clientData.pepDetail} onChange={(e) => setField("pepDetail", e.target.value)} className={inputCls} placeholder="Fonction, pays, période" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-3">Screening sanctions</p>
                  <div className="bg-[#F7F8FA] rounded-xl p-4">
                    <Checkbox checked={clientData.sanctionsCheck} onChange={() => setField("sanctionsCheck", !clientData.sanctionsCheck)}>
                      J'atteste avoir vérifié que le client ne figure pas sur les listes de sanctions (UE, OFAC, ONU, gel des avoirs)
                    </Checkbox>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-3">Échange automatique d'informations (CRS/FATCA)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Statut fiscal US</label>
                      <select value={clientData.fatcaCrs} onChange={(e) => setField("fatcaCrs", e.target.value)} className={selectCls}>
                        <option value="non_us">Non US Person</option>
                        <option value="us_person">US Person (FATCA)</option>
                        <option value="us_entity">Entité US / NFFE passive</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Pays de résidence fiscale <span className="text-[#DC2626]">*</span></label>
                      <select value={clientData.paysResidenceFiscale} onChange={(e) => setField("paysResidenceFiscale", e.target.value)} className={selectCls}>
                        {["France", "Luxembourg", "Belgique", "Suisse", "Pays-Bas", "Allemagne", "Italie", "Espagne", "Royaume-Uni", "Autre"].map((p) => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>TIN / numéro fiscal</label>
                      <input value={clientData.tinFiscal} onChange={(e) => setField("tinFiscal", e.target.value)} className={inputCls} placeholder="Numéro d'identification fiscale" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button onClick={() => setKycStep(3)} className="text-sm text-[#9AA4B2] hover:text-[#0D0D12] transition-colors">← Retour</button>
                <button
                  onClick={() => setKycStep(5)}
                  disabled={!clientData.origineFonds || !clientData.sanctionsCheck}
                  className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-colors ${clientData.origineFonds && clientData.sanctionsCheck ? "bg-[#0D0D12] text-white hover:bg-[#1A1A2E]" : "bg-[#F7F8FA] text-[#9AA4B2] cursor-not-allowed"}`}
                >
                  Continuer →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 5: Validation & recap ── */}
          {kycStep === 5 && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-semibold text-[#0D0D12] mb-1">Récapitulatif & validation</h3>
              <p className="text-xs text-[#9AA4B2] mb-5">Vérifiez les informations avant de finaliser l'onboarding</p>

              <div className="space-y-4">
                {/* Identity summary */}
                <div className="bg-[#F7F8FA] rounded-xl p-4 text-sm space-y-1.5">
                  <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-2">Identité</p>
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">Nom</span><span className="text-[#0D0D12] font-medium">{clientData.prenom} {clientData.nom}</span></div>
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">Type</span><span className="text-[#0D0D12]">{personType === "morale" ? "Personne morale" : "Personne physique"}</span></div>
                  {clientData.societe && <div className="flex justify-between"><span className="text-[#9AA4B2]">Société</span><span className="text-[#0D0D12]">{clientData.societe}</span></div>}
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">Pays</span><span className="text-[#0D0D12]">{clientData.pays}</span></div>
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">Email</span><span className="text-[#0D0D12]">{clientData.email}</span></div>
                </div>

                {/* KYC summary */}
                <div className="bg-[#F7F8FA] rounded-xl p-4 text-sm space-y-1.5">
                  <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-2">Connaissance client</p>
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">Patrimoine</span><span className="text-[#0D0D12]">{clientData.patrimoineTotalTranche}</span></div>
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">Expérience</span><span className="text-[#0D0D12] capitalize">{clientData.experienceInvestissement}</span></div>
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">Objectif</span><span className="text-[#0D0D12] capitalize">{clientData.objectifInvestissement}</span></div>
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">Tolérance au risque</span><span className="text-[#0D0D12] capitalize">{clientData.toleranceRisque}</span></div>
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">Horizon</span><span className="text-[#0D0D12]">{clientData.horizonPlacement}</span></div>
                </div>

                {/* Classification & compliance summary */}
                <div className="bg-[#F7F8FA] rounded-xl p-4 text-sm space-y-1.5">
                  <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-2">Classification & conformité</p>
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">Classification</span><span className="text-[#0D0D12] font-medium">{clientData.investorClassification}</span></div>
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">Origine fonds</span><span className="text-[#0D0D12]">{clientData.origineFonds}</span></div>
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">PEP</span><span className="text-[#0D0D12]">{clientData.pepStatus === "non" ? "Non" : `Oui — ${clientData.pepDetail}`}</span></div>
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">Sanctions</span><Badge status="Validé" /></div>
                  <div className="flex justify-between"><span className="text-[#9AA4B2]">FATCA/CRS</span><span className="text-[#0D0D12]">{clientData.fatcaCrs === "non_us" ? "Non US Person" : "US Person"}</span></div>
                </div>

                {/* Documents summary */}
                <div className="bg-[#F7F8FA] rounded-xl p-4 text-sm">
                  <p className="text-xs uppercase tracking-wider text-[#9AA4B2] font-semibold mb-2">Documents ({documents.length})</p>
                  {documents.length === 0 ? (
                    <p className="text-xs text-[#D97706]">Aucun document déposé — les pièces justificatives devront être complétées</p>
                  ) : (
                    <div className="space-y-1">
                      {documents.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <svg className="w-3 h-3 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          <span className="text-[#0D0D12]">{d.type}</span>
                          <span className="text-[#9AA4B2]">({d.name})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button onClick={() => setKycStep(4)} className="text-sm text-[#9AA4B2] hover:text-[#0D0D12] transition-colors">← Retour</button>
                <button
                  onClick={handleCreateClient}
                  disabled={creating}
                  className="bg-[#0D0D12] text-white px-8 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1A1A2E] transition-colors disabled:opacity-50"
                >
                  {creating ? "Création en cours…" : "Valider l'onboarding"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Client list view ───
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0D0D12]">Mes clients</h2>
          <p className="text-sm text-[#9AA4B2] mt-1">Gérez les comptes investisseurs rattachés à votre espace</p>
        </div>
        <button onClick={() => setShowOnboarding(true)} className="px-4 py-2 bg-[#0D0D12] text-white text-xs rounded-xl hover:bg-[#1A1A2E] transition-colors">
          + Onboarder un client
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 stagger-fast">
        <KPICard label="Clients enregistrés" value={clients.length} delay={0} />
        <KPICard label="Souscriptions clients" value={orders.filter((o) => o.intermediaryId === user?.id || o.intermediaire).length} delay={60} />
        <KPICard label="Volume total" value={fmt(orders.filter((o) => (o.intermediaryId === user?.id || o.intermediaire) && o.status === "validated").reduce((s, o) => s + o.montant, 0))} delay={120} />
      </div>

      <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#9AA4B2] text-sm">Chargement…</div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-[#F7F8FA] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#5F6B7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <p className="text-sm text-[#9AA4B2]">Aucun client enregistré</p>
            <p className="text-xs text-[#5F6B7A] mt-1">Onboardez votre premier client avec le parcours KYC/KYB complet</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#E8ECF1] bg-[#F7F8FA]">
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Nom</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Email</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Société</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">KYC</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">Volume investi</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Souscriptions</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Créé le</th>
              </tr>
            </thead>
            <tbody className="stagger-rows">
              {clients.map((c) => {
                const stats = getClientStats(c.id);
                return (
                  <tr key={c.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC] transition-colors">
                    <td className="px-5 py-3 font-medium text-[#0D0D12]">{c.full_name}</td>
                    <td className="px-5 py-3 text-[#9AA4B2]">{c.email}</td>
                    <td className="px-5 py-3 text-[#9AA4B2]">{c.company || "—"}</td>
                    <td className="px-5 py-3"><Badge status={c.kyc_status === "validated" ? "Validé" : "En attente"} /></td>
                    <td className="px-5 py-3 text-right font-medium">{stats.totalInvested > 0 ? fmt(stats.totalInvested) : "—"}</td>
                    <td className="px-5 py-3">
                      {stats.orderCount > 0 ? (
                        <span className="text-xs">{stats.validatedCount}/{stats.orderCount} validée{stats.validatedCount > 1 ? "s" : ""}</span>
                      ) : (
                        <span className="text-xs text-[#9AA4B2]">Aucune</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#9AA4B2] text-xs">{c.created_at?.split("T")[0]}</td>
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

/* ─────────────────────────────────────────────────────
   4. CUSTODY
   ───────────────────────────────────────────────────── */
function Custody({ toast, clients }) {
  const { orders } = useAppContext();
  const { user } = useAuth();
  const validatedOrders = orders.filter((o) => o.status === "validated" && (o.intermediaryId === user?.id || o.intermediaire));
  const totalTokens = validatedOrders.reduce((s, o) => s + Math.floor(o.montant / NAV_PER_PART), 0);
  const totalNav = validatedOrders.reduce((s, o) => s + o.montant, 0);

  // Transfer modal state
  const [transferModal, setTransferModal] = useState(null); // order being transferred
  const [transferAddress, setTransferAddress] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState(null);

  const openTransfer = (order) => {
    // Pre-fill with investor's wallet if available
    const client = clients?.find((c) => c.full_name === order.lpName || c.id === order.userId);
    setTransferAddress(client?.wallet_address || "");
    setTransferResult(null);
    setTransferModal(order);
  };

  const handleTransfer = async () => {
    if (!transferAddress || !transferModal) return;
    setTransferring(true);
    try {
      const tokenCount = Math.floor(transferModal.montant / NAV_PER_PART);
      const result = await transferToken({
        toAddress: transferAddress,
        fundSlug: "bridgefund",
        tokenCount,
      });
      setTransferResult(result);
      toast(`${tokenCount} token(s) transféré(s) — tx: ${result.txHash.slice(0, 12)}...`);
    } catch (err) {
      toast("Erreur transfert : " + err.message);
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#0D0D12]">Custody</h2>
        <p className="text-sm text-[#9AA4B2] mt-1">Tokens sous garde pour le compte de vos clients — transférez-les à la demande</p>
      </div>

      <div className="grid grid-cols-4 gap-4 stagger-fast">
        <KPICard label="Tokens sous custody" value={totalTokens.toLocaleString("fr-FR")} sub="Bridge Fund tokens" delay={0} />
        <KPICard label="Valeur totale AUM" value={fmt(totalNav)} sub="Actifs sous gestion" delay={60} />
        <KPICard label="Clients en custody" value={validatedOrders.length} sub="Comptes actifs" delay={120} />
        <KPICard label="NAV / part" value={fmtFull(NAV_PER_PART)} sub="Dernière valorisation" delay={180} />
      </div>

      <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8ECF1]">
          <h3 className="text-sm font-semibold text-[#0D0D12]">Positions clients</h3>
        </div>
        {validatedOrders.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-[#F7F8FA] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#5F6B7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <p className="text-sm text-[#9AA4B2]">Aucun client en custody</p>
            <p className="text-xs text-[#5F6B7A] mt-1">Les souscriptions validées apparaîtront ici</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#E8ECF1] bg-[#F7F8FA]">
                <th className="px-5 py-3.5 text-[12px] text-[#9AA4B2] font-medium">Client</th>
                <th className="px-5 py-3.5 text-[12px] text-[#9AA4B2] font-medium text-right">Tokens</th>
                <th className="px-5 py-3.5 text-[12px] text-[#9AA4B2] font-medium text-right">Valeur NAV</th>
                <th className="px-5 py-3.5 text-[12px] text-[#9AA4B2] font-medium">Classe</th>
                <th className="px-5 py-3.5 text-[12px] text-[#9AA4B2] font-medium">Date</th>
                <th className="px-5 py-3.5 text-[12px] text-[#9AA4B2] font-medium">Statut</th>
                <th className="px-5 py-3.5 text-[12px] text-[#9AA4B2] font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {validatedOrders.map((o, idx) => (
                <tr key={o.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC] transition-colors" style={{ animation: `revealUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 50}ms both` }}>
                  <td className="px-5 py-3.5 font-medium text-[#0D0D12]">{o.lpName}</td>
                  <td className="px-5 py-3.5 text-right font-mono">{Math.floor(o.montant / NAV_PER_PART).toLocaleString("fr-FR")}</td>
                  <td className="px-5 py-3.5 text-right">{fmt(o.montant)}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#EEF2FF] text-[#4F7DF3]">Classe {o.shareClass || 1}</span>
                  </td>
                  <td className="px-5 py-3.5 text-[#9AA4B2]">{o.date}</td>
                  <td className="px-5 py-3.5"><Badge status="Actif" /></td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => openTransfer(o)}
                      className="px-3 py-1.5 text-xs font-medium bg-[#EEF2FF] text-[#4F7DF3] rounded-lg hover:bg-[#EEF2FF] transition-colors"
                    >
                      Transférer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Transfer Modal */}
      {transferModal && (
        <div className="fixed inset-0 bg-[#0D0D12]/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => !transferring && setTransferModal(null)}>
          <div className="bg-white rounded-2xl border border-[#E8ECF1] w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#0D0D12] mb-1">Transférer des tokens</h3>
            <p className="text-sm text-[#9AA4B2] mb-5">
              Envoyez les tokens de {transferModal.lpName} vers un wallet externe
            </p>

            <div className="space-y-4">
              <div className="bg-[#F7F8FA] rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-[#9AA4B2] block">Client</span>
                  <span className="font-medium text-[#0D0D12]">{transferModal.lpName}</span>
                </div>
                <div>
                  <span className="text-xs text-[#9AA4B2] block">Tokens</span>
                  <span className="font-mono font-medium text-[#0D0D12]">{Math.floor(transferModal.montant / NAV_PER_PART)}</span>
                </div>
                <div>
                  <span className="text-xs text-[#9AA4B2] block">Valeur</span>
                  <span className="text-[#0D0D12]">{fmt(transferModal.montant)}</span>
                </div>
                <div>
                  <span className="text-xs text-[#9AA4B2] block">Classe</span>
                  <span className="text-[#0D0D12]">Classe {transferModal.shareClass || 1}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9AA4B2] mb-1.5">
                  Adresse Cardano de destination
                </label>
                <input
                  value={transferAddress}
                  onChange={(e) => setTransferAddress(e.target.value)}
                  placeholder="addr_test1q..."
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8ECF1] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4F7DF3]/20 transition-all"
                  disabled={transferring}
                />
              </div>

              {transferResult && (
                <div className="bg-[#ECFDF5] border border-[#E8ECF1] rounded-xl p-4">
                  <p className="text-sm font-medium text-[#059669] mb-1">Transfert confirmé on-chain</p>
                  <p className="text-xs text-[#059669] font-mono break-all">Tx: {transferResult.txHash}</p>
                  <a
                    href={transferResult.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#059669] underline mt-1 inline-block"
                  >
                    Voir sur Cardanoscan
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setTransferModal(null)}
                disabled={transferring}
                className="px-4 py-2 bg-white border border-[#E8ECF1] text-[#0D0D12] text-xs rounded-xl hover:border-[#D1D5DB] transition-colors disabled:opacity-50"
              >
                {transferResult ? "Fermer" : "Annuler"}
              </button>
              {!transferResult && (
                <button
                  onClick={handleTransfer}
                  disabled={transferring || !transferAddress.startsWith("addr")}
                  className="px-4 py-2 bg-[#0D0D12] text-white text-xs rounded-xl hover:bg-[#1A1A2E] transition-colors disabled:opacity-50"
                >
                  {transferring ? "Transfert en cours..." : "Confirmer le transfert"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   5. COLLATERAL & DEFI
   ───────────────────────────────────────────────────── */
/* ─── Wallet Setup Component ─── */
function WalletSetup({ toast }) {
  const { user, profile, refreshProfile } = useAuth();
  const [mode, setMode] = useState(null); // null | "generate" | "manual"
  const [manualAddress, setManualAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    setSaving(true);
    try {
      const { address } = await generateWallet(user?.id);
      await updateUserProfile(user?.id, { wallet_address: address });
      if (refreshProfile) await refreshProfile();
      toast("Wallet Cardano Preprod généré et sauvegardé");
    } catch (err) {
      toast("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveManual = async () => {
    if (!manualAddress || !manualAddress.startsWith("addr")) {
      toast("Adresse invalide — doit commencer par addr_test1 ou addr1");
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile(user?.id, { wallet_address: manualAddress.trim() });
      if (refreshProfile) await refreshProfile();
      toast("Wallet sauvegardé");
    } catch (err) {
      toast("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-[#FFFBEB] border border-[#E8ECF1] rounded-xl">
      <p className="text-sm font-semibold text-[#D97706] mb-2">Wallet custody non configuré</p>
      <p className="text-xs text-[#D97706] mb-4">Pour gérer la collateralisation, vous devez configurer un wallet Cardano.</p>

      {!mode && (
        <div className="flex gap-3">
          <button
            onClick={() => handleGenerate()}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#0D0D12] text-white rounded-xl text-sm font-medium hover:bg-[#1A1A2E] transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            {saving ? "Génération..." : "Générer un wallet automatiquement"}
          </button>
          <button
            onClick={() => setMode("manual")}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-[#E8ECF1] text-[#0D0D12] rounded-xl text-sm font-medium hover:border-[#D1D5DB] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            Connecter un wallet existant
          </button>
        </div>
      )}

      {mode === "manual" && (
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className={labelCls}>Adresse wallet Cardano</label>
            <input
              type="text"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="addr_test1q..."
              className={inputCls}
            />
            <p className="text-[10px] text-[#9AA4B2] mt-1">Preprod: addr_test1... | Mainnet: addr1...</p>
          </div>
          <button
            onClick={handleSaveManual}
            disabled={saving || !manualAddress}
            className="px-5 py-2.5 bg-[#0D0D12] text-white rounded-xl text-sm font-medium hover:bg-[#1A1A2E] transition-colors disabled:opacity-50"
          >
            {saving ? "..." : "Sauvegarder"}
          </button>
          <button
            onClick={() => setMode(null)}
            className="px-3 py-2.5 text-[#9AA4B2] hover:text-[#5F6B7A] text-sm"
          >
            Retour
          </button>
        </div>
      )}
    </div>
  );
}

function CollateralClients({ toast, clients }) {
  const { orders } = useAppContext();
  const { user, profile } = useAuth();
  const [vaultPositions, setVaultPositions] = useState([]);
  const [funds, setFunds] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedFund, setSelectedFund] = useState(null);
  const [mintAmount, setMintAmount] = useState(10);
  const [minting, setMinting] = useState(false);
  const [burning, setBurning] = useState(null);
  const [txResult, setTxResult] = useState(null);

  // All validated orders for this intermediary's clients
  const allValidatedOrders = orders.filter((o) => o.status === "validated" && (o.intermediaryId === user?.id || o.intermediaire));

  // Build client list with their token stats
  const clientsWithStats = (clients || []).map((c) => {
    const clientOrders = allValidatedOrders.filter((o) => o.userId === c.id);
    const totalParts = clientOrders.reduce((s, o) => s + Math.floor(o.montant / NAV_PER_PART), 0);
    const clientVaults = vaultPositions.filter((p) => p.user_id === c.id && p.status === "locked");
    const locked = clientVaults.reduce((s, p) => s + (p.security_token_count || 0), 0);
    const sBF = clientVaults.reduce((s, p) => s + (p.synthetic_token_count || 0), 0);
    return { ...c, totalParts, locked, sBF, available: totalParts - locked, orders: clientOrders };
  }).filter((c) => c.totalParts > 0 || c.sBF > 0);

  // Selected client's data
  const clientOrders = selectedClient ? allValidatedOrders.filter((o) => o.userId === selectedClient.id) : [];
  const clientTotalParts = clientOrders.reduce((s, o) => s + Math.floor(o.montant / NAV_PER_PART), 0);
  const clientVaults = selectedClient ? vaultPositions.filter((p) => p.user_id === selectedClient.id && p.status === "locked") : [];
  const clientLocked = clientVaults.reduce((s, p) => s + (p.security_token_count || 0), 0);
  const clientAvailable = clientTotalParts - clientLocked;
  const clientSBF = clientVaults.reduce((s, p) => s + (p.synthetic_token_count || 0), 0);

  // Global totals
  const totalAllParts = clientsWithStats.reduce((s, c) => s + c.totalParts, 0);
  const totalAllLocked = clientsWithStats.reduce((s, c) => s + c.locked, 0);
  const totalAllSBF = clientsWithStats.reduce((s, c) => s + c.sBF, 0);

  // Load funds and all vault positions for managed clients
  useEffect(() => {
    if (!supabase || !user) return;
    (async () => {
      setLoadingPositions(true);
      const clientIds = (clients || []).map((c) => c.id);
      const [fundsRes, vaultRes] = await Promise.all([
        supabase.from("funds").select("id, fund_name, slug, cardano_policy_id").eq("status", "active").order("fund_name"),
        clientIds.length > 0
          ? supabase.from("vault_positions").select("*").in("user_id", clientIds).order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);
      if (fundsRes.data) {
        setFunds(fundsRes.data);
        if (fundsRes.data.length > 0 && !selectedFund) setSelectedFund(fundsRes.data[0]);
      }
      if (vaultRes.data) setVaultPositions(vaultRes.data);
      setLoadingPositions(false);
    })();
  }, [user, clients]);

  const refreshPositions = async () => {
    const clientIds = (clients || []).map((c) => c.id);
    if (clientIds.length === 0) return;
    const { data } = await supabase.from("vault_positions").select("*").in("user_id", clientIds).order("created_at", { ascending: false });
    if (data) setVaultPositions(data);
  };

  const handleMintSynthetic = async () => {
    if (!selectedClient) { toast("Sélectionnez un client"); return; }
    if (!selectedFund) { toast("Sélectionnez un fonds"); return; }
    if (mintAmount <= 0 || mintAmount > clientAvailable) { toast("Montant invalide"); return; }
    if (!profile?.wallet_address) { toast("Wallet intermédiaire non configuré"); return; }
    setMinting(true);
    setTxResult(null);
    try {
      const result = await mintSynthetic({
        userAddress: profile.wallet_address,
        fundSlug: selectedFund.slug,
        fundId: selectedFund.id,
        tokenCount: mintAmount,
        userId: selectedClient.id,
      });
      if (result.error) throw new Error(result.error);
      setTxResult({ type: "mint", ...result });
      toast(`${mintAmount} sBF mintés pour ${selectedClient.full_name}`);
      await refreshPositions();
    } catch (err) {
      toast("Erreur mint : " + err.message);
    } finally {
      setMinting(false);
    }
  };

  const handleBurnSynthetic = async (position) => {
    if (!profile?.wallet_address) { toast("Wallet manquant"); return; }
    setBurning(position.id);
    setTxResult(null);
    try {
      const fund = funds.find((f) => f.id === position.fund_id);
      const result = await burnSynthetic({
        userAddress: profile.wallet_address,
        fundSlug: fund?.slug || "bridgefund",
        fundId: position.fund_id,
        tokenCount: position.synthetic_token_count,
        vaultPositionId: position.id,
        userId: position.user_id,
      });
      if (result.error) throw new Error(result.error);
      setTxResult({ type: "burn", ...result });
      toast(`${position.synthetic_token_count} sBF brûlés — BF déverrouillés`);
      await refreshPositions();
    } catch (err) {
      toast("Erreur burn : " + err.message);
    } finally {
      setBurning(null);
    }
  };

  const allLockedPositions = selectedClient
    ? vaultPositions.filter((p) => p.user_id === selectedClient.id && p.status === "locked")
    : vaultPositions.filter((p) => p.status === "locked");

  if (loadingPositions) return <div className="text-center py-12 text-[#9AA4B2] text-sm">Chargement...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#0D0D12]">Collatéral & DeFi — Gestion pour compte client</h2>
        <p className="text-sm text-[#9AA4B2] mt-1">Gérez la collateralisation des parts de vos clients en synthetic tokens</p>
      </div>

      {/* Explainer */}
      <div className="bg-[#F7F8FA] border border-[#E8ECF1] rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-[#4F7DF3] font-bold text-xs">sBF</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0D0D12]">Custody & Synthetic Tokens</p>
            <p className="text-xs text-[#9AA4B2] mt-1">
              En tant qu'intermédiaire, vous gérez la collateralisation pour le compte de vos clients.
              Sélectionnez un client, verrouillez ses <strong>security tokens (BF)</strong> dans le vault
              et recevez des <strong>synthetic tokens (sBF)</strong> librement transférables sur votre wallet custody.
            </p>
          </div>
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-4 gap-4 stagger-fast">
        <KPICard label="Clients actifs" value={clientsWithStats.length} sub="Avec des parts" delay={0} />
        <KPICard label="Total parts (BF)" value={totalAllParts.toLocaleString("fr-FR")} sub="Tous clients" delay={60} />
        <KPICard label="Verrouillés (vault)" value={totalAllLocked.toLocaleString("fr-FR")} sub="BF lockés" delay={120} />
        <KPICard label="Synthetic (sBF)" value={totalAllSBF.toLocaleString("fr-FR")} sub="Librement transférables" delay={180} />
      </div>

      {/* Client selector cards */}
      <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8ECF1]">
          <h3 className="text-sm font-semibold text-[#0D0D12]">Sélectionnez un client</h3>
        </div>
        {clientsWithStats.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-[#9AA4B2]">Aucun client avec des parts validées</p>
          </div>
        ) : (
          <div className="grid gap-3 p-5 stagger-children">
            {clientsWithStats.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedClient(c); setMintAmount(Math.min(10, c.available)); setTxResult(null); }}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                  selectedClient?.id === c.id
                    ? "border-[#4F7DF3] bg-[#FAFBFC] ring-1 ring-[#4F7DF3]/20"
                    : "border-[#E8ECF1] hover:border-[#E8ECF1] hover:bg-[#FAFBFC]"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    selectedClient?.id === c.id ? "bg-[#0D0D12] text-white" : "bg-[#F7F8FA] text-[#9AA4B2]"
                  }`}>
                    {(c.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0D0D12]">{c.full_name || "Client"}</p>
                    <p className="text-xs text-[#9AA4B2]">{c.email || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider">Parts</p>
                    <p className="text-sm font-semibold text-[#0D0D12]">{c.totalParts.toLocaleString("fr-FR")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider">Lockés</p>
                    <p className="text-sm font-semibold text-[#0D0D12]">{c.locked.toLocaleString("fr-FR")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider">sBF</p>
                    <p className="text-sm font-bold text-[#059669]">{c.sBF.toLocaleString("fr-FR")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider">Disponible</p>
                    <p className="text-sm font-semibold text-[#9AA4B2]">{c.available.toLocaleString("fr-FR")}</p>
                  </div>
                  {selectedClient?.id === c.id && (
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mint form — only when client selected */}
      {selectedClient && (
        <div className="bg-white rounded-2xl border border-[#E8ECF1] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#0D0D12]">Mint Synthetic pour {selectedClient.full_name}</h3>
              <p className="text-xs text-[#9AA4B2]">Lock BF → Recevez sBF 1:1 sur votre wallet custody</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#9AA4B2]">Parts disponibles</p>
              <p className="text-lg font-bold text-[#0D0D12]">{clientAvailable.toLocaleString("fr-FR")} BF</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 items-end">
            <div>
              <label className={labelCls}>Fonds</label>
              <select
                value={selectedFund?.id || ""}
                onChange={(e) => setSelectedFund(funds.find((f) => f.id === e.target.value))}
                className={selectCls}
              >
                {funds.map((f) => <option key={f.id} value={f.id}>{f.fund_name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>BF à verrouiller</label>
              <input
                type="number"
                value={mintAmount}
                onChange={(e) => setMintAmount(Math.min(Number(e.target.value), clientAvailable))}
                min={1}
                max={clientAvailable}
                className={inputCls}
                disabled={minting}
              />
              <p className="text-xs text-[#9AA4B2] mt-1">{clientAvailable} disponibles</p>
            </div>
            <div>
              <label className={labelCls}>sBF reçus</label>
              <div className="px-3 py-2.5 rounded-xl border border-[#E8ECF1] bg-[#FAFBFC] text-sm font-mono text-[#059669] font-semibold">
                {mintAmount} sBF
              </div>
            </div>
            <button
              onClick={handleMintSynthetic}
              disabled={minting || mintAmount <= 0 || mintAmount > clientAvailable || !profile?.wallet_address}
              className="py-2.5 rounded-xl text-sm font-medium transition-colors bg-[#0D0D12] text-white hover:bg-[#1A1A2E] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {minting ? "Transaction..." : `Lock ${mintAmount} BF → ${mintAmount} sBF`}
            </button>
          </div>

          {!profile?.wallet_address && (
            <WalletSetup toast={toast} />
          )}
        </div>
      )}

      {/* Transaction result */}
      {txResult && (
        <div className={`rounded-xl p-4 border ${txResult.type === "mint" ? "bg-[#ECFDF5] border-[#E8ECF1]" : "bg-[#EEF2FF] border-[#E8ECF1]"}`}>
          <p className="text-sm font-medium mb-1">{txResult.type === "mint" ? "Synthetic tokens mintés" : "Security tokens déverrouillés"}</p>
          <p className="text-xs font-mono break-all">Tx: {txResult.txHash}</p>
          <a href={txResult.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#4F7DF3] underline mt-1 inline-block">
            Voir sur Cardanoscan
          </a>
        </div>
      )}

      {/* Positions table */}
      <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8ECF1] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0D0D12]">
            Positions vault {selectedClient ? `— ${selectedClient.full_name}` : "— Tous les clients"}
          </h3>
          {selectedClient && (
            <button onClick={() => setSelectedClient(null)} className="text-xs text-[#9AA4B2] hover:text-[#0D0D12] transition-colors">
              Voir tous les clients
            </button>
          )}
        </div>
        {allLockedPositions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-[#9AA4B2]">Aucune position active</p>
            <p className="text-xs text-[#5F6B7A] mt-1">Sélectionnez un client et mintez des sBF</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#E8ECF1] bg-[#F7F8FA]">
                {!selectedClient && <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Client</th>}
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Vault</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">BF lockés</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">sBF mintés</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Tx</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium">Date</th>
                <th className="px-5 py-3 text-[12px] text-[#9AA4B2] font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {allLockedPositions.map((p) => {
                const client = (clients || []).find((c) => c.id === p.user_id);
                return (
                  <tr key={p.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFBFC] transition-colors">
                    {!selectedClient && (
                      <td className="px-5 py-3">
                        <button onClick={() => setSelectedClient(clientsWithStats.find((c) => c.id === p.user_id))} className="text-xs font-medium text-[#0D0D12] hover:underline">
                          {client?.full_name || "—"}
                        </button>
                      </td>
                    )}
                    <td className="px-5 py-3 font-mono text-xs text-[#9AA4B2]">{p.vault_address?.slice(0, 16)}...</td>
                    <td className="px-5 py-3 text-right font-mono font-medium text-[#0D0D12]">{p.security_token_count}</td>
                    <td className="px-5 py-3 text-right font-mono text-[#059669]">{p.synthetic_token_count}</td>
                    <td className="px-5 py-3">
                      <a href={`https://preprod.cardanoscan.io/transaction/${p.lock_tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#4F7DF3] underline font-mono">
                        {p.lock_tx_hash?.slice(0, 10)}...
                      </a>
                    </td>
                    <td className="px-5 py-3 text-[#9AA4B2] text-xs">{p.created_at?.split("T")[0]}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleBurnSynthetic(p)}
                        disabled={burning === p.id}
                        className="px-3 py-1.5 text-xs font-medium bg-[#FEF2F2] text-[#DC2626] rounded-lg hover:bg-[#FEF2F2] transition-colors disabled:opacity-50"
                      >
                        {burning === p.id ? "Burn..." : "Burn sBF"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* DeFi Pools */}
      {totalAllSBF > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8ECF1] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#0D0D12]">DeFi Pools</h3>
              <p className="text-xs text-[#9AA4B2] mt-0.5">Déployez les sBF de vos clients sur les protocoles DeFi Cardano</p>
            </div>
            <span className="text-xs font-medium text-[#059669] bg-[#ECFDF5] px-3 py-1 rounded-full">{totalAllSBF.toLocaleString("fr-FR")} sBF</span>
          </div>
          <div className="grid grid-cols-3 gap-4 p-5 stagger-children">
            <a href="https://app.minswap.org/swap" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 p-4 border border-[#E8ECF1] rounded-xl hover:border-[#E8ECF1] hover:bg-[#EEF2FF] transition-all">
              <div className="w-9 h-9 bg-[#EEF2FF] rounded-lg flex items-center justify-center flex-shrink-0"><span className="text-[#4F7DF3] font-bold text-sm">M</span></div>
              <div>
                <p className="text-sm font-semibold text-[#0D0D12]">Minswap</p>
                <p className="text-[10px] text-[#9AA4B2]">DEX — Swap & Liquidity</p>
              </div>
            </a>
            <a href="https://app.sundae.fi/swap" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 p-4 border border-[#E8ECF1] rounded-xl hover:border-purple-500/20 hover:bg-purple-500/5 transition-all">
              <div className="w-9 h-9 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0"><span className="text-purple-400 font-bold text-sm">S</span></div>
              <div>
                <p className="text-sm font-semibold text-[#0D0D12]">SundaeSwap</p>
                <p className="text-[10px] text-[#9AA4B2]">DEX — Yield Farming</p>
              </div>
            </a>
            <a href="https://app.liqwid.finance" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 p-4 border border-[#E8ECF1] rounded-xl hover:border-cyan-500/20 hover:bg-cyan-500/5 transition-all">
              <div className="w-9 h-9 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0"><span className="text-cyan-400 font-bold text-sm">L</span></div>
              <div>
                <p className="text-sm font-semibold text-[#0D0D12]">Liqwid Finance</p>
                <p className="text-[10px] text-[#9AA4B2]">Lending — Collateral</p>
              </div>
            </a>
            <a href="https://app.lenfi.io" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 p-4 border border-[#E8ECF1] rounded-xl hover:border-[#E8ECF1] hover:bg-[#ECFDF5]/30 transition-all">
              <div className="w-9 h-9 bg-[#ECFDF5] rounded-lg flex items-center justify-center flex-shrink-0"><span className="text-[#059669] font-bold text-sm">LF</span></div>
              <div>
                <p className="text-sm font-semibold text-[#0D0D12]">Lenfi</p>
                <p className="text-[10px] text-[#9AA4B2]">Lending — Peer-to-Pool</p>
              </div>
            </a>
            <a href="https://app.splash.trade" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 p-4 border border-[#E8ECF1] rounded-xl hover:border-orange-500/20 hover:bg-orange-500/5 transition-all">
              <div className="w-9 h-9 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0"><span className="text-orange-400 font-bold text-sm">SP</span></div>
              <div>
                <p className="text-sm font-semibold text-[#0D0D12]">Splash</p>
                <p className="text-[10px] text-[#9AA4B2]">DEX — Concentrated Liquidity</p>
              </div>
            </a>
            <a href="https://www.jpg.store" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 p-4 border border-[#E8ECF1] rounded-xl hover:border-pink-500/20 hover:bg-pink-500/5 transition-all">
              <div className="w-9 h-9 bg-pink-500/20 rounded-lg flex items-center justify-center flex-shrink-0"><span className="text-pink-400 font-bold text-sm">JPG</span></div>
              <div>
                <p className="text-sm font-semibold text-[#0D0D12]">JPG Store</p>
                <p className="text-[10px] text-[#9AA4B2]">Marketplace OTC</p>
              </div>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   PORTAIL PRINCIPAL
   ───────────────────────────────────────────────────── */
const TABS = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "fonds", label: "Fonds" },
  { id: "clients", label: "Mes clients" },
  { id: "custody", label: "Custody" },
  { id: "collateral", label: "Collatéral & DeFi" },
];

export default function PortailSwissLife({ toast }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [fundView, setFundView] = useState("catalog"); // "catalog" | "detail:slug" | "souscription"
  const [selectedFund, setSelectedFund] = useState(null);
  const [clients, setClients] = useState([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const { user } = useAuth();

  // Load clients for subscription dropdown
  useEffect(() => {
    if (supabase && user) {
      setClientsLoaded(false);
      listMyClients()
        .then((data) => { setClients(data); setClientsLoaded(true); })
        .catch((err) => { console.error("Failed to load clients:", err); setClientsLoaded(true); });
    }
  }, [user]);

  const handleSelectFund = (slug) => setFundView("detail:" + slug);
  const handleInvest = (fund) => { setSelectedFund(fund); setFundView("souscription"); };
  const handleBackToFunds = () => { setFundView("catalog"); setSelectedFund(null); };

  const fundSlug = fundView.startsWith("detail:") ? fundView.slice(7) : null;

  return (
    <div>
      {/* Top-level navigation tabs */}
      <div className="flex border-b border-[#E8ECF1] mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); if (tab.id === "fonds") setFundView("catalog"); }}
            className={`px-5 py-3 text-sm font-medium transition-all relative ${activeTab === tab.id ? "text-[#0D0D12]" : "text-[#9AA4B2] hover:text-[#5F6B7A]"}`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D0D12] rounded-full" />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "dashboard" && <DashboardIntermediaire toast={toast} />}

      {activeTab === "fonds" && (
        <>
          {fundView === "catalog" && <FundCatalog onSelectFund={handleSelectFund} />}
          {fundSlug && <FundDetail fundSlug={fundSlug} onBack={handleBackToFunds} onInvest={handleInvest} />}
          {fundView === "souscription" && (
            <div>
              <button onClick={handleBackToFunds} className="mb-4 text-sm text-[#9AA4B2] hover:text-[#0D0D12] transition-colors">← Retour au catalogue</button>
              <SouscriptionIntermediee toast={toast} fund={selectedFund} clients={clients} />
            </div>
          )}
        </>
      )}

      {activeTab === "clients" && <MesClients toast={toast} clients={clients} clientsLoaded={clientsLoaded} onClientsChange={setClients} />}
      {activeTab === "custody" && <Custody toast={toast} clients={clients} />}
      {activeTab === "collateral" && <CollateralClients toast={toast} clients={clients} />}
    </div>
  );
}
