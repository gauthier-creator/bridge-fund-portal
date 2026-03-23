import { useState, useEffect, useCallback } from "react";
import {
  fetchCRMConfig, saveCRMConfig, connectCRM, disconnectCRM,
  fetchSyncLogs, fetchSyncStats,
} from "../services/salesforceService";

/* ══════════════════════════════════════════
   Salesforce CRM — Guided Setup + Real OAuth
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

function Chk({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>;
}

function CopyBox({ value, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="mt-2 mb-1">
      {label && <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider font-medium mb-1">{label}</p>}
      <div className="flex items-center gap-2 bg-[#F0F2F5] rounded-lg px-3 py-2 font-mono text-[12px] text-[#0D0D12]">
        <span className="flex-1 truncate select-all">{value}</span>
        <button onClick={copy} className="text-[#9AA4B2] hover:text-[#00A1E0] transition-colors shrink-0">
          {copied
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          }
        </button>
      </div>
    </div>
  );
}

/* ── Step progress bar ── */
function StepBar({ current, total }) {
  return (
    <div className="flex items-center gap-1 px-8 pt-6 pb-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < current ? "bg-[#00A1E0]" : i === current ? "bg-[#00A1E0]/40" : "bg-[#E8ECF1]"}`} />
      ))}
    </div>
  );
}

const CALLBACK_URL = window.location.origin + window.location.pathname;

