"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {Copy, LogOut, AlertCircle, X} from "lucide-react";

interface LeagueManagerProps {
    isCreateLeagueOpen: boolean;
    onCloseCreateLeague: () => void;
}

export function LeagueManager({ isCreateLeagueOpen, onCloseCreateLeague }: LeagueManagerProps) {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [joinCode, setJoinCode] = useState("");

    const [competitions, setCompetitions] = useState<any[]>([]);
    const [selectedCompId, setSelectedCompId] = useState<string>("");
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
    const [round1Id, setRound1Id] = useState<string | null>(null);
    const [myLeagues, setMyLeagues] = useState<any[]>([]);

    const loadMyLeagues = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
            .from("private_league_members")
            .select(`league_id, role, private_leagues ( name, join_code )`)
            .eq("user_id", user.id);
        if (data) setMyLeagues(data);
    };

    useEffect(() => {
        async function fetchCompetitions() {
            const { data: seasons } = await supabase
                .from("seasons")
                .select(`id, name, competitions ( id, name, rfevb_id )`)
                .eq("is_current", true);

            if (seasons && seasons.length > 0) {
                const comps = seasons.map((s: any) => ({
                    id: s.competitions.id, name: s.competitions.name, rfevb_id: s.competitions.rfevb_id,
                    seasonId: s.id, seasonName: s.name
                }));
                setCompetitions(comps);
                setSelectedCompId(comps[0].id);
                setSelectedSeasonId(comps[0].seasonId);
            }
        }
        fetchCompetitions();
        loadMyLeagues();
    }, [supabase]);

    useEffect(() => {
        if (!selectedSeasonId) {
            setRound1Id(null);
            return;
        }
        async function fetchRound() {
            // Pedimos las jornadas 1, ordenadas por nombre de grupo, y cogemos solo la primera
            const { data: rounds, error } = await supabase
                .from("rounds")
                .select("id")
                .eq("season_id", selectedSeasonId)
                .eq("round_number", 1)
                .order("group_name", { ascending: true })
                .limit(1);

            // Si hay al menos una, usamos su ID
            setRound1Id(rounds && rounds.length > 0 ? rounds[0].id : null);
        }
        fetchRound();
    }, [selectedSeasonId, supabase]);

    const handleCreateLeague = async () => {
        if (!round1Id || !selectedCompId || !selectedSeasonId) return setError("No hay jornada disponible para esta competición.");
        setLoading(true); setError(null);
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data, error } = await supabase.rpc("create_private_league", {
            p_competition_id: selectedCompId, p_season_id: selectedSeasonId,
            p_name: "Mi Liga de Amigos", p_join_code: code, p_round_id: round1Id,
        });
        if (error) { setError(error.message); setLoading(false); return; }
        router.push(`/fantasy?league_id=${data}`);
    };

    const handleJoinLeague = async () => {
        if (!joinCode) return;
        setLoading(true); setError(null);
        // El RPC join_private_league debería calcular la jornada internamente
        // basándose en el código, o podemos pasarle un null si no la necesita.
        // Asumiremos que el RPC funciona solo con el código.
        const { data, error } = await supabase.rpc("join_private_league", {
            p_join_code: joinCode.toUpperCase(),
            p_round_id: null // Pasamos null para que el backend decida
        });
        if (error) { setError(error.message); setLoading(false); return; }
        router.push(`/fantasy?league_id=${data}`);
    };

    const handleLeaveLeague = async (leagueId: string) => {
        if (!confirm("¿Seguro que quieres salir de esta liga? Se borrará tu equipo.")) return;
        setLoading(true);
        const { error } = await supabase.rpc("leave_private_league", { p_league_id: leagueId });
        if (error) { setError(error.message); setLoading(false); return; }
        await loadMyLeagues(); setLoading(false);
    };

    return (
        <div id="league-management" className="space-y-8">
            {myLeagues.length > 0 && (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {myLeagues.map((member) => (
                            <div key={member.league_id} className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="mb-6">
                                    <div className="mb-4 flex items-start justify-between gap-3">
                                        <p className="font-semibold text-slate-900">{member.private_leagues.name}</p>
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">{member.role}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
                                        <span>{member.private_leagues.join_code}</span>
                                        <button
                                            aria-label="Copiar código de liga"
                                            className="text-slate-400 transition-colors hover:text-slate-900"
                                            onClick={() => navigator.clipboard.writeText(member.private_leagues.join_code)}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => router.push(`/fantasy?league_id=${member.league_id}`)}
                                        className="flex-1 rounded-md bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                                    >
                                        Jugar
                                    </button>
                                    <button
                                        onClick={() => handleLeaveLeague(member.league_id)}
                                        disabled={loading}
                                        aria-label="Salir de la liga"
                                        className="rounded-md border border-slate-200 px-3 py-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                                    >
                                        <LogOut className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {isCreateLeagueOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="league-modal-title"
                >
                    <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
                        <button
                            type="button"
                            onClick={onCloseCreateLeague}
                            aria-label="Cerrar modal"
                            className="absolute right-4 top-4 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <div className="mb-6 pr-8">
                            <h2 id="league-modal-title" className="text-lg font-semibold text-slate-900">Nueva liga</h2>
                            <p className="mt-1 text-sm text-slate-500">Crea una liga o únete con un código.</p>
                        </div>
                        {error && (
                            <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}
                        <div className="space-y-5">
                            <div>
                                <h3 className="mb-3 font-semibold text-slate-900">Crear nueva liga</h3>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Competición</label>
                                <select
                                    value={selectedCompId}
                                    onChange={(e) => {
                                        const comp = competitions.find(c => c.id === e.target.value);
                                        if (comp) { setSelectedCompId(comp.id); setSelectedSeasonId(comp.seasonId); }
                                    }}
                                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                >
                                    {competitions.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.seasonName})</option>
                                    ))}
                                </select>
                                {!round1Id && (
                                    <p className="mt-2 text-xs text-amber-600">
                                        Esta competición aún no tiene jornadas programadas.
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={handleCreateLeague}
                                    disabled={loading || !round1Id}
                                    className="mt-4 w-full rounded-md bg-slate-900 py-2.5 font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {loading ? "Creando..." : "Crear Liga"}
                                </button>
                            </div>

                            <div className="border-t border-slate-200 pt-5">
                                <h3 className="mb-3 font-semibold text-slate-900">Unirse a una liga</h3>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Código de liga</label>
                                <input
                                    type="text"
                                    placeholder="Ej: ABC123"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value)}
                                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                                <button
                                    type="button"
                                    onClick={handleJoinLeague}
                                    disabled={loading || !joinCode}
                                    className="mt-4 w-full rounded-md bg-slate-900 py-2.5 font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {loading ? "Uniéndose..." : "Unirse"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}