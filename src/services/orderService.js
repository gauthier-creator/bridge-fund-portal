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
    documents: docs.map(dbToDocument),
  };
}

function orderToDb(order) {
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
    signature_date: order.signatureDate || null,
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
  const { error } = await supabase
    .from("orders")
    .update({ status: "validated", validated_at: now })
    .eq("id", orderId);
  if (error) throw error;
  return { orderId, validatedAt: now };
}

export async function rejectOrder(orderId, reason) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("orders")
    .update({ status: "rejected", rejected_at: now, reject_reason: reason })
    .eq("id", orderId);
  if (error) throw error;
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
