import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchPlayerStats } from "@/domain/match/match-player-stats.types";

export async function getStatsByMatchIds(
    supabase: SupabaseClient,
    matchIds: string[]
): Promise<MatchPlayerStats[]> {
    if (matchIds.length === 0) return [];

    const { data, error } = await supabase
        .from("match_player_stats")
        .select(`
            match_id, player_id, team_id, position, sets_played,
            points_total, points_breakout, won_lost,
            serve_total, serve_errors, serve_aces,
            reception_total, reception_errors, reception_positive, reception_excellent,
            attack_total, attack_errors, attack_blocked, attack_excellent, attack_excellent_percentage,
            block_points
        `)
        .in("match_id", matchIds);

    if (error) throw error;

    return (data ?? []).map((row) => ({
        matchId: row.match_id,
        playerId: row.player_id,
        teamId: row.team_id,
        position: row.position as MatchPlayerStats["position"],
        setsPlayed: row.sets_played,
        pointsTotal: row.points_total,
        pointsBreakout: row.points_breakout,
        wonLost: row.won_lost,
        serveTotal: row.serve_total,
        serveErrors: row.serve_errors,
        serveAces: row.serve_aces,
        receptionTotal: row.reception_total,
        receptionErrors: row.reception_errors,
        receptionPositive: row.reception_positive,
        receptionExcellent: row.reception_excellent,
        attackTotal: row.attack_total,
        attackErrors: row.attack_errors,
        attackBlocked: row.attack_blocked,
        attackPoints: row.attack_excellent,
        attackExcellentPercentage: row.attack_excellent_percentage,
        blockPoints: row.block_points,
    }));
}