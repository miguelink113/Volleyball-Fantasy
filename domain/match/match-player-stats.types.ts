export interface MatchPlayerStats {
    id: string;
    matchId: string;
    playerId: string;
    teamId: string;
    pointsTotal: number;
    pointsBp: number;
    pointsWonLost: number;
    serveTotal: number;
    serveErrors: number;
    serveDirectPoints: number;
    receptionTotal: number;
    receptionErrors: number;
    receptionPositivePercentage: number;
    receptionExcellentPercentage: number;
    attackTotal: number;
    attackErrors: number;
    attackBlocks: number;
    attackExcellent: number;
    attackExcellentPercentage: number;
    blockPoints: number;
}