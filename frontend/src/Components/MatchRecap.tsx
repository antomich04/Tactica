import { ArrowLeft, LoaderCircle, RotateCcw, Trophy, X } from "lucide-react";
import { useTranslation } from "../Utils/i18n";
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
  const { t } = useTranslation();
  const result =
    summary.home_score === summary.away_score
      ? t("matchEndsLevel")
      : t("winningTeam", {
          team:
            summary.home_score > summary.away_score
              ? summary.home_team
              : summary.away_team,
        });

  if (recapLoading) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center p-4">
        <section
          className="flex w-full flex-col items-center gap-4 rounded-2xl border border-slate-700 bg-slate-900 px-6 py-16 text-center shadow-2xl"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle className="h-10 w-10 animate-spin text-emerald-300" />
          <h1 className="text-xl font-bold text-white">{t("preparingRecap")}</h1>
          <p className="text-sm text-slate-400">
            {t("recapLoadingDetails")}
          </p>
        </section>
      </main>
    );
  }

  const recapText =
    recap?.text ??
    t("recapScore", {
      homeTeam: summary.home_team,
      homeScore: summary.home_score,
      awayScore: summary.away_score,
      awayTeam: summary.away_team,
      result,
    });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center p-4">
      <section className="w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <header className="border-b border-slate-700 bg-gradient-to-r from-emerald-950/70 to-slate-900 px-6 py-8 text-center">
          <Trophy className="mx-auto mb-3 h-8 w-8 text-amber-300" />
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
            {t("fullTime")}
          </p>
          <h1 className="mt-4 flex items-center justify-center gap-4 text-2xl font-black text-white sm:text-4xl">
            <span className="min-w-0 flex-1 truncate text-right text-lg sm:text-2xl md:text-3xl">
              {summary.home_team}
            </span>
            <span className="shrink-0 tabular-nums text-xl sm:text-3xl">
              {summary.home_score} - {summary.away_score}
            </span>
            <span className="min-w-0 flex-1 truncate text-left text-lg sm:text-2xl md:text-3xl">
              {summary.away_team}
            </span>
          </h1>
          <p className="mt-3 text-sm text-slate-300">{result}</p>
        </header>

        <div className="grid gap-6 p-6 md:grid-cols-[1fr_1fr]">
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              {t("matchRecap")}
            </h2>
            <p className="mt-3 leading-relaxed text-slate-100">{recapText}</p>
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              {t("matchStatistics")}
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
                {t("keyMoments")}
              </h2>
              <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                {summary.key_events.map((event, index) => (
                  <li
                    key={`${event.timestamp}-${event.type}-${index}`}
                    className="flex min-w-0 flex-col gap-1 rounded-lg border border-slate-700 bg-slate-950/50 p-3"
                  >
                    <span className="font-mono text-xs text-emerald-300">
                      {formatMatchTime(event.timestamp)}
                    </span>
                    <span className="font-semibold text-white">
                      {formatKeyEventDetails(event, t)}
                    </span>
                    <span className="block text-xs text-slate-400">
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
            {t("closeRecap")}
          </button>
          <button
            type="button"
            onClick={onBackToSelection}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToMatchSelection")}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 font-bold text-slate-950 transition hover:bg-emerald-400"
          >
            <RotateCcw className="h-4 w-4" />
            {t("playAgain")}
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
  const { t } = useTranslation();
  const passAccuracy =
    stats.passes_attempted === 0
      ? t("notAvailable")
      : `${Math.round((stats.passes_completed / stats.passes_attempted) * 100)}%`;

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
      <h3 className="mb-3 truncate text-sm font-bold text-white" title={team}>
        {team}
      </h3>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Stat label={t("shots")} value={stats.shots} />
        <Stat label={t("onTarget")} value={stats.shots_on_target} />
        <Stat
          label={t("passAccuracy")}
          value={`${stats.passes_completed}/${stats.passes_attempted} (${passAccuracy})`}
        />
        <Stat label={t("corners")} value={stats.corners} />
        <Stat label={t("yellowCards")} value={stats.yellow_cards} />
        <Stat label={t("redCards")} value={stats.red_cards} />
      </dl>
    </section>
  );
}

function formatKeyEventDetails(
  event: MatchSummary["key_events"][number],
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (event.type === "goal") {
    return t("goalBy", { player: event.player });
  }

  if (event.type === "substitution") {
    const parts = event.details?.split(" replaces ");
    if (parts?.length === 2) {
      return t("substitutionBy", {
        playerOn: parts[0].trim(),
        playerOff: parts[1].trim(),
      });
    }
    return t("substitutionEvent");
  }

  if (event.type === "card") {
    const cardDetails = event.details?.match(/^(yellow|red) card(?::\s*(.*))?$/i);
    if (cardDetails) {
      const cardLabel = t(
        cardDetails[1].toLowerCase() === "red" ? "redCard" : "yellowCard",
      );
      return cardDetails[2]
        ? `${cardLabel}: ${cardDetails[2]}`
        : cardLabel;
    }
  }

  if (event.type === "penalty") return t("penaltyAwarded");
  if (event.type === "save") return t("importantSave");
  return event.details ?? "";
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
