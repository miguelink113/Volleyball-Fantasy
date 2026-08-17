import React, { useState, useMemo } from "react";
import {
  Home, Users, ShoppingCart, Trophy, Newspaper, User as UserIcon, Menu, X,
  TrendingUp, TrendingDown, Minus, Star, Search, Filter, ChevronRight, ChevronLeft,
  Bell, Sun, Moon, Calendar, Clock, ArrowUpRight, Heart, BarChart3, Settings,
  LogOut, Plus, Check, Shield, Activity, MapPin, Flame, AlertTriangle, Radio,
  ChevronDown, Mail, Lock, Eye, EyeOff
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";

/* ============================== FONT / GLOBAL STYLE ============================== */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
    .fv-root, .fv-root * { font-family: 'Inter', sans-serif; }
    .fv-display { font-family: 'Oswald', sans-serif; letter-spacing: 0.02em; }
    .fv-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
    .fv-scroll::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.5); border-radius: 4px; }
  `}</style>
);

/* ============================== MOCK DATA ============================== */
const POS = {
  S: { label: "Setter", color: "bg-amber-500", text: "text-amber-400", ring: "ring-amber-500/40" },
  OH: { label: "Outside Hitter", color: "bg-sky-500", text: "text-sky-400", ring: "ring-sky-500/40" },
  OP: { label: "Opposite", color: "bg-orange-500", text: "text-orange-400", ring: "ring-orange-500/40" },
  MB: { label: "Middle Blocker", color: "bg-violet-500", text: "text-violet-400", ring: "ring-violet-500/40" },
  L: { label: "Libero", color: "bg-emerald-500", text: "text-emerald-400", ring: "ring-emerald-500/40" },
};

const initials = (name) => name.split(" ").map((n) => n[0]).slice(0, 2).join("");

const mkPlayer = (id, name, pos, team, nat, age, price, trend, points, injured, form, stats) => ({
  id, name, pos, team, nat, age, price, trend, points, injured, form,
  stats, priceHistory: form.map((f, i) => ({ w: `S${i + 1}`, price: +(price - (form.length - i) * (trend === "down" ? 0.15 : -0.12)).toFixed(1) })),
});

const PLAYERS = [
  mkPlayer(1, "Marco Ibáñez", "S", "Costa Volley", "ES", 27, 9.2, "up", 612, false, [18,22,19,25,21], { attack: 40, block: 22, serve: 68, reception: 55, dig: 60 }),
  mkPlayer(2, "Luka Vidović", "OH", "Titanes del Norte", "SRB", 24, 11.8, "up", 745, false, [30,28,34,26,32], { attack: 78, block: 45, serve: 62, reception: 70, dig: 58 }),
  mkPlayer(3, "Rafael Souza", "OH", "CV Canarias", "BR", 29, 10.4, "stable", 690, false, [24,29,22,27,25], { attack: 74, block: 40, serve: 58, reception: 66, dig: 55 }),
  mkPlayer(4, "Ivan Kozlov", "OP", "Marés Altas", "PL", 26, 12.5, "up", 780, false, [33,30,36,29,31], { attack: 82, block: 35, serve: 66, reception: 40, dig: 38 }),
  mkPlayer(5, "Diego Fontán", "MB", "Real Set Madrid", "AR", 25, 8.7, "down", 560, true, [15,20,12,18,16], { attack: 60, block: 80, serve: 45, reception: 20, dig: 30 }),
  mkPlayer(6, "Hana Kobayashi", "MB", "CV Barcelona", "JP", 23, 9.9, "up", 630, false, [22,25,20,27,24], { attack: 65, block: 84, serve: 50, reception: 25, dig: 32 }),
  mkPlayer(7, "Tomás Ferreira", "L", "Ícaro Voleibol", "PT", 28, 6.4, "stable", 505, false, [17,19,18,20,19], { attack: 5, block: 8, serve: 30, reception: 88, dig: 92 }),
  mkPlayer(8, "Aitor Etxeberria", "S", "CV Canarias", "ES", 22, 5.1, "up", 340, false, [10,14,12,16,13], { attack: 35, block: 18, serve: 55, reception: 48, dig: 50 }),
  mkPlayer(9, "Nikolaj Petrov", "OH", "Atlántico CV", "BG", 30, 7.6, "down", 470, false, [16,14,18,12,15], { attack: 68, block: 38, serve: 55, reception: 60, dig: 48 }),
  mkPlayer(10, "Bruno Almeida", "OP", "Titanes del Norte", "BR", 31, 8.9, "stable", 520, false, [19,21,17,20,18], { attack: 72, block: 32, serve: 60, reception: 35, dig: 33 }),
  mkPlayer(11, "Erik Johansson", "MB", "Marés Altas", "SE", 27, 7.3, "up", 480, false, [15,18,16,20,17], { attack: 58, block: 76, serve: 42, reception: 22, dig: 28 }),
  mkPlayer(12, "Paolo Ricci", "L", "Real Set Madrid", "IT", 26, 5.8, "stable", 430, false, [14,16,15,17,16], { attack: 4, block: 6, serve: 28, reception: 84, dig: 88 }),
  mkPlayer(13, "Kenji Watanabe", "OH", "CV Barcelona", "JP", 25, 9.4, "up", 655, false, [26,24,29,25,28], { attack: 76, block: 42, serve: 60, reception: 68, dig: 52 }),
  mkPlayer(14, "Sven Bakker", "OP", "Ícaro Voleibol", "NL", 28, 10.9, "down", 590, false, [20,17,22,15,18], { attack: 79, block: 30, serve: 58, reception: 30, dig: 25 }),
  mkPlayer(15, "Yusuf Demir", "MB", "Atlántico CV", "TR", 24, 6.9, "up", 410, false, [12,15,13,17,14], { attack: 55, block: 72, serve: 40, reception: 20, dig: 26 }),
  mkPlayer(16, "Mateo Rossi", "S", "Marés Altas", "IT", 29, 8.1, "stable", 555, false, [18,20,17,21,19], { attack: 38, block: 20, serve: 64, reception: 52, dig: 56 }),
  mkPlayer(17, "Carlos Núñez", "OH", "Real Set Madrid", "ES", 23, 6.2, "up", 380, false, [13,15,14,18,15], { attack: 66, block: 36, serve: 50, reception: 58, dig: 44 }),
  mkPlayer(18, "Dmitri Sokolov", "MB", "Costa Volley", "RU", 30, 7.0, "down", 400, true, [11,13,9,12,10], { attack: 52, block: 70, serve: 38, reception: 18, dig: 24 }),
];

const DEFAULT_LINEUP = { S: 1, OH1: 2, OH2: 3, OP: 4, MB1: 5, MB2: 6, L: 7 };
const DEFAULT_BENCH = [8, 9, 10, 11];

const MATCHES = [
  { id: 1, home: "Costa Volley", away: "Titanes del Norte", date: "Today", time: "20:30", status: "live", setsHome: 2, setsAway: 1, pointsHome: 18, pointsAway: 15, set: 4 },
  { id: 2, home: "CV Barcelona", away: "Marés Altas", date: "Today", time: "22:00", status: "upcoming" },
  { id: 3, home: "Real Set Madrid", away: "Ícaro Voleibol", date: "Tomorrow", time: "19:00", status: "upcoming" },
  { id: 4, home: "Atlántico CV", away: "CV Canarias", date: "Sat 16", time: "18:30", status: "upcoming" },
];

const NEWS = [
  { id: 1, title: "Ibáñez breaks the assist record in round 12", cat: "Match Report", excerpt: "Costa Volley's setter dished out 19 assists in a dominant straight-sets win, cementing his fantasy value ahead of the market close.", date: "2h ago" },
  { id: 2, title: "Transfer buzz: three middles trending up this week", cat: "Transfer Rumors", excerpt: "Value rises across the middle blocker market as managers chase blocking efficiency ahead of the run-in.", date: "5h ago" },
  { id: 3, title: "Injury update: Fontán expected out for two rounds", cat: "Injuries", excerpt: "Real Set Madrid's middle blocker will miss the next two fixtures with an ankle knock, per club sources.", date: "1d ago" },
  { id: 4, title: "Tactics board: why liberos matter more than ever", cat: "Analysis", excerpt: "A deep dive into reception percentages and how they quietly decide fantasy points in tight five-set matches.", date: "2d ago" },
];

const LEAGUE_STANDINGS = [
  { rank: 1, name: "Sara M.", points: 1284, change: "same" },
  { rank: 2, name: "You", points: 1259, change: "up" },
  { rank: 3, name: "Diego P.", points: 1231, change: "down" },
  { rank: 4, name: "Nuria V.", points: 1198, change: "up" },
  { rank: 5, name: "Kenji T.", points: 1150, change: "down" },
  { rank: 6, name: "Hugo R.", points: 1102, change: "same" },
];

/* ============================== SHARED UI ============================== */
const NetDivider = ({ label }) => (
  <div className="flex items-center gap-3 my-6">
    <div className="flex-1 border-t border-dashed border-slate-700" />
    {label && <span className="fv-display text-[11px] uppercase tracking-widest text-slate-500">{label}</span>}
    <div className="flex-1 border-t border-dashed border-slate-700" />
  </div>
);

const TrendIcon = ({ trend, size = 14 }) => {
  if (trend === "up") return <TrendingUp size={size} className="text-emerald-400" />;
  if (trend === "down") return <TrendingDown size={size} className="text-red-400" />;
  return <Minus size={size} className="text-slate-500" />;
};

const PlayerAvatar = ({ player, size = "md" }) => {
  const s = size === "sm" ? "w-9 h-9 text-xs" : size === "lg" ? "w-20 h-20 text-2xl" : "w-12 h-12 text-sm";
  return (
    <div className={`relative ${s} rounded-full ${POS[player.pos].color} flex items-center justify-center font-bold text-white shrink-0 shadow-lg`}>
      {initials(player.name)}
      {player.injured && (
        <span className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5 border-2 border-slate-900">
          <AlertTriangle size={10} className="text-white" />
        </span>
      )}
    </div>
  );
};

const Badge = ({ children, tone = "slate" }) => {
  const tones = {
    slate: "bg-slate-800 text-slate-300",
    amber: "bg-amber-500/15 text-amber-400",
    emerald: "bg-emerald-500/15 text-emerald-400",
    red: "bg-red-500/15 text-red-400",
  };
  return <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
};

const PlayerCard = ({ player, onSelect, action, compact }) => (
  <div
    onClick={() => onSelect(player)}
    className="group bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-amber-500/50 transition-colors cursor-pointer flex flex-col gap-2 min-w-[168px]"
  >
    <div className="flex items-start justify-between">
      <PlayerAvatar player={player} />
      <Badge>{player.pos}</Badge>
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-100 leading-tight truncate">{player.name}</p>
      <p className="text-[11px] text-slate-500 truncate">{player.team}</p>
    </div>
    {!compact && (
      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
        <span className="fv-display text-amber-400 font-semibold">€{player.price}M</span>
        <span className="flex items-center gap-1 text-slate-400">
          <TrendIcon trend={player.trend} /> {player.points} pts
        </span>
      </div>
    )}
    {action}
  </div>
);

const StatBar = ({ label, value, tone = "amber" }) => {
  const tones = { amber: "bg-amber-500", sky: "bg-sky-500", violet: "bg-violet-500", emerald: "bg-emerald-500" };
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-semibold">{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${tones[tone]} rounded-full`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};

