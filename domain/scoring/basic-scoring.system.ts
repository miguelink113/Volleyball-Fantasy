import type { MatchPlayerStats } from "@/domain/match/match-player-stats.types";
import type { Match } from "@/domain/match/match.types";
import type {
    ScoringCalculationResult,
    ScoringSystem,
} from "@/domain/scoring/scoring.types";

/**
 * Sistema inicial: un punto por set jugado y el valor de G-P.
 *
 * Esta implementación histórica se mantiene únicamente por compatibilidad.
 * Los nuevos flujos deben utilizar ScoringSystemV1.
 */
export class BasicScoringSystem implements ScoringSystem {
    readonly version = "basic-v1";

    calculate(
        stats: MatchPlayerStats,
        _match: Match
    ): ScoringCalculationResult {
        const setsPlayedPoints = Math.max(0, stats.setsPlayed);
        const gpPoints = stats.wonLost;

        return {
            totalScore: setsPlayedPoints + gpPoints,
            breakdown: {
                setsPlayed: setsPlayedPoints,
                wonLost: gpPoints,
            },
            isProvisional: true,
        };
    }
}
