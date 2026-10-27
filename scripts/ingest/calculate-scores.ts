import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin.server";
import { persistScoresForSeason } from "@/lib/services/fantasy/scoring-persistence.service";

async function main() {
    console.log("== INGESTA DE PUNTUACIONES ==\n");
    const supabase = createAdminClient();

    // Buscamos TODAS las temporadas activas (2025/26 o 2026/27)
    const { data: seasons, error } = await supabase
        .from("seasons")
        .select("id, name, competition_id, competitions(name)")
        .eq("is_current", true);

    if (error || !seasons || seasons.length === 0) {
        throw new Error("No se encontraron temporadas activas (is_current = true)");
    }

    for (const season of seasons) {
        // SOLUCIÓN TS2339: Forzamos a que 'competitions' se trate como un objeto único
        const comp = season.competitions as unknown as { name: string };

        console.log(`\n→ Calculando puntos para: ${comp.name} - ${season.name}`);
        const stats = await persistScoresForSeason(supabase, season.competition_id, season.id);
        console.log(`✅ Calculadas ${stats.processedMatches} estadísticas en ${stats.processedRounds} jornadas.`);
    }

    console.log("\n✅ Proceso completado.");
}

main().catch(console.error);