import type { MatchSet } from "@/domain/match/match-set.types";

export interface Match {
    id: string;
    competitionId: string;
    seasonId: string;
    round: number;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
    sets: MatchSet[];
}