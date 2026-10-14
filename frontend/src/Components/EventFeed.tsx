import type { MatchEvent } from "../types";
import { clock } from "../Utils/match-logic";
import { Activity, ArrowRight, Target, Zap, AlertCircle, Flag } from "lucide-react";

interface Props {
  events: MatchEvent[];
  evidence: Set<string>;
  colorOf: (team: string) => string;
}

export function EventFeed({ events, evidence, colorOf }: Props) {
  const sortedEvents = [...events].sort((a, b) => b.timestamp - a.timestamp);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "shot": return <Target className="w-5 h-5" />;
      case "goal": return <Zap className="w-5 h-5 text-yellow-400" />;
      case "foul": return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case "pass": return <ArrowRight className="w-5 h-5" />;
      case "offside": return <Flag className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const formatEventText = (event: MatchEvent) => {
    // Team-level events may not include a player, so fall back to the team name.
    const actor = 'player' in event && event.player ? String(event.player) : event.team;

    if (event.type === "pass" && "outcome" in event) {
      return `${actor} pass ${event.outcome}`;
    }
    if (event.type === "shot" && "outcome" in event) {
      return event.outcome === "goal" ? `${actor} SCORED!` : `${actor} shot missed`;
    }
    
    return `${actor} ${event.type.replace('_', ' ')}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      
      <div className="p-4 border-b border-slate-600 bg-slate-900/80 sticky top-0 z-10">
        <h3 className="text-slate-200 font-bold uppercase tracking-wider text-base flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-500" />
          Live Play-by-Play
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {sortedEvents.length === 0 ? (
          <p className="text-slate-500 text-center mt-10 font-medium text-lg">Awaiting kickoff...</p>
        ) : (
          sortedEvents.map((event) => {
            const isEvidence = evidence.has(event.id);
            const teamColor = colorOf(event.team);

            return (
              <div 
                key={event.id}
                className={`flex items-start gap-4 p-3 rounded-lg border transition-all duration-300 ${
                  isEvidence 
                    ? "bg-slate-800/80 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]" 
                    : "bg-slate-800/30 border-slate-600 hover:bg-slate-800/50"
                }`}
              >
                <div className="flex-shrink-0 mt-0.5" style={{ color: teamColor }}>
                  {getEventIcon(event.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-base font-medium capitalize truncate">
                    {formatEventText(event)}
                  </p>
                </div>

                <div className="flex-shrink-0 text-slate-400 font-mono text-sm font-bold mt-1 tabular-nums">
                  {clock(event.timestamp)}
                </div>
              </div>
            );
          })
        )}
      </div>
      
    </div>
  );
}