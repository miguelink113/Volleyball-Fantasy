import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin.server";
import { getTeamsBySeasonId } from "@/lib/repositories/teams.repository";
import { getPlayersBySeasonId } from "@/lib/repositories/players.repository";
import { getRoundsBySeasonId } from "@/lib/repositories/rounds.repository";
import { getMatchesByRoundId } from "@/lib/repositories/matches.repository";
import { getStatsByMatchIds } from "@/lib/repositories/match-player-stats.repository";
import { getMarketValuesByRoundId } from "@/lib/repositories/market-values.repository";

async function run() {
    console.log("== TEST DE INTEGRACIÓN: REPOSITORIOS ==");
    const supabase = createAdminClient();

    // 1. Buscar una temporada activa (is_current = true) que tenga partidos ingeridos
    const { data: activeSeasons, error: seasonsError } = await supabase
        .from("seasons")
        .select("id, name, rfevb_id, competition:competitions(name)")
        .eq("is_current", true)
        .order("rfevb_id");

    if (seasonsError) throw seasonsError;
    if (!activeSeasons || activeSeasons.length === 0) {
        throw new Error("No hay temporadas activas (is_current = true). Ejecuta ingest:roster primero.");
    }

    // Elegir la primera temporada activa que tenga partidos
    let chosenSeason: { id: string; name: string | null; rfevb_id: string; competition: any } | null = null;
    for (const season of activeSeasons) {
        const { count } = await supabase
            .from("matches")
            .select("*", { count: "exact", head: true })
            .eq("season_id", season.id);

        if ((count ?? 0) > 0) {
            chosenSeason = season as any;
            break;
        }
    }

    if (!chosenSeason) {
        throw new Error(
            "Ninguna temporada activa tiene partidos ingeridos. Ejecuta ingest-matches primero."
        );
    }

    const seasonLabel = `${chosenSeason.competition?.name ?? "?"} - ${chosenSeason.name ?? "?"}`;
    console.log(`→ Usando temporada activa: ${seasonLabel} (rfevb_id=${chosenSeason.rfevb_id})`);

    // 2. Test Teams
    const teams = await getTeamsBySeasonId(supabase, chosenSeason.id);
    if (teams.length === 0) throw new Error("getTeamsBySeasonId devolvió 0 equipos");
    console.log(`✔ getTeamsBySeasonId: ${teams.length} equipos (Ej: ${teams[0]?.name})`);

    // 3. Test Players
    const players = await getPlayersBySeasonId(supabase, chosenSeason.id);
    if (players.length === 0) throw new Error("getPlayersBySeasonId devolvió 0 jugadores");
    console.log(`✔ getPlayersBySeasonId: ${players.length} jugadores (Ej: ${players[0]?.displayName})`);

    // 4. Test Rounds
    const rounds = await getRoundsBySeasonId(supabase, chosenSeason.id);
    if (rounds.length === 0) throw new Error("getRoundsBySeasonId devolvió 0 jornadas");
    console.log(`✔ getRoundsBySeasonId: ${rounds.length} jornadas (Ej: Jornada ${rounds[0]?.round_number})`);

    // 5. Buscar un partido de muestra para testear matches + stats + market values
    const { data: sampleMatch, error: matchError } = await supabase
        .from("matches")
        .select("id, round_id")
        .eq("season_id", chosenSeason.id)
        .limit(1)
        .maybeSingle();

    if (matchError) throw matchError;
    if (!sampleMatch) {
        throw new Error(
            "La temporada activa no tiene partidos en la tabla matches. Ejecuta ingest-matches."
        );
    }

    // 6. Test Matches (usando el round del partido de muestra)
    const matches = await getMatchesByRoundId(supabase, sampleMatch.round_id);
    if (matches.length === 0) {
        throw new Error(`getMatchesByRoundId devolvió 0 partidos para round_id=${sampleMatch.round_id}`);
    }
    console.log(`✔ getMatchesByRoundId: ${matches.length} partidos en la jornada del partido de muestra`);

    // 7. Test Market Values (mismo round)
    const prices = await getMarketValuesByRoundId(supabase, sampleMatch.round_id);
    if (prices.size === 0) {
        throw new Error(
            `getMarketValuesByRoundId devolvió 0 precios para round_id=${sampleMatch.round_id}. Ejecuta ingest-market-values.`
        );
    }
    console.log(`✔ getMarketValuesByRoundId: ${prices.size} precios`);

    // 8. Test Stats (usando el partido de muestra)
    const stats = await getStatsByMatchIds(supabase, [sampleMatch.id]);
    if (stats.length === 0) {
        throw new Error(
            `getStatsByMatchIds devolvió 0 estadísticas para match_id=${sampleMatch.id}`
        );
    }
    console.log(`✔ getStatsByMatchIds: ${stats.length} estadísticas en el partido de muestra`);

    console.log("\n✅ Todos los repositorios devuelven datos válidos y mapeados.");
}

run().catch((err) => {
    console.error("❌ Fallo en los repositorios:", err);
    process.exit(1);
});