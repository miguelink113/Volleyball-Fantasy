"use client";

import { useEffect, useMemo, useState } from "react";
import {
    calculateLineupScoreForRound,
    createDailyFantasyRoster,
    validateLineup,
    validateRosterSize,
    type FantasyDemoPlayer,
} from "@/lib/services/fantasy/fantasy-team.service";
import type { PlayerPosition } from "@/domain/player/player.types";

const rounds = [
    ...Array.from({ length: 22 }, (_, index) => ({
        number: index + 1,
        label: `Jornada ${index + 1}`,
    })),
    { number: 23, label: "Cuartos de final" },
    { number: 24, label: "Semifinales" },
    { number: 25, label: "Final" },
];
const COMPETITION_ID = 152;
const SEASON_ID = 186;

function displayPosition(position: PlayerPosition): string {
    return position === "unknown" ? "DESCONOCIDO" : position;
}

interface RosterResponse {
    teams: Array<{ rfevbId?: string; name: string }>;
    players: Array<{
        id: string;
        displayName: string;
        firstName: string;
        lastName: string;
        position: PlayerPosition;
        currentTeamId?: string;
        dorsal?: number;
        photoUrl?: string;
    }>;
}

type RosterPayload =
    | (RosterResponse & { success: true })
    | { success: false; error?: string };

interface RoundScore {
    playerId: string;
    score: number;
    scoringVersion: string;
}

interface RoundScoresResponse {
    success: true;
    scores: RoundScore[];
}

let rosterRequest: Promise<RosterResponse> | null = null;
const roundScoreRequests = new Map<number, Promise<RoundScoresResponse>>();

function getDateKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

async function fetchCompetitionRoster(): Promise<RosterResponse> {
    if (!rosterRequest) {
        rosterRequest = fetch(
            `/api/competition-roster?competition=${COMPETITION_ID}`,
            { cache: "no-store" }
        )
            .then(async (response) => {
                const payload = (await response.json()) as RosterPayload;

                if (!response.ok || !payload.success) {
                    throw new Error(
                        "error" in payload && payload.error
                            ? payload.error
                            : "No se pudo cargar el catálogo de jugadores."
                    );
                }

                return payload;
            })
            .catch((error) => {
                rosterRequest = null;
                throw error;
            });
    }

    return rosterRequest;
}

async function fetchRoundScores(round: number): Promise<RoundScoresResponse> {
    const cachedRequest = roundScoreRequests.get(round);

    if (cachedRequest) {
        return cachedRequest;
    }

    const request = fetch(
        `/api/fantasy-round-scores?competition=${COMPETITION_ID}` +
            `&season=${SEASON_ID}&round=${round}`,
        { cache: "no-store" }
    )
        .then(async (response) => {
            const payload = (await response.json()) as
                | RoundScoresResponse
                | { success: false; error?: string };

            if (!response.ok || !payload.success) {
                throw new Error(
                    "error" in payload && payload.error
                        ? payload.error
                        : "No se pudieron calcular los puntos de la jornada."
                );
            }

            return payload;
        })
        .catch((error) => {
            roundScoreRequests.delete(round);
            throw error;
        });

    roundScoreRequests.set(round, request);
    return request;
}

