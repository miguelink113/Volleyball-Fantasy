import type { MatchPlayerStats } from "@/domain/match/match-player-stats.types";
import type { Match } from "@/domain/match/match.types";
import type {
    ScoringCalculationResult,
    ScoringSystem,
} from "@/domain/scoring/scoring.types";

export const SCORING_SYSTEM_V1_VERSION = "v1";

function nonNegative(value: number): number {
    return Math.max(0, value);
}

function clampPercentage(value: number): number {
    return Math.min(100, Math.max(0, value));
}

function limitNegativeScore(value: number): number {
    return Math.max(-3, value);
}

function roundInteger(value: number): number {
    return Math.round(value);
}

function applyPositionMultiplier(
    value: number,
    multiplier: number
): number {
    return roundInteger(value * multiplier);
}

function calculateMatchResult(
    stats: MatchPlayerStats,
    match: Match
): number {
    if (match.status !== "COMPLETED") {
        return 0;
    }

    if (stats.teamId === match.homeTeamId) {
        return match.homeSets - match.awaySets;
    }

    if (stats.teamId === match.awayTeamId) {
        return match.awaySets - match.homeSets;
    }

    return 0;
}

function calculateReception(stats: MatchPlayerStats): number {
    if (stats.receptionTotal <= 0) {
        return 0;
    }

    const receptionTotal = nonNegative(stats.receptionTotal);

    const positiveReceptions =
        receptionTotal *
        clampPercentage(stats.receptionPositive) /
        100;

    const excellentReceptions =
        receptionTotal *
        clampPercentage(stats.receptionExcellent) /
        100;

    const receptionScore =
        receptionTotal * 0.25 +
        positiveReceptions * 0.25 +
        excellentReceptions * 0.50 -
        nonNegative(stats.receptionErrors);

    const positionMultiplier =
        stats.position === "libero"
            ? 1.25
            : 1;

    return roundInteger(
        Math.max(0, receptionScore) * positionMultiplier
    );
}

function calculateParticipation(stats: MatchPlayerStats): number {
    return nonNegative(stats.setsPlayed);
}

function calculateSetterAttackBonus(stats: MatchPlayerStats): number {
    if (stats.position !== "setter") {
        return 0;
    }

    return roundInteger(
        clampPercentage(stats.attackExcellentPercentage) / 10
    );
}

function calculateServe(stats: MatchPlayerStats): number {
    if (stats.setsPlayed <= 0) {
        return 0;
    }

    const netServes =
        nonNegative(stats.serveTotal) -
        nonNegative(stats.serveErrors) +
        nonNegative(stats.serveAces) * 2;

    return roundInteger(Math.max(0, netServes) / stats.setsPlayed);
}

/**
 * Scoring V1 utiliza únicamente acciones disponibles en las estadísticas RFEVB.
 *
 * Todos los componentes son enteros. Los errores se integran en la categoría
 * que representan y no se restan como una penalización global independiente.
 */
export class ScoringSystemV1 implements ScoringSystem {
    readonly version = SCORING_SYSTEM_V1_VERSION;

    calculate(
        stats: MatchPlayerStats,
        match: Match
    ): ScoringCalculationResult {
        const participation = calculateParticipation(stats);
        const netServe = calculateServe(stats);
        const netAttack = limitNegativeScore(
            nonNegative(stats.attackPoints) -
            nonNegative(stats.attackErrors) -
            nonNegative(stats.attackBlocked)
        );
        const setterAttackBonus = calculateSetterAttackBonus(stats);
        const blocksBase = nonNegative(stats.blockPoints) * 2;
        const blocks =
            stats.position === "middle"
                ? applyPositionMultiplier(blocksBase, 1.5)
                : blocksBase;
        const reception = calculateReception(stats);
        const matchResult = calculateMatchResult(stats, match);

        return {
            totalScore:
                participation +
                netServe +
                netAttack +
                setterAttackBonus +
                blocks +
                reception +
                matchResult,
            breakdown: {
                participation,
                serve: netServe,
                attack: netAttack,
                setterAttackBonus,
                blocks,
                reception,
                matchResult,
            },
            isProvisional: false,
        };
    }
}
