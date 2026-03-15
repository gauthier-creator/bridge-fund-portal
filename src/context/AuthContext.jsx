import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentUserIdRef = useRef(null);

  // Fetch profile from profiles table
  const fetchProfile = useCallback(async (userId) => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) {
      console.error("Failed to fetch profile:", error.message);
      return null;
    }
    return data;
  }, []);

  // Initialize session
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        currentUserIdRef.current = s.user.id;
        const p = await fetchProfile(s.user.id);
        setProfile(p);
      }
      setLoading(false);
    }).catch((err) => {
      console.error("Auth init failed:", err);
      setLoading(false);
    });

    // Listen for auth changes — defensive approach:
    // User switches are ONLY handled by signIn/signOut directly.
    // onAuthStateChange only handles: sign-out events and token refreshes
    // for the SAME user. This prevents signUp (admin creating users) from
    // hijacking the session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        // Only clear state on explicit sign-out
        if (event === "SIGNED_OUT") {
          currentUserIdRef.current = null;
          setSession(null);
          setProfile(null);
          return;
        }

        // Ignore any event that arrives without a valid session
        if (!s?.user) return;

        // IGNORE user switches from onAuthStateChange entirely.
        // Legitimate logins are handled by signIn() which updates state directly.
        // This prevents signUp() (admin creating users) from hijacking the session.
        if (s.user.id !== currentUserIdRef.current) return;

        // Same user — just update the session token (needed for API calls)
        setSession(s);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) throw new Error("Supabase non configuré");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Handle user switch directly here — don't rely on onAuthStateChange
    setSession(data.session);
    if (data.user) {
      currentUserIdRef.current = data.user.id;
      const p = await fetchProfile(data.user.id);
      setProfile(p);
    }
    return data;
  }, [fetchProfile]);

  const signUp = useCallback(async (email, password, metadata = {}) => {
    if (!supabase) throw new Error("Supabase non configuré");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    // Clear state immediately so UI reacts before the async call
    currentUserIdRef.current = null;
    setSession(null);
    setProfile(null);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("signOut error:", err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      const p = await fetchProfile(session.user.id);
      setProfile(p);
    }
  }, [session, fetchProfile]);

  // Memoize context value — only re-render consumers when meaningful data changes
  const user = session?.user || null;
  const role = profile?.role || null;
  const value = useMemo(() => ({
    session,
    user,
    profile,
    role,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }), [user?.id, profile, role, loading, signIn, signUp, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
