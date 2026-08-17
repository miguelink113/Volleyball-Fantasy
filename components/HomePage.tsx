"use client";
import { ChevronRight, Flame, Newspaper, TrendingUp } from "lucide-react";
import { MATCHES, NEWS, PLAYERS } from "@/lib/data";
import { PlayerCard } from "./PlayerCard";
import { Badge } from "./Badge";
import type { PageId } from "@/lib/data";
import type { Player } from "@/lib/types";

export const HomePage = ({
  setPage,
  onSelectPlayer,
}: {
  setPage: (p: PageId) => void;
  onSelectPlayer: (p: Player) => void;
}) => {
  const trending = PLAYERS.filter((p) => p.trend === "up").slice(0, 6);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-slate-950 relative overflow-hidden">
          <p className="text-sm font-semibold opacity-80">Round 12 · Your score</p>
          <p className="fv-display text-5xl font-bold mt-1">
            72 <span className="text-xl align-top">pts</span>
          </p>
          <p className="text-sm mt-2 opacity-80">+8 vs last round · Rank #2 in Canarias League</p>
          <button
            onClick={() => setPage("team")}
            className="mt-4 bg-slate-950 text-amber-400 text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-1"
          >
            Manage team <ChevronRight size={15} />
          </button>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <p className="text-sm text-slate-400">League ranking</p>
            <p className="fv-display text-3xl font-bold text-slate-50 mt-1">
              #2 <span className="text-sm text-slate-500 font-normal">/ 24</span>
            </p>
          </div>
          <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium mt-3">
            <TrendingUp size={15} /> Up 1 position
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="fv-display font-semibold text-slate-100">Upcoming matches</h3>
          <button
            onClick={() => setPage("matches")}
            className="text-xs text-amber-400 font-medium flex items-center gap-1"
          >
            View all <ChevronRight size={13} />
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {MATCHES.slice(0, 2).map((m) => (
            <div
              key={m.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-200">{m.home}</p>
                <p className="text-xs text-slate-500 my-0.5">vs</p>
                <p className="text-sm font-semibold text-slate-200">{m.away}</p>
              </div>
              <div className="text-right">
                {m.status === "live" ? (
                  <Badge tone="red">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      LIVE
                    </span>
                  </Badge>
                ) : (
                  <p className="text-xs text-slate-500">
                    {m.date}
                    <br />
                    {m.time}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="fv-display font-semibold text-slate-100 flex items-center gap-2">
            <Flame size={16} className="text-amber-400" /> Trending players
          </h3>
          <button
            onClick={() => setPage("market")}
            className="text-xs text-amber-400 font-medium flex items-center gap-1"
          >
            Market <ChevronRight size={13} />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto fv-scroll pb-2">
          {trending.map((p) => (
            <PlayerCard key={p.id} player={p} onSelect={onSelectPlayer} />
          ))}
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
                <span className="text-slate-200">
                  <span className="text-emerald-400">+{t.in}</span>{" "}
                  <span className="text-slate-600">/</span>{" "}
                  <span className="text-red-400">-{t.out}</span>
                </span>
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
