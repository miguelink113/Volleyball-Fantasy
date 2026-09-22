export type PlayerPosition = 'setter' | 'opposite' | 'outside' | 'middle' | 'libero';

export interface Player {
    id: string;             // UUID interno de base de datos
    rfevbId?: string;       // ID oficial global RFEVB (si aplica)
    firstName: string;
    lastName: string;
    displayName: string;    // Nombre deportivo habitual
    position: PlayerPosition;
    currentTeamId?: string; // FK al equipo actual
    dorsal?: number;
    photoUrl?: string;
    createdAt?: Date;
    updatedAt?: Date;
}