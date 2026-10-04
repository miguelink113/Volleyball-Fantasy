import { ScoringSystemV1 } from "@/domain/scoring/scoring-v1.system";
import { mapScrapedMatch } from "@/lib/domain/map-scraped-match";
import type { Player } from "@/domain/player/player.types";
import type { Match } from "@/lib/scraper/fetch-matches";
import type { MatchStats } from "@/lib/scraper/fetch-match-statistics";

const baseUrl = process.env.FANTASY_API_URL ?? "http://localhost:3000";
const competitionId = "152";
const seasonId = "186";

interface MatchesResponse {
    success: boolean;
    matches?: Match[];
    error?: string;
}

interface MatchStatsResponse {
    success: boolean;
    match?: MatchStats;
    error?: string;
}

interface RosterResponse {
    success: boolean;
    teams?: Array<{ id: string; name: string }>;
    players?: Player[];
    error?: string;
}

interface ScriptArguments {
    round: number;
    matchNumber: number;
}

function usage(): string {
    return [
        "Uso: npm run show:match-scores -- <jornada> <partido>",
        "",
        "Ejemplo: npm run show:match-scores -- 1 2",
        "  Calcula las puntuaciones del segundo partido de la jornada 1.",
    ].join("\n");
}

function parsePositiveInteger(value: string, name: string): number {
    if (!/^\d+$/.test(value)) {
        throw new Error(`${name} debe ser un entero positivo.`);
    }

    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed) || parsed < 1) {
        throw new Error(`${name} debe ser un entero positivo.`);
    }

    return parsed;
}

function parseArguments(values: string[]): ScriptArguments {
    if (values.length !== 2) {
        throw new Error(
            `Se esperaban <jornada> y <partido>, pero se recibieron ` +
            `${values.length} argumento(s).\n\n${usage()}`
        );
    }

    return {
        round: parsePositiveInteger(values[0], "La jornada"),
        matchNumber: parsePositiveInteger(values[1], "El número de partido"),
    };
}

function normalize(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function normalizePlayerName(value: string): string {
    return normalize(value.replace(/\s*\([^)]*\)/g, ""));
}

function resolveRosterPlayer(
    teamName: string,
    playerNumber: number,
    playerName: string,
    roster: RosterResponse
): Player["position"] {
    const rosterTeams = (roster.teams ?? []).filter((team) => {
        const expected = normalize(teamName);
        const actual = normalize(team.name);
        return (
            actual === expected ||
            actual.includes(expected) ||
            expected.includes(actual)
        );
    });
    const teamIds = new Set(rosterTeams.map((team) => team.id));
    const teamPlayers = (roster.players ?? []).filter(
        (player) => player.currentTeamId && teamIds.has(player.currentTeamId)
    );
    const playerByTeam =
        teamPlayers.find((candidate) => candidate.dorsal === playerNumber) ??
        teamPlayers.find(
            (candidate) =>
                normalizePlayerName(candidate.displayName) ===
                normalizePlayerName(playerName)
        );
    const globalMatches = (roster.players ?? []).filter(
        (candidate) =>
            candidate.dorsal === playerNumber &&
            normalizePlayerName(candidate.displayName) ===
                normalizePlayerName(playerName)
    );
    const player =
        playerByTeam ??
        (globalMatches.length === 1 ? globalMatches[0] : undefined);

    if (!player) {
        console.warn(
            `No se pudo resolver la posición de ${playerName} (#${playerNumber}) ` +
            `en el roster del equipo ${teamName}; ` +
            `${globalMatches.length} coincidencia(s) global(es). ` +
            "Se utilizará DESCONOCIDO."
        );
        return "unknown";
    }

    return player.position;
}

async function getJson<T>(url: string): Promise<T> {
    console.log(`[HTTP] GET ${url}`);
    const response = await fetch(url);
    const body = await response.json() as T;

    if (!response.ok) {
        throw new Error(`La API respondió con HTTP ${response.status}`);
    }

    return body;
}

