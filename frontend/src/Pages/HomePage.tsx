import { useNavigate } from "react-router-dom";
import { Shield, Users, Target } from "lucide-react";
import { Button } from "@/Components/button";
import { Card, CardContent } from "@/Components/card";
import { Badge } from "@/Components/badge";
import { TacticalPitch, TacticalPlayer } from "@/Components/TacticalPitch";

const ARSENAL_STARTERS: TacticalPlayer[] = [
  { name: "D. Raya", role: "GK" },
  { name: "B. White", role: "RB" },
  { name: "W. Saliba", role: "RCB" },
  { name: "Gabriel", role: "LCB" },
  { name: "O. Zinchenko", role: "LB" },
  { name: "D. Rice", role: "CDM" },
  { name: "M. Ødegaard", role: "RCM" },
  { name: "K. Havertz", role: "LCM" },
  { name: "B. Saka", role: "RW" },
  { name: "G. Martinelli", role: "LW" },
  { name: "G. Jesus", role: "ST" },
];

const CHELSEA_STARTERS: TacticalPlayer[] = [
  { name: "R. Sanchez", role: "GK" },
  { name: "R. James", role: "RB" },
  { name: "T. Silva", role: "RCB" },
  { name: "L. Colwill", role: "LCB" },
  { name: "B. Chilwell", role: "LB" },
  { name: "M. Caicedo", role: "RDM" },
  { name: "E. Fernández", role: "LDM" },
  { name: "C. Palmer", role: "RW" },
  { name: "C. Gallagher", role: "CAM" },
  { name: "R. Sterling", role: "LW" },
  { name: "N. Jackson", role: "ST" },
];

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-[calc(100vh-80px)] px-3 py-6 sm:px-6 md:py-10 lg:px-8">
      <main className="w-full max-w-6xl mx-auto flex flex-col gap-8 md:gap-12">
        <NextMatchSection onWatch={() => navigate("/Match")} />
        <MatchDetailsSection />
      </main>
    </div>
  );
}

function NextMatchSection({ onWatch }: { onWatch: () => void }) {
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
            <div className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-b-full flex items-center justify-center bg-gradient-to-br from-red-600/10 to-red-800/30 border-2 border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
              <Shield className="w-9 h-9 sm:w-14 sm:h-14 md:w-20 md:h-20 text-red-500 drop-shadow-md" />
            </div>
            <span className="text-base sm:text-xl md:text-2xl font-extrabold text-white text-center tracking-wide">
              Arsenal
            </span>
          </div>

          {/* Match Info & Action */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <Badge
              variant="outline"
              className="bg-slate-900 py-1 px-2.5 sm:py-2 sm:px-4 md:py-2.5 md:px-6 border-slate-600 text-slate-300 text-[10px] sm:text-xs md:text-sm font-bold tracking-wider mb-2 md:mb-4 whitespace-nowrap"
            >
              TOMORROW 02:53 PM
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
            <div className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-b-full flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-blue-700/30 border-2 border-blue-500/40 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
              <Shield className="w-9 h-9 sm:w-14 sm:h-14 md:w-20 md:h-20 text-blue-500 drop-shadow-md" />
            </div>
            <span className="text-base sm:text-xl md:text-2xl font-extrabold text-white text-center tracking-wide">
              Chelsea
            </span>
          </div>

        </CardContent>
      </Card>
    </section>
  );
}

function MatchDetailsSection() {
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

          {/* Forced side-by-side (flex-row) on mobile and desktop */}
          <div className="flex flex-row items-start justify-center gap-2.5 sm:gap-6 md:gap-10 xl:gap-16 w-full max-w-4xl mx-auto">
            
            <div className="flex-1 flex flex-col items-center gap-2 md:gap-4 min-w-0">
              <div className="text-center">
                <span className="block text-sm sm:text-xl md:text-2xl font-black text-red-500 mb-1 truncate">
                  Arsenal
                </span>
                <Badge
                  variant="outline"
                  className="bg-slate-950/50 text-slate-300 border-slate-600 px-2 py-0.5 md:px-4 md:py-1 text-[10px] md:text-sm whitespace-nowrap"
                >
                  4-3-3
                </Badge>
              </div>
              <TacticalPitch teamColor="red" players={ARSENAL_STARTERS} />
            </div>

            <div className="flex-1 flex flex-col items-center gap-2 md:gap-4 min-w-0">
              <div className="text-center">
                <span className="block text-sm sm:text-xl md:text-2xl font-black text-blue-500 mb-1 truncate">
                  Chelsea
                </span>
                <Badge
                  variant="outline"
                  className="bg-slate-950/50 text-slate-300 border-slate-600 px-2 py-0.5 md:px-4 md:py-1 text-[10px] md:text-sm whitespace-nowrap"
                >
                  4-2-3-1
                </Badge>
              </div>
              <TacticalPitch teamColor="blue" players={CHELSEA_STARTERS} />
            </div>

          </div>
        </CardContent>
      </Card>
    </section>
  );
}