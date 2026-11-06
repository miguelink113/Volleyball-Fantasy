import { Calendar, CheckCircle2, Clock } from "lucide-react";

export type MatchData = {
    id: string;
    home_team_name: string;
    away_team_name: string;
    home_sets: number | null;
    away_sets: number | null;
    status: string;
    match_date: string | null;
    group_name?: string | null;
};

export function MatchList({ matches }: { matches: MatchData[] }) {
    if (matches.length === 0) {
        return (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                <Calendar className="mx-auto h-8 w-8 text-slate-300 mb-3" />
                No hay partidos registrados para esta jornada.
            </div>
        );
    }

    // Agrupamos los partidos. Si no tienen grupo, van a "General"
    const groupedMatches = matches.reduce((acc, match) => {
        const group = match.group_name || "General";
        if (!acc[group]) acc[group] = [];
        acc[group].push(match);
        return acc;
    }, {} as Record<string, MatchData[]>);

    // Ordenamos: "General" al final, el resto alfabéticamente
    const sortedGroups = Object.keys(groupedMatches).sort((a, b) => {
        if (a === "General") return 1;
        if (b === "General") return -1;
        return a.localeCompare(b);
    });

    return (
        <div className="space-y-6">
            {sortedGroups.map((groupName) => {
                const displayTitle = groupName === "General" ? "Otros Partidos (Aplazados / Sin Grupo)" : groupName;

                return (
                    <div key={groupName} className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">

                        {/* Título del Grupo */}
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">
                                {displayTitle}
                            </h3>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {groupedMatches[groupName].map((match) => {
                                const isCompleted = match.status === "COMPLETED";
                                return (
                                    <div key={match.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex-1 text-right pr-4">
                                            <p className="font-semibold text-slate-900">{match.home_team_name}</p>
                                        </div>

                                        <div className="flex flex-col items-center justify-center min-w-[80px]">
                                            {isCompleted ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-lg font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded">
                                                        {match.home_sets} - {match.away_sets}
                                                    </span>
                                                    <span title="Finalizado">
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-400">
                                                    <Clock className="h-4 w-4 mb-1" />
                                                    <span className="text-xs font-medium">
                                                        {match.match_date ? new Date(match.match_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "Pendiente"}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 text-left pl-4">
                                            <p className="font-semibold text-slate-900">{match.away_team_name}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}