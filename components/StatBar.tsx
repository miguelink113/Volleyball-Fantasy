type Tone = "amber" | "sky" | "violet" | "emerald";
const tones: Record<Tone, string> = {
  amber: "bg-amber-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
};

export const StatBar = ({ label, value, tone = "amber" }: { label: string; value: number; tone?: Tone }) => (
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
