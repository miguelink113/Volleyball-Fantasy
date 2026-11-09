export function getRoundLabel(roundNumber: number): string {
    if (roundNumber <= 22) return `Jornada ${roundNumber}`;
    if (roundNumber === 23) return "Cuartos";
    if (roundNumber === 24) return "Semis";
    if (roundNumber === 25) return "Final";
    return `Jornada ${roundNumber}`;
}
