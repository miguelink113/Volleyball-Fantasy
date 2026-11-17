
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StandingWithTeam } from '@/lib/repositories/standings.repository';

export function StandingsTable({ seasonId }: { seasonId: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlGroup = searchParams.get('group');
    const queryString = searchParams.toString();

    const [standings, setStandings] = useState<StandingWithTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        async function loadStandings() {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `/api/standings?seasonId=${encodeURIComponent(seasonId)}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error(`Error cargando clasificación: ${response.status}`);
                }

                const data = await response.json();

                if (!Array.isArray(data)) {
                    throw new Error('Respuesta inválida del servidor');
                }

                setStandings(data);
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return;

                setError(err instanceof Error ? err.message : 'Error desconocido');
                setStandings([]);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        loadStandings();

        return () => controller.abort();
    }, [seasonId]);

    const groups = useMemo(
        () => Array.from(
            new Set(
                standings
                    .map(row => row.group_name)
                    .filter((group): group is string => Boolean(group))
            )
        ),
        [standings]
    );

    const activeGroup =
        urlGroup && groups.includes(urlGroup)
            ? urlGroup
            : groups[0] ?? null;

    // Mantiene el grupo seleccionado sincronizado con la URL.
    useEffect(() => {
        if (loading || !activeGroup || urlGroup === activeGroup) return;

        const next = new URLSearchParams(queryString);
        next.set('group', activeGroup);
        router.replace(`/results?${next.toString()}`, { scroll: false });
    }, [loading, activeGroup, urlGroup, queryString, router]);

    const displayed = activeGroup
        ? standings.filter(row => row.group_name === activeGroup)
        : standings;

    const handleGroupChange = (group: string) => {
        const next = new URLSearchParams(queryString);
        next.set('group', group);
        router.push(`/results?${next.toString()}`, { scroll: false });
    };

    if (loading) {
        return <div className="p-4 text-sm text-slate-500">Cargando clasificación...</div>;
    }

    if (error) {
        return <div className="p-4 text-sm text-red-600">{error}</div>;
    }

    if (!standings.length) {
        return <div className="p-4 text-sm text-slate-500">Sin datos.</div>;
    }

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-800">Clasificación</h2>

                {groups.length > 1 && (
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-md">
                        {groups.map(group => (
                            <button
                                key={group}
                                onClick={() => handleGroupChange(group)}
                                className={`px-3 py-1 text-xs font-semibold rounded ${
                                    activeGroup === group
                                        ? 'bg-white text-violet-700 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {group}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50/50 uppercase">
                    <tr>
                        <th className="px-2 py-3 text-center w-8">#</th>
                        <th className="px-2 py-3">Equipo</th>
                        <th className="px-2 py-3 text-center" title="Jugados">PJ</th>
                        <th className="px-2 py-3 text-center" title="Ganados">PG</th>
                        <th className="px-2 py-3 text-center" title="Perdidos">PP</th>
                        <th className="px-2 py-3 text-center" title="Sets a Favor">SF</th>
                        <th className="px-2 py-3 text-center" title="Sets en Contra">SC</th>
                        <th className="px-2 py-3 text-center text-violet-700 font-bold" title="Puntos">Pts</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {displayed.map(row => (
                        <tr key={row.team.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-2 py-2 text-center font-medium text-slate-400">
                                {row.position}
                            </td>
                            <td className="px-2 py-2">
                                    <span className="font-medium text-slate-700">
                                        {row.team.name}
                                    </span>
                            </td>
                            <td className="px-2 py-2 text-center text-slate-600">{row.matches_played}</td>
                            <td className="px-2 py-2 text-center text-slate-600">{row.matches_won}</td>
                            <td className="px-2 py-2 text-center text-slate-600">{row.matches_lost}</td>
                            <td className="px-2 py-2 text-center text-slate-600">{row.sets_won}</td>
                            <td className="px-2 py-2 text-center text-slate-600">{row.sets_lost}</td>
                            <td className="px-2 py-2 text-center font-bold text-violet-700 bg-violet-50/30">
                                {row.points}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
