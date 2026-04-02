import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { generateWallet } from "../services/cardanoService";

/* ═══════════════════════════════════════════════════════════════
   SignupPage — Real account creation via Supabase Auth
   Creates auth user + waits for profile trigger + updates profile
   Then auto-signs in the user
   ═══════════════════════════════════════════════════════════════ */

export default function SignupPage({ onBack, onLogin, onSuccess, prefill = {} }) {
  const { signIn } = useAuth();
  const [step, setStep] = useState(0); // 0: form, 1: creating, 2: done
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

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const iCls = "w-full h-10 bg-[rgba(0,0,23,0.043)] border border-[rgba(0,0,29,0.1)] rounded-[10px] px-3 text-[14px] text-[#0F0F10] placeholder-[#A8A29E] focus:outline-none focus:border-[rgba(0,0,29,0.3)] focus:ring-2 focus:ring-[rgba(0,0,29,0.05)] transition-[border-color,box-shadow] duration-75";

  const validate = () => {
    if (!form.fullName.trim()) return "Veuillez entrer votre nom complet";
    if (!form.email.trim()) return "Veuillez entrer votre email";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Email invalide";
    if (form.password.length < 6) return "Le mot de passe doit contenir au moins 6 caracteres";
    if (form.password !== form.confirmPassword) return "Les mots de passe ne correspondent pas";
    if (!form.acceptTerms) return "Veuillez accepter les conditions";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setError(null);
    setStep(1);

    try {
      // Step 1: Create auth account
      setStatusMsg("Creation du compte...");
      if (!supabase) throw new Error("Supabase non configure");

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            role: "investor",
          },
        },
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("Erreur lors de la creation du compte");

      // Step 2: Wait for profile trigger to create the row
      setStatusMsg("Configuration du profil...");
      let profileReady = false;
      for (let i = 0; i < 15; i++) {
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();
        if (data) { profileReady = true; break; }
        await new Promise((r) => setTimeout(r, 500));
      }

      // Step 3: Update profile with additional info
      if (profileReady) {
        setStatusMsg("Enregistrement des informations...");
        await supabase.from("profiles").update({
          full_name: form.fullName,
          company: form.company || null,
          investor_type: form.investorType,
          role: "investor",
          updated_at: new Date().toISOString(),
        }).eq("id", userId);

        // Step 4: Generate Cardano wallet
        setStatusMsg("Generation du wallet Cardano...");
        try {
          const wallet = await generateWallet();
          if (wallet?.address) {
            await supabase.from("profiles").update({
              wallet_address: wallet.address,
            }).eq("id", userId);
          }
        } catch (walletErr) {
          console.warn("Wallet generation failed (non-blocking):", walletErr);
        }
      }

      // Step 5: Auto sign-in
      setStatusMsg("Connexion automatique...");
      await signIn(form.email, form.password);

      setStep(2);
      setStatusMsg("Compte cree avec succes !");

      // Redirect after short delay
      setTimeout(() => { onSuccess?.(); }, 1200);

    } catch (err) {
      console.error("Signup error:", err);
      let msg = err.message;
      if (msg.includes("already registered")) msg = "Un compte existe deja avec cet email";
      if (msg.includes("rate limit")) msg = "Trop de tentatives, veuillez patienter";
      setError(msg);
      setStep(0);
      setStatusMsg("");
    }
  };

  // Creating state — progress indicator
  if (step >= 1) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-[380px] w-full text-center page-slide-in">
          {step === 2 ? (
            <>
              <div className="w-14 h-14 bg-[#ECFDF5] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-[20px] font-bold text-[#0F0F10] mb-2">Bienvenue sur Bridge Fund</h2>
              <p className="text-[14px] text-[#787881]">Votre compte a ete cree. Redirection en cours...</p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 border-2 border-[rgba(0,0,29,0.1)] border-t-[#0F0F10] rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-[18px] font-semibold text-[#0F0F10] mb-1">Creation en cours</h2>
              <p className="text-[14px] text-[#787881]">{statusMsg}</p>
              <div className="mt-6 space-y-2">
                {["Creation du compte", "Configuration du profil", "Generation du wallet", "Connexion automatique"].map((label, i) => {
                  const isActive = statusMsg.toLowerCase().includes(label.toLowerCase().slice(0, 8));
                  const isDone = ["Creation du compte", "Configuration du profil", "Generation du wallet", "Connexion automatique"].indexOf(label) <
                    ["Creation du compte", "Configuration du profil", "Enregistrement", "Generation du wallet", "Connexion"].findIndex(s => statusMsg.toLowerCase().includes(s.toLowerCase().slice(0, 8)));
                  return (
                    <div key={label} className={`flex items-center gap-3 text-[13px] ${isActive ? "text-[#0F0F10] font-medium" : isDone ? "text-[#059669]" : "text-[#A8A29E]"}`}>
                      {isDone ? (
                        <svg className="w-4 h-4 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : isActive ? (
                        <div className="w-4 h-4 border-2 border-[rgba(0,0,29,0.1)] border-t-[#0F0F10] rounded-full animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-[rgba(0,0,29,0.1)]" />
                      )}
                      {label}
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

  // Form
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#0F0F10] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-[10px] tracking-wider">BF</span>
          </div>
          <span className="text-[15px] font-semibold text-[#0F0F10] tracking-tight">Bridge Fund</span>
        </div>
        <div className="flex items-center gap-3">
          {onLogin && (
            <button onClick={onLogin} className="text-[14px] text-[#787881] hover:text-[#0F0F10] transition-colors duration-75">
              Se connecter
            </button>
          )}
          {onBack && (
            <button onClick={onBack} className="text-[14px] text-[#787881] hover:text-[#0F0F10] transition-colors duration-75">
              ← Retour
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-[420px] page-slide-in">
          <div className="text-center mb-6">
            <h1 className="text-[24px] font-bold text-[#0F0F10]">Creer votre compte</h1>
            <p className="text-[14px] text-[#787881] mt-1.5">Accedez a la plateforme Bridge Fund en quelques minutes</p>
          </div>

          <div className="bg-white rounded-2xl p-7" style={{ boxShadow: "rgba(0, 0, 23, 0.043) 0px 0px 0px 1px, rgba(16, 24, 40, 0.03) 0px 4px 6px -2px" }}>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[14px] font-medium text-[#0F0F10] mb-1.5">Nom complet</label>
                <input type="text" value={form.fullName} onChange={(e) => set("fullName", e.target.value)}
                  className={iCls} placeholder="Jean Dupont" required />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[14px] font-medium text-[#0F0F10] mb-1.5">Email professionnel</label>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                  className={iCls} placeholder="nom@entreprise.com" required />
              </div>

              {/* Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[14px] font-medium text-[#0F0F10] mb-1.5">Mot de passe</label>
                  <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
                    className={iCls} placeholder="6 caracteres min." required minLength={6} />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#0F0F10] mb-1.5">Confirmer</label>
                  <input type="password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)}
                    className={iCls} placeholder="Confirmer" required minLength={6} />
                </div>
              </div>

              {/* Company (optional) */}
              <div>
                <label className="block text-[14px] font-medium text-[#0F0F10] mb-1.5">
                  Societe <span className="text-[#A8A29E] font-normal">(optionnel)</span>
                </label>
                <input type="text" value={form.company} onChange={(e) => set("company", e.target.value)}
                  className={iCls} placeholder="Nom de votre societe" />
              </div>

              {/* Investor type */}
              <div>
                <label className="block text-[14px] font-medium text-[#0F0F10] mb-1.5">Type d'investisseur</label>
                <select value={form.investorType} onChange={(e) => set("investorType", e.target.value)}
                  className={iCls + " appearance-none bg-[rgba(0,0,23,0.043)]"}>
                  <option value="Professionnel">Investisseur professionnel</option>
                  <option value="Averti">Investisseur averti</option>
                  <option value="Institutionnel">Institutionnel</option>
                </select>
              </div>

              {/* Terms */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.acceptTerms} onChange={(e) => set("acceptTerms", e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-[rgba(0,0,29,0.2)] accent-[#0F0F10]" />
                <span className="text-[13px] text-[#787881] leading-relaxed">
                  J'accepte les <button type="button" className="text-[#0F0F10] font-medium underline">conditions generales</button> et
                  la <button type="button" className="text-[#0F0F10] font-medium underline">politique de confidentialite</button> de Bridge Fund.
                  Je confirme avoir l'age legal requis.
                </span>
              </label>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-[#FEF2F2] text-[#DC2626] text-[13px] px-3 py-2.5 rounded-[10px] border border-[#FECACA]">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit"
                className="w-full h-10 bg-[#0F0F10] text-white text-[14px] font-medium rounded-[10px] hover:bg-[#292524] active:scale-[0.98] transition-all duration-75">
                Creer mon compte
              </button>
            </form>

            {/* Login link */}
            <div className="mt-5 pt-5 border-t border-[rgba(0,0,29,0.075)] text-center">
              <p className="text-[13px] text-[#787881]">
                Deja un compte ?{" "}
                <button onClick={onLogin} className="text-[#0F0F10] font-medium hover:underline">Se connecter</button>
              </p>
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-6 flex items-center justify-center gap-5 text-[12px] text-[#A8A29E]">
            {["Chiffre E2E", "CSSF regulated", "Wallet Cardano"].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#059669]" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
