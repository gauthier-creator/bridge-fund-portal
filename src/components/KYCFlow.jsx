import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";

/* ═══════════════════════════════════════════════════════════════
   KYCFlow — Real ComplyCube Web SDK Integration
   No fake/simulated steps — all verification goes through ComplyCube.
   Flow: Create client → SDK token → Launch Web SDK → Run checks → Poll results
   ═══════════════════════════════════════════════════════════════ */

const EDGE_FN = "kyc-verify";

/* ── Helper: call Edge Function ── */
async function callEdge(action, payload) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.functions.invoke(EDGE_FN, {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message || `KYC action "${action}" failed`);
  if (data?.error) throw new Error(data.error);
  return data;
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

/* ══════════════════════════════════════════
   MAIN KYC FLOW COMPONENT
   ══════════════════════════════════════════ */
export default function KYCFlow({ personType, profile, formData, onComplete, onKycStatus, toast }) {
  // Flow phase: "init" → "sdk" → "checks" → "result"
  const [phase, setPhase] = useState("init");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [sdkToken, setSdkToken] = useState(null);
  const [checkSteps, setCheckSteps] = useState({});
  const [result, setResult] = useState(null);
  const sdkContainerRef = useRef(null);
  const sdkInstanceRef = useRef(null);

  const isMorale = personType === "morale";

  /* ── Step 1: Create ComplyCube client + get SDK token ── */
  const initializeKyc = async () => {
    setLoading(true);
    setError(null);
    onKycStatus?.("En attente");

    try {
      // Create client on ComplyCube
      const names = (formData?.prenom && formData?.nom)
        ? `${formData.prenom} ${formData.nom}`.trim()
        : profile?.full_name || "Unknown";

      const { clientId: newClientId } = await callEdge("create-client", {
        profile: {
          full_name: names,
          email: profile?.email,
          date_of_birth: formData?.dateNaissance,
          nationality: formData?.nationalite,
          company: formData?.societe,
          person_type: personType,
        },
      });

      setClientId(newClientId);
      console.log("[KYC] Created ComplyCube client:", newClientId);

      // Get SDK token
      const { token } = await callEdge("create-sdk-token", {
        clientId: newClientId,
        referrer: "*://*/*",
      });

      setSdkToken(token);
      setPhase("sdk");
      console.log("[KYC] Got SDK token, launching Web SDK");
    } catch (err) {
      console.error("[KYC] Init error:", err);
      setError(err.message || "Erreur lors de l'initialisation");
      onKycStatus?.(null);
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: Load and mount ComplyCube Web SDK ── */
  useEffect(() => {
    if (phase !== "sdk" || !sdkToken || !clientId) return;

    // Load ComplyCube SDK script
    const loadSdk = async () => {
      // Check if already loaded
      if (!window.ComplyCube) {
        const script = document.createElement("script");
        script.src = "https://assets.complycube.com/web-sdk/v1/complycube.min.js";
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        // Also load CSS
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://assets.complycube.com/web-sdk/v1/style.css";
        document.head.appendChild(link);
      }

      // Wait a tick for SDK to be available
      await new Promise((r) => setTimeout(r, 200));

      if (!window.ComplyCube) {
        throw new Error("ComplyCube SDK failed to load");
      }

      // Mount the SDK
      const complycube = window.ComplyCube.mount({
        token: sdkToken,
        containerId: "complycube-mount",
        stages: [
          "intro",
          {
            name: "documentCapture",
            options: {
              crossDeviceOnly: false,
              ...(isMorale ? { documentTypes: { national_identity_card: true, passport: true, driving_license: true } } : {}),
            },
          },
          "faceCapture",
          "completion",
        ],
        onComplete: (data) => {
          console.log("[KYC] SDK complete:", data);
          sdkInstanceRef.current = null;
          handleSdkComplete(data);
        },
        onModalClose: () => {
          console.log("[KYC] SDK closed by user");
        },
        onError: (err) => {
          console.error("[KYC] SDK error:", err);
          setError("Erreur dans le SDK de verification: " + (err?.message || JSON.stringify(err)));
          setPhase("init");
        },
      });

      sdkInstanceRef.current = complycube;
    };

    loadSdk().catch((err) => {
      console.error("[KYC] Failed to load SDK:", err);
      setError("Impossible de charger le SDK ComplyCube. Verifiez votre connexion internet.");
      setPhase("init");
    });

    return () => {
      // Cleanup SDK on unmount
      if (sdkInstanceRef.current && typeof sdkInstanceRef.current.unmount === "function") {
        try { sdkInstanceRef.current.unmount(); } catch (e) { /* ignore */ }
      }
    };
  }, [phase, sdkToken, clientId]);

  /* ── Step 3: After SDK completes, run checks ── */
  const handleSdkComplete = async (sdkData) => {
    setPhase("checks");
    setCheckSteps({});

    try {
      // Get client details to find uploaded documents and live photos
      setCheckSteps((prev) => ({ ...prev, gathering: "processing" }));
      const details = await callEdge("get-client-details", { clientId });
      setCheckSteps((prev) => ({ ...prev, gathering: "done" }));

      const documents = Array.isArray(details.documents) ? details.documents : [];
      const livePhotos = Array.isArray(details.livePhotos) ? details.livePhotos : [];
      const documentId = documents[0]?.id || null;
      const livePhotoId = livePhotos[0]?.id || null;

      console.log("[KYC] Client details:", { documents: documents.length, livePhotos: livePhotos.length, documentId, livePhotoId });

      // Launch checks
      setCheckSteps((prev) => ({ ...prev, checks: "processing" }));
      const { checks } = await callEdge("run-checks", { clientId, documentId, livePhotoId });
      setCheckSteps((prev) => ({ ...prev, checks: "done" }));

      console.log("[KYC] Checks launched:", checks);

      // Poll all checks until complete
      setCheckSteps((prev) => ({ ...prev, polling: "processing" }));
      const allCheckIds = Object.values(checks).map((c) => c.checkId).filter(Boolean);
      const finalResults = {};
      const maxAttempts = 20;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((r) => setTimeout(r, 2000));

        let allDone = true;
        for (const checkId of allCheckIds) {
          if (finalResults[checkId]?.status === "complete") continue;
          const res = await callEdge("get-check", { checkId });
          finalResults[checkId] = res;
          if (res.status !== "complete" && res.status !== "failed" && res.status !== "cancelled") {
            allDone = false;
          }
        }
        if (allDone) break;
      }

      setCheckSteps((prev) => ({ ...prev, polling: "done" }));

      // Determine overall result
      const allClear = Object.values(finalResults).every((r) => r.result === "clear");
      const anyFailed = Object.values(finalResults).some((r) => r.result === "attention" || r.status === "failed");

      const kycResult = {
        success: allClear,
        clientId,
        results: finalResults,
        checks,
      };

      setResult(kycResult);

      if (allClear) {
        onKycStatus?.("Validé");
        toast?.("KYC valide — identite verifiee par ComplyCube, aucune alerte AML");

        // Persist to Supabase
        if (supabase && profile?.id) {
          try {
            await supabase.from("profiles").update({
              kyc_status: "validated",
              complycube_client_id: clientId,
              updated_at: new Date().toISOString(),
            }).eq("id", profile.id);
          } catch (e) {
            console.warn("Failed to persist KYC status:", e);
          }
        }
      } else {
        onKycStatus?.("Rejeté");
        toast?.("Verification KYC echouee — veuillez reessayer avec des documents valides");
      }
    } catch (err) {
      console.error("[KYC] Check error:", err);
      setError(err.message || "Erreur lors des verifications");
      setCheckSteps((prev) => ({ ...prev, polling: "failed" }));
    }
  };

  /* ── Retry ── */
  const handleRetry = () => {
    setPhase("init");
    setResult(null);
    setError(null);
    setCheckSteps({});
    setClientId(null);
    setSdkToken(null);
    onKycStatus?.(null);
  };

  /* ═══════════════════════════════════
     RENDER
     ═══════════════════════════════════ */

  // ── Init: Start button ──
  if (phase === "init") {
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

        {/* Explanation */}
        <div className="bg-[#EEF2FF] rounded-2xl p-5 border border-[rgba(99,102,241,0.1)]">
          <h4 className="text-[14px] font-semibold text-[#0F0F10] mb-2">Verification d'identite en ligne</h4>
          <p className="text-[13px] text-[#787881] leading-relaxed">
            Vous allez etre guide a travers un processus de verification securise par <strong>ComplyCube</strong>.
            Vous devrez :
          </p>
          <ul className="mt-3 space-y-2">
            <li className="flex items-start gap-2 text-[13px] text-[#787881]">
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[11px] font-semibold text-[#6366F1] flex-shrink-0 mt-0.5">1</span>
              <span>Photographier votre <strong className="text-[#0F0F10]">piece d'identite</strong> (passeport, CNI ou permis de conduire)</span>
            </li>
            <li className="flex items-start gap-2 text-[13px] text-[#787881]">
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[11px] font-semibold text-[#6366F1] flex-shrink-0 mt-0.5">2</span>
              <span>Prendre un <strong className="text-[#0F0F10]">selfie</strong> pour la verification biometrique (liveness check)</span>
            </li>
            <li className="flex items-start gap-2 text-[13px] text-[#787881]">
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[11px] font-semibold text-[#6366F1] flex-shrink-0 mt-0.5">3</span>
              <span>Nos systemes verifient automatiquement : <strong className="text-[#0F0F10]">authenticite du document, face match et screening AML/PEP</strong></span>
            </li>
          </ul>
        </div>

        {/* Requirements */}
        <div className="bg-[rgba(0,0,23,0.025)] rounded-xl p-3.5 flex gap-3">
          <svg className="w-4 h-4 text-[#A8A29E] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
          <p className="text-[12px] text-[#787881] leading-relaxed">
            Assurez-vous d'avoir une bonne luminosite et votre piece d'identite a portee de main.
            La verification prend generalement <strong className="text-[#0F0F10]">moins de 2 minutes</strong>.
          </p>
        </div>

        {error && (
          <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.1)] rounded-xl p-3.5">
            <p className="text-[13px] text-[#DC2626]">{error}</p>
          </div>
        )}

        {/* Launch button */}
        <div className="flex items-center justify-end pt-2">
          <button
            onClick={initializeKyc}
            disabled={loading}
            className="px-6 py-2.5 bg-[#0F0F10] text-white text-[13px] font-medium rounded-xl hover:bg-[#292524] active:scale-[0.97] transition-all duration-100 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Initialisation...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Demarrer la verification
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── SDK: ComplyCube Web SDK mounted here ──
  if (phase === "sdk") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-[#A8A29E]">
            <div className="w-4 h-4 rounded bg-[#6366F1] flex items-center justify-center">
              <span className="text-white text-[7px] font-bold">CC</span>
            </div>
            Session ComplyCube en cours · Client ID : {clientId?.slice(0, 8)}...
          </div>
        </div>

        {/* SDK mount point */}
        <div
          id="complycube-mount"
          ref={sdkContainerRef}
          className="min-h-[500px] rounded-2xl overflow-hidden border border-[rgba(0,0,29,0.08)]"
        />

        <p className="text-[11px] text-[#A8A29E] text-center">
          Suivez les instructions a l'ecran pour completer la verification. Vos donnees sont traitees de maniere securisee par ComplyCube.
        </p>
      </div>
    );
  }

  // ── Checks: Running verification checks ──
  if (phase === "checks") {
    const steps = [
      { key: "gathering", label: "Recuperation des documents soumis" },
      { key: "checks", label: "Lancement des verifications ComplyCube" },
      { key: "polling", label: "Attente des resultats (document check, identity check, AML)" },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-[11px] text-[#A8A29E]">
          <div className="w-4 h-4 rounded bg-[#6366F1] flex items-center justify-center">
            <span className="text-white text-[7px] font-bold">CC</span>
          </div>
          Verifications en cours · ComplyCube
        </div>

        {result?.success ? (
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
                className="px-6 py-2.5 bg-[#0F0F10] text-white text-[13px] font-medium rounded-xl hover:bg-[#292524] active:scale-[0.97] transition-all duration-100">
                Continuer →
              </button>
            </div>
          </div>
        ) : result && !result.success ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h4 className="text-[16px] font-semibold text-[#DC2626] mb-1">Verification echouee</h4>
            <p className="text-[13px] text-[#DC2626]/80 mb-4">La verification n'a pas abouti. Veuillez reessayer avec des documents valides.</p>
            <button onClick={handleRetry}
              className="px-6 py-2.5 bg-[#0F0F10] text-white text-[13px] font-medium rounded-xl hover:bg-[#292524] active:scale-[0.97] transition-all duration-100">
              Reessayer
            </button>
          </div>
        ) : (
          <div>
            <h4 className="text-[15px] font-semibold text-[#0F0F10] mb-4">Analyse en cours...</h4>
            <div className="space-y-0.5">
              {steps.map((s) => (
                <VerifStep key={s.key} label={s.label} status={checkSteps[s.key] || "pending"} />
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="border-t border-[rgba(0,0,29,0.06)] pt-4">
            <p className="text-[11px] font-medium text-[#A8A29E] mb-2">Detail des verifications</p>
            <div className="space-y-0.5">
              {steps.map((s) => (
                <VerifStep key={s.key} label={s.label} status={checkSteps[s.key] || "pending"} />
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

  return null;
}
