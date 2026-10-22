import { FantasyTeamBuilder } from "@/components/fantasy/FantasyTeamBuilder";

export default async function FantasyPage({
                                              searchParams,
                                          }: {
    searchParams: Promise<{ league_id?: string }>;
}) {
    const params = await searchParams;
    const leagueId = params.league_id;

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
            <div className="mx-auto max-w-7xl">
                <header className="mb-8 rounded-2xl bg-slate-900 px-6 py-6 text-white shadow-lg">
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Temporada 25-26</p>
                    <h1 className="mt-3 text-4xl font-bold">Fantasy de voleibol</h1>
                    <p className="mt-2 max-w-2xl text-slate-300">
                        Gestiona tu plantilla, valida la alineación obligatoria y revisa la puntuación de cada jornada.
                    </p>
                </header>

                {leagueId ? (
                    <FantasyTeamBuilder leagueId={leagueId} />
                ) : (
                    <div className="bg-white p-6 rounded-lg text-center text-red-600 shadow-sm">
                        No se ha seleccionado ninguna liga. Ve al Dashboard y crea o únete a una.
                    </div>
                )}
            </div>
        </main>
    );
}