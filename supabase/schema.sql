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
  -- Extended subscriber fields
  nom text,
  prenom text,
  date_naissance text,
  nationalite text,
  forme_juridique text,
  rcs text,
  lei text,
  code_postal text,
  ville text,
  pep_detail text,
  beneficiaire_nom text,
  beneficiaire_pct text,
  payment_method text default 'fiat',
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

-- 6. No seed data — tables start empty in production
