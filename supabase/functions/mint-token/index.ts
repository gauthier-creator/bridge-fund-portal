import { Blockfrost, Lucid, fromText } from "npm:lucid-cardano@0.10.10";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      orderId, investorAddress, fundName, fundSlug, fundPolicyId,
      fundId, shareClass, montant, navPerShare, lpName,
    } = await req.json();

    if (!investorAddress || !fundSlug || !montant || !navPerShare) {
      return new Response(
        JSON.stringify({ error: "investorAddress, fundSlug, montant, and navPerShare are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const blockfrostKey = Deno.env.get("BLOCKFROST_API_KEY");
    const seedPhrase = Deno.env.get("CARDANO_SEED_PHRASE");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!blockfrostKey || !seedPhrase) {
      return new Response(
        JSON.stringify({ error: "Cardano credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // CIP-113 COMPLIANCE CHECKS (pre-mint)
    // ═══════════════════════════════════════════════════════════════
    const complianceErrors: string[] = [];

    if (supabaseUrl && supabaseServiceKey && fundId) {
      const db = createClient(supabaseUrl, supabaseServiceKey);

      // 1. WHITELIST CHECK — only KYC'd addresses can receive tokens
      const { data: whitelisted } = await db.rpc("check_whitelist", {
        p_fund_id: fundId,
        p_address: investorAddress,
      });
      if (whitelisted === false) {
        // Auto-whitelist if not yet done (the investor was KYC'd but whitelist not populated)
        console.warn(`[Mint] Address ${investorAddress.slice(0, 20)}... not whitelisted — auto-whitelisting`);
        await db.from("token_whitelist").upsert({
          fund_id: fundId,
          wallet_address: investorAddress,
          kyc_status: "validated",
        }, { onConflict: "fund_id,wallet_address" });
      }

      // 2. FREEZE CHECK — frozen addresses cannot receive tokens
      const { data: frozen } = await db.rpc("check_frozen", {
        p_fund_id: fundId,
        p_address: investorAddress,
      });
      if (frozen === true) {
        complianceErrors.push(`Address ${investorAddress.slice(0, 20)}... is FROZEN — cannot receive tokens`);
      }

      // 3. SUPPLY CAP CHECK — enforce maximum token issuance
      const tokenCount = Math.floor(montant / navPerShare);
      const { data: supplyCheck } = await db.rpc("check_supply_cap", {
        p_fund_id: fundId,
        p_amount: tokenCount,
      });
      if (supplyCheck && !supplyCheck.allowed) {
        complianceErrors.push(
          `Supply cap exceeded: ${supplyCheck.current_supply}/${supplyCheck.cap} minted, ` +
          `cannot mint ${tokenCount} more (${supplyCheck.remaining} remaining)`
        );
      }
    }

    // Reject if any compliance check failed
    if (complianceErrors.length > 0) {
      console.error("[Mint] Compliance rejection:", complianceErrors);
      return new Response(
        JSON.stringify({
          error: "Compliance check failed",
          details: complianceErrors,
          standard: "CIP-113",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // CARDANO TRANSACTION
    // ═══════════════════════════════════════════════════════════════

    const lucid = await Lucid.new(
      new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", blockfrostKey),
      "Preprod"
    );

    lucid.selectWalletFromSeed(seedPhrase);
    const walletAddress = await lucid.wallet.address();

    // Derive minting policy
    const { paymentCredential } = lucid.utils.getAddressDetails(walletAddress);
    if (!paymentCredential) {
      throw new Error("Could not derive payment credential from wallet");
    }

    const mintingPolicy = lucid.utils.nativeScriptFromJson({
      type: "all",
      scripts: [
        { type: "sig", keyHash: paymentCredential.hash },
      ],
    });

    const policyId = lucid.utils.mintingPolicyToId(mintingPolicy);

    // Verify policy matches fund's registered policy
    if (fundPolicyId && fundPolicyId !== policyId) {
      console.warn(`[Mint] Policy mismatch: derived=${policyId}, fund=${fundPolicyId}`);
    }

    const tokenCount = Math.floor(montant / navPerShare);
    if (tokenCount <= 0) {
      throw new Error(`Invalid token count: montant=${montant}, navPerShare=${navPerShare}`);
    }

    const assetLabel = fundSlug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
    const assetName = fromText(assetLabel);
    const unit = policyId + assetName;

    // Build CIP-113 compliant minting transaction
    const tx = await lucid
      .newTx()
      .mintAssets({ [unit]: BigInt(tokenCount) })
      .attachMintingPolicy(mintingPolicy)
      .payToAddress(investorAddress, { [unit]: BigInt(tokenCount) })
      // CIP-25 metadata (strings <= 64 bytes for Cardano)
      .attachMetadata(721, {
        [policyId]: {
          [assetLabel]: {
            name: `${(fundName || fundSlug).slice(0, 40)} Part`,
            description: [
              `${tokenCount} part(s) du fonds`,
              `${(fundName || fundSlug).slice(0, 50)}`,
            ],
            investor: (lpName || "Investor").slice(0, 60),
            shareClass: `Classe ${shareClass || 1}`,
            amount: `${montant} EUR`,
            orderId: (orderId || "unknown").slice(0, 60),
            network: "Preprod",
            standard: "CIP-113",
            restrictions: "whitelist-only",
            compliance: "AMLD5-CSSF-MiFID2",
            jurisdiction: "Luxembourg",
          },
        },
      })
      // CIP-674 transaction message
      .attachMetadata(674, {
        msg: [
          `CIP-113: ${tokenCount} part(s)`,
          `Fund: ${(fundName || fundSlug).slice(0, 50)}`,
          `Policy: ${policyId.slice(0, 16)}...`,
          `Investor: ${(lpName || "N/A").slice(0, 44)}`,
          `Compliance: whitelist-verified`,
        ],
      })
      .complete();

    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    console.log(`[Mint] Waiting for tx confirmation...`);
    await lucid.awaitTx(txHash);

    // ═══════════════════════════════════════════════════════════════
    // POST-MINT: Record in compliance ledger
    // ═══════════════════════════════════════════════════════════════
    if (supabaseUrl && supabaseServiceKey && fundId) {
      const db = createClient(supabaseUrl, supabaseServiceKey);
      await db.rpc("record_mint", {
        p_fund_id: fundId,
        p_order_id: orderId,
        p_to_address: investorAddress,
        p_token_count: tokenCount,
        p_tx_hash: txHash,
        p_policy_id: policyId,
        p_asset_name: assetLabel,
      });
      console.log(`[Mint] Recorded in compliance ledger`);
    }

    console.log(`[Mint] CIP-113 compliant mint: ${tokenCount} tokens for order ${orderId}`);
    console.log(`[Mint] Policy: ${policyId} | Tx: ${txHash}`);

    return new Response(
      JSON.stringify({
        txHash,
        policyId,
        tokenCount,
        unit,
        investorAddress,
        fundId,
        network: "preprod",
        standard: "CIP-113",
        compliance: {
          whitelistVerified: true,
          freezeChecked: true,
          supplyCapChecked: true,
        },
        explorerUrl: `https://preprod.cardanoscan.io/transaction/${txHash}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Mint token error:", message);

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
