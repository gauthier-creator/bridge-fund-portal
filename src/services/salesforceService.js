import { supabase } from "../lib/supabase";

/* ── helpers ── */
const dbToConfig = (row) => row ? {
  id: row.id,
  provider: row.provider,
  instanceUrl: row.instance_url,
  accessToken: row.access_token,
  refreshToken: row.refresh_token,
  tokenExpiresAt: row.token_expires_at,
  clientId: row.client_id,
  clientSecret: row.client_secret,
  connectedBy: row.connected_by,
  connectedAt: row.connected_at,
  status: row.status,
  syncEnabled: row.sync_enabled,
  syncFrequency: row.sync_frequency,
  fieldMappings: row.field_mappings || {},
  enabledObjects: row.enabled_objects || ["profiles","orders","funds"],
  lastSyncAt: row.last_sync_at,
  metadata: row.metadata || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
} : null;

const dbToLog = (row) => row ? {
  id: row.id,
  integrationId: row.integration_id,
  syncType: row.sync_type,
  direction: row.direction,
  status: row.status,
  objectType: row.object_type,
  recordsSynced: row.records_synced,
  recordsFailed: row.records_failed,
  recordsSkipped: row.records_skipped,
  errorDetails: row.error_details || [],
  startedAt: row.started_at,
  completedAt: row.completed_at,
  triggeredBy: row.triggered_by,
  metadata: row.metadata || {},
} : null;

/* ── default field mappings ── */
export function getDefaultFieldMappings() {
  return {
    profiles: {
      sfObject: "Account",
      label: "Investisseurs",
      icon: "👤",
      fields: {
        full_name: { sf: "Name", label: "Nom complet", required: true },
        email: { sf: "PersonEmail", label: "Email", required: true },
        company: { sf: "Company", label: "Société", required: false },
        phone: { sf: "Phone", label: "Téléphone", required: false },
        address: { sf: "BillingStreet", label: "Adresse", required: false },
        country: { sf: "BillingCountry", label: "Pays", required: false },
        kyc_status: { sf: "KYC_Status__c", label: "Statut KYC", required: false },
        pep_status: { sf: "PEP_Status__c", label: "Statut PEP", required: false },
        investor_type: { sf: "Investor_Type__c", label: "Type investisseur", required: false },
        investor_classification: { sf: "Investor_Classification__c", label: "Classification", required: false },
        wallet_address: { sf: "Wallet_Address__c", label: "Wallet Cardano", required: false },
        source_of_funds: { sf: "Source_Of_Funds__c", label: "Origine des fonds", required: false },
      }
    },
    orders: {
      sfObject: "Opportunity",
      label: "Souscriptions",
      icon: "📋",
      fields: {
        lp_name: { sf: "Name", label: "Nom investisseur", required: true },
        montant: { sf: "Amount", label: "Montant", required: true },
        share_class: { sf: "Share_Class__c", label: "Classe de parts", required: false },
        status: { sf: "StageName", label: "Statut", required: true },
        payment_status: { sf: "Payment_Status__c", label: "Statut paiement", required: false },
        signature_date: { sf: "CloseDate", label: "Date signature", required: true },
        kyc_status: { sf: "KYC_Status__c", label: "Statut KYC", required: false },
        payment_method: { sf: "Payment_Method__c", label: "Méthode paiement", required: false },
      }
    },
    funds: {
      sfObject: "Product2",
      label: "Fonds",
      icon: "💰",
      fields: {
        fund_name: { sf: "Name", label: "Nom du fonds", required: true },
        nav_per_share: { sf: "NAV_Per_Share__c", label: "VNI par part", required: false },
        fund_size: { sf: "Fund_Size__c", label: "Taille du fonds", required: false },
        target_return: { sf: "Target_Return__c", label: "Rendement cible", required: false },
        minimum_investment: { sf: "Min_Investment__c", label: "Investissement min.", required: false },
        jurisdiction: { sf: "Jurisdiction__c", label: "Juridiction", required: false },
        legal_form: { sf: "Legal_Form__c", label: "Forme juridique", required: false },
        currency: { sf: "CurrencyIsoCode", label: "Devise", required: false },
      }
    },
    audit_logs: {
      sfObject: "Task",
      label: "Audit",
      icon: "📝",
      fields: {
        action: { sf: "Subject", label: "Action", required: true },
        category: { sf: "Type", label: "Catégorie", required: false },
        severity: { sf: "Priority", label: "Sévérité", required: false },
        entity_type: { sf: "WhatId", label: "Type d'entité", required: false },
        created_at: { sf: "ActivityDate", label: "Date", required: true },
      }
    },
    vault_positions: {
      sfObject: "Vault_Position__c",
      label: "Vault",
      icon: "🔐",
      fields: {
        security_token_count: { sf: "Security_Tokens__c", label: "Tokens sécurisés", required: false },
        synthetic_token_count: { sf: "Synthetic_Tokens__c", label: "Tokens synthétiques", required: false },
        wallet_address: { sf: "Wallet__c", label: "Wallet", required: false },
        status: { sf: "Status__c", label: "Statut", required: false },
      }
    }
  };
}

