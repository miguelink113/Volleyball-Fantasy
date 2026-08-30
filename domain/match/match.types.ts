export interface Match {
    id: string;
    competitionId: string;
    seasonId: string;
    round: number;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
    sets: Match[];
}