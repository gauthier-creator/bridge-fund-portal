# 03 — Workflows Opérationnels

## 1. Souscription Directe (Investisseur → AIFM → Blockchain)

```
  Investisseur          Frontend           Supabase           Edge Function        Cardano
       │                   │                  │                    │                  │
       │  Souscrire        │                  │                    │                  │
       ├──────────────────▶│                  │                    │                  │
       │                   │  createOrder()   │                    │                  │
       │                   ├─────────────────▶│                    │                  │
       │                   │                  │  INSERT orders     │                  │
       │                   │                  │  + order_documents │                  │
       │                   │  ◀───────────────┤                    │                  │
       │  ◀────────────────┤  "Pending"       │                    │                  │
       │                   │                  │                    │                  │
       │                   │                  │                    │                  │
  AIFM │  Valider ordre   │                  │                    │                  │
       ├──────────────────▶│                  │                    │                  │
       │                   │  validateOrder() │                    │                  │
       │                   ├─────────────────▶│                    │                  │
       │                   │                  │  RPC validate_order│                  │
       │                   │                  │  (SECURITY DEFINER)│                  │
       │                   │                  │                    │                  │
       │                   │                  │  RPC auto_whitelist│                  │
       │                   │                  │  _address          │                  │
       │                   │                  │                    │                  │
       │                   │  mintAndSendToken()                   │                  │
       │                   ├──────────────────────────────────────▶│                  │
       │                   │                  │                    │                  │
       │                   │                  │                    │  CIP-113 Checks: │
       │                   │                  │  check_whitelist ◀─┤                  │
       │                   │                  ├─────────────────▶  │                  │
       │                   │                  │  check_frozen    ◀─┤                  │
       │                   │                  ├─────────────────▶  │                  │
       │                   │                  │  check_supply_cap◀─┤                  │
       │                   │                  ├─────────────────▶  │                  │
       │                   │                  │                    │                  │
       │                   │                  │                    │  Build Tx:       │
       │                   │                  │                    │  - mintAssets()   │
       │                   │                  │                    │  - payToAddress() │
       │                   │                  │                    │  - CIP-25 meta   │
       │                   │                  │                    │  - CIP-674 msg   │
       │                   │                  │                    ├─────────────────▶│
       │                   │                  │                    │                  │
       │                   │                  │                    │  sign + submit   │
       │                   │                  │                    │◀─────────────────┤
       │                   │                  │                    │  awaitTx()       │
       │                   │                  │                    ├─────────────────▶│
       │                   │                  │                    │  ◀───────────────┤
       │                   │                  │                    │  Confirmed!      │
       │                   │                  │                    │                  │
       │                   │                  │  record_mint     ◀─┤                  │
       │                   │                  ├─────────────────▶  │                  │
       │                   │                  │                    │                  │
       │                   │  ◀────────────────────────────────────┤                  │
       │  ◀────────────────┤  txHash + explorerUrl                │                  │
       │                   │                  │                    │                  │
```

---

## 2. Souscription Intermédiée (Custody Model)

