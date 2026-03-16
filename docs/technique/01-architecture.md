# 01 — Architecture Technique

## 1. Vue d'ensemble

Bridge Fund Portal est une plateforme de tokenisation de parts de fonds d'investissement alternatif (FIA) sur la blockchain Cardano, conforme aux standards européens (AMLD5, MiFID2, AIFMD) et au standard Cardano CIP-113 (Programmable Tokens).

## 2. Schéma d'Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + Vite 7)                │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Portail  │  │   Portail    │  │ Portail  │  │   Portail     │  │
│  │   LP     │  │ Intermédiaire│  │  AIFM    │  │    Admin      │  │
│  │(Investor)│  │  (Custody)   │  │(Validate)│  │  (Configure)  │  │
│  └────┬─────┘  └──────┬───────┘  └────┬─────┘  └───────┬───────┘  │
│       │               │               │                │           │
│  ┌────┴───────────────┴───────────────┴────────────────┴────────┐  │
│  │              Services Layer (cardano / order / fund / profile) │  │
│  └──────────────────────────┬────────────────────────────────────┘  │
└─────────────────────────────┼──────────────────────────────────────┘
                              │ HTTPS (JWT)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SUPABASE CLOUD                                  │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   Auth (GoTrue)  │  │   PostgreSQL     │  │   Storage        │  │
│  │                  │  │                  │  │                  │  │
│  │ - JWT tokens     │  │ - profiles       │  │ - documents      │  │
│  │ - Session mgmt   │  │ - funds          │  │ - fund-assets    │  │
│  │ - Role check     │  │ - orders         │  │                  │  │
│  │                  │  │ - vault_positions │  │                  │  │
│  │                  │  │ - token_whitelist │  │                  │  │
│  │                  │  │ - token_freeze   │  │                  │  │
│  │                  │  │ - token_transfers│  │                  │  │
│  └──────────────────┘  └────────┬─────────┘  └──────────────────┘  │
│                                 │                                   │
│  ┌──────────────────────────────┴──────────────────────────────┐   │
│  │              Edge Functions (Deno Runtime)                   │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │   │
│  │  │ deploy-fund- │  │  mint-token   │  │ transfer-token   │  │   │
│  │  │  registry    │  │  (CIP-113)   │  │  (CIP-113)       │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │   │
│  │  │ mint-        │  │ burn-        │  │ generate-wallet  │  │   │
│  │  │ synthetic    │  │ synthetic    │  │                  │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
└─────────────────────────────┼──────────────────────────────────────┘
                              │ Blockfrost API
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  CARDANO BLOCKCHAIN (Preprod Testnet)                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Native Scripts                             │   │
│  │                                                              │   │
│  │  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │   │
│  │  │ Security Token │  │  Synthetic   │  │   Vault Script  │ │   │
│  │  │    Policy      │  │ Token Policy │  │  (Time-locked)  │ │   │
│  │  │                │  │              │  │                 │ │   │
│  │  │ type: "all"    │  │ type: "any"  │  │ type: "all"     │ │   │
│  │  │ sig: adminKey  │  │ sig: adminKey│  │ sig: adminKey   │ │   │
│  │  │                │  │              │  │ after: slot 0   │ │   │
│  │  │ Asset: BF-FUND │  │ Asset: sBF   │  │                 │ │   │
│  │  │ Restricted     │  │ Transferable │  │ Holds: BF tokens│ │   │
│  │  └────────────────┘  └──────────────┘  └─────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  UTxO Model · Metadata: CIP-25 + CIP-674 · Compliance: CIP-113    │
└─────────────────────────────────────────────────────────────────────┘
```

## 3. Composants Détaillés

### 3.1 Frontend — Portails Role-Based

| Portail | Rôle | Fonctionnalités clés |
|---------|------|---------------------|
| **PortailLP** | Investisseur | Catalogue fonds, souscription, KYC, dashboard, profil, signature |
| **PortailSwissLife** | Intermédiaire | Gestion clients, custody wallet, synthetic vault, transferts on-chain |
| **PortailAIFM** | Asset Manager | Validation ordres, registre LPs, mint tokens CIP-113, compliance |
| **PortailAdmin** | Administrateur | Création fonds, déploiement Cardano, gestion utilisateurs, configuration |

### 3.2 Services Layer

```
cardanoService.js ──→ Edge Functions ──→ Cardano (Blockfrost)
orderService.js   ──→ Supabase RPC    ──→ PostgreSQL
fundService.js    ──→ Supabase CRUD   ──→ PostgreSQL + Cardano
profileService.js ──→ Supabase Auth   ──→ profiles + wallets
```

### 3.3 Edge Functions (Deno Runtime)

| Fonction | Entrée | Sortie | CIP-113 |
|----------|--------|--------|---------|
| `deploy-fund-registry` | fundName, fundSlug | policyId, txHash | — |
| `generate-wallet` | userId | address | — |
| `mint-token` | investorAddress, fundSlug, montant, navPerShare | txHash, tokenCount | Whitelist + Freeze + Supply Cap |
| `transfer-token` | toAddress, fundSlug, tokenCount | txHash | Whitelist + Freeze |
| `mint-synthetic` | userAddress, fundSlug, tokenCount | txHash, vaultAddress | — |
| `burn-synthetic` | userAddress, fundSlug, tokenCount, vaultPositionId | txHash | — |

### 3.4 Sécurité

```
┌─────────────────────────────────────────────┐
│            Modèle de Sécurité               │
│                                             │
│  Auth:     Supabase GoTrue (JWT)            │
│  RLS:      Row Level Security (PostgreSQL)  │
│  RPC:      SECURITY DEFINER functions       │
│  Keys:     Seed phrase en env (Edge only)   │
│  Wallet:   Admin wallet server-side only    │
│  Storage:  Auth-gated document buckets      │
│  CORS:     Restrictive headers              │
└─────────────────────────────────────────────┘
```

- Les clés privées Cardano (seed phrase) ne sont **jamais** exposées côté client
- Toutes les transactions sont signées server-side via Edge Functions
- Les RPC `SECURITY DEFINER` contournent le RLS de manière contrôlée
- La fonction `get_my_role()` est utilisée dans toutes les policies RLS
