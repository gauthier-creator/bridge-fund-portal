import { Blockfrost, Lucid, generateSeedPhrase } from "npm:lucid-cardano@0.10.10";

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
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const blockfrostKey = Deno.env.get("BLOCKFROST_API_KEY");
    if (!blockfrostKey) {
      return new Response(
        JSON.stringify({ error: "BLOCKFROST_API_KEY not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Lucid on Cardano Preprod
    const lucid = await Lucid.new(
      new Blockfrost(
        "https://cardano-preprod.blockfrost.io/api/v0",
        blockfrostKey
      ),
      "Preprod"
    );

    // Generate a new unique wallet for this investor
    const seedPhrase = generateSeedPhrase();
    lucid.selectWalletFromSeed(seedPhrase);
    const address = await lucid.wallet.address();

    console.log(`[Wallet] Generated wallet for user ${userId}`);
    console.log(`[Wallet] Address: ${address}`);

    return new Response(
      JSON.stringify({
        address,
        network: "preprod",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Generate wallet error:", message);

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
