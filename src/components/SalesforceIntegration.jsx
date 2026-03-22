import { useState, useEffect, useCallback } from "react";
import {
  fetchCRMConfig, saveCRMConfig, connectCRM, disconnectCRM,
  fetchSyncLogs, fetchSyncStats,
} from "../services/salesforceService";

/* ══════════════════════════════════════════
   Salesforce CRM — OAuth flow integration
   Click connect → SF login → auto-sync
   ══════════════════════════════════════════ */

function timeAgo(d) {
  if (!d) return null;
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return "À l'instant";
  if (s < 3600) return `Il y a ${Math.floor(s / 60)}m`;
  if (s < 86400) return `Il y a ${Math.floor(s / 3600)}h`;
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function SfIcon({ color = "white", size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M10 3.2c.9-.8 2-.9 3.1-.6 1.1.3 1.9 1.1 2.4 2 .7-.4 1.5-.5 2.3-.3 1.7.5 2.8 2.1 2.7 3.9 1.5.5 2.5 1.9 2.5 3.5 0 2.1-1.7 3.7-3.7 3.7h-.3c-.5 1.6-2 2.7-3.7 2.7-1 0-1.9-.4-2.6-1-.7.7-1.6 1-2.6 1-1.7 0-3.2-1.1-3.7-2.7H6c-1.1 0-2.1-.5-2.8-1.3-.7-.8-1-1.8-.9-2.8.1-1.5 1.1-2.7 2.5-3.1-.2-1.7.8-3.4 2.5-3.9.5-.2 1.1-.2 1.6-.1.5-1 1.3-1.6 2.3-1.9l-.2.1z"/></svg>;
}

// Simulate Salesforce OAuth popup flow
function openSalesforceOAuth(onSuccess) {
  const SF_INSTANCE = "https://swisslife.my.salesforce.com";

  // Open real Salesforce login page in popup
  const popup = window.open(
    `https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=bridge_fund_app&redirect_uri=${encodeURIComponent(window.location.origin + "/oauth/callback")}&scope=api%20refresh_token`,
    "salesforce_oauth",
    "width=600,height=700,left=300,top=100,toolbar=no,menubar=no"
  );

  // For demo: simulate successful OAuth after user interacts with popup
  // In production: the popup redirects to callback URL with auth code
  const checkInterval = setInterval(() => {
    try {
      if (!popup || popup.closed) {
        clearInterval(checkInterval);
        // Popup was closed → simulate successful auth
        onSuccess({
          instanceUrl: SF_INSTANCE,
          accessToken: "sf_access_" + Date.now(),
          refreshToken: "sf_refresh_" + Date.now(),
          userEmail: "admin@swisslife.com",
          userName: "SwissLife Admin",
        });
      }
    } catch (e) {
      // Cross-origin — popup still on Salesforce domain
    }
  }, 500);

  // Auto-close popup after 5s for demo
  setTimeout(() => {
    try { popup?.close(); } catch (e) {}
  }, 5000);
}

export default function SalesforceIntegration({ toast }) {
  const [config, setConfig] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, totalRecords: 0, totalErrors: 0, lastSync: null });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const cfg = await fetchCRMConfig();
      if (cfg) {
        setConfig(cfg);
        const [l, s] = await Promise.all([fetchSyncLogs(cfg.id, 10), fetchSyncStats(cfg.id)]);
        setLogs(l); setStats(s);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!config?.id || config.status !== "connected") return;
    const i = setInterval(async () => {
      const [l, s] = await Promise.all([fetchSyncLogs(config.id, 10), fetchSyncStats(config.id)]);
      setLogs(l); setStats(s);
    }, 8000);
    return () => clearInterval(i);
  }, [config?.id, config?.status]);

  const handleConnect = async () => {
    setConnecting(true);
    openSalesforceOAuth(async (authResult) => {
      try {
        // Save or update config
        let cfg = config;
        if (!cfg) {
          cfg = await saveCRMConfig({
            instanceUrl: authResult.instanceUrl,
            clientId: "bridge_fund_connected_app",
            clientSecret: "auto",
          });
        }
        const connected = await connectCRM(cfg.id, authResult.instanceUrl);
        setConfig(connected);
        toast?.({ type: "success", message: `Salesforce connecté — ${authResult.userName}` });
      } catch (e) {
        toast?.({ type: "error", message: e.message });
      } finally {
        setConnecting(false);
      }
    });
  };

  const handleDisconnect = async () => {
    try {
      const u = await disconnectCRM(config.id);
      setConfig(u);
      setLogs([]); setStats({ total: 0, totalRecords: 0, totalErrors: 0, lastSync: null });
      toast?.({ type: "success", message: "Salesforce déconnecté" });
    } catch (e) { toast?.({ type: "error", message: e.message }); }
  };

  const connected = config?.status === "connected";

  if (loading) return <div className="flex items-center justify-center py-24">
    <div className="w-5 h-5 border-2 border-[#00A1E0] border-t-transparent rounded-full animate-spin" />
  </div>;

  return <div className="max-w-2xl mx-auto space-y-4">

    {connected ? <>
      {/* ═══ CONNECTED ═══ */}
      <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
        <div className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#00A1E0] flex items-center justify-center shrink-0">
            <SfIcon />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-[#0D0D12]">Salesforce</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Connecté
              </span>
            </div>
            <p className="text-[12px] text-[#9AA4B2] truncate">{config.instanceUrl}</p>
          </div>
          <button onClick={handleDisconnect}
            className="px-3 py-1.5 text-[11px] font-medium text-[#9AA4B2] border border-[#E8ECF1] rounded-lg hover:text-red-600 hover:border-red-200 transition-colors">
            Déconnecter
          </button>
        </div>

        {/* Stats */}
        <div className="border-t border-[#E8ECF1] grid grid-cols-3 divide-x divide-[#E8ECF1]">
          <div className="px-5 py-3">
            <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider font-medium">Synchronisés</p>
            <p className="text-[18px] font-semibold text-[#0D0D12] mt-0.5">{stats.totalRecords}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider font-medium">Erreurs</p>
            <p className={`text-[18px] font-semibold mt-0.5 ${stats.totalErrors > 0 ? "text-red-600" : "text-[#0D0D12]"}`}>{stats.totalErrors}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider font-medium">Dernière sync</p>
            <p className="text-[13px] font-medium text-[#0D0D12] mt-1">{timeAgo(stats.lastSync) || "—"}</p>
          </div>
        </div>

        {/* Auto-sync mapping */}
        <div className="border-t border-[#E8ECF1] px-5 py-3 space-y-1.5">
          <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider font-medium mb-2">Sync automatique</p>
          {[
            { from: "Profil investisseur", to: "Account", icon: "👤" },
            { from: "Souscription", to: "Opportunity", icon: "📋" },
            { from: "Fonds", to: "Product2", icon: "💰" },
          ].map(m => (
            <div key={m.to} className="flex items-center gap-2 text-[12px]">
              <span className="text-[13px]">{m.icon}</span>
              <span className="text-[#0D0D12]">{m.from}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4C9D2" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
              <span className="px-1.5 py-0.5 bg-[#00A1E0]/8 text-[#00A1E0] text-[10px] font-mono rounded">SF.{m.to}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Activity feed */}
      <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
        <button onClick={() => setShowLogs(!showLogs)}
          className="w-full px-5 py-3 flex items-center justify-between hover:bg-[#FAFBFC] transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-[#0D0D12]">Activité récente</span>
            {logs.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F0F2F5] text-[#9AA4B2] font-medium">{logs.length}</span>}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AA4B2" strokeWidth="2"
            className={`transition-transform ${showLogs ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6"/></svg>
        </button>
        {showLogs && (
          <div className="border-t border-[#E8ECF1] divide-y divide-[#F0F2F5] max-h-[280px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="px-5 py-6 text-center text-[12px] text-[#9AA4B2]">
                Créez un profil pour déclencher la première sync
              </div>
            ) : logs.map(log => {
              const ok = log.status === "success";
              const obj = { profiles: "👤", orders: "📋", funds: "💰" }[log.objectType] || "🔄";
              const label = { profiles: "profil", orders: "souscription", funds: "fonds" }[log.objectType] || log.objectType;
              return (
                <div key={log.id} className="px-5 py-2.5 flex items-center gap-3 text-[12px]">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${ok ? "bg-emerald-50" : "bg-red-50"}`}>{obj}</span>
                  <span className="flex-1 text-[#5F6B7A]">{log.recordsSynced} {label}{log.recordsSynced > 1 ? "s" : ""} sync</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-red-400"}`} />
                  <span className="text-[11px] text-[#C4C9D2]">{timeAgo(log.startedAt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </> :

    /* ═══ DISCONNECTED — Single connect button ═══ */
    <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
      <div className="px-8 pt-10 pb-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#00A1E0] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#00A1E0]/20">
          <SfIcon size={32} />
        </div>
        <h2 className="text-[18px] font-semibold text-[#0D0D12] mb-1">Connecter Salesforce</h2>
        <p className="text-[13px] text-[#9AA4B2] max-w-sm mx-auto">
          Synchronisez automatiquement les profils investisseurs, souscriptions et fonds vers votre CRM Salesforce.
        </p>
      </div>

      <div className="px-8 pb-6">
        <button onClick={handleConnect} disabled={connecting}
          className="w-full py-3 bg-[#00A1E0] text-white text-[14px] font-semibold rounded-xl hover:bg-[#0081B8] transition-all disabled:opacity-60 flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md">
          {connecting ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Connexion en cours...</>
          ) : (
            <><SfIcon size={18} />Se connecter avec Salesforce</>
          )}
        </button>
      </div>

      <div className="px-8 pb-6 flex items-center gap-6 justify-center">
        {[
          { icon: "👤", text: "Profils → Accounts" },
          { icon: "📋", text: "Ordres → Opportunities" },
          { icon: "💰", text: "Fonds → Products" },
        ].map(m => (
          <span key={m.text} className="flex items-center gap-1.5 text-[11px] text-[#9AA4B2]">
            <span>{m.icon}</span>{m.text}
          </span>
        ))}
      </div>

      <div className="px-8 py-3 bg-[#F7F8FA] border-t border-[#E8ECF1] text-center text-[11px] text-[#9AA4B2]">
        Vous serez redirigé vers Salesforce pour autoriser l'accès
      </div>
    </div>}
  </div>;
}
