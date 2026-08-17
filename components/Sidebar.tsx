"use client";
import { Trophy, X } from "lucide-react";
import { NAV_ITEMS, type PageId } from "@/lib/data";
import { getIcon } from "@/lib/icons";

export const Sidebar = ({ page, setPage }: { page: PageId; setPage: (p: PageId) => void }) => (
  <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-slate-800 bg-slate-950 h-screen sticky top-0 py-6 px-4">
    <div className="flex items-center gap-2 px-2 mb-8">
      <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center">
        <Trophy size={18} className="text-slate-950" />
      </div>
      <span className="fv-display text-lg font-bold text-slate-50 tracking-wide">
        SET&nbsp;POINT
      </span>
    </div>
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = getIcon(item.iconName);
        const active = page === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-amber-500/10 text-amber-400"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            }`}
          >
            <Icon size={18} />
            {item.label}
            {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
          </button>
        );
      })}
    </nav>
    <div className="mt-auto pt-6 border-t border-slate-800">
      <div className="flex items-center gap-3 px-2">
        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
          YM
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-200 truncate">Yaiza Medina</p>
          <p className="text-xs text-slate-500">Rank #2 · Canarias League</p>
        </div>
      </div>
    </div>
  </aside>
);

export const MobileNav = ({
  page,
  setPage,
  onClose,
}: {
  page: PageId;
  setPage: (p: PageId) => void;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose}>
    <div className="w-64 h-full bg-slate-950 p-4" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-6">
        <span className="fv-display text-lg font-bold text-slate-50">SET POINT</span>
        <button onClick={onClose} className="text-slate-400">
          <X size={20} />
        </button>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = getIcon(item.iconName);
          return (
            <button
              key={item.id}
              onClick={() => {
                setPage(item.id);
                onClose();
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                page === item.id ? "bg-amber-500/10 text-amber-400" : "text-slate-400"
              }`}
            >
              <Icon size={18} /> {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  </div>
);
