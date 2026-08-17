"use client";
import { useState } from "react";
import { Minus, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { LEAGUE_STANDINGS } from "@/lib/data";

export const LeaguesPage = () => {
  const [tab, setTab] = useState<"public" | "private" | "friends">("public");
  return (
    <div className="space-y-5">
      <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 max-w-md">
        {(["public", "private", "friends"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-md text-xs font-semibold capitalize ${
              tab === t ? "bg-amber-500 text-slate-950" : "text-slate-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="fv-display font-semibold text-slate-100">Canarias Fantasy League</h3>
          <button className="text-xs bg-amber-500 text-slate-950 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Plus size={13} /> Create league
          </button>
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
              <tr
                key={row.rank}
                className={`border-t border-slate-800 ${row.name === "You" ? "bg-amber-500/5" : ""}`}
              >
                <td className="py-2.5 text-slate-400">{row.rank}</td>
                <td className={`py-2.5 font-medium ${row.name === "You" ? "text-amber-400" : "text-slate-200"}`}>
                  {row.name}
                </td>
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
            <li className="flex justify-between">
              <span>Average score</span>
              <span className="text-slate-200 font-medium">1198 pts</span>
            </li>
            <li className="flex justify-between">
              <span>Most captained</span>
              <span className="text-slate-200 font-medium">I. Kozlov</span>
            </li>
            <li className="flex justify-between">
              <span>Managers</span>
              <span className="text-slate-200 font-medium">24</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
