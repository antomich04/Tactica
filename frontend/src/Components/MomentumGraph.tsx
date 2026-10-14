import { Shield } from "lucide-react";
import type { MatchEvent, MatchMetrics } from "../types";

interface Props {
  metrics: MatchMetrics | null;
  teams: string[];
  latestEvent?: MatchEvent;
}

export function MomentumGraph({ metrics, teams, latestEvent }: Props) {
  if (!metrics || typeof metrics !== 'object') {
    return (
      <div className="w-full h-full bg-slate-900 border border-slate-600 rounded-xl p-3 flex items-center justify-center text-slate-500 shadow-lg text-base font-bold uppercase tracking-widest">
        Awaiting Tactical Data
      </div>
    );
  }

  const chaos = Number(metrics.chaos_index) || 0;
  const control = Number(metrics.control_index) || 0;
  
  const activeTeam = latestEvent?.team || metrics.controlling_team;

  const homeTeam = teams[0] || "Home";
  const awayTeam = teams[1] || "Away";
  const isAway = activeTeam === awayTeam;

  const controlBarColor = activeTeam === homeTeam 
    ? 'bg-red-500' 
    : activeTeam === awayTeam 
      ? 'bg-blue-500' 
      : 'bg-slate-500';

  return (
    <div className="w-full h-full bg-slate-900 border border-slate-600 rounded-xl p-3 flex flex-col justify-between shadow-lg overflow-hidden">
      
      {/* Top Banner (Slightly tighter padding to save vertical space) */}
      <div className="flex items-center justify-between bg-slate-800/40 border border-slate-700/50 rounded-xl p-2 mb-2">
        <div className={`flex items-center gap-2 transition-opacity duration-500 ${!isAway ? 'opacity-100' : 'opacity-40'}`}>
          <Shield className="w-7 h-7 text-red-500" />
          <span className="text-sm font-black uppercase text-white truncate max-w-[90px]">{homeTeam}</span>
        </div>

        <div className="flex-1 h-8 relative mx-2">
          <div 
            className="absolute top-0 bottom-0 w-8 flex items-center justify-center transition-all duration-700 ease-in-out"
            style={{ left: isAway ? 'calc(100% - 2rem)' : '0%' }}
          >
            <svg 
              className="w-7 h-7 animate-bounce drop-shadow-[0_3px_3px_rgba(0,0,0,0.5)]" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="10" fill="white" stroke="#1e293b" strokeWidth="1.5"/>
              <path d="M12 6.5 L15.5 9 L14 13 h-4 L8.5 9 Z" fill="#1e293b" stroke="#1e293b" strokeWidth="1" />
              <line x1="12" y1="6.5" x2="12" y2="2" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="15.5" y1="9" x2="20" y2="7.5" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="8.5" y1="9" x2="4" y2="7.5" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="14" y1="13" x2="17.5" y2="18" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="10" y1="13" x2="6.5" y2="18" stroke="#1e293b" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        <div className={`flex items-center gap-2 transition-opacity duration-500 ${isAway ? 'opacity-100' : 'opacity-40'}`}>
          <span className="text-sm font-black uppercase text-white truncate max-w-[90px]">{awayTeam}</span>
          <Shield className="w-7 h-7 text-blue-500" />
        </div>
      </div>

      {/* Stats Area */}
      <div className="flex gap-4 items-start px-2 mt-auto pb-1">
        
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">Pass Control</span>
            <span className="text-xl font-black text-slate-200 tabular-nums">{control.toFixed(0)}<span className="text-xs text-slate-500 ml-0.5">%</span></span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${controlBarColor}`} 
              style={{ width: `${Math.min(100, control)}%` }} 
            />
          </div>
          {/* Top margin adds space above the text, placing it nicely inside the card */}
          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider text-right mt-1.5">
            Driven by chained passes
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">Disruption</span>
            <span className="text-xl font-black text-slate-200 tabular-nums">{chaos.toFixed(0)}<span className="text-xs text-slate-500 ml-0.5">%</span></span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${chaos > 60 ? 'bg-orange-500' : chaos > 30 ? 'bg-yellow-500' : 'bg-slate-500'}`} 
              style={{ width: `${Math.min(100, chaos)}%` }} 
            />
          </div>
          {/* Top margin adds space above the text, placing it nicely inside the card */}
          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider text-right mt-1.5">
            Driven by tackles & turnovers
          </div>
        </div>

      </div>
    </div>
  );
}