async function main(): Promise<void> {
    const { round, matchNumber } = parseArguments(process.argv.slice(2));

    console.log(
        `[1/7] Buscando el partido ${matchNumber} de la jornada ${round}...`
    );
    const matchesResponse = await getJson<MatchesResponse>(
        `${baseUrl}/api/matches?competition=${competitionId}` +
        `&season=${seasonId}&round=${round}`
    );

    if (!matchesResponse.success || !matchesResponse.matches?.length) {
        throw new Error(
            matchesResponse.error ??
            `No se encontraron partidos en la jornada ${round}.`
        );
    }

    if (matchNumber > matchesResponse.matches.length) {
        throw new Error(
            `El partido ${matchNumber} no existe en la jornada ${round}. ` +
            `Hay ${matchesResponse.matches.length} partido(s).`
        );
    }

    const scrapedMatch = matchesResponse.matches[matchNumber - 1];

    if (!scrapedMatch) {
        throw new Error(
            `No se pudo seleccionar el partido ${matchNumber} de la jornada ${round}.`
        );
    }

    console.log(
        `[2/7] Se encontraron ${matchesResponse.matches.length} partidos. ` +
        `Seleccionado: ${scrapedMatch.matchId}.`
    );
    console.log(
        `[3/7] Partido: ${scrapedMatch.homeTeam} (local) - ` +
        `${scrapedMatch.awayTeam} (visitante).`
    );

    console.log("[4/7] Obteniendo roster y estadísticas del partido...");
    const rosterResponse = await getJson<RosterResponse>(
        `${baseUrl}/api/competition-roster?competition=${competitionId}`
    );
    if (!rosterResponse.success || !rosterResponse.players || !rosterResponse.teams) {
        throw new Error(
            rosterResponse.error ?? "No se pudo obtener el roster de la competición."
        );
    }
    const statsResponse = await getJson<MatchStatsResponse>(
        `${baseUrl}/api/match-statistics?matchId=${scrapedMatch.matchId}` +
        `&competition=${scrapedMatch.competitionId}` +
        `&category=${scrapedMatch.categoryId}` +
        `&season=${scrapedMatch.seasonId}`
    );

    if (!statsResponse.success || !statsResponse.match) {
        throw new Error(
            statsResponse.error ??
            `No se pudieron obtener las estadísticas de ${scrapedMatch.matchId}.`
        );
    }

    console.log(
        `[5/7] Estadísticas recibidas para ${statsResponse.match.teams.length} ` +
        `equipos: ${statsResponse.match.teams.map((team) => team.name).join(" | ")}.`
    );
    const mapped = mapScrapedMatch(scrapedMatch, statsResponse.match);
    const resolvedPlayers = new Map<string, Player["position"]>();
    statsResponse.match.teams.forEach((teamStats, teamIndex) => {
        const matchTeamName =
            teamIndex === 0
                ? scrapedMatch.homeTeam
                : scrapedMatch.awayTeam;

        teamStats.players.forEach((playerStats) => {
            const position = resolveRosterPlayer(
                matchTeamName,
                playerStats.number,
                playerStats.name,
                rosterResponse
            );
            resolvedPlayers.set(
                `${teamIndex}:${playerStats.number}`,
                position
            );
        });
    });
    const setsPlayed = mapped.match.sets?.length ?? 0;
    console.log(
        `[6/7] Datos conectados al dominio: ${mapped.playerStats.length} ` +
        `jugadores, ${setsPlayed} sets.`
    );

    const scoringSystem = new ScoringSystemV1();
    const scores = mapped.playerStats.map((stats) => {
        const teamIndex = mapped.teams.findIndex(
            (mappedTeam) => mappedTeam.team.id === stats.teamId
        );
        const scrapedTeam = statsResponse.match?.teams[teamIndex];
        const scrapedPlayer = scrapedTeam?.players.find(
            (candidate) => candidate.number === mapped.teams[teamIndex]?.players
                .find((player) => player.id === stats.playerId)?.dorsal
        );
        const position =
            scrapedPlayer === undefined
                ? "unknown"
                : resolvedPlayers.get(
                    `${teamIndex}:${scrapedPlayer.number}`
                ) ?? "unknown";

        const score = scoringSystem.calculate(
            { ...stats, position },
            mapped.match
        );
        const team = mapped.teams.find(
            (mappedTeam) => mappedTeam.team.id === stats.teamId
        );
        const player = team?.players.find(
            (candidate) => candidate.id === stats.playerId
        );

        return {
            jugador: player?.displayName ?? stats.playerId,
            equipo: team?.team.name ?? stats.teamId,
            posición: position === "unknown" ? "DESCONOCIDO" : position,
            participación: score.breakdown.participation ?? 0,
            saque: score.breakdown.serve ?? 0,
            ataque: score.breakdown.attack ?? 0,
            bloqueos: score.breakdown.blocks ?? 0,
            recepción: score.breakdown.reception ?? 0,
            resultado: score.breakdown.matchResult ?? 0,
            total: score.totalScore,
        };
    }).sort((left, right) => right.total - left.total);

    console.log(
        `[7/7] Puntuaciones calculadas con ScoringSystemV1 ` +
        `(versión ${scoringSystem.version}).`
    );
    console.table(scores);
}

main().catch((error) => {
    console.error(
        error instanceof Error ? error.message : "Error desconocido"
    );
    process.exitCode = 1;
});
