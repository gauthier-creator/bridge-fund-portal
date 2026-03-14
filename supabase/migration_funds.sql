-- ============================================================
-- Migration: Multi-fund support with Cardano registry
-- Replaces single fund_config with a funds table
-- ============================================================

-- 1. Create funds table
CREATE TABLE IF NOT EXISTS public.funds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),

  -- General info
  fund_name TEXT NOT NULL,
  fund_subtitle TEXT,
  description TEXT,
  strategy TEXT,
  investment_thesis TEXT,
  hero_image_url TEXT,

  -- Key metrics
  target_return TEXT,
  minimum_investment NUMERIC DEFAULT 125000,
  fund_size NUMERIC DEFAULT 0,
  nav_per_share NUMERIC DEFAULT 1000,
  currency TEXT DEFAULT 'EUR',

  -- Structure
  jurisdiction TEXT DEFAULT 'Luxembourg',
  legal_form TEXT DEFAULT 'SCSp',
  aifm TEXT,
  custodian TEXT,
  auditor TEXT,
  administrator TEXT,
  regulatory_status TEXT DEFAULT 'CSSF regulated',

  -- Share classes (JSON array)
  share_classes JSONB DEFAULT '[
    {"id":1,"name":"Classe 1","targetReturn":"7-9%","duration":"36 mois","risk":"5/7"},
    {"id":2,"name":"Classe 2","targetReturn":"5-6%","duration":"24 mois","risk":"4/7"}
  ]'::jsonb,

  -- Highlights (JSON array of strings)
  highlights JSONB DEFAULT '[]'::jsonb,

  -- Cardano blockchain
  cardano_policy_id TEXT,
  cardano_script_address TEXT,
  cardano_tx_hash TEXT,
  blockchain_network TEXT DEFAULT 'mainnet',

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add fund_id to orders table (link orders to specific funds)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'fund_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN fund_id UUID REFERENCES public.funds(id);
  END IF;
END $$;

-- 3. Add fund_id to collateral_positions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'collateral_positions' AND column_name = 'fund_id'
  ) THEN
    ALTER TABLE public.collateral_positions ADD COLUMN fund_id UUID REFERENCES public.funds(id);
  END IF;
END $$;

-- 4. RLS policies
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;

-- Everyone can read active funds
CREATE POLICY "Public can read active funds"
  ON public.funds FOR SELECT
  USING (status = 'active');

-- Admin can read all funds (including draft)
CREATE POLICY "Admin can read all funds"
  ON public.funds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can create funds
CREATE POLICY "Admin can insert funds"
  ON public.funds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can update funds
CREATE POLICY "Admin can update funds"
  ON public.funds FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can delete funds
CREATE POLICY "Admin can delete funds"
  ON public.funds FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Insert default Bridge Fund (migrate from fund_config if it exists)
INSERT INTO public.funds (
  slug, status, fund_name, fund_subtitle, description, strategy, investment_thesis,
  target_return, minimum_investment, fund_size, nav_per_share,
  jurisdiction, legal_form, aifm, custodian, auditor, administrator, regulatory_status,
  highlights, share_classes
) VALUES (
  'bridge-fund',
  'active',
  'Bridge Fund SCSp',
  'Fonds de dette privée tokenisé sur Cardano',
  'Bridge Fund est un fonds d''investissement alternatif spécialisé dans la dette privée, structuré sous forme de SCSp luxembourgeoise et tokenisé sur la blockchain Cardano.',
  'Notre stratégie repose sur l''origination directe de prêts garantis à des PME européennes, avec un focus sur des maturités courtes (12-36 mois) et des garanties réelles.',
  'Dans un environnement de taux élevés, la dette privée offre un rendement attractif avec une volatilité maîtrisée.',
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
  'CSSF regulated',
  '["Rendement cible 8-12% net annuel","Tokenisé sur blockchain Cardano","Liquidité améliorée via marché secondaire","Transparence totale du portefeuille","Distributions trimestrielles automatisées","Régulé CSSF Luxembourg"]'::jsonb,
  '[{"id":1,"name":"Classe 1","targetReturn":"7-9%","duration":"36 mois","risk":"5/7"},{"id":2,"name":"Classe 2","targetReturn":"5-6%","duration":"24 mois","risk":"4/7"}]'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- 6. Create index for performance
CREATE INDEX IF NOT EXISTS idx_funds_status ON public.funds(status);
CREATE INDEX IF NOT EXISTS idx_funds_slug ON public.funds(slug);
CREATE INDEX IF NOT EXISTS idx_orders_fund_id ON public.orders(fund_id);
