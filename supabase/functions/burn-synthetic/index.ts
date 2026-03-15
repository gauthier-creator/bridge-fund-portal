import { Blockfrost, Lucid, fromText, Data } from "npm:lucid-cardano@0.10.10";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * BURN SYNTHETIC TOKEN (Redeem)
 *
 * Atomic transaction:
 * 1. Burn synthetic tokens
 * 2. Unlock security tokens from the vault script address
 * 3. Send security tokens back to the user
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      userAddress,     // address to receive back security tokens
      fundSlug,        // fund identifier
      fundId,          // fund UUID
      tokenCount,      // number of synthetic tokens to burn (= security tokens to unlock)
      vaultPositionId, // vault_positions.id for tracking
      userId,          // user profile ID
    } = await req.json();

    if (!userAddress || !fundSlug || !tokenCount) {
      return new Response(
        JSON.stringify({ error: "userAddress, fundSlug, and tokenCount are required" }),
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
    // INITIALIZE LUCID
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

    // ═══════════════════════════════════════════════════════════════
    // DERIVE POLICIES & ADDRESSES (must match mint-synthetic exactly)
    // ═══════════════════════════════════════════════════════════════

    // Security token
    const securityPolicy = lucid.utils.nativeScriptFromJson({
      type: "all",
      scripts: [{ type: "sig", keyHash: paymentCredential.hash }],
    });
    const securityPolicyId = lucid.utils.mintingPolicyToId(securityPolicy);
    const secAssetLabel = fundSlug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
    const secAssetName = fromText(secAssetLabel);
    const securityUnit = securityPolicyId + secAssetName;

    // Vault script (same as mint-synthetic)
    const vaultScript = lucid.utils.nativeScriptFromJson({
      type: "all",
      scripts: [
        { type: "sig", keyHash: paymentCredential.hash },
        { type: "after", slot: 0 },
      ],
    });
    const vaultAddress = lucid.utils.validatorToAddress(vaultScript);

    // Synthetic token
    const syntheticPolicy = lucid.utils.nativeScriptFromJson({
      type: "any",
      scripts: [
        {
          type: "all",
          scripts: [{ type: "sig", keyHash: paymentCredential.hash }],
        },
      ],
    });
    const syntheticPolicyId = lucid.utils.mintingPolicyToId(syntheticPolicy);
    const synAssetLabel = ("s" + secAssetLabel).slice(0, 32);
    const synAssetName = fromText(synAssetLabel);
    const syntheticUnit = syntheticPolicyId + synAssetName;

    // ═══════════════════════════════════════════════════════════════
    // CHECK VAULT HAS ENOUGH LOCKED TOKENS
    // ═══════════════════════════════════════════════════════════════
    const vaultUtxos = await lucid.utxosAt(vaultAddress);
    const lockedTokens = vaultUtxos.reduce(
      (sum, u) => sum + BigInt(u.assets[securityUnit] || 0n),
      0n
    );

    if (lockedTokens < BigInt(tokenCount)) {
      throw new Error(
        `Insufficient locked tokens in vault: have ${lockedTokens}, need ${tokenCount}`
      );
    }

    // Check wallet has synthetic tokens to burn
    const walletUtxos = await lucid.wallet.getUtxos();
    const availableSynthetics = walletUtxos.reduce(
      (sum, u) => sum + BigInt(u.assets[syntheticUnit] || 0n),
      0n
    );

    if (availableSynthetics < BigInt(tokenCount)) {
      throw new Error(
        `Insufficient synthetic tokens to burn: have ${availableSynthetics}, need ${tokenCount}`
      );
    }

    console.log(`[Vault] Burning ${tokenCount} synthetic tokens (${synAssetLabel})`);
    console.log(`[Vault] Unlocking ${tokenCount} security tokens from vault`);
    console.log(`[Vault] Sending security tokens to ${userAddress.slice(0, 30)}...`);

    // ═══════════════════════════════════════════════════════════════
    // COLLECT VAULT UTxOs (find ones with the security token)
    // ═══════════════════════════════════════════════════════════════
    let collected = 0n;
    const selectedVaultUtxos = [];
    for (const utxo of vaultUtxos) {
      const amt = BigInt(utxo.assets[securityUnit] || 0n);
      if (amt > 0n) {
        selectedVaultUtxos.push(utxo);
        collected += amt;
        if (collected >= BigInt(tokenCount)) break;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // BUILD ATOMIC TRANSACTION: Burn + Unlock
    // ═══════════════════════════════════════════════════════════════

    // Get current slot for validity range (needed for "after" script)
    const currentSlot = lucid.currentSlot();

    let txBuilder = lucid
      .newTx()
      .validFrom(currentSlot)
      // 1. Collect security tokens from vault
      .collectFrom(selectedVaultUtxos, Data.void())
      .attachSpendingValidator(vaultScript)
      // 2. Burn synthetic tokens
      .mintAssets({ [syntheticUnit]: BigInt(-tokenCount) })
      .attachMintingPolicy(syntheticPolicy)
      // 3. Send security tokens to the user (whitelisted address)
      .payToAddress(userAddress, { [securityUnit]: BigInt(tokenCount) })
      // 4. Must add admin signer (required by vault script)
      .addSignerKey(paymentCredential.hash)
      // Metadata
      .attachMetadata(674, {
        msg: [
          `Burn ${tokenCount} ${synAssetLabel}`,
          `Unlock ${tokenCount} ${secAssetLabel}`,
          `To: ${userAddress.slice(0, 48)}`,
          `Ratio 1:1 | Redemption`,
        ],
      });

    // If we collected more than needed, return excess to vault
    const excess = collected - BigInt(tokenCount);
    if (excess > 0n) {
      txBuilder = txBuilder.payToContract(vaultAddress, Data.void(), {
        [securityUnit]: excess,
      });
    }

    const tx = await txBuilder.complete();
    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    console.log(`[Vault] Waiting for tx confirmation...`);
    await lucid.awaitTx(txHash);

    // ═══════════════════════════════════════════════════════════════
    // UPDATE VAULT POSITION
    // ═══════════════════════════════════════════════════════════════
    if (supabaseUrl && supabaseServiceKey) {
      const db = createClient(supabaseUrl, supabaseServiceKey);

      // Update the vault position
      if (vaultPositionId) {
        await db
          .from("vault_positions")
          .update({
            status: "unlocked",
            unlock_tx_hash: txHash,
            unlocked_at: new Date().toISOString(),
          })
          .eq("id", vaultPositionId);
      }

      // Record in transfers ledger
      if (fundId) {
        await db.from("token_transfers").insert({
          fund_id: fundId,
          from_address: vaultAddress,
          to_address: userAddress,
          token_count: tokenCount,
          transfer_type: "vault_unlock",
          tx_hash: txHash,
          policy_id: securityPolicyId,
          asset_name: secAssetLabel,
        });
      }
    }

    console.log(`[Vault] Burn & unlock complete: ${txHash}`);

    return new Response(
      JSON.stringify({
        txHash,
        vaultAddress,
        securityPolicyId,
        securityUnit,
        syntheticPolicyId,
        syntheticUnit,
        tokenCount,
        network: "preprod",
        explorerUrl: `https://preprod.cardanoscan.io/transaction/${txHash}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Burn synthetic error:", message);

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
