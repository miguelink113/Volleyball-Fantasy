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
    entries: Array<{ tokens: Set<string>; teamId: string; normalized: string }>;
}

/**
 * Stopwords que el scraper añade como ruido societario, patrocinio o
 * duplicación de género. Se eliminan antes de comparar. Solo entran aquí
 * tokens que NUNCA distinguen a dos equipos de una misma liga.
 */
const STOPWORDS = new Set([
    "club", "cv", "cdv", "vb", "voley", "volei", "voleibol", "volleyball",
    "de", "del", "la", "las", "los", "el", "y", "ad", "cde", "cd",
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

/** % de tokens de `from` que aparecen en `to` (containment puro). */
function containment(from: Set<string>, to: Set<string>): number {
    if (from.size === 0) return 0;
    let hits = 0;
    for (const t of from) {
        if (to.has(t)) hits++;
    }
    return hits / from.size;
}

/**
 * Calcula la similitud entre dos palabras (no strings completos).
 * Tolerancia para typos dentro de una palabra (ej. "barca" vs "barça").
 */
function wordSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length < 3 || b.length < 3) return 0;

    const maxLength = Math.max(a.length, b.length);
    const distance = levenshteinDistance(a, b);
    return 1 - distance / maxLength;
}

function levenshteinDistance(a: string, b: string): number {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

/**
 * Calcula la similitud entre dos conjuntos de tokens.
 * 1. Busca palabras en común (con tolerancia a typos).
 * 2. Devuelve la media de similitud de las palabras coincidentes.
 */
function tokenSetSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 1;
    if (a.size === 0 || b.size === 0) return 0;

    let totalSimilarity = 0;
    let matchCount = 0;

    for (const tokenA of a) {
        let bestMatchScore = 0;
        for (const tokenB of b) {
            const score = wordSimilarity(tokenA, tokenB);
            if (score > bestMatchScore) bestMatchScore = score;
        }

        if (bestMatchScore >= 0.7) {
            totalSimilarity += bestMatchScore;
            matchCount++;
        }
    }

    if (matchCount === 0) return 0;
    return totalSimilarity / Math.max(a.size, b.size);
}

export function calculateSimilarity(a: string, b: string): number {
    const normA = normalizeTeamAlias(a);
    const normB = normalizeTeamAlias(b);
    if (!normA || !normB) return 0;
    const tokensA = tokensOf(normA);
    const tokensB = tokensOf(normB);
    return Math.round(tokenSetSimilarity(tokensA, tokensB) * 100);
}