export default function SalesforceIntegration({ toast }) {
  const [config, setConfig] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, totalRecords: 0, totalErrors: 0, lastSync: null });
  const [loading, setLoading] = useState(true);
  const [showLogs, setShowLogs] = useState(false);

  // Wizard state
  const [step, setStep] = useState(0);
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [sfDomain, setSfDomain] = useState("");
  const [oauthError, setOauthError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const cfg = await fetchCRMConfig();
      if (cfg) {
        setConfig(cfg);
        if (cfg.clientId) setConsumerKey(cfg.clientId);
        if (cfg.clientSecret) setConsumerSecret(cfg.clientSecret);
        if (cfg.instanceUrl) setSfDomain(cfg.instanceUrl);
        const [l, s] = await Promise.all([fetchSyncLogs(cfg.id, 10), fetchSyncStats(cfg.id)]);
        setLogs(l); setStats(s);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Check for OAuth callback token in URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.replace(/^#\/?/, "").replace("&", "&"));
      // Try to extract from hash fragment
      const tokenMatch = hash.match(/access_token=([^&]+)/);
      const instanceMatch = hash.match(/instance_url=([^&]+)/);
      if (tokenMatch) {
        const accessToken = tokenMatch[1];
        const instanceUrl = instanceMatch ? decodeURIComponent(instanceMatch[1]) : sfDomain;
        // Save real token
        (async () => {
          try {
            let cfg = config || await fetchCRMConfig();
            if (cfg) {
              const connected = await connectCRM(cfg.id, instanceUrl, accessToken);
              setConfig(connected);
              setStep(99); // success
              toast?.({ type: "success", message: "Salesforce connecté avec succès !" });
              // Clean URL
              window.history.replaceState(null, "", window.location.pathname + "#/admin");
              setTimeout(() => load(), 1000);
            }
          } catch (e) {
            setOauthError(e.message);
            toast?.({ type: "error", message: "Erreur OAuth: " + e.message });
          }
        })();
      }
    }
  }, []);

  // Auto-refresh stats
  useEffect(() => {
    if (!config?.id || config.status !== "connected") return;
    const i = setInterval(async () => {
      const [l, s] = await Promise.all([fetchSyncLogs(config.id, 10), fetchSyncStats(config.id)]);
      setLogs(l); setStats(s);
    }, 8000);
    return () => clearInterval(i);
  }, [config?.id, config?.status]);

  /* ── Step 1: Save config and go to tutorial ── */
  const handleStartSetup = () => setStep(1);

  /* ── Step 2: Save credentials, launch real OAuth ── */
  const handleLaunchOAuth = async () => {
    if (!consumerKey.trim()) {
      toast?.({ type: "error", message: "Veuillez coller le Consumer Key" });
      return;
    }
    try {
      // Save config
      const cfg = await saveCRMConfig({
        id: config?.id,
        instanceUrl: sfDomain || "https://login.salesforce.com",
        clientId: consumerKey.trim(),
        clientSecret: consumerSecret.trim(),
      });
      setConfig(cfg);

      // Build OAuth URL — implicit flow (response_type=token)
      const loginDomain = sfDomain ? new URL(sfDomain).origin : "https://login.salesforce.com";
      const oauthUrl = `${loginDomain}/services/oauth2/authorize?` + new URLSearchParams({
        response_type: "token",
        client_id: consumerKey.trim(),
        redirect_uri: CALLBACK_URL,
        scope: "api refresh_token",
      }).toString();

      // Redirect to Salesforce OAuth
      window.location.href = oauthUrl;
    } catch (e) {
      toast?.({ type: "error", message: e.message });
    }
  };

  const handleDisconnect = async () => {
    try {
      const u = await disconnectCRM(config.id);
      setConfig(u);
      setLogs([]); setStats({ total: 0, totalRecords: 0, totalErrors: 0, lastSync: null });
      setStep(0);
      toast?.({ type: "success", message: "Salesforce déconnecté" });
    } catch (e) { toast?.({ type: "error", message: e.message }); }
  };

  const connected = config?.status === "connected";

  if (loading) return <div className="flex items-center justify-center py-24">
    <div className="w-5 h-5 border-2 border-[#00A1E0] border-t-transparent rounded-full animate-spin" />
  </div>;

  /* ═══════════════════════════════════════
     CONNECTED — Dashboard
     ═══════════════════════════════════════ */
  if (connected) return <div className="max-w-2xl mx-auto space-y-4">
    <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
      <div className="p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-[#00A1E0] flex items-center justify-center shrink-0"><SfIcon /></div>
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

      <div className="border-t border-[#E8ECF1] grid grid-cols-3 divide-x divide-[#E8ECF1]">
        {[
          { label: "Synchronisés", value: stats.totalRecords },
          { label: "Erreurs", value: stats.totalErrors, color: stats.totalErrors > 0 ? "text-red-600" : "" },
          { label: "Dernière sync", value: timeAgo(stats.lastSync) || "—", isText: true },
        ].map(s => (
          <div key={s.label} className="px-5 py-3">
            <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider font-medium">{s.label}</p>
            <p className={`${s.isText ? "text-[13px] mt-1" : "text-[18px] mt-0.5"} font-semibold text-[#0D0D12] ${s.color || ""}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-[#E8ECF1] px-5 py-3">
        <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider font-medium mb-2">Sync automatique</p>
        <div className="space-y-1.5">
          {[
            { icon: "👤", label: "Profil investisseur", sf: "Account" },
            { icon: "📋", label: "Souscription", sf: "Opportunity" },
            { icon: "💰", label: "Fonds", sf: "Product2" },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-2 text-[12px]">
              <span>{m.icon}</span>
              <span className="text-[#0D0D12]">{m.label}</span>
              <span className="text-[#C4C9D2]">→</span>
              <span className="px-1.5 py-0.5 bg-[#00A1E0]/8 text-[#00A1E0] text-[10px] font-mono rounded">SF.{m.sf}</span>
            </div>
          ))}
        </div>
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
            <p className="px-5 py-6 text-center text-[12px] text-[#9AA4B2]">Aucune activité. Créez un profil pour voir la première sync.</p>
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
  </div>;

  /* ═══════════════════════════════════════
     SETUP WIZARD — 3 steps
     ═══════════════════════════════════════ */
  return <div className="max-w-xl mx-auto">
    <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">

      {/* ── STEP 0: Welcome ── */}
      {step === 0 && <>
        <div className="px-8 pt-10 pb-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#00A1E0] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#00A1E0]/20">
            <SfIcon size={32} />
          </div>
          <h2 className="text-[18px] font-semibold text-[#0D0D12] mb-2">Connecter Salesforce</h2>
          <p className="text-[13px] text-[#9AA4B2] max-w-sm mx-auto">
            Synchronisez automatiquement vos investisseurs, souscriptions et fonds avec votre CRM Salesforce.
          </p>
        </div>
        <div className="px-8 pb-6">
          <div className="bg-[#F7F8FA] rounded-xl p-4 mb-6 space-y-2.5">
            <p className="text-[11px] text-[#9AA4B2] uppercase tracking-wider font-semibold mb-1">Ce qui sera synchronisé :</p>
            {[
              { icon: "👤", text: "Investisseurs → Comptes Salesforce" },
              { icon: "📋", text: "Souscriptions → Opportunités Salesforce" },
              { icon: "💰", text: "Fonds → Produits Salesforce" },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-2.5">
                <span>{item.icon}</span>
                <p className="text-[12px] text-[#3D4350]">{item.text}</p>
              </div>
            ))}
          </div>
          <button onClick={handleStartSetup}
            className="w-full py-3.5 bg-[#00A1E0] text-white text-[14px] font-semibold rounded-xl hover:bg-[#0081B8] transition-all flex items-center justify-center gap-2.5 shadow-sm">
            <SfIcon size={18} /> Commencer la configuration
          </button>
          <p className="text-center text-[11px] text-[#C4C9D2] mt-3">Configuration guidée en 3 étapes (~5 min)</p>
        </div>
      </>}

      {/* ── STEP 1: Tutorial — Create Connected App in Salesforce ── */}
      {step === 1 && <>
        <StepBar current={0} total={3} />
        <div className="px-8 pb-6">
          <h3 className="text-[16px] font-semibold text-[#0D0D12] mb-1">Étape 1 : Créer une application dans Salesforce</h3>
          <p className="text-[12px] text-[#9AA4B2] mb-5">Suivez ces instructions dans votre Salesforce. Pas de code nécessaire.</p>

          <div className="space-y-4">
            <div className="bg-[#F7F8FA] rounded-xl p-4 space-y-3 text-[12px] text-[#5F6B7A]">
              <div className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-[#00A1E0] text-white flex items-center justify-center text-[11px] font-bold shrink-0">1</span>
                <div>
                  <p className="font-medium text-[#0D0D12]">Ouvrez Salesforce Setup</p>
                  <p className="text-[11px] mt-0.5">Cliquez sur ⚙️ en haut à droite de votre Salesforce → <strong>Setup</strong></p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-[#00A1E0] text-white flex items-center justify-center text-[11px] font-bold shrink-0">2</span>
                <div>
                  <p className="font-medium text-[#0D0D12]">Cherchez "App Manager"</p>
                  <p className="text-[11px] mt-0.5">Dans la barre de recherche à gauche, tapez <strong>App Manager</strong> et cliquez dessus</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-[#00A1E0] text-white flex items-center justify-center text-[11px] font-bold shrink-0">3</span>
                <div>
                  <p className="font-medium text-[#0D0D12]">Créez une "New Connected App"</p>
                  <p className="text-[11px] mt-0.5">Bouton en haut à droite. Remplissez :</p>
                  <div className="mt-2 bg-white rounded-lg border border-[#E8ECF1] p-3 space-y-1.5 text-[11px]">
                    <p>• <strong>Connected App Name</strong> : <code className="bg-[#F0F2F5] px-1 rounded">Bridge Fund</code></p>
                    <p>• <strong>API Name</strong> : <code className="bg-[#F0F2F5] px-1 rounded">Bridge_Fund</code></p>
                    <p>• <strong>Contact Email</strong> : votre email</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-[#00A1E0] text-white flex items-center justify-center text-[11px] font-bold shrink-0">4</span>
                <div>
                  <p className="font-medium text-[#0D0D12]">Activez OAuth</p>
                  <p className="text-[11px] mt-0.5">Cochez <strong>Enable OAuth Settings</strong>, puis :</p>
                  <CopyBox value={CALLBACK_URL} label="Callback URL (à coller dans Salesforce)" />
                  <p className="text-[11px] mt-2">Ajoutez les scopes :</p>
                  <div className="mt-1 space-y-1">
                    <p className="text-[11px]">• <strong>Manage user data via APIs (api)</strong></p>
                    <p className="text-[11px]">• <strong>Perform requests at any time (refresh_token)</strong></p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-[#059669] text-white flex items-center justify-center shrink-0"><Chk size={12} /></span>
                <div>
                  <p className="font-medium text-[#0D0D12]">Cliquez "Save" et attendez 2-10 minutes</p>
                  <p className="text-[11px] mt-0.5">Salesforce active l'app en arrière-plan. Ensuite, passez à l'étape suivante.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="flex-1 py-3 text-[13px] font-medium text-[#9AA4B2] border border-[#E8ECF1] rounded-xl hover:bg-[#F7F8FA]">
                Retour
              </button>
              <button onClick={() => setStep(2)} className="flex-1 py-3 bg-[#0D0D12] text-white text-[13px] font-semibold rounded-xl hover:bg-[#1a1a24]">
                C'est fait, continuer →
              </button>
            </div>
          </div>
        </div>
      </>}

      {/* ── STEP 2: Enter Consumer Key + Secret ── */}
      {step === 2 && <>
        <StepBar current={1} total={3} />
        <div className="px-8 pb-6">
          <h3 className="text-[16px] font-semibold text-[#0D0D12] mb-1">Étape 2 : Copiez vos clés Salesforce</h3>
          <p className="text-[12px] text-[#9AA4B2] mb-5">
            Dans Salesforce, ouvrez votre Connected App "Bridge Fund" et copiez les clés ci-dessous.
          </p>

          <div className="bg-[#F0F7FF] rounded-xl p-3 border border-[#D0E2FF] mb-5">
            <p className="text-[11px] text-[#1E3A5F]">
              <strong>Où trouver les clés ?</strong> Setup → App Manager → cliquez sur la flèche ▾ à côté de "Bridge Fund" → <strong>View</strong> → section "API (Enable OAuth Settings)" → <strong>Consumer Key</strong> et cliquez <strong>Manage Consumer Details</strong> pour le Secret.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-medium text-[#0D0D12] mb-1.5 block">Consumer Key <span className="text-red-400">*</span></label>
              <input
                className="w-full px-3 py-2.5 text-[13px] border border-[#E8ECF1] rounded-xl focus:ring-2 focus:ring-[#00A1E0]/20 focus:border-[#00A1E0] transition-all font-mono"
                placeholder="3MVG9..."
                value={consumerKey}
                onChange={e => setConsumerKey(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#0D0D12] mb-1.5 block">Consumer Secret <span className="text-[#9AA4B2]">(optionnel)</span></label>
              <input
                className="w-full px-3 py-2.5 text-[13px] border border-[#E8ECF1] rounded-xl focus:ring-2 focus:ring-[#00A1E0]/20 focus:border-[#00A1E0] transition-all font-mono"
                type="password"
                placeholder="••••••••••"
                value={consumerSecret}
                onChange={e => setConsumerSecret(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#0D0D12] mb-1.5 block">Domaine Salesforce <span className="text-[#9AA4B2]">(optionnel)</span></label>
              <input
                className="w-full px-3 py-2.5 text-[13px] border border-[#E8ECF1] rounded-xl focus:ring-2 focus:ring-[#00A1E0]/20 focus:border-[#00A1E0] transition-all"
                placeholder="https://votre-entreprise.my.salesforce.com"
                value={sfDomain}
                onChange={e => setSfDomain(e.target.value)}
              />
              <p className="text-[10px] text-[#C4C9D2] mt-1">Laissez vide pour utiliser login.salesforce.com par défaut</p>
            </div>
          </div>

          {oauthError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-[12px] text-red-700">{oauthError}</div>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="flex-1 py-3 text-[13px] font-medium text-[#9AA4B2] border border-[#E8ECF1] rounded-xl hover:bg-[#F7F8FA]">
              ← Retour
            </button>
            <button onClick={handleLaunchOAuth} disabled={!consumerKey.trim()}
              className="flex-1 py-3 bg-[#00A1E0] text-white text-[13px] font-semibold rounded-xl hover:bg-[#0081B8] disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
              <SfIcon size={16} /> Se connecter à Salesforce
            </button>
          </div>
          <p className="text-center text-[10px] text-[#C4C9D2] mt-3">Vous allez être redirigé vers Salesforce pour autoriser l'accès</p>
        </div>
      </>}

      {/* ── STEP 99: Success ── */}
      {step === 99 && !connected && (
        <div className="px-8 py-12 text-center">
          <StepBar current={3} total={3} />
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5 text-emerald-600" style={{ animation: "fadeIn 0.4s ease-out" }}>
            <Chk size={28} />
          </div>
          <h3 className="text-[17px] font-semibold text-[#0D0D12] mb-2">Salesforce connecté !</h3>
          <p className="text-[13px] text-[#9AA4B2] max-w-sm mx-auto">
            La synchronisation automatique est active. Toutes vos données Bridge Fund seront envoyées vers Salesforce en temps réel.
          </p>
          <div className="mt-4 w-5 h-5 border-2 border-[#00A1E0] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}
    </div>
  </div>;
}
