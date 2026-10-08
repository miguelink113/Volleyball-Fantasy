import type { ScrapedCompetitionTeam } from "@/lib/scraper/fetch-competition-roster";

export interface TeamInsert {
    competition_id: string;
    season_id: string;
    rfevb_id: string;      // ← ya no admite null
    name: string;
    active: boolean;
}

export interface TeamMapperContext {
    competitionId: string; // UUID de Supabase
    seasonId: string;      // UUID de Supabase
}

export function mapTeam(
    scraped: ScrapedCompetitionTeam,
    ctx: TeamMapperContext
): TeamInsert {
    const name = scraped.name?.trim();
    if (!name) {
        throw new Error(
            `mapTeam: team without name (rfevbId=${scraped.rfevbId ?? "?"})`
        );
    }

    const rfevbId = scraped.rfevbId?.trim();
    if (!rfevbId) {
        throw new Error(
            `mapTeam: team without rfevbId (name=${name}). ` +
            `rfevbId is the natural key; refusing to insert a row without it.`
        );
    }

    return {
        competition_id: ctx.competitionId,
        season_id: ctx.seasonId,
        rfevb_id: rfevbId,   // ← ya no puede ser null ni cadena vacía
        name,
        active: true,
    };
}