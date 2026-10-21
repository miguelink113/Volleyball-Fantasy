import type { SupabaseClient } from "@supabase/supabase-js";
import type { Match } from "@/domain/match/match.types";

export async function getMatchesByRoundId(
    supabase: SupabaseClient,
    roundId: string
): Promise<Match[]> {
    const { data, error } = await supabase
        .from("matches")
        .select(`
            id, rfevb_match_id, competition_id, season_id, round_id,
            home_team_id, away_team_id, home_sets, away_sets, status, sets
        `)
        .eq("round_id", roundId);

    if (error) throw error;

    return (data ?? []).map((row) => ({
        id: row.id,
        rfevbMatchId: row.rfevb_match_id,
        competitionId: row.competition_id,
        seasonId: row.season_id,
        roundNumber: 0, // No lo necesitamos para el scoring, se puede rellenar si hace falta
        homeTeamId: row.home_team_id,
        awayTeamId: row.away_team_id,
        homeSets: row.home_sets,
        awaySets: row.away_sets,
        status: row.status as Match["status"],
        sets: row.sets as Match["sets"],
    }));
}