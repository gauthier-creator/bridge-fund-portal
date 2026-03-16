# 02 — Machines à États

## 1. Ordre de Souscription

```
                    ┌─────────────┐
                    │   CREATED   │
                    │  (Draft)    │
                    └──────┬──────┘
                           │ submitOrder()
                           ▼
                    ┌─────────────┐
              ┌─────│   PENDING   │─────┐
              │     │ (En attente)│     │
              │     └──────┬──────┘     │
              │            │            │
     rejectOrder()         │      validateOrder()
              │            │            │
              ▼            │            ▼
     ┌─────────────┐      │     ┌─────────────┐
     │  REJECTED   │      │     │ VALIDATING  │
     │  (Rejeté)   │      │     │ (En cours)  │
     └─────────────┘      │     └──────┬──────┘
                           │            │
                           │     ┌──────┴──────────────┐
                           │     │                     │
                           │     ▼                     ▼
                           │  ┌──────────┐     ┌────────────┐
                           │  │ WHITELIST│     │   MINT     │
                           │  │  CHECK   │────▶│  TOKENS    │
                           │  └──────────┘     └─────┬──────┘
                           │                         │
                           │                         ▼
                           │                  ┌─────────────┐
                           │                  │  VALIDATED  │
                           │                  │ (tx on-chain│
                           │                  │  confirmed) │
                           └──────────────────└─────────────┘
```

### Transitions

| De | Vers | Déclencheur | Actions |
|----|------|------------|---------|
| CREATED → PENDING | `submitOrder()` | Souscripteur soumet | Persist DB, upload docs |
| PENDING → VALIDATING | `validateOrder()` | AIFM approuve | RPC `validate_order` |
| VALIDATING → WHITELIST | auto | Validation OK | RPC `auto_whitelist_address` |
| WHITELIST → MINT | auto | Adresse whitelistée | Edge Function `mint-token` |
| MINT → VALIDATED | auto | Tx confirmée on-chain | `awaitTx(txHash)` |
| PENDING → REJECTED | `rejectOrder()` | AIFM refuse | Motif enregistré |

---

## 2. Token de Sécurité (Security Token — BF)

```
     ┌──────────────┐
     │  NON EXISTANT│
     └──────┬───────┘
            │ mint-token (CIP-113)
            ▼
     ┌──────────────┐           ┌──────────────┐
     │   MINTED     │──────────▶│ TRANSFERRED  │
     │  (Admin      │ transfer  │ (Investor or │
     │   wallet)    │  -token   │  Intermediary)│
     └──────┬───────┘           └──────┬───────┘
            │                          │
            │ mint-synthetic           │ mint-synthetic
            ▼                          ▼
     ┌──────────────┐
     │   LOCKED     │
     │  (In Vault   │
     │   Script)    │
     └──────┬───────┘
            │ burn-synthetic
            ▼
     ┌──────────────┐
     │  UNLOCKED    │
     │ (Returned to │
     │   owner)     │
     └──────────────┘
```

### Contraintes CIP-113

| Check | Moment | Rejet si |
|-------|--------|----------|
| **Whitelist** | Pré-mint, pré-transfer | Adresse non KYC |
| **Freeze** | Pré-mint, pré-transfer | Adresse gelée |
| **Supply Cap** | Pré-mint | Plafond d'émission dépassé |

---

## 3. Token Synthétique (sBF — Freely Transferable)

```
     ┌──────────────┐
     │  NON EXISTANT│
     └──────┬───────┘
            │ mint-synthetic
            │ (atomic: lock BF + mint sBF)
            ▼
     ┌──────────────┐
     │   ACTIVE     │◀─────────────────────┐
     │  (sBF held   │    P2P transfer      │
     │   by owner)  │────────────────────▶  │
     └──────┬───────┘  (no whitelist check) │
            │                               │
            │ burn-synthetic                │
            │ (atomic: burn sBF + unlock BF)│
            ▼                               │
     ┌──────────────┐                      │
     │   BURNED     │                      │
     │  (Destroyed) │                      │
     └──────────────┘                      │
                                           │
     Note: sBF tokens circulent librement  │
     sans vérification whitelist.          ─┘
     Seul le burn nécessite l'admin.
```

---

## 4. Vault Position

```
     ┌──────────────┐
     │   CREATED    │
     │ (DB record)  │
     └──────┬───────┘
            │ mint-synthetic tx confirmed
            ▼
     ┌──────────────┐
     │   LOCKED     │
     │              │
     │ security_    │
     │ token_count  │
     │ = N          │
     │              │
     │ synthetic_   │
     │ token_count  │
     │ = N          │
     │              │
     │ lock_tx_hash │
     │ = "abc..."   │
     └──────┬───────┘
            │ burn-synthetic tx confirmed
            ▼
     ┌──────────────┐
     │  UNLOCKED    │
     │              │
     │ unlock_tx_   │
     │ hash = "def" │
     │              │
     │ unlocked_at  │
     │ = timestamp  │
     └──────────────┘
```

---

## 5. Profil Utilisateur (KYC)

```
     ┌──────────────┐
     │   CREATED    │  (handle_new_user trigger)
     │  kyc: pending│
     └──────┬───────┘
            │ Documents uploaded + verified
            ▼
     ┌──────────────┐
     │  VALIDATED   │  (kyc_status = "validated")
     │              │
     │  Can:        │
     │  - Subscribe │
     │  - Auto-     │
     │    whitelist │
     └──────┬───────┘
            │ Compliance issue detected
            ▼
     ┌──────────────┐
     │   FROZEN     │  (token_freeze entry)
     │              │
     │  Cannot:     │
     │  - Receive   │
     │    tokens    │
     │  - Transfer  │
     └──────┬───────┘
            │ Issue resolved
            ▼
     ┌──────────────┐
     │  UNFROZEN    │  (token_freeze removed)
     │  (Validated) │
     └──────────────┘
```

---

## 6. Fonds (Fund Lifecycle)

```
     ┌──────────────┐
     │    DRAFT     │
     │              │
     │ Config only  │
     │ No policy ID │
     └──────┬───────┘
            │ createFund() → deployFundRegistry()
            ▼
     ┌──────────────┐
     │   ACTIVE     │
     │              │
     │ policy_id    │
     │ script_addr  │
     │ tx_hash      │
     │              │
     │ Accepts      │
     │ subscriptions│
     └──────┬───────┘
            │ Admin closes fund
            ▼
     ┌──────────────┐
     │   CLOSED     │
     │              │
     │ No new       │
     │ subscriptions│
     │              │
     │ Tokens still │
     │ exist on-    │
     │ chain        │
     └──────────────┘
```
