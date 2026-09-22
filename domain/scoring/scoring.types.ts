import { MatchPlayerStats } from '../match/match-player-stats.types';
import { Match } from '../match/match.types';

export interface ScoringCalculationResult {
    totalScore: number;
    breakdown: Record<string, number>;
    isProvisional: boolean;
}

export interface ScoringSystem {
    version: string;
    calculate(stats: MatchPlayerStats, match: Match): ScoringCalculationResult;
}

export interface PlayerRoundScore {
    id: string;
    playerId: string;
    seasonId: string;
    roundNumber: number;
    score: number;
    breakdown: Record<string, number>;
    scoringVersion: string;
    isProvisional: boolean;
    calculatedAt: Date;
}