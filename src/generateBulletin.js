import { jsPDF } from "jspdf";

const NAVY = [26, 35, 50];
const GOLD = [201, 168, 76];
const GRAY = [120, 120, 130];
const LIGHT_GRAY = [200, 200, 205];
const BLACK = [30, 30, 30];
const WHITE = [255, 255, 255];

function drawLine(doc, y, x1 = 25, x2 = 185) {
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.3);
  doc.line(x1, y, x2, y);
}

function row(doc, y, label, value, opts = {}) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(label, 28, y);
  doc.setFont("helvetica", opts.bold ? "bold" : "normal");
  doc.setTextColor(...(opts.gold ? GOLD : BLACK));
  doc.text(value, 182, y, { align: "right" });
  drawLine(doc, y + 3);
  return y + 9;
}

export function generateBulletinPDF({ formData, subRef, personType, signatureDataUrl }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("fr-FR");
  const fmtEur = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  // ── Header band ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 38, "F");

  doc.setFillColor(...GOLD);
  doc.roundedRect(18, 10, 18, 18, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text("BF", 27, 22, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...WHITE);
  doc.text("Bulletin de Souscription", 44, 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(180, 190, 210);
  doc.text("Bridge Fund SCSp — Special Limited Partnership · Luxembourg", 44, 24);
  doc.text(`Ref: ${subRef}  ·  ${dateStr}`, 44, 30);

  // ── Confidentialité ──
  let y = 46;
  doc.setFillColor(245, 243, 240);
  doc.roundedRect(18, y - 4, pageW - 36, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...GOLD);
  doc.text("CONFIDENTIEL", 23, y + 2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text("Ce document est strictement confidentiel et destiné uniquement au souscripteur identifié ci-dessous.", 50, y + 2);

  // ── Section 1: Informations du souscripteur ──
  y = 66;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("1. IDENTIFICATION DU SOUSCRIPTEUR", 25, y);
  drawLine(doc, y + 2);
  y += 10;

  const nom = (formData.prenom + " " + formData.nom).trim() || "—";
  y = row(doc, y, "Nom complet", nom, { bold: true });
  if (personType === "morale" && formData.societe) {
    y = row(doc, y, "Dénomination sociale", formData.societe);
    y = row(doc, y, "Forme juridique", formData.formeJuridique || "—");
    if (formData.rcs) y = row(doc, y, "N° RCS", formData.rcs);
    if (formData.lei) y = row(doc, y, "Code LEI", formData.lei);
  }
  if (formData.dateNaissance) y = row(doc, y, "Date de naissance", formData.dateNaissance);
  y = row(doc, y, "Nationalité / Pays", formData.nationalite || formData.pays);
  const adresse = [formData.adresse, formData.codePostal, formData.ville].filter(Boolean).join(", ");
  if (adresse) y = row(doc, y, "Adresse", adresse);
  y = row(doc, y, "Classification investisseur", formData.typeInvestisseur);
  y = row(doc, y, "Statut PEP", formData.pepStatus === "non" ? "Non" : "Oui — " + (formData.pepDetail || "à préciser"));
  if (formData.origineFonds) y = row(doc, y, "Origine des fonds", formData.origineFonds);

  // ── Section 2: Termes de la souscription ──
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("2. TERMES DE LA SOUSCRIPTION", 25, y);
  drawLine(doc, y + 2);
  y += 10;

  y = row(doc, y, "Fonds", "Bridge Fund SCSp — SLP", { bold: true });
  y = row(doc, y, "AIFM", "Bridge Fund Management S.à r.l.");
  y = row(doc, y, "Dépositaire / Custodian", "SwissLife Banque Privée");
  y = row(doc, y, "Share Class", "Classe " + formData.shareClass, { bold: true });
  y = row(doc, y, "Montant souscrit", fmtEur(formData.montant), { bold: true, gold: true });
  y = row(doc, y, "Rendement cible", (formData.shareClass === 1 ? "7 – 9%" : "5 – 6%") + " net annuel");
  y = row(doc, y, "Durée", formData.shareClass === 1 ? "36 mois" : "24 mois");
  y = row(doc, y, "Période de lock-up", formData.shareClass === 1 ? "12 mois" : "6 mois");
  y = row(doc, y, "Frais de gestion", "1,50% par an");
  y = row(doc, y, "Commission de performance", "15% au-delà du hurdle rate (5%)");
  y = row(doc, y, "Juridiction / Régulateur", "Luxembourg · CSSF");
  y = row(doc, y, "Tokenisation", "Cardano · CIP-68 · registre on-chain");
  y = row(doc, y, "Mode de paiement", formData.paymentMethod === "fiat" ? "Virement SEPA (EUR)" : "Crypto (ADA — Cardano)");

  // ── Page 2: Avertissements + Signature ──
  doc.addPage();
  y = 20;

  // Section 3: Avertissements
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("3. AVERTISSEMENTS RÉGLEMENTAIRES", 25, y);
  drawLine(doc, y + 2);
  y += 8;

  doc.setFillColor(255, 245, 245);
  doc.setDrawColor(230, 200, 200);
  doc.roundedRect(25, y, pageW - 50, 48, 2, 2, "FD");
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 50, 50);

  const warnings = [
    "L'investissement dans le Bridge Fund SCSp comporte un risque de perte en capital partielle ou totale. Les performances passées ne préjugent pas des performances futures.",
    "Ce fonds est un FIA réservé aux investisseurs avertis/professionnels au sens de la loi luxembourgeoise du 13 février 2007. Il ne fait l'objet d'aucune garantie de capital ni de rendement.",
    "La liquidité des parts est limitée. Le rachat est soumis à des conditions restrictives et à une période de lock-up. La tokenisation ne garantit pas la liquidité des parts sur un marché secondaire.",
    "Le souscripteur déclare avoir été informé des implications fiscales dans sa juridiction de résidence. Les informations seront communiquées aux autorités fiscales conformément aux accords CRS et FATCA.",
  ];
  warnings.forEach((w) => {
    const lines = doc.splitTextToSize("• " + w, pageW - 60);
    doc.text(lines, 29, y);
    y += lines.length * 3.5 + 1.5;
  });

  // Section 4: Déclarations
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("4. DÉCLARATIONS DU SOUSCRIPTEUR", 25, y);
  drawLine(doc, y + 2);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BLACK);

  const declarations = [
    "J'ai lu et compris le prospectus complet du Bridge Fund SCSp, y compris les sections relatives aux risques et à la politique d'investissement.",
    "J'ai pris connaissance du Document d'Informations Clés (DIC/KID) conformément au règlement PRIIPs (UE) 1286/2014.",
    "Je reconnais que cet investissement comporte un risque de perte en capital et que le rendement cible n'est pas garanti.",
    "Je comprends la nature illiquide de cet investissement, la période de lock-up applicable, et les conditions restrictives de rachat anticipé.",
    "Je reconnais avoir été informé(e) des implications fiscales et que le fonds procèdera aux déclarations CRS/FATCA requises.",
    "J'autorise le traitement de mes données personnelles conformément au RGPD (UE) 2016/679.",
  ];
  declarations.forEach((d) => {
    const lines = doc.splitTextToSize("[X]  " + d, pageW - 56);
    doc.text(lines, 28, y);
    y += lines.length * 3.5 + 2;
  });

  // Section 5: Signature
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("5. SIGNATURE ÉLECTRONIQUE", 25, y);
  drawLine(doc, y + 2);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(`Fait à Luxembourg, le ${dateStr} à ${timeStr}`, 28, y);
  y += 6;
  doc.text("Signature du souscripteur :", 28, y);
  y += 4;

  // Signature box
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.5);
  doc.roundedRect(28, y, 80, 32, 2, 2, "D");

  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, "PNG", 30, y + 1, 76, 30);
    } catch (_) {
      // fallback if image fails
    }
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...LIGHT_GRAY);
    doc.text("Espace réservé à la signature", 68, y + 18, { align: "center" });
  }

  // eIDAS stamp
  y += 36;
  if (signatureDataUrl) {
    doc.setFillColor(240, 250, 245);
    doc.setDrawColor(160, 210, 180);
    doc.roundedRect(28, y, 154, 14, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(30, 120, 70);
    doc.text("SIGNATURE ÉLECTRONIQUE QUALIFIÉE — eIDAS (UE) 910/2014", 32, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(60, 140, 90);
    doc.text(`Horodatage : ${dateStr} ${timeStr}  ·  Ref: ${subRef}  ·  Signataire : ${nom}`, 32, y + 10);
  }

  // Footer
  const footerY = 280;
  drawLine(doc, footerY, 18, pageW - 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...GRAY);
  doc.text("Bridge Fund SCSp · 2 rue Edward Steichen, L-2540 Luxembourg · RCS Luxembourg B 123456 · CSSF Regulated", pageW / 2, footerY + 4, { align: "center" });
  doc.text("Ce document est généré électroniquement et ne nécessite pas de signature manuscrite supplémentaire.", pageW / 2, footerY + 8, { align: "center" });

  // footer page 1 too
  doc.setPage(1);
  drawLine(doc, footerY, 18, pageW - 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...GRAY);
  doc.text("Bridge Fund SCSp · 2 rue Edward Steichen, L-2540 Luxembourg · RCS Luxembourg B 123456 · CSSF Regulated", pageW / 2, footerY + 4, { align: "center" });
  doc.text("Page 1/2", pageW / 2, footerY + 8, { align: "center" });

  doc.setPage(2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...GRAY);
  doc.text("Page 2/2", pageW / 2, footerY + 8, { align: "center" });

  return doc;
}
