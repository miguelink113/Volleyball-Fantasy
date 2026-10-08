import type { ScrapedCompetitionPlayer } from "@/lib/scraper/fetch-competition-roster";
import type { PlayerPosition } from "@/domain/player/player.types";

export interface PlayerInsert {
    competition_id: string;
    season_id: string;
    team_id: string;
    rfevb_id: string;      // ← ya no admite null
    first_name: string;
    last_name: string;
    display_name: string;
    position: PlayerPosition;
    dorsal: number | null;
    active: boolean;
}

export interface PlayerMapperContext {
    competitionId: string;                          // UUID Supabase
    seasonId: string;                               // UUID Supabase
    teamIdByRfevbId: Map<string, string>;           // rfevb team id → UUID Supabase
}

export function mapPlayer(
    scraped: ScrapedCompetitionPlayer,
    ctx: PlayerMapperContext
): PlayerInsert {
    const displayName = scraped.displayName?.trim();
    if (!displayName) {
        throw new Error(
            `mapPlayer: player without displayName (rfevbId=${scraped.rfevbId ?? "?"})`
        );
    }

    const rfevbId = scraped.rfevbId?.trim();
    if (!rfevbId) {
        throw new Error(
            `mapPlayer: player without rfevbId (displayName=${displayName}). ` +
            `rfevbId is the natural key; refusing to insert a row without it.`
        );
    }

    const teamRfevbId = scraped.teamRfevbId?.trim();
    if (!teamRfevbId) {
        throw new Error(
            `mapPlayer: player without teamRfevbId (rfevbId=${rfevbId})`
        );
    }

    const teamId = ctx.teamIdByRfevbId.get(teamRfevbId);
    if (!teamId) {
        throw new Error(
            `mapPlayer: team not found for rfevbId=${teamRfevbId} ` +
            `(player rfevbId=${rfevbId}). ` +
            `Ingest teams before players.`
        );
    }

    const position: PlayerPosition = scraped.position ?? "unknown";
    const dorsal =
        typeof scraped.dorsal === "number" && scraped.dorsal > 0
            ? scraped.dorsal
            : null;

    return {
        competition_id: ctx.competitionId,
        season_id: ctx.seasonId,
        team_id: teamId,
        rfevb_id: rfevbId,   // ← ya no puede ser null ni cadena vacía
        first_name: scraped.firstName?.trim() || "",
        last_name: scraped.lastName?.trim() || "",
        display_name: displayName,
        position,
        dorsal,
        active: true,
    };
}