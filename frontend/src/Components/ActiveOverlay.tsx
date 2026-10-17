import { useState, useEffect } from "react";
import { Overlay } from "../types";
import { Radio, Activity, Mic, Shield } from "lucide-react";

interface Props {
  active?: Overlay | null;
  teams: string[];
}

export function ActiveOverlay({ active, teams }: Props) {
  const [display, setDisplay] = useState<Overlay | null>(null);

  // Show each newly selected overlay as soon as it becomes active.
  useEffect(() => {
    if (active && active.id !== display?.id) {
      setDisplay(active);
    }
  }, [active]);

  // Keep each overlay visible for three seconds; changing it clears the old timer.
  useEffect(() => {
    if (display) {
      const timer = setTimeout(() => {
        setDisplay(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [display?.id]);

  if (!display) {
    return (
      <div className="w-full h-full bg-slate-900 border border-slate-700/50 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 shadow-lg transition-all relative overflow-hidden">
        <Radio className="w-6 h-6 mb-2 opacity-20" />
        <span className="text-xs font-bold tracking-widest uppercase opacity-40">Broadcast Feed Clear</span>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800/20 via-transparent to-transparent opacity-50" />
      </div>
    );
  }

  const homeTeam = teams[0] || "Home";
  const awayTeam = teams[1] || "Away";
  
  // Check both the commentary and optional team metadata when choosing team colors.
  const searchString = (display.text + " " + (display.meta?.team || "")).toLowerCase();
  
  const isHome = homeTeam && searchString.includes(homeTeam.toLowerCase());
  const isAway = awayTeam && searchString.includes(awayTeam.toLowerCase());

  const isAnalyst = display.persona === "analyst";
  let theme = isAnalyst 
    ? { 
        bg: 'bg-gradient-to-br from-blue-950 via-slate-900 to-slate-900', 
        accent: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30',
        icon: Activity, label: "Tactical Insight",
      }
    : { 
        bg: 'bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900', 
        accent: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30',
        icon: Mic, label: "Live Event",
      };

  if (isHome) {
    theme = {
      bg: 'bg-gradient-to-br from-red-950/80 via-slate-900 to-slate-900',
      accent: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/30',
      icon: Shield, label: `${homeTeam} Update`,
    };
  } else if (isAway) {
    theme = {
      bg: 'bg-gradient-to-br from-blue-950/80 via-slate-900 to-slate-900',
      accent: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30',
      icon: Shield, label: `${awayTeam} Update`,
    };
  }

  const Icon = theme.icon;

  return (
    <div className={`w-full h-full ${theme.bg} border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl relative flex flex-col justify-center animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.accent} shadow-[0_0_15px_currentColor]`} />

      <div className="relative z-10 p-4 pl-6 flex flex-col h-full justify-center">
        
        <div className="flex items-center gap-2 mb-2">
          <div className={`flex items-center justify-center w-6 h-6 rounded bg-slate-950/50 border ${theme.border}`}>
            <Icon className={`w-3.5 h-3.5 ${theme.text}`} />
          </div>
          <span className={`${theme.text} font-black uppercase tracking-widest text-xs drop-shadow-sm`}>
            {theme.label}
          </span>
          {!isAnalyst && !isHome && !isAway && (
            <div className={`w-1.5 h-1.5 rounded-full ${theme.accent} animate-pulse ml-1`} />
          )}
        </div>

        <p className="text-white font-black text-xl uppercase tracking-wider leading-tight truncate drop-shadow-md">
          {display.type.replace('_', ' ')}
        </p>
        
        <p className="text-slate-200 font-medium text-base mt-1.5 line-clamp-3 leading-snug drop-shadow-sm">
          {display.text}
        </p>

      </div>
      
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
    </div>
  );
}