
import { ESVOLEY_GROUPS } from "../../lib/scraper/esvoley-groups";

async function main() {
    for (const [competitionId, competition] of Object.entries(ESVOLEY_GROUPS)) {
        console.log(`\n=== ${competition.name} (competición ${competitionId}) ===`);

        for (const group of competition.groups) {
            console.log(`\nGrupo: ${group.name} | ID esvoley: ${group.id}`);

            try {
                const response = await fetch(
                    `https://intranet.esvoley.es/api/competiciones/getJornadasCalendario?grupoId=${group.id}`,
                    {
                        headers: {
                            Accept: "*/*",
                            Origin: "https://esvoley.es",
                            Referer: "https://esvoley.es/",
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const json = await response.json() as any;
                const matches = json.content?.flatMap(
                    (round: any) => round.partidos ?? []
                ) ?? [];

                console.log(`Partidos encontrados: ${matches.length}`);

                console.table(matches.slice(0, 5).map((match: any) => ({
                    fecha: match.fecha_hora,
                    local: match.equipo_local,
                    visitante: match.equipo_visitante,
                    id: match.id,
                    resultado: JSON.stringify(
                        Object.fromEntries(
                            Object.entries(match).filter(([key]) =>
                                /resultado|set|puntos|ganador|final|marcador/i.test(key)
                            )
                        )
                    ),
                })));

            } catch (error) {
                console.error("ERROR:", error);
            }
        }
    }
}

main().catch(console.error);
