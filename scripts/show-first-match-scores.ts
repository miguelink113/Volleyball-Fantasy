import { BasicScoringSystem } from "@/domain/scoring/basic-scoring.system";
import type { PlayerMatchPerformance } from "@/domain/scoring/scoring.types";
import { mapScrapedMatch } from "@/lib/domain/map-scraped-match";
import type { Match } from "@/lib/scraper/fetch-matches";
import type { MatchStats } from "@/lib/scraper/fetch-match-statistics";

const baseUrl = process.env.FANTASY_API_URL ?? "http://localhost:3000";
const competitionId = "152";
const seasonId = "186";
const round = "1";

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
    console.log("[1/7] Buscando los partidos de la jornada 1...");
    const matchesResponse = await getJson<MatchesResponse>(
        `${baseUrl}/api/matches?competition=${competitionId}&season=${seasonId}&round=${round}`
    );

    if (!matchesResponse.success || !matchesResponse.matches?.length) {
        throw new Error(
            matchesResponse.error ??
            "No se encontró ningún partido en la jornada 1."
        );
    }

    const scrapedMatch = matchesResponse.matches[0];
    console.log(
        `[2/7] Se encontraron ${matchesResponse.matches.length} partidos. ` +
        `Seleccionado el primero: ${scrapedMatch.matchId}.`
    );
    console.log(
        `[3/7] Partido: ${scrapedMatch.homeTeam} (anfitrión) - ` +
        `${scrapedMatch.awayTeam} (visitante).`
    );

    console.log("[4/7] Obteniendo las estadísticas del partido...");
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
        `[5/7] Estadísticas recibidas para ${statsResponse.match.teams.length} equipos: ` +
        `${statsResponse.match.teams.map((team) => team.name).join(" | ")}.`
    );
    const mapped = mapScrapedMatch(scrapedMatch, statsResponse.match);
    console.log(
        `[6/7] Datos conectados al dominio: ${mapped.playerStats.length} jugadores, ` +
        `${mapped.match.sets.length} sets y equipos ` +
        `${mapped.teams.map((team) => team.team.name).join(" | ")}.`
    );

    const scoringSystem = new BasicScoringSystem();
    const setsPlayed = mapped.match.sets.length;
    const scores = mapped.playerStats.map((stats) => {
        const mappedTeam = mapped.teams.find(
            (team) => team.team.id === stats.teamId
        );
        const player = mappedTeam?.players.find(
            (candidate) => candidate.id === stats.playerId
        );

        if (!player || !mappedTeam) {
            throw new Error(`No se encontró el jugador ${stats.playerId}.`);
        }

        const performance: PlayerMatchPerformance = {
            player,
            stats,
            teamName: mappedTeam.team.name,
            setsPlayed,
        };

        return scoringSystem.score(performance);
    }).sort((left, right) => right.total - left.total);

    console.log(`[7/7] Puntuaciones calculadas con BasicScoringSystem.`);
    console.table(scores);
}

main().catch((error) => {
    console.error(
        error instanceof Error ? error.message : "Error desconocido"
    );
    process.exitCode = 1;
});
