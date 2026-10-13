import type { SupabaseClient } from "@supabase/supabase-js";

export type TeamAliasSource = "roster" | "matches";

export interface TeamAliasResolverContext {
    competitionId: string;
    seasonId: string;
}

export interface RegisterAliasInput {
    teamId: string;
    source: TeamAliasSource;
    alias: string;
}

export interface TeamAliasIndex {
    exact: Map<string, string>;
    entries: Array<{ tokens: Set<string>; teamId: string }>;
}

/**
 * Stopwords que el scraper añade como ruido societario, patrocinio o
 * duplicación de género. Se eliminan antes de comparar. Solo entran aquí
 * tokens que NUNCA distinguen a dos equipos de una misma liga.
 */
const STOPWORDS = new Set([
    // forma societaria
    "club", "cv", "cdv", "vb", "voley", "volei", "voleibol", "volleyball",
    // artículos y conjunciones
    "de", "del", "la", "las", "los", "el", "y",
    // patrocinios y descriptores frecuentes
    "fundacion", "elite", "energy", "cox", "anaya", "avk",
]);

export function normalizeTeamAlias(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[''`´]/g, "")
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 0 && !STOPWORDS.has(token))
        .join(" ")
        .trim();
}

function tokensOf(normalized: string): Set<string> {
    return new Set(normalized.split(/\s+/).filter(Boolean));
}

function tokenMatches(a: string, b: string): boolean {
    if (a === b) return true;
    if (a.length < 3 || b.length < 3) return false;
    const [shorter, longer] =
        a.length <= b.length ? [a, b] : [b, a];
    return (
        longer.startsWith(shorter) &&
        longer.length - shorter.length <= 3
    );
}

function isTokenSubset(subset: Set<string>, superset: Set<string>): boolean {
    for (const t of subset) {
        let found = false;
        for (const u of superset) {
            if (tokenMatches(t, u)) {
                found = true;
                break;
            }
        }
        if (!found) return false;
    }
    return true;
}

export class TeamAliasResolver {
    constructor(private readonly supabase: SupabaseClient) {}

    async loadAliases(
        ctx: TeamAliasResolverContext
    ): Promise<Map<string, string>> {
        const { data, error } = await this.supabase
            .from("team_source_aliases")
            .select("normalized_alias, team_id")
            .eq("competition_id", ctx.competitionId)
            .eq("season_id", ctx.seasonId);

        if (error) throw error;

        const aliases = new Map<string, string>();
        for (const row of data ?? []) {
            aliases.set(row.normalized_alias, row.team_id);
        }
        return aliases;
    }

    async loadIndex(
        ctx: TeamAliasResolverContext
    ): Promise<TeamAliasIndex> {
        const { data, error } = await this.supabase
            .from("team_source_aliases")
            .select("normalized_alias, team_id")
            .eq("competition_id", ctx.competitionId)
            .eq("season_id", ctx.seasonId);

        if (error) throw error;

        const exact = new Map<string, string>();
        const entries: TeamAliasIndex["entries"] = [];
        for (const row of data ?? []) {
            exact.set(row.normalized_alias, row.team_id);
            entries.push({
                tokens: tokensOf(row.normalized_alias),
                teamId: row.team_id,
            });
        }
        return { exact, entries };
    }

    async registerAliases(
        ctx: TeamAliasResolverContext,
        entries: RegisterAliasInput[]
    ): Promise<number> {
        if (entries.length === 0) return 0;

        const deduped = new Map<
            string,
            {
                competition_id: string;
                season_id: string;
                team_id: string;
                source: TeamAliasSource;
                alias: string;
                normalized_alias: string;
            }
        >();

        for (const entry of entries) {
            const normalized = normalizeTeamAlias(entry.alias);
            if (!normalized) {
                throw new Error(
                    `registerAliases: alias vacío tras normalizar ("${entry.alias}")`
                );
            }
            if (deduped.has(normalized)) continue;

            deduped.set(normalized, {
                competition_id: ctx.competitionId,
                season_id: ctx.seasonId,
                team_id: entry.teamId,
                source: entry.source,
                alias: entry.alias.trim(),
                normalized_alias: normalized,
            });
        }

        const { error } = await this.supabase
            .from("team_source_aliases")
            .upsert([...deduped.values()], {
                onConflict: "season_id,normalized_alias",
            });

        if (error) throw error;
        return deduped.size;
    }

    /**
     * Resuelve un nombre de acta al team_id de Supabase.
     *
     * Estrategia:
     *   1. Match exacto contra `team_source_aliases` (lo registrado del
     *      roster y lo registrado manualmente).
     *   2. Si falla, comparación por subset de tokens contra el índice
     *      completo. Se exige que SOLO UN team_id coincida.
     */
    async resolveTeamId(
        ctx: TeamAliasResolverContext,
        rawName: string
    ): Promise<string | null> {
        const normalized = normalizeTeamAlias(rawName);
        if (!normalized) return null;

        const index = await this.loadIndex(ctx);
        return this.resolveFromIndex(index, normalized);
    }

    resolveFromIndex(
        index: TeamAliasIndex,
        normalized: string
    ): string | null {
        const exact = index.exact.get(normalized);
        if (exact) return exact;

        const inputTokens = tokensOf(normalized);
        if (inputTokens.size === 0) return null;

        const candidates: Array<{ teamId: string; size: number }> = [];
        for (const entry of index.entries) {
            if (
                isTokenSubset(inputTokens, entry.tokens) ||
                isTokenSubset(entry.tokens, inputTokens)
            ) {
                candidates.push({
                    teamId: entry.teamId,
                    size: entry.tokens.size,
                });
            }
        }

        if (candidates.length === 0) return null;
        if (candidates.length === 1) return candidates[0].teamId;

        // Con varios candidatos, gana el de menos tokens (nombre más
        // específico). Solo abortamos si hay empate en longitud.
        candidates.sort((a, b) => a.size - b.size);
        if (candidates[0].size === candidates[1].size) {
            return null;
        }
        return candidates[0].teamId;
    }

    async resolveMany(
        ctx: TeamAliasResolverContext,
        rawNames: string[]
    ): Promise<Map<string, string | null>> {
        const index = await this.loadIndex(ctx);
        const result = new Map<string, string | null>();
        for (const raw of rawNames) {
            const normalized = normalizeTeamAlias(raw);
            result.set(
                raw,
                normalized ? this.resolveFromIndex(index, normalized) : null
            );
        }
        return result;
    }
}
