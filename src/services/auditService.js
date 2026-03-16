import { supabase } from "../lib/supabase";

/**
 * Audit Trail Service — Bridge Fund Portal
 *
 * Catégories : auth, order, fund, user, token, compliance, vault
 * Sévérités  : info, warning, critical
 */

// ─── Log générique via RPC ───
export async function logAudit({
  action,
  category,
  description,
  entityType = null,
  entityId = null,
  severity = "info",
  metadata = {},
}) {
  if (!supabase) {
    console.log(`[AUDIT] ${category}.${action}: ${description}`, metadata);
    return null;
  }

  try {
    const { data, error } = await supabase.rpc("log_audit", {
      p_action: action,
      p_category: category,
      p_description: description,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_severity: severity,
      p_metadata: metadata,
    });

    if (error) {
      console.error("[AUDIT] Failed to log:", error.message);
      return null;
    }
    return data; // UUID du log
  } catch (err) {
    console.error("[AUDIT] Exception:", err);
    return null;
  }
}

// ─── Raccourcis par catégorie ───

// Auth
export const auditLogin = (email) =>
  logAudit({
    action: "auth.login",
    category: "auth",
    description: `Connexion réussie : ${email}`,
    metadata: { email },
  });

export const auditLoginFailed = (email, reason) =>
  logAudit({
    action: "auth.login_failed",
    category: "auth",
    description: `Échec de connexion : ${email}`,
    severity: "warning",
    metadata: { email, reason },
  });

export const auditLogout = (email) =>
  logAudit({
    action: "auth.logout",
    category: "auth",
    description: `Déconnexion : ${email}`,
    metadata: { email },
  });

// Orders
export const auditOrderCreated = (order) =>
  logAudit({
    action: "order.created",
    category: "order",
    description: `Souscription créée : ${order.lpName || order.nom} — ${order.montant}€ (${order.shareClass})`,
    entityType: "order",
    entityId: order.id,
    metadata: {
      fundId: order.fundId,
      montant: order.montant,
      shareClass: order.shareClass,
      lpName: order.lpName,
      type: order.type,
    },
  });

export const auditOrderValidated = (orderId, mintResult) =>
  logAudit({
    action: "order.validated",
    category: "order",
    description: `Ordre validé : ${orderId}`,
    entityType: "order",
    entityId: orderId,
    severity: "info",
    metadata: {
      mintTxHash: mintResult?.txHash || null,
      tokenCount: mintResult?.tokenCount || null,
      explorerUrl: mintResult?.explorerUrl || null,
    },
  });

export const auditOrderRejected = (orderId, reason) =>
  logAudit({
    action: "order.rejected",
    category: "order",
    description: `Ordre rejeté : ${orderId} — ${reason}`,
    entityType: "order",
    entityId: orderId,
    severity: "warning",
    metadata: { reason },
  });

// Users
export const auditUserCreated = (userId, email, role) =>
  logAudit({
    action: "user.created",
    category: "user",
    description: `Utilisateur créé : ${email} (${role})`,
    entityType: "profile",
    entityId: userId,
    metadata: { email, role },
  });

export const auditUserUpdated = (userId, changes) =>
  logAudit({
    action: "user.updated",
    category: "user",
    description: `Profil mis à jour : ${userId}`,
    entityType: "profile",
    entityId: userId,
    metadata: { changes },
  });

export const auditKycValidated = (userId, email) =>
  logAudit({
    action: "user.kyc_validated",
    category: "user",
    description: `KYC validé pour ${email}`,
    entityType: "profile",
    entityId: userId,
    severity: "info",
    metadata: { email },
  });

export const auditRoleChanged = (userId, email, oldRole, newRole) =>
  logAudit({
    action: "user.role_changed",
    category: "user",
    description: `Rôle changé : ${email} ${oldRole} → ${newRole}`,
    entityType: "profile",
    entityId: userId,
    severity: "critical",
    metadata: { email, oldRole, newRole },
  });

// Funds
export const auditFundCreated = (fund) =>
  logAudit({
    action: "fund.created",
    category: "fund",
    description: `Fonds créé : ${fund.fundName} (${fund.slug})`,
    entityType: "fund",
    entityId: fund.id,
    metadata: {
      slug: fund.slug,
      policyId: fund.cardanoPolicyId,
      txHash: fund.cardanoTxHash,
    },
  });

