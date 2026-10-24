import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MatchupSelector } from "@/Components/MatchupSelector";
import { NextMatchSection } from "@/Components/NextMatchSection";
import { MatchDetailsSection } from "@/Components/MatchDetailsSection";
import { fetchAllTeams } from "../Services/teamsService";
import {
  clearSavedMatchup,
  readSavedMatchup,
  saveMatchup,
} from "../Services/matchupStorage";
import type { ClubTeam } from "../types";

export function HomePage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<ClubTeam[]>([]);
  const [homeTeam, setHomeTeam] = useState<ClubTeam | null>(null);
  const [awayTeam, setAwayTeam] = useState<ClubTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAllTeams()
      .then((clubList) => {
        if (!active) return;
        setTeams(clubList);
        const savedMatchup = readSavedMatchup();
        if (savedMatchup) {
          const savedHome = clubList.find(
            (team) => team.id === savedMatchup.homeTeamId,
          );
          const savedAway = clubList.find(
            (team) => team.id === savedMatchup.awayTeamId,
          );
          if (savedHome && savedAway) {
            setHomeTeam(savedHome);
            setAwayTeam(savedAway);
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load clubs from database.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    if (homeTeam && awayTeam) {
      saveMatchup({ homeTeamId: homeTeam.id, awayTeamId: awayTeam.id });
    } else {
      clearSavedMatchup();
    }
  }, [loading, homeTeam, awayTeam]);

  const handleSwapTeams = () => {
    setHomeTeam(awayTeam);
    setAwayTeam(homeTeam);
  };

  if (loading) {
    return (
      <div className="w-full min-h-[calc(100vh-80px)] flex items-center justify-center">
        <p className="text-slate-400 font-bold tracking-wider uppercase animate-pulse">
          Loading Premier League Clubs...
        </p>
      </div>
    );
  }

  if (error || teams.length < 2) {
    return (
      <div className="w-full min-h-[calc(100vh-80px)] flex items-center justify-center px-4">
        <p className="text-red-400 font-bold text-center">
          {error || "Not enough teams available in database."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-80px)] px-3 py-6 sm:px-6 md:py-10 lg:px-8">
      <main className="w-full max-w-6xl mx-auto flex flex-col gap-8 md:gap-12">
        <MatchupSelector
          teams={teams}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          onSelectHome={setHomeTeam}
          onSelectAway={setAwayTeam}
          onSwapTeams={handleSwapTeams}
        />

        {homeTeam && awayTeam && (
          <>
            <NextMatchSection
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              onWatch={() =>
                navigate("/match", {
                  state: { homeTeam, awayTeam },
                })
              }
            />
            <MatchDetailsSection homeTeam={homeTeam} awayTeam={awayTeam} />
          </>
        )}
      </main>
    </div>
  );
}