```
  Investisseur    Intermédiaire     Frontend        Supabase        Edge Fn       Cardano
       │               │              │                │               │              │
       │  Demande sub  │              │                │               │              │
       ├──────────────▶│              │                │               │              │
       │               │  Submit      │                │               │              │
       │               ├─────────────▶│                │               │              │
       │               │              │  createOrder() │               │              │
       │               │              │  intermediary_ │               │              │
       │               │              │  id = inter.id │               │              │
       │               │              ├───────────────▶│               │              │
       │               │              │                │               │              │
       │               │              │                │               │              │
  AIFM validates      │              │                │               │              │
       │               │              │                │               │              │
       │               │              │  Target: inter │               │              │
       │               │              │  wallet (not   │               │              │
       │               │              │  investor)     │               │              │
       │               │              ├───────────────▶│               │              │
       │               │              │                │  mint-token   │              │
       │               │              │                ├──────────────▶│              │
       │               │              │                │               ├─────────────▶│
       │               │              │                │               │  Token → Inter│
       │               │              │                │               │  wallet      │
       │               │              │                │               │◀─────────────┤
       │               │              │                │               │              │
       │               │              │                │               │              │
       │  Demande      │              │                │               │              │
       │  transfert    │              │                │               │              │
       ├──────────────▶│              │                │               │              │
       │               │  Transfer    │                │               │              │
       │               ├─────────────▶│                │               │              │
       │               │              │  transferToken()               │              │
       │               │              ├───────────────────────────────▶│              │
       │               │              │                │               │  CIP-113     │
       │               │              │                │  whitelist  ◀─┤  checks      │
       │               │              │                ├─────────────▶ │              │
       │               │              │                │               ├─────────────▶│
       │               │              │                │               │  Token →     │
       │               │              │                │               │  Investor    │
       │               │              │                │               │  wallet      │
       │  Token reçu   │              │                │               │◀─────────────┤
       │◀──────────────┼──────────────┼────────────────┼───────────────┤              │
```

---

## 3. Synthetic Token Vault (Lock & Mint)

```
  Utilisateur        Frontend          Edge Function        Cardano           Supabase
       │                │                    │                  │                 │
       │  Lock N BF     │                    │                  │                 │
       │  Get N sBF     │                    │                  │                 │
       ├───────────────▶│                    │                  │                 │
       │                │  mintSynthetic()   │                  │                 │
       │                ├───────────────────▶│                  │                 │
       │                │                    │                  │                 │
       │                │                    │  ATOMIC TX:      │                 │
       │                │                    │                  │                 │
       │                │                    │  1. payToContract │                 │
       │                │                    │     (vault addr, │                 │
       │                │                    │      N BF tokens)│                 │
       │                │                    │                  │                 │
       │                │                    │  2. mintAssets    │                 │
       │                │                    │     (N sBF)      │                 │
       │                │                    │                  │                 │
       │                │                    │  3. payToAddress  │                 │
       │                │                    │     (user, N sBF)│                 │
       │                │                    │                  │                 │
       │                │                    │  4. CIP-25 meta  │                 │
       │                │                    │     (synthetic,  │                 │
       │                │                    │      1:1 backing)│                 │
       │                │                    │                  │                 │
       │                │                    ├─────────────────▶│                 │
       │                │                    │  sign + submit   │                 │
       │                │                    │◀─────────────────┤                 │
       │                │                    │  awaitTx()       │                 │
       │                │                    │                  │                 │
       │                │                    │  INSERT vault_   │                 │
       │                │                    │  positions       │                 │
       │                │                    ├────────────────────────────────────▶│
       │                │                    │                  │                 │
       │                │  ◀─────────────────┤                  │                 │
       │  ◀─────────────┤  txHash + vault    │                  │                 │
       │  N sBF reçus   │                    │                  │                 │
```

**État on-chain après Lock:**
```
┌─────────────────────┐     ┌─────────────────────┐
│   Vault Script      │     │   User Wallet       │
│   Address           │     │                     │
│                     │     │                     │
│   N × BF tokens     │     │   N × sBF tokens    │
│   (locked)          │     │   (freely transfer- │
│                     │     │    able)             │
│   Spendable by:     │     │                     │
│   admin key +       │     │   No whitelist      │
│   after slot 0      │     │   required for P2P  │
└─────────────────────┘     └─────────────────────┘
```

---

## 4. Synthetic Token Burn (Unlock & Redeem)

