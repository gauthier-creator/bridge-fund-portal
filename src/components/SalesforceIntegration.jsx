import { useState, useEffect, useCallback } from "react";
import { KPICard, fmt, inputCls, labelCls } from "./shared";
import {
  fetchCRMConfig, saveCRMConfig, connectCRM, disconnectCRM,
  fetchSyncLogs, fetchSyncStats,
} from "../services/salesforceService";

/* ══════════════════════════════════════════
   Salesforce CRM Integration — Admin Panel
   Simple: connect + auto-sync activity feed
   ══════════════════════════════════════════ */

function SfLogo({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M10 3.2c.9-.8 2-.9 3.1-.6 1.1.3 1.9 1.1 2.4 2 .7-.4 1.5-.5 2.3-.3 1.7.5 2.8 2.1 2.7 3.9 1.5.5 2.5 1.9 2.5 3.5 0 2.1-1.7 3.7-3.7 3.7h-.3c-.5 1.6-2 2.7-3.7 2.7-1 0-1.9-.4-2.6-1-.7.7-1.6 1-2.6 1-1.7 0-3.2-1.1-3.7-2.7H6c-1.1 0-2.1-.5-2.8-1.3-.7-.8-1-1.8-.9-2.8.1-1.5 1.1-2.7 2.5-3.1-.2-1.7.8-3.4 2.5-3.9.5-.2 1.1-.2 1.6-.1.5-1 1.3-1.6 2.3-1.9l-.2.1z" fill="#00A1E0"/>
  </svg>;
}

function StatusDot({ connected }) {
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full border ${connected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-red-400"}`} />
    {connected ? "Connecté" : "Déconnecté"}
  </span>;
}

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const SYNC_OBJECTS = {
  profiles: { label: "Profil client", icon: "👤", sf: "Account" },
  orders: { label: "Souscription", icon: "📋", sf: "Opportunity" },
  funds: { label: "Fonds", icon: "💰", sf: "Product2" },
};

export default function SalesforceIntegration({ toast }) {
  const [config, setConfig] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, successful: 0, totalRecords: 0, totalErrors: 0, lastSync: null });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [formUrl, setFormUrl] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [formSecret, setFormSecret] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const cfg = await fetchCRMConfig();
      if (cfg) {
        setConfig(cfg);
        setFormUrl(cfg.instanceUrl || "");
        setFormClientId(cfg.clientId || "");
        const [logsData, statsData] = await Promise.all([
          fetchSyncLogs(cfg.id),
          fetchSyncStats(cfg.id),
        ]);
        setLogs(logsData);
        setStats(statsData);
      }
    } catch (e) {
      console.error("CRM load:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh logs every 10s when connected
  useEffect(() => {
    if (!config?.id || config.status !== "connected") return;
    const interval = setInterval(async () => {
      const [logsData, statsData] = await Promise.all([
        fetchSyncLogs(config.id),
        fetchSyncStats(config.id),
      ]);
      setLogs(logsData);
      setStats(statsData);
    }, 10000);
    return () => clearInterval(interval);
  }, [config?.id, config?.status]);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      let cfg = config;
      if (!cfg) {
        cfg = await saveCRMConfig({ instanceUrl: formUrl, clientId: formClientId, clientSecret: formSecret });
      } else {
        cfg = await saveCRMConfig({ ...cfg, instanceUrl: formUrl, clientId: formClientId, clientSecret: formSecret });
      }
      await new Promise(r => setTimeout(r, 1200)); // Simulate OAuth
      const connected = await connectCRM(cfg.id, formUrl || "https://swisslife.my.salesforce.com");
      setConfig(connected);
      toast?.({ type: "success", message: "Salesforce connecté — les profils se synchroniseront automatiquement" });
    } catch (e) {
      toast?.({ type: "error", message: "Erreur : " + e.message });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const updated = await disconnectCRM(config.id);
      setConfig(updated);
      toast?.({ type: "success", message: "Salesforce déconnecté" });
    } catch (e) {
      toast?.({ type: "error", message: e.message });
    }
  };

  const isConnected = config?.status === "connected";

  if (loading) return <div className="flex items-center justify-center py-20">
    <div className="w-6 h-6 border-2 border-[#4F7DF3] border-t-transparent rounded-full animate-spin" />
  </div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00A1E0]/10 flex items-center justify-center"><SfLogo size={22} /></div>
          <div>
            <h2 className="text-[15px] font-semibold text-[#0D0D12]">Intégration Salesforce</h2>
            <p className="text-[12px] text-[#9AA4B2]">Sync automatique des profils, souscriptions et fonds vers le CRM SwissLife</p>
          </div>
        </div>
        <StatusDot connected={isConnected} />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Statut" value={isConnected ? "Actif" : "Inactif"}
          sub={isConnected ? "Sync automatique activée" : "Non configuré"} color={isConnected ? "#059669" : "#DC2626"} />
        <KPICard label="Dernière sync" value={timeAgo(stats.lastSync)} sub="" color="#4F7DF3" />
        <KPICard label="Enregistrements" value={fmt(stats.totalRecords)} sub={`${stats.total} opérations`} color="#4F7DF3" />
        <KPICard label="Erreurs" value={fmt(stats.totalErrors)} sub={stats.totalErrors > 0 ? "À vérifier" : "Aucune"} color={stats.totalErrors > 0 ? "#DC2626" : "#059669"} />
      </div>

      {/* ── CONNECTION CONFIG ── */}
      <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
        <div className="px-6 py-4 bg-[#F7F8FA] border-b border-[#E8ECF1] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SfLogo size={18} />
            <span className="text-[13px] font-semibold text-[#0D0D12]">Configuration</span>
          </div>
          {isConnected && (
            <button onClick={handleDisconnect} className="px-3 py-1.5 text-[11px] font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              Déconnecter
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {isConnected ? (
            <>
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                <div>
                  <p className="text-[13px] font-semibold text-emerald-800">Connecté à Salesforce</p>
                  <p className="text-[11px] text-emerald-600">{config.instanceUrl} — depuis {config.connectedAt ? new Date(config.connectedAt).toLocaleDateString("fr-FR") : "—"}</p>
                </div>
              </div>

              {/* How it works */}
              <div className="bg-[#F7F8FA] rounded-xl p-4 space-y-2">
                <p className="text-[12px] font-semibold text-[#0D0D12]">Synchronisation automatique</p>
                <div className="space-y-1.5">
                  {Object.entries(SYNC_OBJECTS).map(([key, obj]) => (
                    <div key={key} className="flex items-center gap-2 text-[11px] text-[#5F6B7A]">
                      <span>{obj.icon}</span>
                      <span>Création/modification d'un <strong>{obj.label.toLowerCase()}</strong></span>
                      <span className="text-[#C4C9D2]">→</span>
                      <span className="px-1.5 py-0.5 bg-[#00A1E0]/10 text-[#00A1E0] rounded font-mono text-[10px]">SF {obj.sf}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className={labelCls}>Instance URL Salesforce</label>
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
                      value={formSecret} onChange={e => setFormSecret(e.target.value)} />
                  </div>
                </div>
              </div>

              <button onClick={handleConnect} disabled={connecting || !formUrl}
                className="w-full py-3 bg-[#00A1E0] text-white text-[13px] font-semibold rounded-xl hover:bg-[#0081B8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {connecting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <SfLogo size={16} />}
                {connecting ? "Connexion OAuth2 en cours..." : "Connecter Salesforce"}
              </button>

              <div className="bg-[#F0F7FF] rounded-xl p-4 border border-[#D0E2FF]">
                <p className="text-[12px] text-[#1E3A5F] font-medium mb-1">Comment ça marche ?</p>
                <p className="text-[11px] text-[#5F6B7A]">
                  Une fois connecté, chaque profil créé ou modifié sur Bridge Fund sera automatiquement synchronisé vers Salesforce en tant que compte client (Account). Les souscriptions créeront des Opportunities.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── ACTIVITY FEED ── */}
      <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
        <div className="px-6 py-4 bg-[#F7F8FA] border-b border-[#E8ECF1] flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#0D0D12]">Activité de synchronisation</span>
          <span className="text-[11px] text-[#9AA4B2]">{logs.length} opérations</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[24px] mb-2">📭</p>
            <p className="text-[13px] text-[#0D0D12] font-medium">Aucune synchronisation</p>
            <p className="text-[11px] text-[#9AA4B2] mt-1">
              {isConnected ? "Créez un profil pour déclencher la première sync automatique" : "Connectez Salesforce pour commencer"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F2F5] max-h-[400px] overflow-y-auto">
            {logs.map(log => {
              const obj = SYNC_OBJECTS[log.objectType] || { icon: "🔄", label: log.objectType, sf: "?" };
              const isSuccess = log.status === "success";
              const isError = log.status === "error";
              return (
                <div key={log.id} className="px-6 py-3 flex items-center gap-4 hover:bg-[#FAFBFC] transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] ${isSuccess ? "bg-emerald-50" : isError ? "bg-red-50" : "bg-blue-50"}`}>
                    {obj.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-medium text-[#0D0D12]">{obj.label}</p>
                      <span className="text-[10px] text-[#C4C9D2]">→</span>
                      <span className="text-[10px] text-[#00A1E0] font-mono">SF {obj.sf}</span>
                    </div>
                    <p className="text-[11px] text-[#9AA4B2]">
                      {log.recordsSynced} enregistrement{log.recordsSynced > 1 ? "s" : ""} synchronisé{log.recordsSynced > 1 ? "s" : ""}
                      {log.recordsFailed > 0 && <span className="text-red-500 ml-1">· {log.recordsFailed} erreur{log.recordsFailed > 1 ? "s" : ""}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${isSuccess ? "bg-emerald-50 text-emerald-700" : isError ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                      <span className={`w-1 h-1 rounded-full ${isSuccess ? "bg-emerald-500" : isError ? "bg-red-400" : "bg-blue-500 animate-pulse"}`} />
                      {isSuccess ? "OK" : isError ? "Erreur" : "..."}
                    </span>
                    <p className="text-[10px] text-[#C4C9D2] mt-0.5">{timeAgo(log.startedAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
