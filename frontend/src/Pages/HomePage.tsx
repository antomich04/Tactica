import { useNavigate } from "react-router-dom";
import { Shield, Users, Target } from "lucide-react";
import { Button } from "@/Components/button";
import { Card, CardContent } from "@/Components/card";
import { Badge } from "@/Components/badge";
import { TacticalPitch, TacticalPlayer } from "@/Components/TacticalPitch";

const RECENT_MATCHES = [
  { id: "1", homeTeam: "Liverpudlians", awayTeam: "Khanh FC", score: "3 - 1", date: "YESTERDAY" },
  { id: "2", homeTeam: "Khanh FC", awayTeam: "Minnesia", score: "0 - 1", date: "9 OCT" },
  { id: "3", homeTeam: "Liverpudlians", awayTeam: "Minnesia", score: "2 - 2", date: "6 OCT" },
  { id: "4", homeTeam: "Minnesia", awayTeam: "Khanh FC", score: "1 - 2", date: "3 OCT" },
  { id: "5", homeTeam: "Khanh FC", awayTeam: "Liverpudlians", score: "2 - 4", date: "28 SEP" },
  { id: "6", homeTeam: "Minnesia", awayTeam: "Liverpudlians", score: "0 - 0", date: "24 SEP" },
  { id: "7", homeTeam: "Liverpudlians", awayTeam: "Khanh FC", score: "1 - 0", date: "20 SEP" },
  { id: "8", homeTeam: "Khanh FC", awayTeam: "Minnesia", score: "3 - 2", date: "16 SEP" },
  { id: "9", homeTeam: "Minnesia", awayTeam: "Khanh FC", score: "2 - 2", date: "12 SEP" },
  { id: "10", homeTeam: "Liverpudlians", awayTeam: "Minnesia", score: "4 - 1", date: "8 SEP" },
  { id: "11", homeTeam: "Khanh FC", awayTeam: "Liverpudlians", score: "1 - 3", date: "4 SEP" },
  { id: "12", homeTeam: "Minnesia", awayTeam: "Liverpudlians", score: "1 - 2", date: "31 AUG" },
  { id: "13", homeTeam: "Liverpudlians", awayTeam: "Khanh FC", score: "2 - 0", date: "27 AUG" },
  { id: "14", homeTeam: "Khanh FC", awayTeam: "Minnesia", score: "0 - 2", date: "23 AUG" },
];

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

type SidebarMatchCardProps = {
  homeTeam: string;
  awayTeam: string;
  score: string;
  date: string;
  onView: () => void;
};

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-[calc(100vh-80px)] p-4 lg:p-8 flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_400px] lg:items-stretch gap-6 lg:gap-8 box-border">
      
      <main className="flex flex-col gap-8 w-full min-w-0">
        <NextMatchSection onWatch={() => navigate("/Match")} />
        <MatchDetailsSection />
      </main>

      <aside className="flex flex-col w-full p-6 border-2 border-slate-700/70 bg-slate-900/75 rounded-2xl max-h-[500px] lg:h-0 lg:min-h-full lg:max-h-none overflow-hidden">
        <h2 className="text-2xl mb-3 text-white font-bold tracking-wide">Recent Matches</h2>
        <div className="flex flex-col flex-1 min-h-0 gap-4 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-slate-900/50 [&::-webkit-scrollbar-thumb]:bg-slate-600/80 [&::-webkit-scrollbar-thumb]:rounded">
          {RECENT_MATCHES.map((match) => (
            <SidebarMatchCard 
              key={match.id}
              homeTeam={match.homeTeam} 
              awayTeam={match.awayTeam} 
              score={match.score} 
              date={match.date} 
              onView={() => navigate("/Match")} 
            />
          ))}
        </div>
      </aside>

    </div>
  );
}