export function FantasyTeamBuilder() {
    const [players, setPlayers] = useState<FantasyDemoPlayer[]>([]);
    const [catalogPlayers, setCatalogPlayers] = useState<FantasyDemoPlayer[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [lineupIds, setLineupIds] = useState<string[]>([]);
    const [selectedRound, setSelectedRound] = useState<number>(1);
    const [dateKey, setDateKey] = useState(() => getDateKey());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scoresLoading, setScoresLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadRoster() {
            setLoading(true);
            setError(null);

            try {
                const payload = await fetchCompetitionRoster();

                const teamsById = new Map(
                    payload.teams.map((team) => [
                        team.rfevbId,
                        team.name,
                    ])
                );
                const realPlayers: FantasyDemoPlayer[] = payload.players.map(
                    (player) => ({
                        id: player.id,
                        name: player.displayName,
                        club:
                            teamsById.get(
                                player.currentTeamId?.replace(
                                    "rfevb:team:",
                                    ""
                                )
                            ) ?? "Equipo desconocido",
                        position: player.position,
                        price: 0,
                        season: "25-26",
                        weeklyScores: {},
                    })
                );
                if (!cancelled) {
                    setCatalogPlayers(realPlayers);
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : "No se pudo cargar el catálogo de jugadores."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadRoster();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (catalogPlayers.length === 0) {
            return;
        }

        const dailyRoster = createDailyFantasyRoster(catalogPlayers, dateKey);
        // Reset the in-memory demo team when the daily market changes.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPlayers(dailyRoster.players);
        setSelectedIds(dailyRoster.initialTeamIds);
        setLineupIds(dailyRoster.initialLineupIds);
    }, [catalogPlayers, dateKey]);

    useEffect(() => {
        if (catalogPlayers.length === 0) {
            return;
        }

        let cancelled = false;
        // Loading state tracks the asynchronous score request.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setScoresLoading(true);

        fetchRoundScores(selectedRound)
            .then((response) => {
                if (cancelled) {
                    return;
                }

                const scoresByPlayerId = new Map<string, number>(
                    response.scores.map((score) => [
                        score.playerId,
                        score.score,
                    ])
                );
                const dailyRoster = createDailyFantasyRoster(
                    catalogPlayers,
                    dateKey
                );

                setPlayers(
                    dailyRoster.players.map((player) => ({
                        ...player,
                        weeklyScores: {
                            [selectedRound]:
                                scoresByPlayerId.get(player.id) ?? 0,
                        },
                    }))
                );
            })
            .catch((scoreError) => {
                if (!cancelled) {
                    setError(
                        scoreError instanceof Error
                            ? scoreError.message
                            : "No se pudieron calcular los puntos de la jornada."
                    );
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setScoresLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [catalogPlayers, dateKey, selectedRound]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            const nextDateKey = getDateKey();
            setDateKey((currentDateKey) =>
                currentDateKey === nextDateKey ? currentDateKey : nextDateKey
            );
        }, 60_000);

        return () => window.clearInterval(interval);
    }, []);

    const playerMap = useMemo(
        () => new Map(players.map((player) => [player.id, player])),
        [players]
    );

    const rosterPlayers = useMemo(
        () =>
            selectedIds.flatMap((id) => {
                const player = playerMap.get(id);
                return player ? [player] : [];
            }),
        [playerMap, selectedIds]
    );

    const lineupPlayers = useMemo(
        () =>
            lineupIds.flatMap((id) => {
                const player = playerMap.get(id);
                return player ? [player] : [];
            }),
        [lineupIds, playerMap]
    );

    const rosterValidation = useMemo(
        () => validateRosterSize(selectedIds),
        [selectedIds]
    );

    const lineupValidation = useMemo(
        () => validateLineup(lineupIds, players),
        [lineupIds, players]
    );

    const buyPlayer = (playerId: string) => {
        if (selectedIds.includes(playerId)) return;
        if (selectedIds.length >= 14) return;
        setSelectedIds((current) => [...current, playerId]);
    };

    const sellPlayer = (playerId: string) => {
        setSelectedIds((current) => current.filter((id) => id !== playerId));
        setLineupIds((current) => current.filter((id) => id !== playerId));
    };

    const toggleLineup = (playerId: string) => {
        if (!selectedIds.includes(playerId)) return;

        if (lineupIds.includes(playerId)) {
            setLineupIds((current) => current.filter((id) => id !== playerId));
            return;
        }

        if (lineupIds.length >= 7) return;

        setLineupIds((current) => [...current, playerId]);
    };

    const lineupScore = calculateLineupScoreForRound(lineupIds, selectedRound, players);

    if (loading) {
        return <p className="rounded-lg bg-white p-6 text-slate-600">Cargando jugadores reales de RFEVB...</p>;
    }

    if (error) {
        return <p className="rounded-lg bg-red-50 p-6 text-red-700">{error}</p>;
    }

    return (
        <div className="space-y-8">
            <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Plantilla</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{selectedIds.length}/14</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Alineación</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{lineupIds.length}/7</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Puntuación jornada {selectedRound}</p>
                    <p className="mt-2 text-3xl font-bold text-violet-600">
                        {scoresLoading ? "..." : lineupScore}
                    </p>
                </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                    <h2 className="text-2xl font-bold text-slate-900">Mercado de fichajes</h2>
                    <p className="text-sm text-slate-500">
                        Jugadores reales de RFEVB disponibles hoy · semilla {dateKey}
                    </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {players.map((player) => {
                        const isSelected = selectedIds.includes(player.id);

                        return (
                            <div
                                key={player.id}
                                className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                                    isSelected
                                        ? "border-violet-500 bg-violet-50"
                                        : "border-slate-200 bg-slate-50"
                                }`}
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-slate-900">{player.name}</p>
                                    <p className="text-sm text-slate-600">
                                        {player.club} · {displayPosition(player.position)} · {player.price}M
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => (isSelected ? sellPlayer(player.id) : buyPlayer(player.id))}
                                    className={`rounded px-3 py-2 text-sm font-semibold transition ${
                                        isSelected
                                            ? "bg-red-500 text-white hover:bg-red-600"
                                            : "bg-emerald-600 text-white hover:bg-emerald-700"
                                    }`}
                                >
                                    {isSelected ? "Vender" : "Comprar"}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Mi equipo y alineación</h2>
                        <p className="text-sm text-slate-500">
                            Gestiona tu plantilla y elige los 7 titulares de la jornada.
                        </p>
                    </div>
                    {!rosterValidation.valid && (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            {rosterValidation.errors[0]}
                        </span>
                    )}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                        <h3 className="mb-4 text-lg font-bold text-slate-900">Plantilla ({selectedIds.length}/14)</h3>
                        <div className="space-y-3">
                            {rosterPlayers.length > 0 ? (
                                rosterPlayers.map((player) => {
                                    const isInLineup = lineupIds.includes(player.id);
                                    return (
                                        <div
                                            key={player.id}
                                            className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                                                isInLineup
                                                    ? "border-emerald-500 bg-emerald-50"
                                                    : "border-slate-200 bg-slate-50"
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-semibold text-slate-900">{player.name}</p>
                                                <p className="text-sm text-slate-600">{player.club} · {displayPosition(player.position)}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => toggleLineup(player.id)}
                                                className={`rounded px-3 py-2 text-sm font-semibold transition ${
                                                    isInLineup
                                                        ? "bg-amber-500 text-white hover:bg-amber-600"
                                                        : "bg-sky-600 text-white hover:bg-sky-700"
                                                }`}
                                            >
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
                        <h3 className="text-lg font-bold text-slate-900">Titulares actuales ({lineupIds.length}/7)</h3>
                        <div className="mt-4 space-y-2">
                            {lineupPlayers.length > 0 ? (
                                lineupPlayers.map((player) => (
                                    <div key={player.id} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                        <span>{player.name}</span>
                                        <span>{displayPosition(player.position)}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500">No hay jugadores alineados todavía.</p>
                            )}
                        </div>

                        {lineupValidation.errors.length > 0 && (
                            <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
                                {lineupValidation.errors.map((error) => (
                                    <p key={error}>{error}</p>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-slate-900">Puntuación por jornada</h3>
                    <select
                        value={selectedRound}
                        onChange={(event) => setSelectedRound(Number(event.target.value))}
                        className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                        {rounds.map((round) => (
                            <option key={round.number} value={round.number}>
                                {round.label}
                            </option>
                        ))}
                    </select>
                </div>

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
                                const score = calculateLineupScoreForRound(
                                    lineupIds,
                                    round.number,
                                    players
                                );

                                return (
                                    <tr key={round.number} className="border-b border-slate-100">
                                        <td className="px-3 py-2 text-slate-700">{round.label}</td>
                                        <td className={`px-3 py-2 font-semibold ${
                                            round.number === selectedRound ? "text-violet-700" : "text-slate-700"
                                        }`}>
                                            {round.number === selectedRound && scoresLoading ? "..." : score}
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
