import { supabase } from "../lib/supabase";

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

// ─── Admin: create a user account (uses Supabase Admin API via edge function or service role) ───
// For now, we use supabase.auth.admin if available, otherwise signUp + profile update
export async function createUser({ email, password, fullName, role, company, intermediaryId }) {
  // Sign up the user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
    },
  });
  if (error) throw error;

  // Update profile with additional fields (company, intermediary link)
  if (data.user) {
    const updates = {};
    if (company) updates.company = company;
    if (intermediaryId) updates.intermediary_id = intermediaryId;
    if (role) updates.role = role;
    if (fullName) updates.full_name = fullName;

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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role: "investor" },
    },
  });
  if (error) throw error;

  // Link to intermediary
  if (data.user) {
    const { error: linkErr } = await supabase
      .from("profiles")
      .update({ intermediary_id: me.id, company: company || null })
      .eq("id", data.user.id);
    if (linkErr) console.error("Failed to link client:", linkErr);
  }

  return data;
}
