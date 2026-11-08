"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateLineup, type FantasyDemoPlayer } from "@/lib/services/fantasy/fantasy-team.service";
import type { PlayerPosition } from "@/domain/player/player.types";
import { PlayerStatsModal } from "./PlayerStatsModal";
import { Copy, UserPlus, Search } from "lucide-react";

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
    const [selectedPlayer, setSelectedPlayer] = useState<FantasyDemoPlayer | null>(null);

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
    const [leagueCode, setLeagueCode] = useState<string>("");
    const [showInvite, setShowInvite] = useState(false);

    // NUEVOS ESTADOS PARA EL MERCADO
    const [searchQuery, setSearchQuery] = useState("");
    const [filterPosition, setFilterPosition] = useState<string>("ALL");
    const [filterTeam, setFilterTeam] = useState<string>("ALL");

    // Estado único para los puntos de la jornada seleccionada (aplica a mercado y plantilla)
    const [playerScores, setPlayerScores] = useState<Record<string, number>>({});

    // Jornadas
    const [rounds, setRounds] = useState<Array<{ id: string, number: number, label: string, isLocked: boolean, startsAt: string, endsAt: string }>>([]);
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

            const { data: league } = await supabase
                .from("private_leagues")
                .select("join_code")
                .eq("id", leagueId)
                .single();
            setLeagueCode(league?.join_code ?? "");

            setTeamId(teamPayload.team.id);
            setSeasonUuid(teamPayload.season_id);
            setCompetitionRfevbId(teamPayload.competition_rfevb_id);
            setSeasonRfevbId(teamPayload.season_rfevb_id);
            setSeasonName(teamPayload.season_name || `Temporada ${teamPayload.season_rfevb_id}`);
            setBudget(teamPayload.team.budget);
            setTeamName(teamPayload.team.name);

            // Limpieza de alineación
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

            const allPlayers = rosterPayload.players.map((p: any) => ({
                id: p.id,
                name: p.displayName,
                club: teamsById.get(p.currentTeamId ?? "") ?? "?",
                position: p.position,
                price: p.price,
                season: "",
                weeklyScores: {},
            }));

            setCatalogPlayers(allPlayers);

            // 3. Cargar puntuaciones reales y ranking
            const [scoresRes, rankRes] = await Promise.all([
                fetch(`/api/league-scores?league_id=${leagueId}`),
                fetch(`/api/league-ranking?league_id=${leagueId}`)
            ]);
            const scoresPayload = await scoresRes.json();
            if (scoresPayload.success) setMyRealScores(scoresPayload.scores);

            const rankPayload = await rankRes.json();
            if (rankPayload.success) setRanking(rankPayload.ranking);

            // 4. Cargar jornadas
            const { data: dbRounds } = await supabase
                .from("rounds")
                .select("id, round_number, starts_at, ends_at")
                .eq("season_id", teamPayload.season_id)
                .order("round_number");

            const now = new Date();
            const uniqueRoundsMap = new Map<number, any>();

            (dbRounds || []).forEach(r => {
                if (!uniqueRoundsMap.has(r.round_number)) {
                    uniqueRoundsMap.set(r.round_number, { ...r });
                } else {
                    const existing = uniqueRoundsMap.get(r.round_number);
                    if (r.starts_at && (!existing.starts_at || new Date(r.starts_at) < new Date(existing.starts_at))) {
                        existing.starts_at = r.starts_at;
                    }
                    if (r.ends_at && (!existing.ends_at || new Date(r.ends_at) > new Date(existing.ends_at))) {
                        existing.ends_at = r.ends_at;
                    }
                }
            });

            const formattedRounds = Array.from(uniqueRoundsMap.values())
                .sort((a, b) => a.round_number - b.round_number)
                .map(r => {
                    const isLocked = r.starts_at ? now >= new Date(r.starts_at) : false;
                    return {
                        id: r.id,
                        number: r.round_number,
                        label: r.round_number <= 22 ? `Jornada ${r.round_number}` : r.round_number === 23 ? "Cuartos" : r.round_number === 24 ? "Semis" : "Final",
                        isLocked,
                        startsAt: r.starts_at,
                        endsAt: r.ends_at
                    };
                });

            setRounds(formattedRounds);

            if (formattedRounds.length > 0) {
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

    useEffect(() => {
        if (successMsg) {
            const timer = setTimeout(() => setSuccessMsg(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMsg]);

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
        if (!roundObj) return setError("Jornada no válida.");

        const validation = validateLineup(lineupIds, rosterPlayers);
        if (!validation.valid) {
            setError("Alineación inválida: " + validation.errors.join(", "));
            return;
        }

        setActionLoading(true);
        setError(null);
        setSuccessMsg(null);

        const { error: rpcError } = await supabase.rpc("save_lineup", {
            p_fantasy_team_id: teamId,
            p_round_id: roundObj.id,
            p_player_ids: lineupIds
        });

        if (rpcError) {
            setError(rpcError.message);
        } else {
            setSuccessMsg("Alineación guardada correctamente.");
            const rankRes = await fetch(`/api/league-ranking?league_id=${leagueId}`);
            const rankPayload = await rankRes.json();
            if (rankPayload.success) setRanking(rankPayload.ranking);
        }
        setActionLoading(false);
    };

    const handleTransfer = async (playerId: string, type: "BUY" | "SELL") => {
        const roundObj = rounds.find(r => r.number === selectedRound);
        if (roundObj?.isLocked) {
            setError("La jornada está bloqueada. No puedes comprar/vender jugadores.");
            return;
        }
        if (!roundObj) return setError("Jornada no válida.");

        setActionLoading(true);
        setError(null);
        setSuccessMsg(null);

        const { error: rpcError } = await supabase.rpc("transfer_player", {
            p_fantasy_team_id: teamId,
            p_player_id: playerId,
            p_round_id: roundObj.id,
            p_type: type,
        });

        if (rpcError) {
            setError(rpcError.message);
        } else {
            setSuccessMsg(type === "BUY" ? "Jugador fichado correctamente." : "Jugador vendido correctamente.");
            await loadData();
        }
        setActionLoading(false);
    };

    // Helpers
    const playerMap = useMemo(() => new Map(catalogPlayers.map((p) => [p.id, p])), [catalogPlayers]);
    const rosterPlayers = useMemo(() => rosterIds.flatMap(id => playerMap.get(id) ? [playerMap.get(id)!] : []), [playerMap, rosterIds]);
    const lineupPlayers = useMemo(() => lineupIds.flatMap(id => playerMap.get(id) ? [playerMap.get(id)!] : []), [lineupIds, playerMap]);
    const lineupValidation = useMemo(() => validateLineup(lineupIds, rosterPlayers), [lineupIds, rosterPlayers]);
    const currentRoundObj = rounds.find(r => r.number === selectedRound);

    // 🛒 LÓGICA DE MERCADO DIARIO
    const marketPlayers = useMemo(() => {
        if (catalogPlayers.length === 0) return [];

        const todaySeed = new Date().toISOString().split('T')[0];
        const seededRandom = (seed: string) => {
            let h = 0xdeadbeef;
            for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
            return () => {
                h = Math.imul(h ^ (h >>> 16), 2246822507);
                h = Math.imul(h ^ (h >>> 13), 3266489909);
                return ((h ^= h >>> 16) >>> 0) / 4294967296;
            };
        };

        const marketQuota: Record<string, number> = {
            setter: 2,
            opposite: 2,
            outside: 4,
            middle: 4,
            libero: 2
        };

        const dailyMarket: FantasyDemoPlayer[] = [];

        Object.entries(marketQuota).forEach(([pos, count]) => {
            const posPlayers = catalogPlayers.filter((p: FantasyDemoPlayer) => p.position === pos);
            const random = seededRandom(todaySeed + pos);

            const shuffled = [...posPlayers];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            dailyMarket.push(...shuffled.slice(0, count));
        });

        return dailyMarket;
    }, [catalogPlayers]);

    // 🌟 NUEVO: Cargar puntos de la jornada seleccionada para TODOS los jugadores
    // Hacemos una sola petición de la jornada completa en lugar de 20 peticiones.
    useEffect(() => {
        if (!competitionRfevbId || !seasonRfevbId || !selectedRound) return;

        let isMounted = true;
        const fetchRoundScores = async () => {
            try {
                const res = await fetch(`/api/fantasy-round-scores?competition=${competitionRfevbId}&season=${seasonRfevbId}&round=${selectedRound}`);
                const payload = await res.json();

                if (payload.success && isMounted) {
                    const scoresMap: Record<string, number> = {};
                    // Mapeamos los puntos de todos los jugadores en esa jornada
                    payload.scores.forEach((s: any) => {
                        scoresMap[s.playerId] = s.score;
                    });
                    setPlayerScores(scoresMap);
                }
            } catch (e) {
                console.error("Error cargando puntos de la jornada", e);
            }
        };

        fetchRoundScores();

        return () => { isMounted = false; };
    }, [competitionRfevbId, seasonRfevbId, selectedRound]);

    // NUEVOS MEMOS PARA EL MERCADO
    const uniqueTeams = useMemo(() => {
        const teams = new Set(marketPlayers.map(p => p.club));
        return Array.from(teams).sort();
    }, [marketPlayers]);

    const filteredPlayers = useMemo(() => {
        return marketPlayers.filter(p => {
            const matchesName = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesPosition = filterPosition === "ALL" || p.position === filterPosition;
            const matchesTeam = filterTeam === "ALL" || p.club === filterTeam;
            return matchesName && matchesPosition && matchesTeam;
        });
    }, [marketPlayers, searchQuery, filterPosition, filterTeam]);

    if (loading) return <div className="p-10 text-center animate-pulse text-slate-500">Cargando Fantasy...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="relative flex flex-col items-start justify-between gap-4 rounded-xl bg-slate-900 p-6 text-white shadow-lg md:flex-row md:items-center">
                <div>
                    <h1 className="text-3xl font-bold">{teamName}</h1>
                    <p className="text-slate-400 mt-1">{seasonName}</p>
                </div>
                <div className="flex flex-wrap items-center gap-6 text-left md:text-right">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowInvite((current) => !current)}
                            aria-expanded={showInvite}
                            className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                        >
                            <UserPlus className="h-4 w-4" />
                            Invitar amigos
                        </button>
                        {showInvite && (
                            <div className="absolute right-0 top-full z-10 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-4 text-left text-slate-900 shadow-xl">
                                <p className="text-sm font-semibold">Código de liga</p>
                                <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2">
                                    <span className="font-mono text-sm text-slate-700">{leagueCode || "Cargando..."}</span>
                                    <button
                                        type="button"
                                        aria-label="Copiar código de liga"
                                        disabled={!leagueCode}
                                        onClick={() => navigator.clipboard.writeText(leagueCode)}
                                        className="text-slate-500 transition-colors hover:text-slate-900 disabled:opacity-50"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
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

            {error && <div className="rounded-lg bg-red-100 p-4 font-semibold text-red-700 shadow-sm">{error}</div>}
            {successMsg && <div className="rounded-lg bg-emerald-100 p-4 font-semibold text-emerald-700 shadow-sm">{successMsg}</div>}

            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <label className="font-semibold text-slate-700">Jornada a gestionar:</label>
                <select
                    value={selectedRound}
                    onChange={(e) => setSelectedRound(Number(e.target.value))}
                    className="border p-2 rounded-md font-medium w-full md:w-auto"
                >
                    {rounds.map(r => <option key={r.number} value={r.number}>{r.label}{r.isLocked ? " (Bloqueada)" : ""}</option>)}
                </select>
                {currentRoundObj?.isLocked && (
                    <span className="text-amber-600 text-sm font-bold bg-amber-50 px-3 py-1 rounded">
                        Las transferencias y alineaciones están cerradas para esta jornada.
                    </span>
                )}
            </div>

            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
                <button onClick={() => setActiveTab("lineup")} className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === "lineup" ? "border-b-2 border-violet-600 text-violet-600" : "text-slate-500"}`}>Mi Alineación</button>
                <button onClick={() => setActiveTab("market")} className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === "market" ? "border-b-2 border-violet-600 text-violet-600" : "text-slate-500"}`}>Mercado</button>
                <button onClick={() => setActiveTab("ranking")} className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === "ranking" ? "border-b-2 border-violet-600 text-violet-600" : "text-slate-500"}`}>Clasificación</button>
            </div>

            {activeTab === "lineup" && (
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg mb-4 text-slate-800">Plantilla ({rosterIds.length})</h3>
                        <div className="space-y-2">
                            {rosterPlayers.map(p => {
                                const isTitular = lineupIds.includes(p.id);
                                const points = playerScores[p.id]; // Puntos de la jornada

                                return (
                                    <div key={p.id} onClick={() => setSelectedPlayer(p)} className={`flex justify-between items-center p-3 rounded border cursor-pointer hover:border-slate-300 transition-colors ${isTitular ? 'bg-violet-50 border-violet-200' : 'bg-slate-50'}`}>
                                        <div>
                                            <p className="font-semibold text-slate-800">{p.name}</p>
                                            <p className="text-xs text-slate-500">{p.club} · {displayPosition(p.position)}</p>
                                            <div className="mt-1">
                                                {points !== undefined ? (
                                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                        {points} pts
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-500/10">
                                                        Sin pts
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-2">
                                            <p className="font-bold text-emerald-600 text-sm">{p.price}M</p>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleLineup(p.id); }}
                                                disabled={actionLoading || currentRoundObj?.isLocked}
                                                className={`px-3 py-1 rounded text-xs font-bold transition disabled:opacity-50 ${isTitular ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                                            >
                                                {isTitular ? 'Quitar' : 'Alinear'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {rosterPlayers.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No tienes jugadores. Ve al Mercado para fichar.</p>}
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg mb-4 text-slate-800">Titulares ({lineupIds.length}/7)</h3>
                        <div className="space-y-2 mb-4">
                            {lineupPlayers.map(p => {
                                const points = playerScores[p.id];
                                return (
                                    <div key={p.id} onClick={() => setSelectedPlayer(p)} className="flex justify-between p-3 bg-slate-50 rounded border border-slate-100 cursor-pointer hover:border-slate-300 transition-colors">
                                        <div>
                                            <span className="font-medium block">{p.name}</span>
                                            <span className="text-xs text-slate-500">{displayPosition(p.position)}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-emerald-600 text-sm">{p.price}M</p>
                                            {points !== undefined ? (
                                                <span className="text-xs font-semibold text-blue-600">{points} pts</span>
                                            ) : (
                                                <span className="text-xs text-slate-400">Sin pts</span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
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

            {activeTab === "market" && (
                <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">Mercado de Fichajes</h3>
                            <p className="text-xs text-slate-500 mt-1">Mostrando puntuaciones de la Jornada {selectedRound}</p>
                        </div>

                        {/* BARRA DE FILTROS */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar jugador..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>
                            <select
                                value={filterPosition}
                                onChange={(e) => setFilterPosition(e.target.value)}
                                className="w-full sm:w-auto border border-slate-200 p-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                            >
                                <option value="ALL">Todas las posiciones</option>
                                <option value="setter">Colocador</option>
                                <option value="opposite">Opuesto</option>
                                <option value="outside">Receptor</option>
                                <option value="middle">Central</option>
                                <option value="libero">Líbero</option>
                            </select>
                            <select
                                value={filterTeam}
                                onChange={(e) => setFilterTeam(e.target.value)}
                                className="w-full sm:w-auto border border-slate-200 p-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                            >
                                <option value="ALL">Todos los equipos</option>
                                {uniqueTeams.map(team => (
                                    <option key={team} value={team}>{team}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredPlayers.map(p => {
                            const isOwned = rosterIds.includes(p.id);
                            const points = playerScores[p.id];

                            return (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedPlayer(p)}
                                    className="border p-3 rounded flex justify-between items-center bg-white cursor-pointer hover:border-slate-300 transition-colors"
                                >
                                    <div>
                                        <p className="font-semibold text-sm">{p.name}</p>
                                        <p className="text-xs text-slate-500">{p.club} · {displayPosition(p.position)}</p>
                                        <div className="mt-1">
                                            {points !== undefined ? (
                                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                    {points} pts
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-500/10">
                                                    Sin pts
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-emerald-600 text-sm mb-1">{p.price}M</p>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleTransfer(p.id, isOwned ? "SELL" : "BUY"); }}
                                            disabled={actionLoading || currentRoundObj?.isLocked}
                                            className={`px-3 py-1 rounded text-xs font-bold transition disabled:opacity-50 ${isOwned ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                                        >
                                            {isOwned ? "Vender" : "Comprar"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredPlayers.length === 0 && (
                            <div className="col-span-full text-center py-8 text-slate-500 text-sm">
                                No se han encontrado jugadores con esos filtros hoy.
                            </div>
                        )}
                    </div>
                </div>
            )}

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
            {selectedPlayer && competitionRfevbId && seasonRfevbId && (
                <PlayerStatsModal
                    player={selectedPlayer}
                    competitionId={competitionRfevbId}
                    seasonId={seasonRfevbId}
                    onClose={() => setSelectedPlayer(null)}
                />
            )}
        </div>
    );
}