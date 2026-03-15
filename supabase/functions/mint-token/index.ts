import { Blockfrost, Lucid, fromText } from "npm:lucid-cardano@0.10.10";

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
    const { orderId, investorAddress, fundName, fundSlug, shareClass, montant, navPerShare, lpName } = await req.json();

    if (!investorAddress || !fundSlug || !montant || !navPerShare) {
      return new Response(
        JSON.stringify({ error: "investorAddress, fundSlug, montant, and navPerShare are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const blockfrostKey = Deno.env.get("BLOCKFROST_API_KEY");
    const seedPhrase = Deno.env.get("CARDANO_SEED_PHRASE");

    if (!blockfrostKey || !seedPhrase) {
      return new Response(
        JSON.stringify({ error: "Cardano credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Lucid with Blockfrost Preprod
    const lucid = await Lucid.new(
      new Blockfrost(
        "https://cardano-preprod.blockfrost.io/api/v0",
        blockfrostKey
      ),
      "Preprod"
    );

    // Load the fund's minting wallet (same wallet that deployed the registry)
    lucid.selectWalletFromSeed(seedPhrase);
    const walletAddress = await lucid.wallet.address();

    // Derive minting policy (same as deploy-fund-registry)
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

    // Calculate number of tokens (parts) to mint
    const tokenCount = Math.floor(montant / navPerShare);
    if (tokenCount <= 0) {
      throw new Error(`Invalid token count: montant=${montant}, navPerShare=${navPerShare}`);
    }

    // Asset name = fund slug (same convention as registry)
    const assetLabel = fundSlug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
    const assetName = fromText(assetLabel);
    const unit = policyId + assetName;

    // Build minting transaction:
    // 1. Mint tokens
    // 2. Send them to the investor's wallet address
    const tx = await lucid
      .newTx()
      .mintAssets({ [unit]: BigInt(tokenCount) })
      .attachMintingPolicy(mintingPolicy)
      .payToAddress(investorAddress, { [unit]: BigInt(tokenCount) })
      .attachMetadata(721, {
        [policyId]: {
          [assetLabel]: {
            name: `${fundName || fundSlug} — Part`,
            description: `${tokenCount} part(s) du fonds ${fundName || fundSlug}`,
            investor: lpName || "Investor",
            shareClass: `Classe ${shareClass || 1}`,
            amount: `${montant} EUR`,
            orderId: orderId || "unknown",
            mintedAt: new Date().toISOString(),
            network: "Preprod",
          },
        },
      })
      .attachMetadata(674, {
        msg: [
          `Bridge Fund: ${tokenCount} token(s) minted`,
          `Fund: ${fundName || fundSlug}`,
          `Investor: ${lpName || "N/A"}`,
          `Order: ${orderId || "N/A"}`,
        ],
      })
      .complete();

    // Sign and submit
    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    // Wait for on-chain confirmation to prevent UTxO contention on consecutive mints
    console.log(`[Mint] Waiting for tx confirmation...`);
    await lucid.awaitTx(txHash);

    console.log(`[Mint] ${tokenCount} tokens minted for order ${orderId}`);
    console.log(`[Mint] Policy ID: ${policyId}`);
    console.log(`[Mint] Sent to: ${investorAddress}`);
    console.log(`[Mint] Tx Hash: ${txHash}`);

    return new Response(
      JSON.stringify({
        txHash,
        policyId,
        tokenCount,
        unit,
        investorAddress,
        network: "preprod",
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
