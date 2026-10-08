"use client";
import { useState } from "react";
import { Plus, Star } from "lucide-react";
import { PLAYERS, SLOT_POSITIONS } from "@/lib/data";
import { PlayerCard } from "./PlayerCard";
import { PlayerAvatar } from "./PlayerAvatar";
import type { Player } from "@/lib/types";

const CourtSlot = ({
  id,
  label,
  player,
  selected,
  onClick,
}: {
  id: string;
  label: { x: string; y: string; short: string };
  player?: Player;
  selected: boolean;
  onClick: (id: string) => void;
}) => (
  <button
    onClick={() => onClick(id)}
    className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 ${
      selected ? "z-20" : "z-10"
    }`}
    style={{ left: label.x, top: label.y }}
  >
    <div className={`rounded-full transition-all ${selected ? "ring-4 ring-amber-500/40" : ""}`}>
      <PlayerAvatar player={player} />
    </div>
    <span className="text-[10px] font-semibold text-slate-200 bg-slate-950/80 px-1.5 py-0.5 rounded whitespace-nowrap">
      {player ? player.name.split(" ").pop() : label.short}
    </span>
  </button>
);

export const TeamPage = ({
  lineup,
  setLineup,
  bench,
  setBench,
  onSelectPlayer,
  captain,
  setCaptain,
}: {
  lineup: Record<string, number>;
  setLineup: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  bench: number[];
  setBench: React.Dispatch<React.SetStateAction<number[]>>;
  onSelectPlayer: (p: Player) => void;
  captain: number;
  setCaptain: (id: number) => void;
}) => {
  const [pickedSlot, setPickedSlot] = useState<string | null>(null);
  const getPlayer = (id: number) => PLAYERS.find((p) => p.id === id);

  const handleSlotClick = (slotId: string) => {
    if (pickedSlot === null) {
      setPickedSlot(slotId);
      return;
    }
    if (pickedSlot === slotId) {
      setPickedSlot(null);
      return;
    }
    setLineup((prev) => ({ ...prev, [pickedSlot]: prev[slotId], [slotId]: prev[pickedSlot] }));
    setPickedSlot(null);
  };

  const swapWithBench = (benchId: number) => {
    if (pickedSlot === null) return;
    const outgoing = lineup[pickedSlot];
    setLineup((prev) => ({ ...prev, [pickedSlot]: benchId }));
    setBench((prev) => prev.map((id) => (id === benchId ? outgoing : id)));
    setPickedSlot(null);
  };

  const totalValue = [...Object.values(lineup), ...bench].reduce(
    (sum, id) => sum + (getPlayer(id)?.price ?? 0),
    0
  );
  const chemistry = Math.min(98, 60 + Object.values(lineup).length * 4);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500">Squad value</p>
          <p className="fv-display text-2xl font-bold text-amber-400">
            €{totalValue.toFixed(1)}M <span className="text-xs text-slate-500 font-normal">/ €120M</span>
          </p>
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
        <div
          className="relative w-full aspect-[3/4] max-w-md mx-auto rounded-xl overflow-hidden"
          style={{ background: "linear-gradient(180deg, #C9A063 0%, #B08A4F 100%)" }}
        >
          <div className="absolute inset-4 border-2 border-white/60 rounded-md" />
          <div className="absolute left-4 right-4 top-1/2 border-t-2 border-dashed border-white/70" />
          {Object.entries(SLOT_POSITIONS).map(([slotId, pos]) => (
            <CourtSlot
              key={slotId}
              id={slotId}
              label={pos}
              player={getPlayer(lineup[slotId])}
              selected={pickedSlot === slotId}
              onClick={handleSlotClick}
            />
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h3 className="fv-display font-semibold text-slate-100 mb-3">Bench</h3>
        <div className="flex gap-3 overflow-x-auto fv-scroll pb-1">
          {bench.map((id) => {
            const p = getPlayer(id);
            if (!p) return null;
            return (
              <div
                key={id}
                className={`relative ${pickedSlot ? "cursor-pointer" : ""}`}
                onClick={() => pickedSlot && swapWithBench(id)}
              >
                <PlayerCard player={p} onSelect={() => !pickedSlot && onSelectPlayer(p)} compact />
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h3 className="fv-display font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Star size={16} className="text-amber-400" /> Captain
        </h3>
        <div className="flex gap-3 overflow-x-auto fv-scroll pb-1">
          {Object.values(lineup).map((id) => {
            const p = getPlayer(id);
            if (!p) return null;
            return (
              <button
                key={id}
                onClick={() => setCaptain(id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border ${
                  captain === id ? "border-amber-500 bg-amber-500/10" : "border-slate-800"
                }`}
              >
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
