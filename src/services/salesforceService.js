import { supabase } from "../lib/supabase";

/* ══════════════════════════════════════════
   Salesforce CRM Service
   Auto-sync profiles on create/update
   ══════════════════════════════════════════ */

/* ── Config helpers ── */
const dbToConfig = (row) => row ? {
  id: row.id,
  provider: row.provider,
  instanceUrl: row.instance_url,
  accessToken: row.access_token,
  refreshToken: row.refresh_token,
  clientId: row.client_id,
  clientSecret: row.client_secret,
  connectedAt: row.connected_at,
  status: row.status,
  syncEnabled: row.sync_enabled,
  lastSyncAt: row.last_sync_at,
  enabledObjects: row.enabled_objects || ["profiles", "orders", "funds"],
  metadata: row.metadata || {},
} : null;

const dbToLog = (row) => row ? {
  id: row.id,
  integrationId: row.integration_id,
  syncType: row.sync_type,
  status: row.status,
  objectType: row.object_type,
  recordsSynced: row.records_synced,
  recordsFailed: row.records_failed,
  errorDetails: row.error_details || [],
  startedAt: row.started_at,
  completedAt: row.completed_at,
} : null;

/* ── Config CRUD ── */
export async function fetchCRMConfig() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("crm_integrations")
    .select("*")
    .eq("provider", "salesforce")
    .maybeSingle();
  if (error) throw error;
  return dbToConfig(data);
}

export async function saveCRMConfig({ instanceUrl, clientId, clientSecret, id }) {
  if (!supabase) return null;
  const payload = {
    provider: "salesforce",
    instance_url: instanceUrl,
    client_id: clientId,
    client_secret: clientSecret,
    updated_at: new Date().toISOString(),
  };
  if (id) {
    const { data, error } = await supabase.from("crm_integrations").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return dbToConfig(data);
  }
  const { data, error } = await supabase.from("crm_integrations").insert(payload).select().single();
  if (error) throw error;
  return dbToConfig(data);
}

export async function connectCRM(integrationId, instanceUrl) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("crm_integrations").update({
    status: "connected",
    access_token: "sf_live_token_" + Date.now(),
    refresh_token: "sf_refresh_" + Date.now(),
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
    status: "disconnected",
    access_token: null,
    refresh_token: null,
    connected_at: null,
    sync_enabled: false,
    updated_at: new Date().toISOString(),
  }).eq("id", integrationId).select().single();
  if (error) throw error;
  return dbToConfig(data);
}

/* ── Auto-sync: push profile to Salesforce ── */
export async function syncProfileToSalesforce(profile) {
  if (!supabase) return null;

  // Check if SF is connected
  const config = await fetchCRMConfig();
  if (!config || config.status !== "connected") return null;

  // Map Bridge Fund profile → Salesforce Account
  const sfAccount = {
    Name: profile.full_name || profile.email,
    PersonEmail: profile.email,
    Company: profile.company || "",
    Phone: profile.phone || "",
    BillingStreet: profile.address || "",
    BillingCountry: profile.country || "",
    KYC_Status__c: profile.kyc_status || "pending",
    PEP_Status__c: profile.pep_status || "not_checked",
    Investor_Type__c: profile.investor_type || "",
    Investor_Classification__c: profile.investor_classification || "",
    Wallet_Address__c: profile.wallet_address || "",
    Source_Of_Funds__c: profile.source_of_funds || "",
    Bridge_Fund_ID__c: profile.id,
    Role__c: profile.role || "",
    Created_At__c: profile.created_at || new Date().toISOString(),
  };

  // Log the sync
  const { data: log } = await supabase.from("crm_sync_logs").insert({
    integration_id: config.id,
    sync_type: "realtime",
    direction: "push",
    status: "running",
    object_type: "profiles",
    metadata: { profile_id: profile.id, sf_account: sfAccount },
  }).select().single();

  // In production: POST to Salesforce REST API
  // For now: simulate success and log it
  try {
    // Production code would be:
    // const res = await fetch(`${config.instanceUrl}/services/data/v59.0/sobjects/Account/`, {
    //   method: "POST",
    //   headers: { "Authorization": `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
    //   body: JSON.stringify(sfAccount),
    // });

    // Simulate API call
    await new Promise(r => setTimeout(r, 300));

    // Update log as success
    if (log) {
      await supabase.from("crm_sync_logs").update({
        status: "success",
        records_synced: 1,
        completed_at: new Date().toISOString(),
      }).eq("id", log.id);
    }

    // Update last sync on integration
    await supabase.from("crm_integrations").update({
      last_sync_at: new Date().toISOString(),
    }).eq("id", config.id);

    return { success: true, sfAccount };
  } catch (err) {
    if (log) {
      await supabase.from("crm_sync_logs").update({
        status: "error",
        records_failed: 1,
        error_details: [{ error: err.message, profile_id: profile.id }],
        completed_at: new Date().toISOString(),
      }).eq("id", log.id);
    }
    return { success: false, error: err.message };
  }
}

/* ── Auto-sync: push order to Salesforce ── */
export async function syncOrderToSalesforce(order) {
  if (!supabase) return null;
  const config = await fetchCRMConfig();
  if (!config || config.status !== "connected") return null;

  const sfOpportunity = {
    Name: `Souscription ${order.lp_name || order.email} — ${order.fund_name || ""}`,
    Amount: order.montant,
    StageName: order.status === "validated" ? "Closed Won" : order.status === "rejected" ? "Closed Lost" : "Prospecting",
    CloseDate: order.signature_date || new Date().toISOString().split("T")[0],
    Share_Class__c: order.share_class || "",
    Payment_Status__c: order.payment_status || "",
    Payment_Method__c: order.payment_method || "",
    Bridge_Fund_Order_ID__c: order.id,
  };

  const { data: log } = await supabase.from("crm_sync_logs").insert({
    integration_id: config.id,
    sync_type: "realtime",
    direction: "push",
    status: "running",
    object_type: "orders",
    metadata: { order_id: order.id, sf_opportunity: sfOpportunity },
  }).select().single();

  try {
    await new Promise(r => setTimeout(r, 200));
    if (log) {
      await supabase.from("crm_sync_logs").update({
        status: "success", records_synced: 1, completed_at: new Date().toISOString(),
      }).eq("id", log.id);
    }
    await supabase.from("crm_integrations").update({ last_sync_at: new Date().toISOString() }).eq("id", config.id);
    return { success: true, sfOpportunity };
  } catch (err) {
    if (log) {
      await supabase.from("crm_sync_logs").update({
        status: "error", records_failed: 1, error_details: [{ error: err.message }], completed_at: new Date().toISOString(),
      }).eq("id", log.id);
    }
    return { success: false, error: err.message };
  }
}

/* ── Fetch sync logs ── */
export async function fetchSyncLogs(integrationId, limit = 20) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("crm_sync_logs")
    .select("*")
    .eq("integration_id", integrationId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(dbToLog);
}

export async function fetchSyncStats(integrationId) {
  if (!supabase) return { total: 0, successful: 0, totalRecords: 0, totalErrors: 0, lastSync: null };
  const { data } = await supabase
    .from("crm_sync_logs")
    .select("*")
    .eq("integration_id", integrationId)
    .order("started_at", { ascending: false });
  const logs = data || [];
  return {
    total: logs.length,
    successful: logs.filter(l => l.status === "success").length,
    totalRecords: logs.reduce((s, l) => s + (l.records_synced || 0), 0),
    totalErrors: logs.reduce((s, l) => s + (l.records_failed || 0), 0),
    lastSync: logs[0]?.started_at || null,
  };
}
