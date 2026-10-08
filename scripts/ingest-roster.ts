import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin.server";

import { scrapeCompetitionRoster } from "@/lib/scraper/fetch-competition-roster";
import {mapTeam} from "@/lib/services/ingestion/map.team";
import {mapPlayer} from "@/lib/services/ingestion/map.player";

interface Args {
    competitionRfevbId: string;
    seasonRfevbId: string;
    seasonName: string;
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
    const seasonName = get("season-name");

    if (!competitionRfevbId || !seasonRfevbId || !seasonName) {
        console.error(
            "Uso: npm run ingest:roster -- --competition=152 --season=186 --season-name=2026/27"
        );
        process.exit(1);
    }

    return { competitionRfevbId, seasonRfevbId, seasonName };
}

async function upsertCompetition(
    supabase: ReturnType<typeof createAdminClient>,
    rfevbId: string
): Promise<string> {
    const { data: existing, error: selectError } = await supabase
        .from("competitions")
        .select("id")
        .eq("rfevb_id", rfevbId)
        .maybeSingle();

    if (selectError) throw selectError;
    if (existing) {
        console.log(`  competición ya existente: ${existing.id}`);
        return existing.id;
    }

    const { data: inserted, error: insertError } = await supabase
        .from("competitions")
        .insert({
            rfevb_id: rfevbId,
            name: `Competición ${rfevbId}`,
            active: true,
        })
        .select("id")
        .single();

    if (insertError) throw insertError;
    console.log(`  competición creada: ${inserted.id}`);
    return inserted.id;
}

async function upsertSeason(
    supabase: ReturnType<typeof createAdminClient>,
    competitionId: string,
    rfevbId: string,
    name: string
): Promise<string> {
    const { data: existing, error: selectError } = await supabase
        .from("seasons")
        .select("id")
        .eq("competition_id", competitionId)
        .eq("rfevb_id", rfevbId)
        .maybeSingle();

    if (selectError) throw selectError;
    if (existing) {
        console.log(`  temporada ya existente: ${existing.id}`);
        return existing.id;
    }

    const { data: inserted, error: insertError } = await supabase
        .from("seasons")
        .insert({
            competition_id: competitionId,
            rfevb_id: rfevbId,
            name,
            is_current: true,
        })
        .select("id")
        .single();

    if (insertError) throw insertError;
    console.log(`  temporada creada: ${inserted.id}`);
    return inserted.id;
}

async function main() {
    const args = parseArgs();
    console.log(
        `→ Ingesta roster: competición=${args.competitionRfevbId} temporada=${args.seasonRfevbId} (${args.seasonName})`
    );

    const supabase = createAdminClient();

    console.log("→ Asegurando competición…");
    const competitionId = await upsertCompetition(supabase, args.competitionRfevbId);

    console.log("→ Asegurando temporada…");
    const seasonId = await upsertSeason(
        supabase,
        competitionId,
        args.seasonRfevbId,
        args.seasonName
    );

    console.log(`  competitionId=${competitionId}`);
    console.log(`  seasonId=${seasonId}`);

    // --- Scrape roster ---
    console.log("→ Descargando roster desde RFEVB…");
    const roster = await scrapeCompetitionRoster(
        Number(args.competitionRfevbId)
    );
    console.log(
        `  RFEVB devuelve: ${roster.teams.length} equipos, ${roster.players.length} jugadores`
    );

    if (roster.teams.length === 0) {
        throw new Error(
            "El scraper no devolvió ningún equipo. Abortando para no dejar la temporada sin catálogo."
        );
    }

    // --- Upsert teams ---
    console.log("→ Ingestando equipos…");
    const teamRows = roster.teams.map((team) =>
        mapTeam(team, { competitionId, seasonId })
    );

    const { error: teamsUpsertError } = await supabase
        .from("teams")
        .upsert(teamRows, { onConflict: "season_id,rfevb_id" });

    if (teamsUpsertError) {
        throw new Error(`Upsert teams failed: ${teamsUpsertError.message}`);
    }
    console.log(`  ${teamRows.length} equipos upsertados`);

    // --- Construir mapa rfevbId → UUID ---
    console.log("→ Resolviendo UUIDs de equipos…");
    const { data: insertedTeams, error: teamsSelectError } = await supabase
        .from("teams")
        .select("id, rfevb_id")
        .eq("season_id", seasonId);

    if (teamsSelectError) {
        throw new Error(`Select teams failed: ${teamsSelectError.message}`);
    }
    if (!insertedTeams || insertedTeams.length === 0) {
        throw new Error("No teams found after upsert. Something went wrong.");
    }

    const teamIdByRfevbId = new Map<string, string>();
    for (const row of insertedTeams) {
        if (!row.rfevb_id) {
            throw new Error(
                `Team without rfevb_id after upsert (id=${row.id}). Aborting.`
            );
        }
        teamIdByRfevbId.set(row.rfevb_id, row.id);
    }
    console.log(`  ${teamIdByRfevbId.size} equipos resueltos a UUID`);

    // --- Upsert players ---
    console.log("→ Ingestando jugadores…");
    const playerRows = roster.players.map((player) =>
        mapPlayer(player, { competitionId, seasonId, teamIdByRfevbId })
    );

    if (playerRows.length === 0) {
        console.warn(
            "  ⚠ El scraper no devolvió jugadores. Se ingestan solo equipos."
        );
    } else {
        const { error: playersUpsertError } = await supabase
            .from("players")
            .upsert(playerRows, { onConflict: "season_id,rfevb_id" });

        if (playersUpsertError) {
            throw new Error(`Upsert players failed: ${playersUpsertError.message}`);
        }
        console.log(`  ${playerRows.length} jugadores upsertados`);
    }

    // --- Reporte final ---
    console.log("\n→ Verificando conteos finales…");

    const { count: teamCount, error: teamCountError } = await supabase
        .from("teams")
        .select("*", { count: "exact", head: true })
        .eq("season_id", seasonId);

    if (teamCountError) throw teamCountError;

    const { count: playerCount, error: playerCountError } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true })
        .eq("season_id", seasonId);

    if (playerCountError) throw playerCountError;

    console.log("\n═══ Resumen ═══");
    console.log(`Competición RFEVB:  ${args.competitionRfevbId}`);
    console.log(`Temporada RFEVB:    ${args.seasonRfevbId} (${args.seasonName})`);
    console.log(`Competition UUID:   ${competitionId}`);
    console.log(`Season UUID:        ${seasonId}`);
    console.log("");
    console.log(`Equipos RFEVB:      ${roster.teams.length}`);
    console.log(`Equipos Supabase:   ${teamCount}`);
    console.log(`Jugadores RFEVB:    ${roster.players.length}`);
    console.log(`Jugadores Supabase: ${playerCount}`);
    console.log("");

    if (teamCount !== roster.teams.length) {
        throw new Error(
            `Team count mismatch: RFEVB=${roster.teams.length}, Supabase=${teamCount}`
        );
    }
    if (playerCount !== roster.players.length) {
        throw new Error(
            `Player count mismatch: RFEVB=${roster.players.length}, Supabase=${playerCount}`
        );
    }

    console.log("✅ Ingesta completada y verificada.");
}

main().catch((err) => {
    console.error("Error inesperado:", err);
    process.exit(1);
});