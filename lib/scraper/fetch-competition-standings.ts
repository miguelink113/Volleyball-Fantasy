// lib/scraper/fetch-competition-standings.ts
import * as cheerio from 'cheerio';

export interface StandingRow {
    position: number;
    teamName: string;
    dataProjectTeamId: number;
    groupName: string | null;

    // Clasificación
    points: number;              // 1: Clasificación por Puntos

    // Partidos
    matchesPlayed: number;       // 2: Jugados
    matchesWon: number;          // 3: Ganados
    matchesLost: number;         // 4: Perdidos

    // Sets
    setsWon: number;             // 5: Sets a Favor
    setsLost: number;            // 6: Sets en contra

    // Tanteo
    pointsWon: number;           // 7: Puntos a Favor
    pointsLost: number;          // 8: Puntos en Contra

    // Distribución de resultados
    result3_0: number;           // 9
    result3_1: number;           // 10
    result3_2: number;           // 11
    result2_3: number;           // 12
    result1_3: number;           // 13
    result0_3: number;           // 14

    // Coeficientes (null si RFEVB muestra "-" o vacío)
    setsRatio: number | null;    // 15
    pointsRatio: number | null;  // 16

    // Sanción (0 o negativo)
    penalty: number;             // 17
}

const N = (s: string) => {
    const v = parseInt(s.replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(v) ? v : 0;
};

const Ratio = (s: string): number | null => {
    const v = parseFloat(s.replace(',', '.').replace(/[^\d.-]/g, ''));
    return Number.isFinite(v) ? v : null;
};

const S = (s: string) => s.trim().replace(/\s+/g, ' ');
const GROUP_RE = /^Grupo\s+([A-Z])$/i;

export async function fetchCompetitionStandings(url: string): Promise<StandingRow[]> {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VolleyballFantasy/1.0)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
    const $ = cheerio.load(await res.text());

    const tables = $('table').toArray().filter((el) => {
        const $t = $(el);
        const headers = $t.find('thead tr').first().find('th').map((_, th) => $(th).text().trim()).get();
        const hasData = $t.find('tbody > tr').toArray().some((tr) =>
            $(tr).find('input[id="HF_TeamID"]').length > 0,
        );
        return hasData && headers.some((h) => /^equipo$/i.test(h));
    });

    const multiGroup = tables.length > 1;
    const rows: StandingRow[] = [];

    tables.forEach((el, groupIdx) => {
        const $t = $(el);
        const groupName = multiGroup ? findGroupName($, $t, groupIdx) : null;

        let position = 0;
        $t.find('tbody > tr').each((_, trEl) => {
            const $tr = $(trEl);
            const teamId = N($tr.find('input[id="HF_TeamID"]').attr('value') ?? '0');
            const teamName = S($tr.find('span#TeamName').text());
            if (!teamId || !teamName) return;

            const cells = $tr.children('td').map((_, td) => S($(td).text())).get();
            if (cells.length < 7) return; // mínimo indispensable
            const cell = (i: number) => cells[i] ?? '';

            position += 1;
            rows.push({
                position,
                teamName,
                dataProjectTeamId: teamId,
                groupName,
                points:        N(cell(1)),
                matchesPlayed: N(cell(2)),
                matchesWon:    N(cell(3)),
                matchesLost:   N(cell(4)),
                setsWon:       N(cell(5)),
                setsLost:      N(cell(6)),
                pointsWon:     N(cell(7)),
                pointsLost:    N(cell(8)),
                result3_0:     N(cell(9)),
                result3_1:     N(cell(10)),
                result3_2:     N(cell(11)),
                result2_3:     N(cell(12)),
                result1_3:     N(cell(13)),
                result0_3:     N(cell(14)),
                setsRatio:     Ratio(cell(15)),
                pointsRatio:   Ratio(cell(16)),
                penalty:       N(cell(17)),
            });
        });
    });

    return rows;
}

function findGroupName($: cheerio.CheerioAPI, $table: cheerio.Cheerio<any>, fallbackIdx: number): string {
    const $container = $table.closest('[id^="Content_Main_"]');
    if ($container.length) {
        let found: string | null = null;
        $container.find('h1, h2, h3, h4, h5, legend, .rtsTxt, .rtsLink').each((_, el) => {
            if (found) return;
            const m = $(el).text().trim().match(GROUP_RE);
            if (m) found = `Grupo ${m[1].toUpperCase()}`;
        });
        if (found) return found;
    }
    return `Grupo ${String.fromCharCode(65 + fallbackIdx)}`;
}