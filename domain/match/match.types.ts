import { MatchSet } from './match-set.types';

export type MatchStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'POSTPONED';

export interface Match {
    id: string;             // UUID interno
    rfevbMatchId: string;   // ID oficial de RFEVB (ej. "13881")
    competitionId: string;  // FK a Competition
    seasonId: string;       // FK a Season
    roundNumber: number;    // Jornada
    homeTeamId: string;     // FK a Team
    awayTeamId: string;     // FK a Team
    homeSets: number | null;
    awaySets: number | null;
    matchDate?: Date;
    status: MatchStatus;
    sets?: MatchSet[];
    createdAt?: Date;
}