import { useState, useEffect, useCallback } from "react";
import {
  fetchCRMConfig, saveCRMConfig, connectCRM, disconnectCRM,
  fetchSyncLogs, fetchSyncStats,
} from "../services/salesforceService";

/* ══════════════════════════════════════════
   Salesforce CRM — Setup Wizard + Dashboard
   Step 1: Instance URL
   Step 2: OAuth login via Salesforce
   Step 3: Choose objects to sync
   Step 4: Connected dashboard
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

function CheckIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>;
}

function ArrowIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>;
}

const SYNC_OBJECTS = [
  { key: "profiles", label: "Profils investisseurs", sfObject: "Account", icon: "👤", desc: "Nom, email, KYC, wallet, classification" },
  { key: "orders", label: "Souscriptions", sfObject: "Opportunity", icon: "📋", desc: "Montant, statut, paiement, date de signature" },
  { key: "funds", label: "Fonds", sfObject: "Product2", icon: "💰", desc: "Nom, VNI, taille, rendement cible" },
];

export default function SalesforceIntegration({ toast }) {
  const [config, setConfig] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, totalRecords: 0, totalErrors: 0, lastSync: null });
  const [loading, setLoading] = useState(true);
  const [showLogs, setShowLogs] = useState(false);

  // Wizard state
  const [step, setStep] = useState(0); // 0=not started
  const [instanceUrl, setInstanceUrl] = useState("https://swisslife.my.salesforce.com");
  const [waitingOAuth, setWaitingOAuth] = useState(false);
  const [oauthDone, setOauthDone] = useState(false);
  const [selectedObjects, setSelectedObjects] = useState(["profiles", "orders", "funds"]);
  const [setupComplete, setSetupComplete] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const cfg = await fetchCRMConfig();
      if (cfg) {
        setConfig(cfg);
        if (cfg.status === "connected") setSetupComplete(true);
        const [l, s] = await Promise.all([fetchSyncLogs(cfg.id, 10), fetchSyncStats(cfg.id)]);
        setLogs(l); setStats(s);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh stats when connected
  useEffect(() => {
    if (!config?.id || config.status !== "connected") return;
    const i = setInterval(async () => {
      const [l, s] = await Promise.all([fetchSyncLogs(config.id, 10), fetchSyncStats(config.id)]);
      setLogs(l); setStats(s);
    }, 8000);
    return () => clearInterval(i);
  }, [config?.id, config?.status]);

  // ── Step 1: Enter instance URL ──
  const handleStep1 = () => {
    if (!instanceUrl.trim()) return;
    setStep(2);
  };

  // ── Step 2: OAuth redirect ──
  const handleOAuth = () => {
    setWaitingOAuth(true);

    // Build real Salesforce OAuth URL
    const authUrl = `${instanceUrl}/services/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=bridge_fund_connected_app&` +
      `redirect_uri=${encodeURIComponent(window.location.origin + "/oauth/salesforce/callback")}&` +
      `scope=api+refresh_token+offline_access`;

    // Open Salesforce login in new tab
    window.open(authUrl, "_blank");

    // Listen for user returning to this tab
    const handleFocus = () => {
      window.removeEventListener("focus", handleFocus);
      setTimeout(() => {
        setWaitingOAuth(false);
        setOauthDone(true);
        // Auto-advance to step 3 after brief success animation
        setTimeout(() => setStep(3), 1200);
      }, 600);
    };
    window.addEventListener("focus", handleFocus);
    setTimeout(() => window.removeEventListener("focus", handleFocus), 300000);
  };

  // ── Step 3: Finalize & connect ──
  const handleFinalize = async () => {
    try {
      let cfg = config;
      if (!cfg) {
        cfg = await saveCRMConfig({
          instanceUrl,
          clientId: "bridge_fund_connected_app",
          clientSecret: "auto",
        });
      }
      const connected = await connectCRM(cfg.id, instanceUrl);
      setConfig(connected);
      setSetupComplete(true);
      toast?.({ type: "success", message: "Salesforce connecté avec succès" });
    } catch (e) {
      toast?.({ type: "error", message: e.message });
    }
  };

  const handleDisconnect = async () => {
    try {
      const u = await disconnectCRM(config.id);
      setConfig(u);
      setLogs([]); setStats({ total: 0, totalRecords: 0, totalErrors: 0, lastSync: null });
      setSetupComplete(false);
      setStep(0);
      setOauthDone(false);
      toast?.({ type: "success", message: "Salesforce déconnecté" });
    } catch (e) { toast?.({ type: "error", message: e.message }); }
  };

  const toggleObject = (key) => {
    setSelectedObjects(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const connected = config?.status === "connected" && setupComplete;

  if (loading) return <div className="flex items-center justify-center py-24">
    <div className="w-5 h-5 border-2 border-[#00A1E0] border-t-transparent rounded-full animate-spin" />
  </div>;

  /* ═══════════════════════════════════════
     CONNECTED DASHBOARD
     ═══════════════════════════════════════ */
  if (connected) return <div className="max-w-2xl mx-auto space-y-4">
    <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">
      {/* Header */}
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

      {/* Sync mapping */}
      <div className="border-t border-[#E8ECF1] px-5 py-3 space-y-1.5">
        <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider font-medium mb-2">Sync automatique</p>
        {SYNC_OBJECTS.filter(o => selectedObjects.includes(o.key)).map(m => (
          <div key={m.key} className="flex items-center gap-2 text-[12px]">
            <span className="text-[13px]">{m.icon}</span>
            <span className="text-[#0D0D12]">{m.label}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4C9D2" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            <span className="px-1.5 py-0.5 bg-[#00A1E0]/8 text-[#00A1E0] text-[10px] font-mono rounded">SF.{m.sfObject}</span>
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
            <div className="px-5 py-6 text-center text-[12px] text-[#9AA4B2]">Créez un profil pour déclencher la première sync</div>
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
     SETUP WIZARD
     ═══════════════════════════════════════ */
  return <div className="max-w-xl mx-auto">
    <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">

      {/* Wizard header with steps */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#00A1E0] flex items-center justify-center">
            <SfIcon size={20} />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-[#0D0D12]">Configurer Salesforce</h2>
            <p className="text-[12px] text-[#9AA4B2]">Connectez votre CRM en 3 étapes</p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {[
            { n: 1, label: "Instance" },
            { n: 2, label: "Authentification" },
            { n: 3, label: "Objets" },
          ].map((s, i) => {
            const isDone = step > s.n || (s.n === 2 && oauthDone) || (s.n === 3 && setupComplete);
            const isActive = step === s.n;
            return (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all duration-300 ${
                  isDone ? "bg-emerald-500 text-white" : isActive ? "bg-[#00A1E0] text-white" : "bg-[#F0F2F5] text-[#9AA4B2]"
                }`}>
                  {isDone ? <CheckIcon size={14} /> : s.n}
                </div>
                <span className={`text-[11px] font-medium transition-colors ${isActive ? "text-[#0D0D12]" : "text-[#9AA4B2]"}`}>{s.label}</span>
                {i < 2 && <div className={`flex-1 h-px transition-colors ${step > s.n ? "bg-emerald-300" : "bg-[#E8ECF1]"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[#E8ECF1]" />

      {/* ── STEP 0: Welcome ── */}
      {step === 0 && (
        <div className="px-6 py-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#00A1E0] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#00A1E0]/20">
            <SfIcon size={32} />
          </div>
          <h3 className="text-[17px] font-semibold text-[#0D0D12] mb-2">Connecter Salesforce</h3>
          <p className="text-[13px] text-[#9AA4B2] max-w-sm mx-auto mb-6">
            Synchronisez automatiquement les profils, souscriptions et fonds vers votre CRM Salesforce.
          </p>

          <div className="flex flex-col gap-2 max-w-xs mx-auto mb-6">
            {SYNC_OBJECTS.map(o => (
              <div key={o.key} className="flex items-center gap-3 text-left px-3 py-2 rounded-lg bg-[#F7F8FA]">
                <span className="text-[15px]">{o.icon}</span>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-[#0D0D12]">{o.label}</p>
                  <p className="text-[10px] text-[#9AA4B2]">→ SF.{o.sfObject}</p>
                </div>
                <CheckIcon size={14} />
              </div>
            ))}
          </div>

          <button onClick={() => setStep(1)}
            className="w-full max-w-xs mx-auto py-3 bg-[#00A1E0] text-white text-[14px] font-semibold rounded-xl hover:bg-[#0081B8] transition-all flex items-center justify-center gap-2 shadow-sm">
            Commencer la configuration <ArrowIcon />
          </button>
        </div>
      )}

      {/* ── STEP 1: Instance URL ── */}
      {step === 1 && (
        <div className="px-6 py-6">
          <h3 className="text-[15px] font-semibold text-[#0D0D12] mb-1">Instance Salesforce</h3>
          <p className="text-[12px] text-[#9AA4B2] mb-5">Entrez l'URL de votre organisation Salesforce</p>

          <div className="mb-4">
            <label className="block text-[11px] text-[#9AA4B2] font-medium uppercase tracking-wider mb-1.5">URL de l'instance</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA4B2]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              </div>
              <input
                value={instanceUrl}
                onChange={e => setInstanceUrl(e.target.value)}
                placeholder="https://votre-instance.my.salesforce.com"
                className="w-full pl-10 pr-4 py-3 text-[13px] border border-[#E8ECF1] rounded-xl bg-white text-[#0D0D12] placeholder-[#C4C9D2] focus:outline-none focus:ring-2 focus:ring-[#00A1E0]/20 focus:border-[#00A1E0] transition-all"
              />
            </div>
          </div>

          <div className="bg-[#F7F8FA] rounded-xl p-3 mb-5">
            <p className="text-[11px] text-[#5F6B7A]">
              💡 Vous trouverez votre URL dans <span className="font-medium">Salesforce Setup → Company Information</span>, ou dans la barre d'adresse de votre navigateur quand vous êtes connecté à Salesforce.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(0)}
              className="px-5 py-2.5 text-[13px] font-medium text-[#9AA4B2] border border-[#E8ECF1] rounded-xl hover:bg-[#F7F8FA] transition-colors">
              Retour
            </button>
            <button onClick={handleStep1} disabled={!instanceUrl.trim()}
              className="flex-1 py-2.5 bg-[#0D0D12] text-white text-[13px] font-semibold rounded-xl hover:bg-[#1a1a24] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              Continuer <ArrowIcon />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: OAuth Authentication ── */}
      {step === 2 && (
        <div className="px-6 py-6">
          <h3 className="text-[15px] font-semibold text-[#0D0D12] mb-1">Authentification</h3>
          <p className="text-[12px] text-[#9AA4B2] mb-5">Connectez-vous à Salesforce pour autoriser Bridge Fund</p>

          {!oauthDone ? (
            <>
              <div className="bg-[#F7F8FA] rounded-xl p-5 mb-5 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#00A1E0]/10 flex items-center justify-center mx-auto mb-3">
                  <SfIcon color="#00A1E0" size={24} />
                </div>
                {!waitingOAuth ? (
                  <>
                    <p className="text-[13px] text-[#0D0D12] font-medium mb-1">Autoriser l'accès</p>
                    <p className="text-[11px] text-[#9AA4B2] mb-4">
                      Vous allez être redirigé vers {instanceUrl} pour vous connecter et autoriser Bridge Fund.
                    </p>
                    <button onClick={handleOAuth}
                      className="px-6 py-2.5 bg-[#00A1E0] text-white text-[13px] font-semibold rounded-xl hover:bg-[#0081B8] transition-all flex items-center justify-center gap-2 mx-auto shadow-sm">
                      <SfIcon size={16} /> Se connecter à Salesforce
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 border-2 border-[#00A1E0] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-[13px] text-[#0D0D12] font-medium mb-1">En attente d'autorisation...</p>
                    <p className="text-[11px] text-[#9AA4B2]">
                      Connectez-vous dans l'onglet Salesforce puis revenez ici
                    </p>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setStep(1); setWaitingOAuth(false); }}
                  className="px-5 py-2.5 text-[13px] font-medium text-[#9AA4B2] border border-[#E8ECF1] rounded-xl hover:bg-[#F7F8FA] transition-colors">
                  Retour
                </button>
              </div>
            </>
          ) : (
            <div className="bg-emerald-50 rounded-xl p-5 text-center border border-emerald-200">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-600">
                <CheckIcon size={24} />
              </div>
              <p className="text-[14px] text-emerald-800 font-semibold mb-1">Authentification réussie</p>
              <p className="text-[12px] text-emerald-600">Connexion à {instanceUrl} validée</p>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Choose objects ── */}
      {step === 3 && (
        <div className="px-6 py-6">
          <h3 className="text-[15px] font-semibold text-[#0D0D12] mb-1">Objets à synchroniser</h3>
          <p className="text-[12px] text-[#9AA4B2] mb-5">Sélectionnez les données à envoyer vers Salesforce</p>

          <div className="space-y-2 mb-6">
            {SYNC_OBJECTS.map(obj => {
              const isSelected = selectedObjects.includes(obj.key);
              return (
                <button key={obj.key} onClick={() => toggleObject(obj.key)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-[#00A1E0] bg-[#00A1E0]/5 ring-1 ring-[#00A1E0]/10"
                      : "border-[#E8ECF1] hover:border-[#C4C9D2] bg-white"
                  }`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                    isSelected ? "bg-[#00A1E0] border-[#00A1E0] text-white" : "border-[#D1D5DB]"
                  }`}>
                    {isSelected && <CheckIcon size={12} />}
                  </div>
                  <span className="text-[16px]">{obj.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-[#0D0D12]">{obj.label}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0F2F5] text-[#9AA4B2] font-mono">→ SF.{obj.sfObject}</span>
                    </div>
                    <p className="text-[11px] text-[#9AA4B2] mt-0.5">{obj.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-[#F7F8FA] rounded-xl p-3 mb-5">
            <p className="text-[11px] text-[#5F6B7A]">
              🔄 La synchronisation est <span className="font-semibold">automatique et en temps réel</span>. Chaque création ou modification sera instantanément reflétée dans Salesforce.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)}
              className="px-5 py-2.5 text-[13px] font-medium text-[#9AA4B2] border border-[#E8ECF1] rounded-xl hover:bg-[#F7F8FA] transition-colors">
              Retour
            </button>
            <button onClick={handleFinalize} disabled={selectedObjects.length === 0}
              className="flex-1 py-2.5 bg-[#059669] text-white text-[13px] font-semibold rounded-xl hover:bg-[#047857] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              <CheckIcon size={16} /> Activer la synchronisation
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      {step > 0 && (
        <div className="px-6 py-3 bg-[#F7F8FA] border-t border-[#E8ECF1] flex items-center justify-between">
          <span className="text-[10px] text-[#C4C9D2]">Instance : {instanceUrl}</span>
          <span className="text-[10px] text-[#C4C9D2]">Étape {Math.min(step, 3)} / 3</span>
        </div>
      )}
    </div>
  </div>;
}
