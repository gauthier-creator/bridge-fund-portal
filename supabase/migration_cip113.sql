-- ============================================================
-- Migration: CIP-113 Compliance Infrastructure
-- Tables: token_whitelist, token_freeze, vault_positions, token_transfers
-- RPCs: validate_order, auto_whitelist_address, check_whitelist, check_frozen, check_supply_cap
-- ============================================================

-- 1. token_whitelist — KYC-gated address whitelist per fund
CREATE TABLE IF NOT EXISTS public.token_whitelist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_id UUID NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  profile_id UUID REFERENCES public.profiles(id),
  kyc_status TEXT DEFAULT 'validated' CHECK (kyc_status IN ('En attente', 'validated', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fund_id, wallet_address)
);

ALTER TABLE public.token_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read whitelist" ON public.token_whitelist
  FOR SELECT USING (true);

CREATE POLICY "Admin/AIFM can manage whitelist" ON public.token_whitelist
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'aifm')
    )
  );

-- 2. token_freeze — Compliance freeze per fund
CREATE TABLE IF NOT EXISTS public.token_freeze (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_id UUID NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  reason TEXT,
  frozen_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fund_id, wallet_address)
);

ALTER TABLE public.token_freeze ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read freeze" ON public.token_freeze
  FOR SELECT USING (true);

CREATE POLICY "Admin/AIFM can manage freeze" ON public.token_freeze
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'aifm')
    )
  );

-- 3. vault_positions — Synthetic token vault state
CREATE TABLE IF NOT EXISTS public.vault_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_id UUID NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  wallet_address TEXT,
  security_token_count INTEGER NOT NULL DEFAULT 0,
  synthetic_token_count INTEGER NOT NULL DEFAULT 0,
  vault_address TEXT,
  lock_tx_hash TEXT,
  unlock_tx_hash TEXT,
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vault_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own vault positions" ON public.vault_positions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Intermediaries can read client vault positions" ON public.vault_positions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = vault_positions.user_id AND intermediary_id = auth.uid()
    )
  );

CREATE POLICY "Admin/AIFM can read all vault positions" ON public.vault_positions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'aifm')
    )
  );

CREATE POLICY "Service can manage vault positions" ON public.vault_positions
  FOR ALL USING (true) WITH CHECK (true);

-- 4. token_transfers — Audit trail for all token operations
CREATE TABLE IF NOT EXISTS public.token_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_id UUID REFERENCES public.funds(id),
  from_address TEXT,
  to_address TEXT,
  token_count INTEGER NOT NULL,
  transfer_type TEXT CHECK (transfer_type IN ('mint', 'transfer', 'vault_lock', 'vault_unlock', 'burn')),
  tx_hash TEXT,
  policy_id TEXT,
  asset_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.token_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read token transfers" ON public.token_transfers
  FOR SELECT USING (true);

CREATE POLICY "Service can insert token transfers" ON public.token_transfers
  FOR INSERT WITH CHECK (true);

-- 5. RPC: check_whitelist — returns true if address is whitelisted for fund
CREATE OR REPLACE FUNCTION public.check_whitelist(p_fund_id UUID, p_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.token_whitelist
    WHERE fund_id = p_fund_id
      AND wallet_address = p_address
      AND kyc_status = 'validated'
  );
END;
$$;

-- 6. RPC: check_frozen — returns true if address is frozen for fund
CREATE OR REPLACE FUNCTION public.check_frozen(p_fund_id UUID, p_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.token_freeze
    WHERE fund_id = p_fund_id
      AND wallet_address = p_address
  );
END;
$$;

-- 7. RPC: check_supply_cap — returns true if minting amount would exceed cap
CREATE OR REPLACE FUNCTION public.check_supply_cap(p_fund_id UUID, p_amount INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER;
  v_cap INTEGER;
BEGIN
  -- Count existing minted tokens for this fund
  SELECT COALESCE(SUM(token_count), 0) INTO v_total
  FROM public.token_transfers
  WHERE fund_id = p_fund_id AND transfer_type = 'mint';

  -- For now, no hard cap — always returns false (not exceeded)
  -- Add a supply_cap column to funds table when needed
  RETURN FALSE;
END;
$$;

-- 8. RPC: auto_whitelist_address — add address to whitelist with validated KYC
CREATE OR REPLACE FUNCTION public.auto_whitelist_address(
  p_fund_id UUID,
  p_address TEXT,
  p_profile_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.token_whitelist (fund_id, wallet_address, profile_id, kyc_status)
  VALUES (p_fund_id, p_address, p_profile_id, 'validated')
  ON CONFLICT (fund_id, wallet_address)
  DO UPDATE SET kyc_status = 'validated';
END;
$$;

-- 9. RPC: validate_order — transition order to validated + auto-whitelist
CREATE OR REPLACE FUNCTION public.validate_order(p_order_id TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_wallet TEXT;
BEGIN
  -- Get the order
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Update order status
  UPDATE public.orders
  SET status = 'validated',
      kyc_status = 'Validé',
      validated_at = now()
  WHERE id = p_order_id;

  -- Get investor wallet address
  SELECT wallet_address INTO v_wallet
  FROM public.profiles
  WHERE id = v_order.user_id;

  -- Auto-whitelist the investor address for this fund
  IF v_wallet IS NOT NULL AND v_order.fund_id IS NOT NULL THEN
    PERFORM public.auto_whitelist_address(v_order.fund_id, v_wallet, v_order.user_id);
  END IF;
END;
$$;

-- 10. Indexes
CREATE INDEX IF NOT EXISTS idx_token_whitelist_fund ON public.token_whitelist(fund_id);
CREATE INDEX IF NOT EXISTS idx_token_whitelist_address ON public.token_whitelist(wallet_address);
CREATE INDEX IF NOT EXISTS idx_token_freeze_fund ON public.token_freeze(fund_id);
CREATE INDEX IF NOT EXISTS idx_vault_positions_user ON public.vault_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_positions_fund ON public.vault_positions(fund_id);
CREATE INDEX IF NOT EXISTS idx_token_transfers_fund ON public.token_transfers(fund_id);
CREATE INDEX IF NOT EXISTS idx_token_transfers_type ON public.token_transfers(transfer_type);
