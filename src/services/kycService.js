import { supabase } from "../lib/supabase";

/* ═══════════════════════════════════════════════════════════════
   KYC Service — ComplyCube integration via Supabase Edge Function
   Falls back to demo mode when VITE_KYC_DEMO_MODE=true or
   when no Edge Function is deployed yet.
   ═══════════════════════════════════════════════════════════════ */

const DEMO_MODE = import.meta.env.VITE_KYC_DEMO_MODE === "true" || !supabase;
const EDGE_FN = "kyc-verify"; // Supabase Edge Function name

/* ── Helper: call Edge Function ── */
async function callEdge(action, payload) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.functions.invoke(EDGE_FN, {
    body: { action, ...payload },
  });
  if (error) throw error;
  return data;
}

/* ── Demo mode: simulate ComplyCube responses ── */
const demoDelay = (ms) => new Promise((r) => setTimeout(r, ms));

let demoClientCounter = 1000;
let demoDocCounter = 2000;
let demoCheckCounter = 3000;

const demoResults = {
  document_check: {
    id_document: { result: "clear", breakdown: { imageIntegrity: "clear", dataComparison: "clear", dataValidation: "clear", visualAuthenticity: "clear" } },
    proof_of_address: { result: "clear", breakdown: { dataExtraction: "clear", imageIntegrity: "clear", dataComparison: "clear" } },
    company_registration: { result: "clear", breakdown: { dataExtraction: "clear", dataValidation: "clear" } },
  },
  screening_check: { result: "clear", breakdown: { pep: "clear", sanctions: "clear", adverseMedia: "clear" } },
};

/* ═══════════════════════════════════════
   PUBLIC API
   ═══════════════════════════════════════ */

/**
 * Create a KYC client (applicant) on ComplyCube
 * @param {Object} profile - { full_name, email, date_of_birth, nationality, company, person_type }
 * @returns {{ clientId: string }}
 */
export async function createKycClient(profile) {
  if (DEMO_MODE) {
    await demoDelay(600);
    const clientId = `demo_client_${++demoClientCounter}`;
    console.log("[KYC Demo] Created client:", clientId);
    return { clientId };
  }
  return callEdge("create-client", { profile });
}

/**
 * Upload a document for verification
 * @param {string} clientId - ComplyCube client ID
 * @param {File} file - Document file
 * @param {string} docType - "id_document" | "proof_of_address" | "company_registration"
 * @returns {{ documentId: string }}
 */
export async function uploadDocument(clientId, file, docType) {
  if (DEMO_MODE) {
    await demoDelay(800);
    const documentId = `demo_doc_${++demoDocCounter}`;
    console.log("[KYC Demo] Uploaded document:", documentId, docType);
    return { documentId };
  }

  // Convert file to base64 for Edge Function
  const buffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

  return callEdge("upload-document", {
    clientId,
    document: {
      base64,
      fileName: file.name,
      contentType: file.type,
      type: docType,
    },
  });
}

/**
 * Create a verification check on an uploaded document
 * @param {string} clientId
 * @param {string} documentId
 * @param {string} checkType - "document_check" | "identity_check"
 * @returns {{ checkId: string }}
 */
export async function createCheck(clientId, documentId, checkType = "document_check") {
  if (DEMO_MODE) {
    await demoDelay(400);
    const checkId = `demo_check_${++demoCheckCounter}`;
    console.log("[KYC Demo] Created check:", checkId, checkType);
    return { checkId };
  }
  return callEdge("create-check", { clientId, documentId, checkType });
}

/**
 * Get the result of a verification check (poll until complete)
 * @param {string} checkId
 * @param {string} docType - for demo result lookup
 * @returns {{ status: "complete"|"pending"|"failed", result: "clear"|"attention"|"rejected", breakdown: Object }}
 */
