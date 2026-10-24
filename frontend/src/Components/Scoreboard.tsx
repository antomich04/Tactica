import { MatchEvent, Status } from "../types";
import { ArrowLeftRight, Shield, Play, Square } from "lucide-react";
import { useTranslation } from "../Utils/i18n";

interface Props {
  teams: string[];
  events: MatchEvent[];
  matchTime: number;
  homeColor: string;
  awayColor: string;
  running: boolean;
  paused: boolean;
  finished: boolean;
  status: Status;
  detail: string;
  onToggleMatch: () => void;
  onStopMatch: () => void;
  onChangeMatch: () => void;
}

export function Scoreboard({
  teams,
  events,
  matchTime,
  homeColor,
  awayColor,
  running,
  paused,
  finished,
  status,
  detail,
  onToggleMatch,
  onStopMatch,
  onChangeMatch,
}: Props) {
  const { t } = useTranslation();
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
    if (matchTime === 0 && !running) return t("preMatch");
    if (matchTime >= 5400) return t("fullTime");
    if (matchTime >= 2700) return t("secondHalf");
    return t("firstHalf");
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 shadow-lg grid grid-cols-2 gap-y-4 md:flex md:flex-row md:items-center md:justify-between md:gap-0">
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
        <span
          title={homeTeam}
          className="min-w-0 flex-1 text-right text-lg md:text-xl font-black text-white uppercase tracking-wide break-words"
        >
          {homeTeam}
        </span>
        <Shield
          className="w-6 h-6 md:w-8 md:h-8 shrink-0"
          style={{ color: homeColor }}
        />
        <span className="text-2xl md:text-3xl font-black text-white md:ml-2 tabular-nums shrink-0">
          {homeGoals}
        </span>
      </div>

      {/* Timer and Controls */}
      <div className="col-span-2 flex flex-col items-center justify-center order-3 md:order-2 border-t border-slate-800 md:border-none pt-4 md:pt-0 shrink-0 md:px-8 md:min-w-[240px]">
        <div
          className="flex items-center gap-2 mb-1.5"
          title={detail || undefined}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              status === "live" && !finished
                ? "bg-emerald-500 animate-pulse"
                : "bg-slate-500"
            }`}
          />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            {paused
              ? t("paused")
              : finished
                ? t("fullTime")
                : status === "live"
                  ? getPeriodLabel()
                  : status}
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-700 px-5 py-1.5 rounded-lg mb-2 shadow-inner">
          <span className="text-2xl font-mono font-black text-emerald-400 tabular-nums tracking-wider">
            {formatTime(matchTime)}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleMatch}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 ${
              running && !finished
                ? "bg-slate-800 text-red-400 hover:bg-slate-700 border border-slate-600"
                : "bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500"
            }`}
          >
            {running && !finished ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            {finished
              ? t("resetMatch")
              : running
                ? t("pauseMatch")
                : matchTime > 0
                  ? t("resumeMatch")
                  : t("startMatch")}
          </button>
          {paused && (
            <button
              type="button"
              onClick={onStopMatch}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer bg-slate-800 text-red-400 hover:bg-slate-700 border border-slate-600 shadow-md active:scale-95"
            >
              <Square className="w-4 h-4 fill-current" />
              {t("stopMatch")}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onChangeMatch}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-400 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          {t("changeMatch")}
        </button>
      </div>

      {/* Away Team */}
      <div className="flex items-center gap-2 md:gap-3 flex-1 justify-end md:justify-start order-2 md:order-3 min-w-0">
        <span className="text-2xl md:text-3xl font-black text-white md:mr-2 tabular-nums shrink-0">
          {awayGoals}
        </span>
        <Shield
          className="w-6 h-6 md:w-8 md:h-8 shrink-0"
          style={{ color: awayColor }}
        />
        <span
          title={awayTeam}
          className="min-w-0 flex-1 text-lg md:text-xl font-black text-white uppercase tracking-wide break-words"
        >
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