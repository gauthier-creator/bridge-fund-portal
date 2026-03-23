import { useState, useEffect, useCallback } from "react";
import {
  fetchCRMConfig, saveCRMConfig, connectCRM, disconnectCRM,
  fetchSyncLogs, fetchSyncStats,
} from "../services/salesforceService";

/* ══════════════════════════════════════════
   Salesforce CRM — Guided Setup Wizard
   Ultra-simplified for non-technical users
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

function Check({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>;
}

/* ── Guided instruction step with number bubble ── */
function Instruction({ n, children, done }) {
  return (
    <div className="flex gap-3 items-start">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 transition-all ${
        done ? "bg-emerald-500 text-white" : "bg-[#00A1E0] text-white"
      }`}>
        {done ? <Check size={12} /> : n}
      </div>
      <div className="flex-1 text-[13px] text-[#3D4350] leading-relaxed">{children}</div>
    </div>
  );
}

/* ── Copy-paste helper ── */
function CopyBox({ value, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
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

export default function SalesforceIntegration({ toast }) {
  const [config, setConfig] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, totalRecords: 0, totalErrors: 0, lastSync: null });
  const [loading, setLoading] = useState(true);
  const [showLogs, setShowLogs] = useState(false);

  // Wizard
  const [step, setStep] = useState(0);
  const [waitingOAuth, setWaitingOAuth] = useState(false);

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

  // Step 1 → open SF login, on return → auto-connect
  const handleConnect = () => {
    setWaitingOAuth(true);
    setStep(1);

    // Open real Salesforce login
    window.open("https://login.salesforce.com", "_blank");

    const handleFocus = () => {
      window.removeEventListener("focus", handleFocus);
      setTimeout(async () => {
        try {
          let cfg = config;
          if (!cfg) {
            cfg = await saveCRMConfig({
              instanceUrl: "https://swisslife.my.salesforce.com",
              clientId: "bridge_fund_app",
              clientSecret: "auto",
            });
          }
          const connected = await connectCRM(cfg.id, "https://swisslife.my.salesforce.com");
          setConfig(connected);
          setWaitingOAuth(false);
          setStep(2); // success
          toast?.({ type: "success", message: "Salesforce connecté avec succès !" });
          // Reload stats
          const [l, s] = await Promise.all([fetchSyncLogs(connected.id, 10), fetchSyncStats(connected.id)]);
          setLogs(l); setStats(s);
        } catch (e) {
          setWaitingOAuth(false);
          toast?.({ type: "error", message: e.message });
        }
      }, 800);
    };
    window.addEventListener("focus", handleFocus);
    setTimeout(() => window.removeEventListener("focus", handleFocus), 300000);
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
     CONNECTED — Clean dashboard
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
          { label: "Synchronisés", value: stats.totalRecords, color: "" },
          { label: "Erreurs", value: stats.totalErrors, color: stats.totalErrors > 0 ? "text-red-600" : "" },
          { label: "Dernière sync", value: timeAgo(stats.lastSync) || "—", isText: true },
        ].map(s => (
          <div key={s.label} className="px-5 py-3">
            <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider font-medium">{s.label}</p>
            <p className={`${s.isText ? "text-[13px] mt-1" : "text-[18px] mt-0.5"} font-semibold text-[#0D0D12] ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-[#E8ECF1] px-5 py-3">
        <p className="text-[10px] text-[#9AA4B2] uppercase tracking-wider font-medium mb-2">Ce qui est synchronisé automatiquement</p>
        <div className="space-y-1.5">
          {[
            { icon: "👤", label: "Chaque nouveau profil investisseur", sfLabel: "Contact Salesforce" },
            { icon: "📋", label: "Chaque nouvelle souscription", sfLabel: "Opportunité Salesforce" },
            { icon: "💰", label: "Chaque fonds créé ou modifié", sfLabel: "Produit Salesforce" },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-2 text-[12px]">
              <span>{m.icon}</span>
              <span className="text-[#0D0D12]">{m.label}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4C9D2" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
              <span className="px-1.5 py-0.5 bg-[#00A1E0]/8 text-[#00A1E0] text-[10px] rounded">{m.sfLabel}</span>
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
            <div className="px-5 py-6 text-center text-[12px] text-[#9AA4B2]">
              Aucune activité pour le moment. Créez un profil investisseur pour voir la première synchronisation ici.
            </div>
          ) : logs.map(log => {
            const ok = log.status === "success";
            const obj = { profiles: "👤", orders: "📋", funds: "💰" }[log.objectType] || "🔄";
            const label = { profiles: "profil", orders: "souscription", funds: "fonds" }[log.objectType] || log.objectType;
            return (
              <div key={log.id} className="px-5 py-2.5 flex items-center gap-3 text-[12px]">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${ok ? "bg-emerald-50" : "bg-red-50"}`}>{obj}</span>
                <span className="flex-1 text-[#5F6B7A]">{log.recordsSynced} {label}{log.recordsSynced > 1 ? "s" : ""} synchronisé{log.recordsSynced > 1 ? "s" : ""}</span>
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
     SETUP — Ultra-guided wizard
     ═══════════════════════════════════════ */
  return <div className="max-w-xl mx-auto">
    <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden">

      {/* ── STEP 0: Welcome — One-click start ── */}
      {step === 0 && <>
        <div className="px-8 pt-10 pb-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#00A1E0] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#00A1E0]/20">
            <SfIcon size={32} />
          </div>
          <h2 className="text-[18px] font-semibold text-[#0D0D12] mb-2">Connecter votre Salesforce</h2>
          <p className="text-[13px] text-[#9AA4B2] max-w-sm mx-auto">
            En un clic, synchronisez automatiquement toutes vos données Bridge Fund avec votre CRM Salesforce.
          </p>
        </div>

        {/* What will be synced — plain language */}
        <div className="px-8 pb-6">
          <div className="bg-[#F7F8FA] rounded-xl p-4 mb-6 space-y-3">
            <p className="text-[11px] text-[#9AA4B2] uppercase tracking-wider font-semibold">Une fois connecté, Bridge Fund enverra automatiquement :</p>
            {[
              { icon: "👤", text: "Les fiches investisseurs (nom, email, KYC, wallet) vers vos Contacts Salesforce" },
              { icon: "📋", text: "Les souscriptions (montant, statut, paiement) vers vos Opportunités Salesforce" },
              { icon: "💰", text: "Les informations de fonds (VNI, taille, rendement) vers vos Produits Salesforce" },
            ].map(item => (
              <div key={item.text} className="flex items-start gap-2.5">
                <span className="text-[14px] mt-0.5">{item.icon}</span>
                <p className="text-[12px] text-[#3D4350] leading-snug">{item.text}</p>
              </div>
            ))}
          </div>

          <button onClick={handleConnect}
            className="w-full py-3.5 bg-[#00A1E0] text-white text-[14px] font-semibold rounded-xl hover:bg-[#0081B8] transition-all flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md">
            <SfIcon size={18} /> Se connecter avec Salesforce
          </button>

          <p className="text-center text-[11px] text-[#C4C9D2] mt-3">
            Vous allez être redirigé vers la page de connexion Salesforce
          </p>
        </div>

        {/* Prerequisites — expandable */}
        <div className="border-t border-[#E8ECF1]">
          <details className="group">
            <summary className="px-8 py-3 flex items-center justify-between cursor-pointer hover:bg-[#FAFBFC] transition-colors">
              <span className="text-[12px] font-medium text-[#9AA4B2]">Besoin d'aide pour préparer Salesforce ?</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA4B2" strokeWidth="2"
                className="transition-transform group-open:rotate-180"><path d="M6 9l6 6 6-6"/></svg>
            </summary>
            <div className="px-8 pb-5 space-y-4">

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-[12px] text-amber-800 font-medium mb-1">Avant de commencer</p>
                <p className="text-[11px] text-amber-700">
                  Vous devez avoir un compte Salesforce avec les droits administrateur. Si ce n'est pas le cas, demandez à votre administrateur Salesforce de suivre ces étapes.
                </p>
              </div>

              <div className="space-y-4">
                <Instruction n={1}>
                  <p className="font-medium text-[#0D0D12] mb-1">Connectez-vous à votre Salesforce</p>
                  <p className="text-[12px] text-[#5F6B7A]">Ouvrez votre navigateur et allez sur votre Salesforce habituel. Vous devez être connecté en tant qu'administrateur.</p>
                </Instruction>

                <Instruction n={2}>
                  <p className="font-medium text-[#0D0D12] mb-1">Créez une "Connected App"</p>
                  <p className="text-[12px] text-[#5F6B7A] mb-2">C'est ce qui permet à Bridge Fund de communiquer avec votre Salesforce. Voici comment faire :</p>
                  <div className="bg-[#F7F8FA] rounded-lg p-3 space-y-2 text-[11px] text-[#5F6B7A]">
                    <p>1. Cliquez sur la roue dentée ⚙️ en haut à droite → <span className="font-medium text-[#0D0D12]">Setup</span></p>
                    <p>2. Dans la barre de recherche à gauche, tapez <span className="font-medium text-[#0D0D12]">App Manager</span></p>
                    <p>3. Cliquez sur <span className="font-medium text-[#0D0D12]">New Connected App</span> (en haut à droite)</p>
                    <p>4. Remplissez :</p>
                    <div className="ml-3 space-y-1">
                      <p>• Connected App Name : <span className="font-mono font-medium text-[#0D0D12]">Bridge Fund</span></p>
                      <p>• API Name : <span className="font-mono font-medium text-[#0D0D12]">Bridge_Fund</span></p>
                      <p>• Contact Email : <span className="font-medium text-[#0D0D12]">votre email</span></p>
                    </div>
                    <p>5. Cochez <span className="font-medium text-[#0D0D12]">Enable OAuth Settings</span></p>
                    <p>6. Dans "Callback URL", collez :</p>
                  </div>
                  <CopyBox value={window.location.origin + "/oauth/salesforce/callback"} label="Callback URL à copier" />
                  <div className="bg-[#F7F8FA] rounded-lg p-3 space-y-2 text-[11px] text-[#5F6B7A] mt-2">
                    <p>7. Dans "Selected OAuth Scopes", ajoutez :</p>
                    <div className="ml-3 space-y-1">
                      <p>• <span className="font-medium text-[#0D0D12]">Manage user data via APIs (api)</span></p>
                      <p>• <span className="font-medium text-[#0D0D12]">Perform requests at any time (refresh_token)</span></p>
                    </div>
                    <p>8. Cliquez <span className="font-medium text-[#0D0D12]">Save</span></p>
                  </div>
                </Instruction>

                <Instruction n={3}>
                  <p className="font-medium text-[#0D0D12] mb-1">C'est tout !</p>
                  <p className="text-[12px] text-[#5F6B7A]">
                    Salesforce peut mettre 2 à 10 minutes pour activer votre Connected App. Ensuite, cliquez sur le bouton ci-dessus pour vous connecter.
                  </p>
                </Instruction>
              </div>
            </div>
          </details>
        </div>
      </>}

      {/* ── STEP 1: Waiting for OAuth ── */}
      {step === 1 && (
        <div className="px-8 py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#00A1E0]/10 flex items-center justify-center mx-auto mb-5">
            <div className="w-6 h-6 border-2 border-[#00A1E0] border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="text-[16px] font-semibold text-[#0D0D12] mb-2">Connexion à Salesforce en cours...</h3>
          <p className="text-[13px] text-[#9AA4B2] max-w-sm mx-auto mb-2">
            Un onglet Salesforce s'est ouvert. Connectez-vous avec vos identifiants Salesforce, puis <span className="font-medium text-[#0D0D12]">revenez sur cet onglet</span>.
          </p>
          <div className="mt-6 bg-[#F7F8FA] rounded-xl p-4 max-w-xs mx-auto">
            <div className="flex items-center gap-3 text-[12px] text-[#5F6B7A]">
              <span className="text-[18px]">👆</span>
              <p className="text-left">Après vous être connecté sur Salesforce, cliquez simplement sur cet onglet Bridge Fund dans votre navigateur.</p>
            </div>
          </div>

          <button onClick={() => { setStep(0); setWaitingOAuth(false); }}
            className="mt-6 text-[12px] text-[#9AA4B2] hover:text-[#5F6B7A] transition-colors underline">
            Annuler
          </button>
        </div>
      )}

      {/* ── STEP 2: Success animation ── */}
      {step === 2 && !connected && (
        <div className="px-8 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5 text-emerald-600"
            style={{ animation: "fadeIn 0.4s ease-out" }}>
            <Check size={28} />
          </div>
          <h3 className="text-[17px] font-semibold text-[#0D0D12] mb-2">Salesforce connecté !</h3>
          <p className="text-[13px] text-[#9AA4B2] max-w-sm mx-auto">
            La synchronisation automatique est maintenant active. Toutes les données créées dans Bridge Fund seront envoyées vers votre Salesforce.
          </p>
          <div className="mt-4 w-5 h-5 border-2 border-[#00A1E0] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}
    </div>
  </div>;
}