export async function getCheckResult(checkId, docType = "id_document") {
  if (DEMO_MODE) {
    await demoDelay(1500 + Math.random() * 1000);
    const checkType = checkId.includes("aml") ? "screening_check" : "document_check";
    const result = checkType === "screening_check"
      ? demoResults.screening_check
      : (demoResults.document_check[docType] || demoResults.document_check.id_document);
    console.log("[KYC Demo] Check result:", checkId, result.result);
    return { status: "complete", ...result };
  }
  return callEdge("get-check", { checkId });
}

/**
 * Run AML/PEP/Sanctions screening on a client
 * @param {string} clientId
 * @returns {{ checkId: string }}
 */
export async function runAmlScreening(clientId) {
  if (DEMO_MODE) {
    await demoDelay(500);
    const checkId = `demo_check_aml_${++demoCheckCounter}`;
    console.log("[KYC Demo] AML screening launched:", checkId);
    return { checkId };
  }
  return callEdge("aml-screen", { clientId });
}

/**
 * Full KYC verification pipeline for a single document
 * Upload → Create check → Poll result
 * @param {string} clientId
 * @param {File} file
 * @param {string} docType
 * @param {Function} onStatus - callback for status updates
 * @returns {{ status: string, result: string, breakdown: Object, documentId: string, checkId: string }}
 */
export async function verifyDocument(clientId, file, docType, onStatus) {
  onStatus?.("upload");
  const { documentId } = await uploadDocument(clientId, file, docType);

  onStatus?.("analyzing");
  const { checkId } = await createCheck(clientId, documentId);

  onStatus?.("verifying");
  const result = await getCheckResult(checkId, docType);

  // Store in Supabase if available
  if (supabase) {
    try {
      // Upload file to Supabase storage too
      const storagePath = `kyc/${clientId}/${Date.now()}_${file.name}`;
      await supabase.storage.from("documents").upload(storagePath, file, { contentType: file.type });
    } catch (e) {
      console.warn("Storage upload failed (non-blocking):", e);
    }
  }

  return { ...result, documentId, checkId };
}

/**
 * Full KYC pipeline: all documents + AML screening
 * @param {Object} params
 * @param {Object} params.profile - User profile data
 * @param {File} params.idDocument - Identity document file
 * @param {File} params.proofOfAddress - Proof of address file
 * @param {File|null} params.companyDoc - Company registration (KYB)
 * @param {string} params.personType - "physique" | "morale"
 * @param {Function} params.onStep - callback (stepName, status)
 * @returns {{ success: boolean, results: Object, clientId: string }}
 */
export async function runFullKyc({ profile, idDocument, proofOfAddress, companyDoc, personType, onStep }) {
  const results = {};

  // Step 1: Create client
  onStep?.("client", "processing");
  const { clientId } = await createKycClient(profile);
  onStep?.("client", "done");

  // Step 2: Verify ID document
  onStep?.("id", "processing");
  results.id = await verifyDocument(clientId, idDocument, "id_document", (s) => onStep?.("id", s));
  onStep?.("id", results.id.result === "clear" ? "done" : "failed");

  // Step 3: Verify proof of address
  onStep?.("address", "processing");
  results.address = await verifyDocument(clientId, proofOfAddress, "proof_of_address", (s) => onStep?.("address", s));
  onStep?.("address", results.address.result === "clear" ? "done" : "failed");

  // Step 4: KYB - Company doc (if morale)
  if (personType === "morale" && companyDoc) {
    onStep?.("company", "processing");
    results.company = await verifyDocument(clientId, companyDoc, "company_registration", (s) => onStep?.("company", s));
    onStep?.("company", results.company.result === "clear" ? "done" : "failed");
  }

  // Step 5: AML/PEP screening
  onStep?.("aml", "processing");
  const { checkId: amlCheckId } = await runAmlScreening(clientId);
  results.aml = await getCheckResult(amlCheckId, "aml");
  onStep?.("aml", results.aml.result === "clear" ? "done" : "failed");

  // Determine overall result
  const allClear = Object.values(results).every((r) => r.result === "clear");

  return {
    success: allClear,
    results,
    clientId,
  };
}
