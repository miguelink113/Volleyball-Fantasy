'use client';

import { useEffect, useState } from 'react';
import {StandingWithTeam} from "@/lib/repositories/standings.repository";

export function StandingsTable({ seasonId }: { seasonId: string }) {
    const [standings, setStandings] = useState<StandingWithTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeGroup, setActiveGroup] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/standings?seasonId=${seasonId}`)
            .then((res) => res.json())
            .then((data) => {
                setStandings(data);
                const groups = Array.from(new Set(data.map((r: StandingWithTeam) => r.group_name).filter(Boolean)));
                setActiveGroup(groups.length > 0 ? (groups[0] as string) : null);
            })
            .finally(() => setLoading(false));
    }, [seasonId]);

    if (loading) return <div className="p-4 text-sm text-slate-500">Cargando clasificación...</div>;
    if (!standings.length) return <div className="p-4 text-sm text-slate-500">Sin datos.</div>;

    const groups = Array.from(new Set(standings.map((r) => r.group_name).filter(Boolean)));
    const isMultiGroup = groups.length > 0;
    const displayed = isMultiGroup
        ? standings.filter((r) => r.group_name === activeGroup)
        : standings;

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-800">Clasificación</h2>
                {isMultiGroup && (
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-md">
                        {groups.map((g) => (
                            <button
                                key={g}
                                onClick={() => setActiveGroup(g as string)}
                                className={`px-3 py-1 text-xs font-semibold rounded ${
                                    activeGroup === g
                                        ? 'bg-white text-violet-700 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {g}
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
                    {displayed.map((row) => (
                        <tr key={row.team.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-2 py-2 text-center font-medium text-slate-400">
                                {row.position}
                            </td>
                            <td className="px-2 py-2">
                                <div className="flex items-center gap-2">
                                    {/* Si tienes logos, descomenta: */}
                                    {/* {row.team.logo_url && <img src={row.team.logo_url} className="w-5 h-5 object-contain" alt="" />} */}
                                    <span className="font-medium text-slate-700">{row.team.name}</span>
                                </div>
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