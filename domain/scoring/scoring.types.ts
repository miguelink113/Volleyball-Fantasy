import type { Player } from "@/domain/player/player.types";
import type { MatchPlayerStats } from "@/domain/match/match-player-stats.types";

export interface PlayerMatchPerformance {
    player: Player;
    stats: MatchPlayerStats;
    teamName: string;
    setsPlayed: number;
}

export interface PlayerScore {
    playerId: string;
    playerName: string;
    teamId: string;
    teamName: string;
    setsPlayedPoints: number;
    gpPoints: number;
    total: number;
}

export interface ScoringSystem {
    score(performance: PlayerMatchPerformance): PlayerScore;
}
