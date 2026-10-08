import { AlertTriangle, Plus } from "lucide-react";
import { POS, initials } from "@/lib/data";
import type { Player } from "@/lib/types";

export const PlayerAvatar = ({ player, size = "md" }: { player?: Player; size?: "sm" | "md" | "lg" }) => {
  const s =
    size === "sm" ? "w-9 h-9 text-xs" : size === "lg" ? "w-20 h-20 text-2xl" : "w-12 h-12 text-sm";
  if (!player) {
    return (
      <div
        className={`${s} rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-600 shrink-0`}
      >
        <Plus size={16} />
      </div>
    );
  }
  return (
    <div
      className={`relative ${s} rounded-full ${POS[player.pos].color} flex items-center justify-center font-bold text-white shrink-0 shadow-lg`}
    >
      {initials(player.name)}
      {player.injured && (
        <span className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5 border-2 border-slate-900">
          <AlertTriangle size={10} className="text-white" />
        </span>
      )}
    </div>
  );
};
