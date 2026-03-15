import { supabase } from "../lib/supabase";
import { generateWallet } from "./cardanoService";

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
      const { error: profileErr } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", data.user.id);
      if (profileErr) console.error("Failed to update profile:", profileErr);
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
    .single();
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
export async function createClientAccount({ email, password, fullName, company }) {
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

  // Link to intermediary + generate wallet
  if (data.user) {
    const updates = { intermediary_id: me.id, company: company || null };

    // Generate a Cardano wallet for this investor
    try {
      const wallet = await generateWallet(data.user.id);
      if (wallet?.address) updates.wallet_address = wallet.address;
    } catch (err) {
      console.error("Failed to generate wallet:", err);
    }

    const { error: linkErr } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", data.user.id);
    if (linkErr) console.error("Failed to update client profile:", linkErr);
  }

  return data;
}
