
// scripts/ingest/ingest-matches.ts
import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin.server";

import {
    fetchMatches,
    type Match as ScrapedMatch,
} from "@/lib/scraper/fetch-matches";
import { fetchMatchStatistics } from "@/lib/scraper/fetch-match-statistics";
import {
    mapScrapedMatch,
    type MatchMappingContext,
    type ResolvedMatchTeam,
} from "@/lib/services/ingestion/map-scraped-match";
import {
    TeamAliasResolver,
    calculateSimilarity,
    calculateContainment,
} from "@/lib/services/ingestion/team-alias-resolver";
import { fetchMatchesEsvoley } from "@/lib/scraper/fetch-matches-esvoley";
import {
    canonicalizeRoundGroupName,
    findEsvoleyMatch,
    getEsvoleyGroups,
    normalizeTeamName,
} from "@/lib/scraper/esvoley-ingestion";

const MADRID_TZ = "Europe/Madrid";

type CachedStats =
    | { source: "db" }
    | { source: "fetched"; data: Awaited<ReturnType<typeof fetchMatchStatistics>> }
    | { source: "failed" };

interface Args {
    competitionRfevbId: string;
    seasonRfevbId: string;
    round?: number;
    forceRefresh?: boolean;
    dryRun?: boolean;
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
    const roundRaw = get("round");
    const forceRefresh = args.includes("--force-refresh");
    const dryRun = args.includes("--dry-run");

    if (!competitionRfevbId || !seasonRfevbId) {
        console.error(
            "Uso: npm run ingest:matches -- --competition=152 --season=186 [--round=1] [--force-refresh] [--dry-run]"
        );
        process.exit(1);
    }

    let round: number | undefined;
    if (roundRaw !== undefined) {
        const n = Number(roundRaw);
        if (!Number.isInteger(n) || n <= 0) {
            console.error(`--round inválido: "${roundRaw}"`);
            process.exit(1);
        }
        round = n;
    }

    return { competitionRfevbId, seasonRfevbId, round, forceRefresh, dryRun };
}

// ─────────────────────── timezone helpers ───────────────────────

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
    const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
    const parts = dtf.formatToParts(date);
    const get = (t: string) =>
        Number(parts.find((p) => p.type === t)?.value ?? 0);
    let hour = get("hour");
    if (hour === 24) hour = 0;
    const asUtc = Date.UTC(
        get("year"),
        get("month") - 1,
        get("day"),
        hour,
        get("minute"),
        get("second")
    );
    return asUtc - date.getTime();
}

function wallClockMadridToUtc(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number
): Date {
    const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
    const offset1 = getTimeZoneOffsetMs(new Date(naive), MADRID_TZ);
    const candidate = naive - offset1;
    const offset2 = getTimeZoneOffsetMs(new Date(candidate), MADRID_TZ);
    return new Date(naive - offset2);
}

