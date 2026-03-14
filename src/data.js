export const LPs = [
  { id: 1, nom: "Dupont", prenom: "Jean-Marc", societe: "Dupont Patrimoine SAS", pays: "France", type: "Personne morale", shareClass: 1, montant: 500000, dateSouscription: "2025-03-15", kycStatus: "Validé", paiementStatus: "Reçu", parts: 479.26, pctFonds: 4.17, wallet: "addr1qx8nz70...4f7sk3y2" },
  { id: 2, nom: "Lefèvre", prenom: "Catherine", societe: null, pays: "France", type: "Personne physique", shareClass: 2, montant: 250000, dateSouscription: "2025-04-02", kycStatus: "Validé", paiementStatus: "Reçu", parts: 239.63, pctFonds: 2.08, wallet: "addr1qy2mr98...8d3fn7x1" },
  { id: 3, nom: "Van den Berg", prenom: "Pieter", societe: "VDB Family Office", pays: "Pays-Bas", type: "Personne morale", shareClass: 1, montant: 2000000, dateSouscription: "2025-04-20", kycStatus: "Validé", paiementStatus: "Reçu", parts: 1917.03, pctFonds: 16.67, wallet: "addr1qz5kp42...9e2wl5m8" },
  { id: 4, nom: "Moreau", prenom: "Isabelle", societe: "Moreau & Associés", pays: "Luxembourg", type: "Personne morale", shareClass: 1, montant: 750000, dateSouscription: "2025-05-10", kycStatus: "Validé", paiementStatus: "Reçu", parts: 718.89, pctFonds: 6.25, wallet: "addr1qa7dj63...2k8rt4p5" },
  { id: 5, nom: "Bernard", prenom: "François", societe: null, pays: "Belgique", type: "Personne physique", shareClass: 2, montant: 150000, dateSouscription: "2025-06-01", kycStatus: "Validé", paiementStatus: "Reçu", parts: 143.78, pctFonds: 1.25, wallet: "addr1qb3ne81...7m5gx2w9" },
  { id: 6, nom: "Schneider", prenom: "Hans", societe: "Schneider Wealth AG", pays: "Suisse", type: "Personne morale", shareClass: 1, montant: 1500000, dateSouscription: "2025-07-15", kycStatus: "Validé", paiementStatus: "Reçu", parts: 1437.77, pctFonds: 12.50, wallet: "addr1qc9wf27...3n6hp8k4" },
  { id: 7, nom: "Petit", prenom: "Marie", societe: "Petit Gestion Privée", pays: "France", type: "Personne morale", shareClass: 2, montant: 300000, dateSouscription: "2025-08-22", kycStatus: "Validé", paiementStatus: "Reçu", parts: 287.56, pctFonds: 2.50, wallet: "addr1qd1lm94...6j2bs5r7" },
  { id: 8, nom: "Laurent", prenom: "Philippe", societe: null, pays: "France", type: "Personne physique", shareClass: 1, montant: 1000000, dateSouscription: "2025-09-05", kycStatus: "Validé", paiementStatus: "Reçu", parts: 958.52, pctFonds: 8.33, wallet: "addr1qe4rg58...1f9ct3v6" },
  { id: 9, nom: "Fontaine", prenom: "Élise", societe: "Fontaine Capital", pays: "France", type: "Personne morale", shareClass: 1, montant: 800000, dateSouscription: "2025-10-12", kycStatus: "En attente", paiementStatus: "En attente", parts: 0, pctFonds: 0, wallet: null },
  { id: 10, nom: "De Groot", prenom: "Willem", societe: "De Groot Investments BV", pays: "Pays-Bas", type: "Personne morale", shareClass: 2, montant: 600000, dateSouscription: "2025-11-01", kycStatus: "Validé", paiementStatus: "Reçu", parts: 575.12, pctFonds: 5.00, wallet: "addr1qf6sh71...4g7du9w2" },
  { id: 11, nom: "Martin", prenom: "Olivier", societe: null, pays: "France", type: "Personne physique", shareClass: 2, montant: 100000, dateSouscription: "2025-12-15", kycStatus: "En attente", paiementStatus: "En attente", parts: 0, pctFonds: 0, wallet: null },
  { id: 12, nom: "Richter", prenom: "Anna", societe: "Richter Vermögen GmbH", pays: "Allemagne", type: "Personne morale", shareClass: 1, montant: 1200000, dateSouscription: "2026-01-10", kycStatus: "Validé", paiementStatus: "Reçu", parts: 1150.22, pctFonds: 10.00, wallet: "addr1qg8tj93...5h8ev1x3" },
];

export const NAV_PER_PART = 1043.27;
export const TOTAL_AUM = 12150000;

export const capitalCalls = [
  { id: 1, date: "2025-03-01", montant: 3500000, statut: "Reçu", description: "Appel initial — Tranche 1" },
  { id: 2, date: "2025-06-15", montant: 2800000, statut: "Reçu", description: "Appel complémentaire — Tranche 2" },
  { id: 3, date: "2025-10-01", montant: 3200000, statut: "Reçu", description: "Appel — Tranche 3" },
  { id: 4, date: "2026-01-15", montant: 2650000, statut: "Envoyé", description: "Appel — Tranche 4" },
  { id: 5, date: "2026-03-01", montant: 1500000, statut: "En retard", description: "Appel — Tranche 5 (partiel)" },
];

