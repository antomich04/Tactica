import { MatchEvent, Status } from "../types";
import { Shield, Play, Square } from "lucide-react";

interface Props {
  teams: string[];
  events: MatchEvent[];
  matchTime: number;
  running: boolean;
  status: Status;
  detail: string;
  onToggleMatch: () => void;
}

export function Scoreboard({ teams, events, matchTime, running, status, detail, onToggleMatch }: Props) {
  // Show placeholders until the stream identifies both teams.
  const homeTeam = teams[0] || "HOME";
  const awayTeam = teams[1] || "AWAY";

  const homeGoals = events.filter(e => e.type === "goal" && e.team === homeTeam).length;
  const awayGoals = events.filter(e => e.type === "goal" && e.team === awayTeam).length;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 shadow-lg flex items-center justify-between">
      
      <div className="flex items-center gap-3 flex-1 justify-end">
        <span className="text-xl font-black text-white uppercase tracking-wide truncate max-w-[150px]">
          {homeTeam}
        </span>
        <Shield className="w-8 h-8 text-red-500 shrink-0" />
        <span className="text-3xl font-black text-white ml-2 tabular-nums">
          {homeGoals}
        </span>
      </div>

      <div className="flex flex-col items-center justify-center px-8 min-w-[180px]">
        
        <div className="flex items-center gap-1.5 mb-1" title={detail || undefined}>
          <div className={`w-1.5 h-1.5 rounded-full ${status === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            {status === 'live' ? 'Live' : status}
          </span>
        </div>
        
        <div className="bg-slate-950 border border-slate-700 px-4 py-1 rounded-lg mb-1.5 shadow-inner">
          <span className="text-xl font-mono font-black text-emerald-400 tabular-nums tracking-wider">
            {formatTime(matchTime)}
          </span>
        </div>

        <button 
          onClick={onToggleMatch}
          className={`flex items-center gap-1.5 px-4 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
            running 
              ? "bg-slate-800 text-red-400 hover:bg-slate-700 border border-slate-700" 
              : "bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500"
          }`}
        >
          {running ? <Square className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current" />}
          {running ? "Stop Match" : "Start Match"}
        </button>
      </div>

      <div className="flex items-center gap-3 flex-1 justify-start">
        <span className="text-3xl font-black text-white mr-2 tabular-nums">
          {awayGoals}
        </span>
        <Shield className="w-8 h-8 text-blue-500 shrink-0" />
        <span className="text-xl font-black text-white uppercase tracking-wide truncate max-w-[150px]">
          {awayTeam}
        </span>
      </div>

    </div>
  );
}