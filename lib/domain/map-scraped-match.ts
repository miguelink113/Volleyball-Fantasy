import type { Competition } from "@/domain/competition/competition.types";
import type { Match } from "@/domain/match/match.types";
import type { MatchPlayerStats } from "@/domain/match/match-player-stats.types";
import type { Player } from "@/domain/player/player.types";
import type { Season } from "@/domain/season/season.types";
import type { Team } from "@/domain/team/team.types";
import type { Match as ScrapedMatch } from "@/lib/scraper/fetch-matches";
import type {
    MatchStats,
    PlayerStats,
} from "@/lib/scraper/fetch-match-statistics";

export interface MappedTeam {
    team: Team;
    players: Player[];
}

export interface MappedMatch {
    competition: Competition;
    season: Season;
    match: Match;
    teams: MappedTeam[];
    playerStats: MatchPlayerStats[];
}

function createStableId(prefix: string, value: string): string {
    return `${prefix}:${value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`;
}

function toNumber(value: number | null): number {
    return value ?? 0;
}

function splitDisplayName(displayName: string): {
    firstName: string;
    lastName: string;
} {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);

    return {
        firstName: parts[0] ?? "",
        lastName: parts.slice(1).join(" "),
    };
}

function getSetsPlayed(stats: PlayerStats): number {
    return Object.values(stats.startingFormation).filter(
        (position) => position !== null
    ).length;
}

function mapPlayerStats(
    matchId: string,
    teamId: string,
    player: Player,
    stats: PlayerStats
): MatchPlayerStats {
    return {
        id: createStableId("match-player", `${matchId}:${teamId}:${stats.number}`),
        matchId,
        playerId: player.id,
        teamId,
        position: player.position,
        setsPlayed: getSetsPlayed(stats),
        pointsTotal: toNumber(stats.points.total),
        pointsBreakout: toNumber(stats.points.bp),
        wonLost: toNumber(stats.points.wonLost),
        serveTotal: toNumber(stats.serve.total),
        serveErrors: toNumber(stats.serve.errors),
        serveAces: toNumber(stats.serve.directPoints),
        receptionTotal: toNumber(stats.reception.total),
        receptionErrors: toNumber(stats.reception.errors),
        receptionPositive: toNumber(stats.reception.positivePercentage),
        receptionExcellent: toNumber(stats.reception.excellentPercentage),
        attackTotal: toNumber(stats.attack.total),
        attackErrors: toNumber(stats.attack.errors),
        attackBlocked: toNumber(stats.attack.blocks),
        attackPoints: toNumber(stats.attack.excellent),
        attackExcellentPercentage: toNumber(
            stats.attack.excellentPercentage
        ),
        blockPoints: toNumber(stats.block.points),
    };
}

export function mapScrapedMatch(
    scrapedMatch: ScrapedMatch,
    scrapedStats: MatchStats
): MappedMatch {
    const competition: Competition = {
        id: scrapedMatch.competitionId,
        rfevbId: scrapedMatch.competitionId,
        name: `Competición ${scrapedMatch.competitionId}`,
    };
    const season: Season = {
        id: scrapedMatch.seasonId,
        rfevbId: scrapedMatch.seasonId,
        competitionId: competition.id,
        name: `Temporada ${scrapedMatch.seasonId}`,
        isCurrent: false,
    };

    const mappedTeams = scrapedStats.teams.map((scrapedTeam, index) => {
        const matchTeamName =
            index === 0
                ? scrapedMatch.homeTeam
                : scrapedMatch.awayTeam;
        const teamName =
            matchTeamName && matchTeamName !== "Desconocido"
                ? matchTeamName
                : scrapedTeam.name;
        const teamId = createStableId("team", teamName);
        const players = scrapedTeam.players.map((scrapedPlayer) => {
            const displayName = scrapedPlayer.name.trim();
            const names = splitDisplayName(displayName);

            return {
                id: createStableId(
                "player",
                `${teamId}:${scrapedPlayer.number}:${scrapedPlayer.name}`
            ),
                firstName: names.firstName,
                lastName: names.lastName,
                displayName,
                position: "unknown" as const,
                currentTeamId: teamId,
                dorsal: scrapedPlayer.number,
            };
        });

        return {
            team: { id: teamId, name: teamName },
            players,
        };
    });

    if (mappedTeams.length !== 2) {
        throw new Error(
            `Se esperaban dos equipos en las estadísticas y se encontraron ${mappedTeams.length}.`
        );
    }

    const [homeTeam, awayTeam] = mappedTeams;
    const match: Match = {
        id: scrapedMatch.matchId,
        rfevbMatchId: scrapedMatch.matchId,
        competitionId: competition.id,
        seasonId: season.id,
        roundNumber: scrapedMatch.round,
        homeTeamId: homeTeam.team.id,
        awayTeamId: awayTeam.team.id,
        homeSets: scrapedStats.homeScore ?? 0,
        awaySets: scrapedStats.awayScore ?? 0,
        status: "COMPLETED",
        sets: scrapedStats.sets.map((set, index) => ({
            setNumber: index + 1,
            homeScore: set.home,
            awayScore: set.away,
        })),
    };

    const playerStats = scrapedStats.teams.flatMap((scrapedTeam, teamIndex) => {
        const mappedTeam = mappedTeams[teamIndex];

        if (!mappedTeam) {
            throw new Error(
                `No se encontró el equipo mapeado para el índice ${teamIndex}.`
            );
        }

        return scrapedTeam.players.map((scrapedPlayer, playerIndex) =>
            mapPlayerStats(
                match.id,
                mappedTeam.team.id,
                mappedTeam.players[playerIndex],
                scrapedPlayer
            )
        );
    });

    return {
        competition,
        season,
        match,
        teams: mappedTeams,
        playerStats,
    };
}
