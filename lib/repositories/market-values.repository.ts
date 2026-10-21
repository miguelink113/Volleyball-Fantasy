import type { SupabaseClient } from "@supabase/supabase-js";

export async function getMarketValuesByRoundId(
    supabase: SupabaseClient,
    roundId: string
): Promise<Map<string, number>> {
    const { data, error } = await supabase
        .from("player_market_values")
        .select("player_id, price")
        .eq("round_id", roundId);

    if (error) throw error;

    const priceMap = new Map<string, number>();
    for (const row of data ?? []) {
        priceMap.set(row.player_id, Number(row.price));
    }
    return priceMap;
}