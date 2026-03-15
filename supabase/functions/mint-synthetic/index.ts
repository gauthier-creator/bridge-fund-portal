import { Blockfrost, Lucid, fromText, Data } from "npm:lucid-cardano@0.10.10";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * MINT SYNTHETIC TOKEN
 *
 * Atomic transaction:
 * 1. Lock security tokens at the vault script address
 * 2. Mint 1:1 synthetic tokens (sBF-[FUND]) under a separate policy
 * 3. Send synthetic tokens to the caller
 *
 * The vault uses a native script address (multi-sig requiring admin key)
 * that is DIFFERENT from the regular wallet address. Tokens locked there
 * can only be unlocked by the admin via the burn-synthetic function.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      userAddress,   // address to receive synthetic tokens
      fundSlug,      // fund identifier
      fundId,        // fund UUID
      tokenCount,    // number of security tokens to lock (= synthetics to mint)
      userId,        // user profile ID for tracking
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
    // DERIVE POLICIES & ADDRESSES
    // ═══════════════════════════════════════════════════════════════

    // 1. SECURITY TOKEN policy (same as fund minting policy)
    const securityPolicy = lucid.utils.nativeScriptFromJson({
      type: "all",
      scripts: [{ type: "sig", keyHash: paymentCredential.hash }],
    });
    const securityPolicyId = lucid.utils.mintingPolicyToId(securityPolicy);

    // Security token unit
    const secAssetLabel = fundSlug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
    const secAssetName = fromText(secAssetLabel);
    const securityUnit = securityPolicyId + secAssetName;

    // 2. VAULT script address — uses "any" with a different structure
    //    to create a distinct script address from the regular wallet
    const vaultScript = lucid.utils.nativeScriptFromJson({
      type: "all",
      scripts: [
        { type: "sig", keyHash: paymentCredential.hash },
        // Adding "after slot 0" makes this a DIFFERENT script/address
        // while still being spendable by the admin key
        { type: "after", slot: 0 },
      ],
    });
    const vaultAddress = lucid.utils.validatorToAddress(vaultScript);

    // 3. SYNTHETIC TOKEN policy — separate policy for freely transferable tokens
    //    Uses "any" with the admin key to distinguish from the security policy
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

    // Synthetic token unit: sBF-[FUND]
    const synAssetLabel = ("s" + secAssetLabel).slice(0, 32);
    const synAssetName = fromText(synAssetLabel);
    const syntheticUnit = syntheticPolicyId + synAssetName;

    // ═══════════════════════════════════════════════════════════════
    // VALIDATE TOKEN COUNT against user's fund holdings
    // The frontend already validates against validated orders,
    // but we double-check server-side via Supabase.
    // ═══════════════════════════════════════════════════════════════
    if (supabaseUrl && supabaseServiceKey && fundId && userId) {
      const db = createClient(supabaseUrl, supabaseServiceKey);

      // Count user's validated parts for this fund
      const { data: userOrders } = await db
        .from("orders")
        .select("montant")
        .eq("user_id", userId)
        .eq("fund_id", fundId)
        .eq("status", "validated");

      const { data: fund } = await db
        .from("funds")
        .select("nav_per_share")
        .eq("id", fundId)
        .maybeSingle();

      const navPerShare = Number(fund?.nav_per_share) || 1000;
      const totalParts = (userOrders || []).reduce(
        (s, o) => s + Math.floor(Number(o.montant) / navPerShare), 0
      );

      // Count already locked tokens in vault for this user+fund
      const { data: existingLocks } = await db
        .from("vault_positions")
        .select("security_token_count")
        .eq("user_id", userId)
        .eq("fund_id", fundId)
        .eq("status", "locked");

      const alreadyLocked = (existingLocks || []).reduce(
        (s, p) => s + (p.security_token_count || 0), 0
      );

      const maxMintable = totalParts - alreadyLocked;
      console.log(`[Vault] User has ${totalParts} parts, ${alreadyLocked} locked, max mintable: ${maxMintable}`);

      if (tokenCount > maxMintable) {
        throw new Error(
          `Cannot mint ${tokenCount} synthetic tokens: you have ${totalParts} parts ` +
          `with ${alreadyLocked} already locked (${maxMintable} available)`
        );
      }
    }

    console.log(`[Vault] Minting ${tokenCount} BF + locking in vault + minting ${tokenCount} sBF`);
    console.log(`[Vault] Security policy: ${securityPolicyId.slice(0, 16)}...`);
    console.log(`[Vault] Synthetic policy: ${syntheticPolicyId.slice(0, 16)}...`);

    // ═══════════════════════════════════════════════════════════════
    // BUILD ATOMIC TRANSACTION: Mint BF + Lock in Vault + Mint sBF
    // Single tx: mint security tokens, lock them, mint synthetics
    // ═══════════════════════════════════════════════════════════════
    const tx = await lucid
      .newTx()
      // 1. Mint security tokens (BF) for the vault lock
      .mintAssets({ [securityUnit]: BigInt(tokenCount) })
      .attachMintingPolicy(securityPolicy)
      // 2. Lock security tokens at vault script address
      .payToContract(vaultAddress, Data.void(), {
        [securityUnit]: BigInt(tokenCount),
      })
      // 3. Mint synthetic tokens 1:1
      .mintAssets({ [syntheticUnit]: BigInt(tokenCount) })
      .attachMintingPolicy(syntheticPolicy)
      // 4. Send synthetic tokens to the user
      .payToAddress(userAddress, { [syntheticUnit]: BigInt(tokenCount) })
      // Metadata (all strings must be <= 64 bytes for Cardano)
      .attachMetadata(721, {
        [syntheticPolicyId]: {
          [synAssetLabel]: {
            name: `s${secAssetLabel} Synthetic`,
            description: [
              `Synthetic token backed 1:1 by`,
              `${secAssetLabel} locked in vault`,
            ],
            type: "synthetic",
            backing: "1:1",
            securityAsset: secAssetLabel,
            vault: vaultAddress.slice(0, 56),
            standard: "CIP-113",
            transferable: "unrestricted",
          },
        },
      })
      .attachMetadata(674, {
        msg: [
          `Lock ${tokenCount} ${secAssetLabel}`,
          `Mint ${tokenCount} ${synAssetLabel}`,
          `Vault: ${vaultAddress.slice(0, 40)}`,
          `To: ${userAddress.slice(0, 48)}`,
          `Ratio 1:1 | Freely transferable`,
        ],
      })
      .complete();

    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    console.log(`[Vault] Waiting for tx confirmation...`);
    await lucid.awaitTx(txHash);

    // ═══════════════════════════════════════════════════════════════
    // RECORD VAULT POSITION
    // ═══════════════════════════════════════════════════════════════
    if (supabaseUrl && supabaseServiceKey) {
      const db = createClient(supabaseUrl, supabaseServiceKey);
      await db.from("vault_positions").insert({
        fund_id: fundId || null,
        user_id: userId || null,
        wallet_address: userAddress,
        security_token_count: tokenCount,
        security_policy_id: securityPolicyId,
        security_asset_name: secAssetLabel,
        synthetic_token_count: tokenCount,
        synthetic_policy_id: syntheticPolicyId,
        synthetic_asset_name: synAssetLabel,
        vault_address: vaultAddress,
        lock_tx_hash: txHash,
        status: "locked",
      });

      // Also record in transfers ledger
      if (fundId) {
        await db.from("token_transfers").insert({
          fund_id: fundId,
          from_address: walletAddress,
          to_address: vaultAddress,
          token_count: tokenCount,
          transfer_type: "vault_lock",
          tx_hash: txHash,
          policy_id: securityPolicyId,
          asset_name: secAssetLabel,
        });
      }
    }

    console.log(`[Vault] Synthetic mint complete: ${txHash}`);

    return new Response(
      JSON.stringify({
        txHash,
        vaultAddress,
        securityPolicyId,
        securityUnit,
        syntheticPolicyId,
        syntheticUnit,
        tokenCount,
        syntheticAssetName: synAssetLabel,
        network: "preprod",
        explorerUrl: `https://preprod.cardanoscan.io/transaction/${txHash}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Mint synthetic error:", message);

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
