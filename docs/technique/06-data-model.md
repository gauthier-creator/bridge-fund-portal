# 06 — Modèle de Données

## 1. Schéma Entité-Relation

```
┌────────────────────┐       ┌────────────────────┐
│     profiles       │       │      funds         │
│────────────────────│       │────────────────────│
│ id (PK, uuid)      │       │ id (PK, uuid)      │
│ email              │       │ slug (unique)       │
│ full_name          │       │ fund_name           │
│ role               │◀──┐   │ status              │
│ company            │   │   │ nav_per_share       │
│ wallet_address     │   │   │ cardano_policy_id   │
│ kyc_status         │   │   │ cardano_script_addr │
│ intermediary_id ───┼───┘   │ cardano_tx_hash     │
│ investor_type      │       │ blockchain_network  │
│ phone, address...  │       │ share_classes (JSON) │
│ created_at         │       │ created_by ─────────┼──▶ profiles.id
└────────┬───────────┘       └──────┬─────────────┘
         │                          │
         │                          │
         ▼                          ▼
┌────────────────────┐       ┌────────────────────┐
│     orders         │       │  order_documents   │
│────────────────────│       │────────────────────│
│ id (PK, text)      │       │ id (PK, bigint)    │
│ fund_id ───────────┼──▶    │ order_id ──────────┼──▶ orders.id
│ user_id ───────────┼──▶    │ name               │
│ intermediary_id ───┼──▶    │ type               │
│ type (direct/inter)│       │ size               │
│ status             │       │ storage_path       │
│ lp_name            │       │ doc_date           │
│ montant            │       └────────────────────┘
│ share_class        │
│ payment_method     │
│ kyc_status         │
│ validated_at       │
│ rejected_at        │
│ reject_reason      │
│ created_at         │
└────────────────────┘


┌────────────────────┐       ┌────────────────────┐
│  vault_positions   │       │  token_transfers   │
│────────────────────│       │────────────────────│
│ id (PK, uuid)      │       │ id (PK, uuid)      │
│ fund_id ───────────┼──▶    │ fund_id ───────────┼──▶ funds.id
│ user_id ───────────┼──▶    │ from_address       │
│ wallet_address     │       │ to_address         │
│ security_token_cnt │       │ token_count        │
│ security_policy_id │       │ transfer_type      │
│ security_asset_name│       │  (mint/transfer/   │
│ synthetic_token_cnt│       │   vault_lock/      │
│ synthetic_policy_id│       │   vault_unlock)    │
│ synthetic_asset_nm │       │ tx_hash            │
│ vault_address      │       │ policy_id          │
│ lock_tx_hash       │       │ asset_name         │
│ unlock_tx_hash     │       │ created_at         │
│ status (locked/    │       └────────────────────┘
│   unlocked)        │
│ locked_at          │
│ unlocked_at        │
└────────────────────┘


┌────────────────────┐       ┌────────────────────┐
│  token_whitelist   │       │   token_freeze     │
│────────────────────│       │────────────────────│
│ fund_id ───────────┼──▶    │ fund_id ───────────┼──▶ funds.id
│ wallet_address     │       │ wallet_address     │
│ profile_id ────────┼──▶    │ reason             │
│ kyc_status         │       │ frozen_by ─────────┼──▶ profiles.id
│ created_at         │       │ created_at         │
│                    │       │                    │
│ UNIQUE(fund_id,    │       │ UNIQUE(fund_id,    │
│   wallet_address)  │       │   wallet_address)  │
└────────────────────┘       └────────────────────┘
```

---

## 2. Tables Détaillées

### 2.1 profiles

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | Identifiant unique |
| email | text | NOT NULL, UNIQUE | Email de connexion |
| full_name | text | | Nom complet |
| role | text | DEFAULT 'investor' | investor/intermediary/aifm/admin |
| company | text | | Société |
| wallet_address | text | | Adresse Cardano |
| kyc_status | text | DEFAULT 'pending' | pending/validated/rejected |
| intermediary_id | uuid | FK → profiles(id) | Rattachement intermédiaire |
| investor_type | text | | Professionnel/Averti/Institutionnel |
| phone | text | | Téléphone |
| address | text | | Adresse postale |
| city | text | | Ville |
| postal_code | text | | Code postal |
| country | text | DEFAULT 'France' | Pays |
| nationality | text | | Nationalité |
| date_of_birth | text | | Date de naissance |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | | |

