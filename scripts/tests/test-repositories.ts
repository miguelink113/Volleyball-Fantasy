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

    // 1. Obtener un UUID de temporada válido para probar (SM1)
    const { data: season } = await supabase
        .from("seasons")
        .select("id")
        .eq("rfevb_id", "186")
        .single();

    if (!season) throw new Error("No se encontró la temporada 186 para testear.");

    // 2. Test Teams
    const teams = await getTeamsBySeasonId(supabase, season.id);
    console.log(`✔ getTeamsBySeasonId: ${teams.length} equipos (Ej: ${teams[0]?.name})`);

    // 3. Test Players
    const players = await getPlayersBySeasonId(supabase, season.id);
    console.log(`✔ getPlayersBySeasonId: ${players.length} jugadores (Ej: ${players[0]?.displayName})`);

    // 4. Test Rounds
    const rounds = await getRoundsBySeasonId(supabase, season.id);
    console.log(`✔ getRoundsBySeasonId: ${rounds.length} jornadas (Ej: Jornada ${rounds[0]?.round_number})`);

    if (rounds.length > 0) {
        // 5. Test Matches
        const matches = await getMatchesByRoundId(supabase, rounds[0].id);
        console.log(`✔ getMatchesByRoundId: ${matches.length} partidos en la jornada 1`);

        // 6. Test Market Values
        const prices = await getMarketValuesByRoundId(supabase, rounds[0].id);
        console.log(`✔ getMarketValuesByRoundId: ${prices.size} precios`);

        if (matches.length > 0) {
            // 7. Test Stats
            const stats = await getStatsByMatchIds(supabase, [matches[0].id]);
            console.log(`✔ getStatsByMatchIds: ${stats.length} estadísticas en el primer partido`);
        }
    }

    console.log("\n✅ Todos los repositorios devuelven datos válidos y mapeados.");
}

run().catch((err) => {
    console.error("❌ Fallo en los repositorios:", err);
    process.exit(1);
});