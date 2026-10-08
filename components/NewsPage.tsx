"use client";
import { useState } from "react";
import { NEWS } from "@/lib/data";
import { Badge } from "./Badge";

export const NewsPage = () => {
  const [cat, setCat] = useState("All");
  const cats = ["All", ...Array.from(new Set(NEWS.map((n) => n.cat)))];
  const filtered = cat === "All" ? NEWS : NEWS.filter((n) => n.cat === cat);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
              cat === c
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-900 border border-slate-800 text-slate-400"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((n) => (
          <article
            key={n.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-amber-500/40 transition-colors cursor-pointer"
          >
            <Badge tone="amber">{n.cat}</Badge>
            <h3 className="fv-display font-semibold text-slate-100 mt-3 text-lg leading-snug">{n.title}</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">{n.excerpt}</p>
            <p className="text-xs text-slate-600 mt-3">{n.date}</p>
          </article>
        ))}
      </div>
    </div>
  );
};
