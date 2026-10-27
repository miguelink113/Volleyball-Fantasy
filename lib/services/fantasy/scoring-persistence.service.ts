import { SupabaseClient } from "@supabase/supabase-js";
import { ScoringSystemV1 } from "@/domain/scoring/scoring-v1.system";
import { getRoundsBySeasonId } from "@/lib/repositories/rounds.repository";
import { getMatchesByRoundId } from "@/lib/repositories/matches.repository";
import { getStatsByMatchIds } from "@/lib/repositories/match-player-stats.repository";

export async function persistScoresForSeason(
    supabase: SupabaseClient,
    competitionId: string,
    seasonId: string
) {
    const scoringSystem = new ScoringSystemV1();
    const rounds = await getRoundsBySeasonId(supabase, seasonId);

    let processedRounds = 0;
    let processedMatches = 0;

    for (const round of rounds) {
        const matches = await getMatchesByRoundId(supabase, round.id);
        if (matches.length === 0) continue;

        const matchIds = matches.map((m) => m.id);
        const allStats = await getStatsByMatchIds(supabase, matchIds);
        const matchById = new Map(matches.map(m => [m.id, m]));

        const matchScoresToUpsert = [];
        const roundScoresMap = new Map<string, { score: number, breakdown: Record<string, number> }>();

        for (const stats of allStats) {
            const match = matchById.get(stats.matchId);
            if (!match) continue;

            const scoreResult = scoringSystem.calculate(stats, match);

            matchScoresToUpsert.push({
                competition_id: competitionId,
                season_id: seasonId,
                player_id: stats.playerId,
                match_id: stats.matchId,
                round_id: round.id,
                scoring_version: scoringSystem.version,
                score: scoreResult.totalScore,
                breakdown: scoreResult.breakdown,
                is_provisional: scoreResult.isProvisional
            });

            const current = roundScoresMap.get(stats.playerId) || { score: 0, breakdown: {} };
            current.score += scoreResult.totalScore;
            Object.entries(scoreResult.breakdown).forEach(([key, val]) => {
                current.breakdown[key] = (current.breakdown[key] || 0) + val;
            });
            roundScoresMap.set(stats.playerId, current);
        }

        if (matchScoresToUpsert.length > 0) {
            const { error: err1 } = await supabase.from("player_match_scores").upsert(matchScoresToUpsert, {
                onConflict: "player_id,match_id,scoring_version"
            });
            if (err1) throw err1;
            processedMatches += matchScoresToUpsert.length;
        }

        const roundScoresToUpsert = Array.from(roundScoresMap.entries()).map(([playerId, data]) => ({
            competition_id: competitionId,
            season_id: seasonId,
            player_id: playerId,
            round_id: round.id,
            scoring_version: scoringSystem.version,
            score: data.score,
            breakdown: data.breakdown,
            is_provisional: false
        }));

        if (roundScoresToUpsert.length > 0) {
            const { error: err2 } = await supabase.from("player_round_scores").upsert(roundScoresToUpsert, {
                onConflict: "player_id,round_id,scoring_version"
            });
            if (err2) throw err2;
        }

        const { data: lineups } = await supabase.from("lineups").select("id, fantasy_team_id").eq("round_id", round.id);
        const fantasyScoresToUpsert = [];

        for (const lineup of lineups || []) {
            const { data: lineupPlayers } = await supabase.from("lineup_players").select("player_id").eq("lineup_id", lineup.id);
            if (!lineupPlayers || lineupPlayers.length !== 7) continue;

            let teamScore = 0;
            const teamBreakdown: Record<string, number> = {};

            for (const lp of lineupPlayers) {
                const playerRoundScore = roundScoresMap.get(lp.player_id);
                if (playerRoundScore) {
                    teamScore += playerRoundScore.score;
                    Object.entries(playerRoundScore.breakdown).forEach(([k, v]) => {
                        teamBreakdown[k] = (teamBreakdown[k] || 0) + v;
                    });
                }
            }

            fantasyScoresToUpsert.push({
                fantasy_team_id: lineup.fantasy_team_id,
                competition_id: competitionId,
                season_id: seasonId,
                lineup_id: lineup.id,
                round_id: round.id,
                scoring_version: scoringSystem.version,
                score: teamScore,
                breakdown: teamBreakdown
            });
        }

        if (fantasyScoresToUpsert.length > 0) {
            const { error: err3 } = await supabase.from("fantasy_scores").upsert(fantasyScoresToUpsert, {
                onConflict: "fantasy_team_id,round_id,scoring_version"
            });
            if (err3) throw err3;
        }

        processedRounds++;
    }

    return { processedRounds, processedMatches };
}