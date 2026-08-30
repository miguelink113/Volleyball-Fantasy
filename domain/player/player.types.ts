export interface Player {
    id: string;
    name: string;
    position?: PlayerPosition;
}

export enum PlayerPosition {
    Setter = "setter",
    Opposite = "opposite",
    OutsideHitter = "outside_hitter",
    MiddleBlocker = "middle_blocker",
    Libero = "libero",
}