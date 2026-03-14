import { jsPDF } from "jspdf";
import { supabase } from "../lib/supabase";

const NAVY = [26, 35, 50];
const GOLD = [201, 168, 76];
const GRAY = [120, 120, 130];
const LIGHT_GRAY = [200, 200, 205];

/**
 * Generates a placeholder PDF document and returns a blob URL.
 * Used to simulate real document storage in the demo.
 */
export function generateDocumentPDF({ docType, docName, ownerName, orderRef, date }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Header bar
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 28, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 28, 210, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("Bridge Fund SCSp", 20, 14);
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text("Document justificatif — Dossier de souscription", 20, 22);

  // Document type badge
  doc.setFillColor(245, 245, 240);
  doc.roundedRect(20, 38, 170, 20, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text(docType, 30, 50);

  // Metadata
  let y = 72;
  const addRow = (label, value) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(label, 25, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(value || "—", 80, y);
    doc.setDrawColor(...LIGHT_GRAY);
    doc.setLineWidth(0.2);
    doc.line(25, y + 3, 185, y + 3);
    y += 10;
  };

  addRow("Fichier", docName);
  addRow("Titulaire", ownerName);
  addRow("Référence ordre", orderRef || "—");
  addRow("Date du document", date || new Date().toISOString().split("T")[0]);
  addRow("Statut", "Validé");

  // Content placeholder
  y += 8;
  doc.setFillColor(250, 249, 247);
  doc.roundedRect(20, y, 170, 60, 3, 3, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text("Ce document est un placeholder généré dans le cadre", 105, y + 18, { align: "center" });
  doc.text("de la démonstration Bridge Fund Portal.", 105, y + 26, { align: "center" });
  doc.text("En production, le fichier original serait stocké", 105, y + 38, { align: "center" });
  doc.text("de manière sécurisée et chiffrée (AES-256).", 105, y + 46, { align: "center" });

  // Compliance footer
  const footerY = 260;
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.3);
  doc.line(20, footerY, 190, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text("Bridge Fund SCSp — AIFM: Bridge Fund Management S.A. — CSSF n°A00XXX", 105, footerY + 5, { align: "center" });
  doc.text("Conforme AMLD5 / CSSF 12-02 / RGPD — Stockage sécurisé Luxembourg", 105, footerY + 9, { align: "center" });

  const blob = doc.output("blob");
  return blob;
}

/**
 * Upload a generated PDF to Supabase Storage and return the signed URL.
 * Falls back to a blob URL if Supabase is not configured.
 */
export async function uploadGeneratedPDF({ docType, docName, ownerName, orderRef, date }) {
  const blob = generateDocumentPDF({ docType, docName, ownerName, orderRef, date });

  if (!supabase) {
    return { url: URL.createObjectURL(blob), storagePath: null };
  }

  const path = `${orderRef || "misc"}/${Date.now()}_${docName}`;
  const { error } = await supabase.storage
    .from("documents")
    .upload(path, blob, { contentType: "application/pdf" });

  if (error) {
    console.error("Document upload failed:", error.message);
    return { url: URL.createObjectURL(blob), storagePath: null };
  }

  // Get a signed URL valid for 7 days
  const { data } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, 7 * 24 * 3600);

  return { url: data?.signedUrl || URL.createObjectURL(blob), storagePath: path };
}

/**
 * Generate blob URLs for an array of document metadata objects (local fallback).
 */
export function generateDocumentURLs(documents, ownerName, orderRef) {
  return documents.map((d) => ({
    ...d,
    url: URL.createObjectURL(generateDocumentPDF({
      docType: d.type,
      docName: d.name,
      ownerName,
      orderRef,
      date: d.date,
    })),
  }));
}

/**
 * Upload all documents for an order to Supabase Storage.
 * Returns enriched document array with storagePath and signed URLs.
 */
export async function uploadDocumentsToStorage(documents, ownerName, orderRef) {
  if (!supabase) return generateDocumentURLs(documents, ownerName, orderRef);

  return Promise.all(
    documents.map(async (d) => {
      const { url, storagePath } = await uploadGeneratedPDF({
        docType: d.type,
        docName: d.name,
        ownerName,
        orderRef,
        date: d.date,
      });
      return { ...d, url, storagePath };
    })
  );
}

/**
 * Get a fresh signed URL for a document stored in Supabase Storage.
 */
export async function getDocumentURL(storagePath) {
  if (!storagePath || !supabase) return null;
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 3600);
  if (error) return null;
  return data?.signedUrl || null;
}