export const custodyClients = [
  { id: 1, nom: "Dupont Patrimoine SAS", tokens: 479, nav: 499578, dateEmission: "2025-03-18", statut: "Actif", wallet: "addr1qx8nz70l4kf...4f7sk3y2s9", mouvements: [
    { type: "Émission", date: "2025-03-18", tokens: 479, hash: "tx_5a8f3c2d1e...7b4k9m2n1p" },
  ]},
  { id: 2, nom: "Catherine Lefèvre", tokens: 240, nav: 250385, dateEmission: "2025-04-05", statut: "Actif", wallet: "addr1qy2mr98h7dp...8d3fn7x1k4", mouvements: [
    { type: "Émission", date: "2025-04-05", tokens: 240, hash: "tx_7c2e5f8a3b...9d1l4n6p2r" },
  ]},
  { id: 3, nom: "VDB Family Office", tokens: 1917, nav: 1999947, dateEmission: "2025-04-23", statut: "Actif", wallet: "addr1qz5kp42m9fr...9e2wl5m8j7", mouvements: [
    { type: "Émission", date: "2025-04-23", tokens: 1000, hash: "tx_3d7g2j5k8l...1f4n7p9r3t" },
    { type: "Émission", date: "2025-05-15", tokens: 917, hash: "tx_8e1h3k6l9m...2g5o8q1s4u" },
  ]},
  { id: 4, nom: "Moreau & Associés", tokens: 719, nav: 750111, dateEmission: "2025-05-13", statut: "Actif", wallet: "addr1qa7dj63n2gs...2k8rt4p5l6", mouvements: [
    { type: "Émission", date: "2025-05-13", tokens: 719, hash: "tx_4f8i1l4m7n...3h6p9r2t5v" },
  ]},
  { id: 5, nom: "François Bernard", tokens: 144, nav: 150231, dateEmission: "2025-06-04", statut: "Actif", wallet: "addr1qb3ne81p4ht...7m5gx2w9n8", mouvements: [
    { type: "Émission", date: "2025-06-04", tokens: 144, hash: "tx_9g2j5m8n1o...4i7q1s3u6w" },
  ]},
  { id: 6, nom: "Schneider Wealth AG", tokens: 1438, nav: 1500222, dateEmission: "2025-07-18", statut: "Actif", wallet: "addr1qc9wf27q5iu...3n6hp8k4m9", mouvements: [
    { type: "Émission", date: "2025-07-18", tokens: 800, hash: "tx_1h3k6n9o2p...5j8r2t4v7x" },
    { type: "Transfert", date: "2025-08-01", tokens: 638, hash: "tx_2i4l7o1p3q...6k9s3u5w8y" },
  ]},
  { id: 7, nom: "Petit Gestion Privée", tokens: 288, nav: 300462, dateEmission: "2025-08-25", statut: "En transfert", wallet: "addr1qd1lm94r6jv...6j2bs5r7o1", mouvements: [
    { type: "Émission", date: "2025-08-25", tokens: 288, hash: "tx_3j5m8p2q4r...7l1t4v6x9z" },
    { type: "Transfert", date: "2026-02-10", tokens: -50, hash: "tx_6m8p1s3u5w...1o3v6x8z2b" },
  ]},
  { id: 8, nom: "Philippe Laurent", tokens: 959, nav: 1000496, dateEmission: "2025-09-08", statut: "Actif", wallet: "addr1qe4rg58s7kw...1f9ct3v6p2", mouvements: [
    { type: "Émission", date: "2025-09-08", tokens: 959, hash: "tx_4k6n9q3r5s...8m2u5w7y1a" },
  ]},
];

export const priceHistory = Array.from({ length: 30 }, (_, i) => ({
  jour: i + 1,
  prix: +(2.12 + Math.sin(i * 0.3) * 0.08 + i * 0.012 + Math.random() * 0.04).toFixed(3),
}));

export const defiHistory = [
  { date: "2026-02-15", type: "Stake", montant: "200 BF", hash: "tx_a1b2c3d4..." },
  { date: "2026-02-20", type: "Swap", montant: "50 BF → 118.5 ADA", hash: "tx_e5f6g7h8..." },
  { date: "2026-03-01", type: "Unstake", montant: "100 BF", hash: "tx_i9j1k2l3..." },
  { date: "2026-03-05", type: "Swap", montant: "30 BF → 73.2 ADA", hash: "tx_m4n5o6p7..." },
  { date: "2026-03-10", type: "Stake", montant: "150 BF", hash: "tx_q8r9s1t2..." },
];

export const swisslifeClients = [
  { id: 1, nom: "Arnaud Petit", type: "Personne physique", montant: 350000, shareClass: 2, kycStatus: "Validé", souscriptionDate: "2025-09-10", tokens: 335, wallet: "addr1qh2kf54...8r3gw5n7" },
  { id: 2, nom: "SCI Bellevue", type: "Personne morale", montant: 1200000, shareClass: 1, kycStatus: "Validé", souscriptionDate: "2025-10-05", tokens: 1150, wallet: "addr1qi4lg76...9s4hx6o8" },
  { id: 3, nom: "Marie-Claire Duval", type: "Personne physique", montant: 200000, shareClass: 2, kycStatus: "En attente", souscriptionDate: "2026-01-18", tokens: 0, wallet: null },
  { id: 4, nom: "Groupe Helvétique SA", type: "Personne morale", montant: 2500000, shareClass: 1, kycStatus: "Validé", souscriptionDate: "2025-07-22", tokens: 2396, wallet: "addr1qj5mh87...1t5iy7p9" },
  { id: 5, nom: "Pierre Lemoine", type: "Personne physique", montant: 150000, shareClass: 2, kycStatus: "Validé", souscriptionDate: "2025-11-30", tokens: 144, wallet: "addr1qk6ni98...2u6jz8q1" },
];