function NextMatchSection({ onWatch }: { onWatch: () => void }) {
  return (
    <section className="flex flex-col">
      <h2 className="text-2xl mb-4 md:mb-6 text-white font-bold tracking-wide">Next Match</h2>
      <Card className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border-none w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-emerald-950/20 opacity-90 pointer-events-none" />
        <CardContent className="relative z-10 flex flex-row items-center justify-evenly py-6 px-4 md:py-12 md:px-10 gap-2 md:gap-4 border-none">
          
          <div className="flex flex-col items-center gap-2 md:gap-4">
            <div className="w-[4.5rem] h-[4.5rem] md:w-32 md:h-32 rounded-b-full flex items-center justify-center bg-gradient-to-br from-red-600/10 to-red-800/30 border-2 border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
              <Shield className="w-10 h-10 md:w-24 md:h-24 text-red-500 drop-shadow-md" />
            </div>
            <span className="text-base md:text-2xl font-extrabold text-white text-center tracking-wide">
              Arsenal
            </span>
          </div>

          <div className="flex flex-col items-center justify-center">
            <Badge variant="outline" className="bg-slate-900 py-1 px-2 md:py-3 md:px-6 border-slate-600 text-slate-300 text-[10px] md:text-base font-bold tracking-wider mb-2 md:mb-4 whitespace-nowrap">
              TOMORROW 02:53 PM
            </Badge>
            <span className="text-3xl md:text-7xl font-black text-red-500 tracking-tighter leading-none drop-shadow-lg mb-2 md:mb-4">
              VS
            </span>
            
            <Button 
              onClick={onWatch} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black tracking-widest px-4 py-2 text-[10px] md:px-3 md:py-8 md:text-lg rounded-lg md:rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all hover:scale-105 border border-emerald-400/50"
            >
              WATCH NOW
            </Button>
          </div>

          <div className="flex flex-col items-center gap-2 md:gap-4">
            <div className="w-[4.5rem] h-[4.5rem] md:w-32 md:h-32 rounded-b-full flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-blue-700/30 border-2 border-blue-500/40 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
              <Shield className="w-10 h-10 md:w-24 md:h-24 text-blue-500 drop-shadow-md" />
            </div>
            <span className="text-base md:text-2xl font-extrabold text-white text-center tracking-wide">
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
    <section className="flex flex-col mt-4 lg:mt-12">
      <h2 className="text-2xl text-white font-bold tracking-wide mb-4 md:mb-6">Match Details</h2>
      <Card className="bg-slate-800/50 border-slate-700/50 rounded-2xl flex flex-col border-none relative overflow-hidden">
        <div className="absolute inset-0 rounded-[inherit] bg-slate-900/50 pointer-events-none" />
        <CardContent className="relative z-10 w-full p-4 md:p-10 flex flex-col gap-6 md:gap-8">
          
          <div className="flex items-center justify-center gap-2 md:gap-4 border-b border-slate-700/50 pb-4 md:pb-6 text-center">
            <Users className="w-4 h-4 md:w-6 md:h-6 text-slate-400 shrink-0" />
            <h3 className="text-sm md:text-xl font-bold text-slate-200 uppercase tracking-widest m-0">Starting Lineups & Tactics</h3>
            <Target className="w-4 h-4 md:w-6 md:h-6 text-slate-400 shrink-0" />
          </div>

          <div className="flex flex-row items-start justify-center gap-3 md:gap-10 xl:gap-16 w-full">
            
            <div className="flex-1 flex flex-col items-center gap-2 md:gap-4 min-w-0">
              <div className="text-center">
                <span className="block text-sm md:text-2xl font-black text-red-500 mb-1 truncate">Arsenal</span>
                <Badge variant="outline" className="bg-slate-950/50 text-slate-300 border-slate-600 px-2 py-0.5 md:px-4 md:py-1 text-[10px] md:text-sm whitespace-nowrap">
                  4-3-3
                </Badge>
              </div>
              <TacticalPitch teamColor="red" players={ARSENAL_STARTERS} />
            </div>

            <div className="flex-1 flex flex-col items-center gap-2 md:gap-4 min-w-0">
              <div className="text-center">
                <span className="block text-sm md:text-2xl font-black text-blue-500 mb-1 truncate">Chelsea</span>
                <Badge variant="outline" className="bg-slate-950/50 text-slate-300 border-slate-600 px-2 py-0.5 md:px-4 md:py-1 text-[10px] md:text-sm whitespace-nowrap">
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

function SidebarMatchCard({ homeTeam, awayTeam, score, date, onView }: SidebarMatchCardProps) {
  return (
    <Card className="bg-slate-800/90 hover:bg-slate-800 transition-colors shrink-0 border-slate-700">
      <CardContent className="p-4 flex flex-col gap-3">
        
        <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
          <span className="text-[11px] font-bold text-slate-400 tracking-widest">{date}</span>
          <Button 
            onClick={onView} 
            size="sm" 
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-7 px-3 pt-0.5 mt-1 text-[11px] font-extrabold transition-colors"
          >
            VIEW
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-200 text-sm flex-1 truncate text-right">{homeTeam}</span>
          <span className="text-2xl font-black text-white mx-4 tracking-wide">{score}</span>
          <span className="font-bold text-slate-200 text-sm flex-1 truncate text-left">{awayTeam}</span>
        </div>

      </CardContent>
    </Card>
  );
}