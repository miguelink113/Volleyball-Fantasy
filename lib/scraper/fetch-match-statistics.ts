import * as cheerio from "cheerio";

const MATCH_STATISTICS_URL =
    "https://rfevb-web.dataproject.com/MatchStatistics.aspx";

/**
 * Valor utilizado en las posiciones de formación.
 *
 * Puede ser:
 * - número de posición
 * - "*" cuando aparece un asterisco
 * - null cuando la celda está vacía
 */
export type FormationValue = number | "*" | null;

/**
 * Estadística numérica.
 *
 * "-" y "." se consideran ausencia de dato y se convierten en null.
 */
export type StatValue = number | null;

/**
 * Estadísticas completas de un jugador.
 */
export interface PlayerStats {
    number: number;
    name: string;

    startingFormation: {
        position1: FormationValue;
        position2: FormationValue;
        position3: FormationValue;
        position4: FormationValue;
        position5: FormationValue;
    };

    points: {
        total: StatValue;
        bp: StatValue;
        wonLost: StatValue;
    };

    serve: {
        total: StatValue;
        errors: StatValue;
        directPoints: StatValue;
    };

    reception: {
        total: StatValue;
        errors: StatValue;
        positivePercentage: StatValue;
        excellentPercentage: StatValue;
    };

    attack: {
        total: StatValue;
        errors: StatValue;
        blocks: StatValue;
        excellent: StatValue;
        excellentPercentage: StatValue;
    };

    block: {
        points: StatValue;
    };
}

/**
 * Estadísticas de un equipo.
 */
export interface TeamStats {
    name: string;
    players: PlayerStats[];
}

/**
 * Información básica del partido.
 */
export interface MatchStats {
    matchId: string;
    competitionId: string;
    categoryId: string;
    seasonId: string;

    homeTeam: string;
    awayTeam: string;

    homeScore: number | null;
    awayScore: number | null;

    sets: {
        home: number;
        away: number;
    }[];

    teams: TeamStats[];
}

export class MatchScraperError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MatchScraperError";
    }
}

/**
 * Convierte un texto numérico a number.
 *
 * Ejemplos:
 *
 * "23"    -> 23
 * "-2"    -> -2
 * "58 %"  -> 58
 * "-"     -> null
 * "."     -> null
 * ""      -> null
 */
function parseStatValue(value: string): StatValue {
    const normalized = value
        .replace(/\s+/g, " ")
        .trim();

    if (
        normalized === "" ||
        normalized === "-" ||
        normalized === "."
    ) {
        return null;
    }

    const numericValue = Number(
        normalized
            .replace("%", "")
            .replace(",", ".")
    );

    if (!Number.isFinite(numericValue)) {
        return null;
    }

    return numericValue;
}

/**
 * Convierte una celda de formación.
 *
 * Ejemplos:
 *
 * "5" -> 5
 * "*" -> "*"
 * ""  -> null
 */
function parseFormationValue(
    value: string
): FormationValue {
    const normalized = value
        .replace(/\s+/g, " ")
        .trim();

    if (normalized === "") {
        return null;
    }

    if (normalized === "*") {
        return "*";
    }

    const numericValue = Number(normalized);

    return Number.isFinite(numericValue)
        ? numericValue
        : null;
}

/**
 * Descarga el HTML de un partido.
 */
async function getMatchHtml(
    matchId: string,
    competitionId: string,
    categoryId: string,
    seasonId: string
): Promise<string> {
    const params = new URLSearchParams({
        mID: matchId,
        ID: competitionId,
        CID: categoryId,
        PID: seasonId,
        type: "LegList",
    });

    const url = `${MATCH_STATISTICS_URL}?${params}`;

    console.log(`Descargando partido: ${url}`);

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
        throw new MatchScraperError(
            `No se pudo conectar con la página del partido: ${
                error instanceof Error
                    ? error.message
                    : "error desconocido"
            }`
        );
    }

    if (!response.ok) {
        throw new MatchScraperError(
            `La web respondió con HTTP ${response.status}`
        );
    }

    const html = await response.text();

    if (!html.trim()) {
        throw new MatchScraperError(
            "La web devolvió un HTML vacío."
        );
    }

    return html;
}

/**
 * Obtiene las celdas de una fila.
 */
function getRowCells(
    $: cheerio.CheerioAPI,
    row: any
): string[] {
    return $(row)
        .find("td")
        .map((_, cell) =>
            $(cell)
                .text()
                .replace(/\s+/g, " ")
                .trim()
        )
        .get();
}