/* ── SF standard fields for each object type ── */
export function getSalesforceFields(objectType) {
  const commonFields = ["Id", "Name", "CreatedDate", "LastModifiedDate", "OwnerId"];
  const objectFields = {
    Account: [...commonFields, "PersonEmail", "Company", "Phone", "BillingStreet", "BillingCity", "BillingCountry", "Industry", "Type", "Description", "Website"],
    Opportunity: [...commonFields, "Amount", "StageName", "CloseDate", "Probability", "Type", "Description", "LeadSource", "NextStep"],
    Product2: [...commonFields, "ProductCode", "Description", "IsActive", "Family", "CurrencyIsoCode"],
    Task: [...commonFields, "Subject", "Status", "Priority", "Type", "ActivityDate", "Description", "WhatId", "WhoId"],
  };
  return objectFields[objectType] || commonFields;
}

/* ── CRUD ── */
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

export async function saveCRMConfig(config) {
  if (!supabase) return null;
  const payload = {
    provider: "salesforce",
    instance_url: config.instanceUrl,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    sync_enabled: config.syncEnabled,
    sync_frequency: config.syncFrequency,
    field_mappings: config.fieldMappings,
    enabled_objects: config.enabledObjects,
    updated_at: new Date().toISOString(),
  };

  if (config.id) {
    const { data, error } = await supabase
      .from("crm_integrations")
      .update(payload)
      .eq("id", config.id)
      .select()
      .single();
    if (error) throw error;
    return dbToConfig(data);
  } else {
    const { data, error } = await supabase
      .from("crm_integrations")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return dbToConfig(data);
  }
}

export async function connectCRM(integrationId, connectionData) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("crm_integrations")
    .update({
      status: "connected",
      access_token: connectionData.accessToken,
      refresh_token: connectionData.refreshToken,
      token_expires_at: connectionData.tokenExpiresAt,
      instance_url: connectionData.instanceUrl,
      connected_by: connectionData.userId,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", integrationId)
    .select()
    .single();
  if (error) throw error;
  return dbToConfig(data);
}

export async function disconnectCRM(integrationId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("crm_integrations")
    .update({
      status: "disconnected",
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      connected_at: null,
      sync_enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", integrationId)
    .select()
    .single();
  if (error) throw error;
  return dbToConfig(data);
}

/* ── Sync ── */
export async function triggerSync(integrationId, objectType = null, userId = null) {
  if (!supabase) return null;

  // Create sync log
  const logPayload = {
    integration_id: integrationId,
    sync_type: "manual",
    direction: "push",
    status: "running",
    object_type: objectType || "all",
    triggered_by: userId,
  };
  const { data: log, error: logErr } = await supabase
    .from("crm_sync_logs")
    .insert(logPayload)
    .select()
    .single();
  if (logErr) throw logErr;

  // Simulate sync (in production: call Supabase Edge Function)
  const objects = objectType ? [objectType] : ["profiles", "orders", "funds"];
  let totalSynced = 0, totalFailed = 0;

  for (const obj of objects) {
    // Count records in source table
    const { count } = await supabase
      .from(obj === "audit_logs" ? "audit_logs" : obj)
      .select("*", { count: "exact", head: true });

    const synced = count || 0;
    totalSynced += synced;
  }

  // Complete the sync log
  const { data: updated, error: updErr } = await supabase
    .from("crm_sync_logs")
    .update({
      status: totalFailed > 0 ? "partial" : "success",
      records_synced: totalSynced,
      records_failed: totalFailed,
      completed_at: new Date().toISOString(),
    })
    .eq("id", log.id)
    .select()
    .single();
  if (updErr) throw updErr;

  // Update last_sync_at on integration
  await supabase
    .from("crm_integrations")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", integrationId);

  return dbToLog(updated);
}

/* ── Sync logs ── */
export async function fetchSyncLogs(integrationId, limit = 50) {
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
  const { data, error } = await supabase
    .from("crm_sync_logs")
    .select("*")
    .eq("integration_id", integrationId)
    .order("started_at", { ascending: false });
  if (error) throw error;
  const logs = data || [];
  return {
    total: logs.length,
    successful: logs.filter(l => l.status === "success").length,
    totalRecords: logs.reduce((s, l) => s + (l.records_synced || 0), 0),
    totalErrors: logs.reduce((s, l) => s + (l.records_failed || 0), 0),
    lastSync: logs[0]?.started_at || null,
  };
}
