import { useNavigate } from "react-router-dom";
import { Shield, Users, Target } from "lucide-react";
import { Button } from "@/Components/button";
import { Card, CardContent } from "@/Components/card";
import { Badge } from "@/Components/badge";
import { TacticalPitch, TacticalPlayer } from "@/Components/TacticalPitch";
import "../Styles/Home.css";

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

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home-layout">
      
      {/* LEFT COLUMN */}
      <main className="home-main">
        <NextMatchSection />
        <MatchDetailsSection />
      </main>

      {/* RIGHT COLUMN */}
      <aside className="home-sidebar">
        <h2 className="section-title text-2xl mb-3">Recent Matches</h2>
        <div className="sidebar-match-list">
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

function NextMatchSection() {
  return (
    <section>
      <h2 className="section-title text-2xl mb-6">Next Match</h2>
      <Card className="next-match-card border-none">
        <div className="next-match-bg-overlay" />
        <CardContent className="next-match-content">
          
          <div className="team-info">
            <div className="home-crest-container">
              <Shield className="w-24 h-24 text-red-500 drop-shadow-md" />
            </div>
            <span className="team-name">Arsenal</span>
          </div>

          <div className="match-info">
           <Badge variant="outline" className="match-time text-lg">
              TOMORROW 02:53 PM
            </Badge>
            <span className="vs-text">VS</span>
          </div>

          <div className="team-info">
            {/* Updated to a blue theme for Chelsea */}
            <div className="away-crest-container" style={{
              background: "linear-gradient(to bottom right, rgba(59, 130, 246, 0.1), rgba(29, 78, 216, 0.3))",
              borderColor: "rgba(59, 130, 246, 0.4)",
              boxShadow: "0 0 50px rgba(59, 130, 246, 0.2)"
            }}>
              <Shield className="w-24 h-24 text-blue-500 drop-shadow-md" />
            </div>
            <span className="team-name">Chelsea</span>
          </div>

        </CardContent>
      </Card>
    </section>
  );
}

function MatchDetailsSection() {
  return (
    <section className="match-details-section">
      <h2 className="section-title text-2xl">Match Details</h2>
      <Card className="match-details-card border-none relative">
        <div className="absolute inset-0 rounded-[inherit] bg-slate-900/50 pointer-events-none" />
        <CardContent className="relative z-10 w-full p-6 md:p-10 flex flex-col gap-8">
          
          {/* Header */}
          <div className="flex items-center justify-center gap-4 border-b border-slate-700/50 pb-6">
            <Users className="w-6 h-6 text-slate-400" />
            <h3 className="text-xl font-bold text-slate-200 uppercase tracking-widest m-0">Starting Lineups & Tactics</h3>
            <Target className="w-6 h-6 text-slate-400" />
          </div>

          {/* Pitches Container */}
          <div className="flex flex-col xl:flex-row justify-center gap-10 xl:gap-16">
            
            {/* Arsenal Side */}
            <div className="flex-1 flex flex-col items-center gap-4">
              <div className="text-center">
                <span className="block text-2xl font-black text-red-500 mb-1">Arsenal</span>
                <Badge variant="outline" className="bg-slate-950/50 text-slate-300 border-slate-600 px-4 py-1 text-sm">
                  4-3-3 Attack
                </Badge>
              </div>
              <TacticalPitch teamColor="red" players={ARSENAL_STARTERS} />
            </div>

            {/* Chelsea Side */}
            <div className="flex-1 flex flex-col items-center gap-4">
              <div className="text-center">
                <span className="block text-2xl font-black text-blue-500 mb-1">Chelsea</span>
                <Badge variant="outline" className="bg-slate-950/50 text-slate-300 border-slate-600 px-4 py-1 text-sm">
                  4-2-3-1 Wide
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

function SidebarMatchCard({ homeTeam, awayTeam, score, date, onView }: any) {
  return (
    <Card className="recent-match-card border-slate-700">
      <CardContent className="recent-match-card-content">
        
        <div className="recent-match-header">
          <span className="recent-date">{date}</span>
          <Button onClick={onView} size="sm" className="view-button">
            VIEW
          </Button>
        </div>
        
        <div className="recent-match-score-row">
          <span className="recent-team right">{homeTeam}</span>
          <span className="recent-score">{score}</span>
          <span className="recent-team left">{awayTeam}</span>
        </div>

      </CardContent>
    </Card>
  );
}