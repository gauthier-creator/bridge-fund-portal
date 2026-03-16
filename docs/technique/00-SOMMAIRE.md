# Bridge Fund Portal — Dossier Technique

## Infrastructure de Tokenisation de Parts de Fonds

**Entité** : Bridge Fund SCSp — SLP Luxembourg
**Réseau blockchain** : Cardano Preprod Testnet
**Standards** : CIP-25, CIP-113, CIP-674
**Framework réglementaire** : AMLD5 / CSSF / MiFID2 / AIFMD
**Date** : Mars 2026

---

## Sommaire

| # | Document | Description |
|---|----------|-------------|
| 01 | [Architecture Technique](./01-architecture.md) | Vue d'ensemble, stack, composants, schéma d'architecture |
| 02 | [Machines à états](./02-state-machines.md) | Diagrammes d'état : ordres, tokens, vault, KYC |
| 03 | [Workflows Opérationnels](./03-workflows.md) | Flux de souscription, mint, transfer, synthetic vault |
| 04 | [Audit Interne Smart Contracts](./04-smart-contract-audit.md) | Analyse de sécurité des scripts Cardano natifs |
| 05 | [Compliance CIP-113](./05-cip113-compliance.md) | Rapport de conformité tokens programmables |
| 06 | [Modèle de Données](./06-data-model.md) | Schéma base de données, tables, RPC, RLS |

---

## Stack Technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Frontend | React + Vite | 19 / 7 |
| Styling | Tailwind CSS | v4 |
| Backend | Supabase (PostgreSQL + Edge Functions) | v2 |
| Blockchain | Cardano (Lucid) | Preprod / v0.10.10 |
| API Blockchain | Blockfrost | v0 |
| Authentification | Supabase Auth | v2 |
| Stockage | Supabase Storage | v2 |

---

## Contacts

| Rôle | Contact |
|------|---------|
| Lead Technique | Gauthier Alexandrian |
| Infrastructure | Supabase Cloud |
| Blockchain | Cardano Preprod via Blockfrost |
