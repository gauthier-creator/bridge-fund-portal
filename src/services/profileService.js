import { supabase } from "../lib/supabase";
import { generateWallet } from "./cardanoService";

// Wait for the profiles trigger to create the row after auth.signUp
// Uses select for admin/aifm (who can see all profiles), or update-and-check for intermediaries
async function waitForProfile(userId, maxRetries = 10, delayMs = 500) {
  for (let i = 0; i < maxRetries; i++) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (data) return true;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

// Retry an update until the target row exists (handles trigger delay + RLS)
async function retryUpdate(table, updates, matchColumn, matchValue, maxRetries = 15, delayMs = 600) {
  for (let i = 0; i < maxRetries; i++) {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq(matchColumn, matchValue)
      .select("id")
      .maybeSingle();
    if (error) {
      console.warn(`[retryUpdate] Attempt ${i + 1} error:`, error.message);
    }
    if (data) return { data, error: null };
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return { data: null, error: new Error(`Update failed after ${maxRetries} retries`) };
}

// ─── Fetch current user's profile ───
export async function fetchMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  return data;
}

// ─── Update own profile ───
export async function updateProfile(updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Admin: list all profiles ───
export async function listProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

// ─── Admin: create a user account ───
export async function createUser({ email, password, fullName, role, company, intermediaryId }) {
  // Save current admin session before signUp (which changes the active session)
  const { data: { session: adminSession } } = await supabase.auth.getSession();

  // Sign up the new user — AuthContext ignores user switches from onAuthStateChange,
  // so this won't hijack the admin session in the UI
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
    },
  });
  if (error) {
    if (adminSession) await supabase.auth.setSession(adminSession);
    throw error;
  }

  // Restore admin session
  if (adminSession) {
    await supabase.auth.setSession(adminSession);
  }

  // Update profile with additional fields (company, intermediary link)
  if (data.user) {
    const updates = {};
    if (company) updates.company = company;
    if (intermediaryId) updates.intermediary_id = intermediaryId;
    if (role) updates.role = role;
    if (fullName) updates.full_name = fullName;

    // Generate a Cardano wallet for this user
    try {
      const wallet = await generateWallet(data.user.id);
      if (wallet?.address) updates.wallet_address = wallet.address;
    } catch (err) {
      console.error("Failed to generate wallet:", err);
    }

    if (Object.keys(updates).length > 0) {
      // Retry update until the profile row is created by the DB trigger
      const { error: profileErr } = await retryUpdate(
        "profiles", updates, "id", data.user.id
      );
      if (profileErr) console.error("Failed to update profile:", profileErr.message);
    }
  }

  return data;
}

// ─── Admin: update any user's profile ───
export async function updateUserProfile(userId, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Intermediary: list my clients ───
export async function listMyClients() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("intermediary_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

// ─── Intermediary: create a client account ───
export async function createClientAccount({ email, password, fullName, company, kycData }) {
  const { data: { user: me } } = await supabase.auth.getUser();
  if (!me) throw new Error("Not authenticated");

  // Save current session before signUp
  const { data: { session: currentSession } } = await supabase.auth.getSession();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role: "investor" },
    },
  });
  if (error) {
    if (currentSession) await supabase.auth.setSession(currentSession);
    throw error;
  }

  // Restore session
  if (currentSession) {
    await supabase.auth.setSession(currentSession);
  }

  // Link to intermediary + generate wallet + persist KYC via SECURITY DEFINER RPC
  if (data.user) {
    let walletAddress = null;
    try {
      const wallet = await generateWallet(data.user.id);
      if (wallet?.address) walletAddress = wallet.address;
    } catch (err) {
      console.error("Failed to generate wallet:", err);
    }

    const { data: linked, error: linkErr } = await supabase.rpc("link_client_to_intermediary", {
      client_id: data.user.id,
      inter_id: me.id,
      p_company: company || null,
      p_wallet_address: walletAddress,
      p_kyc_status: kycData?.kyc_status || "pending",
      p_person_type: kycData?.person_type || "physique",
      p_investor_classification: kycData?.investor_classification || null,
      p_source_of_funds: kycData?.source_of_funds || null,
      p_pep_status: kycData?.pep_status || "non",
      p_country: kycData?.country || "France",
      p_fatca_status: kycData?.fatca_status || "non_us",
      p_tax_residence: kycData?.tax_residence || "France",
    });
    if (linkErr) console.error("Failed to link client profile:", linkErr.message);
    else console.log("[Client] Profile linked via RPC:", linked?.id || data.user.id);
  }

  return data;
}
