import * as cheerio from "cheerio";

const COMPETITION_MATCHES_URL =
    "https://rfevb-web.dataproject.com/CompetitionMatches.aspx";

const MATCH_STATISTICS_URL =
    "https://rfevb-web.dataproject.com/MatchStatistics.aspx";

const MADRID_TZ = "Europe/Madrid";

export interface Match {
    matchId: string;
    competitionId: string;
    categoryId: string;
    seasonId: string;
    round: number;
    groupName: string | null;
    homeTeam: string;
    awayTeam: string;
    matchDate: Date | null;
    url: string;
}

export class ScraperError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ScraperError";
    }
}

// ───────────────────────────── timezone ─────────────────────────────

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
    const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
    const parts = dtf.formatToParts(date);
    const get = (t: string) =>
        Number(parts.find((p) => p.type === t)?.value ?? 0);
    let hour = get("hour");
    if (hour === 24) hour = 0;
    const asUtc = Date.UTC(
        get("year"),
        get("month") - 1,
        get("day"),
        hour,
        get("minute"),
        get("second")
    );
    return asUtc - date.getTime();
}

function wallClockToUtc(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    timeZone: string
): Date {
    const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
    const offset1 = getTimeZoneOffsetMs(new Date(naive), timeZone);
    const candidate = naive - offset1;
    const offset2 = getTimeZoneOffsetMs(new Date(candidate), timeZone);
    return new Date(naive - offset2);
}

export function parseRfevbDatetime(
    value: string,
    timeZone: string = MADRID_TZ
): Date | null {
    const m = value
        .trim()
        .match(/^(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2}):(\d{2})$/);
    if (!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const hour = Number(m[4]);
    const minute = Number(m[5]);
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    if (hour > 23 || minute > 59) return null;
    return wallClockToUtc(year, month, day, hour, minute, timeZone);
}

// ───────────────────────────── fetch ─────────────────────────────

async function getCompetitionMatchesHtml(
    competitionId: number,
    seasonId: number
): Promise<string> {
    const params = new URLSearchParams({
        ID: String(competitionId),
        PID: String(seasonId),
    });
    const url = `${COMPETITION_MATCHES_URL}?${params.toString()}`;
    console.log(`Descargando: ${url}`);
    let response: Response;
    try {
        response = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            cache: "no-store",
            signal: AbortSignal.timeout(30_000),
        });
    } catch (error) {
        throw new ScraperError(
            `No se pudo conectar con la web: ${
                error instanceof Error ? error.message : "error desconocido"
            }`
        );
    }
    if (!response.ok) {
        throw new ScraperError(`La web respondió con HTTP ${response.status}`);
    }
    const html = await response.text();
    if (!html.trim()) {
        throw new ScraperError("La web devolvió un HTML vacío.");
    }
    return html;
}

// ───────────────────────────── parseo ─────────────────────────────