function startOfDayMadrid(date: Date): Date {
    const dtf = new Intl.DateTimeFormat("en-CA", {
        timeZone: MADRID_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const [y, m, d] = dtf.format(date).split("-").map(Number);
    return wallClockMadridToUtc(y, m, d, 0, 0);
}

function startOfDayAfterMadrid(date: Date): Date {
    const dtf = new Intl.DateTimeFormat("en-CA", {
        timeZone: MADRID_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const [y, m, d] = dtf.format(date).split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d));
    next.setUTCDate(next.getUTCDate() + 1);
    return wallClockMadridToUtc(
        next.getUTCFullYear(),
        next.getUTCMonth() + 1,
        next.getUTCDate(),
        0,
        0
    );
}

// ─────────────────────── player matching ───────────────────────

interface RosterPlayer {
    id: string;
    team_id: string;
    display_name: string;
    first_name: string;
    last_name: string;
    dorsal: number | null;
    position: string;
}

function normalizePersonName(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[''`´]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function tokensOf(value: string): string[] {
    return normalizePersonName(value).split(" ").filter(Boolean);
}

function nameMatches(actaName: string, roster: RosterPlayer): boolean {
    const actaNorm = normalizePersonName(actaName);
    if (!actaNorm) return false;

    const variants = [
        roster.display_name,
        `${roster.first_name} ${roster.last_name}`.trim(),
        `${roster.last_name} ${roster.first_name}`.trim(),
    ];

    for (const v of variants) {
        if (normalizePersonName(v) === actaNorm) return true;
    }

    const actaTokens = new Set(tokensOf(actaName));
    for (const v of variants) {
        const vTokens = new Set(tokensOf(v));
        if (actaTokens.size === 0 || vTokens.size === 0) continue;
        let common = 0;
        for (const t of actaTokens) if (vTokens.has(t)) common++;
        const minSize = Math.min(actaTokens.size, vTokens.size);
        if (common >= 2 && common >= minSize) return true;
    }

    return false;
}

function findRosterPlayer(
    actaDisplayName: string,
    actaDorsal: number,
    roster: RosterPlayer[]
): RosterPlayer | null {
    const byName = roster.filter((p) => nameMatches(actaDisplayName, p));

    if (byName.length === 1) return byName[0];
    if (byName.length > 1) {
        const byDorsal = byName.filter((p) => p.dorsal === actaDorsal);
        if (byDorsal.length === 1) return byDorsal[0];
        return null;
    }

    const byDorsal = roster.filter((p) => p.dorsal === actaDorsal);
    if (byDorsal.length === 1) return byDorsal[0];

    return null;
}

// ─────────────────────── group normalization ───────────────────────

function normalizeGroupName(
    rawGroupName: string | null | undefined,
    homeTeamName: string,
    awayTeamName: string,
    teamsWithGroup: { name: string; group_name: string | null }[]
): string {
    const raw = rawGroupName?.trim();
    if (!raw) return "General";

    if (/superliga|grupo|liga\s+regular/i.test(raw)) {
        return raw;
    }

    const homeNorm = normalizePersonName(homeTeamName);
    const awayNorm = normalizePersonName(awayTeamName);

    for (const t of teamsWithGroup) {
        if (!t.group_name) continue;
        const teamNorm = normalizePersonName(t.name);

        const matchesHome =
            homeNorm.length > 3 &&
            (homeNorm.includes(teamNorm) || teamNorm.includes(homeNorm));
        const matchesAway =
            awayNorm.length > 3 &&
            (awayNorm.includes(teamNorm) || teamNorm.includes(awayNorm));

        if (matchesHome || matchesAway) {
            return t.group_name;
        }
    }

    return "General";
}

// ─────────────────────── upserts ───────────────────────

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

async function upsertRound(
    supabase: ReturnType<typeof createAdminClient>,
    params: {
        competitionId: string;
        seasonId: string;
        roundNumber: number;
        groupName: string | null;
        startsAt: Date;
        endsAt: Date;
        esvoleySource?: boolean;
        dryRun?: boolean;
    }
): Promise<{ id: string; groupName: string | null }> {
    if (params.dryRun) {
        return {
            id: `dry-run:${params.seasonId}:${params.roundNumber}:${params.groupName ?? "General"}`,
            groupName: params.groupName,
        };
    }

    const canonicalGroup = canonicalizeRoundGroupName(params.groupName);
    const { data: existingRounds, error: roundsError } = await supabase
        .from("rounds")
        .select("id, group_name")
        .eq("season_id", params.seasonId)
        .eq("round_number", params.roundNumber);

    if (roundsError) throw roundsError;

    const exact = (existingRounds ?? []).find(
        (round) =>
            canonicalGroup
                ? round.group_name === canonicalGroup
                : round.group_name === null
    );

    const equivalent = (existingRounds ?? []).filter(
        (round) =>
            canonicalGroup &&
            canonicalizeRoundGroupName(round.group_name) === canonicalGroup
    );

    if (exact) {
        if (params.esvoleySource) {
            const { error } = await supabase
                .from("rounds")
                .update({
                    starts_at: params.startsAt.toISOString(),
                    ends_at: params.endsAt.toISOString(),
                    status: "SCHEDULED",
                })
                .eq("id", exact.id);
            if (error) throw error;
        }
        return { id: exact.id, groupName: exact.group_name };
    }

    if (params.esvoleySource && equivalent.length === 1) {
        const existing = equivalent[0];
        const { error } = await supabase
            .from("rounds")
            .update({
                group_name: canonicalGroup,
                starts_at: params.startsAt.toISOString(),
                ends_at: params.endsAt.toISOString(),
                status: "SCHEDULED",
            })
            .eq("id", existing.id);
        if (error) throw error;
        return { id: existing.id, groupName: canonicalGroup };
    }

    if (params.esvoleySource && equivalent.length > 1) {
        throw new Error(
            `Ambigüedad: existen varias jornadas equivalentes a temporada=${params.seasonId}, jornada=${params.roundNumber}, grupo=${canonicalGroup}. No se modificó ninguna.`
        );
    }

    const row = {
        competition_id: params.competitionId,
        season_id: params.seasonId,
        round_number: params.roundNumber,
        group_name: params.groupName,
        name: null,
        starts_at: params.startsAt.toISOString(),
        ends_at: params.endsAt.toISOString(),
        status: "SCHEDULED",
    };

    const { error } = await supabase
        .from("rounds")
        .upsert([row], { onConflict: "season_id,round_number,group_name" });

    if (error) throw error;

    let query = supabase
        .from("rounds")
        .select("id")
        .eq("season_id", params.seasonId)
        .eq("round_number", params.roundNumber);

    if (params.groupName) {
        query = query.eq("group_name", params.groupName);
    } else {
        query = query.is("group_name", null);
    }

    const { data, error: selectError } = await query.single();

    if (selectError) throw selectError;
    return { id: data.id, groupName: canonicalGroup };
}

async function loadResolvedTeam(
    supabase: ReturnType<typeof createAdminClient>,
    seasonId: string,
    teamId: string
): Promise<ResolvedMatchTeam> {
    const { data, error } = await supabase
        .from("teams")
        .select("id, rfevb_id, name")
        .eq("id", teamId)
        .eq("season_id", seasonId)
        .single();
    if (error) throw error;
    return {
        teamId: data.id,
        rfevbId: data.rfevb_id,
        name: data.name,
    };
}

// ─────────────────────── main ───────────────────────

async function main() {
    const args = parseArgs();

    console.log(
        `→ Ingesta de partidos: competición=${args.competitionRfevbId} temporada=${args.seasonRfevbId}` +
        (args.round ? ` (solo jornada ${args.round})` : "") +
        (args.forceRefresh ? ` [FORCE REFRESH]` : "") +
        (args.dryRun ? ` [DRY RUN]` : "")
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

    console.log("→ Cargando roster persistido…");
    const { data: rosterRows, error: rosterError } = await supabase
        .from("players")
        .select(
            "id, team_id, display_name, first_name, last_name, dorsal, position"
        )
        .eq("season_id", seasonId);

    if (rosterError) throw rosterError;
    if (!rosterRows || rosterRows.length === 0) {
        throw new Error(
            "No hay jugadores en la temporada. Ejecuta ingest:roster primero."
        );
    }

    const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name, group_name")
        .eq("season_id", seasonId);

    const teamsList = (teamsData || []) as {
        id: string;
        name: string;
        group_name: string | null;
    }[];

    const teamNameById = new Map<string, string>();
    for (const t of teamsList) teamNameById.set(t.id, t.name);

    const rosterByTeamId = new Map<string, RosterPlayer[]>();
    for (const row of rosterRows as RosterPlayer[]) {
        const list = rosterByTeamId.get(row.team_id) ?? [];
        list.push(row);
        rosterByTeamId.set(row.team_id, list);
    }

    console.log(
        `  ${rosterRows.length} jugadores en ${rosterByTeamId.size} equipos`
    );

    // ══════════════════════════════════════════════════════════════
    // CACHE: partidos ya en BD + si tienen stats
    // ══════════════════════════════════════════════════════════════

    console.log("→ Cargando partidos existentes en BD…");
    const { data: existingMatches } = await supabase
        .from("matches")
        .select("id, rfevb_match_id, status, round_id, match_date, home_sets, away_sets, sets")
        .eq("season_id", seasonId);

    const existingMatchMap = new Map<string, {
        id: string;
        status: string;
        round_id: string;
        match_date: string | null;
        home_sets: number | null;
        away_sets: number | null;
        sets: unknown;
    }>();

    for (const em of existingMatches || []) {
        existingMatchMap.set(em.rfevb_match_id, {
            id: em.id,
            status: em.status,
            round_id: em.round_id,
            match_date: em.match_date,
            home_sets: em.home_sets,
            away_sets: em.away_sets,
            sets: em.sets,
        });
    }

    const existingMatchIds = (existingMatches || []).map(em => em.id);
    let matchesWithStats = new Set<string>();

    if (existingMatchIds.length > 0) {
        const { data: existingStats } = await supabase
            .from("match_player_stats")
            .select("match_id")
            .in("match_id", existingMatchIds);

        for (const st of existingStats || []) {
            matchesWithStats.add(st.match_id);
        }
    }

    console.log(
        `  ${existingMatchMap.size} partidos en BD (${matchesWithStats.size} con stats)`
    );

    // ─────────────────────────────────────────────
    // Descargar partidos del listado principal
    // ─────────────────────────────────────────────

    console.log("→ Descargando partidos desde RFEVB…");
    const scrapedMatches = await fetchMatches(
        Number(args.competitionRfevbId),
        Number(args.seasonRfevbId),
        undefined
    );

    type IngestMatch = ScrapedMatch & {
        effectiveRound: number;
        effectiveGroup: string | null;
        esvoleySource: boolean;
        esvoleyMatchId?: string;
    };

    const esvoleyGroups = getEsvoleyGroups(
        Number(args.competitionRfevbId)
    );

    const esvoleyMatches: Array<
        Awaited<ReturnType<typeof fetchMatchesEsvoley>>[number] &
        { esvoleyGroupName: string }
    > = [];

    if (esvoleyGroups.length > 0) {
        console.log("→ Consultando EsVoley como referencia de jornadas y fechas…");
        for (const group of esvoleyGroups) {
            try {
                const groupMatches = await fetchMatchesEsvoley(group.id);
                esvoleyMatches.push(
                    ...groupMatches.map((match) => ({
                        ...match,
                        esvoleyGroupName: group.name,
                    }))
                );
                console.log(`  ✓ ${group.name}: ${groupMatches.length} partidos`);
            } catch (error) {
                console.warn(
                    `  ⚠ EsVoley ${group.name} (${group.id}) no disponible; se conserva el dato de Data Project.`
                );
                console.warn(
                    error instanceof Error ? error.message : String(error)
                );
            }
        }
    } else {
        console.log("  EsVoley no configurado para esta competición: se conserva Data Project.");
    }

    const usedEsvoleyMatchIds = new Set<string>();
    let esvoleyMatchesApplied = 0;
    let esvoleyMatchesAmbiguous = 0;

    const resolver = new TeamAliasResolver(supabase);

    const aliasActNames = [
        ...new Set([
            ...scrapedMatches.flatMap((match) => [match.homeTeam, match.awayTeam]),
            ...esvoleyMatches.flatMap((match) => [match.homeTeam, match.awayTeam]),
        ]),
    ];

    const resolvedTeamIds = resolver.resolveJornada(
        aliasActNames,
        teamsList.map((team) => ({ teamId: team.id, name: team.name })),
        33
    );

    const mergedMatches: IngestMatch[] = scrapedMatches.map((match) => {
        let effectiveRound = match.round;
        let effectiveGroup: string | null = normalizeGroupName(
            match.groupName,
            match.homeTeam,
            match.awayTeam,
            teamsList
        );
        let matchDate = match.matchDate;
        let esvoleySource = false;
        let esvoleyMatchId: string | undefined;

        if (esvoleyMatches.length > 0) {
            const preferredGroup =
                effectiveGroup === "General"
                    ? esvoleyGroups[0]?.name ?? "General"
                    : effectiveGroup;

            const esvoleyMatch = findEsvoleyMatch(
                match,
                esvoleyMatches.filter(
                    (candidate) => !usedEsvoleyMatchIds.has(candidate.rfevbMatchId)
                ),
                preferredGroup,
                resolvedTeamIds
            );

            if (esvoleyMatch) {
                effectiveRound = esvoleyMatch.round;
                effectiveGroup = canonicalizeRoundGroupName(
                    esvoleyMatch.esvoleyGroupName
                );

                if (
                    args.dryRun &&
                    esvoleyMatchesApplied <= 12 &&
                    (
                        normalizeTeamName(match.homeTeam) !==
                        normalizeTeamName(esvoleyMatch.homeTeam) ||
                        normalizeTeamName(match.awayTeam) !==
                        normalizeTeamName(esvoleyMatch.awayTeam)
                    )
                ) {
                    console.log(
                        `  [ALIAS] DP mID=${match.matchId}: ` +
                        `"${match.homeTeam}" vs "${match.awayTeam}" → ` +
                        `EsVoley id=${esvoleyMatch.rfevbMatchId}: ` +
                        `"${esvoleyMatch.homeTeam}" vs "${esvoleyMatch.awayTeam}" | ` +
                        `j=${esvoleyMatch.round}, grupo=${esvoleyMatch.esvoleyGroupName}`
                    );
                }

                if (esvoleyMatch.matchDate) {
                    matchDate = esvoleyMatch.matchDate;
                }

                esvoleySource = true;
                esvoleyMatchId = esvoleyMatch.rfevbMatchId;
                usedEsvoleyMatchIds.add(esvoleyMatch.rfevbMatchId);
                esvoleyMatchesApplied++;
            } else {
                esvoleyMatchesAmbiguous++;

                if (args.dryRun && esvoleyMatchesAmbiguous <= 12) {
                    const closest = esvoleyMatches
                        .filter((candidate) => !usedEsvoleyMatchIds.has(candidate.rfevbMatchId))
                        .map((candidate) => {
                            const homeScore = Math.max(
                                calculateContainment(match.homeTeam, candidate.homeTeam),
                                calculateSimilarity(match.homeTeam, candidate.homeTeam)
                            );
                            const awayScore = Math.max(
                                calculateContainment(match.awayTeam, candidate.awayTeam),
                                calculateSimilarity(match.awayTeam, candidate.awayTeam)
                            );

                            return {
                                candidate,
                                score: homeScore + awayScore,
                                homeScore,
                                awayScore,
                            };
                        })
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 2);

                    console.log(
                        `  [AMBIGUO] DP mID=${match.matchId} | ` +
                        `${match.homeTeam} vs ${match.awayTeam} | ` +
                        `j=${match.round} | grupo=${effectiveGroup ?? "General"} | ` +
                        `fecha=${match.matchDate?.toISOString() ?? "sin dato"}`
                    );

                    for (const item of closest) {
                        console.log(
                            `    EsVoley id=${item.candidate.rfevbMatchId} | ` +
                            `${item.candidate.homeTeam} vs ${item.candidate.awayTeam} | ` +
                            `j=${item.candidate.round} | grupo=${item.candidate.esvoleyGroupName} | ` +
                            `fecha=${item.candidate.matchDate?.toISOString() ?? "sin dato"} | ` +
                            `scores=${item.homeScore}/${item.awayScore}`
                        );
                    }
                }
            }
        }

        return {
            ...match,
            matchDate,
            effectiveRound,
            effectiveGroup,
            esvoleySource,
            esvoleyMatchId,
        };
    });

    let matches = args.round
        ? mergedMatches.filter((match) => match.effectiveRound === args.round)
        : mergedMatches;

    if (esvoleyMatches.length > 0) {
        console.log(
            `  EsVoley aplicado a ${esvoleyMatchesApplied} partidos; ` +
            `${esvoleyMatchesAmbiguous} partidos sin correspondencia inequívoca conservan Data Project.`
        );
    }

    if (matches.length === 0) {
        throw new Error("El scraper no devolvió partidos. Abortando.");
    }

    // ─────────────────────────────────────────────
    // PRE-PASO: Descargar stats (con cache)
    // ─────────────────────────────────────────────

    console.log("→ Descargando estadísticas de partidos (con cache)…");
    const statsCache = new Map<string, CachedStats>();

    let fetchedCount = 0;
    let cachedCount = 0;

    for (const m of matches) {
        const existing = existingMatchMap.get(m.matchId);

        const canUseCache =
            !args.forceRefresh &&
            existing !== undefined &&
            existing.status === "COMPLETED" &&
            matchesWithStats.has(existing.id);

        if (canUseCache) {
            statsCache.set(m.matchId, { source: "db" });
            cachedCount++;
            continue;
        }

        try {
            const stats = await fetchMatchStatistics(
                m.matchId,
                m.competitionId,
                m.categoryId,
                m.seasonId
            );
            statsCache.set(m.matchId, { source: "fetched", data: stats });
            fetchedCount++;
        } catch {
            statsCache.set(m.matchId, { source: "failed" });
        }
    }

    console.log(`  ✓ Desde BD (cache): ${cachedCount} partidos`);
    console.log(`  ⬇ Descargados de RFEVB: ${fetchedCount} partidos`);

    // Agrupar por Grupo + Jornada OFICIAL
    const roundMap = new Map<string, IngestMatch[]>();

    for (const m of matches) {
        const cached = statsCache.get(m.matchId);
        const statsData = cached?.source === "fetched" ? cached.data : null;

        const effectiveRound = m.esvoleySource
            ? m.effectiveRound
            : (statsData?.officialRound ?? m.effectiveRound);

        const effectiveGroup = m.esvoleySource
            ? m.effectiveGroup
            : normalizeGroupName(
                m.groupName ?? statsData?.officialGroup,
                m.homeTeam,
                m.awayTeam,
                teamsList
            );

        const key = `${effectiveGroup}|${effectiveRound}`;
        const list = roundMap.get(key) ?? [];
        list.push(m);
        roundMap.set(key, list);
    }

    const roundKeys = [...roundMap.keys()].sort((a, b) => {
        const [groupA, roundA] = a.split("|");
        const [groupB, roundB] = b.split("|");
        if (groupA !== groupB) return groupA.localeCompare(groupB);
        return Number(roundA) - Number(roundB);
    });

    console.log(
        `  ${matches.length} partidos en ${roundKeys.length} bloques (Grupo+Jornada)`
    );

    const aliasCtx = { competitionId, seasonId };

    let totalMatchesPersisted = 0;
    let totalMatchesSkippedCached = 0;
    let totalStatsPersisted = 0;
    let totalSkippedNoTeam = 0;
    let totalSkippedNoStats = 0;
    let totalSkippedNoPlayer = 0;
    let totalSkippedDuplicatePlayer = 0;
    let totalDuplicateTeamConflicts = 0;
    let totalRoundsSkippedNoDates = 0;

    const expectedPersistedMatchIds = new Set<string>();

    const matchResolutions = new Map<
        string,
        {
            rosterName: string;
            similarity: number;
            status: "OK" | "NO RESUELTO" | "AMBIGUO";
        }
    >();

    for (const roundKey of roundKeys) {
        const roundMatches = roundMap.get(roundKey)!;
        const [groupNameStr, roundNumStr] = roundKey.split("|");
        const roundNumber = Number(roundNumStr);
        const groupName = groupNameStr === "General" ? null : groupNameStr;

        const dated = roundMatches.filter((m) => m.matchDate !== null);

        if (dated.length === 0) {
            console.warn(
                `  ⚠ Jornada ${groupName || ""} ${roundNumber} sin fechas. Se omite entera.`
            );
            totalRoundsSkippedNoDates++;
            continue;
        }

        const first = dated.reduce((a, b) =>
            a.matchDate! < b.matchDate! ? a : b
        );

        const last = dated.reduce((a, b) =>
            a.matchDate! > b.matchDate! ? a : b
        );

        const startsAt = startOfDayMadrid(first.matchDate!);
        const endsAt = startOfDayAfterMadrid(last.matchDate!);

        console.log(
            `\n→ ${groupName ? `${groupName} - ` : ""}Jornada ${roundNumber}: ${roundMatches.length} partidos ` +
            `[${startsAt.toISOString()} → ${endsAt.toISOString()}]`
        );

        const roundResolution = await upsertRound(supabase, {
            competitionId,
            seasonId,
            roundNumber,
            groupName,
            startsAt,
            endsAt,
            esvoleySource: roundMatches.some((match) => match.esvoleySource),
            dryRun: args.dryRun,
        });

        const roundId = roundResolution.id;
        const persistedGroupName = roundResolution.groupName;

        const actNames = roundMatches.flatMap((m) => [m.homeTeam, m.awayTeam]);

        const resolvedByName = resolver.resolveJornada(
            actNames,
            teamsList.map((t) => ({ teamId: t.id, name: t.name })),
            50
        );

        for (const rawName of new Set(actNames)) {
            if (matchResolutions.has(rawName)) continue;

            const teamId = resolvedByName.get(rawName);

            if (teamId) {
                const rosterName = teamNameById.get(teamId) || "?";
                const containmentScore = calculateContainment(rawName, rosterName);
                const similarityScore = calculateSimilarity(rawName, rosterName);
                const score = Math.max(containmentScore, similarityScore);

                matchResolutions.set(rawName, {
                    rosterName,
                    similarity: score,
                    status: "OK",
                });
            } else {
                matchResolutions.set(rawName, {
                    rosterName: "—",
                    similarity: 0,
                    status: "NO RESUELTO",
                });
            }
        }

        const teamsInThisRound = new Set<string>();

        for (const scraped of roundMatches) {
            const cached = statsCache.get(scraped.matchId);

            // Si el partido ya está en BD con stats, no se vuelve a procesar.
            // Se comprueba el conflicto de equipos solo como advertencia.
            if (cached?.source === "db") {
                const homeTeamId = resolvedByName.get(scraped.homeTeam) ?? null;
                const awayTeamId = resolvedByName.get(scraped.awayTeam) ?? null;

                if (
                    homeTeamId &&
                    awayTeamId &&
                    (
                        teamsInThisRound.has(homeTeamId) ||
                        teamsInThisRound.has(awayTeamId)
                    )
                ) {
                    console.warn(
                        `  ⚠ Conflicto (cache): "${scraped.homeTeam}" vs "${scraped.awayTeam}" ya aparece en otro partido de la Jornada ${roundNumber}. Se conserva.`
                    );
                    totalDuplicateTeamConflicts++;
                }

                if (homeTeamId) teamsInThisRound.add(homeTeamId);
                if (awayTeamId) teamsInThisRound.add(awayTeamId);

                if (!args.dryRun && scraped.esvoleySource) {
                    const existing = existingMatchMap.get(scraped.matchId);

                    if (existing) {
                        const updates: Record<string, unknown> = {
                            round_id: roundId,
                            group_name: persistedGroupName,
                        };

                        if (scraped.matchDate) {
                            updates.match_date = scraped.matchDate.toISOString();
                        }

                        const { error } = await supabase
                            .from("matches")
                            .update(updates)
                            .eq("id", existing.id);

                        if (error) throw error;
                    }
                }

                totalMatchesSkippedCached++;
                expectedPersistedMatchIds.add(scraped.matchId);
                continue;
            }

            const homeTeamId = resolvedByName.get(scraped.homeTeam) ?? null;
            const awayTeamId = resolvedByName.get(scraped.awayTeam) ?? null;

            if (!homeTeamId || !awayTeamId) {
                console.warn(
                    `  ⚠ Partido ${scraped.matchId}: equipo sin resolver ` +
                    `("${scraped.homeTeam}" vs "${scraped.awayTeam}"). Se omite.`
                );
                totalSkippedNoTeam++;
                continue;
            }

            // El calendario puede contener encuentros aplazados o reprogramados.
            // No se descartan partidos por la repetición de un equipo:
            // se registra el conflicto y se continúa con la ingesta.
            if (
                teamsInThisRound.has(homeTeamId) ||
                teamsInThisRound.has(awayTeamId)
            ) {
                console.warn(
                    `  ⚠ Conflicto: "${scraped.homeTeam}" vs "${scraped.awayTeam}" ya aparece en otro partido de la Jornada ${roundNumber} (${groupName || "General"}). Se conserva para revisión.`
                );
                totalDuplicateTeamConflicts++;
            }

            teamsInThisRound.add(homeTeamId);
            teamsInThisRound.add(awayTeamId);

            const homeTeam = await loadResolvedTeam(
                supabase,
                seasonId,
                homeTeamId
            );

            const awayTeam = await loadResolvedTeam(
                supabase,
                seasonId,
                awayTeamId
            );

            if (!args.dryRun && persistedGroupName) {
                await supabase
                    .from("teams")
                    .update({ group_name: persistedGroupName })
                    .eq("id", homeTeam.teamId)
                    .is("group_name", null);

                await supabase
                    .from("teams")
                    .update({ group_name: persistedGroupName })
                    .eq("id", awayTeam.teamId)
                    .is("group_name", null);
            }

            const statsData = cached?.source === "fetched" ? cached.data : null;
            const existing = existingMatchMap.get(scraped.matchId);

            const matchRow: Record<string, unknown> = {
                competition_id: competitionId,
                season_id: seasonId,
                round_id: roundId,
                rfevb_match_id: scraped.matchId,
                group_name: persistedGroupName,
                home_team_id: homeTeam.teamId,
                away_team_id: awayTeam.teamId,
            };

            if (scraped.matchDate) {
                matchRow.match_date = scraped.matchDate.toISOString();
            }

            if (statsData) {
                matchRow.home_sets = statsData.homeScore;
                matchRow.away_sets = statsData.awayScore;
                matchRow.status = "COMPLETED";
                matchRow.sets = statsData.sets.map((s, i) => ({
                    setNumber: i + 1,
                    homeScore: s.home,
                    awayScore: s.away,
                }));
            } else if (!existing) {
                matchRow.home_sets = null;
                matchRow.away_sets = null;
                matchRow.status = "SCHEDULED";
                matchRow.sets = [];
            }

            if (args.dryRun) {
                console.log(
                    `  [DRY-RUN] Partido ${scraped.matchId}: jornada ${roundNumber} (${persistedGroupName ?? "General"}), fecha ${scraped.matchDate?.toISOString() ?? "sin dato"}, estado ${statsData ? "COMPLETED" : existing?.status ?? "SCHEDULED"}`
                );

                totalMatchesPersisted++;
                expectedPersistedMatchIds.add(scraped.matchId);
                continue;
            }

            const { error: matchUpsertError } = await supabase
                .from("matches")
                .upsert([matchRow], {
                    onConflict: "season_id,rfevb_match_id",
                });

            if (matchUpsertError) throw matchUpsertError;

            const { data: matchRowData, error: matchSelectError } =
                await supabase
                    .from("matches")
                    .select("id")
                    .eq("season_id", seasonId)
                    .eq("rfevb_match_id", scraped.matchId)
                    .single();

            if (matchSelectError) throw matchSelectError;

            totalMatchesPersisted++;
            expectedPersistedMatchIds.add(scraped.matchId);

            if (!statsData) {
                totalSkippedNoStats++;

                if (!args.dryRun) {
                    await resolver.registerAliases(aliasCtx, [
                        {
                            teamId: homeTeam.teamId,
                            source: "matches",
                            alias: scraped.homeTeam,
                        },
                        {
                            teamId: awayTeam.teamId,
                            source: "matches",
                            alias: scraped.awayTeam,
                        },
                    ]);
                }

                continue;
            }

            const mappingCtx: MatchMappingContext = {
                competitionId,
                seasonId,
                home: homeTeam,
                away: awayTeam,
            };

            const mapped = mapScrapedMatch(scraped, statsData, mappingCtx);

            let cursor = 0;
            const statsRows: Array<Record<string, unknown>> = [];
            const seenPlayerIds = new Set<string>();

            for (let teamIdx = 0; teamIdx < mapped.teams.length; teamIdx++) {
                const team = mapped.teams[teamIdx];
                const roster = rosterByTeamId.get(team.team.id) ?? [];

                for (let i = 0; i < team.players.length; i++) {
                    const actaPlayer = team.players[i];
                    const stats = mapped.playerStats[cursor++];

                    if (!stats) {
                        throw new Error(
                            `mapped.playerStats desalineado en match ${scraped.matchId} ` +
                            `(cursor=${cursor - 1}, len=${mapped.playerStats.length})`
                        );
                    }

                    if (stats.teamId !== team.team.id) {
                        throw new Error(
                            `Alineación de stats rota en match ${scraped.matchId}`
                        );
                    }

                    const dorsal = actaPlayer.dorsal ?? 0;
                    const rosterPlayer = findRosterPlayer(
                        actaPlayer.displayName,
                        dorsal,
                        roster
                    );

                    if (!rosterPlayer) {
                        console.warn(
                            `    ⚠ Sin cruce roster: "${actaPlayer.displayName}" (#${dorsal}) en ${team.team.name}`
                        );
                        totalSkippedNoPlayer++;
                        continue;
                    }

                    if (seenPlayerIds.has(rosterPlayer.id)) {
                        console.warn(
                            `    ⚠ Jugador duplicado en acta: "${actaPlayer.displayName}" (#${dorsal}) en ${team.team.name} → roster id ${rosterPlayer.id}. Se omite la fila duplicada.`
                        );
                        totalSkippedDuplicatePlayer++;
                        continue;
                    }

                    seenPlayerIds.add(rosterPlayer.id);

                    statsRows.push({
                        competition_id: competitionId,
                        season_id: seasonId,
                        match_id: matchRowData.id,
                        player_id: rosterPlayer.id,
                        team_id: team.team.id,
                        position: rosterPlayer.position,
                        sets_played: stats.setsPlayed,
                        points_total: stats.pointsTotal,
                        points_breakout: stats.pointsBreakout,
                        won_lost: stats.wonLost,
                        serve_total: stats.serveTotal,
                        serve_errors: stats.serveErrors,
                        serve_aces: stats.serveAces,
                        reception_total: stats.receptionTotal,
                        reception_errors: stats.receptionErrors,
                        reception_positive: stats.receptionPositive,
                        reception_excellent: stats.receptionExcellent,
                        attack_total: stats.attackTotal,
                        attack_errors: stats.attackErrors,
                        attack_blocked: stats.attackBlocked,
                        attack_excellent: stats.attackPoints,
                        attack_excellent_percentage:
                        stats.attackExcellentPercentage,
                        block_points: stats.blockPoints,
                    });
                }
            }

            if (statsRows.length > 0) {
                const { error: statsUpsertError } = await supabase
                    .from("match_player_stats")
                    .upsert(statsRows, {
                        onConflict: "match_id,player_id",
                    });

                if (statsUpsertError) throw statsUpsertError;
                totalStatsPersisted += statsRows.length;
            }

            await resolver.registerAliases(aliasCtx, [
                {
                    teamId: homeTeam.teamId,
                    source: "matches",
                    alias: scraped.homeTeam,
                },
                {
                    teamId: awayTeam.teamId,
                    source: "matches",
                    alias: scraped.awayTeam,
                },
            ]);
        }
    }

    let persistedIds = new Set<string>();
    let statsCount: number | null = null;

    if (!args.dryRun) {
        console.log("\n→ Verificando partidos persistidos…");

        const { data: persistedMatches, error: persistedMatchesError } =
            await supabase
                .from("matches")
                .select("rfevb_match_id")
                .eq("season_id", seasonId);

        if (persistedMatchesError) throw persistedMatchesError;

        persistedIds = new Set(
            (persistedMatches ?? []).map((row) => row.rfevb_match_id as string)
        );

        const missing: string[] = [];

        for (const id of expectedPersistedMatchIds) {
            if (!persistedIds.has(id)) missing.push(id);
        }

        const { count, error: statsCountError } = await supabase
            .from("match_player_stats")
            .select("*", { count: "exact", head: true })
            .eq("season_id", seasonId);

        if (statsCountError) throw statsCountError;
        statsCount = count;

        if (missing.length > 0) {
            const preview = missing.slice(0, 5).join(", ");
            const suffix = missing.length > 5 ? ", …" : "";

            throw new Error(
                `Partidos esperados no persistidos (${missing.length}): ${preview}${suffix}`
            );
        }
    }

    console.log("\n═══ Resumen ═══");
    console.log(`Competición RFEVB:    ${args.competitionRfevbId}`);
    console.log(`Temporada RFEVB:      ${args.seasonRfevbId}`);
    console.log(`Partidos en RFEVB:    ${matches.length}`);
    console.log(`  Desde BD (cache):   ${totalMatchesSkippedCached}`);
    console.log(`  Desde RFEVB:        ${totalMatchesPersisted}`);
    console.log(
        `Partidos en Supabase: ${persistedIds.size} (acumulado de la temporada)`
    );
    console.log(
        `Stats de jugador:     ${args.dryRun ? "dry-run" : statsCount} (esta ejecución: ${args.dryRun ? 0 : totalStatsPersisted})`
    );
    console.log("");
    console.log(
        `Jornadas sin fecha (omitidas):    ${totalRoundsSkippedNoDates}`
    );
    console.log(`Partidos sin equipo resuelto:     ${totalSkippedNoTeam}`);
    console.log(`Partidos sin stats:               ${totalSkippedNoStats}`);
    console.log(`Stats sin cruce de jugador:       ${totalSkippedNoPlayer}`);
    console.log(
        `Stats con jugador duplicado:      ${totalSkippedDuplicatePlayer}`
    );
    console.log(
        `Conflictos entre equipos detectados: ${totalDuplicateTeamConflicts}`
    );

    console.log("\n\n═══ Diagnóstico de Emparejamiento de Equipos ═══\n");

    const sortedResolutions = Array.from(matchResolutions.entries()).sort(
        (a, b) => {
            if (a[1].status !== b[1].status)
                return a[1].status === "NO RESUELTO" ? -1 : 1;
            return a[1].similarity - b[1].similarity;
        }
    );

    const colActa = 55;
    const colRoster = 40;
    const colSim = 10;
    const colStatus = 15;

    console.log(
        "Nombre en Acta".padEnd(colActa) +
        "Nombre en Roster".padEnd(colRoster) +
        "% Sim.".padEnd(colSim) +
        "Estado".padEnd(colStatus)
    );

    console.log("-".repeat(colActa + colRoster + colSim + colStatus));

    let okCount = 0;
    let koCount = 0;

    for (const [actaName, info] of sortedResolutions) {
        if (info.status === "OK") okCount++;
        else koCount++;

        const actaPadded =
            actaName.length > colActa - 2
                ? actaName.slice(0, colActa - 3) + "…"
                : actaName;

        const rosterPadded =
            info.rosterName.length > colRoster - 2
                ? info.rosterName.slice(0, colRoster - 3) + "…"
                : info.rosterName;

        console.log(
            actaPadded.padEnd(colActa) +
            rosterPadded.padEnd(colRoster) +
            String(info.similarity).padEnd(colSim) +
            info.status.padEnd(colStatus)
        );
    }

    console.log("-".repeat(colActa + colRoster + colSim + colStatus));
    console.log(`Total nombres en actas: ${matchResolutions.size}`);
    console.log(`Resueltos: ${okCount} | No resueltos: ${koCount}`);

    const seenRosterNames = new Set<string>();

    for (const info of matchResolutions.values()) {
        if (info.status === "OK" && info.rosterName !== "—") {
            seenRosterNames.add(info.rosterName);
        }
    }

    const missingFromActas = teamsList.filter(
        (t) => !seenRosterNames.has(t.name)
    );

    if (missingFromActas.length > 0) {
        console.log(
            `\n⚠ Equipos del roster que no aparecen en ninguna acta (${missingFromActas.length}):`
        );

        for (const t of missingFromActas) {
            console.log(`  - ${t.name}`);
        }
    }

    console.log("\n✅ Ingesta de partidos completada y verificada.");
}

main().catch((err) => {
    console.error("Error inesperado:", err);
    process.exit(1);
});
