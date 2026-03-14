-- ============================================================
-- Bridge Fund Portal — Fund Config Migration
-- Run this in Supabase SQL Editor
-- ============================================================

create table if not exists fund_config (
  id text primary key default 'default',
  fund_name text not null default 'Bridge Fund SCSp',
  fund_subtitle text default 'Fonds de dette tokenisé · Cardano',
  description text,
  strategy text,
  investment_thesis text,
  target_return text,
  minimum_investment numeric,
  fund_size numeric,
  nav_per_share numeric default 1043.27,
  currency text default 'EUR',
  share_classes text,
  jurisdiction text default 'Luxembourg',
  legal_form text default 'SCSp (Société en Commandite Spéciale)',
  aifm text,
  custodian text,
  auditor text,
  administrator text,
  regulatory_status text default 'CSSF regulated',
  highlights text,
  logo_url text,
  hero_image_url text,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

alter table fund_config enable row level security;
create policy "Anyone can read fund_config" on fund_config for select using (true);
create policy "Admin can modify fund_config" on fund_config for all using (true) with check (true);

-- Insert default row with demo data
insert into fund_config (
  id, fund_name, fund_subtitle, description, strategy, investment_thesis,
  target_return, minimum_investment, fund_size, nav_per_share,
  jurisdiction, legal_form, aifm, custodian, auditor, administrator,
  highlights
) values (
  'default',
  'Bridge Fund SCSp',
  'Fonds de dette privée tokenisé sur Cardano',
  'Bridge Fund est un fonds d''investissement alternatif spécialisé dans la dette privée, structuré sous forme de SCSp luxembourgeoise et tokenisé sur la blockchain Cardano. Le fonds offre aux investisseurs qualifiés un accès à des opportunités de financement à haut rendement avec une liquidité améliorée grâce à la tokenisation.',
  'Notre stratégie repose sur l''origination directe de prêts garantis à des PME européennes, avec un focus sur des maturités courtes (12-36 mois) et des garanties réelles. La tokenisation sur Cardano permet une transparence totale du portefeuille et une gestion automatisée des distributions via smart contracts.',
  'Dans un environnement de taux élevés, la dette privée offre un rendement attractif avec une volatilité maîtrisée. Bridge Fund combine l''expertise du crédit structuré avec l''innovation blockchain pour créer un véhicule d''investissement moderne et efficient.',
  '8-12% net',
  125000,
  50000000,
  1043.27,
  'Luxembourg',
  'SCSp (Société en Commandite Spéciale)',
  'Bridge Capital Management',
  'Banque de Luxembourg',
  'PricewaterhouseCoopers',
  'Apex Fund Services',
  '["Rendement cible 8-12% net annuel","Tokenisé sur blockchain Cardano","Liquidité améliorée via marché secondaire","Transparence totale du portefeuille","Distributions trimestrielles automatisées","Régulé CSSF Luxembourg"]'
) on conflict (id) do nothing;

-- Public storage bucket for fund assets
insert into storage.buckets (id, name, public)
values ('fund-assets', 'fund-assets', true)
on conflict (id) do nothing;

create policy "Public read fund-assets" on storage.objects
  for select using (bucket_id = 'fund-assets');
create policy "Auth upload fund-assets" on storage.objects
  for insert with check (bucket_id = 'fund-assets' and auth.role() = 'authenticated');
