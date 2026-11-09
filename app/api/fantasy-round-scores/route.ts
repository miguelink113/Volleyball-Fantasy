import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin.server";
import { getRoundsBySeasonId } from "@/lib/repositories/rounds.repository";
import { getMatchesByRoundId } from "@/lib/repositories/matches.repository";
import { getStatsByMatchIds } from "@/lib/repositories/match-player-stats.repository";
import { ScoringSystemV1 } from "@/domain/scoring/scoring-v1.system";
import { getRoundLabel } from "@/lib/utils/round-label";

export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const competitionId = Number(params.get("competition"));
    const seasonId = Number(params.get("season"));
    const roundStr = params.get("round");
    const roundNumber = roundStr ? Number(roundStr) : undefined;
    const playerId = params.get("playerId");

    if (
        !Number.isInteger(competitionId) || competitionId <= 0 ||
        !Number.isInteger(seasonId) || seasonId <= 0 ||
        (roundNumber !== undefined && (!Number.isInteger(roundNumber) || roundNumber <= 0))
    ) {
        return NextResponse.json({ success: false, error: "Parámetros inválidos." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();

        const { data: comp } = await supabase.from("competitions").select("id").eq("rfevb_id", String(competitionId)).single();
        if (!comp) throw new Error("Competición no encontrada");

        const { data: seasonData, error: seasonError } = await supabase
            .from("seasons")
            .select("id")
            .eq("competition_id", comp.id)
            .eq("rfevb_id", String(seasonId))
            .single();

        if (seasonError || !seasonData) throw new Error("Temporada no válida");

        const scoringSystem = new ScoringSystemV1();

        // 🚀 FAST-TRACK: Si nos piden un jugador específico
        if (playerId) {
            const allRounds = await getRoundsBySeasonId(supabase, seasonData.id);

            const uniqueRoundsMap = new Map<number, any>();
            for (const r of allRounds) {
                if (!uniqueRoundsMap.has(r.round_number)) {
                    uniqueRoundsMap.set(r.round_number, r);
                }
            }
            const uniqueRounds = Array.from(uniqueRoundsMap.values()).sort((a, b) => a.round_number - b.round_number);

            const { data: rawStats, error: statsError } = await supabase
                .from('match_player_stats')
                .select(`
                    *,
                    match:matches (
                        *,
                        round:rounds ( round_number ),
                        home_team:teams!home_team_id ( name ),
                        away_team:teams!away_team_id ( name )
                    )
                `)
                .eq('player_id', playerId)
                .eq('season_id', seasonData.id);

            if (statsError) throw statsError;

            const statsByRound = new Map<number, any[]>();
            for (const stats of (rawStats || [])) {
                if (!stats.match || !stats.match.round) continue;
                const roundNum = stats.match.round.round_number;
                const list = statsByRound.get(roundNum) || [];
                list.push(stats);
                statsByRound.set(roundNum, list);
            }

            const result = uniqueRounds.map(round => {
                const roundStats = statsByRound.get(round.round_number) || [];
                let totalScore = 0;
                let aggregatedBreakdown: any = {};
                const matchesData: any[] = [];

                for (const stats of roundStats) {
                    const mappedStats = {
                        setsPlayed: stats.sets_played || 0,
                        pointsTotal: stats.points_total || 0,
                        pointsBreakout: stats.points_breakout || 0,
                        wonLost: stats.won_lost || 0,
                        serveTotal: stats.serve_total || 0,
                        serveErrors: stats.serve_errors || 0,
                        serveAces: stats.serve_aces || 0,
                        receptionTotal: stats.reception_total || 0,
                        receptionErrors: stats.reception_errors || 0,
                        receptionPositive: stats.reception_positive || 0,
                        receptionExcellent: stats.reception_excellent || 0,
                        attackTotal: stats.attack_total || 0,
                        attackErrors: stats.attack_errors || 0,
                        attackBlocked: stats.attack_blocked || 0,
                        attackPoints: stats.attack_excellent || 0,
                        attackExcellentPercentage: stats.attack_excellent_percentage || 0,
                        blockPoints: stats.block_points || 0,
                        teamId: stats.team_id,
                        position: stats.position,
                    };

                    const mappedMatch = {
                        id: stats.match.id,
                        homeTeamId: stats.match.home_team_id,
                        awayTeamId: stats.match.away_team_id,
                        homeSets: stats.match.home_sets,
                        awaySets: stats.match.away_sets,
                        status: stats.match.status,
                    };

                    // @ts-ignore
                    const scoreResult = scoringSystem.calculate(mappedStats, mappedMatch);
                    totalScore += scoreResult.totalScore;

                    Object.entries(scoreResult.breakdown).forEach(([key, value]) => {
                        aggregatedBreakdown[key] = (aggregatedBreakdown[key] || 0) + value;
                    });

                    matchesData.push({
                        id: stats.match.id,
                        homeTeam: stats.match.home_team?.name ?? "?",
                        awayTeam: stats.match.away_team?.name ?? "?",
                        homeSets: stats.match.home_sets,
                        awaySets: stats.match.away_sets,
                        rawStats: {
                            setsPlayed: stats.sets_played,
                            pointsTotal: stats.points_total,
                            serveAces: stats.serve_aces,
                            serveErrors: stats.serve_errors,
                            serveTotal: stats.serve_total,
                            attackPoints: stats.attack_excellent,
                            attackErrors: stats.attack_errors,
                            attackBlocked: stats.attack_blocked,
                            blockPoints: stats.block_points,
                            receptionTotal: stats.reception_total,
                            receptionErrors: stats.reception_errors,
                            receptionPositive: stats.reception_positive,
                            receptionExcellent: stats.reception_excellent,
                        }
                    });
                }

                return {
                    playerId,
                    roundNumber: round.round_number,
                    score: totalScore,
                    breakdown: aggregatedBreakdown,
                    matchesPlayed: matchesData.length,
                    matches: matchesData,
                    scoringVersion: scoringSystem.version
                };
            });

            return NextResponse.json({ success: true, scores: result });
        }

        // CÁLCULO NORMAL (Para la liga entera)
        // 1. Traemos TODAS las jornadas y filtramos en memoria
        const allRounds = await getRoundsBySeasonId(supabase, seasonData.id);

        let rounds = allRounds;
        if (roundNumber !== undefined) {
            rounds = allRounds.filter(r => r.round_number === roundNumber);
        }

        const scoresResult = [];
        for (const round of rounds) {
            const matches = await getMatchesByRoundId(supabase, round.id);
            const matchIds = matches.map((m) => m.id);
            const allStats = await getStatsByMatchIds(supabase, matchIds);
            const matchById = new Map(matches.map(m => [m.id, m]));
            const scoresMap = new Map<string, { playerId: string, score: number, breakdown: any, matchesPlayed: number }>();

            for (const stats of allStats) {
                const match = matchById.get(stats.matchId);
                if (!match) continue;
                // @ts-ignore
                const scoreResult = scoringSystem.calculate(stats, match);
                const current = scoresMap.get(stats.playerId) ?? { playerId: stats.playerId, score: 0, breakdown: {}, matchesPlayed: 0 };
                current.score += scoreResult.totalScore;
                Object.entries(scoreResult.breakdown).forEach(([key, value]) => {
                    current.breakdown[key] = (current.breakdown[key] ?? 0) + value;
                });
                current.matchesPlayed += 1;
                scoresMap.set(stats.playerId, current);
            }

            for (const [pId, scoreData] of scoresMap.entries()) {
                scoresResult.push({
                    playerId: pId,
                    roundNumber: round.round_number,
                    score: scoreData.score,
                    breakdown: scoreData.breakdown,
                    matchesPlayed: scoreData.matchesPlayed,
                    scoringVersion: scoringSystem.version,
                });
            }
        }

        const formattedRounds = allRounds.map(r => ({
            number: r.round_number,
            label: getRoundLabel(r.round_number)
        })).sort((a, b) => a.number - b.number);

        return NextResponse.json({
            success: true,
            competitionId: String(competitionId),
            seasonId: String(seasonId),
            rounds: formattedRounds,
            scores: scoresResult,
        });

    } catch (error) {
        console.error("Error calculando puntuaciones fantasy:", error);
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 500 });
    }
}