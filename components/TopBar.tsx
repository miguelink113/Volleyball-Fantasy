"use client";
import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import type { PageId } from "@/lib/data";

export const TopBar = ({
  page,
  dark,
  setDark,
  onMenu,
}: {
  page: PageId;
  dark: boolean;
  setDark: (d: boolean) => void;
  onMenu: () => void;
}) => (
  <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 lg:px-6 py-3 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
    <div className="flex items-center gap-3">
      <button className="lg:hidden text-slate-400" onClick={onMenu}>
        <Menu size={22} />
      </button>
      <h1 className="fv-display text-lg font-semibold text-slate-100 capitalize">{page}</h1>
    </div>
    <div className="flex items-center gap-2">
      <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 gap-2 w-64">
        <Search size={15} className="text-slate-500" />
        <input
          placeholder="Search players, teams…"
          className="bg-transparent text-sm outline-none text-slate-200 placeholder-slate-500 w-full"
        />
      </div>
      <button
        onClick={() => setDark(!dark)}
        className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400"
      >
        {dark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <button className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400">
        <Bell size={17} />
        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-400 rounded-full" />
      </button>
    </div>
  </header>
);
