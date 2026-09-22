import type { PlayerPosition } from "@/domain/player/player.types";

export interface FantasyDemoPlayer {
    id: string;
    name: string;
    club: string;
    position: PlayerPosition;
    price: number;
    season: string;
    weeklyScores: Partial<Record<number, number>>;
}

export interface LineupValidationResult {
    valid: boolean;
    counts: Record<PlayerPosition, number>;
    missing: string[];
    errors: string[];
}

const MAX_TEAM_SIZE = 14;
const LINEUP_SIZE = 7;

export function validateRosterSize(playerIds: string[]) {
    if (playerIds.length > MAX_TEAM_SIZE) {
        return {
            valid: false,
            errors: [`La plantilla no puede superar los ${MAX_TEAM_SIZE} jugadores.`],
        };
    }

    return {
        valid: true,
        errors: [],
    };
}

export function getPlayerMap(players: FantasyDemoPlayer[]) {
    return new Map(players.map((player) => [player.id, player]));
}

export function validateLineup(
    lineupPlayerIds: string[],
    players: FantasyDemoPlayer[]
): LineupValidationResult {
    const playerMap = getPlayerMap(players);
    const counts: Record<PlayerPosition, number> = {
        setter: 0,
        libero: 0,
        opposite: 0,
        middle: 0,
        outside: 0,
    };

    const missing: string[] = [];
    const errors: string[] = [];

    lineupPlayerIds.forEach((playerId) => {
        const player = playerMap.get(playerId);

        if (!player) {
            missing.push(playerId);
            return;
        }

        counts[player.position] += 1;
    });

    if (lineupPlayerIds.length !== LINEUP_SIZE) {
        errors.push(`La alineación debe tener exactamente ${LINEUP_SIZE} jugadores.`);
    }

    Object.entries(counts).forEach(([position, total]) => {
        const required =
            position === "setter"
                ? 1
                : position === "libero"
                    ? 1
                    : position === "opposite"
                        ? 1
                        : position === "middle"
                            ? 2
                            : 2;

        if (total > required) {
            errors.push(
                `La posición ${position} tiene demasiados jugadores: ${total} de ${required}.`
            );
        }

        if (total < required) {
            errors.push(
                `Falta ${required - total} jugador(es) en ${position}.`
            );
        }
    });

    return {
        valid: errors.length === 0 && missing.length === 0,
        counts,
        missing,
        errors,
    };
}

export function getLineupSummary(
    lineupPlayerIds: string[],
    players: FantasyDemoPlayer[]
) {
    return validateLineup(lineupPlayerIds, players);
}

export function calculateLineupScoreForRound(
    lineupPlayerIds: string[],
    round: number,
    players: FantasyDemoPlayer[]
) {
    const playerMap = getPlayerMap(players);

    return lineupPlayerIds.reduce((total, playerId) => {
        const player = playerMap.get(playerId);
        const score = player?.weeklyScores[round as keyof typeof player.weeklyScores] ?? 0;
        return total + score;
    }, 0);
}
