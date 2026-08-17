"use client";
import { useMemo, useState } from "react";
import { Filter, Plus, Search } from "lucide-react";
import { PLAYERS } from "@/lib/data";
import { PlayerAvatar } from "./PlayerAvatar";
import { Badge } from "./Badge";
import { TrendIcon } from "./TrendIcon";
import type { Player } from "@/lib/types";

export const MarketPage = ({
  onSelectPlayer,
  owned,
}: {
  onSelectPlayer: (p: Player) => void;
  owned: number[];
}) => {
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<string>("ALL");
  const [sort, setSort] = useState<"points" | "price" | "name">("points");

  const results = useMemo(() => {
    let list = PLAYERS.filter((p) => !owned.includes(p.id));
    if (query)
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.team.toLowerCase().includes(query.toLowerCase())
      );
    if (pos !== "ALL") list = list.filter((p) => p.pos === pos);
    list = [...list].sort((a, b) =>
      sort === "points" ? b.points - a.points : sort === "price" ? b.price - a.price : a.name.localeCompare(b.name)
    );
    return list;
  }, [query, pos, sort, owned]);

  return (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
          <Search size={16} className="text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players or teams…"
            className="bg-transparent outline-none text-sm text-slate-200 w-full"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1 text-xs text-slate-500 mr-1">
            <Filter size={13} /> Position:
          </div>
          {["ALL", "S", "OH", "OP", "MB", "L"].map((p) => (
            <button
              key={p}
              onClick={() => setPos(p)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                pos === p
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-950 text-slate-400 border border-slate-800"
              }`}
            >
              {p}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "points" | "price" | "name")}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-md px-2 py-1.5 outline-none"
            >
              <option value="points">Points</option>
              <option value="price">Price</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((p) => (
          <div
            key={p.id}
            onClick={() => onSelectPlayer(p)}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-amber-500/50 cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <PlayerAvatar player={p} />
                <div>
                  <p className="text-sm font-semibold text-slate-100">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {p.team} · {p.nat}
                  </p>
                </div>
              </div>
              <Badge>{p.pos}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div>
                <p className="text-[10px] text-slate-500">Price</p>
                <p className="fv-display font-semibold text-amber-400 flex items-center justify-center gap-1">
                  €{p.price}M <TrendIcon trend={p.trend} size={12} />
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Points</p>
                <p className="fv-display font-semibold text-slate-100">{p.points}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Age</p>
                <p className="fv-display font-semibold text-slate-100">{p.age}</p>
              </div>
            </div>
            <button
              onClick={(e) => e.stopPropagation()}
              className="mt-4 w-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-1"
            >
              <Plus size={14} /> Buy
            </button>
          </div>
        ))}
        {results.length === 0 && (
          <p className="text-slate-500 text-sm col-span-full text-center py-10">No players match those filters.</p>
        )}
      </div>
    </div>
  );
};
