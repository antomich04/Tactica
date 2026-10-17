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
    <div className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 shadow-lg grid grid-cols-2 gap-y-3 md:flex md:flex-row md:items-center md:justify-between md:gap-0">
      
      {/* Home Team (Mobile: Top Left | Desktop: Left Side) */}
      <div className="flex items-center gap-2 md:gap-3 flex-1 justify-start md:justify-end order-1 min-w-0">
        <span className="text-lg md:text-xl font-black text-white uppercase tracking-wide truncate md:max-w-[150px]">
          {homeTeam}
        </span>
        <Shield className="w-6 h-6 md:w-8 md:h-8 text-red-500 shrink-0" />
        <span className="text-2xl md:text-3xl font-black text-white md:ml-2 tabular-nums shrink-0">
          {homeGoals}
        </span>
      </div>

      {/* Timer and Controls (Mobile: Bottom Full Width | Desktop: Center) */}
      <div className="col-span-2 flex flex-col items-center justify-center order-3 md:order-2 border-t border-slate-800 md:border-none pt-3 md:pt-0 shrink-0 md:px-8 md:min-w-[180px]">
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

      {/* Away Team (Mobile: Top Right | Desktop: Right Side) */}
      <div className="flex items-center gap-2 md:gap-3 flex-1 justify-end md:justify-start order-2 md:order-3 min-w-0">
        <span className="text-2xl md:text-3xl font-black text-white md:mr-2 tabular-nums shrink-0">
          {awayGoals}
        </span>
        <Shield className="w-6 h-6 md:w-8 md:h-8 text-blue-500 shrink-0" />
        <span className="text-lg md:text-xl font-black text-white uppercase tracking-wide truncate md:max-w-[150px]">
          {awayTeam}
        </span>
      </div>

    </div>
  );
}