export type Position = "S" | "OH" | "OP" | "MB" | "L";
export type Trend = "up" | "down" | "stable";

export interface PlayerStats {
  attack: number;
  block: number;
  serve: number;
  reception: number;
  dig: number;
}

export interface Player {
  id: number;
  name: string;
  pos: Position;
  team: string;
  nat: string;
  age: number;
  price: number;
  trend: Trend;
  points: number;
  injured: boolean;
  form: number[];
  stats: PlayerStats;
  priceHistory: { w: string; price: number }[];
}

export interface Match {
  id: number;
  home: string;
  away: string;
  date: string;
  time: string;
  status: "live" | "upcoming";
  setsHome?: number;
  setsAway?: number;
  pointsHome?: number;
  pointsAway?: number;
  set?: number;
}

export interface NewsItem {
  id: number;
  title: string;
  cat: string;
  excerpt: string;
  date: string;
}

export interface Standing {
  rank: number;
  name: string;
  points: number;
  change: Trend | "same";
}
