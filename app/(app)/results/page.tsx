import { createClient } from '@supabase/supabase-js';
import { CompetitionSelector } from '@/components/results/CompetitionSelector';
import { StandingsTable } from '@/components/results/StandingsTable';
import { RoundSelector } from '@/components/results/RoundSelector';
import { MatchList, type MatchData } from '@/components/results/MatchList';

export const dynamic = 'force-dynamic';

export default async function ResultsPage({
                                              searchParams,
                                          }: {
    searchParams: Promise<{ seasonId?: string; round?: string }>;
}) {
    const sp = await searchParams;
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!,
    );

    // 1. Competiciones con temporada activa
    const { data: seasons } = await supabase
        .from('seasons')
        .select('id, name, competition:competitions(name)')
        .eq('is_current', true);

    const options = (seasons ?? []).map((s: any) => ({
        seasonId: s.id,
        seasonName: s.name,
        competitionName: s.competition?.name ?? '—',
    }));

    const currentSeasonId = sp.seasonId ?? options[0]?.seasonId;
    const current = options.find((o) => o.seasonId === currentSeasonId);

    // 2. Obtener Jornadas de la temporada (incluyendo el nombre del grupo)
    const { data: dbRounds } = await supabase
        .from('rounds')
        .select('id, round_number, group_name')
        .eq('season_id', currentSeasonId)
        .order('round_number');

    // Agrupar para el selector visual (Jornada 1, 2, 3...)
    const uniqueRoundsMap = new Map<number, any>();
    (dbRounds || []).forEach(r => {
        if (!uniqueRoundsMap.has(r.round_number)) {
            uniqueRoundsMap.set(r.round_number, {
                number: r.round_number,
                label: r.round_number <= 22 ? `Jornada ${r.round_number}` : r.round_number === 23 ? "Cuartos" : r.round_number === 24 ? "Semis" : "Final"
            });
        }
    });

    const rounds = Array.from(uniqueRoundsMap.values()).sort((a, b) => a.number - b.number);

    // Jornada seleccionada
    const selectedRoundNumber = sp.round ? parseInt(sp.round, 10) : rounds[0]?.number;

    // 3. Buscar TODOS los IDs de ronda que pertenezcan a esa jornada (Grupo A, B, C...)
    const roundIdsForSelectedRound = (dbRounds || [])
        .filter(r => r.round_number === selectedRoundNumber)
        .map(r => r.id);

    // 4. Obtener Partidos (con JOIN nativo y trayendo el round_id)
    const { data: dbMatches, error: matchError } = await supabase
        .from('matches')
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
        .in('round_id', roundIdsForSelectedRound)
        .order('match_date');

    if (matchError) {
        return (
            <main className="min-h-screen bg-slate-50 p-8">
                <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg">
                    <h2 className="text-lg font-bold mb-2">Error cargando partidos de Supabase</h2>
                    <pre className="text-sm bg-red-100 p-3 rounded overflow-auto">{JSON.stringify(matchError, null, 2)}</pre>
                </div>
            </main>
        );
    }

    // Creamos un mapa para saber qué group_name tiene cada round_id
    const roundGroupMap = new Map((dbRounds || []).map(r => [r.id, r.group_name]));

    const matches: MatchData[] = (dbMatches || []).map((m: any) => ({
        id: m.id,
        home_team_name: m.home_team?.name ?? 'Desconocido',
        away_team_name: m.away_team?.name ?? 'Desconocido',
        home_sets: m.home_sets,
        away_sets: m.away_sets,
        status: m.status,
        match_date: m.match_date,
        group_name: roundGroupMap.get(m.round_id) || null, // <-- Asignamos el grupo
    }));

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 py-6">

                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Resultados</h1>
                        {current && (
                            <p className="text-sm text-slate-500">
                                {current.competitionName} · {current.seasonName}
                            </p>
                        )}
                    </div>
                    <CompetitionSelector options={options} currentSeasonId={currentSeasonId} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Columna Izquierda: Partidos y Selector */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                            <h2 className="font-semibold text-slate-800 pl-2">Partidos</h2>
                            <RoundSelector rounds={rounds} currentRoundNumber={selectedRoundNumber} />
                        </div>
                        <MatchList matches={matches} />
                    </div>

                    {/* Columna Derecha: Clasificación */}
                    <div className="lg:col-span-1">
                        <StandingsTable seasonId={currentSeasonId} />
                    </div>
                </div>
            </div>
        </main>
    );
}