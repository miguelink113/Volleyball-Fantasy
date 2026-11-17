
import { parseEsvoleyDatetime } from "@/lib/scraper/parse-match-date";

export interface EsvoleyMatch {
    rfevbMatchId: string;
    homeTeam: string;
    awayTeam: string;
    round: number;
    matchDate: Date | null;
    isFinished: boolean;
    isDelayed: boolean;
    originalRound: string | null;
    statsLink: string | null;
    homeSets: number | null;
    awaySets: number | null;
}

interface EsvoleyCalendarMatch {
    id: number | string;
    fecha_hora?: string | null;
    equipo_local: string;
    equipo_visitante: string;
    esFueraFechaJornada?: boolean;
    esAplazado?: boolean;
    esSuspendido?: boolean;
    esDeOtraJornada: boolean;
    jornadaProviene: string | null;
    linkEstadisticasPartido?: string | null;
}

interface EsvoleyCalendarRound {
    id: number;
    fecha: string;
    numero: string;
    partidos?: EsvoleyCalendarMatch[];
}

interface EsvoleyCalendarResponse {
    content: EsvoleyCalendarRound[];
    Error?: unknown;
}

function isCalendarResponse(value: unknown): value is EsvoleyCalendarResponse {
    if (!value || typeof value !== "object") return false;

    const content = (value as { content?: unknown }).content;
    if (!Array.isArray(content)) return false;

    return content.every((round) => {
        if (!round || typeof round !== "object") return false;

        const r = round as Record<string, unknown>;

        if (
            typeof r.id !== "number" ||
            typeof r.fecha !== "string" ||
            typeof r.numero !== "string"
        ) {
            return false;
        }

        // Algunas jornadas pueden no tener partidos.
        if (r.partidos === undefined) return true;
        if (!Array.isArray(r.partidos)) return false;

        return r.partidos.every((match) => {
            if (!match || typeof match !== "object") return false;

            const m = match as Record<string, unknown>;

            return (
                (typeof m.id === "number" || typeof m.id === "string") &&
                typeof m.equipo_local === "string" &&
                m.equipo_local.trim().length > 0 &&
                typeof m.equipo_visitante === "string" &&
                m.equipo_visitante.trim().length > 0 &&
                typeof m.esDeOtraJornada === "boolean"
            );
        });
    });
}

export async function fetchMatchesEsvoley(
    grupoId: number
): Promise<EsvoleyMatch[]> {
    const url = `https://intranet.esvoley.es/api/competiciones/getJornadasCalendario?grupoId=${grupoId}`;

    let res: Response;

    try {
        res = await fetch(url, {
            headers: {
                Accept: "*/*",
                Origin: "https://esvoley.es",
                Referer: "https://esvoley.es/",
            },
            signal: AbortSignal.timeout(30_000),
        });
    } catch (error) {
        throw new Error(
            `No se pudo consultar esvoley (${grupoId}): ${
                error instanceof Error ? error.message : "error desconocido"
            }`
        );
    }

    if (!res.ok) {
        throw new Error(`Error esvoley (${grupoId}): ${res.status}`);
    }

    let json: unknown;

    try {
        json = await res.json();
    } catch (error) {
        throw new Error(
            `Respuesta JSON inválida de esvoley (${grupoId}): ${
                error instanceof Error ? error.message : "error desconocido"
            }`
        );
    }

    if (!isCalendarResponse(json)) {
        const data = json as any;
        const round = data?.content?.[0];
        const match = round?.partidos?.[0];

        console.log({
            grupoId,
            clavesJornada: Object.keys(round ?? {}),
            clavesPartido: Object.keys(match ?? {}),
            camposPartido: {
                id: typeof match?.id,
                equipo_local: typeof match?.equipo_local,
                equipo_visitante: typeof match?.equipo_visitante,
                finalizado: typeof match?.finalizado,
                esDeOtraJornada: typeof match?.esDeOtraJornada,
            },
        });

        throw new Error(`Respuesta inválida (${grupoId})`);
    }

    const matches: EsvoleyMatch[] = [];

    for (const jornada of json.content) {
        const roundNumber = parseInt(jornada.numero, 10);

        if (!Number.isInteger(roundNumber) || roundNumber <= 0) {
            throw new Error(`Jornada inválida en esvoley (${grupoId})`);
        }

        for (const partido of jornada.partidos ?? []) {
            const matchDate = partido.fecha_hora
                ? parseEsvoleyDatetime(partido.fecha_hora)
                : null;

            if (partido.fecha_hora && !matchDate) {
                throw new Error(
                    `Fecha inválida para partido ${partido.id}: "${partido.fecha_hora}"`
                );
            }

            matches.push({
                rfevbMatchId: String(partido.id),
                homeTeam: partido.equipo_local,
                awayTeam: partido.equipo_visitante,
                round: roundNumber,
                matchDate,
                isFinished: false,
                isDelayed:
                    partido.esDeOtraJornada ||
                    partido.esAplazado === true ||
                    partido.esSuspendido === true,
                originalRound: partido.jornadaProviene ?? null,
                statsLink: partido.linkEstadisticasPartido || null,
                homeSets: null,
                awaySets: null,
            });
        }
    }

    return matches;
}
