"use client";

import { useMemo, useState } from "react";
import {
    defaultFantasyLineupIds,
    defaultFantasyTeamIds,
    season25Players,
} from "@/lib/data/season-25-26/players";
import {
    calculateLineupScoreForRound,
    validateLineup,
    validateRosterSize,
} from "@/lib/services/fantasy/fantasy-team.service";

const rounds = [1, 2, 3, 4, 5, 6, 7, 8];

export function FantasyTeamBuilder() {
    const [selectedIds, setSelectedIds] = useState<string[]>(defaultFantasyTeamIds);
    const [lineupIds, setLineupIds] = useState<string[]>(defaultFantasyLineupIds);
    const [selectedRound, setSelectedRound] = useState<number>(1);

    const playerMap = useMemo(
        () => new Map(season25Players.map((player) => [player.id, player])),
        []
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

    const availablePlayers = useMemo(
        () => season25Players.filter((player) => !selectedIds.includes(player.id)),
        [selectedIds]
    );

    const rosterValidation = useMemo(
        () => validateRosterSize(selectedIds),
        [selectedIds]
    );

    const lineupValidation = useMemo(
        () => validateLineup(lineupIds, season25Players),
        [lineupIds]
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

    const lineupScore = calculateLineupScoreForRound(lineupIds, selectedRound, season25Players);

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
                    <p className="mt-2 text-3xl font-bold text-violet-600">{lineupScore}</p>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Plantilla 25-26</h2>
                            <p className="text-sm text-slate-500">Compra o vende jugadores.</p>
                        </div>
                        {!rosterValidation.valid && (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                {rosterValidation.errors[0]}
                            </span>
                        )}
                    </div>

                    <div className="space-y-3">
                        {season25Players.map((player) => {
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
                                            {player.club} · {player.position} · {player.price}M
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
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900">Alineación</h3>
                    <p className="mb-4 text-sm text-slate-500">
                        Elige los 7 jugadores titulares para la jornada.
                    </p>

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
                                            <p className="text-sm text-slate-600">{player.club} · {player.position}</p>
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

                    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <h4 className="text-sm font-bold uppercase tracking-wide text-slate-600">Titulares actuales</h4>
                        <div className="mt-3 space-y-2">
                            {lineupPlayers.length > 0 ? (
                                lineupPlayers.map((player) => (
                                    <div key={player.id} className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                                        <span>{player.name}</span>
                                        <span>{player.position}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500">No hay jugadores alineados todavía.</p>
                            )}
                        </div>
                    </div>

                    {lineupValidation.errors.length > 0 && (
                        <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
                            {lineupValidation.errors.map((error) => (
                                <p key={error}>{error}</p>
                            ))}
                        </div>
                    )}
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
                            <option key={round} value={round}>
                                Jornada {round}
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
                                const score = calculateLineupScoreForRound(lineupIds, round, season25Players);

                                return (
                                    <tr key={round} className="border-b border-slate-100">
                                        <td className="px-3 py-2 text-slate-700">{round}</td>
                                        <td className={`px-3 py-2 font-semibold ${
                                            round === selectedRound ? "text-violet-700" : "text-slate-700"
                                        }`}>
                                            {score}
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