export const auditFundUpdated = (fundId, changes) =>
  logAudit({
    action: "fund.updated",
    category: "fund",
    description: `Fonds mis à jour : ${fundId}`,
    entityType: "fund",
    entityId: fundId,
    metadata: { changes },
  });

export const auditFundDeleted = (fundId, fundName) =>
  logAudit({
    action: "fund.deleted",
    category: "fund",
    description: `Fonds supprimé : ${fundName}`,
    entityType: "fund",
    entityId: fundId,
    severity: "critical",
    metadata: { fundName },
  });

// Tokens (Cardano)
export const auditTokenMinted = (orderId, result) =>
  logAudit({
    action: "token.minted",
    category: "token",
    description: `Tokens mintés : ${result.tokenCount} tokens — tx ${result.txHash?.slice(0, 16)}…`,
    entityType: "order",
    entityId: orderId,
    metadata: {
      txHash: result.txHash,
      policyId: result.policyId,
      tokenCount: result.tokenCount,
      explorerUrl: result.explorerUrl,
    },
  });

export const auditTokenTransferred = (toAddress, result) =>
  logAudit({
    action: "token.transferred",
    category: "token",
    description: `Tokens transférés : ${result.tokenCount} → ${toAddress.slice(0, 20)}…`,
    entityType: "token_transfer",
    entityId: result.txHash,
    metadata: {
      toAddress,
      txHash: result.txHash,
      tokenCount: result.tokenCount,
    },
  });

export const auditSyntheticMinted = (userId, result) =>
  logAudit({
    action: "token.synthetic_minted",
    category: "vault",
    description: `Tokens synthétiques mintés : ${result.tokenCount} sBF tokens`,
    entityType: "vault_position",
    entityId: userId,
    metadata: {
      txHash: result.txHash,
      tokenCount: result.tokenCount,
      syntheticPolicyId: result.syntheticPolicyId,
    },
  });

export const auditSyntheticBurned = (userId, result) =>
  logAudit({
    action: "token.synthetic_burned",
    category: "vault",
    description: `Tokens synthétiques brûlés : ${result.tokenCount} tokens déverrouillés`,
    entityType: "vault_position",
    entityId: userId,
    metadata: {
      txHash: result.txHash,
      tokenCount: result.tokenCount,
    },
  });

// Compliance
export const auditWhitelistAdded = (address, fundSlug) =>
  logAudit({
    action: "compliance.whitelist_added",
    category: "compliance",
    description: `Adresse whitelistée : ${address.slice(0, 20)}… pour ${fundSlug}`,
    entityType: "whitelist",
    entityId: address,
    metadata: { address, fundSlug },
  });

export const auditAddressFrozen = (address, fundSlug, reason) =>
  logAudit({
    action: "compliance.address_frozen",
    category: "compliance",
    description: `Adresse gelée : ${address.slice(0, 20)}… — ${reason}`,
    entityType: "whitelist",
    entityId: address,
    severity: "critical",
    metadata: { address, fundSlug, reason },
  });

export const auditAddressUnfrozen = (address, fundSlug) =>
  logAudit({
    action: "compliance.address_unfrozen",
    category: "compliance",
    description: `Adresse dégelée : ${address.slice(0, 20)}…`,
    entityType: "whitelist",
    entityId: address,
    metadata: { address, fundSlug },
  });

// ─── Lecture des logs (admin) ───
export async function fetchAuditLogs({ limit = 100, offset = 0, category = null, severity = null, search = null } = {}) {
  if (!supabase) return [];

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq("category", category);
  if (severity) query = query.eq("severity", severity);
  if (search) query = query.or(`description.ilike.%${search}%,user_email.ilike.%${search}%,action.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) {
    console.error("[AUDIT] Failed to fetch logs:", error.message);
    return [];
  }
  return data;
}

export async function fetchAuditStats() {
  if (!supabase) return { total: 0, today: 0, critical: 0, categories: {} };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalRes, todayRes, criticalRes] = await Promise.all([
    supabase.from("audit_logs").select("id", { count: "exact", head: true }),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }).eq("severity", "critical"),
  ]);

  return {
    total: totalRes.count || 0,
    today: todayRes.count || 0,
    critical: criticalRes.count || 0,
  };
}
