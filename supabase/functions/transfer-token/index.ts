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
    const { fromAddress, toAddress, fundSlug, tokenCount } = await req.json();

    if (!toAddress || !fundSlug || !tokenCount) {
      return new Response(
        JSON.stringify({ error: "toAddress, fundSlug, and tokenCount are required" }),
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

    // Load the fund's minting wallet (same wallet used for minting)
    lucid.selectWalletFromSeed(seedPhrase);
    const walletAddress = await lucid.wallet.address();

    // Derive policy ID (same as mint-token)
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

    // Build the asset unit name (same convention as mint-token)
    const assetLabel = fundSlug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
    const assetName = fromText(assetLabel);
    const unit = policyId + assetName;

    // Find UTxOs at the source address that contain the tokens
    // The fund wallet holds tokens after minting, so we send from it
    const utxos = await lucid.wallet.getUtxos();

    // Check that the wallet has enough tokens
    const totalAvailable = utxos.reduce((sum, u) => {
      return sum + BigInt(u.assets[unit] || 0n);
    }, 0n);

    if (totalAvailable < BigInt(tokenCount)) {
      throw new Error(
        `Insufficient tokens: wallet has ${totalAvailable}, need ${tokenCount}`
      );
    }

    // Build transfer transaction
    const tx = await lucid
      .newTx()
      .payToAddress(toAddress, { [unit]: BigInt(tokenCount) })
      .attachMetadata(674, {
        msg: [
          `Bridge Fund: ${tokenCount} token(s) transferred`,
          `Fund: ${fundSlug}`,
          `To: ${toAddress.slice(0, 20)}...`,
        ],
      })
      .complete();

    // Sign and submit
    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    // Wait for confirmation to prevent UTxO contention
    console.log(`[Transfer] Waiting for tx confirmation...`);
    await lucid.awaitTx(txHash);

    console.log(`[Transfer] ${tokenCount} tokens sent to ${toAddress}`);
    console.log(`[Transfer] Tx Hash: ${txHash}`);

    return new Response(
      JSON.stringify({
        txHash,
        policyId,
        tokenCount,
        unit,
        toAddress,
        network: "preprod",
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
