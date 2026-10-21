import type { SupabaseClient } from "@supabase/supabase-js";
import type { Team } from "@/domain/team/team.types";

export async function getTeamsBySeasonId(
    supabase: SupabaseClient,
    seasonId: string
): Promise<Team[]> {
    const { data, error } = await supabase
        .from("teams")
        .select("id, rfevb_id, name, active")
        .eq("season_id", seasonId)
        .order("name");

    if (error) throw error;

    return (data ?? []).map((row) => ({
        id: row.id,
        rfevbId: row.rfevb_id,
        name: row.name,
        // logoUrl y shortName no están en la tabla actualmente,
        // pero el dominio los permite como opcionales.
    }));
}