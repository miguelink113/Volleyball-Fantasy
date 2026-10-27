"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateLineup, validateRosterSize, type FantasyDemoPlayer } from "@/lib/services/fantasy/fantasy-team.service";
import type { PlayerPosition } from "@/domain/player/player.types";

function displayPosition(position: PlayerPosition): string {
    return position === "unknown" ? "DESCONOCIDO" : position;
}

export function FantasyTeamBuilder({ leagueId }: { leagueId: string }) {
    const supabase = createClient();

    // Estados de carga
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Pestaña activa
    const [activeTab, setActiveTab] = useState<"lineup" | "market" | "ranking">("lineup");

    // Contexto
    const [teamId, setTeamId] = useState<string>("");
    const [seasonUuid, setSeasonUuid] = useState<string>("");
    const [competitionRfevbId, setCompetitionRfevbId] = useState<number | null>(null);
    const [seasonRfevbId, setSeasonRfevbId] = useState<number | null>(null);
    const [seasonName, setSeasonName] = useState<string>("");
    const [selectedRound, setSelectedRound] = useState<number>(1);

    // Datos
    const [catalogPlayers, setCatalogPlayers] = useState<FantasyDemoPlayer[]>([]);
    const [rosterIds, setRosterIds] = useState<string[]>([]);
    const [lineupIds, setLineupIds] = useState<string[]>([]);
    const [budget, setBudget] = useState<number>(0);
    const [teamName, setTeamName] = useState<string>("");

    // Jornadas y puntuaciones REALES
    const [rounds, setRounds] = useState<Array<{ number: number, label: string, isLocked: boolean }>>([]);
    const [myRealScores, setMyRealScores] = useState<Record<number, number>>({});
    const [ranking, setRanking] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Cargar equipo
            const teamRes = await fetch(`/api/fantasy-team?league_id=${leagueId}`);
            const teamPayload = await teamRes.json();
            if (!teamRes.ok || !teamPayload.success) throw new Error(teamPayload.error);

            setTeamId(teamPayload.team.id);
            setSeasonUuid(teamPayload.season_id);
            setCompetitionRfevbId(teamPayload.competition_rfevb_id);
            setSeasonRfevbId(teamPayload.season_rfevb_id);
            setSeasonName(teamPayload.season_name || `Temporada ${teamPayload.season_rfevb_id}`);
            setBudget(teamPayload.team.budget);
            setTeamName(teamPayload.team.name);

            const activeIds = teamPayload.activePlayerIds;
            const loadedLineup = teamPayload.lineupPlayerIds || [];
            const cleanLineup = loadedLineup.filter((id: string) => activeIds.includes(id));

            setRosterIds(activeIds);
            setLineupIds(cleanLineup);

            // 2. Cargar catálogo
            const rosterRes = await fetch(`/api/competition-roster?competition=${teamPayload.competition_rfevb_id}`);
            const rosterPayload = await rosterRes.json();
            const teamsById = new Map(rosterPayload.teams.map((t: any) => [t.id, t.name]));
            setCatalogPlayers(rosterPayload.players.map((p: any) => ({
                id: p.id, name: p.displayName, club: teamsById.get(p.currentTeamId ?? "") ?? "?", position: p.position, price: p.price, season: "", weeklyScores: {},
            })));

            // 3. Cargar puntuaciones reales y ranking
            const scoresRes = await fetch(`/api/league-scores?league_id=${leagueId}`);
            const scoresPayload = await scoresRes.json();
            if (scoresPayload.success) setMyRealScores(scoresPayload.scores);

            const rankRes = await fetch(`/api/league-ranking?league_id=${leagueId}`);
            const rankPayload = await rankRes.json();
            if (rankPayload.success) setRanking(rankPayload.ranking);

            // 4. Cargar jornadas y ver cuáles están bloqueadas
            const { data: dbRounds } = await supabase
                .from("rounds")
                .select("round_number, starts_at, ends_at")
                .eq("season_id", teamPayload.season_id)
                .order("round_number");

            const now = new Date();
            const formattedRounds = (dbRounds || []).map(r => {
                const isLocked = now >= new Date(r.starts_at) && now <= new Date(r.ends_at);
                return {
                    number: r.round_number,
                    label: r.round_number <= 22 ? `Jornada ${r.round_number}` : r.round_number === 23 ? "Cuartos" : r.round_number === 24 ? "Semis" : "Final",
                    isLocked
                };
            });
            setRounds(formattedRounds);
            if (formattedRounds.length > 0) setSelectedRound(formattedRounds[0].number);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [leagueId]);

    // Lógica de Alineación
    const toggleLineup = (playerId: string) => {
        if (lineupIds.includes(playerId)) {
            setLineupIds(lineupIds.filter(id => id !== playerId));
        } else {
            if (lineupIds.length >= 7) return alert("Máximo 7 titulares.");
            setLineupIds([...lineupIds, playerId]);
        }
    };

    const handleSaveLineup = async () => {
        const roundObj = rounds.find(r => r.number === selectedRound);
        if (roundObj?.isLocked) return alert("La jornada está bloqueada.");

        const validation = validateLineup(lineupIds, rosterPlayers);
        if (!validation.valid) return setError("Alineación inválida: " + validation.errors.join(", "));

        setActionLoading(true);
        const { data: roundData } = await supabase.from("rounds").select("id").eq("season_id", seasonUuid).eq("round_number", selectedRound).single();

        const { error: rpcError } = await supabase.rpc("save_lineup", {
            p_fantasy_team_id: teamId, p_round_id: roundData?.id, p_player_ids: lineupIds
        });

        if (rpcError) setError(rpcError.message);
        else alert("✅ Alineación guardada");
        setActionLoading(false);
    };

    // Lógica de Mercado
    const handleTransfer = async (playerId: string, type: "BUY" | "SELL") => {
        setActionLoading(true);
        const { data: roundData } = await supabase.from("rounds").select("id").eq("season_id", seasonUuid).eq("round_number", selectedRound).single();

        const { error: rpcError } = await supabase.rpc("transfer_player", {
            p_fantasy_team_id: teamId, p_player_id: playerId, p_round_id: roundData?.id, p_type: type,
        });

        if (rpcError) setError(rpcError.message);
        else await loadData();
        setActionLoading(false);
    };

    // Helpers
    const playerMap = useMemo(() => new Map(catalogPlayers.map((p) => [p.id, p])), [catalogPlayers]);
    const rosterPlayers = useMemo(() => rosterIds.flatMap(id => playerMap.get(id) ? [playerMap.get(id)!] : []), [playerMap, rosterIds]);
    const lineupPlayers = useMemo(() => lineupIds.flatMap(id => playerMap.get(id) ? [playerMap.get(id)!] : []), [lineupIds, playerMap]);
    const lineupValidation = useMemo(() => validateLineup(lineupIds, rosterPlayers), [lineupIds, rosterPlayers]);
    const currentRoundObj = rounds.find(r => r.number === selectedRound);

    if (loading) return <div className="p-10 text-center animate-pulse">Cargando Fantasy...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* CABECERA */}
            <header className="bg-slate-900 text-white rounded-xl p-6 shadow-lg flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{teamName}</h1>
                    <p className="text-slate-400 mt-1">{seasonName}</p>
                </div>
                <div className="flex gap-6 text-right">
                    <div>
                        <p className="text-sm text-slate-400">Presupuesto</p>
                        <p className="text-2xl font-bold text-emerald-400">{budget.toFixed(1)}M</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">Plantilla</p>
                        <p className="text-2xl font-bold">{rosterIds.length}/14</p>
                    </div>
                </div>
            </header>

            {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg">⚠️ {error}</div>}

            {/* SELECTOR DE JORNADA */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <label className="font-semibold text-slate-700">Jornada a gestionar:</label>
                <select
                    value={selectedRound}
                    onChange={(e) => setSelectedRound(Number(e.target.value))}
                    className="border p-2 rounded-md font-medium"
                >
                    {rounds.map(r => <option key={r.number} value={r.number}>{r.label} {r.isLocked ? "🔒" : ""}</option>)}
                </select>
                {currentRoundObj?.isLocked && <span className="text-amber-600 text-sm font-bold">Las transferencias y alineaciones están cerradas.</span>}
            </div>

            {/* PESTAÑAS */}
            <div className="flex gap-2 border-b border-slate-200">
                <button onClick={() => setActiveTab("lineup")} className={`px-4 py-2 font-semibold ${activeTab === "lineup" ? "border-b-2 border-violet-600 text-violet-600" : "text-slate-500"}`}>Mi Alineación</button>
                <button onClick={() => setActiveTab("market")} className={`px-4 py-2 font-semibold ${activeTab === "market" ? "border-b-2 border-violet-600 text-violet-600" : "text-slate-500"}`}>Mercado</button>
                <button onClick={() => setActiveTab("ranking")} className={`px-4 py-2 font-semibold ${activeTab === "ranking" ? "border-b-2 border-violet-600 text-violet-600" : "text-slate-500"}`}>Clasificación</button>
            </div>

            {/* CONTENIDO: ALINEACIÓN */}
            {activeTab === "lineup" && (
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg mb-4 text-slate-800">Plantilla ({rosterIds.length})</h3>
                        <div className="space-y-2">
                            {rosterPlayers.map(p => {
                                const isTitular = lineupIds.includes(p.id);
                                return (
                                    <div key={p.id} className={`flex justify-between items-center p-3 rounded border ${isTitular ? 'bg-violet-50 border-violet-200' : 'bg-slate-50'}`}>
                                        <div>
                                            <p className="font-semibold text-slate-800">{p.name}</p>
                                            <p className="text-xs text-slate-500">{p.club} · {displayPosition(p.position)}</p>
                                        </div>
                                        <button onClick={() => toggleLineup(p.id)} disabled={currentRoundObj?.isLocked} className={`px-3 py-1 rounded text-sm font-medium ${isTitular ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                                            {isTitular ? 'Quitar' : 'Alinear'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg mb-4 text-slate-800">Titulares ({lineupIds.length}/7)</h3>
                        <div className="space-y-2 mb-4">
                            {lineupPlayers.map(p => (
                                <div key={p.id} className="flex justify-between p-3 bg-slate-50 rounded border border-slate-100">
                                    <span className="font-medium">{p.name}</span>
                                    <span className="text-sm text-slate-500">{displayPosition(p.position)}</span>
                                </div>
                            ))}
                            {lineupIds.length === 0 && <p className="text-slate-400 text-sm text-center py-4">Selecciona 7 jugadores de la izquierda</p>}
                        </div>

                        {lineupValidation.errors.length > 0 && (
                            <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">
                                {lineupValidation.errors.map(e => <p key={e}>• {e}</p>)}
                            </div>
                        )}

                        <button
                            onClick={handleSaveLineup}
                            disabled={actionLoading || lineupIds.length !== 7 || currentRoundObj?.isLocked}
                            className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50"
                        >
                            {actionLoading ? "Guardando..." : "Guardar Alineación"}
                        </button>
                    </div>
                </div>
            )}

            {/* CONTENIDO: MERCADO */}
            {activeTab === "market" && (
                <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">Mercado de Fichajes</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {catalogPlayers.map(p => {
                            const isOwned = rosterIds.includes(p.id);
                            return (
                                <div key={p.id} className="border p-3 rounded flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-sm">{p.name}</p>
                                        <p className="text-xs text-slate-500">{p.club} · {displayPosition(p.position)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-emerald-600 text-sm mb-1">{p.price}M</p>
                                        <button
                                            onClick={() => handleTransfer(p.id, isOwned ? "SELL" : "BUY")}
                                            disabled={actionLoading || currentRoundObj?.isLocked}
                                            className={`px-2 py-1 rounded text-xs font-bold ${isOwned ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}
                                        >
                                            {isOwned ? "Vender" : "Comprar"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* CONTENIDO: CLASIFICACIÓN */}
            {activeTab === "ranking" && (
                <div className="space-y-6">
                    {/* Historial de puntos reales */}
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg mb-4 text-slate-800">Mis Puntos Reales</h3>
                        <div className="flex flex-wrap gap-2">
                            {rounds.map(r => (
                                <div key={r.number} className="border rounded p-2 text-center min-w-[80px]">
                                    <p className="text-xs text-slate-500">{r.label}</p>
                                    <p className="font-bold text-lg">{myRealScores[r.number] ?? "-"}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Ranking General */}
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg mb-4 text-slate-800">Clasificación General</h3>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="p-3">Pos</th>
                                <th className="p-3">Equipo</th>
                                <th className="p-3 text-right">Puntos</th>
                            </tr>
                            </thead>
                            <tbody>
                            {ranking.map((row, i) => (
                                <tr key={row.teamId} className="border-b last:border-0 hover:bg-slate-50">
                                    <td className="p-3 font-bold text-slate-400">{i + 1}</td>
                                    <td className="p-3">
                                        <p className="font-semibold text-slate-800">{row.teamName}</p>
                                        <p className="text-xs text-slate-500">{row.username}</p>
                                    </td>
                                    <td className="p-3 text-right font-bold text-violet-600">{row.totalPoints}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}