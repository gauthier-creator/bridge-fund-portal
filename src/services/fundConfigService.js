import { supabase } from "../lib/supabase";

export async function getFundConfig() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("fund_config")
    .select("*")
    .eq("id", "default")
    .single();
  if (error) {
    console.error("Failed to fetch fund config:", error.message);
    return null;
  }
  // Parse JSON fields
  if (data) {
    try { data.highlights = JSON.parse(data.highlights || "[]"); } catch { data.highlights = []; }
    try { data.share_classes = JSON.parse(data.share_classes || "[]"); } catch { data.share_classes = []; }
  }
  return data;
}

export async function updateFundConfig(config) {
  if (!supabase) throw new Error("Supabase non configuré");
  const { data: { user } } = await supabase.auth.getUser();

  const payload = {
    ...config,
    highlights: typeof config.highlights === "string" ? config.highlights : JSON.stringify(config.highlights || []),
    share_classes: typeof config.share_classes === "string" ? config.share_classes : JSON.stringify(config.share_classes || []),
    updated_at: new Date().toISOString(),
    updated_by: user?.id || null,
  };

  const { data, error } = await supabase
    .from("fund_config")
    .upsert({ id: "default", ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadFundAsset(file, filename) {
  if (!supabase) throw new Error("Supabase non configuré");
  const path = `${Date.now()}_${filename || file.name}`;
  const { error } = await supabase.storage
    .from("fund-assets")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("fund-assets").getPublicUrl(path);
  return data?.publicUrl || null;
}
