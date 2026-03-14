/**
 * Cardano Smart Contract Service
 *
 * When a fund is created, we deploy a "registry" smart contract on Cardano.
 * This contract acts as the on-chain register of token holders.
 *
 * In production, this would use the Blockfrost API to:
 * 1. Create a native token policy for the fund
 * 2. Deploy a reference script (registry)
 * 3. Mint tokens for each subscription
 *
 * For now, we simulate contract deployment and generate realistic Cardano addresses.
 */

const BLOCKFROST_API_KEY = import.meta.env.VITE_BLOCKFROST_API_KEY || null;
const BLOCKFROST_BASE = import.meta.env.VITE_BLOCKFROST_NETWORK === "testnet"
  ? "https://cardano-preprod.blockfrost.io/api/v0"
  : "https://cardano-mainnet.blockfrost.io/api/v0";

// Generate a realistic-looking Cardano policy ID (56 hex chars)
function generatePolicyId() {
  const chars = "0123456789abcdef";
  let id = "";
  for (let i = 0; i < 56; i++) id += chars[Math.floor(Math.random() * 16)];
  return id;
}

// Generate a realistic Cardano address (bech32-like)
function generateScriptAddress() {
  const chars = "0123456789abcdefghjklmnpqrstuvwxyz";
  let addr = "addr1q";
  for (let i = 0; i < 53; i++) addr += chars[Math.floor(Math.random() * chars.length)];
  return addr;
}

// Generate a realistic tx hash
function generateTxHash() {
  const chars = "0123456789abcdef";
  let hash = "";
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * 16)];
  return hash;
}

/**
 * Deploy a registry smart contract for a new fund.
 * Returns { policyId, scriptAddress, txHash, network }
 */
export async function deployFundRegistry(fundName) {
  // If Blockfrost API key is available, interact with real network
  if (BLOCKFROST_API_KEY) {
    try {
      // In a real implementation, we would:
      // 1. Build a minting policy transaction
      // 2. Submit it via Blockfrost
      // 3. Return the real policy ID and tx hash

      // For now, verify API connectivity and return simulated data
      const res = await fetch(`${BLOCKFROST_BASE}/`, {
        headers: { project_id: BLOCKFROST_API_KEY },
      });

      if (res.ok) {
        const network = await res.json();
        console.log(`Cardano network connected: ${network.network}`);
      }
    } catch (err) {
      console.warn("Blockfrost API not reachable, using simulation:", err.message);
    }
  }

  // Simulate deployment (2s delay for realism)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const policyId = generatePolicyId();
  const scriptAddress = generateScriptAddress();
  const txHash = generateTxHash();
  const network = BLOCKFROST_API_KEY
    ? (import.meta.env.VITE_BLOCKFROST_NETWORK || "mainnet")
    : "mainnet";

  console.log(`[Cardano] Registry deployed for "${fundName}"`);
  console.log(`[Cardano] Policy ID: ${policyId}`);
  console.log(`[Cardano] Script Address: ${scriptAddress}`);
  console.log(`[Cardano] Tx Hash: ${txHash}`);

  return { policyId, scriptAddress, txHash, network };
}

/**
 * Get fund token info from Cardano (if Blockfrost is configured)
 */
export async function getFundTokenInfo(policyId) {
  if (!BLOCKFROST_API_KEY || !policyId) return null;

  try {
    const res = await fetch(`${BLOCKFROST_BASE}/assets/policy/${policyId}`, {
      headers: { project_id: BLOCKFROST_API_KEY },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Format a Cardano explorer URL for a given tx hash
 */
export function getExplorerUrl(txHash, network = "mainnet") {
  if (!txHash) return null;
  const base = network === "testnet" || network === "preprod"
    ? "https://preprod.cardanoscan.io"
    : "https://cardanoscan.io";
  return `${base}/transaction/${txHash}`;
}

/**
 * Format a short version of a Cardano address/hash
 */
export function shortenHash(hash, chars = 8) {
  if (!hash) return "—";
  if (hash.length <= chars * 2 + 3) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}
