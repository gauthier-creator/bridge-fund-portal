import { supabase } from "../lib/supabase";

/* ══════════════════════════════════════════
   Salesforce CRM Service — Real API Integration
   ══════════════════════════════════════════ */

const dbToConfig = (row) => row ? {
  id: row.id, provider: row.provider, instanceUrl: row.instance_url,
  accessToken: row.access_token, refreshToken: row.refresh_token,
  clientId: row.client_id, clientSecret: row.client_secret,
  connectedAt: row.connected_at, status: row.status,
  syncEnabled: row.sync_enabled, lastSyncAt: row.last_sync_at,
  enabledObjects: row.enabled_objects || ["profiles", "orders", "funds"],
  metadata: row.metadata || {},
} : null;

const dbToLog = (row) => row ? {
  id: row.id, integrationId: row.integration_id, syncType: row.sync_type,
  status: row.status, objectType: row.object_type,
  recordsSynced: row.records_synced, recordsFailed: row.records_failed,
  errorDetails: row.error_details || [], startedAt: row.started_at,
  completedAt: row.completed_at,
} : null;

/* ── Config CRUD ── */
export async function fetchCRMConfig() {
  if (!supabase) return null;
  const { data, error } = await supabase.from("crm_integrations").select("*").eq("provider", "salesforce").maybeSingle();
  if (error) throw error;
  return dbToConfig(data);
}

export async function saveCRMConfig({ instanceUrl, clientId, clientSecret, id }) {
  if (!supabase) return null;
  const payload = { provider: "salesforce", instance_url: instanceUrl, client_id: clientId, client_secret: clientSecret, updated_at: new Date().toISOString() };
  if (id) {
    const { data, error } = await supabase.from("crm_integrations").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return dbToConfig(data);
  }
  const { data, error } = await supabase.from("crm_integrations").insert(payload).select().single();
  if (error) throw error;
  return dbToConfig(data);
}

export async function connectCRM(integrationId, instanceUrl, accessToken) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("crm_integrations").update({
    status: "connected",
    access_token: accessToken,
    connected_at: new Date().toISOString(),
    sync_enabled: true,
    instance_url: instanceUrl,
    updated_at: new Date().toISOString(),
  }).eq("id", integrationId).select().single();
  if (error) throw error;
  return dbToConfig(data);
}

export async function disconnectCRM(integrationId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("crm_integrations").update({
    status: "disconnected", access_token: null, refresh_token: null,
    connected_at: null, sync_enabled: false, updated_at: new Date().toISOString(),
  }).eq("id", integrationId).select().single();
  if (error) throw error;
  return dbToConfig(data);
}

/* ══════════════════════════════════════════
   Real Salesforce REST API calls
   ══════════════════════════════════════════ */

