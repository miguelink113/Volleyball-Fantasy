"use client";
import { Calendar, Clock } from "lucide-react";
import { MATCHES } from "@/lib/data";
import { Badge } from "./Badge";
import { NetDivider } from "./NetDivider";

export const MatchesPage = () => (
  <div className="space-y-4">
    {MATCHES.map((m) => (
      <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          {m.status === "live" ? (
            <Badge tone="red">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                LIVE · Set {m.set}
              </span>
            </Badge>
          ) : (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar size={12} /> {m.date} <Clock size={12} className="ml-2" /> {m.time}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-slate-100">{m.home}</p>
          </div>
          <div className="px-4 text-center">
            {m.status === "live" ? (
              <p className="fv-display text-2xl font-bold text-slate-50">
                {m.setsHome} - {m.setsAway}
              </p>
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
              <span>
                Current set:{" "}
                <span className="text-slate-100 font-semibold">
                  {m.pointsHome} - {m.pointsAway}
                </span>
              </span>
            </div>
          </>
        )}
      </div>
    ))}
  </div>
);
