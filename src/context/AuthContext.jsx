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
    // 1. SIGNED_OUT: clear everything
    // 2. All other events with null session: IGNORE (prevents tab-switch flicker)
    // 3. Same user: just update session silently
    // 4. Different user: update session + fetch profile
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
        // (e.g. transient state during token refresh on tab visibility)
        if (!s?.user) return;

        // Always update session token (needed for API calls)
        setSession(s);

        // Only re-fetch profile when a genuinely different user signs in
        if (s.user.id !== currentUserIdRef.current) {
          currentUserIdRef.current = s.user.id;
          const p = await fetchProfile(s.user.id);
          setProfile(p);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) throw new Error("Supabase non configuré");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

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
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
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
