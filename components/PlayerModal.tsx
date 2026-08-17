"use client";
import { X, AlertTriangle } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { POS } from "@/lib/data";
import { PlayerAvatar } from "./PlayerAvatar";
import { StatBar } from "./StatBar";
import type { Player } from "@/lib/types";

export const PlayerModal = ({ player, onClose }: { player: Player | null; onClose: () => void }) => {
  if (!player) return null;
  const radarData = Object.entries(player.stats).map(([k, v]) => ({
    stat: k.charAt(0).toUpperCase() + k.slice(1),
    value: v,
  }));
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto fv-scroll"
      >
        <div className={`p-6 ${POS[player.pos].color} bg-opacity-20 relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-200 bg-slate-950/40 rounded-full p-1"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-4">
            <PlayerAvatar player={player} size="lg" />
            <div>
              <h2 className="fv-display text-2xl font-bold text-slate-50">{player.name}</h2>
              <p className="text-sm text-slate-300">
                {POS[player.pos].label} · {player.team} · {player.nat}
              </p>
              {player.injured && (
                <span className="inline-flex items-center gap-1 text-xs text-red-400 mt-1">
                  <AlertTriangle size={12} /> Injury doubt
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-950 border border-slate-800 rounded-lg py-3">
              <p className="text-xs text-slate-500">Price</p>
              <p className="fv-display font-bold text-amber-400">€{player.price}M</p>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-lg py-3">
              <p className="text-xs text-slate-500">Season pts</p>
              <p className="fv-display font-bold text-slate-100">{player.points}</p>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-lg py-3">
              <p className="text-xs text-slate-500">Age</p>
              <p className="fv-display font-bold text-slate-100">{player.age}</p>
            </div>
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
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", fontSize: 12 }}
                  />
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
                <div
                  key={i}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-2 text-center"
                >
                  <p className="text-[10px] text-slate-500">R{i + 1}</p>
                  <p className="fv-display font-semibold text-slate-100">{f}</p>
                </div>
              ))}
            </div>
          </div>

          <button className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-2.5 rounded-lg">
            Add to shortlist
          </button>
        </div>
      </div>
    </div>
  );
};
