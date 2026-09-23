import type { Player } from "@/domain/player/player.types";
import type { MatchWithStats } from "@/lib/scraper/fetch-competition-statistics";
import type { PlayerStats } from "@/lib/scraper/fetch-match-statistics";

export interface FantasyRoundPlayerScore {
    playerId: string;
    score: number;
    breakdown: {
        setsPlayed: number;
        wonLost: number;
    };
    matchesPlayed: number;
}

function normalize(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function getSetsPlayed(stats: PlayerStats): number {
    return Object.values(stats.startingFormation).filter(
        (position) => position !== null
    ).length;
}

function findPlayer(
    players: Player[],
    stats: PlayerStats
): Player | undefined {
    const byDorsal = players.find((player) => player.dorsal === stats.number);

    if (byDorsal) {
        return byDorsal;
    }

    const statsName = normalize(stats.name);
    return players.find((player) => normalize(player.displayName) === statsName);
}

function findTeamPlayers(
    players: Player[],
    teamName: string,
    teamNameById: Map<string, string>
): Player[] {
    const normalizedTeamName = normalize(teamName);
    if (!normalizedTeamName) {
        return [];
    }

    const teamIds = new Set(
        [...teamNameById.entries()]
            .filter(([, name]) => {
                const normalizedRosterName = normalize(name);
                return (
                    normalizedRosterName === normalizedTeamName ||
                    normalizedRosterName.includes(normalizedTeamName) ||
                    normalizedTeamName.includes(normalizedRosterName)
                );
            })
            .map(([teamId]) => teamId)
    );

    return players.filter(
        (player) =>
            player.currentTeamId && teamIds.has(player.currentTeamId)
    );
}

/**
 * Regla provisional de la demo:
 * puntos fantasy = sets con participación registrada + G-P.
 *
 * Los datos de RFEVB son agregados por partido. Por eso se suman todos los
 * partidos de la jornada y se marca la puntuación como provisional en la UI
 * hasta disponer de una fórmula versionada y persistida.
 */
export function calculateFantasyRoundScores(
    matches: MatchWithStats[],
    players: Player[],
    teamNameById: Map<string, string>
): FantasyRoundPlayerScore[] {
    const scores = new Map<string, FantasyRoundPlayerScore>();

    for (const result of matches) {
        const teamNames = [result.match.homeTeam, result.match.awayTeam];

        result.stats.teams.forEach((teamStats, teamIndex) => {
            const teamName = normalize(teamNames[teamIndex] ?? "");
            const candidatePlayers = findTeamPlayers(
                players,
                teamName,
                teamNameById
            );

            for (const playerStats of teamStats.players) {
                const player = findPlayer(candidatePlayers, playerStats);

                if (!player) {
                    continue;
                }

                const setsPlayed = getSetsPlayed(playerStats);
                const wonLost = playerStats.points.wonLost ?? 0;
                const current = scores.get(player.id) ?? {
                    playerId: player.id,
                    score: 0,
                    breakdown: {
                        setsPlayed: 0,
                        wonLost: 0,
                    },
                    matchesPlayed: 0,
                };

                current.score += setsPlayed + wonLost;
                current.breakdown.setsPlayed += setsPlayed;
                current.breakdown.wonLost += wonLost;
                current.matchesPlayed += 1;
                scores.set(player.id, current);
            }
        });
    }

    return [...scores.values()];
}
