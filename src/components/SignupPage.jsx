import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { generateWallet } from "../services/cardanoService";

/* ═══════════════════════════════════════════════════════════════
   SignupPage — ElevenLabs-style fluid signup (no card, no shadow)
   Real Supabase auth.signUp → profile → wallet → auto-login
   ═══════════════════════════════════════════════════════════════ */

const iCls = "w-full h-11 bg-transparent border-b border-[rgba(0,0,29,0.15)] px-0 text-[15px] text-[#0F0F10] placeholder-[#C4C0BB] focus:outline-none focus:border-[#0F0F10] transition-[border-color] duration-200";

export default function SignupPage({ onBack, onLogin, onSuccess, prefill = {} }) {
  const { signIn } = useAuth();
  const [step, setStep] = useState(0); // 0: form, 1: creating, 2: done
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState({
    fullName: prefill.name || "",
    email: "",
    password: "",
    confirmPassword: "",
    company: prefill.company || "",
    investorType: prefill.investorType || "Professionnel",
    acceptTerms: false,
  });
  const [error, setError] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [completedSteps, setCompletedSteps] = useState([]);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const validate = () => {
    if (!form.fullName.trim()) return "Veuillez entrer votre nom complet";
    if (!form.email.trim()) return "Veuillez entrer votre email";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Email invalide";
    if (form.password.length < 6) return "Le mot de passe doit contenir au moins 6 caracteres";
    if (form.password !== form.confirmPassword) return "Les mots de passe ne correspondent pas";
    if (!form.acceptTerms) return "Veuillez accepter les conditions";
    return null;
  };

  const markDone = (label) => setCompletedSteps(prev => [...prev, label]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setError(null);
    setStep(1);

    try {
      setStatusMsg("Creation du compte...");
      if (!supabase) throw new Error("Supabase non configure");

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName, role: "investor" } },
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("Erreur lors de la creation du compte");
      markDone("compte");

      setStatusMsg("Configuration du profil...");
      let profileReady = false;
      for (let i = 0; i < 15; i++) {
        const { data } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
        if (data) { profileReady = true; break; }
        await new Promise((r) => setTimeout(r, 500));
      }

      if (profileReady) {
        setStatusMsg("Enregistrement des informations...");
        await supabase.from("profiles").update({
          full_name: form.fullName,
          company: form.company || null,
          investor_type: form.investorType,
          role: "investor",
          updated_at: new Date().toISOString(),
        }).eq("id", userId);
      }
      markDone("profil");

      setStatusMsg("Generation du wallet Cardano...");
      try {
        const wallet = await generateWallet();
        if (wallet?.address) {
          await supabase.from("profiles").update({ wallet_address: wallet.address }).eq("id", userId);
        }
      } catch (walletErr) {
        console.warn("Wallet generation failed (non-blocking):", walletErr);
      }
      markDone("wallet");

      setStatusMsg("Connexion automatique...");
      await signIn(form.email, form.password);
      markDone("connexion");

      setStep(2);
      setStatusMsg("Compte cree avec succes !");
      setTimeout(() => { onSuccess?.(); }, 1200);

    } catch (err) {
      console.error("Signup error:", err);
      let msg = err.message;
      if (msg.includes("already registered")) msg = "Un compte existe deja avec cet email";
      if (msg.includes("rate limit")) msg = "Trop de tentatives, veuillez patienter";
      setError(msg);
      setStep(0);
      setStatusMsg("");
      setCompletedSteps([]);
    }
  };

  const progressSteps = [
    { key: "compte", label: "Creation du compte" },
    { key: "profil", label: "Configuration du profil" },
    { key: "wallet", label: "Generation du wallet" },
    { key: "connexion", label: "Connexion automatique" },
  ];

  // Creating / done state
  if (step >= 1) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-[360px] w-full text-center" style={{
          opacity: 1,
          animation: "fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}>
          {step === 2 ? (
            <>
              <div className="w-12 h-12 rounded-full bg-[#059669] flex items-center justify-center mx-auto mb-5">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-[20px] font-bold text-[#0F0F10] tracking-tight mb-1.5">Bienvenue sur Bridge Fund</h2>
              <p className="text-[14px] text-[#787881]">Votre compte a ete cree. Redirection...</p>
            </>
          ) : (
            <>
              <div className="w-8 h-8 border-[1.5px] border-[rgba(0,0,29,0.1)] border-t-[#0F0F10] rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-[18px] font-semibold text-[#0F0F10] tracking-tight mb-1">Creation en cours</h2>
              <p className="text-[13px] text-[#787881] mb-8">{statusMsg}</p>
              <div className="space-y-3 text-left max-w-[220px] mx-auto">
                {progressSteps.map((s) => {
                  const done = completedSteps.includes(s.key);
                  const active = !done && statusMsg.toLowerCase().includes(s.label.toLowerCase().slice(0, 8));
                  return (
                    <div key={s.key} className={`flex items-center gap-3 text-[13px] transition-colors duration-200 ${done ? "text-[#059669]" : active ? "text-[#0F0F10] font-medium" : "text-[#D6D3D1]"}`}>
                      {done ? (
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : active ? (
                        <div className="w-4 h-4 border-[1.5px] border-[rgba(0,0,29,0.1)] border-t-[#0F0F10] rounded-full animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-[#E5E5E5] flex-shrink-0" />
                      )}
                      {s.label}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Form — no card, floating on white like ElevenLabs
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Minimal top bar */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#0F0F10] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-[9px] tracking-wider">BF</span>
          </div>
          <span className="text-[14px] font-semibold text-[#0F0F10] tracking-tight">Bridge Fund</span>
        </div>
        <div className="flex items-center gap-4">
          {onLogin && (
            <button onClick={onLogin} className="text-[13px] text-[#A8A29E] hover:text-[#0F0F10] transition-colors">
              Se connecter
            </button>
          )}
          {onBack && (
            <button onClick={onBack} className="text-[13px] text-[#A8A29E] hover:text-[#0F0F10] transition-colors">
              Retour
            </button>
          )}
        </div>
      </div>

      {/* Form — centered, no card wrapper */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-[400px]" style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <h1 className="text-[22px] font-bold text-[#0F0F10] tracking-tight mb-1">Creer votre compte</h1>
          <p className="text-[14px] text-[#787881] mb-8">Accedez a Bridge Fund en quelques minutes</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-[#0F0F10] mb-2">Nom complet</label>
              <input type="text" value={form.fullName} onChange={(e) => set("fullName", e.target.value)}
                className={iCls} placeholder="Jean Dupont" required />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#0F0F10] mb-2">Email professionnel</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                className={iCls} placeholder="nom@entreprise.com" required />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-[13px] font-medium text-[#0F0F10] mb-2">Mot de passe</label>
                <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
                  className={iCls} placeholder="6 caracteres min." required minLength={6} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0F0F10] mb-2">Confirmer</label>
                <input type="password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)}
                  className={iCls} placeholder="Confirmer" required minLength={6} />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#0F0F10] mb-2">
                Societe <span className="text-[#C4C0BB] font-normal">(optionnel)</span>
              </label>
              <input type="text" value={form.company} onChange={(e) => set("company", e.target.value)}
                className={iCls} placeholder="Nom de votre societe" />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#0F0F10] mb-2">Type d'investisseur</label>
              <select value={form.investorType} onChange={(e) => set("investorType", e.target.value)}
                className={iCls + " appearance-none cursor-pointer"}>
                <option value="Professionnel">Investisseur professionnel</option>
                <option value="Averti">Investisseur averti</option>
                <option value="Institutionnel">Institutionnel</option>
              </select>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer pt-2">
              <input type="checkbox" checked={form.acceptTerms} onChange={(e) => set("acceptTerms", e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-[#D6D3D1] accent-[#0F0F10]" />
              <span className="text-[12px] text-[#A8A29E] leading-relaxed">
                J'accepte les <button type="button" className="text-[#0F0F10] font-medium hover:underline">conditions generales</button> et
                la <button type="button" className="text-[#0F0F10] font-medium hover:underline">politique de confidentialite</button> de Bridge Fund.
              </span>
            </label>

            {/* Error */}
            {error && (
              <p className="text-[13px] text-[#DC2626] py-1">{error}</p>
            )}

            {/* Submit */}
            <button type="submit"
              className="w-full h-11 bg-[#0F0F10] text-white text-[14px] font-medium rounded-full hover:bg-[#292524] active:scale-[0.98] transition-all duration-100">
              Creer mon compte
            </button>
          </form>

          {/* Login link */}
          <p className="text-[13px] text-[#A8A29E] text-center mt-6">
            Deja un compte ?{" "}
            <button onClick={onLogin} className="text-[#0F0F10] font-medium hover:underline">Se connecter</button>
          </p>
        </div>
      </main>
    </div>
  );
}
