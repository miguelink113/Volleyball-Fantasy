"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateLineup, type FantasyDemoPlayer } from "@/lib/services/fantasy/fantasy-team.service";
import type { PlayerPosition } from "@/domain/player/player.types";

function displayPosition(position: PlayerPosition): string {
    return position === "unknown" ? "DESCONOCIDO" : position;
}

export function FantasyTeamBuilder({ leagueId }: { leagueId: string }) {
    const supabase = createClient();

    // Estados de carga y error
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

    // Jornadas, puntuaciones reales y ranking
    const [rounds, setRounds] = useState<Array<{ number: number, label: string, isLocked: boolean, startsAt: string, endsAt: string }>>([]);
    const [myRealScores, setMyRealScores] = useState<Record<number, number>>({});
    const [ranking, setRanking] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Cargar equipo y contexto
            const teamRes = await fetch(`/api/fantasy-team?league_id=${leagueId}`);
            const teamPayload = await teamRes.json();
            if (!teamRes.ok || !teamPayload.success) throw new Error(teamPayload.error || "Error cargando equipo");

            setTeamId(teamPayload.team.id);
            setSeasonUuid(teamPayload.season_id);
            setCompetitionRfevbId(teamPayload.competition_rfevb_id);
            setSeasonRfevbId(teamPayload.season_rfevb_id);
            setSeasonName(teamPayload.season_name || `Temporada ${teamPayload.season_rfevb_id}`);
            setBudget(teamPayload.team.budget);
            setTeamName(teamPayload.team.name);

            // Limpieza de alineación (evitar jugadores fantasmas)
            const activeIds = teamPayload.activePlayerIds;
            const loadedLineup = teamPayload.lineupPlayerIds || [];
            const cleanLineup = loadedLineup.filter((id: string) => activeIds.includes(id));

            setRosterIds(activeIds);
            setLineupIds(cleanLineup);

            // 2. Cargar catálogo de jugadores
            const rosterRes = await fetch(`/api/competition-roster?competition=${teamPayload.competition_rfevb_id}`);
            const rosterPayload = await rosterRes.json();
            if (!rosterRes.ok || !rosterPayload.success) throw new Error("Error cargando el mercado");

            const teamsById = new Map(rosterPayload.teams.map((t: any) => [t.id, t.name]));
            setCatalogPlayers(rosterPayload.players.map((p: any) => ({
                id: p.id,
                name: p.displayName,
                club: teamsById.get(p.currentTeamId ?? "") ?? "?",
                position: p.position,
                price: p.price,
                season: "",
                weeklyScores: {},
            })));

            // 3. Cargar puntuaciones reales y ranking
            const [scoresRes, rankRes] = await Promise.all([
                fetch(`/api/league-scores?league_id=${leagueId}`),
                fetch(`/api/league-ranking?league_id=${leagueId}`)
            ]);
            const scoresPayload = await scoresRes.json();
            if (scoresPayload.success) setMyRealScores(scoresPayload.scores);

            const rankPayload = await rankRes.json();
            if (rankPayload.success) setRanking(rankPayload.ranking);

            // 4. Cargar jornadas y bloqueos
            const { data: dbRounds } = await supabase
                .from("rounds")
                .select("round_number, starts_at, ends_at")
                .eq("season_id", teamPayload.season_id)
                .order("round_number");

            const now = new Date();
            const formattedRounds = (dbRounds || []).map(r => {
                const isLocked = now >= new Date(r.starts_at);
                return {
                    number: r.round_number,
                    label: r.round_number <= 22 ? `Jornada ${r.round_number}` : r.round_number === 23 ? "Cuartos" : r.round_number === 24 ? "Semis" : "Final",
                    isLocked,
                    startsAt: r.starts_at,
                    endsAt: r.ends_at
                };
            });
            setRounds(formattedRounds);

            if (formattedRounds.length > 0) {
                // Seleccionar la primera jornada no bloqueada o la primera por defecto
                const firstOpen = formattedRounds.find(r => !r.isLocked);
                setSelectedRound(firstOpen ? firstOpen.number : formattedRounds[0].number);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [leagueId]);

    // Limpiar mensajes después de 3 segundos
    useEffect(() => {
        if (successMsg) {
            const timer = setTimeout(() => setSuccessMsg(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMsg]);

    // Lógica de Alineación
    const toggleLineup = (playerId: string) => {
        if (lineupIds.includes(playerId)) {
            setLineupIds(lineupIds.filter(id => id !== playerId));
        } else {
            if (lineupIds.length >= 7) {
                setError("Ya tienes 7 titulares. Quita a alguien antes de añadir otro.");
                return;
            }
            setLineupIds([...lineupIds, playerId]);
        }
        setError(null);
    };

    const handleSaveLineup = async () => {
        const roundObj = rounds.find(r => r.number === selectedRound);
        if (roundObj?.isLocked) {
            setError("La jornada está bloqueada. No puedes modificar la alineación.");
            return;
        }

        const validation = validateLineup(lineupIds, rosterPlayers);
        if (!validation.valid) {
            setError("Alineación inválida: " + validation.errors.join(", "));
            return;
        }

        setActionLoading(true);
        setError(null);
        setSuccessMsg(null);

        const { data: roundData } = await supabase.from("rounds").select("id").eq("season_id", seasonUuid).eq("round_number", selectedRound).single();

        const { error: rpcError } = await supabase.rpc("save_lineup", {
            p_fantasy_team_id: teamId,
            p_round_id: roundData?.id,
            p_player_ids: lineupIds
        });

        if (rpcError) {
            setError(rpcError.message);
        } else {
            setSuccessMsg("Alineación guardada correctamente.");
            // Recargamos el ranking por si acaso
            const rankRes = await fetch(`/api/league-ranking?league_id=${leagueId}`);
            const rankPayload = await rankRes.json();
            if (rankPayload.success) setRanking(rankPayload.ranking);
        }
        setActionLoading(false);
    };

    // Lógica de Mercado
    const handleTransfer = async (playerId: string, type: "BUY" | "SELL") => {
        const roundObj = rounds.find(r => r.number === selectedRound);
        if (roundObj?.isLocked) {
            setError("La jornada está bloqueada. No puedes comprar/vender jugadores.");
            return;
        }

        setActionLoading(true);
        setError(null);
        setSuccessMsg(null);

        const { data: roundData } = await supabase.from("rounds").select("id").eq("season_id", seasonUuid).eq("round_number", selectedRound).single();

        const { error: rpcError } = await supabase.rpc("transfer_player", {
            p_fantasy_team_id: teamId,
            p_player_id: playerId,
            p_round_id: roundData?.id,
            p_type: type,
        });

        if (rpcError) {
            setError(rpcError.message);
        } else {
            setSuccessMsg(type === "BUY" ? "Jugador fichado correctamente." : "Jugador vendido correctamente.");
            await loadData(); // Recargamos todo para actualizar presupuesto y plantilla
        }
        setActionLoading(false);
    };

    // Helpers
    const playerMap = useMemo(() => new Map(catalogPlayers.map((p) => [p.id, p])), [catalogPlayers]);
    const rosterPlayers = useMemo(() => rosterIds.flatMap(id => playerMap.get(id) ? [playerMap.get(id)!] : []), [playerMap, rosterIds]);
    const lineupPlayers = useMemo(() => lineupIds.flatMap(id => playerMap.get(id) ? [playerMap.get(id)!] : []), [lineupIds, playerMap]);
    const lineupValidation = useMemo(() => validateLineup(lineupIds, rosterPlayers), [lineupIds, rosterPlayers]);
    const currentRoundObj = rounds.find(r => r.number === selectedRound);

    if (loading) return <div className="p-10 text-center animate-pulse text-slate-500">Cargando Fantasy...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* CABECERA */}
            <header className="bg-slate-900 text-white rounded-xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">{teamName}</h1>
                    <p className="text-slate-400 mt-1">{seasonName}</p>
                </div>
                <div className="flex gap-6 text-left md:text-right">
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

            {/* MENSAJES DE ERROR / ÉXITO */}
            {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg shadow-sm font-semibold">⚠️ {error}</div>}
            {successMsg && <div className="bg-emerald-100 text-emerald-700 p-4 rounded-lg shadow-sm font-semibold">✅ {successMsg}</div>}

            {/* SELECTOR DE JORNADA */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <label className="font-semibold text-slate-700">Jornada a gestionar:</label>
                <select
                    value={selectedRound}
                    onChange={(e) => setSelectedRound(Number(e.target.value))}
                    className="border p-2 rounded-md font-medium w-full md:w-auto"
                >
                    {rounds.map(r => <option key={r.number} value={r.number}>{r.label} {r.isLocked ? "🔒" : ""}</option>)}
                </select>
                {currentRoundObj?.isLocked && (
                    <span className="text-amber-600 text-sm font-bold bg-amber-50 px-3 py-1 rounded">
                        Las transferencias y alineaciones están cerradas para esta jornada.
                    </span>
                )}
            </div>

            {/* PESTAÑAS */}
            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
                <button onClick={() => setActiveTab("lineup")} className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === "lineup" ? "border-b-2 border-violet-600 text-violet-600" : "text-slate-500"}`}>Mi Alineación</button>
                <button onClick={() => setActiveTab("market")} className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === "market" ? "border-b-2 border-violet-600 text-violet-600" : "text-slate-500"}`}>Mercado</button>
                <button onClick={() => setActiveTab("ranking")} className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === "ranking" ? "border-b-2 border-violet-600 text-violet-600" : "text-slate-500"}`}>Clasificación</button>
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
                                        <button
                                            onClick={() => toggleLineup(p.id)}
                                            disabled={actionLoading || currentRoundObj?.isLocked}
                                            className={`px-3 py-1 rounded text-sm font-medium ${isTitular ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}
                                        >
                                            {isTitular ? 'Quitar' : 'Alinear'}
                                        </button>
                                    </div>
                                );
                            })}
                            {rosterPlayers.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No tienes jugadores. Ve al Mercado para fichar.</p>}
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
                            {actionLoading ? "Guardando..." : currentRoundObj?.isLocked ? "Jornada Bloqueada" : "Guardar Alineación"}
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
                                <div key={p.id} className="border p-3 rounded flex justify-between items-center bg-white">
                                    <div>
                                        <p className="font-semibold text-sm">{p.name}</p>
                                        <p className="text-xs text-slate-500">{p.club} · {displayPosition(p.position)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-emerald-600 text-sm mb-1">{p.price}M</p>
                                        <button
                                            onClick={() => handleTransfer(p.id, isOwned ? "SELL" : "BUY")}
                                            disabled={actionLoading || currentRoundObj?.isLocked}
                                            className={`px-3 py-1 rounded text-xs font-bold transition disabled:opacity-50 ${isOwned ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
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
                            {ranking.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center text-slate-500">No hay datos de clasificación todavía.</td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}