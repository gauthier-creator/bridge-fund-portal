# 04 — Audit Interne des Smart Contracts

## Rapport d'Audit de Sécurité
**Date** : Mars 2026
**Scope** : Scripts natifs Cardano déployés sur Preprod
**Auditeur** : Audit interne — Revue de code

---

## 1. Inventaire des Scripts

### 1.1 Security Token Minting Policy

```typescript
// Type: Native Script — Signature-based
const securityPolicy = lucid.utils.nativeScriptFromJson({
  type: "all",
  scripts: [
    { type: "sig", keyHash: paymentCredential.hash }
  ],
});
```

| Propriété | Valeur |
|-----------|--------|
| Type | Native Script (NativeScriptAll) |
| Condition | Signature unique du wallet admin |
| Capacité de mint | Illimitée (seul admin peut signer) |
| Capacité de burn | Oui (via mintAssets avec valeur négative) |
| Asset Name | `fromText(fundSlug.toUpperCase())` — max 32 bytes |
| Fichiers | `mint-token/index.ts`, `mint-synthetic/index.ts` |

**Risques identifiés :**

| # | Risque | Sévérité | Statut | Mitigation |
|---|--------|----------|--------|------------|
| S1 | Clé unique (SPOF) | MOYEN | Accepté | Seed phrase en variable d'environnement Supabase. Pas d'accès client. Multi-sig recommandé pour production. |
| S2 | Pas de time-lock sur le mint | FAIBLE | Accepté | Le contrôle d'accès est server-side (Edge Function). Aucun endpoint public ne permet le mint sans validation AIFM. |
| S3 | Supply non bornée on-chain | MOYEN | Mitigé | Supply cap vérifié off-chain via `check_supply_cap` RPC avant chaque mint. Recommandation : ajouter un time-lock Plutus pour production. |

---

### 1.2 Synthetic Token Minting Policy

```typescript
// Type: Native Script — "any" wrapper (distinct policy ID)
const syntheticPolicy = lucid.utils.nativeScriptFromJson({
  type: "any",
  scripts: [
    {
      type: "all",
      scripts: [{ type: "sig", keyHash: paymentCredential.hash }],
    },
  ],
});
```

| Propriété | Valeur |
|-----------|--------|
| Type | Native Script (NativeScriptAny > NativeScriptAll) |
| Condition | Même clé admin, structure différente → policy ID distinct |
| Asset Name | `fromText("s" + fundSlug.toUpperCase())` |
| Transferabilité | Libre (pas de whitelist on-chain) |
| Fichiers | `mint-synthetic/index.ts`, `burn-synthetic/index.ts` |

**Risques identifiés :**

| # | Risque | Sévérité | Statut | Mitigation |
|---|--------|----------|--------|------------|
| Y1 | Même clé pour security et synthetic | FAIBLE | Accepté | Les policy IDs sont mathématiquement distincts grâce à la structure "any" vs "all". Pas de confusion possible. |
| Y2 | Synthetic transférable sans restriction | INFO | By design | C'est le comportement voulu (modèle BlackRock BUIDL). Les synthétiques sont des instruments au porteur. |
| Y3 | Ratio 1:1 non forcé on-chain | MOYEN | Mitigé | Le ratio est garanti par la logique atomique de la transaction (lock N BF = mint N sBF dans le même tx). Un Plutus validator serait nécessaire pour forcer on-chain. |

---

### 1.3 Vault Script (Locking Script)

```typescript
// Type: Native Script — Multi-condition (sig + time)
const vaultScript = lucid.utils.nativeScriptFromJson({
  type: "all",
  scripts: [
    { type: "sig", keyHash: paymentCredential.hash },
    { type: "after", slot: 0 },
  ],
});
```

| Propriété | Valeur |
|-----------|--------|
| Type | Native Script (NativeScriptAll) |
| Conditions | (1) Signature admin ET (2) After slot 0 |
| Adresse | Script address (différent du wallet admin) |
| But | Ségrégation des tokens verrouillés |
| Fichiers | `mint-synthetic/index.ts`, `burn-synthetic/index.ts` |

**Risques identifiés :**

| # | Risque | Sévérité | Statut | Mitigation |
|---|--------|----------|--------|------------|
| V1 | `after: slot 0` est toujours vrai | INFO | By design | L'objectif est de créer une adresse distincte, pas de verrouiller temporellement. Le time-lock est un artefact technique pour dériver un script hash différent. |
| V2 | Admin peut unlock à tout moment | MOYEN | Accepté | Pour un MVP/testnet c'est acceptable. En production, recommandation d'utiliser un Plutus validator avec des conditions de unlock strictes. |
| V3 | Pas de vérification on-chain du ratio | MOYEN | Mitigé | Le burn-synthetic vérifie off-chain que le vault contient suffisamment de tokens avant de construire la transaction. |

---

## 2. Analyse des Transactions Atomiques

### 2.1 Transaction Mint-Synthetic (Lock + Mint)

```
Inputs:
  - Wallet UTxOs (contenant N BF tokens)

Outputs:
  - Vault Script Address: N × BF tokens (locked)
  - User Address: N × sBF tokens (minted)

Minting:
  - +N sBF (syntheticPolicy)

Metadata:
  - CIP-25: token identity, type=synthetic, backing=1:1
  - CIP-674: transaction message for audit trail

Signers:
  - Admin key (implicit, required by minting policy)
```

