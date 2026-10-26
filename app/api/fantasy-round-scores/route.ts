import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin.server";
import { getRoundBySeasonAndNumber, getRoundsBySeasonId } from "@/lib/repositories/rounds.repository";
import { getMatchesByRoundId } from "@/lib/repositories/matches.repository";
import { getStatsByMatchIds } from "@/lib/repositories/match-player-stats.repository";
import { ScoringSystemV1 } from "@/domain/scoring/scoring-v1.system";

export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const competitionId = Number(params.get("competition"));
    const seasonId = Number(params.get("season"));
    const roundStr = params.get("round");
    const roundNumber = roundStr ? Number(roundStr) : undefined;

    if (
        !Number.isInteger(competitionId) || competitionId <= 0 ||
        !Number.isInteger(seasonId) || seasonId <= 0 ||
        (roundNumber !== undefined && (!Number.isInteger(roundNumber) || roundNumber <= 0))
    ) {
        return NextResponse.json(
            { success: false, error: "Parámetros inválidos." },
            { status: 400 }
        );
    }

    try {
        const supabase = createAdminClient();

        // ARREGLO: Buscamos la competición y validamos que la temporada le pertenece
        const { data: comp } = await supabase.from("competitions").select("id").eq("rfevb_id", String(competitionId)).single();
        if (!comp) throw new Error("Competición no encontrada");

        const { data: seasonData, error: seasonError } = await supabase
            .from("seasons")
            .select("id")
            .eq("competition_id", comp.id)
            .eq("rfevb_id", String(seasonId))
            .single();

        if (seasonError || !seasonData) throw new Error("La temporada no pertenece a esta competición o no existe");

        let rounds: any[] = []; // Tipado para evitar error de TS con never[]
        if (roundNumber) {
            const r = await getRoundBySeasonAndNumber(supabase, seasonData.id, roundNumber);
            if (r) rounds.push(r);
        } else {
            rounds = await getRoundsBySeasonId(supabase, seasonData.id);
        }

        const scoringSystem = new ScoringSystemV1();
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

                const scoreResult = scoringSystem.calculate(stats, match);
                const current = scoresMap.get(stats.playerId) ?? {
                    playerId: stats.playerId,
                    score: 0,
                    breakdown: {},
                    matchesPlayed: 0,
                };

                current.score += scoreResult.totalScore;
                Object.entries(scoreResult.breakdown).forEach(([key, value]) => {
                    current.breakdown[key] = (current.breakdown[key] ?? 0) + value;
                });
                current.matchesPlayed += 1;
                scoresMap.set(stats.playerId, current);
            }

            for (const [playerId, scoreData] of scoresMap.entries()) {
                scoresResult.push({
                    playerId,
                    roundNumber: round.round_number,
                    score: scoreData.score,
                    breakdown: scoreData.breakdown, // Desglose visible
                    matchesPlayed: scoreData.matchesPlayed,
                    scoringVersion: scoringSystem.version,
                });
            }
        }

        // NUEVO: Preparamos la lista de jornadas formateadas para el frontend
        const formattedRounds = rounds.map(r => ({
            number: r.round_number,
            label: r.round_number <= 22 ? `Jornada ${r.round_number}` :
                r.round_number === 23 ? "Cuartos de final" :
                    r.round_number === 24 ? "Semifinales" :
                        r.round_number === 25 ? "Final" : `Jornada ${r.round_number}`
        })).sort((a, b) => a.number - b.number);

        return NextResponse.json({
            success: true,
            competitionId: String(competitionId),
            seasonId: String(seasonId),
            rounds: formattedRounds, // <-- AÑADIDO: Devolvemos las jornadas reales
            scores: scoresResult,
        });

    } catch (error) {
        console.error("Error calculando puntuaciones fantasy:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Error desconocido" },
            { status: 500 }
        );
    }
}