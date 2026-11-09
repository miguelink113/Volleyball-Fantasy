import { createClient } from '@supabase/supabase-js';
import { fetchCompetitionStandings } from '@/lib/scraper/fetch-competition-standings';
import {TeamAliasResolver} from "@/lib/services/ingestion/team-alias-resolver";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
);

async function main() {
    const [competitionId, seasonId, dpId, dpPid] = process.argv.slice(2);
    if (!competitionId || !seasonId || !dpId || !dpPid) {
        console.error('Usage: tsx ingest-standings.ts <competitionId> <seasonId> <dpId> <dpPid>');
        process.exit(1);
    }

    // 1) Scrape
    const standings = await fetchCompetitionStandings(
        `https://rfevb-web.dataproject.com/CompetitionStandings.aspx?ID=${dpId}&PID=${dpPid}`,
    );
    console.log(`Scraped ${standings.length} filas`);

    // 2) Roster de equipos para el matcher de jornada
    const { data: teams, error: teamsErr } = await supabase
        .from('teams')
        .select('id, name');
    if (teamsErr) throw teamsErr;

    const roster = (teams ?? []).map((t) => ({ teamId: t.id, name: t.name }));
    const resolver = new TeamAliasResolver(supabase);
    const ctx = { competitionId, seasonId };

    // 3) Híbrido: primero aliases ya registrados (BD), luego containment contra roster
    const viaAliases = await resolver.resolveMany(ctx, standings.map((r) => r.teamName));
    const unresolved = standings
        .map((r) => r.teamName)
        .filter((n) => viaAliases.get(n) == null);

    const viaRoster = unresolved.length
        ? resolver.resolveJornada(unresolved, roster)
        : new Map<string, string | null>();

    // 4) Construir el upsert
    const missing: string[] = [];
    const toUpsert = standings.map((row) => {
        const teamId = viaAliases.get(row.teamName) ?? viaRoster.get(row.teamName) ?? null;
        if (!teamId) {
            missing.push(row.teamName);
            return null;
        }
        return {
            competition_id: competitionId,
            season_id:     seasonId,
            team_id:       teamId,
            group_name:    row.groupName,

            position:       row.position,
            points:         row.points,
            matches_played: row.matchesPlayed,
            matches_won:    row.matchesWon,
            matches_lost:   row.matchesLost,
            sets_won:       row.setsWon,
            sets_lost:      row.setsLost,
            points_won:     row.pointsWon,
            points_lost:    row.pointsLost,
            result_3_0:     row.result3_0,
            result_3_1:     row.result3_1,
            result_3_2:     row.result3_2,
            result_2_3:     row.result2_3,
            result_1_3:     row.result1_3,
            result_0_3:     row.result0_3,
            sets_ratio:     row.setsRatio,
            points_ratio:   row.pointsRatio,
            penalty:        row.penalty,
        };
    }).filter((r): r is NonNullable<typeof r> => r !== null);

    if (missing.length) {
        console.error(`\n✗ Sin resolver (${missing.length}):`);
        missing.forEach((n) => console.error(`   - "${n}"`));
        console.error('\nAbortado. Registra los aliases o ajusta el matcher antes de reintentar.');
        process.exit(2);
    }

    // 5) Upsert (respeta unique(season_id, team_id))
    const { error: upErr } = await supabase
        .from('team_standings')
        .upsert(toUpsert, { onConflict: 'season_id,team_id' });
    if (upErr) throw upErr;

    console.log(`\n✓ Upsert OK: ${toUpsert.length} filas`);
}

main().catch((e) => { console.error(e); process.exit(1); });