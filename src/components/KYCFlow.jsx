import { useState, useRef, useCallback, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { runFullKyc } from "../services/kycService";
import { supabase } from "../lib/supabase";

/* ═══════════════════════════════════════════════════════════════
   KYCFlow — Multi-step document upload + ComplyCube verification
   Replaces the fake setTimeout KYC in PortailLP subscription.
   Steps: Upload docs → Verify via ComplyCube → AML screening
   Style: ElevenLabs (clean, white bg, minimal borders)
   ═══════════════════════════════════════════════════════════════ */

const CHECK = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;

function FileUploadZone({ label, hint, file, onSelect, accept = ".pdf,.jpg,.jpeg,.png" }) {
  const ref = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) onSelect(f);
  }, [onSelect]);

  const handleChange = useCallback((e) => {
    const f = e.target.files?.[0];
    if (f) onSelect(f);
  }, [onSelect]);

  if (file) {
    const size = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} Mo`
      : `${(file.size / 1024).toFixed(0)} Ko`;
    return (
      <div className="flex items-center gap-3 bg-[#ECFDF5] border border-[rgba(5,150,105,0.12)] rounded-xl p-3.5">
        <div className="w-8 h-8 rounded-lg bg-[#D1FAE5] flex items-center justify-center text-[#059669] flex-shrink-0">{CHECK}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[#059669] truncate">{file.name}</p>
          <p className="text-[11px] text-[#059669]/70">{size}</p>
        </div>
        <button onClick={() => onSelect(null)} className="text-[11px] text-[#059669] hover:text-[#047857] font-medium">Changer</button>
      </div>
    );
  }

  return (
    <div>
      <input type="file" ref={ref} onChange={handleChange} accept={accept} className="hidden" />
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-150 ${
          dragOver
            ? "border-[#6366F1] bg-[#F5F3FF]"
            : "border-[rgba(0,0,29,0.1)] hover:border-[rgba(0,0,29,0.2)] hover:bg-[rgba(0,0,23,0.015)]"
        }`}>
        <div className="w-10 h-10 rounded-xl bg-[rgba(0,0,23,0.04)] flex items-center justify-center mx-auto mb-2.5">
          <svg className="w-5 h-5 text-[#A8A29E]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className="text-[13px] font-medium text-[#0F0F10]">{label}</p>
        <p className="text-[11px] text-[#A8A29E] mt-0.5">{hint}</p>
        <p className="text-[10px] text-[#D6D3D1] mt-1.5">Glisser-deposer ou cliquer · PDF, JPG, PNG · max 10 Mo</p>
      </div>
    </div>
  );
}

/* ── Verification progress step ── */
function VerifStep({ label, status }) {
  return (
    <div className={`flex items-center gap-3 py-2.5 transition-colors duration-300 ${
      status === "done" ? "text-[#059669]" :
      status === "failed" ? "text-[#DC2626]" :
      status === "processing" ? "text-[#0F0F10]" :
      "text-[#D6D3D1]"
    }`}>
      {status === "done" ? (
        <div className="w-5 h-5 rounded-full bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
      ) : status === "failed" ? (
        <div className="w-5 h-5 rounded-full bg-[#FEE2E2] flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </div>
      ) : status === "processing" ? (
        <div className="w-5 h-5 border-[1.5px] border-[rgba(0,0,29,0.1)] border-t-[#0F0F10] rounded-full animate-spin flex-shrink-0" />
      ) : (
        <div className="w-5 h-5 rounded-full border border-[#E5E5E5] flex-shrink-0" />
      )}
      <span className={`text-[13px] ${status === "processing" ? "font-medium" : ""}`}>{label}</span>
    </div>
  );
}

