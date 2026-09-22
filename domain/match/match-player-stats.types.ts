export interface MatchPlayerStats {
    id?: string;
    matchId: string;
    playerId: string;
    teamId: string;
    setsPlayed: number;

    // Puntos directos y balance
    pointsTotal: number;
    pointsBreakout: number; // BP
    wonLost: number;        // G-P

    // Saque
    serveTotal: number;
    serveErrors: number;
    serveAces: number;

    // Recepción
    receptionTotal: number;
    receptionErrors: number;
    receptionPositive: number;
    receptionExcellent: number;

    // Ataque
    attackTotal: number;
    attackErrors: number;
    attackBlocked: number;
    attackPoints: number;

    // Bloqueo
    blockPoints: number;

    // Copia íntegra de la extracción para auditoría/depuración
    rawJson?: Record<string, unknown>;
}