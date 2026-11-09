// scripts/ingest/calculate-market-values.ts
import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin.server";

const FORMULA = {
    BASE: 1,
    MULTIPLIER_POINTS: 0.07,
    MULTIPLIER_AVG: 0.3,
    MAX_AVG_BONUS: 5,
    MIN_PRICE: 1,
    MAX_PRICE: 20,
};

function calculatePrice(totalPoints: number, avgPoints: number): number {
    const avgBonus = Math.min(avgPoints * FORMULA.MULTIPLIER_AVG, FORMULA.MAX_AVG_BONUS);
    const raw = FORMULA.BASE + (totalPoints * FORMULA.MULTIPLIER_POINTS) + avgBonus;
    const rounded = Math.round(raw * 10) / 10;
    return Math.min(FORMULA.MAX_PRICE, Math.max(FORMULA.MIN_PRICE, rounded));
}

// Helper para leer todas las filas con paginación
async function fetchAllMatchScores(
    supabase: ReturnType<typeof createAdminClient>,
    seasonId: string
): Promise<{ player_id: string; match_id: string; score: number }[]> {
    const PAGE_SIZE = 1000;
    const allRows: { player_id: string; match_id: string; score: number }[] = [];
    let from = 0;

    while (true) {
        const { data, error } = await supabase
            .from("player_match_scores")
            .select("player_id, match_id, score")
            .eq("season_id", seasonId)
            .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allRows.push(...data);

        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }

    return allRows;
}

async function main() {
    console.log("== CÁLCULO DE VALORES DE MERCADO ==\n");
    const supabase = createAdminClient();

    const { data: seasons, error: seasonsError } = await supabase
        .from("seasons")
        .select("id, name, competition_id, competitions(name)")
        .eq("is_current", true);

    if (seasonsError) throw seasonsError;
    if (!seasons || seasons.length === 0) throw new Error("No hay temporadas activas");

    for (const season of seasons) {
        const comp = season.competitions as unknown as { name: string };
        console.log(`\n→ ${comp.name} - ${season.name}`);

        // 1. Leer TODAS las stats con paginación
        const matchStats = await fetchAllMatchScores(supabase, season.id);
        console.log(`  [DEBUG] player_match_scores leídos: ${matchStats.length}`);

        if (matchStats.length === 0) {
            console.log("  ⚠ Sin stats. Saltando.");
            continue;
        }

        // 2. Leer todos los partidos para mapear match_id → round_id
        const { data: matches, error: matchesError } = await supabase
            .from("matches")
            .select("id, round_id")
            .eq("season_id", season.id)
            .limit(5000);

        if (matchesError) throw matchesError;

        const matchToRound = new Map<string, string>();
        for (const m of matches || []) {
            matchToRound.set(m.id, m.round_id);
        }
        console.log(`  [DEBUG] matches leídos: ${matches?.length ?? 0}`);

        // 3. Agrupar stats por jugador y por ronda
        const statsByPlayer = new Map<string, { totalPoints: number; matchesPlayed: number }>();
        const playersByRound = new Map<string, Set<string>>();
        let orphanStats = 0;

        for (const row of matchStats) {
            const roundId = matchToRound.get(row.match_id);
            if (!roundId) {
                orphanStats++;
                continue;
            }

            const playerId = row.player_id;
            const score = row.score || 0;

            const current = statsByPlayer.get(playerId) || { totalPoints: 0, matchesPlayed: 0 };
            current.totalPoints += score;
            current.matchesPlayed += 1;
            statsByPlayer.set(playerId, current);

            if (!playersByRound.has(roundId)) playersByRound.set(roundId, new Set());
            playersByRound.get(roundId)!.add(playerId);
        }

        console.log(`  [DEBUG] stats huérfanas: ${orphanStats}`);
        console.log(`  [DEBUG] rondas con stats: ${playersByRound.size}`);

        // 4. Determinar la última jornada con stats
        const { data: rounds, error: roundsError } = await supabase
            .from("rounds")
            .select("id, round_number")
            .eq("season_id", season.id)
            .order("round_number", { ascending: false });

        if (roundsError) throw roundsError;
        if (!rounds || rounds.length === 0) {
            console.log("  ⚠ Sin rounds. Saltando.");
            continue;
        }

        let maxRoundNumberWithStats: number | null = null;
        for (const r of rounds) {
            if (playersByRound.has(r.id)) {
                maxRoundNumberWithStats = r.round_number;
                break;
            }
        }

        if (maxRoundNumberWithStats === null) {
            console.log("  ⚠ Ninguna ronda tiene stats. Saltando.");
            continue;
        }

        const targetRounds = rounds.filter(r => r.round_number === maxRoundNumberWithStats);

        console.log(`  Última jornada con stats: ${maxRoundNumberWithStats} (${targetRounds.length} rondas de grupo)`);

        // 5. Calcular precios
        const priceUpdates: {
            round_id: string;
            player_id: string;
            competition_id: string;
            season_id: string;
            price: number;
        }[] = [];

        for (const targetRound of targetRounds) {
            const playersInRound = playersByRound.get(targetRound.id);
            if (!playersInRound) continue;

            for (const playerId of playersInRound) {
                const stats = statsByPlayer.get(playerId);
                if (!stats) continue;

                const avgPoints = stats.matchesPlayed > 0
                    ? stats.totalPoints / stats.matchesPlayed
                    : 0;

                const price = calculatePrice(stats.totalPoints, avgPoints);

                priceUpdates.push({
                    round_id: targetRound.id,
                    player_id: playerId,
                    competition_id: season.competition_id,
                    season_id: season.id,
                    price,
                });
            }
        }

        console.log(`  → ${priceUpdates.length} precios calculados`);

        // 6. Upsert en batches
        for (let i = 0; i < priceUpdates.length; i += 500) {
            const batch = priceUpdates.slice(i, i + 500);
            const { error } = await supabase
                .from("player_market_values")
                .upsert(batch, { onConflict: "round_id,player_id" });
            if (error) throw error;
        }

        console.log(`  ✅ Precios actualizados para jornada ${maxRoundNumberWithStats}`);
    }

    console.log("\n✅ Proceso completado.");
}

main().catch((err) => {
    console.error("Error inesperado:", err);
    process.exit(1);
});