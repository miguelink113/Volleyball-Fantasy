import { PlayerPosition } from "@/domain/player/player.types";

export type FantasyRound = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface FantasyPlayer {
    id: string;
    name: string;
    club: string;
    position: PlayerPosition;
    price: number;
    season: string;
    weeklyScores: Partial<Record<FantasyRound, number>>;
}

export interface FantasyTeam {
    id: string;
    name: string;
    season: string;
    selectedPlayerIds: string[];
    lineupPlayerIds: string[];
}

export interface LineupValidationResult {
    valid: boolean;
    counts: Record<PlayerPosition, number>;
    missing: string[];
    errors: string[];
}

export const LINEUP_REQUIREMENTS: Record<PlayerPosition, number> = {
    [PlayerPosition.Setter]: 1,
    [PlayerPosition.Libero]: 1,
    [PlayerPosition.Opposite]: 1,
    [PlayerPosition.MiddleBlocker]: 2,
    [PlayerPosition.OutsideHitter]: 2,
};