### 2.2 funds

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK | |
| slug | text | UNIQUE, NOT NULL | URL-friendly identifier |
| status | text | DEFAULT 'active' | draft/active/closed |
| fund_name | text | NOT NULL | Nom du fonds |
| fund_subtitle | text | | Sous-titre |
| description | text | | Description longue |
| strategy | text | | Stratégie d'investissement |
| investment_thesis | text | | Thèse d'investissement |
| hero_image_url | text | | Image de couverture |
| target_return | text | | Rendement cible (ex: "8-12%") |
| minimum_investment | numeric | DEFAULT 0 | Ticket minimum en EUR |
| fund_size | numeric | DEFAULT 0 | Taille du fonds |
| nav_per_share | numeric | DEFAULT 0 | NAV par part |
| currency | text | DEFAULT 'EUR' | Devise |
| jurisdiction | text | | Luxembourg, etc. |
| legal_form | text | | SCSp, SICAV, etc. |
| aifm | text | | Gestionnaire |
| custodian | text | | Dépositaire |
| auditor | text | | Auditeur |
| administrator | text | | Administrateur |
| regulatory_status | text | | Statut CSSF |
| share_classes | jsonb | DEFAULT '[]' | Classes de parts |
| highlights | jsonb | DEFAULT '[]' | Points clés |
| cardano_policy_id | text | | Policy ID on-chain |
| cardano_script_address | text | | Script address |
| cardano_tx_hash | text | | Transaction de déploiement |
| blockchain_network | text | | preprod/mainnet |
| created_by | uuid | FK → profiles(id) | Créateur |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | | |

### 2.3 orders

| Colonne | Type | Description |
|---------|------|-------------|
| id | text | PK (BF-2026-XXXX format) |
| fund_id | uuid | FK → funds(id) |
| user_id | uuid | FK → profiles(id) — souscripteur |
| intermediary_id | uuid | FK → profiles(id) — intermédiaire |
| type | text | direct / intermediated |
| status | text | pending / validated / rejected |
| lp_name | text | Nom du LP |
| person_type | text | physique / morale |
| montant | numeric | Montant en EUR |
| share_class | integer | 1 ou 2 |
| payment_method | text | fiat / crypto |
| payment_status | text | Statut du paiement |
| kyc_status | text | Statut KYC |
| validated_at | timestamptz | Date de validation |
| rejected_at | timestamptz | Date de rejet |
| reject_reason | text | Motif de rejet |
| signature_date | text | Date de signature |
| ... | | (40+ colonnes KYC/compliance) |

---

## 3. RPC Functions (SECURITY DEFINER)

| Fonction | Paramètres | Retour | Usage |
|----------|-----------|--------|-------|
| `get_my_role()` | — | text | RLS policies |
| `validate_order(order_id)` | text | record | AIFM → order validation |
| `check_whitelist(p_fund_id, p_address)` | uuid, text | boolean | CIP-113 pré-mint |
| `check_frozen(p_fund_id, p_address)` | uuid, text | boolean | CIP-113 pré-mint |
| `check_supply_cap(p_fund_id, p_amount)` | uuid, integer | jsonb | CIP-113 pré-mint |
| `record_mint(...)` | 7 params | void | Post-mint audit |
| `auto_whitelist_address(...)` | 3 params | void | Auto-whitelist KYC'd |
| `list_my_clients()` | — | setof profiles | Intermédiaire |
| `link_client_to_intermediary(...)` | 12 params | record | Rattachement client |
| `handle_new_user()` | — (trigger) | trigger | Auto-create profile |

---

## 4. Row Level Security (RLS)

### Politique générale

```sql
-- Modèle basé sur get_my_role()
CREATE POLICY "investors_read_own"
  ON orders FOR SELECT
  USING (user_id = auth.uid() OR get_my_role() IN ('aifm', 'admin'));

CREATE POLICY "aifm_update_orders"
  ON orders FOR UPDATE
  USING (get_my_role() IN ('aifm', 'admin'));
```

### Matrice d'accès

| Table | Investor | Intermédiaire | AIFM | Admin |
|-------|----------|--------------|------|-------|
| profiles | Own | Own + clients | All (read) | All |
| orders | Own | Own clients | All | All |
| funds | Active (read) | Active (read) | All | All (CRUD) |
| vault_positions | Own | Own clients | All (read) | All |
| token_whitelist | — | — | — | Via Edge Fn |
| token_freeze | — | — | — | Via Edge Fn |
| token_transfers | — | — | — | Via Edge Fn |

---

## 5. Storage Buckets

| Bucket | Accès | Contenu |
|--------|-------|---------|
| `documents` | Private (auth-only) | Documents KYC, bulletins de souscription |
| `fund-assets` | Public (read), Auth (write) | Images fonds, logos, documents marketing |