/** Score de containment bidireccional (0-100). */
export function calculateContainment(a: string, b: string): number {
    const tokensA = tokensOf(normalizeTeamAlias(a));
    const tokensB = tokensOf(normalizeTeamAlias(b));
    if (tokensA.size === 0 || tokensB.size === 0) return 0;
    const s1 = containment(tokensA, tokensB);
    const s2 = containment(tokensB, tokensA);
    return Math.round(Math.max(s1, s2) * 100);
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
                normalized: row.normalized_alias,
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
                ignoreDuplicates: true,
            });

        if (error) throw error;
        return deduped.size;
    }

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

        // 1. Subset / superset exacto
        const subsetCandidates: Array<{ teamId: string; size: number }> = [];
        for (const entry of index.entries) {
            const isSubset = [...inputTokens].every((t) => entry.tokens.has(t));
            const isSuperset = [...entry.tokens].every((t) => inputTokens.has(t));
            if (isSubset || isSuperset) {
                subsetCandidates.push({
                    teamId: entry.teamId,
                    size: entry.tokens.size,
                });
            }
        }

        if (subsetCandidates.length === 1) return subsetCandidates[0].teamId;

        if (subsetCandidates.length > 1) {
            subsetCandidates.sort((a, b) => a.size - b.size);
            if (subsetCandidates[0].size !== subsetCandidates[1].size) {
                return subsetCandidates[0].teamId;
            }
            return null;
        }

        // 2. Fuzzy matching basado en PALABRAS
        const similarityCandidates: Array<{ teamId: string; score: number }> = [];
        for (const entry of index.entries) {
            const score = tokenSetSimilarity(inputTokens, entry.tokens);
            if (score >= 0.5) {
                similarityCandidates.push({ teamId: entry.teamId, score });
            }
        }

        if (similarityCandidates.length === 0) return null;

        similarityCandidates.sort((a, b) => b.score - a.score);

        if (
            similarityCandidates.length === 1 ||
            similarityCandidates[0].score - similarityCandidates[1].score >= 0.15
        ) {
            return similarityCandidates[0].teamId;
        }

        return null;
    }

    /**
     * Resolución por jornada (la que pediste):
     * 1. Coincidencias exactas → se sacan del pool.
     * 2. Resto → containment (palabras contenidas) con asignación greedy 1-a-1.
     *
     * Devuelve Map<actName, teamId | null>
     */
    resolveJornada(
        actNames: string[],
        roster: Array<{ teamId: string; name: string }>,
        minContainment = 33
    ): Map<string, string | null> {
        const result = new Map<string, string | null>();

        // Preparar actas (únicas)
        const uniqueActNames = [...new Set(actNames)];
        const acts = uniqueActNames.map((raw) => {
            const normalized = normalizeTeamAlias(raw);
            return {
                raw,
                normalized,
                tokens: tokensOf(normalized),
            };
        });

        // Preparar roster
        let remainingRoster = roster.map((r) => {
            const normalized = normalizeTeamAlias(r.name);
            return {
                teamId: r.teamId,
                name: r.name,
                normalized,
                tokens: tokensOf(normalized),
            };
        });

        let remainingActs = [...acts];

        // ─────────────────────────────────────────────
        // PASO 1: Coincidencias EXACTAS
        // ─────────────────────────────────────────────
        const exactMatchedActs = new Set<string>();
        const exactMatchedRosterIds = new Set<string>();

        for (const a of remainingActs) {
            if (!a.normalized) continue;
            const match = remainingRoster.find((r) => r.normalized === a.normalized);
            if (match) {
                result.set(a.raw, match.teamId);
                exactMatchedActs.add(a.raw);
                exactMatchedRosterIds.add(match.teamId);
                console.log(`  ✓ Exacto: "${a.raw}" → ${match.name}`);
            }
        }

        remainingActs = remainingActs.filter((a) => !exactMatchedActs.has(a.raw));
        remainingRoster = remainingRoster.filter(
            (r) => !exactMatchedRosterIds.has(r.teamId)
        );

        // ─────────────────────────────────────────────
        // PASO 2: Containment (palabras contenidas)
        // ─────────────────────────────────────────────
        type Candidate = {
            actRaw: string;
            teamId: string;
            rosterName: string;
            score: number;
            direction: "act→roster" | "roster→act" | "both";
        };

        const candidates: Candidate[] = [];

        for (const a of remainingActs) {
            if (a.tokens.size === 0) continue;

            for (const r of remainingRoster) {
                if (r.tokens.size === 0) continue;

                const scoreActInRoster = containment(a.tokens, r.tokens);
                const scoreRosterInAct = containment(r.tokens, a.tokens);
                const best = Math.max(scoreActInRoster, scoreRosterInAct);

                if (best === 0) continue;

                candidates.push({
                    actRaw: a.raw,
                    teamId: r.teamId,
                    rosterName: r.name,
                    score: Math.round(best * 100),
                    direction:
                        scoreActInRoster === scoreRosterInAct
                            ? "both"
                            : scoreActInRoster > scoreRosterInAct
                                ? "act→roster"
                                : "roster→act",
                });
            }
        }

        // Greedy 1-a-1 por score descendente
        candidates.sort((x, y) => y.score - x.score);

        const usedActs = new Set<string>();
        const usedRoster = new Set<string>();

        for (const c of candidates) {
            if (usedActs.has(c.actRaw) || usedRoster.has(c.teamId)) continue;
            if (c.score < minContainment) continue;

            result.set(c.actRaw, c.teamId);
            usedActs.add(c.actRaw);
            usedRoster.add(c.teamId);

            console.log(
                `  ✓ Containment ${c.score}% (${c.direction}): "${c.actRaw}" ↔ "${c.rosterName}"`
            );
        }

        // Los que queden sin emparejar
        for (const a of remainingActs) {
            if (!result.has(a.raw)) {
                result.set(a.raw, null);
                console.warn(`  ✗ Sin match: "${a.raw}"`);
            }
        }

        return result;
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