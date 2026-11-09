"use client";

import { useEffect, useState, useMemo } from "react";
import { X, Loader2, Activity, ChevronLeft, ChevronRight } from "lucide-react";
import type { FantasyDemoPlayer } from "@/lib/services/fantasy/fantasy-team.service";

export function PlayerStatsModal({
                                     player,
                                     competitionId,
                                     seasonId,
                                     onClose
                                 }: {
    player: FantasyDemoPlayer,
    competitionId: number,
    seasonId: number,
    onClose: () => void
}) {
    const [loading, setLoading] = useState(true);
    const [scores, setScores] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedRoundIndex, setSelectedRoundIndex] = useState(0);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch(`/api/fantasy-round-scores?competition=${competitionId}&season=${seasonId}&playerId=${player.id}`);
                const payload = await res.json();
                if (payload.success) {
                    setScores(payload.scores);
                    // Seleccionamos la última jornada por defecto
                    if (payload.scores.length > 0) {
                        setSelectedRoundIndex(payload.scores.length - 1);
                    }
                } else {
                    setError(payload.error);
                }
            } catch (err) {
                setError("Error de conexión");
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, [player.id, competitionId, seasonId]);

    // 🚀 OPTIMIZACIÓN: Memoizamos el cálculo de los datos actuales
    const currentScoreData = useMemo(() => {
        if (!scores[selectedRoundIndex]) return null;
        return scores[selectedRoundIndex];
    }, [scores, selectedRoundIndex]);

    const handlePrev = () => setSelectedRoundIndex(prev => Math.max(0, prev - 1));
    const handleNext = () => setSelectedRoundIndex(prev => Math.min(scores.length - 1, prev + 1));

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Cabecera */}
                <div className="p-5 border-b border-slate-200 flex justify-between items-start bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{player.name}</h2>
                        <p className="text-sm text-slate-500">{player.club} · {player.position} · {player.price}M</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-md hover:bg-slate-200 text-slate-500 transition-colors active:scale-95">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Contenido */}
                <div className="p-5 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-500" />
                            <p>Cargando estadísticas...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-500 py-10">{error}</div>
                    ) : scores.length === 0 ? (
                        <div className="text-center text-slate-500 py-10">
                            <Activity className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                            <p>Este jugador no tiene jornadas registradas.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">

                            {/* Selector de Jornada mejorado */}
                            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
                                <button
                                    onClick={handlePrev}
                                    disabled={selectedRoundIndex === 0}
                                    className="p-2 rounded-md bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
                                    title="Jornada anterior"
                                >
                                    <ChevronLeft className="h-5 w-5 text-slate-700" />
                                </button>

                                <div className="text-center flex-1 mx-4">
                                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Jornada</span>
                                    <div className="flex items-center justify-center gap-2">
                                        <select
                                            value={selectedRoundIndex}
                                            onChange={(e) => setSelectedRoundIndex(Number(e.target.value))}
                                            className="text-xl font-bold text-slate-900 bg-transparent border-none focus:ring-0 cursor-pointer text-center appearance-none outline-none"
                                        >
                                            {scores.map((s, idx) => (
                                                <option key={idx} value={idx}>Jornada {s.roundNumber}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={handleNext}
                                    disabled={selectedRoundIndex === scores.length - 1}
                                    className="p-2 rounded-md bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
                                    title="Jornada siguiente"
                                >
                                    <ChevronRight className="h-5 w-5 text-slate-700" />
                                </button>
                            </div>

                            {/* Contenedor animado con key para forzar el fade-in al cambiar de jornada */}
                            <div key={selectedRoundIndex} className="space-y-6 animate-in fade-in duration-300">

                                {/* Resumen de Puntos Fantasy */}
                                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex justify-between items-center shadow-sm">
                                    <div>
                                        <h3 className="font-semibold text-emerald-800">Puntuación Fantasy</h3>
                                        <p className="text-xs text-emerald-600">Partidos jugados: {currentScoreData.matchesPlayed}</p>
                                    </div>
                                    <p className="text-3xl font-bold text-emerald-600">{currentScoreData.score} pts</p>
                                </div>

                                {/* Desglose de puntos */}
                                {currentScoreData.matchesPlayed > 0 && Object.keys(currentScoreData.breakdown).length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Desglose de Puntuación</h4>
                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                            {Object.entries(currentScoreData.breakdown).map(([key, val]) => (
                                                <div key={key} className="bg-slate-50 border border-slate-200 rounded p-2 text-center shadow-sm">
                                                    <p className="text-xs text-slate-500 capitalize">{key}</p>
                                                    <p className="font-bold text-slate-800">{val as number}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Estadísticas Reales por Partido */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Estadísticas Reales</h4>
                                    {currentScoreData.matches.length === 0 ? (
                                        <div className="text-center py-6 text-sm text-slate-500 bg-slate-50 rounded-lg border border-slate-200 shadow-sm">
                                            El jugador no disputó ningún partido en esta jornada.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {currentScoreData.matches.map((match: any) => (
                                                <div key={match.id} className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                                                        <p className="text-sm font-medium text-slate-800">
                                                            {match.homeTeam} <span className="font-bold bg-white px-2 py-0.5 rounded border border-slate-200">{match.homeSets} - {match.awaySets}</span> {match.awayTeam}
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 text-sm bg-white">
                                                        <div>
                                                            <p className="text-xs text-slate-500">Sets Jugados</p>
                                                            <p className="font-semibold">{match.rawStats.setsPlayed}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-500">Puntos Totales</p>
                                                            <p className="font-semibold">{match.rawStats.pointsTotal}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-500">Ataques (Pts/Err)</p>
                                                            <p className="font-semibold">{match.rawStats.attackPoints} / {match.rawStats.attackErrors}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-500">Bloqueos</p>
                                                            <p className="font-semibold">{match.rawStats.blockPoints}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-500">Saques (Aces/Err)</p>
                                                            <p className="font-semibold">{match.rawStats.serveAces} / {match.rawStats.serveErrors}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-500">Recepción (Pos/Exc)</p>
                                                            <p className="font-semibold">{match.rawStats.receptionPositive} / {match.rawStats.receptionExcellent}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}