import type { Player, Match, NewsItem, Standing, Position } from "./types";

export const POS: Record<Position, { label: string; color: string; text: string; ring: string }> = {
  S: { label: "Setter", color: "bg-amber-500", text: "text-amber-400", ring: "ring-amber-500/40" },
  OH: { label: "Outside Hitter", color: "bg-sky-500", text: "text-sky-400", ring: "ring-sky-500/40" },
  OP: { label: "Opposite", color: "bg-orange-500", text: "text-orange-400", ring: "ring-orange-500/40" },
  MB: { label: "Middle Blocker", color: "bg-violet-500", text: "text-violet-400", ring: "ring-violet-500/40" },
  L: { label: "Libero", color: "bg-emerald-500", text: "text-emerald-400", ring: "ring-emerald-500/40" },
};

export const initials = (name: string) =>
  name.split(" ").map((n) => n[0]).slice(0, 2).join("");

interface MkArgs {
  id: number;
  name: string;
  pos: Position;
  team: string;
  nat: string;
  age: number;
  price: number;
  trend: "up" | "down" | "stable";
  points: number;
  injured: boolean;
  form: number[];
  stats: { attack: number; block: number; serve: number; reception: number; dig: number };
}

const mkPlayer = (a: MkArgs): Player => ({
  ...a,
  priceHistory: a.form.map((_f, i) => ({
    w: `S${i + 1}`,
    price: +(a.price - (a.form.length - i) * (a.trend === "down" ? 0.15 : -0.12)).toFixed(1),
  })),
});

export const PLAYERS: Player[] = [
  mkPlayer({ id: 1, name: "Marco Ibáñez", pos: "S", team: "Costa Volley", nat: "ES", age: 27, price: 9.2, trend: "up", points: 612, injured: false, form: [18, 22, 19, 25, 21], stats: { attack: 40, block: 22, serve: 68, reception: 55, dig: 60 } }),
  mkPlayer({ id: 2, name: "Luka Vidović", pos: "OH", team: "Titanes del Norte", nat: "SRB", age: 24, price: 11.8, trend: "up", points: 745, injured: false, form: [30, 28, 34, 26, 32], stats: { attack: 78, block: 45, serve: 62, reception: 70, dig: 58 } }),
  mkPlayer({ id: 3, name: "Rafael Souza", pos: "OH", team: "CV Canarias", nat: "BR", age: 29, price: 10.4, trend: "stable", points: 690, injured: false, form: [24, 29, 22, 27, 25], stats: { attack: 74, block: 40, serve: 58, reception: 66, dig: 55 } }),
  mkPlayer({ id: 4, name: "Ivan Kozlov", pos: "OP", team: "Marés Altas", nat: "PL", age: 26, price: 12.5, trend: "up", points: 780, injured: false, form: [33, 30, 36, 29, 31], stats: { attack: 82, block: 35, serve: 66, reception: 40, dig: 38 } }),
  mkPlayer({ id: 5, name: "Diego Fontán", pos: "MB", team: "Real Set Madrid", nat: "AR", age: 25, price: 8.7, trend: "down", points: 560, injured: true, form: [15, 20, 12, 18, 16], stats: { attack: 60, block: 80, serve: 45, reception: 20, dig: 30 } }),
  mkPlayer({ id: 6, name: "Hana Kobayashi", pos: "MB", team: "CV Barcelona", nat: "JP", age: 23, price: 9.9, trend: "up", points: 630, injured: false, form: [22, 25, 20, 27, 24], stats: { attack: 65, block: 84, serve: 50, reception: 25, dig: 32 } }),
  mkPlayer({ id: 7, name: "Tomás Ferreira", pos: "L", team: "Ícaro Voleibol", nat: "PT", age: 28, price: 6.4, trend: "stable", points: 505, injured: false, form: [17, 19, 18, 20, 19], stats: { attack: 5, block: 8, serve: 30, reception: 88, dig: 92 } }),
  mkPlayer({ id: 8, name: "Aitor Etxeberria", pos: "S", team: "CV Canarias", nat: "ES", age: 22, price: 5.1, trend: "up", points: 340, injured: false, form: [10, 14, 12, 16, 13], stats: { attack: 35, block: 18, serve: 55, reception: 48, dig: 50 } }),
  mkPlayer({ id: 9, name: "Nikolaj Petrov", pos: "OH", team: "Atlántico CV", nat: "BG", age: 30, price: 7.6, trend: "down", points: 470, injured: false, form: [16, 14, 18, 12, 15], stats: { attack: 68, block: 38, serve: 55, reception: 60, dig: 48 } }),
  mkPlayer({ id: 10, name: "Bruno Almeida", pos: "OP", team: "Titanes del Norte", nat: "BR", age: 31, price: 8.9, trend: "stable", points: 520, injured: false, form: [19, 21, 17, 20, 18], stats: { attack: 72, block: 32, serve: 60, reception: 35, dig: 33 } }),
  mkPlayer({ id: 11, name: "Erik Johansson", pos: "MB", team: "Marés Altas", nat: "SE", age: 27, price: 7.3, trend: "up", points: 480, injured: false, form: [15, 18, 16, 20, 17], stats: { attack: 58, block: 76, serve: 42, reception: 22, dig: 28 } }),
  mkPlayer({ id: 12, name: "Paolo Ricci", pos: "L", team: "Real Set Madrid", nat: "IT", age: 26, price: 5.8, trend: "stable", points: 430, injured: false, form: [14, 16, 15, 17, 16], stats: { attack: 4, block: 6, serve: 28, reception: 84, dig: 88 } }),
  mkPlayer({ id: 13, name: "Kenji Watanabe", pos: "OH", team: "CV Barcelona", nat: "JP", age: 25, price: 9.4, trend: "up", points: 655, injured: false, form: [26, 24, 29, 25, 28], stats: { attack: 76, block: 42, serve: 60, reception: 68, dig: 52 } }),
  mkPlayer({ id: 14, name: "Sven Bakker", pos: "OP", team: "Ícaro Voleibol", nat: "NL", age: 28, price: 10.9, trend: "down", points: 590, injured: false, form: [20, 17, 22, 15, 18], stats: { attack: 79, block: 30, serve: 58, reception: 30, dig: 25 } }),
  mkPlayer({ id: 15, name: "Yusuf Demir", pos: "MB", team: "Atlántico CV", nat: "TR", age: 24, price: 6.9, trend: "up", points: 410, injured: false, form: [12, 15, 13, 17, 14], stats: { attack: 55, block: 72, serve: 40, reception: 20, dig: 26 } }),
  mkPlayer({ id: 16, name: "Mateo Rossi", pos: "S", team: "Marés Altas", nat: "IT", age: 29, price: 8.1, trend: "stable", points: 555, injured: false, form: [18, 20, 17, 21, 19], stats: { attack: 38, block: 20, serve: 64, reception: 52, dig: 56 } }),
  mkPlayer({ id: 17, name: "Carlos Núñez", pos: "OH", team: "Real Set Madrid", nat: "ES", age: 23, price: 6.2, trend: "up", points: 380, injured: false, form: [13, 15, 14, 18, 15], stats: { attack: 66, block: 36, serve: 50, reception: 58, dig: 44 } }),
  mkPlayer({ id: 18, name: "Dmitri Sokolov", pos: "MB", team: "Costa Volley", nat: "RU", age: 30, price: 7.0, trend: "down", points: 400, injured: true, form: [11, 13, 9, 12, 10], stats: { attack: 52, block: 70, serve: 38, reception: 18, dig: 24 } }),
];

