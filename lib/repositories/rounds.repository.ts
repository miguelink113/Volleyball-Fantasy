import type { SupabaseClient } from "@supabase/supabase-js";

export async function getRoundBySeasonAndNumber(
    supabase: SupabaseClient,
    seasonId: string,
    roundNumber: number
) {
    const { data, error } = await supabase
        .from("rounds")
        .select("id, round_number, name, starts_at, ends_at, status")
        .eq("season_id", seasonId)
        .eq("round_number", roundNumber)
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function getRoundsBySeasonId(
    supabase: SupabaseClient,
    seasonId: string
) {
    const { data, error } = await supabase
        .from("rounds")
        .select("id, round_number, name, starts_at, ends_at, status")
        .eq("season_id", seasonId)
        .order("round_number");

    if (error) throw error;
    return data ?? [];
}