function extractMatchParams(onclick: string): URLSearchParams | null {
    const match = onclick.match(/MatchStatistics\.aspx\?([^'"\s)]+)/i);
    if (!match) return null;
    return new URLSearchParams(match[1]);
}

function getMatchUrl(
    matchId: string,
    competitionId: string,
    categoryId: string,
    seasonId: string,
    matchType = "LegList"
): string {
    const params = new URLSearchParams({
        mID: matchId,
        ID: competitionId,
        CID: categoryId,
        PID: seasonId,
        type: matchType,
    });
    return `${MATCH_STATISTICS_URL}?${params.toString()}`;
}

function extractTeamNames(
    $: cheerio.CheerioAPI,
    matchId: string
): { homeTeam: string; awayTeam: string } | null {
    let homeTeam: string | null = null;
    let awayTeam: string | null = null;
    $(`[onclick*="mID=${matchId}"] span`).each((_, element) => {
        const id = $(element).attr("id");
        if (!id) return;
        const text = $(element).text().replace(/\s+/g, " ").trim();
        if (!text) return;
        if (id.endsWith("_LBL_HomeTeamName") && !homeTeam) homeTeam = text;
        if (id.endsWith("_LBL_GuestTeamName") && !awayTeam) awayTeam = text;
        if (id.endsWith("_Label6") && !homeTeam) homeTeam = text;
        if (id.endsWith("_Label7") && !awayTeam) awayTeam = text;
    });
    if (!homeTeam || !awayTeam) return null;
    return { homeTeam, awayTeam };
}

function findMatchDatetimeFromLink(
    $: cheerio.CheerioAPI,
    linkEl: unknown
): string | null {
    let node: any = $(linkEl as any);
    let prefix: string | null = null;
    for (let i = 0; i < 20; i++) {
        const parent = node.parent();
        if (!parent || parent.length === 0) break;
        const id = parent.attr("id");
        if (id) {
            const m = id.match(/^(.*RADLIST_Matches_ctrl\d+_)/);
            if (m) {
                prefix = m[1];
                break;
            }
        }
        node = parent;
    }
    if (!prefix) return null;
    const inputId = `${prefix}HF_MatchDatetime`;
    const input = $(`input[id="${inputId}"]`);
    if (input.length === 0) return null;
    const value = input.attr("value");
    return value ? value.trim() : null;
}

function extractMatchLinks(html: string): Match[] {
    const $ = cheerio.load(html);
    const matches: Match[] = [];
    const seenMatchIds = new Set<string>();

    // 1. Obtener nombres de las pestañas en orden
    const tabNames: string[] = [];
    $(".rtsUL .rtsLI a .rtsTxt").each((_, el) => {
        tabNames.push($(el).text().trim());
    });

    // 2. Obtener paneles de contenido (rmpView) en orden
    const panels = $("div.rmpView");

    // 3. Para cada panel, obtener su nombre de grupo
    const panelGroupMap = new Map<any, string>();
    panels.each((index, panel) => {
        const groupName = tabNames[index] || `Grupo ${index + 1}`;
        panelGroupMap.set(panel, groupName);
    });

    const roundCounters: Record<string, number> = {};

    $("div.TabContent_Border").each((index, container) => {
        // Encontrar el panel padre
        const panel = $(container).closest(".rmpView");
        const groupName = panelGroupMap.get(panel[0]) || "Grupo Desconocido";

        // Incrementar contador de jornada para este grupo
        roundCounters[groupName] = (roundCounters[groupName] || 0) + 1;
        const roundNumber = roundCounters[groupName];

        $(container).find("[onclick]").each((_, element) => {
            const onclick = $(element).attr("onclick");
            if (!onclick) return;
            if (!onclick.includes("MatchStatistics.aspx")) return;
            const params = extractMatchParams(onclick);
            if (!params) return;
            const matchId = params.get("mID");
            const competitionId = params.get("ID");
            const categoryId = params.get("CID");
            const seasonId = params.get("PID");
            if (!matchId || !competitionId || !categoryId || !seasonId) return;
            if (seenMatchIds.has(matchId)) return;

            const rawDatetime = findMatchDatetimeFromLink($, element);
            const matchDate = rawDatetime ? parseRfevbDatetime(rawDatetime) : null;
            if (rawDatetime && !matchDate) {
                console.warn(`Fecha no parseable para partido ${matchId}: "${rawDatetime}"`);
            }

            const teamNames = extractTeamNames($, matchId);
            seenMatchIds.add(matchId);

            if (!teamNames) {
                console.warn(`No se pudieron obtener los equipos del partido ${matchId}`);
                matches.push({
                    matchId,
                    competitionId,
                    categoryId,
                    seasonId,
                    round: roundNumber,
                    groupName,
                    homeTeam: "Desconocido",
                    awayTeam: "Desconocido",
                    matchDate,
                    url: getMatchUrl(matchId, competitionId, categoryId, seasonId),
                });
                return;
            }

            matches.push({
                matchId,
                competitionId,
                categoryId,
                seasonId,
                round: roundNumber,
                groupName,
                homeTeam: teamNames.homeTeam,
                awayTeam: teamNames.awayTeam,
                matchDate,
                url: getMatchUrl(matchId, competitionId, categoryId, seasonId),
            });
        });
    });

    return matches;
}

export async function scrapeMatches(
    competitionId: number,
    seasonId: number,
    roundNumber?: number
): Promise<Match[]> {
    console.log(
        `Buscando partidos. Competición: ${competitionId}, Temporada: ${seasonId}`
    );
    const html = await getCompetitionMatchesHtml(competitionId, seasonId);
    const matches = extractMatchLinks(html);
    const filteredMatches =
        roundNumber === undefined
            ? matches
            : matches.filter((match) => match.round === roundNumber);
    console.log(`Partidos encontrados: ${filteredMatches.length}`);
    return filteredMatches;
}