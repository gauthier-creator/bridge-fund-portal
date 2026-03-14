-- ============================================================
-- Bridge Fund Portal — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- 1. Orders (Souscriptions)
create table if not exists orders (
  id text primary key,
  type text not null check (type in ('direct', 'intermediated')),
  status text not null default 'pending' check (status in ('pending', 'validated', 'rejected')),
  intermediaire text,
  lp_name text not null,
  societe text,
  person_type text not null check (person_type in ('physique', 'morale')),
  share_class integer not null check (share_class in (1, 2)),
  montant numeric not null,
  pays text not null,
  adresse text,
  type_investisseur text,
  origine_fonds text,
  pep_status text default 'non',
  kyc_status text default 'En attente',
  payment_status text default 'En attente',
  signature_date timestamptz,
  validated_at timestamptz,
  rejected_at timestamptz,
  reject_reason text,
  created_at timestamptz default now()
);

-- 2. Order Documents
create table if not exists order_documents (
  id bigint generated always as identity primary key,
  order_id text not null references orders(id) on delete cascade,
  name text not null,
  type text not null,
  size text,
  doc_date text,
  storage_path text, -- path in Supabase Storage bucket
  created_at timestamptz default now()
);

-- 3. Collateral Positions
create table if not exists collateral_positions (
  id bigint generated always as identity primary key,
  owner text not null,
  tokens numeric not null,
  type text not null check (type in ('Staking', 'Collatéral', 'Lending')),
  pool text not null,
  apy numeric not null,
  position_date text,
  created_at timestamptz default now()
);

-- 4. Storage bucket for documents
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- 5. Row Level Security (RLS) — disabled for now (demo/production sans auth)
-- In production with auth, you'd enable RLS and add policies per role
alter table orders enable row level security;
alter table order_documents enable row level security;
alter table collateral_positions enable row level security;

-- Allow all operations for anon key (demo mode)
create policy "Allow all on orders" on orders for all using (true) with check (true);
create policy "Allow all on order_documents" on order_documents for all using (true) with check (true);
create policy "Allow all on collateral_positions" on collateral_positions for all using (true) with check (true);

-- Storage policy — allow uploads/reads for anon
create policy "Allow all on documents bucket" on storage.objects
  for all using (bucket_id = 'documents') with check (bucket_id = 'documents');

-- 6. Seed data — 3 initial orders
insert into orders (id, type, status, lp_name, societe, person_type, share_class, montant, pays, adresse, type_investisseur, origine_fonds, pep_status, kyc_status, payment_status, signature_date, created_at)
values
  ('BF-2026-0001', 'direct', 'pending', 'Fontaine Élise', 'Fontaine Capital', 'morale', 1, 800000, 'France', '15 rue de la Paix, 75002 Paris', 'Professionnel', 'Cession d''actifs financiers / entreprise', 'non', 'Validé', 'Reçu', '2025-10-12 14:22:00+01', '2025-10-12'),
  ('BF-2026-0002', 'intermediated', 'pending', 'Martin Olivier', null, 'physique', 2, 100000, 'France', '8 boulevard Haussmann, 75009 Paris', 'Averti (well-informed)', 'Épargne accumulée', 'non', 'Validé', 'Reçu', '2025-12-15 09:45:00+01', '2025-12-15'),
  ('BF-2026-0003', 'intermediated', 'pending', 'Weber Thomas', 'Weber Holding AG', 'morale', 1, 500000, 'Suisse', 'Bahnhofstrasse 42, 8001 Zürich', 'Professionnel', 'Revenus d''activité professionnelle', 'non', 'Validé', 'Reçu', '2026-01-20 11:10:00+01', '2026-01-20')
on conflict (id) do nothing;

-- Seed documents for initial orders
insert into order_documents (order_id, name, type, size, doc_date) values
  ('BF-2026-0001', 'kbis_fontaine_capital.pdf', 'K-bis', '1.8 Mo', '2025-10-10'),
  ('BF-2026-0001', 'passeport_fontaine.pdf', 'Pièce d''identité', '2.3 Mo', '2025-10-10'),
  ('BF-2026-0001', 'attestation_fonds_fontaine.pdf', 'Justificatif origine des fonds', '890 Ko', '2025-10-11'),
  ('BF-2026-0002', 'cni_martin_olivier.pdf', 'Pièce d''identité', '1.5 Mo', '2025-12-14'),
  ('BF-2026-0002', 'justificatif_domicile_martin.pdf', 'Justificatif de domicile', '720 Ko', '2025-12-14'),
  ('BF-2026-0002', 'avis_imposition_martin.pdf', 'Justificatif origine des fonds', '1.1 Mo', '2025-12-14'),
  ('BF-2026-0003', 'handelsregister_weber.pdf', 'Registre de commerce', '2.1 Mo', '2026-01-18'),
  ('BF-2026-0003', 'passeport_weber.pdf', 'Pièce d''identité', '1.9 Mo', '2026-01-18'),
  ('BF-2026-0003', 'statuts_weber_holding.pdf', 'Statuts société', '3.2 Mo', '2026-01-19'),
  ('BF-2026-0003', 'ubo_declaration_weber.pdf', 'Déclaration UBO', '540 Ko', '2026-01-19');

-- Seed collateral positions
insert into collateral_positions (owner, tokens, type, pool, apy, position_date) values
  ('Dupont Patrimoine SAS', 200, 'Staking', 'BF/ADA', 8.2, '2026-02-15'),
  ('VDB Family Office', 500, 'Staking', 'BF/ADA', 8.2, '2026-02-20'),
  ('Schneider Wealth AG', 300, 'Staking', 'BF/ADA', 8.2, '2026-03-01'),
  ('Catherine Lefèvre', 100, 'Collatéral', 'Lending', 5.5, '2026-03-05');