/**
 * Comprueba si una tabla es una tabla de estadísticas
 * de jugadores.
 *
 * Buscamos las cabeceras características:
 *
 * Formación Inicial
 * Puntos
 * Saque
 * Recepción
 * Ataque
 * Bloqueo
 */
function isPlayerStatsTable(
    $: cheerio.CheerioAPI,
    table: any
): boolean {
    const tableText = $(table)
        .text()
        .replace(/\s+/g, " ")
        .toLowerCase();

    return (
        tableText.includes("formación inicial") &&
        tableText.includes("puntos") &&
        tableText.includes("saque") &&
        tableText.includes("recepción") &&
        tableText.includes("ataque") &&
        tableText.includes("bloqueo")
    );
}

/**
 * Busca el nombre del equipo asociado a una tabla.
 *
 * Dependiendo de la estructura concreta del HTML, el nombre
 * puede estar en un encabezado anterior.
 */
function extractTeamName(
    $: cheerio.CheerioAPI,
    table: any
): string {
    /*
     * Primera opción:
     * buscar encabezados anteriores.
     */
    const previousHeadings = $(table)
        .prevAll("h1, h2, h3, h4, h5, h6")
        .toArray();

    for (const heading of previousHeadings) {
        const text = $(heading)
            .text()
            .replace(/\s+/g, " ")
            .trim();

        if (
            text &&
            !text.toLowerCase().includes("estadísticas") &&
            !text.toLowerCase().includes("set")
        ) {
            return text;
        }
    }

    /*
     * Segunda opción:
     * buscar texto en elementos anteriores.
     */
    const previousElements = $(table)
        .prevAll()
        .toArray();

    for (const element of previousElements) {
        const text = $(element)
            .text()
            .replace(/\s+/g, " ")
            .trim();

        if (
            text &&
            !text.toLowerCase().includes("estadísticas") &&
            !text.toLowerCase().includes("formación inicial") &&
            text.length < 100
        ) {
            return text;
        }
    }

    return "Equipo desconocido";
}

/**
 * Extrae un jugador de una fila.
 *
 * La estructura que vemos en la tabla es:
 *
 * dorsal
 * nombre
 * formación 1
 * formación 2
 * formación 3
 * formación 4
 * formación 5
 * puntos Tot
 * puntos BP
 * puntos G-P
 * saque Tot
 * saque Err
 * saque Punto directo
 * recepción Tot
 * recepción Err
 * recepción Pos%
 * recepción Exc.%
 * ataque Tot
 * ataque Err
 * ataque Blo
 * ataque Exc.
 * ataque Exc.%
 * bloqueo Puntos
 */
function parsePlayerRow(
    $: cheerio.CheerioAPI,
    row: any
): PlayerStats | null {
    const cells = getRowCells($, row);

    /*
     * Necesitamos:
     *
     * 2 columnas identificativas
     * +
     * 21 columnas de estadísticas
     *
     * = 23 columnas como mínimo.
     */
    if (cells.length < 23) {
        return null;
    }

    const number = Number(cells[0]);

    /*
     * Las filas de totales, cabeceras, etc.
     * no tienen dorsal numérico.
     */
    if (!Number.isInteger(number)) {
        return null;
    }

    const name = cells[1];

    if (!name) {
        return null;
    }

    /*
     * Índices:
     *
     * 0  dorsal
     * 1  nombre
     *
     * 2-6   formación
     * 7-9   puntos
     * 10-12 saque
     * 13-16 recepción
     * 17-21 ataque
     * 22    bloqueo
     */

    return {
        number,
        name,

        startingFormation: {
            position1: parseFormationValue(cells[2]),
            position2: parseFormationValue(cells[3]),
            position3: parseFormationValue(cells[4]),
            position4: parseFormationValue(cells[5]),
            position5: parseFormationValue(cells[6]),
        },

        points: {
            total: parseStatValue(cells[7]),
            bp: parseStatValue(cells[8]),
            wonLost: parseStatValue(cells[9]),
        },

        serve: {
            total: parseStatValue(cells[10]),
            errors: parseStatValue(cells[11]),
            directPoints: parseStatValue(cells[12]),
        },

        reception: {
            total: parseStatValue(cells[13]),
            errors: parseStatValue(cells[14]),
            positivePercentage: parseStatValue(cells[15]),
            excellentPercentage: parseStatValue(cells[16]),
        },

        attack: {
            total: parseStatValue(cells[17]),
            errors: parseStatValue(cells[18]),
            blocks: parseStatValue(cells[19]),
            excellent: parseStatValue(cells[20]),
            excellentPercentage: parseStatValue(cells[21]),
        },

        block: {
            points: parseStatValue(cells[22]),
        },
    };
}

