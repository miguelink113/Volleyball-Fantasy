
import { createAdminClient } from "@/lib/supabase/admin.server";
import { CompetitionSelector } from "@/components/results/CompetitionSelector";
import { StandingsTable } from "@/components/results/StandingsTable";
import { RoundSelector } from "@/components/results/RoundSelector";
import { MatchList, type MatchData } from "@/components/results/MatchList";
import { getRoundLabel } from "@/lib/utils/round-label";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
                                              searchParams,
                                          }: {
    searchParams: Promise<{
        seasonId?: string;
        round?: string;
        group?: string;
    }>;
}) {
    const sp = await searchParams;
    const supabase = createAdminClient();

    // 1. Obtener temporadas activas.
    const { data: seasons, error: seasonsError } = await supabase
        .from("seasons")
        .select("id, name, competition:competitions(name)")
        .eq("is_current", true);

    if (seasonsError) {
        return (
            <main className="min-h-screen bg-slate-50 p-8">
                <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg">
                    Error cargando las temporadas.
                </div>
            </main>
        );
    }

    const options = (seasons ?? []).map((season: any) => ({
        seasonId: season.id,
        seasonName: season.name,
        competitionName: season.competition?.name ?? "—",
    }));

    // 2. Seleccionar la temporada solicitada o la primera disponible.
    const current =
        options.find(option => option.seasonId === sp.seasonId) ??
        options[0];

    const currentSeasonId = current?.seasonId;

    if (!currentSeasonId) {
        return (
            <main className="min-h-screen bg-slate-50 p-8">
                <div className="max-w-3xl mx-auto bg-white border border-slate-200 p-6 rounded-lg">
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">
                        Resultados
                    </h1>
                    <p className="text-sm text-slate-500">
                        No hay temporadas activas disponibles.
                    </p>
                </div>
            </main>
        );
    }

    // 3. Obtener jornadas de la temporada.
    const { data: dbRounds, error: roundsError } = await supabase
        .from("rounds")
        .select("id, round_number, group_name")
        .eq("season_id", currentSeasonId)
        .order("round_number");

    if (roundsError) {
        return (
            <main className="min-h-screen bg-slate-50 p-8">
                <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg">
                    Error cargando las jornadas.
                </div>
            </main>
        );
    }

    // Agrupar jornadas de distintos grupos por número.
    const uniqueRoundsMap = new Map<number, {
        number: number;
        label: string;
    }>();

    (dbRounds ?? []).forEach(round => {
        if (!uniqueRoundsMap.has(round.round_number)) {
            uniqueRoundsMap.set(round.round_number, {
                number: round.round_number,
                label: getRoundLabel(round.round_number),
            });
        }
    });

    const rounds = Array.from(uniqueRoundsMap.values())
        .sort((a, b) => a.number - b.number);

    // 4. Validar la jornada seleccionada.
    const requestedRound = Number(sp.round);

    const selectedRoundNumber =
        sp.round &&
        Number.isInteger(requestedRound) &&
        requestedRound > 0 &&
        rounds.some(round => round.number === requestedRound)
            ? requestedRound
            : rounds[0]?.number;

    // Obtener todos los IDs de ronda correspondientes a esa jornada.
    const roundIdsForSelectedRound = (dbRounds ?? [])
        .filter(round => round.round_number === selectedRoundNumber)
        .map(round => round.id);

    // 5. Obtener partidos. Evitar consultas con listas vacías.
    const { data: dbMatches, error: matchError } =
        roundIdsForSelectedRound.length > 0
            ? await supabase
                .from("matches")
                .select(`
                    id,
                    round_id,
                    home_sets,
                    away_sets,
                    status,
                    match_date,
                    home_team:teams!home_team_id(name),
                    away_team:teams!away_team_id(name)
                `)
                .in("round_id", roundIdsForSelectedRound)
                .order("match_date")
            : { data: [], error: null };

    if (matchError) {
        return (
            <main className="min-h-screen bg-slate-50 p-8">
                <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg">
                    <h2 className="text-lg font-bold mb-2">
                        Error cargando partidos de Supabase
                    </h2>
                    <pre className="text-sm bg-red-100 p-3 rounded overflow-auto">
                        {JSON.stringify(matchError, null, 2)}
                    </pre>
                </div>
            </main>
        );
    }

    // 6. Relacionar cada partido con su grupo.
    const roundGroupMap = new Map(
        (dbRounds ?? []).map(round => [
            round.id,
            round.group_name,
        ])
    );

    const matches: MatchData[] = (dbMatches ?? []).map((match: any) => ({
        id: match.id,
        home_team_name: match.home_team?.name ?? "Desconocido",
        away_team_name: match.away_team?.name ?? "Desconocido",
        home_sets: match.home_sets,
        away_sets: match.away_sets,
        status: match.status,
        match_date: match.match_date,
        group_name: roundGroupMap.get(match.round_id) ?? null,
    }));

    const activeGroup = sp.group ?? null;

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">
                            Resultados
                        </h1>

                        {current && (
                            <p className="text-sm text-slate-500">
                                {current.competitionName} · {current.seasonName}
                            </p>
                        )}
                    </div>

                    <CompetitionSelector
                        options={options}
                        currentSeasonId={currentSeasonId}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                            <h2 className="font-semibold text-slate-800 pl-2">
                                Partidos
                            </h2>

                            {rounds.length > 0 && (
                                <RoundSelector
                                    rounds={rounds}
                                    currentRoundNumber={selectedRoundNumber}
                                />
                            )}
                        </div>

                        {rounds.length > 0 ? (
                            <MatchList
                                matches={matches}
                                activeGroup={activeGroup}
                            />
                        ) : (
                            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                                No hay jornadas registradas para esta temporada.
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-1">
                        <StandingsTable seasonId={currentSeasonId} />
                    </div>
                </div>
            </div>
        </main>
    );
}
