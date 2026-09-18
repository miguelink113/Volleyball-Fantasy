import type {
    PlayerMatchPerformance,
    PlayerScore,
    ScoringSystem,
} from "@/domain/scoring/scoring.types";

/**
 * Sistema inicial: un punto por set jugado y el valor de G-P.
 *
 * La interfaz permite sustituir esta implementación sin cambiar
 * el adaptador ni los consumidores de puntuaciones.
 */
export class BasicScoringSystem implements ScoringSystem {
    score(performance: PlayerMatchPerformance): PlayerScore {
        const setsPlayedPoints = Math.max(0, performance.setsPlayed);
        const gpPoints = performance.stats.pointsWonLost;

        return {
            playerId: performance.player.id,
            playerName: performance.player.name,
            teamId: performance.stats.teamId,
            teamName: performance.teamName,
            setsPlayedPoints,
            gpPoints,
            total: setsPlayedPoints + gpPoints,
        };
    }
}
