import type { SupabaseClient } from "@supabase/supabase-js";
import type { Player } from "@/domain/player/player.types";

export async function getPlayersBySeasonId(
    supabase: SupabaseClient,
    seasonId: string
): Promise<Player[]> {
    const { data, error } = await supabase
        .from("players")
        .select("id, rfevb_id, first_name, last_name, display_name, position, team_id, dorsal")
        .eq("season_id", seasonId)
        .order("display_name");

    if (error) throw error;

    return (data ?? []).map((row) => ({
        id: row.id,
        rfevbId: row.rfevb_id,
        firstName: row.first_name,
        lastName: row.last_name,
        displayName: row.display_name,
        position: row.position as Player["position"],
        currentTeamId: row.team_id,
        dorsal: row.dorsal ?? undefined,
    }));
}