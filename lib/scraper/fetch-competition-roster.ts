import * as cheerio from "cheerio";
import type { Player, PlayerPosition } from "@/domain/player/player.types";
import type { Team } from "@/domain/team/team.types";

const RFEVB_BASE_URL = "https://rfevb-web.dataproject.com";
const COMPETITION_TEAM_SEARCH_URL =
    `${RFEVB_BASE_URL}/CompetitionTeamSearch.aspx`;
const COMPETITION_PLAYER_SEARCH_URL =
    `${RFEVB_BASE_URL}/CompetitionPlayerSearch.aspx`;
const COMPETITION_TEAM_DETAILS_URL =
    `${RFEVB_BASE_URL}/CompetitionTeamDetails.aspx`;

export interface ScrapedCompetitionTeam extends Team {
    competitionId: string;
    detailsUrl: string;
}

export interface ScrapedCompetitionPlayer extends Player {
    competitionId: string;
    teamRfevbId: string;
    detailsUrl: string;
}

export interface CompetitionRoster {
    competitionId: string;
    teams: ScrapedCompetitionTeam[];
    players: ScrapedCompetitionPlayer[];
}

export class CompetitionRosterScraperError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CompetitionRosterScraperError";
    }
}

function getDomainId(prefix: string, rfevbId: string): string {
    return `rfevb:${prefix}:${rfevbId}`;
}

function normalizeText(value: string | undefined): string {
    return (value ?? "").replace(/\s+/g, " ").trim();
}

function getDetailsUrl(
    path: "CompetitionTeamDetails.aspx" | "PlayerDetails.aspx",
    params: Record<string, string>
): string {
    const searchParams = new URLSearchParams(params);
    return `${RFEVB_BASE_URL}/${path}?${searchParams.toString()}`;
}

async function fetchHtml(url: string): Promise<string> {
    let response: Response;

    try {
        response = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            cache: "no-store",
            signal: AbortSignal.timeout(10_000),
        });
    } catch (error) {
        throw new CompetitionRosterScraperError(
            `No se pudo conectar con la web: ${
                error instanceof Error ? error.message : "error desconocido"
            }`
        );
    }

    if (!response.ok) {
        throw new CompetitionRosterScraperError(
            `La web respondió con HTTP ${response.status}`
        );
    }

    const html = await response.text();

    if (!html.trim()) {
        throw new CompetitionRosterScraperError("La web devolvió un HTML vacío.");
    }

    return html;
}

function parseQueryParameter(value: string, name: string): string | null {
    const match = value.match(
        new RegExp(`[?&]${name}=([^&'"]+)`, "i")
    );

    return match ? decodeURIComponent(match[1]) : null;
}

