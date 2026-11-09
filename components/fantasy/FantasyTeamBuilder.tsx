"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateLineup, type FantasyDemoPlayer } from "@/lib/services/fantasy/fantasy-team.service";
import type { PlayerPosition } from "@/domain/player/player.types";
import { PlayerStatsModal } from "./PlayerStatsModal";
import { Copy, UserPlus, Search, Lock, CheckCircle2, AlertCircle, Save } from "lucide-react";

function displayPosition(position: PlayerPosition): string {
    return position === "unknown" ? "DESCONOCIDO" : position;
}

type SaveStatus = "idle" | "saving" | "saved" | "draft";

export function FantasyTeamBuilder({ leagueId }: { leagueId: string }) {
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<FantasyDemoPlayer | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

    const [activeTab, setActiveTab] = useState<"lineup" | "market" | "ranking">("lineup");

    const [teamId, setTeamId] = useState<string>("");
    const [seasonUuid, setSeasonUuid] = useState<string>("");
    const [competitionRfevbId, setCompetitionRfevbId] = useState<number | null>(null);
    const [seasonRfevbId, setSeasonRfevbId] = useState<number | null>(null);
    const [seasonName, setSeasonName] = useState<string>("");
    const [selectedRound, setSelectedRound] = useState<number>(1);

    const [catalogPlayers, setCatalogPlayers] = useState<FantasyDemoPlayer[]>([]);
    const [rosterIds, setRosterIds] = useState<string[]>([]);
    const [lineupIds, setLineupIds] = useState<string[]>([]);
    const [budget, setBudget] = useState<number>(0);
    const [teamName, setTeamName] = useState<string>("");
    const [leagueCode, setLeagueCode] = useState<string>("");
    const [showInvite, setShowInvite] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [filterPosition, setFilterPosition] = useState<string>("ALL");
    const [filterTeam, setFilterTeam] = useState<string>("ALL");
    const [playerTotalScores, setPlayerTotalScores] = useState<Record<string, number>>({});
    const [playerMatchesPlayed, setPlayerMatchesPlayed] = useState<Record<string, number>>({});

    const [rounds, setRounds] = useState<Array<{ id: string, number: number, label: string, isLocked: boolean, startsAt: string, endsAt: string }>>([]);
    const [myRealScores, setMyRealScores] = useState<Record<number, number>>({});
    const [ranking, setRanking] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
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

            const activeIds = teamPayload.activePlayerIds;
            const loadedLineup = teamPayload.lineupPlayerIds || [];
            const cleanLineup = loadedLineup.filter((id: string) => activeIds.includes(id));

            setRosterIds(activeIds);
            setLineupIds(cleanLineup);

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

            const [scoresRes, rankRes] = await Promise.all([
                fetch(`/api/league-scores?league_id=${leagueId}`),
                fetch(`/api/league-ranking?league_id=${leagueId}`)
            ]);
            const scoresPayload = await scoresRes.json();
            if (scoresPayload.success) setMyRealScores(scoresPayload.scores);

            const rankPayload = await rankRes.json();
            if (rankPayload.success) setRanking(rankPayload.ranking);

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
                setSelectedRound(firstOpen ? firstOpen.number : formattedRounds[formattedRounds.length - 1].number);
            }

            const futureRounds = formattedRounds.filter(r => !r.isLocked);
            if (futureRounds.length === 0) {
                const savedDraft = localStorage.getItem(`draft_lineup_${teamPayload.team.id}`);
                if (savedDraft) {
                    try {
                        const parsed = JSON.parse(savedDraft);
                        const validDraft = parsed.filter((id: string) => activeIds.includes(id));
                        if (validDraft.length > 0) {
                            setLineupIds(validDraft);
                            setSaveStatus("draft");
                        }
                    } catch (e) {
                        console.error("Error parseando borrador local", e);
                    }
                }
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
            const timer = setTimeout(() => setSuccessMsg(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [successMsg]);

    const currentRoundObj = rounds.find(r => r.number === selectedRound);

    useEffect(() => {
        if (!currentRoundObj || !teamId || !currentRoundObj.isLocked) return;

        let isMounted = true;
        const fetchHistoricalLineup = async () => {
            const { data } = await supabase
                .from('lineups')
                .select('id, lineup_players(player_id)')
                .eq('fantasy_team_id', teamId)
                .eq('round_id', currentRoundObj.id)
                .maybeSingle();

            if (isMounted) {
                if (data) {
                    setLineupIds(data.lineup_players.map((lp: any) => lp.player_id));
                } else {
                    setLineupIds([]);
                }
            }
        };

        fetchHistoricalLineup();
        return () => { isMounted = false; };
    }, [currentRoundObj?.id, teamId, currentRoundObj?.isLocked, supabase]);

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
        const validation = validateLineup(lineupIds, rosterPlayers);
        if (!validation.valid) {
            setError("Alineación inválida: " + validation.errors.join(", "));
            return;
        }

        setActionLoading(true);
        setSaveStatus("saving");
        setError(null);
        setSuccessMsg(null);

        try {
            const futureRounds = rounds.filter(r => !r.isLocked);

            if (futureRounds.length === 0) {
                localStorage.setItem(`draft_lineup_${teamId}`, JSON.stringify(lineupIds));
                setSuccessMsg("Borrador guardado. Se aplicará automáticamente cuando se habilite la próxima jornada.");
                setSaveStatus("draft");
                setActionLoading(false);
                return;
            }

            const promises = futureRounds.map(r =>
                supabase.rpc("save_lineup", {
                    p_fantasy_team_id: teamId,
                    p_round_id: r.id,
                    p_player_ids: lineupIds
                })
            );

            const results = await Promise.all(promises);
            const errorResult = results.find(res => res.error);

            if (errorResult && errorResult.error) {
                throw errorResult.error;
            }

            localStorage.removeItem(`draft_lineup_${teamId}`);
            setSuccessMsg(`Alineación guardada para ${futureRounds.length} jornada${futureRounds.length > 1 ? 's' : ''} futura${futureRounds.length > 1 ? 's' : ''}.`);
            setSaveStatus("saved");

            const rankRes = await fetch(`/api/league-ranking?league_id=${leagueId}`);
            const rankPayload = await rankRes.json();
            if (rankPayload.success) setRanking(rankPayload.ranking);

            setTimeout(() => setSaveStatus("idle"), 3000);
        } catch (err: any) {
            setError(err.message || "Error al guardar la alineación.");
            setSaveStatus("idle");
        } finally {
            setActionLoading(false);
        }
    };

    const handleTransfer = async (playerId: string, type: "BUY" | "SELL") => {
        const nextRound = rounds.find(r => !r.isLocked);

        if (!nextRound) {
            setError("Los fichajes están cerrados hasta que se habilite la próxima jornada.");
            return;
        }

        setActionLoading(true);
        setError(null);
        setSuccessMsg(null);

        const { error: rpcError } = await supabase.rpc("transfer_player", {
            p_fantasy_team_id: teamId,
            p_player_id: playerId,
            p_round_id: nextRound.id,
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

    const playerMap = useMemo(() => new Map(catalogPlayers.map((p) => [p.id, p])), [catalogPlayers]);
    const rosterPlayers = useMemo(() => rosterIds.flatMap(id => playerMap.get(id) ? [playerMap.get(id)!] : []), [playerMap, rosterIds]);
    const lineupPlayers = useMemo(() => lineupIds.flatMap(id => playerMap.get(id) ? [playerMap.get(id)!] : []), [lineupIds, playerMap]);
    const lineupValidation = useMemo(() => validateLineup(lineupIds, rosterPlayers), [lineupIds, rosterPlayers]);

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

    // Cargar puntos TOTALES y partidos jugados
    useEffect(() => {
        if (!competitionRfevbId || !seasonRfevbId) return;

        let isMounted = true;
        const fetchTotalScores = async () => {
            try {
                const res = await fetch(`/api/fantasy-round-scores?competition=${competitionRfevbId}&season=${seasonRfevbId}`);
                const payload = await res.json();

                if (payload.success && isMounted) {
                    const totals: Record<string, number> = {};
                    const matchCounts: Record<string, number> = {};
                    payload.scores.forEach((s: any) => {
                        totals[s.playerId] = (totals[s.playerId] || 0) + s.score;
                        matchCounts[s.playerId] = (matchCounts[s.playerId] || 0) + (s.matchesPlayed || 0);
                    });
                    setPlayerTotalScores(totals);
                    setPlayerMatchesPlayed(matchCounts);
                }
            } catch (e) {
                console.error("Error cargando puntos totales", e);
            }
        };

        fetchTotalScores();

        return () => { isMounted = false; };
    }, [competitionRfevbId, seasonRfevbId]);

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

    const hasFutureRounds = rounds.some(r => !r.isLocked);

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

            {error && <div className="rounded-lg bg-red-100 p-4 font-semibold text-red-700 shadow-sm flex items-center gap-2"><AlertCircle className="w-5 h-5 shrink-0"/> {error}</div>}

            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <label className="font-semibold text-slate-700">Visualizar jornada:</label>
                <select
                    value={selectedRound}
                    onChange={(e) => setSelectedRound(Number(e.target.value))}
                    className="border p-2 rounded-md font-medium w-full md:w-auto"
                >
                    {rounds.map(r => <option key={r.number} value={r.number}>{r.label}{r.isLocked ? " (Jugada)" : ""}</option>)}
                </select>
            </div>

            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
                <button onClick={() => setActiveTab("lineup")} className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === "lineup" ? "border-b-2 border-violet-600 text-violet-600" : "text-slate-500"}`}>Mi Alineación</button>
                <button onClick={() => setActiveTab("market")} className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === "market" ? "border-b-2 border-violet-600 text-violet-600" : "text-slate-500"}`}>Mercado</button>
                <button onClick={() => setActiveTab("ranking")} className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === "ranking" ? "border-b-2 border-violet-600 text-violet-600" : "text-slate-500"}`}>Clasificación</button>
            </div>

            {activeTab === "lineup" && (
                <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                            <h3 className="font-bold text-lg mb-4 text-slate-800">Plantilla ({rosterIds.length})</h3>
                            <div className="space-y-2">
                                {rosterPlayers.map(p => {
                                    const isTitular = lineupIds.includes(p.id);
                                    const points = playerTotalScores[p.id];
                                    const matches = playerMatchesPlayed[p.id] ?? 0;

                                    return (
                                        <div key={p.id} onClick={() => setSelectedPlayer(p)} className={`flex justify-between items-center p-3 rounded border cursor-pointer hover:border-slate-300 transition-colors ${isTitular ? 'bg-violet-50 border-violet-200' : 'bg-slate-50'}`}>
                                            <div>
                                                <p className="font-semibold text-slate-800">{p.name}</p>
                                                <p className="text-xs text-slate-500">{p.club} · {displayPosition(p.position)}</p>
                                                <div className="mt-1">
                                                    {points !== undefined ? (
                                                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                            {points} pts · {matches} PJ
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
                                                    disabled={actionLoading}
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

                        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col">
                            <h3 className="font-bold text-lg mb-4 text-slate-800">Titulares ({lineupIds.length}/7)</h3>
                            <div className="space-y-2 mb-4 flex-1">
                                {lineupPlayers.map(p => {
                                    const points = playerTotalScores[p.id];
                                    const matches = playerMatchesPlayed[p.id] ?? 0;
                                    return (
                                        <div key={p.id} onClick={() => setSelectedPlayer(p)} className="flex justify-between p-3 bg-slate-50 rounded border border-slate-100 cursor-pointer hover:border-slate-300 transition-colors">
                                            <div>
                                                <span className="font-medium block">{p.name}</span>
                                                <span className="text-xs text-slate-500">{displayPosition(p.position)}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-emerald-600 text-sm">{p.price}M</p>
                                                {points !== undefined ? (
                                                    <span className="text-xs font-semibold text-blue-600">{points} pts · {matches} PJ</span>
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

                            {!hasFutureRounds ? (
                                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-md flex items-center gap-2 text-xs font-medium mb-3">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>La próxima jornada aún no está programada. Tu alineación se guardará como borrador y se aplicará cuando se publique.</span>
                                </div>
                            ) : (
                                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-md flex items-center gap-2 text-xs font-medium mb-3">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>Al guardar, se aplicará a todas las jornadas futuras ({rounds.filter(r => !r.isLocked).length}).</span>
                                </div>
                            )}

                            {successMsg && (
                                <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-md flex items-center gap-2 text-sm font-medium mb-3">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>{successMsg}</span>
                                </div>
                            )}

                            <button
                                onClick={handleSaveLineup}
                                disabled={actionLoading || lineupIds.length !== 7}
                                className={`w-full py-3 rounded-lg font-bold transition-colors mt-auto ${
                                    saveStatus === "saved"
                                        ? "bg-emerald-600 text-white"
                                        : saveStatus === "draft"
                                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                                            : "bg-slate-900 text-white hover:bg-slate-800"
                                } disabled:opacity-50`}
                            >
                                {actionLoading ? (
                                    "Guardando..."
                                ) : saveStatus === "saved" ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                        ¡Guardado!
                                    </span>
                                ) : saveStatus === "draft" ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Save className="w-5 h-5" />
                                        Borrador guardado
                                    </span>
                                ) : (
                                    "Guardar para próximas jornadas"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "market" && (
                <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 space-y-4">

                    {!hasFutureRounds && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md flex items-center gap-3 font-medium shadow-sm text-sm">
                            <Lock className="w-5 h-5 shrink-0" />
                            <p>El mercado de fichajes está cerrado temporalmente porque no hay una próxima jornada programada. Se abrirá automáticamente cuando se ingiera el calendario de la siguiente jornada.</p>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">Mercado de Fichajes</h3>
                            <p className="text-xs text-slate-500 mt-1">Precios dinámicos basados en rendimiento de la temporada</p>
                        </div>

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
                            const points = playerTotalScores[p.id];
                            const matches = playerMatchesPlayed[p.id] ?? 0;

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
                                                    {points} pts · {matches} PJ
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
                                            disabled={actionLoading || !hasFutureRounds}
                                            className={`px-3 py-1 rounded text-xs font-bold transition disabled:opacity-50 ${isOwned ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                                            title={!hasFutureRounds ? "Mercado cerrado hasta nueva jornada" : ""}
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