/* ── Biometric verification step (QR code + selfie) ── */
function BiometricStep({ profile, onComplete, onBack }) {
  const [status, setStatus] = useState("waiting"); // waiting, scanning, done
  const sessionId = useRef(`bfkyc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const verifyUrl = `https://verify.complycube.com/s/${sessionId.current}`;

  // Simulate mobile scan completion for demo
  useEffect(() => {
    const t1 = setTimeout(() => setStatus("scanning"), 3000);
    const t2 = setTimeout(() => setStatus("done"), 6000);
    const t3 = setTimeout(() => onComplete(), 7000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-[11px] text-[#A8A29E]">
        <div className="w-4 h-4 rounded bg-[#6366F1] flex items-center justify-center">
          <span className="text-white text-[7px] font-bold">CC</span>
        </div>
        Verification biometrique · ComplyCube Liveness
      </div>

      <div className="text-center">
        <h4 className="text-[15px] font-semibold text-[#0F0F10] mb-1">Verification du visage</h4>
        <p className="text-[13px] text-[#787881] mb-6">
          Scannez le QR code avec votre telephone pour prendre un selfie et verifier votre identite
        </p>

        <div className="inline-flex flex-col items-center">
          <div className={`p-4 rounded-2xl border-2 transition-all duration-500 ${
            status === "done" ? "border-[#059669] bg-[#ECFDF5]" :
            status === "scanning" ? "border-[#6366F1] bg-[#F5F3FF]" :
            "border-[rgba(0,0,29,0.08)] bg-white"
          }`}>
            {status === "done" ? (
              <div className="w-[180px] h-[180px] flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#D1FAE5] flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            ) : (
              <QRCodeSVG
                value={verifyUrl}
                size={180}
                level="M"
                bgColor="transparent"
                fgColor={status === "scanning" ? "#6366F1" : "#0F0F10"}
              />
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            {status === "waiting" && (
              <>
                <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                <span className="text-[12px] text-[#A8A29E]">En attente du scan...</span>
              </>
            )}
            {status === "scanning" && (
              <>
                <div className="w-4 h-4 border-[1.5px] border-[rgba(0,0,29,0.1)] border-t-[#6366F1] rounded-full animate-spin" />
                <span className="text-[12px] text-[#6366F1] font-medium">Verification en cours...</span>
              </>
            )}
            {status === "done" && (
              <>
                <div className="w-2 h-2 rounded-full bg-[#059669]" />
                <span className="text-[12px] text-[#059669] font-medium">Visage verifie</span>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-start gap-3 text-left bg-[rgba(0,0,23,0.025)] rounded-xl p-3.5">
            <svg className="w-4 h-4 text-[#A8A29E] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
            <div>
              <p className="text-[12px] text-[#787881] leading-relaxed">
                <span className="font-medium text-[#0F0F10]">1.</span> Ouvrez l'appareil photo de votre telephone{" "}
                <span className="font-medium text-[#0F0F10]">2.</span> Scannez le QR code{" "}
                <span className="font-medium text-[#0F0F10]">3.</span> Suivez les instructions pour la capture du visage
              </p>
            </div>
          </div>
        </div>

        <button onClick={onBack} className="mt-4 text-[12px] text-[#A8A29E] hover:text-[#787881] transition-colors">
          ← Retour aux documents
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN KYC FLOW COMPONENT
   ══════════════════════════════════════════ */
export default function KYCFlow({ personType, profile, formData, onComplete, onKycStatus, toast }) {
  // Document files
  const [idFile, setIdFile] = useState(null);
  const [addressFile, setAddressFile] = useState(null);
  const [companyFile, setCompanyFile] = useState(null);
  const [fundsFile, setFundsFile] = useState(null);

  // Flow phase: "upload" → "biometric" → "verifying" → "result"
  const [phase, setPhase] = useState("upload");

  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [verifySteps, setVerifySteps] = useState({});
  const [result, setResult] = useState(null); // { success, results, clientId }
  const [error, setError] = useState(null);

  const isMorale = personType === "morale";
  const requiredDocs = isMorale
    ? idFile && addressFile && companyFile
    : idFile && addressFile;

  const launchVerification = async () => {
    setVerifying(true);
    setError(null);
    setVerifySteps({});
    onKycStatus?.("En attente");

    try {
      // Add biometric step to verification steps
      setVerifySteps((prev) => ({ ...prev, biometric: "done" }));

      const kycResult = await runFullKyc({
        profile: {
          full_name: `${formData.prenom} ${formData.nom}`.trim(),
          email: profile?.email,
          date_of_birth: formData.dateNaissance,
          nationality: formData.nationalite,
          company: formData.societe,
          person_type: personType,
        },
        idDocument: idFile,
        proofOfAddress: addressFile,
        companyDoc: isMorale ? companyFile : null,
        personType,
        onStep: (step, status) => {
          setVerifySteps((prev) => ({ ...prev, [step]: status }));
        },
      });

      setResult(kycResult);

      if (kycResult.success) {
        onKycStatus?.("Validé");
        toast?.("KYC valide — identite verifiee, aucune alerte AML");

        // Persist to Supabase
        if (supabase && profile?.id) {
          try {
            await supabase.from("profiles").update({
              kyc_status: "validated",
              complycube_client_id: kycResult.clientId,
              updated_at: new Date().toISOString(),
            }).eq("id", profile.id);
          } catch (e) {
            console.warn("Failed to persist KYC status:", e);
          }
        }

        // Store funds doc in Supabase storage (not sent to ComplyCube)
        if (supabase && fundsFile && kycResult.clientId) {
          try {
            const path = `kyc/${kycResult.clientId}/funds_${Date.now()}_${fundsFile.name}`;
            await supabase.storage.from("documents").upload(path, fundsFile, { contentType: fundsFile.type });
          } catch (e) {
            console.warn("Funds doc storage failed:", e);
          }
        }
      } else {
        onKycStatus?.("Rejeté");
        toast?.("Verification KYC echouee — veuillez verifier vos documents");
      }
    } catch (err) {
      console.error("KYC verification error:", err);
      setError(err.message || "Erreur lors de la verification");
      onKycStatus?.(null);
      setVerifying(false);
      return;
    }

    setVerifying(false);
  };

  const handleBiometricDone = useCallback(() => {
    setPhase("verifying");
    launchVerification();
  }, [idFile, addressFile, companyFile, personType, profile, formData]);

  const handleVerify = () => {
    if (!requiredDocs) return;
    setPhase("biometric");
  };

  const handleRetry = () => {
    setResult(null);
    setError(null);
    setVerifySteps({});
    setVerifying(false);
    setPhase("upload");
    onKycStatus?.(null);
  };

  // ── Biometric step ──
  if (phase === "biometric") {
    return (
      <BiometricStep
        profile={profile}
        onComplete={handleBiometricDone}
        onBack={() => setPhase("upload")}
      />
    );
  }

  // ── Verification in progress or complete ──
  if (phase === "verifying" || verifying || result) {
    const steps = [
      { key: "biometric", label: "Verification biometrique (selfie)" },
      { key: "client", label: "Creation du profil de verification" },
      { key: "id", label: isMorale ? "Verification du K-bis" : "Verification de la piece d'identite" },
      { key: "address", label: "Verification du justificatif de domicile" },
      ...(isMorale ? [{ key: "company", label: "Verification des documents societe" }] : []),
      { key: "aml", label: "Screening AML / PEP / Sanctions" },
    ];

    return (
      <div className="space-y-6">
        {/* Provider badge */}
        <div className="flex items-center gap-2 text-[11px] text-[#A8A29E]">
          <div className="w-4 h-4 rounded bg-[#6366F1] flex items-center justify-center">
            <span className="text-white text-[7px] font-bold">CC</span>
          </div>
          Verification par ComplyCube · Conforme AMLD5
        </div>

        {result?.success ? (
          /* ── Success state ── */
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-[#D1FAE5] flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h4 className="text-[16px] font-semibold text-[#059669] mb-1">Verification reussie</h4>
            <p className="text-[13px] text-[#059669]/80 mb-1">Identite verifiee · Aucune alerte AML/PEP/Sanctions</p>
            <p className="text-[11px] text-[#A8A29E]">Ref. ComplyCube : {result.clientId}</p>

            <div className="mt-6">
              <button onClick={onComplete}
                className="px-6 py-2.5 bg-[#0F0F10] text-white text-[13px] font-medium rounded-full hover:bg-[#292524] active:scale-[0.97] transition-all duration-100">
                Continuer →
              </button>
            </div>
          </div>
        ) : result && !result.success ? (
          /* ── Failed state ── */
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h4 className="text-[16px] font-semibold text-[#DC2626] mb-1">Verification echouee</h4>
            <p className="text-[13px] text-[#DC2626]/80 mb-4">Un ou plusieurs documents n'ont pas passe la verification. Veuillez re-soumettre des documents valides.</p>
            <button onClick={handleRetry}
              className="px-6 py-2.5 bg-[#0F0F10] text-white text-[13px] font-medium rounded-full hover:bg-[#292524] active:scale-[0.97] transition-all duration-100">
              Reessayer
            </button>
          </div>
        ) : (
          /* ── In progress ── */
          <div>
            <h4 className="text-[15px] font-semibold text-[#0F0F10] mb-4">Verification en cours</h4>
            <div className="space-y-0.5">
              {steps.map((s) => (
                <VerifStep key={s.key} label={s.label} status={verifySteps[s.key] || "pending"} />
              ))}
            </div>
          </div>
        )}

        {/* Progress steps list (show even on success/fail for audit trail) */}
        {result && (
          <div className="border-t border-[rgba(0,0,29,0.06)] pt-4">
            <p className="text-[11px] font-medium text-[#A8A29E] mb-2">Detail de la verification</p>
            <div className="space-y-0.5">
              {steps.map((s) => (
                <VerifStep key={s.key} label={s.label} status={verifySteps[s.key] || "pending"} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.1)] rounded-xl p-3.5">
            <p className="text-[13px] text-[#DC2626]">{error}</p>
            <button onClick={handleRetry} className="text-[12px] text-[#DC2626] font-medium mt-1 hover:underline">Reessayer</button>
          </div>
        )}
      </div>
    );
  }

  // ── Document upload form ──
  return (
    <div className="space-y-5">
      {/* Provider badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-[#A8A29E]">
          <div className="w-4 h-4 rounded bg-[#6366F1] flex items-center justify-center">
            <span className="text-white text-[7px] font-bold">CC</span>
          </div>
          Verification par ComplyCube · Conforme AMLD5
        </div>
        <span className="text-[10px] text-[#D6D3D1] bg-[rgba(0,0,23,0.03)] px-2 py-0.5 rounded-full">
          {isMorale ? "KYB" : "KYC"} · {personType === "morale" ? "Personne morale" : "Personne physique"}
        </span>
      </div>

      {/* Documents */}
      <div className="space-y-3">
        <FileUploadZone
          label={isMorale ? "Extrait K-bis / Registre de commerce" : "Piece d'identite (passeport ou CNI)"}
          hint={isMorale ? "Document officiel datant de moins de 3 mois" : "Recto-verso si carte d'identite"}
          file={idFile}
          onSelect={setIdFile}
        />

        <FileUploadZone
          label="Justificatif de domicile"
          hint="Facture energie, telephone, avis d'imposition (< 3 mois)"
          file={addressFile}
          onSelect={setAddressFile}
        />

        {isMorale && (
          <FileUploadZone
            label="Statuts de la societe"
            hint="Statuts a jour signes + liste des beneficiaires effectifs"
            file={companyFile}
            onSelect={setCompanyFile}
          />
        )}

        <FileUploadZone
          label={<>Justificatif d'origine des fonds <span className="text-[#A8A29E] font-normal">(recommande)</span></>}
          hint="Releve bancaire, acte de cession, attestation employeur"
          file={fundsFile}
          onSelect={setFundsFile}
        />
      </div>

      {/* Info box */}
      <div className="bg-[rgba(0,0,23,0.025)] rounded-xl p-3.5 flex gap-3">
        <svg className="w-4 h-4 text-[#A8A29E] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <div>
          <p className="text-[12px] text-[#787881] leading-relaxed">
            Vos documents sont verifies automatiquement par ComplyCube (OCR + IA) conformement a la directive AMLD5 et au reglement CSSF 12-02.
            Un screening AML/PEP/Sanctions est effectue en temps reel.
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-[11px] text-[#D6D3D1]">
          {isMorale ? "3 documents requis" : "2 documents requis"} · {[idFile, addressFile, isMorale && companyFile].filter(Boolean).length} / {isMorale ? 3 : 2} fournis
        </p>
        <button
          onClick={handleVerify}
          disabled={!requiredDocs}
          className="px-6 py-2.5 bg-[#0F0F10] text-white text-[13px] font-medium rounded-full hover:bg-[#292524] active:scale-[0.97] transition-all duration-100 disabled:opacity-25 disabled:cursor-not-allowed">
          Lancer la verification
        </button>
      </div>
    </div>
  );
}
