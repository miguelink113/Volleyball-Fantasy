import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
config({ path: resolve(process.cwd(), ".env.local") });

import { scrapeCompetitionRoster } from "@/lib/scraper/fetch-competition-roster";
import { scrapeMatches } from "@/lib/scraper/fetch-matches";
import {
    normalizeTeamAlias,
    TeamAliasResolver,
    type TeamAliasIndex,
} from "@/lib/services/ingestion/team-alias-resolver";

/**
 * Competiciones a diagnosticar. Si tus IDs difieren, edítalos aquí.
 * El script avisa y salta la competición si no encuentra roster o partidos.
 */
interface CompetitionConfig {
    competitionId: number;
    seasonId: number;
    label: string;
}

const COMPETITIONS: CompetitionConfig[] = [
    { competitionId: 152, seasonId: 186, label: "Superliga Masculina" },
    { competitionId: 151, seasonId: 185, label: "Superliga Femenina" },
    { competitionId: 153, seasonId: 187, label: "Superliga 2 Masculina" },
    { competitionId: 150, seasonId: 183, label: "Superliga 2 Femenina" },
];

interface TeamFixture {
    rfevbId: string;
    rosterName: string;
    normalized: string;
    actaNames: string[];
}

interface CompetitionReport {
    competitionId: string;
    seasonId: string;
    label: string;
    teams: TeamFixture[];
    unmatchedActaNames: string[];
    collisions: Array<{
        normalized: string;
        rfevbIds: string[];
        names: string[];
    }>;
    stats: {
        rosterTeams: number;
        uniqueActaNames: number;
        matchedActaNames: number;
        unmatchedActaNames: number;
    };
}

async function diagnoseCompetition(
    config: CompetitionConfig
): Promise<CompetitionReport> {
    const { competitionId, seasonId, label } = config;
    console.log(`\n═══ ${label} (ID=${competitionId}, PID=${seasonId}) ═══`);

    const roster = await scrapeCompetitionRoster(competitionId);
    console.log(`  roster: ${roster.teams.length} equipos`);

    const matches = await scrapeMatches(competitionId, seasonId);
    console.log(`  partidos: ${matches.length}`);

    const actaNamesSet = new Set<string>();
    for (const m of matches) {
        if (m.homeTeam && m.homeTeam !== "Desconocido") {
            actaNamesSet.add(m.homeTeam);
        }
        if (m.awayTeam && m.awayTeam !== "Desconocido") {
            actaNamesSet.add(m.awayTeam);
        }
    }

    const teams: TeamFixture[] = roster.teams.map((t) => ({
        rfevbId: t.rfevbId ?? "?",
        rosterName: t.name,
        normalized: normalizeTeamAlias(t.name),
        actaNames: [],
    }));

    const rosterByNormalized = new Map<string, TeamFixture[]>();
    for (const team of teams) {
        const list = rosterByNormalized.get(team.normalized) ?? [];
        list.push(team);
        rosterByNormalized.set(team.normalized, list);
    }

    // Colisiones: dos equipos del roster que normalizan al mismo string.
    // Es un fallo grave: el resolver no podría distinguirlos.
    const collisions: CompetitionReport["collisions"] = [];
    for (const [normalized, group] of rosterByNormalized.entries()) {
        if (group.length > 1) {
            collisions.push({
                normalized,
                rfevbIds: group.map((t) => t.rfevbId),
                names: group.map((t) => t.rosterName),
            });
        }
    }

    // Reutilizamos el matcher del resolver real para que el diagnóstico
    // refleje exactamente lo que pasará en la ingesta. `resolveFromIndex`
    // es puro: no toca la red ni la base, así que el cliente null no se usa.
    const resolver = new TeamAliasResolver(null as never);
    const index: TeamAliasIndex = {
        exact: new Map(),
        entries: [],
    };
    for (const team of teams) {
        if (!team.normalized) continue;
        const tokens = new Set(
            team.normalized.split(/\s+/).filter(Boolean)
        );
        index.entries.push({ tokens, teamId: team.rfevbId });
        if (!index.exact.has(team.normalized)) {
            index.exact.set(team.normalized, team.rfevbId);
        }
    }

    const teamByRfevbId = new Map(teams.map((t) => [t.rfevbId, t]));
    const unmatchedActaNames: string[] = [];

    for (const actaName of actaNamesSet) {
        const normalized = normalizeTeamAlias(actaName);
        const teamId = normalized
            ? resolver.resolveFromIndex(index, normalized)
            : null;

        if (!teamId) {
            unmatchedActaNames.push(actaName);
            continue;
        }

        const team = teamByRfevbId.get(teamId);
        if (team && !team.actaNames.includes(actaName)) {
            team.actaNames.push(actaName);
        }
    }

    const matchedActaNames = actaNamesSet.size - unmatchedActaNames.length;

    const report: CompetitionReport = {
        competitionId: String(competitionId),
        seasonId: String(seasonId),
        label,
        teams,
        unmatchedActaNames,
        collisions,
        stats: {
            rosterTeams: roster.teams.length,
            uniqueActaNames: actaNamesSet.size,
            matchedActaNames,
            unmatchedActaNames: unmatchedActaNames.length,
        },
    };

    console.log(`  acta names únicos: ${actaNamesSet.size}`);
    console.log(`  matched: ${matchedActaNames}`);
    console.log(`  unmatched: ${unmatchedActaNames.length}`);
    console.log(`  collisions: ${collisions.length}`);

    return report;
}

async function main(): Promise<void> {
    const reports: CompetitionReport[] = [];

    for (const config of COMPETITIONS) {
        try {
            reports.push(await diagnoseCompetition(config));
        } catch (error) {
            console.error(
                `  ✗ Error en ${config.label}:`,
                error instanceof Error ? error.message : error
            );
        }
    }

    const outputPath = resolve(
        process.cwd(),
        "scripts/fixtures/team-alias-fixtures.json"
    );
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(
        outputPath,
        JSON.stringify(
            { generatedAt: new Date().toISOString(), competitions: reports },
            null,
            2
        ),
        "utf8"
    );
    console.log(`\n✅ Fixtures escritas en ${outputPath}`);

    console.log("\n═══ RESUMEN GLOBAL ═══");
    let totalUnmatched = 0;
    let totalCollisions = 0;

    for (const r of reports) {
        console.log(
            `${r.label}: ${r.stats.rosterTeams} equipos, ` +
            `${r.stats.matchedActaNames}/${r.stats.uniqueActaNames} actas resueltas, ` +
            `${r.collisions.length} colisiones`
        );
        totalUnmatched += r.unmatchedActaNames.length;
        totalCollisions += r.collisions.length;
    }

    if (totalUnmatched > 0) {
        console.log(`\n⚠ ${totalUnmatched} nombres de acta sin resolver:`);
        for (const r of reports) {
            if (r.unmatchedActaNames.length === 0) continue;
            console.log(`  ${r.label}:`);
            for (const name of r.unmatchedActaNames) {
                console.log(
                    `    - "${name}"  →  normaliza a "${normalizeTeamAlias(name)}"`
                );
            }
        }
    }

    if (totalCollisions > 0) {
        console.log(`\n🚨 ${totalCollisions} colisiones de normalización:`);
        for (const r of reports) {
            for (const c of r.collisions) {
                console.log(`  ${r.label}: "${c.normalized}"`);
                for (const name of c.names) console.log(`    - ${name}`);
            }
        }
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error("Error inesperado:", error);
    process.exit(1);
});