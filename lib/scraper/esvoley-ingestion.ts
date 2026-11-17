import { ESVOLEY_GROUPS } from "@/lib/scraper/esvoley-groups";
import type { EsvoleyMatch } from "@/lib/scraper/fetch-matches-esvoley";
import {
    calculateContainment,
    calculateSimilarity,
} from "@/lib/services/ingestion/team-alias-resolver";

export interface EsvoleyGroup {
    id: number;
    name: string;
}

export function getEsvoleyGroups(
    competitionRfevbId: number
): EsvoleyGroup[] {
    const mapping = ESVOLEY_GROUPS as unknown as Record<
        string,
        { groups: EsvoleyGroup[] }
    >;
    const competition = mapping[String(competitionRfevbId)];
    return competition?.groups ?? [];
}

export function normalizeTeamName(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

export function canonicalizeRoundGroupName(
    value: string | null | undefined
): string | null {
    const normalized = normalizeTeamName(value ?? "");
    if (!normalized) return null;
    if (normalized.includes("liga regular")) return "Liga Regular";

    const group = normalized.match(/\bgrupo\s*([abc])\b/);
    if (group) return `Grupo ${group[1].toUpperCase()}`;

    return value?.trim() || null;
}

export function isSameTeamPair(
    firstHome: string,
    firstAway: string,
    secondHome: string,
    secondAway: string,
    resolvedTeamIds?: Map<string, string | null>
): boolean {
    if (resolvedTeamIds) {
        const firstHomeId = resolvedTeamIds.get(firstHome);
        const firstAwayId = resolvedTeamIds.get(firstAway);
        const secondHomeId = resolvedTeamIds.get(secondHome);
        const secondAwayId = resolvedTeamIds.get(secondAway);

        if (
            firstHomeId && firstAwayId &&
            secondHomeId && secondAwayId
        ) {
            return (
                firstHomeId === secondHomeId &&
                firstAwayId === secondAwayId
            );
        }
    }

    const home = normalizeTeamName(firstHome);
    const away = normalizeTeamName(firstAway);
    const otherHome = normalizeTeamName(secondHome);
    const otherAway = normalizeTeamName(secondAway);

    if (!home || !away || !otherHome || !otherAway) return false;

    const sameName = (left: string, right: string): boolean => {
        if (left === right || left.includes(right) || right.includes(left)) {
            return true;
        }
        return (
            calculateContainment(left, right) >= 70 ||
            calculateSimilarity(left, right) >= 70
        );
    };

    return sameName(home, otherHome) && sameName(away, otherAway);
}

export function findEsvoleyMatch(
    dataProjectMatch: {
        matchId: string;
        round: number;
        homeTeam: string;
        awayTeam: string;
        matchDate: Date | null;
    },
    esvoleyMatches: Array<EsvoleyMatch & { esvoleyGroupName: string }>,
    preferredGroup: string,
    resolvedTeamIds?: Map<string, string | null>
): (EsvoleyMatch & { esvoleyGroupName: string }) | null {
    const samePair = esvoleyMatches.filter((candidate) =>
        isSameTeamPair(
            dataProjectMatch.homeTeam,
            dataProjectMatch.awayTeam,
            candidate.homeTeam,
            candidate.awayTeam,
            resolvedTeamIds
        )
    );

    if (samePair.length === 0) return null;

    const sameGroup: Array<
        EsvoleyMatch & { esvoleyGroupName: string }
    > = [];
    for (const candidate of samePair) {
        if (!candidate.esvoleyGroupName) continue;
        if (
            canonicalizeRoundGroupName(candidate.esvoleyGroupName) ===
            canonicalizeRoundGroupName(preferredGroup)
        ) {
            sameGroup.push(candidate);
        }
    }

    const candidates = sameGroup.length > 0 ? sameGroup : samePair;
    if (candidates.length === 1) return candidates[0];

    const sameRound = candidates.filter(
        (candidate) => candidate.round === dataProjectMatch.round
    );
    if (sameRound.length === 1) return sameRound[0];

    if (dataProjectMatch.matchDate) {
        const sameDate = candidates.filter((candidate) => {
            if (!candidate.matchDate) return false;
            return candidate.matchDate.toISOString().slice(0, 10) ===
                dataProjectMatch.matchDate!.toISOString().slice(0, 10);
        });
        if (sameDate.length === 1) return sameDate[0];
    }

    return null;
}
