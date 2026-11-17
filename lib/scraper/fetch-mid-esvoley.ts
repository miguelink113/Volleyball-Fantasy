import * as cheerio from "cheerio";

export interface DataProjectMatchReference {
    dataProjectMatchId: string;
    competitionId: string;
    categoryId: string;
    seasonId: string;
    url: string;
}

export async function fetchDataProjectMatchReference(
    esvoleyUrl: string
): Promise<DataProjectMatchReference | null> {
    try {
        const res = await fetch(esvoleyUrl, {
            signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        const html = await res.text();
        const $ = cheerio.load(html);

        const links = $("a")
            .map((_, element) => $(element).attr("href"))
            .get()
            .filter((link): link is string => Boolean(link));

        for (const link of links) {
            let url: URL;
            try {
                url = new URL(link, esvoleyUrl);
            } catch {
                continue;
            }
            if (!url.hostname.endsWith("dataproject.com")) continue;
            if (!url.pathname.endsWith("/MatchStatistics.aspx")) continue;

            const dataProjectMatchId = url.searchParams.get("mID");
            const competitionId = url.searchParams.get("ID");
            const categoryId = url.searchParams.get("CID");
            const seasonId = url.searchParams.get("PID");
            if (!dataProjectMatchId || !competitionId || !categoryId || !seasonId) {
                continue;
            }

            return {
                dataProjectMatchId,
                competitionId,
                categoryId,
                seasonId,
                url: url.toString(),
            };
        }

        return null;
    } catch (error) {
        throw new Error(
            `Error buscando referencia DataProject en esvoley: ${
                error instanceof Error ? error.message : "error desconocido"
            }`
        );
    }
}

/** @deprecated Use fetchDataProjectMatchReference. */
export async function fetchDataProjectMatchId(
    esvoleyUrl: string
): Promise<string | null> {
    const reference = await fetchDataProjectMatchReference(esvoleyUrl);
    return reference?.dataProjectMatchId ?? null;
}