import { supabase } from "../lib/supabase";
import { deployFundRegistry } from "./cardanoService";
import { auditFundCreated, auditFundUpdated, auditFundDeleted } from "./auditService";

// ─── Helpers ───

function dbToFund(row) {
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    fundName: row.fund_name,
    fundSubtitle: row.fund_subtitle,
    description: row.description,
    strategy: row.strategy,
    investmentThesis: row.investment_thesis,
    heroImageUrl: row.hero_image_url,
    targetReturn: row.target_return,
    minimumInvestment: Number(row.minimum_investment || 0),
    fundSize: Number(row.fund_size || 0),
    navPerShare: Number(row.nav_per_share || 0),
    currency: row.currency || "EUR",
    jurisdiction: row.jurisdiction,
    legalForm: row.legal_form,
    aifm: row.aifm,
    custodian: row.custodian,
    auditor: row.auditor,
    administrator: row.administrator,
    regulatoryStatus: row.regulatory_status,
    shareClasses: row.share_classes || [],
    highlights: row.highlights || [],
    cardanoPolicyId: row.cardano_policy_id,
    cardanoScriptAddress: row.cardano_script_address,
    cardanoTxHash: row.cardano_tx_hash,
    blockchainNetwork: row.blockchain_network,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fundToDb(fund) {
  const row = {};
  if (fund.slug !== undefined) row.slug = fund.slug;
  if (fund.status !== undefined) row.status = fund.status;
  if (fund.fundName !== undefined) row.fund_name = fund.fundName;
  if (fund.fundSubtitle !== undefined) row.fund_subtitle = fund.fundSubtitle;
  if (fund.description !== undefined) row.description = fund.description;
  if (fund.strategy !== undefined) row.strategy = fund.strategy;
  if (fund.investmentThesis !== undefined) row.investment_thesis = fund.investmentThesis;
  if (fund.heroImageUrl !== undefined) row.hero_image_url = fund.heroImageUrl;
  if (fund.targetReturn !== undefined) row.target_return = fund.targetReturn;
  if (fund.minimumInvestment !== undefined) row.minimum_investment = fund.minimumInvestment;
  if (fund.fundSize !== undefined) row.fund_size = fund.fundSize;
  if (fund.navPerShare !== undefined) row.nav_per_share = fund.navPerShare;
  if (fund.currency !== undefined) row.currency = fund.currency;
  if (fund.jurisdiction !== undefined) row.jurisdiction = fund.jurisdiction;
  if (fund.legalForm !== undefined) row.legal_form = fund.legalForm;
  if (fund.aifm !== undefined) row.aifm = fund.aifm;
  if (fund.custodian !== undefined) row.custodian = fund.custodian;
  if (fund.auditor !== undefined) row.auditor = fund.auditor;
  if (fund.administrator !== undefined) row.administrator = fund.administrator;
  if (fund.regulatoryStatus !== undefined) row.regulatory_status = fund.regulatoryStatus;
  if (fund.shareClasses !== undefined) row.share_classes = fund.shareClasses;
  if (fund.highlights !== undefined) row.highlights = fund.highlights;
  if (fund.cardanoPolicyId !== undefined) row.cardano_policy_id = fund.cardanoPolicyId;
  if (fund.cardanoScriptAddress !== undefined) row.cardano_script_address = fund.cardanoScriptAddress;
  if (fund.cardanoTxHash !== undefined) row.cardano_tx_hash = fund.cardanoTxHash;
  if (fund.blockchainNetwork !== undefined) row.blockchain_network = fund.blockchainNetwork;
  row.updated_at = new Date().toISOString();
  return row;
}

// ─── CRUD ───

/** Fetch all active funds (public) */
export async function listFunds() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("funds")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) { console.error("listFunds error:", error.message); return []; }
  return data.map(dbToFund);
}

/** Fetch all funds including drafts (admin) */
export async function listAllFunds() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("funds")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("listAllFunds error:", error.message); return []; }
  return data.map(dbToFund);
}

/** Fetch a single fund by slug or ID */
export async function getFund(slugOrId) {
  if (!supabase) return null;
  // Try by slug first, then by ID
  let { data, error } = await supabase
    .from("funds")
    .select("*")
    .eq("slug", slugOrId)
    .single();

  if (error || !data) {
    ({ data, error } = await supabase
      .from("funds")
      .select("*")
      .eq("id", slugOrId)
      .single());
  }

  if (error || !data) return null;
  return dbToFund(data);
}

/** Create a new fund + deploy Cardano registry */
export async function createFund(fund) {
  if (!supabase) throw new Error("Supabase non configuré");

  const { data: { user } } = await supabase.auth.getUser();

  // Generate slug from fund name
  const slug = fund.slug || fund.fundName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Deploy Cardano registry smart contract on Preprod testnet
  const cardano = await deployFundRegistry(fund.fundName, slug);

  const dbRow = {
    ...fundToDb(fund),
    slug,
    status: fund.status || "active",
    created_by: user?.id || null,
    cardano_policy_id: cardano.policyId,
    cardano_script_address: cardano.scriptAddress,
    cardano_tx_hash: cardano.txHash,
    blockchain_network: cardano.network,
  };

  const { data, error } = await supabase
    .from("funds")
    .insert(dbRow)
    .select()
    .single();

  if (error) throw error;
  const result = dbToFund(data);
  auditFundCreated(result).catch(() => {});
  return result;
}

/** Update an existing fund */
export async function updateFund(fundId, updates) {
  if (!supabase) throw new Error("Supabase non configuré");

  const dbRow = fundToDb(updates);
  const { data, error } = await supabase
    .from("funds")
    .update(dbRow)
    .eq("id", fundId)
    .select()
    .single();

  if (error) throw error;
  const result = dbToFund(data);
  auditFundUpdated(fundId, updates).catch(() => {});
  return result;
}

/** Delete a fund */
export async function deleteFund(fundId) {
  if (!supabase) throw new Error("Supabase non configuré");
  // Fetch fund name before deletion for audit
  const { data: fund } = await supabase.from("funds").select("fund_name").eq("id", fundId).maybeSingle();
  const { error } = await supabase
    .from("funds")
    .delete()
    .eq("id", fundId);
  if (error) throw error;
  auditFundDeleted(fundId, fund?.fund_name || fundId).catch(() => {});
}