function mapPosition(value: string): PlayerPosition {
    const position = normalizeText(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (position.includes("liber")) {
        return "libero";
    }

    if (position.includes("middle") || position.includes("central")) {
        return "middle";
    }

    if (position.includes("opuesto") || position.includes("opposite")) {
        return "opposite";
    }

    if (
        position.includes("coloc") ||
        position.includes("setter") ||
        position.includes("armador")
    ) {
        return "setter";
    }

    return "outside";
}

function splitDisplayName(displayName: string): {
    firstName: string;
    lastName: string;
} {
    const tokens = displayName.split(" ").filter(Boolean);

    if (tokens.length <= 1) {
        return {
            firstName: tokens[0] ?? "",
            lastName: "",
        };
    }

    return {
        firstName: tokens[tokens.length - 1],
        lastName: tokens.slice(0, -1).join(" "),
    };
}

function createPlayer(
    competitionId: string,
    teamRfevbId: string,
    playerRfevbId: string,
    displayName: string,
    position: string,
    dorsal: number | undefined,
    photoUrl: string | undefined
): ScrapedCompetitionPlayer {
    const names = splitDisplayName(displayName);

    return {
        id: getDomainId("player", playerRfevbId),
        rfevbId: playerRfevbId,
        firstName: names.firstName,
        lastName: names.lastName,
        displayName,
        position: mapPosition(position),
        currentTeamId: getDomainId("team", teamRfevbId),
        ...(dorsal === undefined ? {} : { dorsal }),
        ...(photoUrl ? { photoUrl } : {}),
        competitionId,
        teamRfevbId,
        detailsUrl: getDetailsUrl("PlayerDetails.aspx", {
            TeamID: teamRfevbId,
            PlayerID: playerRfevbId,
            ID: competitionId,
        }),
    };
}

function extractDorsal(value: string): number | undefined {
    const normalized = normalizeText(value);

    if (!normalized) {
        return undefined;
    }

    const dorsal = Number(normalized);
    return Number.isInteger(dorsal) ? dorsal : undefined;
}

function extractTeams(
    html: string,
    competitionId: string
): ScrapedCompetitionTeam[] {
    const $ = cheerio.load(html);
    const teams: ScrapedCompetitionTeam[] = [];
    const seen = new Set<string>();

    $("input[id*='TeamListView'][id$='_HF_TeamID']").each((_, input) => {
        const teamRfevbId = normalizeText($(input).attr("value"));
        const container = $(input).nextAll(".rlvI").first();
        const name = normalizeText(container.find("h4").first().text());
        const logoUrl = container.find("img").first().attr("src");

        if (!teamRfevbId || !name || seen.has(teamRfevbId)) {
            return;
        }

        seen.add(teamRfevbId);
        teams.push({
            id: getDomainId("team", teamRfevbId),
            rfevbId: teamRfevbId,
            name,
            ...(logoUrl ? { logoUrl } : {}),
            competitionId,
            detailsUrl: getDetailsUrl("CompetitionTeamDetails.aspx", {
                TeamID: teamRfevbId,
                ID: competitionId,
            }),
        });
    });

    return teams;
}

function extractPlayers(
    html: string,
    competitionId: string
): ScrapedCompetitionPlayer[] {
    const $ = cheerio.load(html);
    const players: ScrapedCompetitionPlayer[] = [];
    const seen = new Set<string>();

    $("[id*='PlayersListView'][id*='PlayerRow'][onclick]").each((_, row) => {
        const onclick = $(row).attr("onclick") ?? "";
        const playerRfevbId = parseQueryParameter(onclick, "PlayerID");
        const teamRfevbId = parseQueryParameter(onclick, "TeamID");
        const displayName = normalizeText(
            $(row).find("div.t-col-5 p").first().text()
        );
        const position = normalizeText(
            $(row).find("div.t-col-4 p").first().text()
        );
        const photoUrl = $(row)
            .find("input[id*='HF_Photo_Player']")
            .first()
            .attr("value");
        const dorsal = extractDorsal(
            $(row).find("[id$='_PlayerNumber']").first().text()
        );

        if (
            !playerRfevbId ||
            !teamRfevbId ||
            !displayName ||
            seen.has(playerRfevbId)
        ) {
            return;
        }

        seen.add(playerRfevbId);
        players.push(
            createPlayer(
                competitionId,
                teamRfevbId,
                playerRfevbId,
                displayName,
                position,
                dorsal,
                photoUrl
            )
        );
    });

    return players;
}

function extractPlayersFromTeamDetails(
    html: string,
    competitionId: string,
    teamRfevbId: string
): ScrapedCompetitionPlayer[] {
    const $ = cheerio.load(html);
    const players: ScrapedCompetitionPlayer[] = [];
    const seen = new Set<string>();

    $("[id*='PlayerListView'][id*='PlayerRow'][onclick]").each((_, row) => {
        const onclick = $(row).attr("onclick") ?? "";
        const playerRfevbId = parseQueryParameter(onclick, "PlayerID");
        const displayName = normalizeText(
            $(row).find("div.t-col-3.t-hidden-xs p").first().text()
        );
        const position = normalizeText(
            $(row)
                .find("div.t-col-3.t-hidden-xs.t-hidden-sm p")
                .first()
                .text()
        );
        const dorsal = extractDorsal(
            $(row).find(".DIV_PlayerNumber p").first().text()
        );
        const photoUrl = $(row).find("img.PlayerPhoto").first().attr("src");

        if (!playerRfevbId || !displayName || seen.has(playerRfevbId)) {
            return;
        }

        seen.add(playerRfevbId);
        players.push(
            createPlayer(
                competitionId,
                teamRfevbId,
                playerRfevbId,
                displayName,
                position,
                dorsal,
                photoUrl
            )
        );
    });

    return players;
}

export async function scrapeCompetitionTeams(
    competitionId: number
): Promise<ScrapedCompetitionTeam[]> {
    const competitionIdValue = String(competitionId);
    const url = `${COMPETITION_TEAM_SEARCH_URL}?ID=${competitionIdValue}`;
    const teams = extractTeams(await fetchHtml(url), competitionIdValue);

    console.log(`Equipos encontrados: ${teams.length}`);
    return teams;
}

export async function scrapeCompetitionPlayers(
    competitionId: number,
    competitionTeams?: ScrapedCompetitionTeam[]
): Promise<ScrapedCompetitionPlayer[]> {
    const competitionIdValue = String(competitionId);
    const searchUrl =
        `${COMPETITION_PLAYER_SEARCH_URL}?ID=${competitionIdValue}`;
    const searchPlayers = extractPlayers(
        await fetchHtml(searchUrl),
        competitionIdValue
    );
    const teams =
        competitionTeams ?? (await scrapeCompetitionTeams(competitionId));
    const teamPlayers = (
        await Promise.all(
            teams.map(async (team) => {
                const url =
                    `${COMPETITION_TEAM_DETAILS_URL}?TeamID=${team.rfevbId}` +
                    `&ID=${competitionIdValue}`;

                return extractPlayersFromTeamDetails(
                    await fetchHtml(url),
                    competitionIdValue,
                    team.rfevbId ?? ""
                );
            })
        )
    ).flat();

    const playersById = new Map(
        [...searchPlayers, ...teamPlayers].map((player) => [
            player.rfevbId,
            player,
        ])
    );
    const players = [...playersById.values()];

    console.log(`Jugadores encontrados: ${players.length}`);
    return players;
}

export async function scrapeCompetitionRoster(
    competitionId: number
): Promise<CompetitionRoster> {
    const teams = await scrapeCompetitionTeams(competitionId);
    const players = await scrapeCompetitionPlayers(competitionId, teams);

    return {
        competitionId: String(competitionId),
        teams,
        players,
    };
}
