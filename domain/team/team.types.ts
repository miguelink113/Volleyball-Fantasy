export interface Team {
    id: string;             // UUID interno
    rfevbId: string;        // ID de equipo en RFEVB (obligatorio)
    name: string;           // Nombre completo
    shortName?: string;     // Abreviatura / Siglas
    logoUrl?: string;
    createdAt?: Date;
}