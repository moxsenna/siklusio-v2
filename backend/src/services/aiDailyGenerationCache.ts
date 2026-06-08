import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../../../supabase/types/database.types";

export type AiDailyFeature = "cycle_report" | "habits_insight";

/**
 * Returns today's date string (YYYY-MM-DD) in WIB (UTC+7).
 */
export function getTodayDateKey(): string {
  const now = new Date();
  const wibOffset = 7 * 60 * 60 * 1000;
  const wibDate = new Date(now.getTime() + wibOffset);
  return wibDate.toISOString().slice(0, 10);
}

export async function getDailyGenerationCache(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  feature: AiDailyFeature,
  generatedForDate: string,
) {
  const { data, error } = await supabaseAdmin
    .from("ai_daily_generation_cache")
    .select("id, result, metadata")
    .eq("user_id", userId)
    .eq("feature", feature)
    .eq("generated_for_date", generatedForDate)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveDailyGenerationCache(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  feature: AiDailyFeature,
  generatedForDate: string,
  result: Json,
  metadata: Json = {},
) {
  const { error } = await supabaseAdmin.from("ai_daily_generation_cache").insert({
    user_id: userId,
    feature,
    generated_for_date: generatedForDate,
    result,
    metadata,
  });

  if (error) throw error;
}