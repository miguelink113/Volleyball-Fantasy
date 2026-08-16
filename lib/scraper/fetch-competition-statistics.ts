import {
    scrapeMatches,
    type Match,
} from "@/lib/scraper/fetch-matches";

import {
    scrapeMatch,
    type MatchStats,
} from "@/lib/scraper/fetch-match-statistics";

export interface MatchWithStats {
    match: Match;
    stats: MatchStats;
}

/**
 * Obtiene todos los partidos de una competición
 * junto con las estadísticas de cada partido.
 */
export async function scrapeCompetition(
    competitionId: number,
    seasonId: number,
    roundNumber?: number
): Promise<MatchWithStats[]> {
    // 1. Primero obtenemos la lista de partidos.
    const matches = await scrapeMatches(
        competitionId,
        seasonId,
        roundNumber
    );

    console.log(
        `Se han encontrado ${matches.length} partidos.`
    );

    const results: MatchWithStats[] = [];

    // 2. Recorremos todos los partidos.
    for (const match of matches) {
        console.log(
            `Obteniendo estadísticas del partido ${match.matchId}...`
        );

        // 3. Entramos en MatchStatistics.aspx
        const stats = await scrapeMatch(
            match.matchId,
            match.competitionId,
            match.categoryId,
            match.seasonId
        );

        // 4. Relacionamos el partido con sus estadísticas.
        results.push({
            match,
            stats,
        });
    }

    return results;
}