import React from "react";

export const NetDivider = ({ label }: { label?: string }) => (
  <div className="flex items-center gap-3 my-6">
    <div className="flex-1 border-t border-dashed border-slate-700" />
    {label && (
      <span className="fv-display text-[11px] uppercase tracking-widest text-slate-500">{label}</span>
    )}
    <div className="flex-1 border-t border-dashed border-slate-700" />
  </div>
);
