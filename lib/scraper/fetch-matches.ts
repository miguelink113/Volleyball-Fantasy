import * as cheerio from "cheerio";

const COMPETITION_MATCHES_URL =
    "https://rfevb-web.dataproject.com/CompetitionMatches.aspx";

const MATCH_STATISTICS_URL =
    "https://rfevb-web.dataproject.com/MatchStatistics.aspx";

export interface Match {
    matchId: string;
    competitionId: string;
    categoryId: string;
    seasonId: string;
    round: number;
    homeTeam: string;
    awayTeam: string;
    url: string;
}

export class ScraperError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ScraperError";
    }
}

/**
 * Descarga el HTML de la página de partidos de una competición.
 */
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
            signal: AbortSignal.timeout(10_000),
        });
    } catch (error) {
        throw new ScraperError(
            `No se pudo conectar con la web: ${
                error instanceof Error
                    ? error.message
                    : "error desconocido"
            }`
        );
    }

    if (!response.ok) {
        throw new ScraperError(
            `La web respondió con HTTP ${response.status}`
        );
    }

    const html = await response.text();

    if (!html.trim()) {
        throw new ScraperError(
            "La web devolvió un HTML vacío."
        );
    }

    return html;
}

/**
 * Extrae los parámetros de MatchStatistics.aspx de un onclick.
 *
 * Busca algo como:
 *
 * MatchStatistics.aspx?mID=123&ID=152&CID=4&PID=186
 */
function extractMatchParams(
    onclick: string
): URLSearchParams | null {
    const match = onclick.match(
        /MatchStatistics\.aspx\?([^'"\s)]+)/i
    );

    if (!match) {
        return null;
    }

    return new URLSearchParams(match[1]);
}

/**
 * Construye la URL de la página de estadísticas de un partido.
 */
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

/**
 * Extrae los nombres de los dos equipos de un partido.
 *
 * La web utiliza actualmente:
 *
 *   _LBL_HomeTeamName  -> equipo local
 *   _LBL_GuestTeamName -> equipo visitante
 *
 * En algunas versiones de la página también aparecen:
 *
 *   _Label6 -> equipo local
 *   _Label7 -> equipo visitante
 *
 * No utilizamos la posición del texto ni nombres del pabellón.
 */
function extractTeamNames(
    $: cheerio.CheerioAPI,
    matchId: string
): {
    homeTeam: string;
    awayTeam: string;
} | null {
    let homeTeam: string | null = null;
    let awayTeam: string | null = null;

    $(`[onclick*="mID=${matchId}"] span`).each(
        (_, element) => {
            const id = $(element).attr("id");

            if (!id) {
                return;
            }

            const text = $(element)
                .text()
                .replace(/\s+/g, " ")
                .trim();

            if (!text) {
                return;
            }

            // Versión principal.
            if (
                id.endsWith("_LBL_HomeTeamName") &&
                !homeTeam
            ) {
                homeTeam = text;
            }

            if (
                id.endsWith("_LBL_GuestTeamName") &&
                !awayTeam
            ) {
                awayTeam = text;
            }

            // Versión alternativa.
            if (
                id.endsWith("_Label6") &&
                !homeTeam
            ) {
                homeTeam = text;
            }

            if (
                id.endsWith("_Label7") &&
                !awayTeam
            ) {
                awayTeam = text;
            }
        }
    );

    if (!homeTeam || !awayTeam) {
        return null;
    }

    return {
        homeTeam,
        awayTeam,
    };
}

/**
 * Extrae todos los partidos del HTML de CompetitionMatches.
 */
function extractMatchLinks(html: string): Match[] {
    const $ = cheerio.load(html);

    const matches: Match[] = [];
    const seenMatchIds = new Set<string>();

    const roundContainers = $("div.TabContent_Border");

    console.log(
        `Contenedores de jornadas encontrados: ${roundContainers.length}`
    );

    roundContainers.each((index, container) => {
        // La posición del bloque determina la jornada.
        const roundNumber = index + 1;

        $(container)
            .find("[onclick]")
            .each((_, element) => {
                const onclick = $(element).attr("onclick");

                if (!onclick) {
                    return;
                }

                if (
                    !onclick.includes(
                        "MatchStatistics.aspx"
                    )
                ) {
                    return;
                }

                const params =
                    extractMatchParams(onclick);

                if (!params) {
                    return;
                }

                const matchId = params.get("mID");
                const competitionId =
                    params.get("ID");
                const categoryId =
                    params.get("CID");
                const seasonId =
                    params.get("PID");

                if (
                    !matchId ||
                    !competitionId ||
                    !categoryId ||
                    !seasonId
                ) {
                    return;
                }

                /*
                 * Un mismo partido aparece varias veces
                 * en el HTML porque la página contiene
                 * diferentes representaciones visuales.
                 */
                if (seenMatchIds.has(matchId)) {
                    return;
                }

                const teamNames =
                    extractTeamNames($, matchId);

                if (!teamNames) {
                    console.warn(
                        `No se pudieron obtener los equipos del partido ${matchId}`
                    );

                    /*
                     * No perdemos el partido si falta
                     * la información de los equipos.
                     */
                    seenMatchIds.add(matchId);

                    matches.push({
                        matchId,
                        competitionId,
                        categoryId,
                        seasonId,
                        round: roundNumber,
                        homeTeam: "Desconocido",
                        awayTeam: "Desconocido",
                        url: getMatchUrl(
                            matchId,
                            competitionId,
                            categoryId,
                            seasonId
                        ),
                    });

                    return;
                }

                seenMatchIds.add(matchId);

                matches.push({
                    matchId,
                    competitionId,
                    categoryId,
                    seasonId,
                    round: roundNumber,
                    homeTeam: teamNames.homeTeam,
                    awayTeam: teamNames.awayTeam,
                    url: getMatchUrl(
                        matchId,
                        competitionId,
                        categoryId,
                        seasonId
                    ),
                });
            });
    });

    return matches;
}

/**
 * Función principal del scraper.
 *
 * scrapeMatches(152, 186)
 *   -> devuelve todos los partidos.
 *
 * scrapeMatches(152, 186, 10)
 *   -> devuelve únicamente los partidos de la jornada 10.
 */
export async function scrapeMatches(
    competitionId: number,
    seasonId: number,
    roundNumber?: number
): Promise<Match[]> {
    console.log(
        `Buscando partidos. Competición: ${competitionId}, Temporada: ${seasonId}`
    );

    const html =
        await getCompetitionMatchesHtml(
            competitionId,
            seasonId
        );

    const matches =
        extractMatchLinks(html);

    const filteredMatches =
        roundNumber === undefined
            ? matches
            : matches.filter(
                (match) =>
                    match.round === roundNumber
            );

    console.log(
        `Partidos encontrados: ${filteredMatches.length}`
    );

    return filteredMatches;
}