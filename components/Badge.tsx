import React from "react";

type Tone = "slate" | "amber" | "emerald" | "red";

const tones: Record<Tone, string> = {
  slate: "bg-slate-800 text-slate-300",
  amber: "bg-amber-500/15 text-amber-400",
  emerald: "bg-emerald-500/15 text-emerald-400",
  red: "bg-red-500/15 text-red-400",
};

export const Badge = ({ children, tone = "slate" }: { children: React.ReactNode; tone?: Tone }) => (
  <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${tones[tone]}`}>{children}</span>
);
