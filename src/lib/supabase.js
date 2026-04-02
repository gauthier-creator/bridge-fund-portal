import { createClient } from "@supabase/supabase-js";

// Hardcoded fallbacks for demo deployment (anon key is public/client-safe)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://agzynplcoereeqzvzdiz.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnenlucGxjb2VyZWVxenZ6ZGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDAyODEsImV4cCI6MjA4OTA3NjI4MX0.xOJQ533EzKwDyUIA7NHaGcSKrFIH6BrgHfLyox2f7dA";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
