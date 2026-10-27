"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LeagueManager() {
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
        if (!selectedSeasonId) return;
        async function fetchRound() {
            const { data: round } = await supabase
                .from("rounds")
                .select("id")
                .eq("season_id", selectedSeasonId)
                .eq("round_number", 1)
                .maybeSingle();
            setRound1Id(round ? round.id : null);
        }
        fetchRound();
    }, [selectedSeasonId, supabase]);

    const handleCreateLeague = async () => {
        if (!round1Id || !selectedCompId || !selectedSeasonId) return setError("No hay jornada disponible.");
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
        if (!joinCode || !round1Id) return;
        setLoading(true); setError(null);
        const { data, error } = await supabase.rpc("join_private_league", {
            p_join_code: joinCode.toUpperCase(), p_round_id: round1Id,
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
        <div className="space-y-8">
            {myLeagues.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Mis Ligas</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                        {myLeagues.map((member) => (
                            <div key={member.league_id} className="flex flex-col justify-between border border-slate-200 p-4 rounded-lg bg-slate-50">
                                <div>
                                    <p className="font-bold text-slate-900">{member.private_leagues.name}</p>
                                    <p className="text-sm text-slate-500 mb-3">Código: {member.private_leagues.join_code} · Rol: {member.role}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => router.push(`/fantasy?league_id=${member.league_id}`)}
                                        className="flex-1 bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition"
                                    >
                                        Jugar
                                    </button>
                                    <button
                                        onClick={() => handleLeaveLeague(member.league_id)}
                                        disabled={loading}
                                        className="bg-white border border-red-200 hover:bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                                    >
                                        Salir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Crear o Unirse</h3>
                {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="border border-slate-200 p-5 rounded-lg bg-slate-50">
                        <h4 className="font-bold text-slate-800 mb-3">Crear nueva liga</h4>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Competición</label>
                            <select
                                value={selectedCompId}
                                onChange={(e) => {
                                    const comp = competitions.find(c => c.id === e.target.value);
                                    if (comp) { setSelectedCompId(comp.id); setSelectedSeasonId(comp.seasonId); }
                                }}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                            >
                                {competitions.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.seasonName})</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={handleCreateLeague} disabled={loading || !round1Id} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg font-bold transition disabled:opacity-50">
                            {loading ? "Creando..." : "Crear Liga"}
                        </button>
                    </div>

                    <div className="border border-slate-200 p-5 rounded-lg bg-slate-50">
                        <h4 className="font-bold text-slate-800 mb-3">Unirse a una liga</h4>
                        <input
                            type="text" placeholder="Código (Ej: ABC123)" value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4 text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <button onClick={handleJoinLeague} disabled={loading || !joinCode || !round1Id} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-bold transition disabled:opacity-50">
                            {loading ? "Uniéndose..." : "Unirse"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}