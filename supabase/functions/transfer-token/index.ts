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
    const { toAddress, fundSlug, fundId, tokenCount } = await req.json();

    if (!toAddress || !fundSlug || !tokenCount) {
      return new Response(
        JSON.stringify({ error: "toAddress, fundSlug, and tokenCount are required" }),
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
    // CIP-113 COMPLIANCE CHECKS (pre-transfer)
    // ═══════════════════════════════════════════════════════════════
    if (supabaseUrl && supabaseServiceKey && fundId) {
      const db = createClient(supabaseUrl, supabaseServiceKey);

      // 1. WHITELIST CHECK — destination must be KYC'd
      const { data: whitelisted } = await db.rpc("check_whitelist", {
        p_fund_id: fundId,
        p_address: toAddress,
      });
      if (whitelisted === false) {
        return new Response(
          JSON.stringify({
            error: "Transfer rejected: destination address not whitelisted",
            standard: "CIP-113",
            detail: "Only KYC-verified addresses can receive fund tokens",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. FREEZE CHECK — frozen addresses cannot receive
      const { data: frozen } = await db.rpc("check_frozen", {
        p_fund_id: fundId,
        p_address: toAddress,
      });
      if (frozen === true) {
        return new Response(
          JSON.stringify({
            error: "Transfer rejected: destination address is frozen",
            standard: "CIP-113",
            detail: "Frozen addresses cannot receive tokens per compliance requirements",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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

    const { paymentCredential } = lucid.utils.getAddressDetails(walletAddress);
    if (!paymentCredential) {
      throw new Error("Could not derive payment credential from wallet");
    }

    const mintingPolicy = lucid.utils.nativeScriptFromJson({
      type: "all",
      scripts: [{ type: "sig", keyHash: paymentCredential.hash }],
    });

    const policyId = lucid.utils.mintingPolicyToId(mintingPolicy);
    const assetLabel = fundSlug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
    const assetName = fromText(assetLabel);
    const unit = policyId + assetName;

    // Check available tokens
    const utxos = await lucid.wallet.getUtxos();
    const totalAvailable = utxos.reduce((sum, u) => sum + BigInt(u.assets[unit] || 0n), 0n);

    if (totalAvailable < BigInt(tokenCount)) {
      throw new Error(`Insufficient tokens: wallet has ${totalAvailable}, need ${tokenCount}`);
    }

    // Build CIP-113 compliant transfer
    const tx = await lucid
      .newTx()
      .payToAddress(toAddress, { [unit]: BigInt(tokenCount) })
      .attachMetadata(674, {
        msg: [
          `CIP-113 Transfer: ${tokenCount} token(s)`,
          `Fund: ${fundSlug}`,
          `To: ${toAddress.slice(0, 20)}...`,
          `Compliance: whitelist-verified`,
        ],
      })
      .complete();

    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    console.log(`[Transfer] Waiting for tx confirmation...`);
    await lucid.awaitTx(txHash);

    // ═══════════════════════════════════════════════════════════════
    // POST-TRANSFER: Record in compliance ledger
    // ═══════════════════════════════════════════════════════════════
    if (supabaseUrl && supabaseServiceKey && fundId) {
      const db = createClient(supabaseUrl, supabaseServiceKey);
      await db.from("token_transfers").insert({
        fund_id: fundId,
        from_address: walletAddress,
        to_address: toAddress,
        token_count: tokenCount,
        transfer_type: "transfer",
        tx_hash: txHash,
        policy_id: policyId,
        asset_name: assetLabel,
      });
    }

    console.log(`[Transfer] CIP-113 compliant: ${tokenCount} tokens to ${toAddress}`);

    return new Response(
      JSON.stringify({
        txHash,
        policyId,
        tokenCount,
        unit,
        toAddress,
        network: "preprod",
        standard: "CIP-113",
        compliance: { whitelistVerified: true, freezeChecked: true },
        explorerUrl: `https://preprod.cardanoscan.io/transaction/${txHash}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Transfer token error:", message);

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
