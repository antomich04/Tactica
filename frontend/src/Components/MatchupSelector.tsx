import { useEffect, useRef, useState } from "react";
import { ChevronDown, ArrowLeftRight, Shield } from "lucide-react";
import { Card, CardContent } from "@/Components/card";
import { Badge } from "@/Components/badge";
import { TeamCrest } from "./TeamCrest";
import type { ClubTeam } from "../types";

interface MatchupSelectorProps {
  teams: ClubTeam[];
  homeTeam: ClubTeam | null;
  awayTeam: ClubTeam | null;
  onSelectHome: (team: ClubTeam) => void;
  onSelectAway: (team: ClubTeam) => void;
  onSwapTeams: () => void;
}

export function MatchupSelector({
  teams,
  homeTeam,
  awayTeam,
  onSelectHome,
  onSelectAway,
  onSwapTeams,
}: MatchupSelectorProps) {
  const homeAccentColor = homeTeam?.primary_color || "#94a3b8";
  const awayAccentColor = awayTeam?.secondary_color || "#94a3b8";

  return (
    <section className="flex flex-col">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl text-white font-bold tracking-wide">
            Select Matchup
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Choose the Home and Away clubs to preview lineups and launch the
            simulation.
          </p>
        </div>
      </div>

      <Card className="bg-slate-800/80 border border-slate-700/70 rounded-3xl shadow-xl overflow-visible">
        <CardContent className="p-4 sm:p-6 md:p-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6">
          <TeamDropdown
            label="Home Club"
            accentColor={homeAccentColor}
            teams={teams}
            selected={homeTeam}
            disabledTeamId={awayTeam?.id}
            onSelect={onSelectHome}
          />

          <div className="flex items-center justify-center shrink-0">
            <button
              type="button"
              onClick={onSwapTeams}
              disabled={!homeTeam && !awayTeam}
              title="Swap Home & Away Teams"
              className="w-11 h-11 rounded-full bg-slate-900 hover:bg-slate-700 border-2 border-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-md"
            >
              <ArrowLeftRight className="w-5 h-5" />
            </button>
          </div>

          <TeamDropdown
            label="Away Club"
            accentColor={awayAccentColor}
            teams={teams}
            selected={awayTeam}
            disabledTeamId={homeTeam?.id}
            onSelect={onSelectAway}
          />
        </CardContent>
      </Card>
    </section>
  );
}

function TeamDropdown({
  label,
  accentColor,
  teams,
  selected,
  disabledTeamId,
  onSelect,
}: {
  label: string;
  accentColor: string;
  teams: ClubTeam[];
  selected: ClubTeam | null;
  disabledTeamId?: number;
  onSelect: (team: ClubTeam) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const borderColor = accentColor;

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <span className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
        {label}
      </span>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border-2 transition-all text-left cursor-pointer shadow-inner"
        style={{
          borderColor:
            open || selected ? borderColor : "rgba(71, 85, 105, 0.7)",
        }}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {selected ? (
            <>
              <TeamCrest
                team={selected}
                fallbackColor={accentColor}
                sizeClassName="w-10 h-10 sm:w-12 sm:h-12"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-base sm:text-lg font-extrabold text-white truncate">
                  {selected.name}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    variant="outline"
                    className="bg-slate-950 text-slate-300 border-slate-700 px-2 py-0 text-[10px]"
                  >
                    {selected.formation}
                  </Badge>
                  <span className="text-xs text-slate-400 truncate">
                    {selected.stadium_name}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-slate-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-slate-400">
                  Select {label}...
                </span>
                <span className="text-xs text-slate-500">
                  Choose from {teams.length} Premier League clubs
                </span>
              </div>
            </>
          )}
        </div>

        <ChevronDown
          className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180 text-white" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 max-h-80 overflow-y-auto rounded-2xl bg-slate-900 border-2 border-slate-700 shadow-2xl p-2 space-y-1 custom-scrollbar">
          {teams.map((club) => {
            const isDisabled = club.id === disabledTeamId;
            const isSelected = club.id === selected?.id;

            return (
              <button
                key={club.id}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  onSelect(club);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  isSelected
                    ? "bg-emerald-950/60 border border-emerald-500/50 text-white"
                    : isDisabled
                      ? "opacity-35 cursor-not-allowed"
                      : "hover:bg-slate-800 text-slate-200 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <TeamCrest
                    team={club}
                    fallbackColor={accentColor}
                    sizeClassName="w-8 h-8"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white truncate">
                      {club.name}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate">
                      {club.stadium_name}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="bg-slate-950/80 text-slate-300 border-slate-700 text-[10px] shrink-0"
                >
                  {club.formation}
                </Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
