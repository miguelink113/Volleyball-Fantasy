import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin.server";

interface Args {
    competitionRfevbId: string;
    seasonRfevbId: string;
    price: number;
}

function parseArgs(): Args {
    const args = process.argv.filter((a) => a.startsWith("--"));
    const get = (name: string): string | undefined => {
        const prefix = `--${name}=`;
        const arg = args.find((a) => a.startsWith(prefix));
        return arg ? arg.slice(prefix.length) : undefined;
    };

    const competitionRfevbId = get("competition");
    const seasonRfevbId = get("season");
    const priceRaw = get("price") ?? "9";

    if (!competitionRfevbId || !seasonRfevbId) {
        console.error(
            "Uso: npm run ingest:market-values -- --competition=152 --season=186 [--price=9]"
        );
        process.exit(1);
    }

    const price = Number(priceRaw);
    if (!Number.isFinite(price) || price < 0) {
        console.error(`--price inválido: "${priceRaw}"`);
        process.exit(1);
    }

    return { competitionRfevbId, seasonRfevbId, price };
}

async function resolveCatalogIds(
    supabase: ReturnType<typeof createAdminClient>,
    competitionRfevbId: string,
    seasonRfevbId: string
): Promise<{ competitionId: string; seasonId: string }> {
    const { data: competition, error: competitionError } = await supabase
        .from("competitions")
        .select("id")
        .eq("rfevb_id", competitionRfevbId)
        .maybeSingle();

    if (competitionError) throw competitionError;
    if (!competition) {
        throw new Error(
            `Competición rfevb_id=${competitionRfevbId} no existe. Ejecuta ingest:roster primero.`
        );
    }

    const { data: season, error: seasonError } = await supabase
        .from("seasons")
        .select("id")
        .eq("competition_id", competition.id)
        .eq("rfevb_id", seasonRfevbId)
        .maybeSingle();

    if (seasonError) throw seasonError;
    if (!season) {
        throw new Error(
            `Temporada rfevb_id=${seasonRfevbId} no existe para esa competición. Ejecuta ingest:roster primero.`
        );
    }

    return { competitionId: competition.id, seasonId: season.id };
}

const BATCH_SIZE = 1000;

async function main() {
    const args = parseArgs();

    console.log(
        `→ Ingesta de market values: competición=${args.competitionRfevbId} ` +
        `temporada=${args.seasonRfevbId} precio=${args.price}`
    );

    const supabase = createAdminClient();

    console.log("→ Resolviendo UUIDs de competición y temporada…");
    const { competitionId, seasonId } = await resolveCatalogIds(
        supabase,
        args.competitionRfevbId,
        args.seasonRfevbId
    );
    console.log(`  competitionId=${competitionId}`);
    console.log(`  seasonId=${seasonId}`);

    console.log("→ Cargando jornadas…");
    const { data: rounds, error: roundsError } = await supabase
        .from("rounds")
        .select("id, round_number, starts_at")
        .eq("season_id", seasonId)
        .order("round_number");

    if (roundsError) throw roundsError;
    if (!rounds || rounds.length === 0) {
        throw new Error(
            "No hay jornadas en la temporada. Ejecuta ingest:matches primero."
        );
    }
    console.log(`  ${rounds.length} jornadas`);

    console.log("→ Cargando jugadores…");
    const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id")
        .eq("season_id", seasonId);

    if (playersError) throw playersError;
    if (!players || players.length === 0) {
        throw new Error(
            "No hay jugadores en la temporada. Ejecuta ingest:roster primero."
        );
    }
    console.log(`  ${players.length} jugadores`);

    const expectedRows = rounds.length * players.length;
    console.log(`  → filas esperadas: ${expectedRows}`);

    console.log("→ Upserting market values por jornada…");
    let totalUpserted = 0;

    for (const round of rounds) {
        const rows = players.map((player) => ({
            competition_id: competitionId,
            season_id: seasonId,
            player_id: player.id,
            round_id: round.id,
            price: args.price,
            valid_from: round.starts_at,
            valid_to: null,
            calculation_reason: `fixed:${args.price}:initial-seed`,
        }));

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);
            const { error } = await supabase
                .from("player_market_values")
                .upsert(batch, { onConflict: "player_id,round_id" });
            if (error) throw error;
            totalUpserted += batch.length;
        }

        console.log(
            `  jornada ${round.round_number}: ${rows.length} filas`
        );
    }

    console.log("\n→ Verificando conteo final…");
    const { count, error: countError } = await supabase
        .from("player_market_values")
        .select("*", { count: "exact", head: true })
        .eq("season_id", seasonId);

    if (countError) throw countError;

    console.log("\n═══ Resumen ═══");
    console.log(`Competición RFEVB:  ${args.competitionRfevbId}`);
    console.log(`Temporada RFEVB:    ${args.seasonRfevbId}`);
    console.log(`Precio fijo:        ${args.price}`);
    console.log("");
    console.log(`Jornadas:           ${rounds.length}`);
    console.log(`Jugadores:          ${players.length}`);
    console.log(`Filas esperadas:    ${expectedRows}`);
    console.log(`Filas upserted:     ${totalUpserted}`);
    console.log(`Filas en Supabase:  ${count}`);

    if (count !== expectedRows) {
        throw new Error(
            `Mismatch: esperadas ${expectedRows}, actuales ${count}`
        );
    }

    console.log("\n✅ Market values verificados.");
}

main().catch((err) => {
    console.error("Error inesperado:", err);
    process.exit(1);
});