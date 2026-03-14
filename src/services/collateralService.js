import { supabase } from "../lib/supabase";

function dbToPosition(row) {
  return {
    id: row.id,
    owner: row.owner,
    tokens: Number(row.tokens),
    type: row.type,
    pool: row.pool,
    apy: Number(row.apy),
    date: row.position_date || row.created_at?.split("T")[0],
    userId: row.user_id,
    managedBy: row.managed_by,
  };
}

export async function fetchCollateralPositions() {
  const { data, error } = await supabase
    .from("collateral_positions")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(dbToPosition);
}

export async function addCollateralPosition(position) {
  const { data, error } = await supabase
    .from("collateral_positions")
    .insert({
      owner: position.owner,
      tokens: position.tokens,
      type: position.type,
      pool: position.pool,
      apy: position.apy,
      position_date: position.date || new Date().toISOString().split("T")[0],
      user_id: position.userId || null,
      managed_by: position.managedBy || null,
    })
    .select()
    .single();
  if (error) throw error;
  return dbToPosition(data);
}

export async function removeCollateralPosition(positionId) {
  const { error } = await supabase
    .from("collateral_positions")
    .delete()
    .eq("id", positionId);
  if (error) throw error;
}