/* ============================== NAV ============================== */
const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "team", label: "Team", icon: Users },
  { id: "market", label: "Market", icon: ShoppingCart },
  { id: "matches", label: "Matches", icon: Radio },
  { id: "leagues", label: "Leagues", icon: Trophy },
  { id: "news", label: "News", icon: Newspaper },
  { id: "profile", label: "Profile", icon: UserIcon },
];

const Sidebar = ({ page, setPage }) => (
  <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-slate-800 bg-slate-950 h-screen sticky top-0 py-6 px-4">
    <div className="flex items-center gap-2 px-2 mb-8">
      <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center">
        <Trophy size={18} className="text-slate-950" />
      </div>
      <span className="fv-display text-lg font-bold text-slate-50 tracking-wide">SET&nbsp;POINT</span>
    </div>
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = page === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active ? "bg-amber-500/10 text-amber-400" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            }`}
          >
            <Icon size={18} />
            {item.label}
            {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
          </button>
        );
      })}
    </nav>
    <div className="mt-auto pt-6 border-t border-slate-800">
      <div className="flex items-center gap-3 px-2">
        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">YM</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-200 truncate">Yaiza Medina</p>
          <p className="text-xs text-slate-500">Rank #2 · Canarias League</p>
        </div>
      </div>
    </div>
  </aside>
);

const TopBar = ({ page, dark, setDark, onMenu }) => (
  <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 lg:px-6 py-3 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
    <div className="flex items-center gap-3">
      <button className="lg:hidden text-slate-400" onClick={onMenu}><Menu size={22} /></button>
      <h1 className="fv-display text-lg font-semibold text-slate-100 capitalize">{page}</h1>
    </div>
    <div className="flex items-center gap-2">
      <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 gap-2 w-64">
        <Search size={15} className="text-slate-500" />
        <input placeholder="Search players, teams…" className="bg-transparent text-sm outline-none text-slate-200 placeholder-slate-500 w-full" />
      </div>
      <button onClick={() => setDark(!dark)} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400">
        {dark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <button className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400">
        <Bell size={17} />
        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-400 rounded-full" />
      </button>
    </div>
  </header>
);

const BottomNav = ({ page, setPage }) => (
  <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-950 border-t border-slate-800 flex justify-around py-2">
    {NAV_ITEMS.slice(0, 6).map((item) => {
      const Icon = item.icon;
      const active = page === item.id;
      return (
        <button key={item.id} onClick={() => setPage(item.id)} className={`flex flex-col items-center gap-0.5 px-2 py-1 ${active ? "text-amber-400" : "text-slate-500"}`}>
          <Icon size={19} />
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      );
    })}
  </nav>
);

/* ============================== AUTH PAGE ============================== */
const AuthPage = ({ onEnter }) => {
  const [mode, setMode] = useState("login");
  const [showPw, setShowPw] = useState(false);
  return (
    <div className="fv-root min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      <GlobalStyle />
      <div className="lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex flex-col justify-center px-10 py-16">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center"><Trophy size={20} className="text-slate-950" /></div>
            <span className="fv-display text-2xl font-bold text-slate-50">SET POINT</span>
          </div>
          <h1 className="fv-display text-4xl md:text-5xl font-bold text-slate-50 leading-tight mb-4">
            Build your six.<br /><span className="text-amber-400">Win the set.</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Draft your fantasy volleyball roster, manage rotations, and chase the top of the table — one rally at a time.
          </p>
          <NetDivider />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="fv-display text-2xl font-bold text-slate-50">40K+</p><p className="text-xs text-slate-500">Managers</p></div>
            <div><p className="fv-display text-2xl font-bold text-slate-50">18</p><p className="text-xs text-slate-500">Leagues</p></div>
            <div><p className="fv-display text-2xl font-bold text-slate-50">Live</p><p className="text-xs text-slate-500">Scoring</p></div>
          </div>
        </div>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 mb-8">
            {["login", "register", "forgot"].map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2 rounded-md text-sm font-semibold capitalize transition-colors ${mode === m ? "bg-amber-500 text-slate-950" : "text-slate-400"}`}>
                {m === "forgot" ? "Reset" : m}
              </button>
            ))}
          </div>

          {mode === "login" && (
            <div className="space-y-4">
              <h2 className="fv-display text-xl font-semibold text-slate-100">Welcome back</h2>
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">Email</span>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5">
                  <Mail size={15} className="text-slate-500" />
                  <input type="email" placeholder="you@email.com" className="bg-transparent outline-none text-sm text-slate-200 w-full" />
                </div>
              </label>
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">Password</span>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5">
                  <Lock size={15} className="text-slate-500" />
                  <input type={showPw ? "text" : "password"} placeholder="••••••••" className="bg-transparent outline-none text-sm text-slate-200 w-full" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="text-slate-500">{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
              </label>
              <button onClick={onEnter} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-2.5 rounded-lg transition-colors">Sign in</button>
              <NetDivider label="or continue with" />
              <div className="grid grid-cols-2 gap-3">
                <button className="border border-slate-800 rounded-lg py-2 text-sm text-slate-300 hover:bg-slate-900">Google</button>
                <button className="border border-slate-800 rounded-lg py-2 text-sm text-slate-300 hover:bg-slate-900">Apple</button>
              </div>
            </div>
          )}

          {mode === "register" && (
            <div className="space-y-4">
              <h2 className="fv-display text-xl font-semibold text-slate-100">Create your team</h2>
              <label className="block"><span className="text-xs text-slate-400 mb-1 block">Manager name</span>
                <input placeholder="Yaiza Medina" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none" />
              </label>
              <label className="block"><span className="text-xs text-slate-400 mb-1 block">Email</span>
                <input type="email" placeholder="you@email.com" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none" />
              </label>
              <label className="block"><span className="text-xs text-slate-400 mb-1 block">Password</span>
                <input type="password" placeholder="Minimum 8 characters" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none" />
              </label>
              <button onClick={onEnter} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-2.5 rounded-lg transition-colors">Create account</button>
            </div>
          )}

          {mode === "forgot" && (
            <div className="space-y-4">
              <h2 className="fv-display text-xl font-semibold text-slate-100">Reset password</h2>
              <p className="text-sm text-slate-500">Enter your email and we'll send you a link to get back into your team.</p>
              <label className="block"><span className="text-xs text-slate-400 mb-1 block">Email</span>
                <input type="email" placeholder="you@email.com" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none" />
              </label>
              <button className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-2.5 rounded-lg transition-colors">Send reset link</button>
            </div>
          )}

          <p className="text-center text-xs text-slate-600 mt-8">By continuing you agree to the Terms and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
};

