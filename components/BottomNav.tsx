"use client";
import { NAV_ITEMS, type PageId } from "@/lib/data";
import { getIcon } from "@/lib/icons";

export const BottomNav = ({ page, setPage }: { page: PageId; setPage: (p: PageId) => void }) => (
  <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-950 border-t border-slate-800 flex justify-around py-2">
    {NAV_ITEMS.slice(0, 6).map((item) => {
      const Icon = getIcon(item.iconName);
      const active = page === item.id;
      return (
        <button
          key={item.id}
          onClick={() => setPage(item.id)}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 ${
            active ? "text-amber-400" : "text-slate-500"
          }`}
        >
          <Icon size={19} />
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      );
    })}
  </nav>
);
