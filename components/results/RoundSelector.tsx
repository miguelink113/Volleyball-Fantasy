"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type RoundOption = {
    number: number;
    label: string;
};

export function RoundSelector({ rounds, currentRoundNumber }: { rounds: RoundOption[], currentRoundNumber?: number }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("round", e.target.value); // Guardamos el número, no el UUID
        router.push(`${pathname}?${params.toString()}`);
    };

    if (rounds.length === 0) return null;

    return (
        <div className="flex items-center gap-2">
            <label htmlFor="round-select" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                Jornada:
            </label>
            <select
                id="round-select"
                value={currentRoundNumber || rounds[0].number}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
                {rounds.map((r) => (
                    <option key={r.number} value={r.number}> {/* <-- AÑADIR key AQUÍ */}
                        {r.label}
                    </option>
                ))}
            </select>
        </div>
    );
}