/* ============================== HOME PAGE ============================== */
const HomePage = ({ setPage, onSelectPlayer }) => {
  const trending = PLAYERS.filter((p) => p.trend === "up").slice(0, 6);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-slate-950 relative overflow-hidden">
          <p className="text-sm font-semibold opacity-80">Round 12 · Your score</p>
          <p className="fv-display text-5xl font-bold mt-1">72 <span className="text-xl align-top">pts</span></p>
          <p className="text-sm mt-2 opacity-80">+8 vs last round · Rank #2 in Canarias League</p>
          <button onClick={() => setPage("team")} className="mt-4 bg-slate-950 text-amber-400 text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-1">
            Manage team <ChevronRight size={15} />
          </button>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <p className="text-sm text-slate-400">League ranking</p>
            <p className="fv-display text-3xl font-bold text-slate-50 mt-1">#2 <span className="text-sm text-slate-500 font-normal">/ 24</span></p>
          </div>
          <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium mt-3"><TrendingUp size={15} /> Up 1 position</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="fv-display font-semibold text-slate-100">Upcoming matches</h3>
          <button onClick={() => setPage("matches")} className="text-xs text-amber-400 font-medium flex items-center gap-1">View all <ChevronRight size={13} /></button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {MATCHES.slice(0, 2).map((m) => (
            <div key={m.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-200">{m.home}</p>
                <p className="text-xs text-slate-500 my-0.5">vs</p>
                <p className="text-sm font-semibold text-slate-200">{m.away}</p>
              </div>
              <div className="text-right">
                {m.status === "live" ? (
                  <Badge tone="red"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />LIVE</span></Badge>
                ) : (
                  <p className="text-xs text-slate-500">{m.date}<br />{m.time}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="fv-display font-semibold text-slate-100 flex items-center gap-2"><Flame size={16} className="text-amber-400" /> Trending players</h3>
          <button onClick={() => setPage("market")} className="text-xs text-amber-400 font-medium flex items-center gap-1">Market <ChevronRight size={13} /></button>
        </div>
        <div className="flex gap-3 overflow-x-auto fv-scroll pb-2">
          {trending.map((p) => <PlayerCard key={p.id} player={p} onSelect={onSelectPlayer} />)}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="fv-display font-semibold text-slate-100 mb-3">Recent transfers</h3>
          <ul className="space-y-3">
            {[
              { in: "Kenji Watanabe", out: "Nikolaj Petrov", by: "Diego P." },
              { in: "Ivan Kozlov", out: "Bruno Almeida", by: "You" },
              { in: "Hana Kobayashi", out: "Dmitri Sokolov", by: "Nuria V." },
            ].map((t, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{t.by}</span>
                <span className="text-slate-200"><span className="text-emerald-400">+{t.in}</span> <span className="text-slate-600">/</span> <span className="text-red-400">-{t.out}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="fv-display font-semibold text-slate-100 mb-3">Latest news</h3>
          <ul className="space-y-3">
            {NEWS.slice(0, 3).map((n) => (
              <li key={n.id} className="flex items-start gap-2 text-sm">
                <Newspaper size={14} className="text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-200 leading-snug">{n.title}</p>
                  <p className="text-xs text-slate-500">{n.date}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

/* ============================== TEAM PAGE ============================== */
const CourtSlot = ({ id, label, player, selected, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 ${selected ? "z-20" : "z-10"}`}
    style={{ left: label.x, top: label.y }}
  >
    <div className={`rounded-full transition-all ${selected ? `ring-4 ${POS[player?.pos]?.ring || "ring-amber-500/40"}` : ""}`}>
      {player ? <PlayerAvatar player={player} /> : <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-600"><Plus size={16} /></div>}
    </div>
    <span className="text-[10px] font-semibold text-slate-200 bg-slate-950/80 px-1.5 py-0.5 rounded whitespace-nowrap">{player ? player.name.split(" ").pop() : label.short}</span>
  </button>
);

const TeamPage = ({ lineup, setLineup, bench, setBench, onSelectPlayer, captain, setCaptain }) => {
  const [pickedSlot, setPickedSlot] = useState(null);
  const getPlayer = (id) => PLAYERS.find((p) => p.id === id);

  const slotPositions = {
    S: { x: "50%", y: "18%", short: "S" },
    OH1: { x: "15%", y: "38%", short: "OH" },
    OH2: { x: "85%", y: "38%", short: "OH" },
    OP: { x: "50%", y: "45%", short: "OP" },
    MB1: { x: "25%", y: "68%", short: "MB" },
    MB2: { x: "75%", y: "68%", short: "MB" },
    L: { x: "50%", y: "90%", short: "L" },
  };

  const handleSlotClick = (slotId) => {
    if (pickedSlot === null) { setPickedSlot(slotId); return; }
    if (pickedSlot === slotId) { setPickedSlot(null); return; }
    setLineup((prev) => ({ ...prev, [pickedSlot]: prev[slotId], [slotId]: prev[pickedSlot] }));
    setPickedSlot(null);
  };

  const swapWithBench = (benchId) => {
    if (pickedSlot === null) return;
    const outgoing = lineup[pickedSlot];
    setLineup((prev) => ({ ...prev, [pickedSlot]: benchId }));
    setBench((prev) => prev.map((id) => (id === benchId ? outgoing : id)));
    setPickedSlot(null);
  };

  const totalValue = [...Object.values(lineup), ...bench].reduce((sum, id) => sum + getPlayer(id).price, 0);
  const chemistry = Math.min(98, 60 + Object.values(lineup).length * 4);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500">Squad value</p>
          <p className="fv-display text-2xl font-bold text-amber-400">€{totalValue.toFixed(1)}M <span className="text-xs text-slate-500 font-normal">/ €120M</span></p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500">Team chemistry</p>
          <p className="fv-display text-2xl font-bold text-emerald-400">{chemistry}%</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500">Formation</p>
          <p className="fv-display text-2xl font-bold text-slate-100">5-1</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="fv-display font-semibold text-slate-100">Starting six</h3>
          <p className="text-xs text-slate-500">Tap a player, then tap another slot or bench player to swap.</p>
        </div>
        <div className="relative w-full aspect-[3/4] max-w-md mx-auto rounded-xl overflow-hidden" style={{ background: "linear-gradient(180deg, #C9A063 0%, #B08A4F 100%)" }}>
          <div className="absolute inset-4 border-2 border-white/60 rounded-md" />
          <div className="absolute left-4 right-4 top-1/2 border-t-2 border-dashed border-white/70" />
          {Object.entries(slotPositions).map(([slotId, pos]) => (
            <CourtSlot key={slotId} id={slotId} label={pos} player={getPlayer(lineup[slotId])} selected={pickedSlot === slotId} onClick={handleSlotClick} />
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h3 className="fv-display font-semibold text-slate-100 mb-3">Bench</h3>
        <div className="flex gap-3 overflow-x-auto fv-scroll pb-1">
          {bench.map((id) => {
            const p = getPlayer(id);
            return (
              <div key={id} className={`relative ${pickedSlot ? "cursor-pointer" : ""}`} onClick={() => pickedSlot && swapWithBench(id)}>
                <PlayerCard player={p} onSelect={() => !pickedSlot && onSelectPlayer(p)} compact />
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h3 className="fv-display font-semibold text-slate-100 mb-3 flex items-center gap-2"><Star size={16} className="text-amber-400" /> Captain</h3>
        <div className="flex gap-3 overflow-x-auto fv-scroll pb-1">
          {Object.values(lineup).map((id) => {
            const p = getPlayer(id);
            return (
              <button key={id} onClick={() => setCaptain(id)} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border ${captain === id ? "border-amber-500 bg-amber-500/10" : "border-slate-800"}`}>
                <PlayerAvatar player={p} size="sm" />
                <span className="text-[11px] text-slate-300">{p.name.split(" ").pop()}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ============================== MARKET PAGE ============================== */
const MarketPage = ({ onSelectPlayer, owned }) => {
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState("ALL");
  const [sort, setSort] = useState("points");

  const results = useMemo(() => {
    let list = PLAYERS.filter((p) => !owned.includes(p.id));
    if (query) list = list.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.team.toLowerCase().includes(query.toLowerCase()));
    if (pos !== "ALL") list = list.filter((p) => p.pos === pos);
    list = [...list].sort((a, b) => (sort === "points" ? b.points - a.points : sort === "price" ? b.price - a.price : a.name.localeCompare(b.name)));
    return list;
  }, [query, pos, sort, owned]);

  return (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
          <Search size={16} className="text-slate-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search players or teams…" className="bg-transparent outline-none text-sm text-slate-200 w-full" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1 text-xs text-slate-500 mr-1"><Filter size={13} /> Position:</div>
          {["ALL", "S", "OH", "OP", "MB", "L"].map((p) => (
            <button key={p} onClick={() => setPos(p)} className={`px-2.5 py-1 rounded-md text-xs font-semibold ${pos === p ? "bg-amber-500 text-slate-950" : "bg-slate-950 text-slate-400 border border-slate-800"}`}>{p}</button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-md px-2 py-1.5 outline-none">
              <option value="points">Points</option>
              <option value="price">Price</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((p) => (
          <div key={p.id} onClick={() => onSelectPlayer(p)} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-amber-500/50 cursor-pointer transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <PlayerAvatar player={p} />
                <div>
                  <p className="text-sm font-semibold text-slate-100">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.team} · {p.nat}</p>
                </div>
              </div>
              <Badge>{p.pos}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div><p className="text-[10px] text-slate-500">Price</p><p className="fv-display font-semibold text-amber-400 flex items-center justify-center gap-1">€{p.price}M <TrendIcon trend={p.trend} size={12} /></p></div>
              <div><p className="text-[10px] text-slate-500">Points</p><p className="fv-display font-semibold text-slate-100">{p.points}</p></div>
              <div><p className="text-[10px] text-slate-500">Age</p><p className="fv-display font-semibold text-slate-100">{p.age}</p></div>
            </div>
            <button onClick={(e) => e.stopPropagation()} className="mt-4 w-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-1">
              <Plus size={14} /> Buy
            </button>
          </div>
        ))}
        {results.length === 0 && <p className="text-slate-500 text-sm col-span-full text-center py-10">No players match those filters.</p>}
      </div>
    </div>
  );
};

/* ============================== PLAYER MODAL ============================== */
const PlayerModal = ({ player, onClose }) => {
  if (!player) return null;
  const radarData = Object.entries(player.stats).map(([k, v]) => ({ stat: k.charAt(0).toUpperCase() + k.slice(1), value: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto fv-scroll">
        <div className={`p-6 ${POS[player.pos].color} bg-opacity-20 relative`}>
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-200 bg-slate-950/40 rounded-full p-1"><X size={18} /></button>
          <div className="flex items-center gap-4">
            <PlayerAvatar player={player} size="lg" />
            <div>
              <h2 className="fv-display text-2xl font-bold text-slate-50">{player.name}</h2>
              <p className="text-sm text-slate-300">{POS[player.pos].label} · {player.team} · {player.nat}</p>
              {player.injured && <span className="inline-flex items-center gap-1 text-xs text-red-400 mt-1"><AlertTriangle size={12} /> Injury doubt</span>}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-950 border border-slate-800 rounded-lg py-3"><p className="text-xs text-slate-500">Price</p><p className="fv-display font-bold text-amber-400">€{player.price}M</p></div>
            <div className="bg-slate-950 border border-slate-800 rounded-lg py-3"><p className="text-xs text-slate-500">Season pts</p><p className="fv-display font-bold text-slate-100">{player.points}</p></div>
            <div className="bg-slate-950 border border-slate-800 rounded-lg py-3"><p className="text-xs text-slate-500">Age</p><p className="fv-display font-bold text-slate-100">{player.age}</p></div>
          </div>

          <div>
            <h3 className="fv-display font-semibold text-slate-100 mb-2">Performance profile</h3>
            <div className="h-56 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="stat" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Radar dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="fv-display font-semibold text-slate-100 mb-2">Market value evolution</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={player.priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="w" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} width={30} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", fontSize: 12 }} />
                  <Line type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            <StatBar label="Attack efficiency" value={player.stats.attack} tone="amber" />
            <StatBar label="Blocking efficiency" value={player.stats.block} tone="violet" />
            <StatBar label="Serve efficiency" value={player.stats.serve} tone="sky" />
            <StatBar label="Reception %" value={player.stats.reception} tone="emerald" />
          </div>

          <div>
            <h3 className="fv-display font-semibold text-slate-100 mb-2">Recent form</h3>
            <div className="flex gap-2">
              {player.form.map((f, i) => (
                <div key={i} className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-2 text-center">
                  <p className="text-[10px] text-slate-500">R{i + 1}</p>
                  <p className="fv-display font-semibold text-slate-100">{f}</p>
                </div>
              ))}
            </div>
          </div>

          <button className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-2.5 rounded-lg">Add to shortlist</button>
        </div>
      </div>
    </div>
  );
};

/* ============================== MATCHES PAGE ============================== */
const MatchesPage = () => (
  <div className="space-y-4">
    {MATCHES.map((m) => (
      <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          {m.status === "live" ? (
            <Badge tone="red"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />LIVE · Set {m.set}</span></Badge>
          ) : (
            <span className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={12} /> {m.date} <Clock size={12} className="ml-2" /> {m.time}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-slate-100">{m.home}</p>
          </div>
          <div className="px-4 text-center">
            {m.status === "live" ? (
              <p className="fv-display text-2xl font-bold text-slate-50">{m.setsHome} - {m.setsAway}</p>
            ) : (
              <p className="fv-display text-lg font-bold text-slate-600">VS</p>
            )}
          </div>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-slate-100">{m.away}</p>
          </div>
        </div>
        {m.status === "live" && (
          <>
            <NetDivider />
            <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
              <span>Current set: <span className="text-slate-100 font-semibold">{m.pointsHome} - {m.pointsAway}</span></span>
            </div>
          </>
        )}
      </div>
    ))}
  </div>
);

/* ============================== LEAGUES PAGE ============================== */
const LeaguesPage = () => {
  const [tab, setTab] = useState("public");
  return (
    <div className="space-y-5">
      <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 max-w-md">
        {["public", "private", "friends"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-md text-xs font-semibold capitalize ${tab === t ? "bg-amber-500 text-slate-950" : "text-slate-400"}`}>{t}</button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="fv-display font-semibold text-slate-100">Canarias Fantasy League</h3>
          <button className="text-xs bg-amber-500 text-slate-950 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus size={13} /> Create league</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 text-xs uppercase tracking-wide">
              <th className="pb-2 font-medium">#</th>
              <th className="pb-2 font-medium">Manager</th>
              <th className="pb-2 font-medium text-right">Points</th>
              <th className="pb-2 font-medium text-right">Trend</th>
            </tr>
          </thead>
          <tbody>
            {LEAGUE_STANDINGS.map((row) => (
              <tr key={row.rank} className={`border-t border-slate-800 ${row.name === "You" ? "bg-amber-500/5" : ""}`}>
                <td className="py-2.5 text-slate-400">{row.rank}</td>
                <td className={`py-2.5 font-medium ${row.name === "You" ? "text-amber-400" : "text-slate-200"}`}>{row.name}</td>
                <td className="py-2.5 text-right fv-display font-semibold text-slate-100">{row.points}</td>
                <td className="py-2.5 text-right">
                  {row.change === "up" && <TrendingUp size={15} className="text-emerald-400 inline" />}
                  {row.change === "down" && <TrendingDown size={15} className="text-red-400 inline" />}
                  {row.change === "same" && <Minus size={15} className="text-slate-600 inline" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="fv-display font-semibold text-slate-100 mb-1">Invite friends</h3>
          <p className="text-xs text-slate-500 mb-3">Share your league code to grow the competition.</p>
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
            <span className="text-sm text-slate-300 tracking-widest font-mono">VLY-9F2K</span>
            <button className="ml-auto text-xs text-amber-400 font-semibold">Copy</button>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="fv-display font-semibold text-slate-100 mb-1">League stats</h3>
          <ul className="text-sm text-slate-400 space-y-1.5 mt-2">
            <li className="flex justify-between"><span>Average score</span><span className="text-slate-200 font-medium">1198 pts</span></li>
            <li className="flex justify-between"><span>Most captained</span><span className="text-slate-200 font-medium">I. Kozlov</span></li>
            <li className="flex justify-between"><span>Managers</span><span className="text-slate-200 font-medium">24</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

/* ============================== NEWS PAGE ============================== */
const NewsPage = () => {
  const [cat, setCat] = useState("All");
  const cats = ["All", ...new Set(NEWS.map((n) => n.cat))];
  const filtered = cat === "All" ? NEWS : NEWS.filter((n) => n.cat === cat);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${cat === c ? "bg-amber-500 text-slate-950" : "bg-slate-900 border border-slate-800 text-slate-400"}`}>{c}</button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((n) => (
          <article key={n.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-amber-500/40 transition-colors cursor-pointer">
            <Badge tone="amber">{n.cat}</Badge>
            <h3 className="fv-display font-semibold text-slate-100 mt-3 text-lg leading-snug">{n.title}</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">{n.excerpt}</p>
            <p className="text-xs text-slate-600 mt-3">{n.date}</p>
          </article>
        ))}
      </div>
    </div>
  );
};

/* ============================== PROFILE PAGE ============================== */
const ProfilePage = () => (
  <div className="space-y-5 max-w-2xl">
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center fv-display text-xl font-bold text-slate-950">YM</div>
      <div>
        <h2 className="fv-display text-xl font-bold text-slate-100">Yaiza Medina</h2>
        <p className="text-sm text-slate-500">Favorite team: CV Canarias · Member since 2023</p>
      </div>
    </div>

    {[
      { title: "Account settings", icon: Settings, rows: ["Edit profile", "Change password", "Language"] },
      { title: "Notifications", icon: Bell, rows: ["Match reminders", "Transfer alerts", "League news"] },
      { title: "Privacy", icon: Shield, rows: ["Profile visibility", "Data & permissions"] },
      { title: "Subscription", icon: Star, rows: ["Manage plan", "Billing history"] },
    ].map((section) => {
      const Icon = section.icon;
      return (
        <div key={section.title} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="fv-display font-semibold text-slate-100 mb-3 flex items-center gap-2"><Icon size={16} className="text-amber-400" /> {section.title}</h3>
          <ul className="divide-y divide-slate-800">
            {section.rows.map((r) => (
              <li key={r} className="flex items-center justify-between py-2.5 text-sm text-slate-300">
                {r} <ChevronRight size={15} className="text-slate-600" />
              </li>
            ))}
          </ul>
        </div>
      );
    })}

    <button className="w-full flex items-center justify-center gap-2 border border-red-500/30 text-red-400 font-semibold py-2.5 rounded-lg hover:bg-red-500/10">
      <LogOut size={16} /> Sign out
    </button>
  </div>
);

/* ============================== APP ============================== */
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState("home");
  const [dark, setDark] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [lineup, setLineup] = useState(DEFAULT_LINEUP);
  const [bench, setBench] = useState(DEFAULT_BENCH);
  const [captain, setCaptain] = useState(2);

  if (!authed) return <AuthPage onEnter={() => setAuthed(true)} />;

  const owned = [...Object.values(lineup), ...bench];

  const pages = {
    home: <HomePage setPage={setPage} onSelectPlayer={setSelectedPlayer} />,
    team: <TeamPage lineup={lineup} setLineup={setLineup} bench={bench} setBench={setBench} onSelectPlayer={setSelectedPlayer} captain={captain} setCaptain={setCaptain} />,
    market: <MarketPage onSelectPlayer={setSelectedPlayer} owned={owned} />,
    matches: <MatchesPage />,
    leagues: <LeaguesPage />,
    news: <NewsPage />,
    profile: <ProfilePage />,
  };

  return (
    <div className={`fv-root min-h-screen ${dark ? "bg-slate-950" : "bg-slate-100"} flex`}>
      <GlobalStyle />
      <Sidebar page={page} setPage={setPage} />

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileNavOpen(false)}>
          <div className="w-64 h-full bg-slate-950 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <span className="fv-display text-lg font-bold text-slate-50">SET POINT</span>
              <button onClick={() => setMobileNavOpen(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} onClick={() => { setPage(item.id); setMobileNavOpen(false); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${page === item.id ? "bg-amber-500/10 text-amber-400" : "text-slate-400"}`}>
                    <Icon size={18} /> {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 pb-20 lg:pb-0">
        <TopBar page={page} dark={dark} setDark={setDark} onMenu={() => setMobileNavOpen(true)} />
        <main className="p-4 lg:p-6 max-w-6xl mx-auto">{pages[page]}</main>
      </div>

      <BottomNav page={page} setPage={setPage} />
      <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
}
