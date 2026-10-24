import { Button } from "@/Components/button";
import { Card, CardContent } from "@/Components/card";
import { Badge } from "@/Components/badge";
import { TeamCrest } from "./TeamCrest";
import type { ClubTeam } from "../types";

interface NextMatchSectionProps {
  homeTeam: ClubTeam;
  awayTeam: ClubTeam;
  onWatch: () => void;
}

export function NextMatchSection({
  homeTeam,
  awayTeam,
  onWatch,
}: NextMatchSectionProps) {
  return (
    <section className="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h2 className="text-xl sm:text-2xl mb-4 md:mb-6 text-white font-bold tracking-wide">
        Next Match
      </h2>
      <Card className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border-none w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-emerald-950/20 opacity-90 pointer-events-none" />
        <CardContent className="relative z-10 flex flex-row items-center justify-evenly py-6 px-3 sm:px-6 md:py-12 md:px-12 gap-2 sm:gap-6 border-none">
          {/* Home Team */}
          <div className="flex flex-col items-center gap-2 sm:gap-4 flex-1 max-w-[180px]">
            <div
              className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-b-full flex items-center justify-center bg-slate-900/70 border-2 shadow-lg"
              style={{ borderColor: homeTeam.primary_color || "#ef4444" }}
            >
              <TeamCrest team={homeTeam} fallbackColor="#ef4444" />
            </div>
            <span className="text-base sm:text-xl md:text-2xl font-extrabold text-white text-center tracking-wide">
              {homeTeam.name}
            </span>
          </div>

          {/* Match Info & Action */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <Badge
              variant="outline"
              className="bg-slate-900 py-1 px-2.5 sm:py-2 sm:px-4 md:py-2.5 md:px-6 border-slate-600 text-slate-300 text-[10px] sm:text-xs md:text-sm font-bold tracking-wider mb-2 md:mb-4 whitespace-nowrap"
            >
              {homeTeam.stadium_name.toUpperCase()}
            </Badge>
            <span className="text-3xl sm:text-5xl md:text-7xl font-black text-slate-400 tracking-tighter leading-none drop-shadow-lg mb-3 md:mb-5">
              VS
            </span>

            <Button
              onClick={onWatch}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black tracking-widest px-4 py-2 text-xs sm:px-6 sm:py-5 sm:text-sm md:px-8 md:py-6 md:text-lg rounded-lg md:rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all hover:scale-105 border border-emerald-400/50 cursor-pointer"
            >
              WATCH NOW
            </Button>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center gap-2 sm:gap-4 flex-1 max-w-[180px]">
            <div
              className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-b-full flex items-center justify-center bg-slate-900/70 border-2 shadow-lg"
              style={{ borderColor: awayTeam.secondary_color || "#94a3b8" }}
            >
              <TeamCrest team={awayTeam} fallbackColor="#94a3b8" />
            </div>
            <span className="text-base sm:text-xl md:text-2xl font-extrabold text-white text-center tracking-wide">
              {awayTeam.name}
            </span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
