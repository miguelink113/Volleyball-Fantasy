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

export interface DailyFantasyRoster {
    players: FantasyDemoPlayer[];
    initialTeamIds: string[];
    initialLineupIds: string[];
}

export interface LineupValidationResult {
    valid: boolean;
    counts: Record<PlayerPosition, number>;
    missing: string[];
    errors: string[];
}

const MAX_TEAM_SIZE = 14;
const LINEUP_SIZE = 7;
const DAILY_MARKET_SIZE = 30;

function hashSeed(value: string): number {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

function seededShuffle<T>(values: T[], seed: string): T[] {
    return values
        .map((value, index) => ({
            value,
            sortKey: hashSeed(`${seed}:${index}:${String(value)}`),
        }))
        .sort((left, right) => left.sortKey - right.sortKey)
        .map(({ value }) => value);
}

function getRequiredPositionIds(
    players: FantasyDemoPlayer[],
    seed: string
): string[] {
    const requiredPositions: PlayerPosition[] = [
        "setter",
        "libero",
        "opposite",
        "middle",
        "middle",
        "outside",
        "outside",
    ];
    const selectedIds: string[] = [];

    requiredPositions.forEach((position, index) => {
        const candidate = seededShuffle(
            players.filter(
                (player) =>
                    player.position === position &&
                    !selectedIds.includes(player.id)
            ),
            `${seed}:required:${position}:${index}`
        )[0];

        if (candidate) {
            selectedIds.push(candidate.id);
        }
    });

    return selectedIds;
}

export function createDailyFantasyRoster(
    players: FantasyDemoPlayer[],
    dateKey = new Date().toISOString().split("T")[0]
): DailyFantasyRoster {
    const seededRandom = (seed: string) => {
        let hash = hashSeed(seed);
        return () => {
            hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
            hash = Math.imul(hash ^ (hash >>> 13), 3266482507);
            return ((hash ^= hash >>> 16) >>> 0) / 4294967296;
        };
    };

    const marketQuota: Record<Exclude<PlayerPosition, "unknown">, number> = {
        setter: 2,
        opposite: 2,
        outside: 4,
        middle: 4,
        libero: 2,
    };

    const marketPlayers = Object.entries(marketQuota).flatMap(
        ([position, count]) => {
            const random = seededRandom(`${dateKey}:${position}`);
            const shuffled = players
                .filter((player) => player.position === position)
                .map((player) => ({ player, sortKey: random() }))
                .sort((left, right) => left.sortKey - right.sortKey)
                .map(({ player }) => player);

            return shuffled.slice(0, count);
        }
    )
        .map((player) => ({
            ...player,
            price: player.price,
            weeklyScores: {},
        }));
    const initialLineupIds = getRequiredPositionIds(marketPlayers, dateKey);
    const initialTeamIds = [
        ...initialLineupIds,
        ...marketPlayers
            .filter((player) => !initialLineupIds.includes(player.id))
            .slice(0, MAX_TEAM_SIZE - initialLineupIds.length)
            .map((player) => player.id),
    ];

    return {
        players: marketPlayers,
        initialTeamIds,
        initialLineupIds,
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
        unknown: 0,
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
                            : position === "outside"
                                ? 2
                                : 0;

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
