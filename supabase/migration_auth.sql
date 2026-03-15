-- ============================================================
-- Bridge Fund Portal — Auth & Roles Migration
-- Run this in Supabase SQL Editor AFTER the initial schema.sql
-- ============================================================

-- 1. Profiles table (linked to Supabase Auth)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'investor'
    check (role in ('investor', 'intermediary', 'aifm', 'admin')),
  company text,
  intermediary_id uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'investor')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 3. Add user_id columns to existing tables
alter table orders add column if not exists user_id uuid references profiles(id);
alter table orders add column if not exists intermediary_id uuid references profiles(id);
alter table collateral_positions add column if not exists user_id uuid references profiles(id);
alter table collateral_positions add column if not exists managed_by uuid references profiles(id);

-- 4. Helper function to get current user's role
create or replace function get_my_role()
returns text as $$
  select role from profiles where id = auth.uid()
$$ language sql stable security definer;

-- 5. RLS on profiles
alter table profiles enable row level security;

-- Drop old permissive policies
drop policy if exists "Allow all on orders" on orders;
drop policy if exists "Allow all on order_documents" on order_documents;
drop policy if exists "Allow all on collateral_positions" on collateral_positions;
drop policy if exists "Allow all on documents bucket" on storage.objects;

-- Profiles: users can read their own, intermediaries can read their clients, admin/aifm can read all
create policy "profiles_select" on profiles for select using (
  id = auth.uid()
  or get_my_role() in ('admin', 'aifm')
  or (get_my_role() = 'intermediary' and intermediary_id = auth.uid())
);

create policy "profiles_update_own" on profiles for update using (
  id = auth.uid()
) with check (id = auth.uid());

-- Intermediary can update their clients' profiles (KYC, wallet, etc.)
-- USING allows targeting profiles where intermediary_id is already set OR null (first assignment)
-- WITH CHECK ensures they can only set intermediary_id to their own uid
create policy "profiles_intermediary_update" on profiles for update using (
  get_my_role() = 'intermediary'
  and (intermediary_id = auth.uid() or intermediary_id is null)
) with check (
  get_my_role() = 'intermediary'
  and intermediary_id = auth.uid()
);

create policy "profiles_admin_all" on profiles for all using (
  get_my_role() = 'admin'
) with check (get_my_role() = 'admin');

-- 6. RLS on orders
-- Investors see their own orders
create policy "orders_investor_select" on orders for select using (
  user_id = auth.uid()
  or get_my_role() in ('admin', 'aifm')
  or (get_my_role() = 'intermediary' and intermediary_id = auth.uid())
);

create policy "orders_insert" on orders for insert with check (
  user_id = auth.uid()
  or (get_my_role() = 'intermediary' and intermediary_id = auth.uid())
  or get_my_role() = 'admin'
);

create policy "orders_aifm_update" on orders for update using (
  get_my_role() in ('aifm', 'admin')
);

create policy "orders_admin_delete" on orders for delete using (
  get_my_role() = 'admin'
);

-- 7. RLS on order_documents (follows parent order access)
create policy "docs_select" on order_documents for select using (
  exists (
    select 1 from orders o where o.id = order_id
    and (
      o.user_id = auth.uid()
      or get_my_role() in ('admin', 'aifm')
      or (get_my_role() = 'intermediary' and o.intermediary_id = auth.uid())
    )
  )
);

create policy "docs_insert" on order_documents for insert with check (
  exists (
    select 1 from orders o where o.id = order_id
    and (
      o.user_id = auth.uid()
      or (get_my_role() = 'intermediary' and o.intermediary_id = auth.uid())
      or get_my_role() = 'admin'
    )
  )
);

-- 8. RLS on collateral_positions
create policy "collateral_select" on collateral_positions for select using (
  user_id = auth.uid()
  or get_my_role() in ('admin', 'aifm')
  or (get_my_role() = 'intermediary' and managed_by = auth.uid())
);

create policy "collateral_insert" on collateral_positions for insert with check (
  user_id = auth.uid()
  or (get_my_role() = 'intermediary' and managed_by = auth.uid())
  or get_my_role() = 'admin'
);

create policy "collateral_delete" on collateral_positions for delete using (
  user_id = auth.uid()
  or (get_my_role() = 'intermediary' and managed_by = auth.uid())
  or get_my_role() = 'admin'
);

-- 9. Storage policies
create policy "storage_auth_select" on storage.objects for select using (
  bucket_id = 'documents' and auth.role() = 'authenticated'
);

create policy "storage_auth_insert" on storage.objects for insert with check (
  bucket_id = 'documents' and auth.role() = 'authenticated'
);

-- 10. Index for faster lookups
create index if not exists idx_profiles_intermediary on profiles(intermediary_id);
create index if not exists idx_orders_user on orders(user_id);
create index if not exists idx_orders_intermediary on orders(intermediary_id);
create index if not exists idx_collateral_user on collateral_positions(user_id);
