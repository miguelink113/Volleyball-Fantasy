"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    calculateLineupScoreForRound,
    validateLineup,
    validateRosterSize,
    type FantasyDemoPlayer,
} from "@/lib/services/fantasy/fantasy-team.service";
import type { PlayerPosition } from "@/domain/player/player.types";

const rounds = [
    ...Array.from({ length: 22 }, (_, index) => ({ number: index + 1, label: `Jornada ${index + 1}` })),
    { number: 23, label: "Cuartos de final" },
    { number: 24, label: "Semifinales" },
    { number: 25, label: "Final" },
];

function displayPosition(position: PlayerPosition): string {
    return position === "unknown" ? "DESCONOCIDO" : position;
}

interface RosterResponse {
    teams: Array<{ id: string; name: string }>;
    players: Array<{ id: string; displayName: string; position: PlayerPosition; currentTeamId?: string; price: number; }>;
}

export function FantasyTeamBuilder({ leagueId }: { leagueId: string }) {
    const supabase = createClient();
    const [catalogPlayers, setCatalogPlayers] = useState<FantasyDemoPlayer[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [lineupIds, setLineupIds] = useState<string[]>([]);

    // Contexto dinámico de la liga
    const [teamId, setTeamId] = useState<string>("");
    const [seasonUuid, setSeasonUuid] = useState<string>("");
    const [competitionRfevbId, setCompetitionRfevbId] = useState<number | null>(null);
    const [seasonRfevbId, setSeasonRfevbId] = useState<number | null>(null);

    const [budget, setBudget] = useState<number>(0);
    const [teamName, setTeamName] = useState<string>("");
    const [selectedRound, setSelectedRound] = useState<number>(1);
    const [loading, setLoading] = useState(true);
    const [transferLoading, setTransferLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allScores, setAllScores] = useState<Record<string, Record<number, number>>>({});
    const [scoresLoading, setScoresLoading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Primero obtenemos el equipo para saber a qué competición y temporada pertenece
            const teamRes = await fetch(`/api/fantasy-team?league_id=${leagueId}`);
            const teamPayload = await teamRes.json();

            if (!teamRes.ok || !teamPayload.success) throw new Error(teamPayload.error || "Error cargando tu equipo");

            // 2. Guardamos el contexto dinámico
            setTeamId(teamPayload.team.id);
            setSeasonUuid(teamPayload.season_id);
            setCompetitionRfevbId(teamPayload.competition_rfevb_id);
            setSeasonRfevbId(teamPayload.season_rfevb_id);
            setSelectedIds(teamPayload.activePlayerIds);
            setLineupIds(teamPayload.lineupPlayerIds);
            setBudget(teamPayload.team.budget);
            setTeamName(teamPayload.team.name);

            // 3. Ahora que sabemos la competición, cargamos el catálogo (mercado) de ESA competición
            const rosterRes = await fetch(`/api/competition-roster?competition=${teamPayload.competition_rfevb_id}`);
            const rosterPayload = await rosterRes.json();

            if (!rosterRes.ok || !rosterPayload.success) throw new Error("Error cargando el mercado");

            const teamsById = new Map(rosterPayload.teams.map((t: any) => [t.id, t.name]));
            const realPlayers: FantasyDemoPlayer[] = rosterPayload.players.map((p: any) => ({
                id: p.id,
                name: p.displayName,
                club: teamsById.get(p.currentTeamId ?? "") ?? "Equipo desconocido",
                position: p.position,
                price: p.price,
                season: "25-26",
                weeklyScores: {},
            }));

            setCatalogPlayers(realPlayers);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leagueId]);

    // Cargar puntuaciones en cuanto tengamos el ID dinámico de la competición y temporada
    useEffect(() => {
        if (!competitionRfevbId || !seasonRfevbId) return;

        setScoresLoading(true);
        fetch(`/api/fantasy-round-scores?competition=${competitionRfevbId}&season=${seasonRfevbId}`)
            .then(async (res) => {
                const payload = await res.json();
                if (!res.ok || !payload.success) throw new Error(payload.error);
                return payload;
            })
            .then((payload) => {
                const map: Record<string, Record<number, number>> = {};
                payload.scores.forEach((s: any) => {
                    if (!map[s.playerId]) map[s.playerId] = {};
                    map[s.playerId][s.roundNumber] = s.score;
                });
                setAllScores(map);
            })
            .catch((err) => setError(err.message))
            .finally(() => setScoresLoading(false));
    }, [competitionRfevbId, seasonRfevbId]);

    // ─── TRANSFERENCIAS (Fase 7) ───
    const handleTransfer = async (playerId: string, type: "BUY" | "SELL") => {
        if (!teamId) return;
        setTransferLoading(true);
        setError(null);

        const { data: roundData } = await supabase
            .from("rounds")
            .select("id")
            .eq("season_id", seasonUuid)
            .eq("round_number", selectedRound)
            .single();

        if (!roundData) {
            setError("No se encontró la jornada para realizar la transacción");
            setTransferLoading(false);
            return;
        }

        const { error: rpcError } = await supabase.rpc("transfer_player", {
            p_fantasy_team_id: teamId,
            p_player_id: playerId,
            p_round_id: roundData.id,
            p_type: type,
        });

        if (rpcError) {
            setError(rpcError.message);
            setTransferLoading(false);
            return;
        }

        await loadData();
        setTransferLoading(false);
    };

    // Placeholder para la Fase 8 (Alineación)
    const toggleLineup = (playerId: string) => alert("Guardar alineación se conectará en la Fase 8");

    const playerMap = useMemo(() => new Map(catalogPlayers.map((p) => [p.id, p])), [catalogPlayers]);
    const rosterPlayers = useMemo(() => selectedIds.flatMap((id) => playerMap.get(id) ? [playerMap.get(id)!] : []), [playerMap, selectedIds]);
    const lineupPlayers = useMemo(() => lineupIds.flatMap((id) => playerMap.get(id) ? [playerMap.get(id)!] : []), [lineupIds, playerMap]);

    const rosterValidation = useMemo(() => validateRosterSize(selectedIds), [selectedIds]);
    const lineupValidation = useMemo(() => validateLineup(lineupIds, rosterPlayers), [lineupIds, rosterPlayers]);
    const lineupScore = calculateLineupScoreForRound(lineupIds, selectedRound, allScores);

    if (loading) return <p className="rounded-lg bg-white p-6 text-slate-600">Cargando tu equipo y el mercado...</p>;

    return (
        <div className="space-y-8">
            {error && (
                <div className="rounded-lg bg-red-100 p-4 font-semibold text-red-700">
                    ⚠️ {error}
                </div>
            )}

            <section className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Equipo</p>
                    <p className="mt-2 text-xl font-bold text-slate-900 truncate">{teamName}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Presupuesto</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-600">{budget.toFixed(1)}M</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Plantilla</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{selectedIds.length}/14</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Puntos J{selectedRound}</p>
                    <p className="mt-2 text-3xl font-bold text-violet-600">{scoresLoading ? "..." : lineupScore}</p>
                </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Mi equipo y alineación</h2>
                <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                        <h3 className="mb-4 text-lg font-bold text-slate-900">Plantilla ({selectedIds.length}/14)</h3>
                        <div className="space-y-3">
                            {rosterPlayers.length > 0 ? (
                                rosterPlayers.map((player) => {
                                    const isInLineup = lineupIds.includes(player.id);
                                    return (
                                        <div key={player.id} className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${isInLineup ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-semibold text-slate-900">{player.name}</p>
                                                <p className="text-sm text-slate-600">{player.club} · {displayPosition(player.position)}</p>
                                            </div>
                                            <button type="button" onClick={() => toggleLineup(player.id)} className={`rounded px-3 py-2 text-sm font-semibold transition ${isInLineup ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-sky-600 text-white hover:bg-sky-700"}`}>
                                                {isInLineup ? "Quitar" : "Alinear"}
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-slate-500">Todavía no tienes jugadores en la plantilla.</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Titulares ({lineupIds.length}/7)</h3>
                        <div className="mt-4 space-y-2">
                            {lineupPlayers.map((player) => (
                                <div key={player.id} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                    <span>{player.name}</span>
                                    <span>{displayPosition(player.position)}</span>
                                </div>
                            ))}
                        </div>
                        {lineupValidation.errors.length > 0 && (
                            <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
                                {lineupValidation.errors.map((error) => <p key={error}>{error}</p>)}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Mercado de fichajes</h2>
                        <p className="text-sm text-slate-500">Todos los jugadores de la liga a 9M. Transacción en J{selectedRound}.</p>
                    </div>
                    <select value={selectedRound} onChange={(e) => setSelectedRound(Number(e.target.value))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                        {rounds.map((round) => <option key={round.number} value={round.number}>{round.label}</option>)}
                    </select>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {catalogPlayers.map((player) => {
                        const isSelected = selectedIds.includes(player.id);
                        return (
                            <div key={player.id} className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${isSelected ? "border-violet-500 bg-violet-50" : "border-slate-200 bg-slate-50"}`}>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-slate-900">{player.name}</p>
                                    <p className="text-sm text-slate-600">{player.club} · {displayPosition(player.position)} · {player.price}M</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleTransfer(player.id, isSelected ? "SELL" : "BUY")}
                                    disabled={transferLoading}
                                    className={`rounded px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${isSelected ? "bg-red-500 text-white hover:bg-red-600" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                                >
                                    {isSelected ? "Vender" : "Comprar"}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Puntuación por jornada</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead>
                        <tr className="border-b border-slate-200 text-slate-600">
                            <th className="px-3 py-2 font-medium">Jornada</th>
                            <th className="px-3 py-2 font-medium">Puntuación</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rounds.map((round) => {
                            const score = calculateLineupScoreForRound(lineupIds, round.number, allScores);
                            return (
                                <tr key={round.number} className="border-b border-slate-100">
                                    <td className="px-3 py-2 text-slate-700">{round.label}</td>
                                    <td className={`px-3 py-2 font-semibold ${round.number === selectedRound ? "text-violet-700" : "text-slate-700"}`}>
                                        {scoresLoading ? "..." : score}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}