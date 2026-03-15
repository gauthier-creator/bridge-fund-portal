import { Blockfrost, Lucid } from "npm:lucid-cardano@0.10.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const seedPhrase = Deno.env.get("CARDANO_SEED_PHRASE");
    if (!seedPhrase) {
      return new Response(
        JSON.stringify({ error: "CARDANO_SEED_PHRASE not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const blockfrostKey = Deno.env.get("BLOCKFROST_API_KEY");
    if (!blockfrostKey) {
      return new Response(
        JSON.stringify({ error: "BLOCKFROST_API_KEY not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lucid = await Lucid.new(
      new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", blockfrostKey),
      "Preprod"
    );
    lucid.selectWalletFromSeed(seedPhrase);
    const address = await lucid.wallet.address();

    let balance = "unknown";
    try {
      const utxos = await lucid.wallet.getUtxos();
      const lovelace = utxos.reduce((sum: bigint, u: { assets: { lovelace?: bigint } }) => sum + (u.assets.lovelace || 0n), 0n);
      balance = `${Number(lovelace) / 1_000_000} ADA`;
    } catch {
      balance = "could not fetch (wallet may be empty)";
    }

    return new Response(
      JSON.stringify({ address, balance, network: "preprod" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
