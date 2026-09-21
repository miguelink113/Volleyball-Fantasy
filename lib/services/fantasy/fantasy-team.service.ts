import { PlayerPosition } from "@/domain/player/player.types";
import type {
    FantasyPlayer,
    FantasyTeam,
    LineupValidationResult,
} from "@/domain/fantasy/fantasy.types";

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

export function getPlayerMap(players: FantasyPlayer[]) {
    return new Map(players.map((player) => [player.id, player]));
}

export function validateLineup(
    lineupPlayerIds: string[],
    players: FantasyPlayer[]
): LineupValidationResult {
    const playerMap = getPlayerMap(players);
    const counts: Record<PlayerPosition, number> = {
        [PlayerPosition.Setter]: 0,
        [PlayerPosition.Libero]: 0,
        [PlayerPosition.Opposite]: 0,
        [PlayerPosition.MiddleBlocker]: 0,
        [PlayerPosition.OutsideHitter]: 0,
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
            position === PlayerPosition.Setter
                ? 1
                : position === PlayerPosition.Libero
                    ? 1
                    : position === PlayerPosition.Opposite
                        ? 1
                        : position === PlayerPosition.MiddleBlocker
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
    players: FantasyPlayer[]
) {
    return validateLineup(lineupPlayerIds, players);
}

export function calculateLineupScoreForRound(
    lineupPlayerIds: string[],
    round: number,
    players: FantasyPlayer[]
) {
    const playerMap = getPlayerMap(players);

    return lineupPlayerIds.reduce((total, playerId) => {
        const player = playerMap.get(playerId);
        const score = player?.weeklyScores[round as keyof typeof player.weeklyScores] ?? 0;
        return total + score;
    }, 0);
}

export function createInitialFantasyTeam(): FantasyTeam {
    return {
        id: "team-demo",
        name: "Mi equipo",
        season: "25-26",
        selectedPlayerIds: [],
        lineupPlayerIds: [],
    };
}

export function addPlayerToTeam(team: FantasyTeam, playerId: string) {
    if (team.selectedPlayerIds.includes(playerId)) {
        return team;
    }

    return {
        ...team,
        selectedPlayerIds: [...team.selectedPlayerIds, playerId],
    };
}

export function removePlayerFromTeam(team: FantasyTeam, playerId: string) {
    const nextSelected = team.selectedPlayerIds.filter((id) => id !== playerId);
    const nextLineup = team.lineupPlayerIds.filter((id) => id !== playerId);

    return {
        ...team,
        selectedPlayerIds: nextSelected,
        lineupPlayerIds: nextLineup,
    };
}

export function toggleLineupPlayer(team: FantasyTeam, playerId: string) {
    if (team.lineupPlayerIds.includes(playerId)) {
        return {
            ...team,
            lineupPlayerIds: team.lineupPlayerIds.filter((id) => id !== playerId),
        };
    }

    if (team.lineupPlayerIds.length >= LINEUP_SIZE) {
        return team;
    }

    return {
        ...team,
        lineupPlayerIds: [...team.lineupPlayerIds, playerId],
    };
}

export function getTransferablePlayers(players: FantasyPlayer[], team: FantasyTeam) {
    return players.filter((player) => !team.selectedPlayerIds.includes(player.id));
}