export const DEFAULT_LINEUP: Record<string, number> = { S: 1, OH1: 2, OH2: 3, OP: 4, MB1: 5, MB2: 6, L: 7 };
export const DEFAULT_BENCH: number[] = [8, 9, 10, 11];

export const MATCHES: Match[] = [
  { id: 1, home: "Costa Volley", away: "Titanes del Norte", date: "Today", time: "20:30", status: "live", setsHome: 2, setsAway: 1, pointsHome: 18, pointsAway: 15, set: 4 },
  { id: 2, home: "CV Barcelona", away: "Marés Altas", date: "Today", time: "22:00", status: "upcoming" },
  { id: 3, home: "Real Set Madrid", away: "Ícaro Voleibol", date: "Tomorrow", time: "19:00", status: "upcoming" },
  { id: 4, home: "Atlántico CV", away: "CV Canarias", date: "Sat 16", time: "18:30", status: "upcoming" },
];

export const NEWS: NewsItem[] = [
  { id: 1, title: "Ibáñez breaks the assist record in round 12", cat: "Match Report", excerpt: "Costa Volley's setter dished out 19 assists in a dominant straight-sets win, cementing his fantasy value ahead of the market close.", date: "2h ago" },
  { id: 2, title: "Transfer buzz: three middles trending up this week", cat: "Transfer Rumors", excerpt: "Value rises across the middle blocker market as managers chase blocking efficiency ahead of the run-in.", date: "5h ago" },
  { id: 3, title: "Injury update: Fontán expected out for two rounds", cat: "Injuries", excerpt: "Real Set Madrid's middle blocker will miss the next two fixtures with an ankle knock, per club sources.", date: "1d ago" },
  { id: 4, title: "Tactics board: why liberos matter more than ever", cat: "Analysis", excerpt: "A deep dive into reception percentages and how they quietly decide fantasy points in tight five-set matches.", date: "2d ago" },
];

export const LEAGUE_STANDINGS: Standing[] = [
  { rank: 1, name: "Sara M.", points: 1284, change: "same" },
  { rank: 2, name: "You", points: 1259, change: "up" },
  { rank: 3, name: "Diego P.", points: 1231, change: "down" },
  { rank: 4, name: "Nuria V.", points: 1198, change: "up" },
  { rank: 5, name: "Kenji T.", points: 1150, change: "down" },
  { rank: 6, name: "Hugo R.", points: 1102, change: "same" },
];

export const SLOT_POSITIONS: Record<string, { x: string; y: string; short: string }> = {
  S: { x: "50%", y: "18%", short: "S" },
  OH1: { x: "15%", y: "38%", short: "OH" },
  OH2: { x: "85%", y: "38%", short: "OH" },
  OP: { x: "50%", y: "45%", short: "OP" },
  MB1: { x: "25%", y: "68%", short: "MB" },
  MB2: { x: "75%", y: "68%", short: "MB" },
  L: { x: "50%", y: "90%", short: "L" },
};

export const NAV_ITEMS = [
  { id: "home", label: "Home", iconName: "Home" },
  { id: "team", label: "Team", iconName: "Users" },
  { id: "market", label: "Market", iconName: "ShoppingCart" },
  { id: "matches", label: "Matches", iconName: "Radio" },
  { id: "leagues", label: "Leagues", iconName: "Trophy" },
  { id: "news", label: "News", iconName: "Newspaper" },
  { id: "profile", label: "Profile", iconName: "User" },
] as const;

export type PageId = (typeof NAV_ITEMS)[number]["id"];
