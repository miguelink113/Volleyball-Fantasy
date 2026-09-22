export interface TeamPlayerHistory {
    id: string;
    playerId: string;
    teamId: string;
    seasonId: string;
    dorsal: number;
    startDate: Date;
    endDate?: Date;
}