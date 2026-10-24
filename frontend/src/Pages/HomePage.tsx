import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Users, Target } from "lucide-react";
import { Button } from "@/Components/button";
import { Card, CardContent } from "@/Components/card";
import { Badge } from "@/Components/badge";
import { TacticalPitch } from "@/Components/TacticalPitch";
import { fetchNextMatch } from "../Services/teamsService";
import type { ClubTeam } from "../types";

export function HomePage() {
  const navigate = useNavigate();
  const [homeTeam, setHomeTeam] = useState<ClubTeam | null>(null);
  const [awayTeam, setAwayTeam] = useState<ClubTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchNextMatch()
      .then((res) => {
        if (!active) return;
        setHomeTeam(res.home_team);
        setAwayTeam(res.away_team);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load match data.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-[calc(100vh-80px)] flex items-center justify-center">
        <p className="text-slate-400 font-bold tracking-wider uppercase animate-pulse">
          Loading Matchday Squads...
        </p>
      </div>
    );
  }

  if (error || !homeTeam || !awayTeam) {
    return (
      <div className="w-full min-h-[calc(100vh-80px)] flex items-center justify-center px-4">
        <p className="text-red-400 font-bold text-center">
          {error || "No teams available in database."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-80px)] px-3 py-6 sm:px-6 md:py-10 lg:px-8">
      <main className="w-full max-w-6xl mx-auto flex flex-col gap-8 md:gap-12">
        <NextMatchSection
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          onWatch={() =>
            navigate("/Match", {
              state: { homeTeam, awayTeam },
            })
          }
        />
        <MatchDetailsSection homeTeam={homeTeam} awayTeam={awayTeam} />
      </main>
    </div>
  );
}

function TeamCrest({
  team,
  fallbackColor,
}: {
  team: ClubTeam;
  fallbackColor: string;
}) {
  if (team.badge_svg && team.badge_svg.trim().startsWith("<svg")) {
    return (
      <div
        className="w-12 h-12 sm:w-16 sm:h-16 md:w-22 md:h-22 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full drop-shadow-md"
        dangerouslySetInnerHTML={{ __html: team.badge_svg }}
      />
    );
  }
  return (
    <Shield
      className="w-9 h-9 sm:w-14 sm:h-14 md:w-20 md:h-20 drop-shadow-md"
      style={{ color: team.primary_color || fallbackColor }}
    />
  );
}

function NextMatchSection({
  homeTeam,
  awayTeam,
  onWatch,
}: {
  homeTeam: ClubTeam;
  awayTeam: ClubTeam;
  onWatch: () => void;
}) {
  return (
    <section className="flex flex-col">
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
            <span className="text-3xl sm:text-5xl md:text-7xl font-black text-red-500 tracking-tighter leading-none drop-shadow-lg mb-3 md:mb-5">
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
              style={{ borderColor: awayTeam.primary_color || "#3b82f6" }}
            >
              <TeamCrest team={awayTeam} fallbackColor="#3b82f6" />
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

function MatchDetailsSection({
  homeTeam,
  awayTeam,
}: {
  homeTeam: ClubTeam;
  awayTeam: ClubTeam;
}) {
  return (
    <section className="flex flex-col">
      <h2 className="text-xl sm:text-2xl text-white font-bold tracking-wide mb-4 md:mb-6">
        Match Details
      </h2>
      <Card className="bg-slate-800/50 border-slate-700/50 rounded-3xl flex flex-col border-none relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 rounded-[inherit] bg-slate-900/50 pointer-events-none" />
        <CardContent className="relative z-10 w-full p-3 sm:p-6 md:p-10 flex flex-col gap-6 md:gap-8">
          <div className="flex items-center justify-center gap-2 md:gap-4 border-b border-slate-700/50 pb-4 md:pb-6 text-center">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-400 shrink-0" />
            <h3 className="text-xs sm:text-base md:text-xl font-bold text-slate-200 uppercase tracking-widest m-0">
              Starting Lineups & Tactics
            </h3>
            <Target className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-400 shrink-0" />
          </div>

          <div className="flex flex-row items-start justify-center gap-2.5 sm:gap-6 md:gap-10 xl:gap-16 w-full max-w-4xl mx-auto">
            <div className="flex-1 flex flex-col items-center gap-2 md:gap-4 min-w-0">
              <div className="text-center">
                <span
                  className="block text-sm sm:text-xl md:text-2xl font-black mb-1 truncate"
                  style={{ color: homeTeam.primary_color || "#ef4444" }}
                >
                  {homeTeam.name}
                </span>
                <Badge
                  variant="outline"
                  className="bg-slate-950/50 text-slate-300 border-slate-600 px-2 py-0.5 md:px-4 md:py-1 text-[10px] md:text-sm whitespace-nowrap"
                >
                  {homeTeam.formation}
                </Badge>
              </div>
              <TacticalPitch
                teamColor="red"
                customColor={homeTeam.primary_color}
                players={homeTeam.roster.starters}
              />
            </div>

            <div className="flex-1 flex flex-col items-center gap-2 md:gap-4 min-w-0">
              <div className="text-center">
                <span
                  className="block text-sm sm:text-xl md:text-2xl font-black mb-1 truncate"
                  style={{ color: awayTeam.primary_color || "#3b82f6" }}
                >
                  {awayTeam.name}
                </span>
                <Badge
                  variant="outline"
                  className="bg-slate-950/50 text-slate-300 border-slate-600 px-2 py-0.5 md:px-4 md:py-1 text-[10px] md:text-sm whitespace-nowrap"
                >
                  {awayTeam.formation}
                </Badge>
              </div>
              <TacticalPitch
                teamColor="blue"
                customColor={awayTeam.primary_color}
                players={awayTeam.roster.starters}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