/**
 * Extrae todos los jugadores de una tabla de estadísticas.
 */
function extractPlayersFromTable(
    $: cheerio.CheerioAPI,
    table: any
): PlayerStats[] {
    const players: PlayerStats[] = [];

    $(table)
        .find("tr")
        .each((_, row) => {
            const player = parsePlayerRow($, row);

            if (!player) {
                return;
            }

            players.push(player);
        });

    return players;
}

/**
 * Extrae los dos equipos de la sección principal
 * de estadísticas del partido.
 *
 * Importante:
 *
 * La página también contiene tablas para SET 1,
 * SET 2, etc.
 *
 * Por eso aquí nos quedamos con las primeras tablas
 * que aparecen antes de las estadísticas por sets.
 */
function extractTeamStats(
    html: string
): TeamStats[] {
    const $ = cheerio.load(html);

    const teams: TeamStats[] = [];

    $("table").each((_, table) => {
        if (!isPlayerStatsTable($, table)) {
            return;
        }

        const players = extractPlayersFromTable(
            $,
            table
        );

        /*
         * Una tabla válida debe contener jugadores.
         */
        if (players.length === 0) {
            return;
        }

        const teamName = extractTeamName(
            $,
            table
        );

        teams.push({
            name: teamName,
            players,
        });
    });

    /*
     * La página contiene también las mismas estadísticas
     * para cada SET.
     *
     * De momento solo queremos las estadísticas globales
     * del partido, por lo que nos quedamos con los dos
     * primeros equipos.
     */
    return teams.slice(0, 2);
}

/**
 * Extrae la información básica del partido.
 */
function extractMatchInfo(
    html: string
): {
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
    sets: {
        home: number;
        away: number;
    }[];
} {
    const $ = cheerio.load(html);

    const bodyText = $("body")
        .text()
        .replace(/\s+/g, " ")
        .trim();

    /*
     * Ejemplo:
     *
     * Cisneros La Laguna
     * 0
     * VS
     * 3
     * Conectabalear CV Manacor
     */
    const scoreMatch = bodyText.match(
        /([^\s]+(?:\s+[^\s]+){0,10})\s+([0-3])\s+VS\s+([0-3])\s+([^\s]+(?:\s+[^\s]+){0,10})/
    );

    /*
     * De momento utilizamos la información estructurada
     * de las tablas para las estadísticas.
     *
     * Los equipos se pueden obtener de los equipos
     * extraídos posteriormente.
     */
    const homeScore = scoreMatch
        ? Number(scoreMatch[2])
        : null;

    const awayScore = scoreMatch
        ? Number(scoreMatch[3])
        : null;

    /*
     * Marcadores de los sets.
     *
     * Ejemplo:
     *
     * 19/25 25/27 24/26
     */
    const setMatch = bodyText.match(
        /\b\d{1,2}\/\d{1,2}(?:\s+\d{1,2}\/\d{1,2})+\b/
    );

    const sets =
        setMatch?.[0]
            .split(/\s+/)
            .map((set) => {
                const [home, away] = set
                    .split("/")
                    .map(Number);

                return {
                    home,
                    away,
                };
            }) ?? [];

    return {
        homeTeam: "",
        awayTeam: "",
        homeScore,
        awayScore,
        sets,
    };
}

/**
 * Función principal para obtener las estadísticas
 * de un partido concreto.
 */
export async function scrapeMatch(
    matchId: string,
    competitionId: string,
    categoryId: string,
    seasonId: string
): Promise<MatchStats> {
    const html = await getMatchHtml(
        matchId,
        competitionId,
        categoryId,
        seasonId
    );

    const teams = extractTeamStats(html);

    if (teams.length !== 2) {
        throw new MatchScraperError(
            `Se esperaban 2 equipos y se encontraron ${teams.length}.`
        );
    }

    const matchInfo = extractMatchInfo(html);

    return {
        matchId,
        competitionId,
        categoryId,
        seasonId,

        homeTeam: teams[0].name,
        awayTeam: teams[1].name,

        homeScore: matchInfo.homeScore,
        awayScore: matchInfo.awayScore,

        sets: matchInfo.sets,

        teams,
    };
}