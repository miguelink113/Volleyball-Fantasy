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
        pointsTotal: toNumber(stats.points.total),
        pointsBp: toNumber(stats.points.bp),
        pointsWonLost: toNumber(stats.points.wonLost),
        serveTotal: toNumber(stats.serve.total),
        serveErrors: toNumber(stats.serve.errors),
        serveDirectPoints: toNumber(stats.serve.directPoints),
        receptionTotal: toNumber(stats.reception.total),
        receptionErrors: toNumber(stats.reception.errors),
        receptionPositivePercentage: toNumber(stats.reception.positivePercentage),
        receptionExcellentPercentage: toNumber(stats.reception.excellentPercentage),
        attackTotal: toNumber(stats.attack.total),
        attackErrors: toNumber(stats.attack.errors),
        attackBlocks: toNumber(stats.attack.blocks),
        attackExcellent: toNumber(stats.attack.excellent),
        attackExcellentPercentage: toNumber(stats.attack.excellentPercentage),
        blockPoints: toNumber(stats.block.points),
    };
}

export function mapScrapedMatch(
    scrapedMatch: ScrapedMatch,
    scrapedStats: MatchStats
): MappedMatch {
    const competition: Competition = {
        id: scrapedMatch.competitionId,
        name: `Competición ${scrapedMatch.competitionId}`,
    };
    const season: Season = {
        id: scrapedMatch.seasonId,
        name: `Temporada ${scrapedMatch.seasonId}`,
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
        const players = scrapedTeam.players.map((scrapedPlayer) => ({
            id: createStableId(
                "player",
                `${teamId}:${scrapedPlayer.number}:${scrapedPlayer.name}`
            ),
            name: scrapedPlayer.name,
        }));

        return {
            team: { id: teamId, name: teamName },
            players,
        };
    });

    const [homeTeam, awayTeam] = mappedTeams;
    const match: Match = {
        id: scrapedMatch.matchId,
        competitionId: competition.id,
        seasonId: season.id,
        round: scrapedMatch.round,
        homeTeamId: homeTeam.team.id,
        awayTeamId: awayTeam.team.id,
        homeScore: scrapedStats.homeScore ?? 0,
        awayScore: scrapedStats.awayScore ?? 0,
        sets: scrapedStats.sets.map((set, index) => ({
            setNumber: index + 1,
            homeScore: set.home,
            awayScore: set.away,
        })),
    };

    const playerStats = scrapedStats.teams.flatMap((scrapedTeam, teamIndex) => {
        const mappedTeam = mappedTeams[teamIndex];

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
