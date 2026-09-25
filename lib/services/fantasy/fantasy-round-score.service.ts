import type { Player } from "@/domain/player/player.types";
import { ScoringSystemV1 } from "@/domain/scoring/scoring-v1.system";
import type { MatchWithStats } from "@/lib/scraper/fetch-competition-statistics";
import type { PlayerStats } from "@/lib/scraper/fetch-match-statistics";
import { mapScrapedMatch } from "@/lib/domain/map-scraped-match";

export interface FantasyRoundPlayerScore {
    playerId: string;
    score: number;
    breakdown: {
        [key: string]: number;
    };
    matchesPlayed: number;
    scoringVersion: string;
}

function normalize(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
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
 * Calcula la puntuación de los jugadores de una jornada con ScoringSystemV1.
 * La persistencia histórica debe guardar también scoringVersion.
 */
export function calculateFantasyRoundScores(
    matches: MatchWithStats[],
    players: Player[],
    teamNameById: Map<string, string>
): FantasyRoundPlayerScore[] {
    const scores = new Map<string, FantasyRoundPlayerScore>();
    const scoringSystem = new ScoringSystemV1();

    for (const result of matches) {
        const teamNames = [result.match.homeTeam, result.match.awayTeam];
        const mapped = mapScrapedMatch(result.match, result.stats);

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

                const mappedTeam = mapped.teams[teamIndex];
                const mappedPlayer = mappedTeam?.players.find(
                    (candidate) => candidate.dorsal === playerStats.number
                );
                const mappedStats = mapped.playerStats.find(
                    (candidate) =>
                        candidate.teamId === mappedTeam?.team.id &&
                        candidate.playerId === mappedPlayer?.id
                );

                if (!mappedStats) {
                    continue;
                }

                const score = scoringSystem.calculate(
                    { ...mappedStats, position: player.position },
                    mapped.match
                );
                const current = scores.get(player.id) ?? {
                    playerId: player.id,
                    score: 0,
                    breakdown: {},
                    matchesPlayed: 0,
                    scoringVersion: scoringSystem.version,
                };

                current.score += score.totalScore;
                Object.entries(score.breakdown).forEach(([key, value]) => {
                    current.breakdown[key] =
                        (current.breakdown[key] ?? 0) + value;
                });
                current.matchesPlayed += 1;
                scores.set(player.id, current);
            }
        });
    }

    return [...scores.values()];
}
