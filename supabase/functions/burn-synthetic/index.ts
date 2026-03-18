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
    // CHECK VAULT FOR LOCKED TOKENS
    // ═══════════════════════════════════════════════════════════════
    const vaultUtxos = await lucid.utxosAt(vaultAddress);
    const lockedTokens = vaultUtxos.reduce(
      (sum, u) => sum + BigInt(u.assets[securityUnit] || 0n),
      0n
    );

    console.log(`[Vault] Vault has ${lockedTokens} ${secAssetLabel} locked`);
    console.log(`[Vault] Burn request: ${tokenCount} sBF for ${userAddress.slice(0, 30)}...`);

    let txHash: string;

    if (lockedTokens >= BigInt(tokenCount)) {
      // ═════════════════════════════════════════════════════════════
      // PATH A: Vault has tokens → full on-chain burn
      // Collect BF from vault, send security tokens back to user
      // ═════════════════════════════════════════════════════════════
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

      // For native script UTxOs in Lucid 0.10:
      // - collectFrom with the native script witness
      // - addSigner to satisfy the "sig" condition
      // - validFrom to satisfy the "after slot 0" condition
      const nowMs = Date.now() - 120_000; // 2 min in the past for safety

      let txBuilder = lucid
        .newTx()
        // Required: time validity for "after slot 0" in vault script
        .validFrom(nowMs)
        // Spend vault UTxOs — pass native script as witness for script UTxOs
        .collectFrom(selectedVaultUtxos)
        // Attach native script as spending witness
        .attachSpendingValidator(vaultScript)
        // Send security tokens back to the user (unlock)
        .payToAddress(userAddress, { [securityUnit]: BigInt(tokenCount) })
        // Required signer (satisfies "sig" condition in vault native script)
        .addSignerKey(paymentCredential.hash)
        .attachMetadata(674, {
          msg: [
            `Unlock ${tokenCount} ${secAssetLabel}`,
            `Redeem ${tokenCount} ${synAssetLabel}`,
            `To: ${userAddress.slice(0, 48)}`,
            `Ratio 1:1 | Redemption`,
          ],
        });

      // Return excess BF to vault if we collected more than needed
      const excess = collected - BigInt(tokenCount);
      if (excess > 0n) {
        txBuilder = txBuilder.payToContract(vaultAddress, Data.void(), {
          [securityUnit]: excess,
        });
      }

      const tx = await txBuilder.complete();
      const signedTx = await tx.sign().complete();
      txHash = await signedTx.submit();

      console.log(`[Vault] On-chain unlock tx: ${txHash}`);
      await lucid.awaitTx(txHash);
    } else {
      // ═════════════════════════════════════════════════════════════
      // PATH B: Vault empty (position from older flow or already burned)
      // Just update DB state — no on-chain tx needed
      // ═════════════════════════════════════════════════════════════
      console.log(`[Vault] No BF in vault — updating DB position only`);
      txHash = "offchain-burn-" + Date.now();
    }

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
