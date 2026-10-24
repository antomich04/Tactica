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
      <h2 className="text-xl sm:text-2xl text-white font-bold tracking-wide mb-4 md:mb-6">
        {t("matchDetails")}
      </h2>
      <Card className="bg-slate-800/50 border-slate-700/50 rounded-3xl flex flex-col border-none relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 rounded-[inherit] bg-slate-900/50 pointer-events-none" />
        <CardContent className="relative z-10 w-full p-3 sm:p-6 md:p-10 flex flex-col gap-6 md:gap-8">
          <div className="flex items-center justify-center border-b border-slate-700/50 pb-4 md:pb-6 text-center">
            <h3 className="text-xs sm:text-base md:text-xl font-bold text-slate-200 uppercase tracking-widest m-0">
              {t("startingLineupsTactics")}
            </h3>
          </div>

          {/* Increased max-w-5xl to max-w-7xl to accommodate larger tactical pitches */}
          <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 md:gap-10 xl:gap-14 w-full max-w-7xl mx-auto">
            <div className="w-full flex-1 flex flex-col items-center gap-3 md:gap-4 min-w-0">
              <div className="text-center">
                <span
                  className="block text-base sm:text-xl md:text-2xl font-black mb-1 truncate"
                  style={{ color: homeTeam.primary_color || "#ef4444" }}
                >
                  {homeTeam.name}
                </span>
                <Badge
                  variant="outline"
                  className="bg-slate-950/50 text-slate-300 border-slate-600 px-2.5 py-0.5 md:px-4 md:py-1 text-xs md:text-sm whitespace-nowrap"
                >
                  {homeTeam.formation}
                </Badge>
              </div>
              <TacticalPitch
                customColor={homeTeam.primary_color || "#94a3b8"}
                players={homeTeam.roster.starters}
              />
            </div>

            <div className="w-full flex-1 flex flex-col items-center gap-3 md:gap-4 min-w-0">
              <div className="text-center">
                <span
                  className="block text-base sm:text-xl md:text-2xl font-black mb-1 truncate"
                  style={{ color: awayTeam.secondary_color || "#94a3b8" }}
                >
                  {awayTeam.name}
                </span>
                <Badge
                  variant="outline"
                  className="bg-slate-950/50 text-slate-300 border-slate-600 px-2.5 py-0.5 md:px-4 md:py-1 text-xs md:text-sm whitespace-nowrap"
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