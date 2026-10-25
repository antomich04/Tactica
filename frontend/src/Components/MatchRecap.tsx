import { ArrowLeft, LoaderCircle, RotateCcw, Trophy, X } from "lucide-react";
import type { MatchRecap, MatchSummary } from "../types";

type Props = {
  summary: MatchSummary;
  recap: MatchRecap | null;
  recapLoading: boolean;
  onRestart: () => void;
  onBackToSelection: () => void;
  onClose: () => void;
};

export function MatchRecap({
  summary,
  recap,
  recapLoading,
  onRestart,
  onBackToSelection,
  onClose,
}: Props) {
  const result =
    summary.home_score === summary.away_score
      ? "The match ends level."
      : `${summary.home_score > summary.away_score ? summary.home_team : summary.away_team} take the win.`;

  if (recapLoading) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center p-4">
        <section
          className="flex w-full flex-col items-center gap-4 rounded-2xl border border-slate-700 bg-slate-900 px-6 py-16 text-center shadow-2xl"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle className="h-10 w-10 animate-spin text-emerald-300" />
          <h1 className="text-xl font-bold text-white">Preparing your full-time recap</h1>
          <p className="text-sm text-slate-400">
            Gathering the final result, match stats, and key moments.
          </p>
        </section>
      </main>
    );
  }

  const recapText =
    recap?.text ??
    `Full time: ${summary.home_team} ${summary.home_score}–${summary.away_score} ${summary.away_team}. ${result}`;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center p-4">
      <section className="w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <header className="border-b border-slate-700 bg-gradient-to-r from-emerald-950/70 to-slate-900 px-6 py-8 text-center">
          <Trophy className="mx-auto mb-3 h-8 w-8 text-amber-300" />
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
            Full Time
          </p>
          <h1 className="mt-4 flex items-center justify-center gap-4 text-2xl font-black text-white sm:text-4xl">
            <span className="text-right">{summary.home_team}</span>
            <span className="shrink-0 tabular-nums">
              {summary.home_score} - {summary.away_score}
            </span>
            <span className="text-left">{summary.away_team}</span>
          </h1>
          <p className="mt-3 text-sm text-slate-300">{result}</p>
        </header>

        <div className="grid gap-6 p-6 md:grid-cols-[1fr_1fr]">
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Match recap
            </h2>
            <p className="mt-3 leading-relaxed text-slate-100">{recapText}</p>
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Match stats
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <TeamStats
                team={summary.home_team}
                stats={summary.stats.home}
              />
              <TeamStats
                team={summary.away_team}
                stats={summary.stats.away}
              />
            </div>
          </section>

          {summary.key_events.length > 0 && (
            <section className="md:col-span-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Key moments
              </h2>
              <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                {summary.key_events.map((event, index) => (
                  <li
                    key={`${event.timestamp}-${event.type}-${index}`}
                    className="rounded-lg border border-slate-700 bg-slate-950/50 p-3"
                  >
                    <span className="mr-2 font-mono text-xs text-emerald-300">
                      {formatMatchTime(event.timestamp)}
                    </span>
                    <span className="font-semibold text-white">
                      {event.details}
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">
                      {event.team} · {event.player}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-700 p-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
            Close recap
          </button>
          <button
            type="button"
            onClick={onBackToSelection}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to match selection
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 font-bold text-slate-950 transition hover:bg-emerald-400"
          >
            <RotateCcw className="h-4 w-4" />
            Play again
          </button>
        </footer>
      </section>
    </main>
  );
}

function TeamStats({
  team,
  stats,
}: {
  team: string;
  stats: MatchSummary["stats"]["home"];
}) {
  const passAccuracy =
    stats.passes_attempted === 0
      ? "N/A"
      : `${Math.round((stats.passes_completed / stats.passes_attempted) * 100)}%`;

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
      <h3 className="mb-3 truncate text-sm font-bold text-white" title={team}>
        {team}
      </h3>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="Shots" value={stats.shots} />
        <Stat label="On target" value={stats.shots_on_target} />
        <Stat
          label="Pass accuracy"
          value={`${stats.passes_completed}/${stats.passes_attempted} (${passAccuracy})`}
        />
        <Stat label="Corners" value={stats.corners} />
        <Stat label="Yellow cards" value={stats.yellow_cards} />
        <Stat label="Red cards" value={stats.red_cards} />
      </dl>
    </section>
  );
}

function formatMatchTime(timestamp: number): string {
  const totalSeconds = Math.round(timestamp);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-1 font-bold tabular-nums text-white">{value}</dd>
    </div>
  );
}