```
  Utilisateur        Frontend          Edge Function        Cardano           Supabase
       │                │                    │                  │                 │
       │  Burn N sBF    │                    │                  │                 │
       │  Get N BF back │                    │                  │                 │
       ├───────────────▶│                    │                  │                 │
       │                │  burnSynthetic()   │                  │                 │
       │                ├───────────────────▶│                  │                 │
       │                │                    │                  │                 │
       │                │                    │  Check vault     │                 │
       │                │                    │  has N BF locked │                 │
       │                │                    ├─────────────────▶│                 │
       │                │                    │  ◀───────────────┤                 │
       │                │                    │                  │                 │
       │                │                    │  Check wallet    │                 │
       │                │                    │  has N sBF       │                 │
       │                │                    │                  │                 │
       │                │                    │  ATOMIC TX:      │                 │
       │                │                    │                  │                 │
       │                │                    │  1. collectFrom  │                 │
       │                │                    │     (vault UTxOs)│                 │
       │                │                    │                  │                 │
       │                │                    │  2. mintAssets   │                 │
       │                │                    │     (-N sBF)    │                 │
       │                │                    │     [BURN]      │                 │
       │                │                    │                  │                 │
       │                │                    │  3. payToAddress │                 │
       │                │                    │     (user, N BF)│                 │
       │                │                    │                  │                 │
       │                │                    │  4. Return excess│                 │
       │                │                    │     to vault     │                 │
       │                │                    │                  │                 │
       │                │                    ├─────────────────▶│                 │
       │                │                    │  sign + submit   │                 │
       │                │                    │◀─────────────────┤                 │
       │                │                    │                  │                 │
       │                │                    │  UPDATE vault_   │                 │
       │                │                    │  positions       │                 │
       │                │                    │  status=unlocked │                 │
       │                │                    ├────────────────────────────────────▶│
       │                │  ◀─────────────────┤                  │                 │
       │  ◀─────────────┤  txHash            │                  │                 │
       │  N BF received │                    │                  │                 │
```

---

## 5. Création de Fonds (Admin → Blockchain)

```
  Admin             Frontend          fundService        Edge Function        Cardano
    │                  │                  │                    │                  │
    │  Create Fund     │                  │                    │                  │
    │  (name, config)  │                  │                    │                  │
    ├─────────────────▶│                  │                    │                  │
    │                  │  createFund()    │                    │                  │
    │                  ├─────────────────▶│                    │                  │
    │                  │                  │  deployFundRegistry│                  │
    │                  │                  ├───────────────────▶│                  │
    │                  │                  │                    │  Mint 1 NFT     │
    │                  │                  │                    │  (CIP-25 meta)  │
    │                  │                  │                    ├─────────────────▶│
    │                  │                  │                    │  ◀───────────────┤
    │                  │                  │  ◀─────────────────┤                  │
    │                  │                  │  policyId, txHash  │                  │
    │                  │                  │                    │                  │
    │                  │                  │  INSERT funds      │                  │
    │                  │                  │  (with policy_id,  │                  │
    │                  │                  │   tx_hash, etc.)   │                  │
    │                  │  ◀───────────────┤                    │                  │
    │  ◀───────────────┤  Fund created    │                    │                  │
    │  + Cardanoscan   │                  │                    │                  │
    │    link          │                  │                    │                  │
```

---

## 6. Workflow KYC & Auto-Whitelist

```
  Investisseur        Frontend          Supabase           token_whitelist
       │                │                  │                      │
       │  Souscription  │                  │                      │
       │  + KYC docs    │                  │                      │
       ├───────────────▶│                  │                      │
       │                │  createOrder()   │                      │
       │                ├─────────────────▶│                      │
       │                │                  │  KYC simulated       │
       │                │                  │  → kyc_status =      │
       │                │                  │    "validated"        │
       │                │                  │                      │
       │                │                  │                      │
  [AIFM validates]     │                  │                      │
       │                │                  │                      │
       │                │  validateOrder() │                      │
       │                ├─────────────────▶│                      │
       │                │                  │                      │
       │                │                  │  RPC auto_whitelist  │
       │                │                  │  _address()          │
       │                │                  ├─────────────────────▶│
       │                │                  │                      │  UPSERT
       │                │                  │                      │  fund_id +
       │                │                  │                      │  wallet_address
       │                │                  │                      │  kyc = validated
       │                │                  │  ◀─────────────────  │
       │                │                  │                      │
       │                │                  │  Proceed to mint     │
       │                │                  │  (whitelist check    │
       │                │                  │   will now pass)     │
```
