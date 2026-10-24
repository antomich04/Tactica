import { MatchEvent, Status } from "../types";
import { Shield, Play, Square } from "lucide-react";

interface Props {
  teams: string[];
  events: MatchEvent[];
  matchTime: number;
  running: boolean;
  paused: boolean;
  finished: boolean;
  status: Status;
  detail: string;
  onToggleMatch: () => void;
  onStopMatch: () => void;
}

export function Scoreboard({
  teams,
  events,
  matchTime,
  running,
  paused,
  finished,
  status,
  detail,
  onToggleMatch,
  onStopMatch,
}: Props) {
  const homeTeam = teams[0] || "Home";
  const awayTeam = teams[1] || "Away";

  const homeGoals = events.filter(
    (e) => e.type === "goal" && e.team === homeTeam,
  ).length;
  const awayGoals = events.filter(
    (e) => e.type === "goal" && e.team === awayTeam,
  ).length;

  const homeRedCards = events.filter(
    (e) => e.type === "card" && e.card_color === "red" && e.team === homeTeam,
  ).length;
  const awayRedCards = events.filter(
    (e) => e.type === "card" && e.card_color === "red" && e.team === awayTeam,
  ).length;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getPeriodLabel = () => {
    if (matchTime === 0 && !running) return "PRE-MATCH";
    if (matchTime >= 5400) return "FULL TIME";
    if (matchTime >= 2700) return "2ND HALF";
    return "1ST HALF";
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 shadow-lg grid grid-cols-2 gap-y-3 md:flex md:flex-row md:items-center md:justify-between md:gap-0">
      {/* Home Team */}
      <div className="flex items-center gap-2 md:gap-3 flex-1 justify-start md:justify-end order-1 min-w-0">
        {homeRedCards > 0 && (
          <div
            className="flex gap-1 shrink-0"
            title={`${homeRedCards} Red Card(s)`}
          >
            {Array.from({ length: homeRedCards }).map((_, i) => (
              <span
                key={i}
                className="w-2.5 h-3.5 bg-red-600 rounded-[2px] border border-white/40 shadow-xs"
              />
            ))}
          </div>
        )}
        <span className="text-lg md:text-xl font-black text-white uppercase tracking-wide truncate md:max-w-[150px]">
          {homeTeam}
        </span>
        <Shield className="w-6 h-6 md:w-8 md:h-8 text-red-500 shrink-0" />
        <span className="text-2xl md:text-3xl font-black text-white md:ml-2 tabular-nums shrink-0">
          {homeGoals}
        </span>
      </div>

      {/* Timer and Controls */}
      <div className="col-span-2 flex flex-col items-center justify-center order-3 md:order-2 border-t border-slate-800 md:border-none pt-3 md:pt-0 shrink-0 md:px-8 md:min-w-[200px]">
        <div
          className="flex items-center gap-2 mb-1"
          title={detail || undefined}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              status === "live" && !finished
                ? "bg-emerald-500 animate-pulse"
                : "bg-slate-500"
            }`}
          />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {paused
              ? "PAUSED"
              : finished
                ? "FULL TIME"
                : status === "live"
                  ? getPeriodLabel()
                  : status}
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-700 px-4 py-1 rounded-lg mb-1.5 shadow-inner">
          <span className="text-xl font-mono font-black text-emerald-400 tabular-nums tracking-wider">
            {formatTime(matchTime)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMatch}
            className={`flex items-center gap-1.5 px-4 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              running && !finished
                ? "bg-slate-800 text-red-400 hover:bg-slate-700 border border-slate-700"
                : "bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500"
            }`}
          >
            {running && !finished ? (
              <Square className="w-2.5 h-2.5 fill-current" />
            ) : (
              <Play className="w-2.5 h-2.5 fill-current" />
            )}
            {finished
              ? "Reset Match"
              : running
                ? "Pause Match"
                : matchTime > 0
                  ? "Resume Match"
                  : "Start Match"}
          </button>
          {paused && (
            <button
              onClick={onStopMatch}
              className="flex items-center gap-1.5 px-4 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer bg-slate-800 text-red-400 hover:bg-slate-700 border border-slate-700"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              Stop Match
            </button>
          )}
        </div>
      </div>

      {/* Away Team */}
      <div className="flex items-center gap-2 md:gap-3 flex-1 justify-end md:justify-start order-2 md:order-3 min-w-0">
        <span className="text-2xl md:text-3xl font-black text-white md:mr-2 tabular-nums shrink-0">
          {awayGoals}
        </span>
        <Shield className="w-6 h-6 md:w-8 md:h-8 text-blue-500 shrink-0" />
        <span className="text-lg md:text-xl font-black text-white uppercase tracking-wide truncate md:max-w-[150px]">
          {awayTeam}
        </span>
        {awayRedCards > 0 && (
          <div
            className="flex gap-1 shrink-0"
            title={`${awayRedCards} Red Card(s)`}
          >
            {Array.from({ length: awayRedCards }).map((_, i) => (
              <span
                key={i}
                className="w-2.5 h-3.5 bg-red-600 rounded-[2px] border border-white/40 shadow-xs"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
