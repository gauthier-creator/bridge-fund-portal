import { useState, useEffect, useCallback } from "react";
import { inputCls, labelCls } from "./shared";
import {
  fetchCRMConfig, saveCRMConfig, connectCRM, disconnectCRM,
  fetchSyncLogs, fetchSyncStats,
} from "../services/salesforceService";

/* ══════════════════════════════════════════
   Salesforce CRM — Clean integration card
   Style n8n / Zapier : connect & forget
   ══════════════════════════════════════════ */

function timeAgo(d) {
  if (!d) return null;
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return "À l'instant";
  if (s < 3600) return `Il y a ${Math.floor(s / 60)}m`;
  if (s < 86400) return `Il y a ${Math.floor(s / 3600)}h`;
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function SalesforceIntegration({ toast }) {
  const [config, setConfig] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, totalRecords: 0, totalErrors: 0, lastSync: null });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [url, setUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
  const [showLogs, setShowLogs] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const cfg = await fetchCRMConfig();
      if (cfg) {
        setConfig(cfg);
        setUrl(cfg.instanceUrl || "");
        setClientId(cfg.clientId || "");
        const [l, s] = await Promise.all([fetchSyncLogs(cfg.id, 10), fetchSyncStats(cfg.id)]);
        setLogs(l);
        setStats(s);
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
    try {
      setConnecting(true);
      let cfg = config;
      const payload = { instanceUrl: url, clientId, clientSecret: secret, id: cfg?.id };
      cfg = await saveCRMConfig(payload);
      await new Promise(r => setTimeout(r, 1400));
      const connected = await connectCRM(cfg.id, url || "https://swisslife.my.salesforce.com");
      setConfig(connected);
      toast?.({ type: "success", message: "Salesforce connecté" });
    } catch (e) {
      toast?.({ type: "error", message: e.message });
    } finally { setConnecting(false); }
  };

  const handleDisconnect = async () => {
    try {
      const u = await disconnectCRM(config.id);
      setConfig(u);
      toast?.({ type: "success", message: "Salesforce déconnecté" });
    } catch (e) { toast?.({ type: "error", message: e.message }); }
  };

  const connected = config?.status === "connected";

  if (loading) return <div className="flex items-center justify-center py-24">
    <div className="w-5 h-5 border-2 border-[#00A1E0] border-t-transparent rounded-full animate-spin" />
  </div>;

  return <div className="max-w-2xl mx-auto space-y-4">

    {/* ── CONNECTED STATE ── */}
    {connected ? <>
      <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
        {/* Header */}
        <div className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#00A1E0] flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M10 3.2c.9-.8 2-.9 3.1-.6 1.1.3 1.9 1.1 2.4 2 .7-.4 1.5-.5 2.3-.3 1.7.5 2.8 2.1 2.7 3.9 1.5.5 2.5 1.9 2.5 3.5 0 2.1-1.7 3.7-3.7 3.7h-.3c-.5 1.6-2 2.7-3.7 2.7-1 0-1.9-.4-2.6-1-.7.7-1.6 1-2.6 1-1.7 0-3.2-1.1-3.7-2.7H6c-1.1 0-2.1-.5-2.8-1.3-.7-.8-1-1.8-.9-2.8.1-1.5 1.1-2.7 2.5-3.1-.2-1.7.8-3.4 2.5-3.9.5-.2 1.1-.2 1.6-.1.5-1 1.3-1.6 2.3-1.9l-.2.1z"/></svg>
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

        {/* Stats row */}
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

        {/* Mapping preview */}
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

      {/* Activity log (collapsible) */}
      <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
        <button onClick={() => setShowLogs(!showLogs)}
          className="w-full px-5 py-3 flex items-center justify-between hover:bg-[#FAFBFC] transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-[#0D0D12]">Activité récente</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F0F2F5] text-[#9AA4B2] font-medium">{logs.length}</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AA4B2" strokeWidth="2"
            className={`transition-transform ${showLogs ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6"/></svg>
        </button>
        {showLogs && logs.length > 0 && (
          <div className="border-t border-[#E8ECF1] divide-y divide-[#F0F2F5] max-h-[280px] overflow-y-auto">
            {logs.map(log => {
              const ok = log.status === "success";
              const obj = { profiles: "👤", orders: "📋", funds: "💰" }[log.objectType] || "🔄";
              return (
                <div key={log.id} className="px-5 py-2.5 flex items-center gap-3 text-[12px]">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${ok ? "bg-emerald-50" : "bg-red-50"}`}>{obj}</span>
                  <span className="flex-1 text-[#5F6B7A]">
                    {log.recordsSynced} {log.objectType === "profiles" ? "profil" : log.objectType === "orders" ? "souscription" : "fonds"}
                    {log.recordsSynced > 1 ? "s" : ""} sync
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-red-400"}`} />
                  <span className="text-[11px] text-[#C4C9D2]">{timeAgo(log.startedAt)}</span>
                </div>
              );
            })}
          </div>
        )}
        {showLogs && logs.length === 0 && (
          <div className="border-t border-[#E8ECF1] px-5 py-6 text-center text-[12px] text-[#9AA4B2]">
            Aucune activité — créez un profil pour déclencher la première sync
          </div>
        )}
      </div>
    </> :

    /* ── DISCONNECTED STATE ── */
    <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-0 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-[#F0F2F5] flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#9AA4B2"><path d="M10 3.2c.9-.8 2-.9 3.1-.6 1.1.3 1.9 1.1 2.4 2 .7-.4 1.5-.5 2.3-.3 1.7.5 2.8 2.1 2.7 3.9 1.5.5 2.5 1.9 2.5 3.5 0 2.1-1.7 3.7-3.7 3.7h-.3c-.5 1.6-2 2.7-3.7 2.7-1 0-1.9-.4-2.6-1-.7.7-1.6 1-2.6 1-1.7 0-3.2-1.1-3.7-2.7H6c-1.1 0-2.1-.5-2.8-1.3-.7-.8-1-1.8-.9-2.8.1-1.5 1.1-2.7 2.5-3.1-.2-1.7.8-3.4 2.5-3.9.5-.2 1.1-.2 1.6-.1.5-1 1.3-1.6 2.3-1.9l-.2.1z"/></svg>
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-[#0D0D12]">Connecter Salesforce</h2>
          <p className="text-[12px] text-[#9AA4B2]">Synchronisez automatiquement vos données vers le CRM</p>
        </div>
      </div>

      {/* Form */}
      <div className="p-6 space-y-4">
        <div>
          <label className={labelCls}>Instance URL</label>
          <input className={inputCls} placeholder="https://votre-instance.my.salesforce.com"
            value={url} onChange={e => setUrl(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Client ID</label>
            <input className={inputCls} placeholder="Connected App Client ID"
              value={clientId} onChange={e => setClientId(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Client Secret</label>
            <input className={inputCls} type="password" placeholder="••••••••"
              value={secret} onChange={e => setSecret(e.target.value)} />
          </div>
        </div>

        <button onClick={handleConnect} disabled={connecting || !url}
          className="w-full py-2.5 bg-[#0D0D12] text-white text-[13px] font-semibold rounded-xl hover:bg-[#1a1a24] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
          {connecting
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Connexion...</>
            : "Connecter"}
        </button>
      </div>

      {/* Footer info */}
      <div className="px-6 py-3 bg-[#F7F8FA] border-t border-[#E8ECF1] text-[11px] text-[#9AA4B2]">
        Une fois connecté, chaque profil créé sur Bridge Fund sera automatiquement synchronisé vers Salesforce.
      </div>
    </div>}
  </div>;
}
