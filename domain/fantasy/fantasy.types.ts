import { PlayerPosition } from '../player/player.types';

export interface PlayerMarketValue {
    id: string;
    playerId: string;
    price: number;
    validFrom: Date;
    validTo?: Date;
    calculationReason?: string;
}

export interface FantasyTeam {
    id: string;
    userId: string;
    leagueId: string;
    name: string;
    budget: number;
    createdAt: Date;
}

export interface FantasyTeamPlayer {
    id: string;
    fantasyTeamId: string;
    playerId: string;
    buyPrice: number;
    joinedAt: Date;
    leftAt?: Date;
    isActive: boolean;
}

export interface FantasyLineup {
    id: string;
    fantasyTeamId: string;
    roundNumber: number;
    isLocked: boolean;
    lockedAt?: Date;
    players: FantasyLineupSlot[];
}

export interface FantasyLineupSlot {
    playerId: string;
    position: PlayerPosition;
}

export interface League {
    id: string;
    name: string;
    code: string;
    seasonId: string;
    createdBy: string;
    createdAt: Date;
}

export type LeagueMemberRole = 'admin' | 'member';

export interface LeagueMember {
    id: string;
    leagueId: string;
    userId: string;
    role: LeagueMemberRole;
    joinedAt: Date;
}