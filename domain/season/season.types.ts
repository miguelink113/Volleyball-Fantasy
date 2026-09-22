export interface Season {
    id: string;             // UUID interno
    rfevbId: string;        // ID oficial RFEVB (ej. "186")
    competitionId: string;  // FK a Competition
    name: string;           // ej. "2025-2026"
    isCurrent: boolean;
    createdAt?: Date;
}