import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin.server";
import { persistScoresForSeason } from "@/lib/services/fantasy/scoring-persistence.service";

async function main() {
    console.log("== INGESTA DE PUNTUACIONES (FASE 9) ==\n");
    const supabase = createAdminClient();

    const { data: comp } = await supabase.from("competitions").select("id").eq("rfevb_id", "152").single();
    const { data: season } = await supabase.from("seasons").select("id").eq("competition_id", comp!.id).eq("rfevb_id", "186").single();
    if (!season) throw new Error("Temporada no encontrada");

    const stats = await persistScoresForSeason(supabase, comp!.id, season.id);
    console.log(`✅ Calculadas ${stats.processedMatches} estadísticas en ${stats.processedRounds} jornadas.`);
}

main().catch(console.error);