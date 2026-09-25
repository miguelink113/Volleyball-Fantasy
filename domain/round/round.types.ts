export type RoundStatus =
    | "SCHEDULED"
    | "OPEN"
    | "LOCKED"
    | "COMPLETED";

export interface Round {
    id: string;
    competitionId: string;
    seasonId: string;
    roundNumber: number;
    name?: string;
    startsAt: Date;
    endsAt: Date;
    status: RoundStatus;
    createdAt?: Date;
}

export function isRoundLocked(round: Round, now: Date = new Date()): boolean {
    return now >= round.startsAt && now <= round.endsAt;
}
