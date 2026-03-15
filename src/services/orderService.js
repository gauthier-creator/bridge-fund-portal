import { supabase } from "../lib/supabase";

// ─── Helpers: convert between DB snake_case and app camelCase ───

function dbToOrder(row, docs = []) {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    intermediaire: row.intermediaire,
    lpName: row.lp_name,
    societe: row.societe,
    personType: row.person_type,
    shareClass: row.share_class,
    montant: Number(row.montant),
    pays: row.pays,
    adresse: row.adresse,
    typeInvestisseur: row.type_investisseur,
    origineFonds: row.origine_fonds,
    pepStatus: row.pep_status,
    kycStatus: row.kyc_status,
    paymentStatus: row.payment_status,
    signatureDate: row.signature_date,
    date: row.created_at?.split("T")[0] || row.created_at,
    validatedAt: row.validated_at,
    rejectedAt: row.rejected_at,
    rejectReason: row.reject_reason,
    // Extended fields
    nom: row.nom,
    prenom: row.prenom,
    dateNaissance: row.date_naissance,
    nationalite: row.nationalite,
    formeJuridique: row.forme_juridique,
    rcs: row.rcs,
    lei: row.lei,
    codePostal: row.code_postal,
    ville: row.ville,
    pepDetail: row.pep_detail,
    beneficiaireNom: row.beneficiaire_nom,
    beneficiairePct: row.beneficiaire_pct,
    paymentMethod: row.payment_method,
    userId: row.user_id,
    intermediaryId: row.intermediary_id,
    documents: docs.map(dbToDocument),
  };
}

function parseSignatureDate(raw) {
  if (!raw) return null;
  // Already ISO or valid date string
  if (!isNaN(Date.parse(raw))) return new Date(raw).toISOString();
  // French format "14/03/2026 16:50:46" → ISO
  const match = raw.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):?(\d{2})?/);
  if (match) {
    const [, dd, mm, yyyy, hh, mi, ss = "00"] = match;
    return new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`).toISOString();
  }
  return null;
}

function orderToDb(order) {
  // Extract nom/prenom from lpName if not provided separately
  const parts = (order.lpName || "").split(" ");
  const nom = order.nom || parts.slice(-1)[0] || null;
  const prenom = order.prenom || parts.slice(0, -1).join(" ") || null;

  return {
    id: order.id,
    type: order.type,
    status: order.status || "pending",
    intermediaire: order.intermediaire || null,
    lp_name: order.lpName,
    societe: order.societe || null,
    person_type: order.personType,
    share_class: order.shareClass,
    montant: order.montant,
    pays: order.pays,
    adresse: order.adresse || null,
    type_investisseur: order.typeInvestisseur || null,
    origine_fonds: order.origineFonds || null,
    pep_status: order.pepStatus || "non",
    kyc_status: order.kycStatus || "En attente",
    payment_status: order.paymentStatus || "En attente",
    signature_date: parseSignatureDate(order.signatureDate),
    // Extended fields
    nom,
    prenom,
    date_naissance: order.dateNaissance || null,
    nationalite: order.nationalite || null,
    forme_juridique: order.formeJuridique || null,
    rcs: order.rcs || null,
    lei: order.lei || null,
    code_postal: order.codePostal || null,
    ville: order.ville || null,
    pep_detail: order.pepDetail || null,
    beneficiaire_nom: order.beneficiaireNom || null,
    beneficiaire_pct: order.beneficiairePct || null,
    payment_method: order.paymentMethod || "fiat",
    // Auth fields
    user_id: order.userId || null,
    intermediary_id: order.intermediaryId || null,
  };
}

function dbToDocument(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    size: row.size,
    date: row.doc_date,
    storagePath: row.storage_path,
  };
}

// ─── CRUD Operations ───

export async function fetchOrders() {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Fetch all documents in one query
  const orderIds = orders.map((o) => o.id);
  const { data: docs, error: docError } = await supabase
    .from("order_documents")
    .select("*")
    .in("order_id", orderIds);

  if (docError) throw docError;

  // Group docs by order
  const docsByOrder = {};
  for (const d of docs) {
    if (!docsByOrder[d.order_id]) docsByOrder[d.order_id] = [];
    docsByOrder[d.order_id].push(d);
  }

  return orders.map((o) => dbToOrder(o, docsByOrder[o.id] || []));
}

export async function createOrder(order) {
  const dbOrder = orderToDb(order);
  const { error } = await supabase.from("orders").insert(dbOrder);
  if (error) throw error;

  // Insert documents
  if (order.documents?.length) {
    const dbDocs = order.documents.map((d) => ({
      order_id: order.id,
      name: d.name,
      type: d.type,
      size: d.size || null,
      doc_date: d.date || null,
      storage_path: d.storagePath || null,
    }));
    const { error: docErr } = await supabase.from("order_documents").insert(dbDocs);
    if (docErr) throw docErr;
  }

  return order;
}

export async function validateOrder(orderId) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "validated", validated_at: now })
    .eq("id", orderId)
    .select()
    .single();
  if (error) throw error;
  if (!data) throw new Error("Aucun ordre trouvé avec cet ID");
  return { orderId, validatedAt: now };
}

export async function rejectOrder(orderId, reason) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "rejected", rejected_at: now, reject_reason: reason })
    .eq("id", orderId)
    .select()
    .single();
  if (error) throw error;
  if (!data) throw new Error("Aucun ordre trouvé avec cet ID");
  return { orderId, rejectedAt: now, reason };
}

export async function uploadDocument(orderId, file, docMeta) {
  // Upload file to Supabase Storage
  const path = `${orderId}/${Date.now()}_${file.name}`;
  const { error: uploadErr } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type });
  if (uploadErr) throw uploadErr;

  // Insert document record
  const { data, error } = await supabase
    .from("order_documents")
    .insert({
      order_id: orderId,
      name: docMeta.name || file.name,
      type: docMeta.type,
      size: docMeta.size || `${(file.size / 1024).toFixed(0)} Ko`,
      doc_date: docMeta.date || new Date().toISOString().split("T")[0],
      storage_path: path,
    })
    .select()
    .single();

  if (error) throw error;
  return dbToDocument(data);
}

export async function getDocumentUrl(storagePath) {
  if (!storagePath) return null;
  const { data } = supabase.storage
    .from("documents")
    .getPublicUrl(storagePath);
  return data?.publicUrl || null;
}

export async function getDocumentSignedUrl(storagePath) {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 3600); // 1h validity
  if (error) throw error;
  return data?.signedUrl || null;
}
