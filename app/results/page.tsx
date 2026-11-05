import { createClient } from '@supabase/supabase-js';
import { CompetitionSelector } from '@/components/results/CompetitionSelector';
import { StandingsTable } from '@/components/results/StandingsTable';
// import { MatchList } from '@/components/results/MatchList'; // pendiente de A y B

export const dynamic = 'force-dynamic';

export default async function ResultsPage({
                                              searchParams,
                                          }: {
    searchParams: Promise<{ seasonId?: string }>;
}) {
    const sp = await searchParams;
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!,
    );

    // Competiciones con temporada activa
    const { data: seasons } = await supabase
        .from('seasons')
        .select('id, name, competition:competitions(name)')
        .eq('is_current', true);

    const options = (seasons ?? []).map((s: any) => ({
        seasonId: s.id,
        seasonName: s.name,
        competitionName: s.competition?.name ?? '—',
    }));

    // Temporada seleccionada (por query param o la primera)
    const currentSeasonId = sp.seasonId ?? options[0]?.seasonId;
    const current = options.find((o) => o.seasonId === currentSeasonId);

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex items-center justify-between mb-6">
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
                    <div className="lg:col-span-2 space-y-4">
                        {/* TODO: <MatchList seasonId={currentSeasonId} /> */}
                        <div className="bg-white rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
                            Lista de partidos y navegador de jornadas — pendiente de integrar.
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <StandingsTable seasonId={currentSeasonId} />
                    </div>
                </div>
            </div>
        </main>
    );
}