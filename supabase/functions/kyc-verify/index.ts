/* ═══════════════════════════════════════════════════════════════
   kyc-verify — ComplyCube KYC/KYB/AML Edge Function
   Real integration with ComplyCube REST API v1
   Endpoints: create-client, create-document, upload-image,
              create-live-photo, create-check, get-check
   ═══════════════════════════════════════════════════════════════ */

const COMPLYCUBE_API = "https://api.complycube.com/v1";
const COMPLYCUBE_KEY = Deno.env.get("COMPLYCUBE_API_KEY") ||
  "test_eU1tRVhqeTIySlBiZFlRS2U6MTA5MDQ0OGNlNWIzZTEzZjM4NWIwNTMyYmNhMjFkMjZjZTA5YjAxYzM0MmQ1MDI4NWU2N2UzYmVjODA0MjU4Nw==";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string) {
  // Always return 200 so supabase.functions.invoke doesn't throw
  // The client checks data.error instead
  return json({ error: message }, 200);
}

/* ── ComplyCube API helper ── */
async function cc(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: any }> {
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: COMPLYCUBE_KEY,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${COMPLYCUBE_API}${path}`, opts);
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

/* ═══════════════════════════════════════
   REQUEST HANDLER
   ═══════════════════════════════════════ */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, ...payload } = await req.json();
    console.log(`[kyc-verify] action=${action}`);

    switch (action) {
      /* ── 1. Create ComplyCube client ── */
      case "create-client": {
        const { profile } = payload;
        if (!profile) return err("Missing profile");

        const names = (profile.full_name || "").split(" ");
        const firstName = names[0] || "Unknown";
        const lastName = names.slice(1).join(" ") || "Unknown";

        const clientBody: any = {
          type: profile.person_type === "morale" ? "company" : "person",
          email: profile.email || undefined,
        };

        if (clientBody.type === "person") {
          clientBody.personDetails = {
            firstName,
            lastName,
            ...(profile.date_of_birth ? { dob: profile.date_of_birth } : {}),
            ...(profile.nationality ? { nationality: profile.nationality } : {}),
          };
        } else {
          clientBody.companyDetails = {
            name: profile.company || `${firstName} ${lastName}`,
          };
          // Company clients also need a person for identity
          clientBody.personDetails = { firstName, lastName };
        }

        const res = await cc("POST", "/clients", clientBody);
        if (!res.ok) {
          console.error("[create-client] ComplyCube error:", res.data);
          return err(`ComplyCube: ${res.data?.message || "Failed to create client"}`);
        }

        return json({ clientId: res.data.id });
      }

      /* ── 2. Create document (metadata) ── */
      case "create-document": {
        const { clientId, documentType } = payload;
        if (!clientId || !documentType) return err("Missing clientId or documentType");

        // Map our types to ComplyCube document types
        const typeMap: Record<string, string> = {
          id_document: "passport",
          passport: "passport",
          national_identity_card: "national_identity_card",
          driving_license: "driving_license",
          proof_of_address: "utility_bill",
          utility_bill: "utility_bill",
          bank_statement: "bank_statement",
          company_registration: "company_incorporation",
        };

        const ccType = typeMap[documentType] || documentType;

        const res = await cc("POST", "/documents", {
          clientId,
          type: ccType,
        });

        if (!res.ok) {
          console.error("[create-document] ComplyCube error:", res.data);
          return err(`ComplyCube: ${res.data?.message || "Failed to create document"}`);
        }

        return json({ documentId: res.data.id, type: res.data.type });
      }

      /* ── 3. Upload image to document ── */
      case "upload-image": {
        const { documentId, fileName, contentType, data: imageData, side } = payload;
        if (!documentId || !imageData) return err("Missing documentId or image data");

        const uploadSide = side || "front";
        const res = await cc("POST", `/documents/${documentId}/upload/${uploadSide}`, {
          fileName: fileName || "document.jpg",
          contentType: contentType || "image/jpeg",
          data: imageData,
        });

        if (!res.ok) {
          console.error("[upload-image] ComplyCube error:", res.data);
          return err(`ComplyCube: ${res.data?.message || "Failed to upload image"}`);
        }

        return json({ imageId: res.data.id, size: res.data.size });
      }

      /* ── 4. Create live photo (selfie/biometric) ── */
      case "create-live-photo": {
        const { clientId, data: photoData, fileName, contentType } = payload;
        if (!clientId || !photoData) return err("Missing clientId or photo data");

        const res = await cc("POST", "/livePhotos", {
          clientId,
          data: photoData,
          fileName: fileName || "selfie.jpg",
          contentType: contentType || "image/jpeg",
        });

        if (!res.ok) {
          console.error("[create-live-photo] ComplyCube error:", res.data);
          return err(`ComplyCube: ${res.data?.message || "Failed to upload live photo"}`);
        }

        return json({ livePhotoId: res.data.id });
      }

      /* ── 5. Create a check ── */
      case "create-check": {
        const { clientId, documentId, livePhotoId, checkType } = payload;
        if (!clientId || !checkType) return err("Missing clientId or checkType");

        const checkBody: any = { clientId, type: checkType };
        if (documentId) checkBody.documentId = documentId;
        if (livePhotoId) checkBody.livePhotoId = livePhotoId;

        const res = await cc("POST", "/checks", checkBody);
        if (!res.ok) {
          console.error("[create-check] ComplyCube error:", res.data);
          return err(`ComplyCube: ${res.data?.message || "Failed to create check"}`);
        }

        return json({
          checkId: res.data.id,
          status: res.data.status,
          type: res.data.type,
        });
      }

      /* ── 6. Get check result ── */
      case "get-check": {
        const { checkId } = payload;
        if (!checkId) return err("Missing checkId");

        const res = await cc("GET", `/checks/${checkId}`);
        if (!res.ok) {
          console.error("[get-check] ComplyCube error:", res.data);
          return err(`ComplyCube: ${res.data?.message || "Failed to get check"}`);
        }

        return json({
          checkId: res.data.id,
          status: res.data.status,
          result: res.data.result?.outcome || null,
          breakdown: res.data.result?.breakdown || null,
          type: res.data.type,
        });
      }

      /* ── 7. Create SDK token for Web SDK ── */
      case "create-sdk-token": {
        const { clientId, referrer } = payload;
        if (!clientId) return err("Missing clientId");

        const res = await cc("POST", "/tokens", {
          clientId,
          referrer: referrer || "*://*/*",
        });
        if (!res.ok) {
          console.error("[create-sdk-token] ComplyCube error:", res.data);
          return err(`ComplyCube: ${res.data?.message || "Failed to create SDK token"}`);
        }

        return json({ token: res.data.token, clientId });
      }

      /* ── 8. Run checks after SDK completion ── */
      case "run-checks": {
        const { clientId, documentId, livePhotoId } = payload;
        if (!clientId) return err("Missing clientId");

        const results: any = {};

        // Document check (if document was uploaded via SDK)
        if (documentId) {
          const docCheck = await cc("POST", "/checks", {
            clientId,
            type: "document_check",
            documentId,
          });
          if (docCheck.ok) results.documentCheck = { checkId: docCheck.data.id, status: docCheck.data.status };
        }

        // Identity check (if live photo + document exist)
        if (documentId && livePhotoId) {
          const idCheck = await cc("POST", "/checks", {
            clientId,
            type: "identity_check",
            documentId,
            livePhotoId,
          });
          if (idCheck.ok) results.identityCheck = { checkId: idCheck.data.id, status: idCheck.data.status };
        }

        // AML screening
        const amlCheck = await cc("POST", "/checks", {
          clientId,
          type: "extensive_screening_check",
        });
        if (amlCheck.ok) results.amlCheck = { checkId: amlCheck.data.id, status: amlCheck.data.status };

        return json({ clientId, checks: results });
      }

      /* ── 9. Get client details (documents, live photos) ── */
      case "get-client-details": {
        const { clientId } = payload;
        if (!clientId) return err("Missing clientId");

        // Get documents
        const docs = await cc("GET", `/documents?clientId=${clientId}`);
        // Get live photos
        const photos = await cc("GET", `/livePhotos?clientId=${clientId}`);

        return json({
          clientId,
          documents: docs.ok ? docs.data?.items || docs.data || [] : [],
          livePhotos: photos.ok ? photos.data?.items || photos.data || [] : [],
        });
      }

      default:
        return err(`Unknown action: ${action}`);
    }
  } catch (e) {
    console.error("[kyc-verify] Unhandled error:", e);
    return err(e.message || "Internal server error");
  }
});