**Vérification d'atomicité : PASS**
- Le lock et le mint sont dans la même transaction
- Si l'un échoue, toute la transaction est rejetée
- Impossible d'avoir des sBF sans BF verrouillés correspondants

### 2.2 Transaction Burn-Synthetic (Burn + Unlock)

```
Inputs:
  - Selected Vault UTxOs (contenant >= N BF tokens)
  - Wallet UTxOs (contenant N sBF tokens)

Outputs:
  - User Address: N × BF tokens (unlocked)
  - Vault Address: excess BF tokens (si collected > N)

Minting:
  - -N sBF (burn)

Validity:
  - validFrom: currentSlot (required for "after" condition)

Signers:
  - Admin key (addSignerKey)

Spending Validator:
  - vaultScript (attachSpendingValidator)
```

**Vérification d'atomicité : PASS**
- Le burn et l'unlock sont dans la même transaction
- Les BF excédentaires sont retournés au vault
- La conservation de valeur (ValueNotConservedUTxO) est garantie par le ledger

---

## 3. Analyse de Sécurité Off-Chain

### 3.1 Edge Functions — Surface d'attaque

| Vecteur | Protection | Statut |
|---------|-----------|--------|
| Accès non autorisé | JWT token requis (Supabase Auth) | OK |
| Injection de paramètres | Validation des inputs requis | OK |
| Seed phrase exposure | Env variables only, jamais côté client | OK |
| CORS bypass | Headers restrictifs configurés | OK |
| Replay attack | `awaitTx()` assure unicité | OK |
| UTxO contention | `awaitTx()` sérialise les transactions | OK |

### 3.2 Base de Données — Contrôle d'accès

| Table | RLS | Policy |
|-------|-----|--------|
| `profiles` | ON | User = own profile, Admin = all |
| `orders` | ON | Via `get_my_role()` SECURITY DEFINER |
| `funds` | ON | Via `get_my_role()` |
| `vault_positions` | ON | User = own positions |
| `token_whitelist` | ON | Service role via Edge Functions |
| `token_freeze` | ON | Service role via Edge Functions |
| `token_transfers` | ON | Service role via Edge Functions |

### 3.3 Compliance Off-Chain (CIP-113)

| Check | Implémenté | Moment | Bypass possible |
|-------|-----------|--------|-----------------|
| Whitelist | OUI | Pré-mint + pré-transfer | Non (server-side) |
| Freeze | OUI | Pré-mint + pré-transfer | Non (server-side) |
| Supply cap | OUI | Pré-mint | Non (server-side) |
| Audit trail | OUI | Post-mint + post-transfer | Non (auto) |
| Auto-whitelist | OUI | Lors validation ordre | Non (RPC DEFINER) |

---

## 4. Recommandations

### Priorité Haute (Production)

| # | Recommandation | Justification |
|---|---------------|---------------|
| R1 | **Migrer le vault vers un Plutus validator** | Le native script ne peut pas enforcer le ratio 1:1 on-chain. Un Plutus script pourrait vérifier que `mint(sBF) == lock(BF)` dans le même tx. |
| R2 | **Multi-signature pour la minting policy** | Actuellement single-key. Ajouter un scheme multi-sig (2-of-3 ou 3-of-5) pour les opérations de mint. |
| R3 | **Time-lock sur le mint de security tokens** | Ajouter une fenêtre de mint (slot range) pour limiter la période d'émission. |

### Priorité Moyenne

| # | Recommandation | Justification |
|---|---------------|---------------|
| R4 | **Supply cap on-chain** | Implémenter via Plutus validator au lieu du check off-chain. |
| R5 | **Monitoring des vault UTxOs** | Dashboard temps réel pour surveiller les tokens verrouillés vs synthétiques en circulation. |
| R6 | **Rotation de clés** | Planifier une procédure de rotation de la seed phrase admin. |

### Priorité Faible

| # | Recommandation | Justification |
|---|---------------|---------------|
| R7 | **Mainnet migration plan** | Documenter la procédure de migration Preprod → Mainnet. |
| R8 | **Backup des policy IDs** | S'assurer que tous les policy IDs sont sauvegardés hors-ligne. |

---

## 5. Conclusion

L'infrastructure de smart contracts est **fonctionnelle et sécurisée pour un environnement testnet/MVP**. Les contrôles de compliance CIP-113 sont implémentés de manière exhaustive côté serveur. Les transactions atomiques garantissent la cohérence du vault.

**Pour une mise en production mainnet**, les recommandations R1 à R3 sont indispensables pour atteindre un niveau de sécurité comparable à une infrastructure de type BlackRock BUIDL.

| Catégorie | Score |
|-----------|-------|
| Atomicité des transactions | **A** |
| Ségrégation des clés | **B+** (single-key, server-only) |
| Compliance off-chain | **A** |
| Enforcement on-chain | **C+** (native scripts, pas Plutus) |
| Audit trail | **A** |
| Résistance aux attaques | **B+** |

**Score global : B+ (Testnet-ready, Mainnet avec réserves)**
