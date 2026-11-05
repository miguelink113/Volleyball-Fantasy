'use client';

import { useRouter, useSearchParams } from 'next/navigation';

type Option = { seasonId: string; competitionName: string; seasonName: string };

export function CompetitionSelector({
                                        options,
                                        currentSeasonId,
                                    }: {
    options: Option[];
    currentSeasonId: string;
}) {
    const router = useRouter();
    const params = useSearchParams();

    return (
        <select
            value={currentSeasonId}
            onChange={(e) => {
                const next = new URLSearchParams(params.toString());
                next.set('seasonId', e.target.value);
                next.delete('round'); // reset jornada al cambiar competición
                router.push(`/results?${next.toString()}`);
            }}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-700"
        >
            {options.map((o) => (
                <option key={o.seasonId} value={o.seasonId}>
                    {o.competitionName} · {o.seasonName}
                </option>
            ))}
        </select>
    );
}