async function sfApiCall(config, method, path, body = null) {
  const url = `${config.instanceUrl}/services/data/v59.0${path}`;
  const opts = {
    method,
    headers: {
      "Authorization": `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);

  if (res.status === 401) {
    // Token expired — mark as disconnected
    if (config.id) {
      await supabase.from("crm_integrations").update({ status: "error" }).eq("id", config.id);
    }
    throw new Error("Session Salesforce expirée. Veuillez vous reconnecter.");
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg = Array.isArray(errBody) ? errBody[0]?.message : errBody.message || res.statusText;
    throw new Error(`Salesforce API ${res.status}: ${msg}`);
  }

  // 201 Created or 204 No Content
  if (res.status === 204) return { success: true };
  return await res.json();
}

/* ── Sync profile → Salesforce Account ── */
export async function syncProfileToSalesforce(profile) {
  if (!supabase) return null;
  const config = await fetchCRMConfig();
  if (!config || config.status !== "connected" || !config.accessToken) return null;

  // Map to SF Account — use standard fields only (no custom __c fields that might not exist)
  const sfAccount = {
    Name: profile.full_name || profile.email || "Unknown",
    Description: [
      `Bridge Fund ID: ${profile.id}`,
      `Role: ${profile.role || "investor"}`,
      `KYC: ${profile.kyc_status || "pending"}`,
      `PEP: ${profile.pep_status || "not_checked"}`,
      `Wallet: ${profile.wallet_address || "N/A"}`,
      `Investor Type: ${profile.investor_type || "N/A"}`,
      `Source: Bridge Fund Platform`,
    ].join("\n"),
    Phone: profile.phone || undefined,
    Website: profile.wallet_address ? `https://cardanoscan.io/address/${profile.wallet_address}` : undefined,
    Industry: "Financial Services",
    Type: "Investor",
  };

  // Remove undefined values
  Object.keys(sfAccount).forEach(k => sfAccount[k] === undefined && delete sfAccount[k]);

  // Log the sync attempt
  const { data: log } = await supabase.from("crm_sync_logs").insert({
    integration_id: config.id,
    sync_type: "realtime",
    direction: "push",
    status: "running",
    object_type: "profiles",
    metadata: { profile_id: profile.id, profile_email: profile.email },
  }).select().single();

  try {
    // Real Salesforce API call
    const result = await sfApiCall(config, "POST", "/sobjects/Account/", sfAccount);

    if (log) {
      await supabase.from("crm_sync_logs").update({
        status: "success", records_synced: 1, completed_at: new Date().toISOString(),
        metadata: { profile_id: profile.id, sf_id: result.id, sf_account: sfAccount },
      }).eq("id", log.id);
    }
    await supabase.from("crm_integrations").update({ last_sync_at: new Date().toISOString() }).eq("id", config.id);
    return { success: true, sfId: result.id, sfAccount };
  } catch (err) {
    console.error("[SF Sync] Profile error:", err.message);
    if (log) {
      await supabase.from("crm_sync_logs").update({
        status: "error", records_failed: 1,
        error_details: [{ error: err.message, profile_id: profile.id }],
        completed_at: new Date().toISOString(),
      }).eq("id", log.id);
    }
    return { success: false, error: err.message };
  }
}

/* ── Sync order → Salesforce Opportunity ── */
export async function syncOrderToSalesforce(order) {
  if (!supabase) return null;
  const config = await fetchCRMConfig();
  if (!config || config.status !== "connected" || !config.accessToken) return null;

  const sfOpp = {
    Name: `Souscription — ${order.lp_name || order.email || "Investisseur"} — ${order.fund_name || "Fonds"}`,
    Amount: parseFloat(order.montant) || 0,
    StageName: order.status === "validated" ? "Closed Won" : order.status === "rejected" ? "Closed Lost" : "Prospecting",
    CloseDate: order.signature_date || new Date().toISOString().split("T")[0],
    Description: [
      `Bridge Fund Order ID: ${order.id}`,
      `Share Class: ${order.share_class || "N/A"}`,
      `Payment: ${order.payment_status || "pending"} (${order.payment_method || "SEPA"})`,
      `Source: Bridge Fund Platform`,
    ].join("\n"),
    Type: "New Business",
  };

  const { data: log } = await supabase.from("crm_sync_logs").insert({
    integration_id: config.id, sync_type: "realtime", direction: "push",
    status: "running", object_type: "orders",
    metadata: { order_id: order.id },
  }).select().single();

  try {
    const result = await sfApiCall(config, "POST", "/sobjects/Opportunity/", sfOpp);
    if (log) {
      await supabase.from("crm_sync_logs").update({
        status: "success", records_synced: 1, completed_at: new Date().toISOString(),
        metadata: { order_id: order.id, sf_id: result.id },
      }).eq("id", log.id);
    }
    await supabase.from("crm_integrations").update({ last_sync_at: new Date().toISOString() }).eq("id", config.id);
    return { success: true, sfId: result.id };
  } catch (err) {
    console.error("[SF Sync] Order error:", err.message);
    if (log) {
      await supabase.from("crm_sync_logs").update({
        status: "error", records_failed: 1,
        error_details: [{ error: err.message, order_id: order.id }],
        completed_at: new Date().toISOString(),
      }).eq("id", log.id);
    }
    return { success: false, error: err.message };
  }
}

/* ── Fetch sync logs ── */
export async function fetchSyncLogs(integrationId, limit = 20) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("crm_sync_logs").select("*")
    .eq("integration_id", integrationId).order("started_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data || []).map(dbToLog);
}

export async function fetchSyncStats(integrationId) {
  if (!supabase) return { total: 0, totalRecords: 0, totalErrors: 0, lastSync: null };
  const { data } = await supabase.from("crm_sync_logs").select("*")
    .eq("integration_id", integrationId).order("started_at", { ascending: false });
  const logs = data || [];
  return {
    total: logs.length,
    successful: logs.filter(l => l.status === "success").length,
    totalRecords: logs.reduce((s, l) => s + (l.records_synced || 0), 0),
    totalErrors: logs.reduce((s, l) => s + (l.records_failed || 0), 0),
    lastSync: logs[0]?.started_at || null,
  };
}
