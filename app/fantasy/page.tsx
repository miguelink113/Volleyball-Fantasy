import { FantasyTeamBuilder } from "@/components/fantasy/FantasyTeamBuilder";
import Link from "next/link";

export default async function FantasyPage({
                                              searchParams,
                                          }: {
    searchParams: Promise<{ league_id?: string }>;
}) {
    const params = await searchParams;
    const leagueId = params.league_id;

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
            <div className="mx-auto max-w-7xl">
                <div className="mb-4">
                    <Link
                        href="/dashboard"
                        className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition"
                    >
                        ← Volver al Dashboard
                    </Link>
                </div>

                {leagueId ? (
                    <FantasyTeamBuilder leagueId={leagueId} />
                ) : (
                    <div className="bg-white p-8 rounded-xl text-center text-slate-500 shadow-sm border border-slate-200">
                        <p className="text-lg">No se ha seleccionado ninguna liga.</p>
                        <Link href="/dashboard" className="inline-block mt-4 rounded bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800">
                            Ir a mis ligas
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}