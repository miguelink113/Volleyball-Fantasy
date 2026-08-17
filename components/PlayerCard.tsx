"use client";
import type { Player } from "@/lib/types";
import { PlayerAvatar } from "./PlayerAvatar";
import { Badge } from "./Badge";
import { TrendIcon } from "./TrendIcon";

export const PlayerCard = ({
  player,
  onSelect,
  action,
  compact,
}: {
  player: Player;
  onSelect?: (p: Player) => void;
  action?: React.ReactNode;
  compact?: boolean;
}) => (
  <div
    onClick={() => onSelect?.(player)}
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
