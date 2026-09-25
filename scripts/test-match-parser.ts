import type { Match } from "@/lib/scraper/fetch-matches";
import type {
    MatchStats,
    PlayerStats,
} from "@/lib/scraper/fetch-match-statistics";

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

function usage(): string {
    return [
        "Uso: npm run test:match-parser -- <jornada> <partido>",
        "",
        "Ejemplo: npm run test:match-parser -- 1 1",
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

function parseArguments(values: string[]): {
    round: number;
    matchNumber: number;
} {
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

async function getJson<T>(url: string): Promise<T> {
    console.log(`[HTTP] GET ${url}`);
    const response = await fetch(url);
    const body = await response.json() as T;

    if (!response.ok) {
        throw new Error(`La API respondió con HTTP ${response.status}`);
    }

    return body;
}

function assertParsedPlayerStats(
    teams: MatchStats["teams"]
): void {
    const players = teams.flatMap((team) => team.players);

    if (teams.length !== 2) {
        throw new Error(
            `El parser debe devolver exactamente 2 equipos; devolvió ${teams.length}.`
        );
    }

    const invalidTeamNames = teams.filter(
        (team) =>
            !team.name ||
            team.name.toLowerCase() === "equipo desconocido"
    );

    if (invalidTeamNames.length > 0) {
        throw new Error(
            "El parser no resolvió el nombre de todos los equipos: " +
            invalidTeamNames.map((team) => team.name).join(", ")
        );
    }

    if (players.length === 0) {
        throw new Error("El parser no devolvió ningún jugador.");
    }

    const invalidPlayers = players.filter(
        (player) => !Number.isInteger(player.number) || player.number <= 0
    );

    if (invalidPlayers.length > 0) {
        throw new Error(
            `El parser devolvió jugadores con dorsal inválido: ` +
            `${invalidPlayers.map((player) => `${player.name} (#${player.number})`).join(", ")}.`
        );
    }
}

function toTableRow(
    teamName: string,
    player: PlayerStats
): Record<string, number | string> {
    return {
        equipo: teamName,
        dorsal: player.number,
        jugador: player.name,
        sets: Object.values(player.startingFormation).filter(
            (position) => position !== null
        ).length,
        puntos: player.points.total ?? 0,
        saqueTotal: player.serve.total ?? 0,
        erroresSaque: player.serve.errors ?? 0,
        puntosDirectos: player.serve.directPoints ?? 0,
        recepciones: player.reception.total ?? 0,
        erroresRecepcion: player.reception.errors ?? 0,
        recepcionPos: player.reception.positivePercentage ?? 0,
        recepcionExc: player.reception.excellentPercentage ?? 0,
        ataques: player.attack.total ?? 0,
        erroresAtaque: player.attack.errors ?? 0,
        ataquesBloqueados: player.attack.blocks ?? 0,
        ataquesExc: player.attack.excellent ?? 0,
        bloqueos: player.block.points ?? 0,
    };
}

async function main(): Promise<void> {
    const { round, matchNumber } = parseArguments(process.argv.slice(2));

    console.log("==========================================");
    console.log(" TEST DEL PARSER DE ESTADÍSTICAS RFEVB");
    console.log("==========================================");
    console.log(`Jornada: ${round}`);
    console.log(`Partido: ${matchNumber}`);

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

    const selectedMatch = matchesResponse.matches[matchNumber - 1];

    if (!selectedMatch) {
        throw new Error(
            `El partido ${matchNumber} no existe en la jornada ${round}. ` +
            `Hay ${matchesResponse.matches.length} partido(s).`
        );
    }

    console.log(
        `Partido seleccionado: ${selectedMatch.matchId} — ` +
        `${selectedMatch.homeTeam} vs ${selectedMatch.awayTeam}`
    );

    const statsResponse = await getJson<MatchStatsResponse>(
        `${baseUrl}/api/match-statistics?matchId=${selectedMatch.matchId}` +
        `&competition=${selectedMatch.competitionId}` +
        `&category=${selectedMatch.categoryId}` +
        `&season=${selectedMatch.seasonId}`
    );

    if (!statsResponse.success || !statsResponse.match) {
        throw new Error(
            statsResponse.error ??
            `No se pudieron obtener las estadísticas de ${selectedMatch.matchId}.`
        );
    }

    const matchStats = statsResponse.match;
    assertParsedPlayerStats(matchStats.teams);

    console.log(
        `✅ Estructura válida: ${matchStats.teams.length} equipos, ` +
        `${matchStats.teams.reduce((total, team) => total + team.players.length, 0)} jugadores.`
    );
    console.log(
        `Marcador parseado: ${matchStats.homeScore ?? "?"}-` +
        `${matchStats.awayScore ?? "?"}; sets: ${matchStats.sets.length}.`
    );
    console.log(
        "La tabla muestra los valores ya extraídos por el parser, no los " +
        "valores calculados por el scoring fantasy:"
    );

    console.table(
        matchStats.teams.flatMap((team) =>
            team.players.map((player) => toTableRow(team.name, player))
        )
    );
}

main().catch((error) => {
    console.error(
        error instanceof Error ? error.message : "Error desconocido"
    );
    console.error(`\n${usage()}`);
    process.exitCode = 1;
});
