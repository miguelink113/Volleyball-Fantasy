// scripts/ingest/check-new-matches.ts
// Comprueba si hay partidos nuevos sin descargar stats.
// Salida: has_new=true/false (para GitHub Actions) + exit code 0 si todo OK.

import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin.server";
import { fetchMatches } from "@/lib/scraper/fetch-matches";

const COMPETITIONS = [
    { competition: 164, season: 199, name: "Superliga Femenina 2" },
    { competition: 166, season: 202, name: "Superliga Masculina" },
    { competition: 165, season: 201, name: "Liga Iberdrola" },
    { competition: 167, season: 203, name: "Superliga 2 Masculina" },
];

async function main() {
    console.log("== CHECK DIARIO: ¿Hay partidos nuevos? ==\n");
    const supabase = createAdminClient();
    let hasNew = false;
    const summary: string[] = [];

    for (const comp of COMPETITIONS) {
        try {
            // 1. Resolver UUID de temporada en BD
            const { data: compData } = await supabase
                .from("competitions")
                .select("id")
                .eq("rfevb_id", String(comp.competition))
                .maybeSingle();

            if (!compData) {
                console.warn(`  ⚠ ${comp.name}: competición no encontrada en BD`);
                continue;
            }

            const { data: seasonData } = await supabase
                .from("seasons")
                .select("id")
                .eq("competition_id", compData.id)
                .eq("rfevb_id", String(comp.season))
                .maybeSingle();

            if (!seasonData) {
                console.warn(`  ⚠ ${comp.name}: temporada no encontrada en BD`);
                continue;
            }

            // 2. IDs actuales en BD
            const { data: dbMatches } = await supabase
                .from("matches")
                .select("rfevb_match_id")
                .eq("season_id", seasonData.id);

            const dbIds = new Set((dbMatches || []).map(m => m.rfevb_match_id));

            // 3. Scrapear solo la LISTA de partidos (barato, sin stats)
            const scraped = await fetchMatches(comp.competition, comp.season);

            // 4. Comparar
            const newMatches = scraped.filter(m => !dbIds.has(m.matchId));

            if (newMatches.length > 0) {
                hasNew = true;
                summary.push(`  ✅ ${comp.name}: ${newMatches.length} partidos nuevos de ${dbIds.size} existentes`);
            } else {
                summary.push(`  ⏸️ ${comp.name}: sin cambios (${dbIds.size} partidos)`);
            }
        } catch (err) {
            console.error(`  ❌ ${comp.name}: error al comprobar`, err);
            // Fail-safe: si falla la comprobación, asumimos que hay que ingerir
            hasNew = true;
        }
    }

    console.log("\n═══ Resumen ═══");
    summary.forEach(s => console.log(s));
    console.log(`\n¿Hay cambios? ${hasNew ? "SÍ → ejecutar ingesta completa" : "NO → no hacer nada"}`);

    // Output para GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
        const fs = await import("node:fs");
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `has_new=${hasNew}\n`);
    }

    process.exit(0);
}

main().catch((err) => {
    console.error("Error inesperado:", err);
    process.exit(1);
});