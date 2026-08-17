"use client";
import { useState } from "react";
import { DEFAULT_BENCH, DEFAULT_LINEUP, type PageId } from "@/lib/data";
import { Sidebar, MobileNav } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { PlayerModal } from "./PlayerModal";
import { HomePage } from "./HomePage";
import { TeamPage } from "./TeamPage";
import { MarketPage } from "./MarketPage";
import { MatchesPage } from "./MatchesPage";
import { LeaguesPage } from "./LeaguesPage";
import { NewsPage } from "./NewsPage";
import { ProfilePage } from "./ProfilePage";
import type { Player } from "@/lib/types";

export const AppShell = () => {
  const [page, setPage] = useState<PageId>("home");
  const [dark, setDark] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [lineup, setLineup] = useState<Record<string, number>>(DEFAULT_LINEUP);
  const [bench, setBench] = useState<number[]>(DEFAULT_BENCH);
  const [captain, setCaptain] = useState(2);

  const owned = [...Object.values(lineup), ...bench];

  const pages: Record<PageId, React.ReactNode> = {
    home: <HomePage setPage={setPage} onSelectPlayer={setSelectedPlayer} />,
    team: (
      <TeamPage
        lineup={lineup}
        setLineup={setLineup}
        bench={bench}
        setBench={setBench}
        onSelectPlayer={setSelectedPlayer}
        captain={captain}
        setCaptain={setCaptain}
      />
    ),
    market: <MarketPage onSelectPlayer={setSelectedPlayer} owned={owned} />,
    matches: <MatchesPage />,
    leagues: <LeaguesPage />,
    news: <NewsPage />,
    profile: <ProfilePage />,
  };

  return (
    <div className={`fv-root min-h-screen ${dark ? "bg-slate-950" : "bg-slate-100"} flex`}>
      <Sidebar page={page} setPage={setPage} />
      {mobileNavOpen && (
        <MobileNav page={page} setPage={setPage} onClose={() => setMobileNavOpen(false)} />
      )}
      <div className="flex-1 min-w-0 pb-20 lg:pb-0">
        <TopBar
          page={page}
          dark={dark}
          setDark={setDark}
          onMenu={() => setMobileNavOpen(true)}
        />
        <main className="p-4 lg:p-6 max-w-6xl mx-auto">{pages[page]}</main>
      </div>
      <BottomNav page={page} setPage={setPage} />
      <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
};
