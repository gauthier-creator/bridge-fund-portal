import { Blockfrost, Lucid, fromText } from "npm:lucid-cardano@0.10.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { fundName, fundSlug } = await req.json();

    if (!fundName || !fundSlug) {
      return new Response(
        JSON.stringify({ error: "fundName and fundSlug are required" }),
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

    // Load wallet from seed phrase
    lucid.selectWalletFromSeed(seedPhrase);
    const walletAddress = await lucid.wallet.address();

    // Create a native minting policy based on wallet key
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

    // Asset name = fund slug (max 32 bytes)
    const assetLabel = fundSlug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
    const assetName = fromText(assetLabel);
    const unit = policyId + assetName;

    // Build minting transaction with CIP-25 metadata (NFT standard)
    const tx = await lucid
      .newTx()
      .mintAssets({ [unit]: 1n })
      .attachMintingPolicy(mintingPolicy)
      .attachMetadata(721, {
        [policyId]: {
          [assetLabel]: {
            name: fundName,
            description: `On-chain registry for ${fundName} — Bridge Fund Platform`,
            platform: "Bridge Fund",
            type: "Fund Registry",
            created: new Date().toISOString().split("T")[0],
            network: "Preprod",
          },
        },
      })
      .attachMetadata(674, {
        msg: [
          `Bridge Fund Registry: ${fundName}`,
          `Slug: ${fundSlug}`,
          `Deployed: ${new Date().toISOString()}`,
        ],
      })
      .complete();

    // Sign and submit
    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    console.log(`[Cardano Preprod] Fund registry deployed for "${fundName}"`);
    console.log(`[Cardano Preprod] Policy ID: ${policyId}`);
    console.log(`[Cardano Preprod] Tx Hash: ${txHash}`);
    console.log(`[Cardano Preprod] Wallet: ${walletAddress}`);

    return new Response(
      JSON.stringify({
        policyId,
        scriptAddress: walletAddress,
        txHash,
        network: "preprod",
        assetName: assetLabel,
        unit,
        explorerUrl: `https://preprod.cardanoscan.io/transaction/${txHash}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Deploy fund registry error:", message);

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
