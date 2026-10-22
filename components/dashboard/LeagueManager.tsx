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

    const [compId, setCompId] = useState<string | null>(null);
    const [seasonId, setSeasonId] = useState<string | null>(null);
    const [round1Id, setRound1Id] = useState<string | null>(null);

    // Estado para las ligas del usuario
    const [myLeagues, setMyLeagues] = useState<any[]>([]);

    const loadMyLeagues = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Buscamos las ligas donde el usuario es miembro
        const { data } = await supabase
            .from("private_league_members")
            .select(`
                league_id,
                role,
                private_leagues ( name, join_code )
            `)
            .eq("user_id", user.id);

        if (data) setMyLeagues(data);
    };

    useEffect(() => {
        async function fetchIds() {
            const { data: comp } = await supabase.from("competitions").select("id").eq("rfevb_id", "152").single();
            if (comp) {
                setCompId(comp.id);
                const { data: season } = await supabase.from("seasons").select("id").eq("competition_id", comp.id).eq("rfevb_id", "186").single();
                if (season) {
                    setSeasonId(season.id);
                    const { data: round } = await supabase.from("rounds").select("id").eq("season_id", season.id).eq("round_number", 1).single();
                    if (round) setRound1Id(round.id);
                }
            }
        }
        fetchIds();
        loadMyLeagues();
    }, [supabase]);

    const handleCreateLeague = async () => {
        if (!round1Id || !compId || !seasonId) return;
        setLoading(true);
        setError(null);
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        const { data, error } = await supabase.rpc("create_private_league", {
            p_competition_id: compId,
            p_season_id: seasonId,
            p_name: "Mi Liga de Amigos",
            p_join_code: code,
            p_round_id: round1Id,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }
        router.push(`/fantasy?league_id=${data}`);
    };

    const handleJoinLeague = async () => {
        if (!joinCode || !round1Id) return;
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.rpc("join_private_league", {
            p_join_code: joinCode.toUpperCase(),
            p_round_id: round1Id,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }
        router.push(`/fantasy?league_id=${data}`);
    };

    const handleLeaveLeague = async (leagueId: string) => {
        if (!confirm("¿Seguro que quieres salir de esta liga? Se borrará tu equipo.")) return;
        setLoading(true);
        const { error } = await supabase.rpc("leave_private_league", { p_league_id: leagueId });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }
        await loadMyLeagues(); // Recargamos la lista
        setLoading(false);
    };

    return (
        <div className="space-y-6 mb-6">
            {/* Listado de ligas */}
            {myLeagues.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Mis Ligas</h3>
                    <div className="space-y-3">
                        {myLeagues.map((member) => (
                            <div key={member.league_id} className="flex items-center justify-between border p-3 rounded bg-gray-50">
                                <div>
                                    <p className="font-semibold text-gray-800">{member.private_leagues.name}</p>
                                    <p className="text-sm text-gray-500">Código: {member.private_leagues.join_code} · Rol: {member.role}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => router.push(`/fantasy?league_id=${member.league_id}`)}
                                        className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1 rounded text-sm transition"
                                    >
                                        Jugar
                                    </button>
                                    <button
                                        onClick={() => handleLeaveLeague(member.league_id)}
                                        disabled={loading}
                                        className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm transition disabled:opacity-50"
                                    >
                                        Salir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Crear / Unirse */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Crear o Unirse</h3>
                {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="border border-gray-200 p-4 rounded bg-gray-50">
                        <h4 className="font-medium text-gray-800 mb-2">Crear nueva liga</h4>
                        <button onClick={handleCreateLeague} disabled={loading || !round1Id} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition disabled:opacity-50">
                            {loading ? "Creando..." : "Crear Liga"}
                        </button>
                    </div>

                    <div className="border border-gray-200 p-4 rounded bg-gray-50">
                        <h4 className="font-medium text-gray-800 mb-2">Unirse a una liga</h4>
                        <input type="text" placeholder="Código (Ej: ABC123)" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} className="w-full px-3 py-2 border rounded mb-3 text-gray-800 uppercase" />
                        <button onClick={handleJoinLeague} disabled={loading || !joinCode || !round1Id} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded transition disabled:opacity-50">
                            {loading ? "Uniéndose..." : "Unirse"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}