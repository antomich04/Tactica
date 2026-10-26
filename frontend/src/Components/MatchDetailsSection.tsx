import { Card, CardContent } from "@/Components/card";
import { Badge } from "@/Components/badge";
import { TacticalPitch } from "@/Components/TacticalPitch";
import { useTranslation } from "../Utils/i18n";
import type { ClubTeam } from "../types";

interface MatchDetailsSectionProps {
  homeTeam: ClubTeam;
  awayTeam: ClubTeam;
}

export function MatchDetailsSection({
  homeTeam,
  awayTeam,
}: MatchDetailsSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h2 className="text-lg sm:text-2xl text-white font-bold tracking-wide mb-3 sm:mb-5">
        {t("matchDetails")}
      </h2>
      <Card className="bg-slate-800/50 border-slate-700/50 rounded-2xl sm:rounded-3xl flex flex-col border-none relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 rounded-[inherit] bg-slate-900/50 pointer-events-none" />
        <CardContent className="relative z-10 w-full p-2.5 sm:p-5 md:p-8 flex flex-col gap-4 sm:gap-6">
          <div className="flex items-center justify-center border-b border-slate-700/50 pb-3 sm:pb-5 text-center">
            <h3 className="text-xs sm:text-base md:text-lg font-bold text-slate-200 uppercase tracking-widest m-0">
              {t("startingLineupsTactics")}
            </h3>
          </div>

          {/* 2-column grid on ALL screen sizes so both pitches sit side-by-side on phones */}
          <div className="grid grid-cols-2 items-start justify-center gap-2 sm:gap-6 md:gap-8 lg:gap-12 w-full max-w-7xl mx-auto">
            <div className="w-full flex flex-col items-center gap-2 sm:gap-3 min-w-0">
              <div className="text-center w-full min-w-0">
                <span
                  className="block text-xs sm:text-lg md:text-2xl font-black mb-1 truncate px-1"
                  style={{ color: homeTeam.primary_color || "#ef4444" }}
                >
                  {homeTeam.name}
                </span>
                <Badge
                  variant="outline"
                  className="bg-slate-950/50 text-slate-300 border-slate-600 px-2 py-0.5 sm:px-3.5 sm:py-1 text-[10px] sm:text-xs md:text-sm whitespace-nowrap"
                >
                  {homeTeam.formation}
                </Badge>
              </div>
              <TacticalPitch
                customColor={homeTeam.primary_color || "#94a3b8"}
                players={homeTeam.roster.starters}
              />
            </div>

            <div className="w-full flex flex-col items-center gap-2 sm:gap-3 min-w-0">
              <div className="text-center w-full min-w-0">
                <span
                  className="block text-xs sm:text-lg md:text-2xl font-black mb-1 truncate px-1"
                  style={{ color: awayTeam.secondary_color || "#94a3b8" }}
                >
                  {awayTeam.name}
                </span>
                <Badge
                  variant="outline"
                  className="bg-slate-950/50 text-slate-300 border-slate-600 px-2 py-0.5 sm:px-3.5 sm:py-1 text-[10px] sm:text-xs md:text-sm whitespace-nowrap"
                >
                  {awayTeam.formation}
                </Badge>
              </div>
              <TacticalPitch
                customColor={awayTeam.secondary_color || "#94a3b8"}
                players={awayTeam.roster.starters}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}