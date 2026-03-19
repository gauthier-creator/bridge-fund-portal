import { useState, useEffect, useCallback } from "react";
import { KPICard, Badge, inputCls, selectCls, labelCls, fmt } from "./shared";
import {
  fetchCRMConfig, saveCRMConfig, connectCRM, disconnectCRM,
  triggerSync, fetchSyncLogs, fetchSyncStats,
  getDefaultFieldMappings, getSalesforceFields,
} from "../services/salesforceService";

/* ══════════════════════════════════════════
   Salesforce CRM Integration — Admin Panel
   ══════════════════════════════════════════ */

const TABS = [
  { id: "connection", label: "Connexion" },
  { id: "mapping", label: "Mapping" },
  { id: "sync", label: "Synchronisation" },
  { id: "history", label: "Historique" },
  { id: "settings", label: "Paramètres" },
];

const STATUS_MAP = {
  connected: { label: "Connecté", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  disconnected: { label: "Déconnecté", cls: "bg-red-50 text-red-600 border-red-200" },
  error: { label: "Erreur", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  success: { label: "Succès", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  running: { label: "En cours", cls: "bg-blue-50 text-blue-600 border-blue-200" },
  partial: { label: "Partiel", cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.error;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full border ${s.cls}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${status === "connected" || status === "success" ? "bg-emerald-500" : status === "running" ? "bg-blue-500 animate-pulse" : status === "disconnected" ? "bg-red-400" : "bg-amber-500"}`} />
    {s.label}
  </span>;
}

function SfLogo({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M10 3.2c.9-.8 2-.9 3.1-.6 1.1.3 1.9 1.1 2.4 2 .7-.4 1.5-.5 2.3-.3 1.7.5 2.8 2.1 2.7 3.9 1.5.5 2.5 1.9 2.5 3.5 0 2.1-1.7 3.7-3.7 3.7h-.3c-.5 1.6-2 2.7-3.7 2.7-1 0-1.9-.4-2.6-1-.7.7-1.6 1-2.6 1-1.7 0-3.2-1.1-3.7-2.7H6c-1.1 0-2.1-.5-2.8-1.3-.7-.8-1-1.8-.9-2.8.1-1.5 1.1-2.7 2.5-3.1-.2-1.7.8-3.4 2.5-3.9.5-.2 1.1-.2 1.6-.1.5-1 1.3-1.6 2.3-1.9l-.2.1z" fill="#00A1E0"/>
  </svg>;
}

function timeAgo(dateStr) {
  if (!dateStr) return "Jamais";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/* ── MAIN COMPONENT ── */
export default function SalesforceIntegration({ toast }) {
  const [tab, setTab] = useState("connection");
  const [config, setConfig] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, successful: 0, totalRecords: 0, totalErrors: 0, lastSync: null });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Form state
  const [formUrl, setFormUrl] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [formClientSecret, setFormClientSecret] = useState("");
  const [mappings, setMappings] = useState(getDefaultFieldMappings());
  const [enabledObjects, setEnabledObjects] = useState(["profiles", "orders", "funds"]);
  const [syncFrequency, setSyncFrequency] = useState("manual");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const cfg = await fetchCRMConfig();
      if (cfg) {
        setConfig(cfg);
        setFormUrl(cfg.instanceUrl || "");
        setFormClientId(cfg.clientId || "");
        setFormClientSecret(cfg.clientSecret || "");
        if (cfg.fieldMappings && Object.keys(cfg.fieldMappings).length > 0) setMappings(cfg.fieldMappings);
        setEnabledObjects(cfg.enabledObjects || ["profiles", "orders", "funds"]);
        setSyncFrequency(cfg.syncFrequency || "manual");
        const [logsData, statsData] = await Promise.all([
          fetchSyncLogs(cfg.id),
          fetchSyncStats(cfg.id),
        ]);
        setLogs(logsData);
        setStats(statsData);
      }
    } catch (e) {
      console.error("CRM load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── HANDLERS ── */
  const handleConnect = async () => {
    try {
      setConnecting(true);
      // Save config first
      let cfg = config;
      if (!cfg) {
        cfg = await saveCRMConfig({
          instanceUrl: formUrl,
          clientId: formClientId,
          clientSecret: formClientSecret,
          fieldMappings: mappings,
          enabledObjects,
          syncFrequency,
          syncEnabled: true,
        });
      } else {
        cfg = await saveCRMConfig({
          ...cfg, instanceUrl: formUrl, clientId: formClientId, clientSecret: formClientSecret,
        });
      }
      // Simulate OAuth (in prod: redirect to SF OAuth endpoint)
      await new Promise(r => setTimeout(r, 1500));
      const connected = await connectCRM(cfg.id, {
        accessToken: "demo_sf_access_token_" + Date.now(),
        refreshToken: "demo_sf_refresh_token_" + Date.now(),
        tokenExpiresAt: new Date(Date.now() + 7200000).toISOString(),
        instanceUrl: formUrl || "https://swisslife.my.salesforce.com",
        userId: null,
      });
      setConfig(connected);
      toast?.({ type: "success", message: "Salesforce connecté avec succès" });
    } catch (e) {
      toast?.({ type: "error", message: "Erreur de connexion : " + e.message });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!config?.id) return;
    try {
      const updated = await disconnectCRM(config.id);
      setConfig(updated);
      toast?.({ type: "success", message: "Salesforce déconnecté" });
    } catch (e) {
      toast?.({ type: "error", message: "Erreur : " + e.message });
    }
  };

  const handleSync = async (objectType = null) => {
    if (!config?.id) return;
    try {
      setSyncing(true);
      const result = await triggerSync(config.id, objectType);
      toast?.({ type: "success", message: `Sync terminée : ${result.recordsSynced} enregistrements synchronisés` });
      await load();
    } catch (e) {
      toast?.({ type: "error", message: "Erreur de sync : " + e.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveMappings = async () => {
    try {
      const updated = await saveCRMConfig({ ...config, fieldMappings: mappings, enabledObjects });
      setConfig(updated);
      toast?.({ type: "success", message: "Mappings sauvegardés" });
    } catch (e) {
      toast?.({ type: "error", message: "Erreur : " + e.message });
    }
  };

  const handleSaveSettings = async () => {
    try {
      const updated = await saveCRMConfig({ ...config, syncFrequency, enabledObjects, syncEnabled: syncFrequency !== "manual" });
      setConfig(updated);
      toast?.({ type: "success", message: "Paramètres sauvegardés" });
    } catch (e) {
      toast?.({ type: "error", message: "Erreur : " + e.message });
    }
  };

  const isConnected = config?.status === "connected";

  if (loading) return <div className="flex items-center justify-center py-20">
    <div className="w-6 h-6 border-2 border-[#4F7DF3] border-t-transparent rounded-full animate-spin" />
  </div>;

  /* ══════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00A1E0]/10 flex items-center justify-center">
            <SfLogo size={22} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-[#0D0D12]">Salesforce CRM</h2>
            <p className="text-[12px] text-[#9AA4B2]">Synchronisez vos données avec le CRM SwissLife</p>
          </div>
        </div>
        <StatusBadge status={config?.status || "disconnected"} />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-[#F7F8FA] rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2 text-[12px] font-medium rounded-lg transition-all ${tab === t.id ? "bg-white text-[#0D0D12] shadow-sm" : "text-[#9AA4B2] hover:text-[#5F6B7A]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: CONNEXION ── */}
      {tab === "connection" && (
        <div className="space-y-5">
          {/* KPI Row */}
          <div className="grid grid-cols-4 gap-4">
            <KPICard label="Statut" value={isConnected ? "Connecté" : "Déconnecté"}
              sub={isConnected ? config.instanceUrl : "Non configuré"}
              color={isConnected ? "#059669" : "#DC2626"} />
            <KPICard label="Dernière sync" value={timeAgo(stats.lastSync)}
              sub={stats.lastSync ? new Date(stats.lastSync).toLocaleString("fr-FR") : ""} color="#4F7DF3" />
            <KPICard label="Enregistrements" value={fmt(stats.totalRecords)}
              sub={`${stats.total} synchronisations`} color="#4F7DF3" />
            <KPICard label="Erreurs" value={fmt(stats.totalErrors)}
              sub={stats.totalErrors > 0 ? "À corriger" : "Aucune erreur"} color={stats.totalErrors > 0 ? "#DC2626" : "#059669"} />
          </div>

          {!isConnected ? (
            <div className="bg-white rounded-2xl border border-[#E8ECF1] p-6 space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-[#E8ECF1]">
                <SfLogo size={28} />
                <div>
                  <h3 className="text-[14px] font-semibold text-[#0D0D12]">Connecter Salesforce</h3>
                  <p className="text-[12px] text-[#9AA4B2]">Configurez la connexion OAuth2 avec votre instance Salesforce</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className={labelCls}>Instance URL</label>
                  <input className={inputCls} placeholder="https://swisslife.my.salesforce.com"
                    value={formUrl} onChange={e => setFormUrl(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Client ID (Connected App)</label>
                    <input className={inputCls} placeholder="3MVG9..."
                      value={formClientId} onChange={e => setFormClientId(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Client Secret</label>
                    <input className={inputCls} type="password" placeholder="••••••••"
                      value={formClientSecret} onChange={e => setFormClientSecret(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleConnect} disabled={connecting || !formUrl}
                  className="px-5 py-2.5 bg-[#00A1E0] text-white text-[13px] font-semibold rounded-xl hover:bg-[#0081B8] transition-colors disabled:opacity-50 flex items-center gap-2">
                  {connecting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <SfLogo size={16} />}
                  {connecting ? "Connexion en cours..." : "Connecter via OAuth2"}
                </button>
                <span className="text-[11px] text-[#9AA4B2]">Vous serez redirigé vers Salesforce pour autoriser l'accès</span>
              </div>

              {/* Info box */}
              <div className="bg-[#F0F7FF] rounded-xl p-4 border border-[#D0E2FF]">
                <p className="text-[12px] text-[#1E3A5F] font-medium mb-2">📋 Prérequis Salesforce</p>
                <ul className="text-[11px] text-[#5F6B7A] space-y-1">
                  <li>• Créer une Connected App dans Salesforce Setup → App Manager</li>
                  <li>• Activer OAuth avec les scopes : api, refresh_token, offline_access</li>
                  <li>• Callback URL : {window.location.origin}/oauth/salesforce/callback</li>
                  <li>• Créer les champs personnalisés (__c) dans Salesforce pour les champs métier</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E8ECF1] p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#E8ECF1]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#0D0D12]">Salesforce connecté</h3>
                    <p className="text-[12px] text-[#9AA4B2]">{config.instanceUrl}</p>
                  </div>
                </div>
                <button onClick={handleDisconnect}
                  className="px-4 py-2 text-[12px] font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                  Déconnecter
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 text-[12px]">
                <div className="bg-[#F7F8FA] rounded-xl p-3">
                  <p className="text-[#9AA4B2] mb-1">Instance</p>
                  <p className="text-[#0D0D12] font-medium">{config.instanceUrl}</p>
                </div>
                <div className="bg-[#F7F8FA] rounded-xl p-3">
                  <p className="text-[#9AA4B2] mb-1">Connecté le</p>
                  <p className="text-[#0D0D12] font-medium">{config.connectedAt ? new Date(config.connectedAt).toLocaleDateString("fr-FR") : "—"}</p>
                </div>
                <div className="bg-[#F7F8FA] rounded-xl p-3">
                  <p className="text-[#9AA4B2] mb-1">Fréquence sync</p>
                  <p className="text-[#0D0D12] font-medium capitalize">{config.syncFrequency}</p>
                </div>
              </div>

              {/* Quick sync button */}
              <button onClick={() => handleSync()} disabled={syncing}
                className="w-full py-3 bg-[#0D0D12] text-white text-[13px] font-semibold rounded-xl hover:bg-[#1a1a24] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {syncing ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {syncing ? "Synchronisation en cours..." : "Synchroniser maintenant"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: MAPPING ── */}
      {tab === "mapping" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#9AA4B2]">Configurez le mapping entre les champs Bridge Fund et Salesforce</p>
            <div className="flex gap-2">
              <button onClick={() => setMappings(getDefaultFieldMappings())}
                className="px-3 py-1.5 text-[11px] font-medium text-[#9AA4B2] border border-[#E8ECF1] rounded-lg hover:bg-[#F7F8FA]">
                Réinitialiser
              </button>
              <button onClick={handleSaveMappings}
                className="px-4 py-1.5 text-[11px] font-semibold text-white bg-[#0D0D12] rounded-lg hover:bg-[#1a1a24]">
                Sauvegarder
              </button>
            </div>
          </div>

          {Object.entries(mappings).map(([objKey, objDef]) => {
            const isEnabled = enabledObjects.includes(objKey);
            return (
              <div key={objKey} className={`bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden transition-opacity ${isEnabled ? "" : "opacity-50"}`}>
                <div className="flex items-center justify-between px-5 py-3 bg-[#F7F8FA] border-b border-[#E8ECF1]">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px]">{objDef.icon}</span>
                    <span className="text-[13px] font-semibold text-[#0D0D12]">{objDef.label}</span>
                    <span className="text-[11px] text-[#9AA4B2]">→ SF {objDef.sfObject}</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[11px] text-[#9AA4B2]">{isEnabled ? "Actif" : "Inactif"}</span>
                    <div className={`w-8 h-4.5 rounded-full relative cursor-pointer transition-colors ${isEnabled ? "bg-[#059669]" : "bg-[#D1D5DB]"}`}
                      onClick={() => setEnabledObjects(prev => isEnabled ? prev.filter(o => o !== objKey) : [...prev, objKey])}>
                      <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${isEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                    </div>
                  </label>
                </div>
                {isEnabled && (
                  <div className="divide-y divide-[#F0F2F5]">
                    <div className="grid grid-cols-12 gap-2 px-5 py-2 text-[10px] font-semibold text-[#9AA4B2] uppercase tracking-[0.08em]">
                      <div className="col-span-4">Champ Bridge Fund</div>
                      <div className="col-span-1 text-center">→</div>
                      <div className="col-span-4">Champ Salesforce</div>
                      <div className="col-span-2">Type</div>
                      <div className="col-span-1 text-center">Requis</div>
                    </div>
                    {Object.entries(objDef.fields).map(([fieldKey, fieldDef]) => {
                      const sfFields = getSalesforceFields(objDef.sfObject);
                      return (
                        <div key={fieldKey} className="grid grid-cols-12 gap-2 px-5 py-2 items-center hover:bg-[#FAFBFC] transition-colors">
                          <div className="col-span-4">
                            <span className="text-[12px] text-[#0D0D12] font-medium">{fieldDef.label}</span>
                            <span className="ml-1.5 text-[10px] text-[#C4C9D2] font-mono">{fieldKey}</span>
                          </div>
                          <div className="col-span-1 text-center text-[#C4C9D2]">→</div>
                          <div className="col-span-4">
                            <select className="w-full px-2 py-1 text-[11px] border border-[#E8ECF1] rounded-lg bg-white text-[#0D0D12] focus:ring-1 focus:ring-[#4F7DF3]/20 focus:border-[#4F7DF3]"
                              value={fieldDef.sf}
                              onChange={e => {
                                const updated = { ...mappings };
                                updated[objKey].fields[fieldKey].sf = e.target.value;
                                setMappings(updated);
                              }}>
                              <option value="">— Non mappé —</option>
                              {sfFields.map(f => <option key={f} value={f}>{f}</option>)}
                              <option value={fieldDef.sf}>{fieldDef.sf} (custom)</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0F2F5] text-[#5F6B7A] font-mono">
                              {fieldDef.sf?.includes("__c") ? "Custom" : "Standard"}
                            </span>
                          </div>
                          <div className="col-span-1 text-center">
                            {fieldDef.required && <span className="text-[10px] text-red-400 font-bold">●</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: SYNC ── */}
      {tab === "sync" && (
        <div className="space-y-5">
          {/* KPI */}
          <div className="grid grid-cols-4 gap-4">
            <KPICard label="Total synchronisés" value={fmt(stats.totalRecords)} sub={`${stats.total} opérations`} color="#4F7DF3" />
            <KPICard label="Dernière sync" value={timeAgo(stats.lastSync)} sub="" color="#059669" />
            <KPICard label="Erreurs" value={fmt(stats.totalErrors)} sub={stats.totalErrors > 0 ? "À résoudre" : "Tout est OK"} color={stats.totalErrors > 0 ? "#DC2626" : "#059669"} />
            <KPICard label="Taux de réussite" value={stats.total > 0 ? `${Math.round((stats.successful / stats.total) * 100)}%` : "—"} sub={`${stats.successful}/${stats.total} réussies`} color="#4F7DF3" />
          </div>

          {!isConnected && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[12px] text-amber-800">
              ⚠️ Connectez d'abord Salesforce dans l'onglet "Connexion" pour synchroniser les données.
            </div>
          )}

          {/* Per-object sync cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[#0D0D12]">Synchronisation par objet</h3>
              <button onClick={() => handleSync()} disabled={syncing || !isConnected}
                className="px-4 py-2 bg-[#0D0D12] text-white text-[12px] font-semibold rounded-xl hover:bg-[#1a1a24] disabled:opacity-40 flex items-center gap-2">
                {syncing && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Tout synchroniser
              </button>
            </div>

            {Object.entries(mappings).filter(([k]) => enabledObjects.includes(k)).map(([objKey, objDef]) => {
              const lastObjSync = logs.find(l => l.objectType === objKey);
              return (
                <div key={objKey} className="bg-white rounded-xl border border-[#E8ECF1] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[18px]">{objDef.icon}</span>
                    <div>
                      <p className="text-[13px] font-medium text-[#0D0D12]">{objDef.label}</p>
                      <p className="text-[11px] text-[#9AA4B2]">→ Salesforce {objDef.sfObject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[11px] text-[#9AA4B2]">Dernière sync</p>
                      <p className="text-[12px] text-[#0D0D12] font-medium">{lastObjSync ? timeAgo(lastObjSync.startedAt) : "Jamais"}</p>
                    </div>
                    {lastObjSync && <StatusBadge status={lastObjSync.status} />}
                    <button onClick={() => handleSync(objKey)} disabled={syncing || !isConnected}
                      className="px-3 py-1.5 text-[11px] font-medium text-[#4F7DF3] border border-[#4F7DF3]/20 rounded-lg hover:bg-[#4F7DF3]/5 disabled:opacity-40 transition-colors">
                      Sync
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Data preview */}
          <div className="bg-[#F7F8FA] rounded-xl p-4 border border-[#E8ECF1]">
            <p className="text-[11px] text-[#9AA4B2] font-medium mb-2">📊 Résumé des données</p>
            <p className="text-[11px] text-[#5F6B7A]">
              Les données sont poussées vers Salesforce via l'API REST (v59.0). Les enregistrements existants sont mis à jour (upsert), les nouveaux sont créés automatiquement. Les champs custom (__c) doivent être préalablement créés dans Salesforce Setup.
            </p>
          </div>
        </div>
      )}

      {/* ── TAB: HISTORY ── */}
      {tab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#0D0D12]">Historique des synchronisations</h3>
            <span className="text-[11px] text-[#9AA4B2]">{logs.length} entrées</span>
          </div>

          {logs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8ECF1] p-12 text-center">
              <div className="text-[32px] mb-3">📭</div>
              <p className="text-[13px] text-[#0D0D12] font-medium">Aucune synchronisation</p>
              <p className="text-[11px] text-[#9AA4B2] mt-1">Lancez une première sync pour voir l'historique ici</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F7F8FA] border-b border-[#E8ECF1]">
                    {["Date", "Type", "Objet", "Enregistrements", "Erreurs", "Durée", "Statut"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-[10px] font-semibold text-[#9AA4B2] uppercase tracking-[0.08em]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F2F5]">
                  {logs.map(log => {
                    const duration = log.completedAt && log.startedAt
                      ? Math.round((new Date(log.completedAt) - new Date(log.startedAt)) / 1000) + "s"
                      : "—";
                    return (
                      <tr key={log.id} className="hover:bg-[#FAFBFC] transition-colors">
                        <td className="px-4 py-3 text-[12px] text-[#0D0D12]">
                          {new Date(log.startedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F0F2F5] text-[#5F6B7A] font-medium capitalize">{log.syncType}</span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#0D0D12] capitalize">{log.objectType}</td>
                        <td className="px-4 py-3 text-[12px] text-[#0D0D12] font-medium">{log.recordsSynced}</td>
                        <td className="px-4 py-3 text-[12px]">
                          <span className={log.recordsFailed > 0 ? "text-red-600 font-medium" : "text-[#9AA4B2]"}>{log.recordsFailed}</span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#9AA4B2] font-mono">{duration}</td>
                        <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: SETTINGS ── */}
      {tab === "settings" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[#E8ECF1] p-6 space-y-5">
            <h3 className="text-[14px] font-semibold text-[#0D0D12]">Fréquence de synchronisation</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { val: "manual", label: "Manuel", desc: "Sync à la demande uniquement" },
                { val: "hourly", label: "Toutes les heures", desc: "Sync automatique chaque heure" },
                { val: "daily", label: "Quotidien", desc: "Sync chaque jour à 2h00" },
                { val: "realtime", label: "Temps réel", desc: "Sync instantanée sur chaque changement" },
              ].map(opt => (
                <button key={opt.val} onClick={() => setSyncFrequency(opt.val)}
                  className={`p-4 rounded-xl border text-left transition-all ${syncFrequency === opt.val ? "border-[#4F7DF3] bg-[#4F7DF3]/5 ring-1 ring-[#4F7DF3]/20" : "border-[#E8ECF1] hover:border-[#C4C9D2]"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${syncFrequency === opt.val ? "border-[#4F7DF3]" : "border-[#D1D5DB]"}`}>
                      {syncFrequency === opt.val && <div className="w-1.5 h-1.5 rounded-full bg-[#4F7DF3]" />}
                    </div>
                    <span className="text-[12px] font-semibold text-[#0D0D12]">{opt.label}</span>
                  </div>
                  <p className="text-[10px] text-[#9AA4B2] ml-5.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8ECF1] p-6 space-y-4">
            <h3 className="text-[14px] font-semibold text-[#0D0D12]">Objets à synchroniser</h3>
            {Object.entries(mappings).map(([key, def]) => (
              <label key={key} className="flex items-center justify-between py-2 cursor-pointer group">
                <div className="flex items-center gap-3">
                  <span className="text-[16px]">{def.icon}</span>
                  <div>
                    <p className="text-[13px] font-medium text-[#0D0D12]">{def.label}</p>
                    <p className="text-[11px] text-[#9AA4B2]">→ Salesforce {def.sfObject}</p>
                  </div>
                </div>
                <div className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${enabledObjects.includes(key) ? "bg-[#059669]" : "bg-[#D1D5DB]"}`}
                  onClick={() => setEnabledObjects(prev => prev.includes(key) ? prev.filter(o => o !== key) : [...prev, key])}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabledObjects.includes(key) ? "translate-x-4.5" : "translate-x-0.5"}`} />
                </div>
              </label>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-[#E8ECF1] p-6 space-y-4">
            <h3 className="text-[14px] font-semibold text-[#0D0D12]">Direction de synchronisation</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: "push", label: "Push (→ SF)", desc: "Bridge Fund vers Salesforce", icon: "→" },
                { val: "pull", label: "Pull (← SF)", desc: "Salesforce vers Bridge Fund", icon: "←" },
                { val: "bidirectional", label: "Bidirectionnel", desc: "Sync dans les deux sens", icon: "⇄" },
              ].map(opt => (
                <button key={opt.val}
                  className={`p-4 rounded-xl border text-left transition-all ${opt.val === "push" ? "border-[#4F7DF3] bg-[#4F7DF3]/5 ring-1 ring-[#4F7DF3]/20" : "border-[#E8ECF1] hover:border-[#C4C9D2]"}`}>
                  <span className="text-[18px] block mb-2">{opt.icon}</span>
                  <p className="text-[12px] font-semibold text-[#0D0D12]">{opt.label}</p>
                  <p className="text-[10px] text-[#9AA4B2]">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSaveSettings}
            className="w-full py-3 bg-[#0D0D12] text-white text-[13px] font-semibold rounded-xl hover:bg-[#1a1a24] transition-colors">
            Sauvegarder les paramètres
          </button>
        </div>
      )}
    </div>
  );
}
