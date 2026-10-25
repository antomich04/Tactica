import { useMemo } from "react";
import { useTranslation } from "../Utils/i18n";
import type { MatchEvent } from "../types";

interface Props {
  events: MatchEvent[];
  teams: string[];
  teamShortCodes: [string, string];
  colorOf: (team: string) => string;
}

type TeamStats = {
  passes: number;
  passesCompleted: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  bigChances: number;
  corners: number;
  tacklesWon: number;
};

const emptyStats = (): TeamStats => ({
  passes: 0,
  passesCompleted: 0,
  shots: 0,
  shotsOnTarget: 0,
  xg: 0,
  bigChances: 0,
  corners: 0,
  tacklesWon: 0,
});

export function MatchStats({ events, teams, teamShortCodes, colorOf }: Props) {
  const { t } = useTranslation();
  const homeTeam = teams[0] || t("home");
  const awayTeam = teams[1] || t("away");
  const homeColor = colorOf(homeTeam);
  const awayColor = colorOf(awayTeam);

  const { home, away, possessionHome, possessionAway, topPlayers } =
    useMemo(() => {
      const h = emptyStats();
      const a = emptyStats();
      const playerScores: Record<
        string,
        { name: string; team: string; rating: number }
      > = {};

      const bumpPlayer = (
        name: string | undefined | null,
        team: string,
        delta: number,
      ) => {
        if (!name || name === "Player") return;
        if (!playerScores[name]) {
          playerScores[name] = { name, team, rating: 6.5 };
        }
        playerScores[name].rating = Math.min(
          9.9,
          Math.max(4.5, playerScores[name].rating + delta),
        );
      };

      for (const ev of events) {
        const target = ev.team === awayTeam ? a : h;

        switch (ev.type) {
          case "pass":
            target.passes += 1;
            if (ev.outcome === "completed") {
              target.passesCompleted += 1;
              bumpPlayer(ev.player, ev.team, 0.04);
            } else {
              bumpPlayer(ev.player, ev.team, -0.05);
            }
            break;

          case "shot":
            target.shots += 1;
            target.xg += ev.xg || 0;
            if (ev.outcome === "goal" || ev.outcome === "saved") {
              target.shotsOnTarget += 1;
              bumpPlayer(ev.player, ev.team, 0.18);
            } else {
              bumpPlayer(ev.player, ev.team, 0.05);
            }
            if ((ev.xg || 0) >= 0.25) {
              target.bigChances += 1;
            }
            break;

          case "goal":
            bumpPlayer(ev.scorer || ev.player, ev.team, 0.85);
            if (ev.assist_player) {
              bumpPlayer(ev.assist_player, ev.team, 0.45);
            }
            break;

          case "save":
            bumpPlayer(ev.player, ev.team, 0.35 + (ev.difficulty || 0) * 0.2);
            break;

          case "corner":
            target.corners += 1;
            break;

          case "tackle":
            if (ev.outcome === "won") {
              target.tacklesWon += 1;
              bumpPlayer(ev.player, ev.team, 0.22);
            }
            break;

          case "card":
            bumpPlayer(
              ev.player,
              ev.team,
              ev.card_color === "red" ? -1.2 : -0.4,
            );
            break;
        }
      }

      const totalPasses = h.passes + a.passes;
      const possHome =
        totalPasses > 0 ? Math.round((h.passes / totalPasses) * 100) : 50;
      const possAway = 100 - possHome;

      const sortedPlayers = Object.values(playerScores)
        .sort((p1, p2) => p2.rating - p1.rating)
        .slice(0, 3);

      return {
        home: h,
        away: a,
        possessionHome: possHome,
        possessionAway: possAway,
        topPlayers: sortedPlayers,
      };
    }, [events, awayTeam]);

  const homePassAcc =
    home.passes > 0
      ? Math.round((home.passesCompleted / home.passes) * 100)
      : 0;
  const awayPassAcc =
    away.passes > 0
      ? Math.round((away.passesCompleted / away.passes) * 100)
      : 0;

  return (
    <div className="w-full bg-slate-900 border border-slate-600 rounded-xl p-5 sm:p-6 shadow-lg flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
        <span
          className="text-base sm:text-lg font-black uppercase tracking-widest"
          style={{ color: homeColor }}
        >
          {homeTeam}
        </span>
        <span className="text-sm sm:text-base font-extrabold uppercase tracking-widest text-slate-300">
          {t("matchStatistics")}
        </span>
        <span
          className="text-base sm:text-lg font-black uppercase tracking-widest"
          style={{ color: awayColor }}
        >
          {awayTeam}
        </span>
      </div>

      {/* Stat Comparison Rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
        <StatRow
          label={t("possession")}
          leftDisplay={`${possessionHome}%`}
          rightDisplay={`${possessionAway}%`}
          leftVal={possessionHome}
          rightVal={possessionAway}
          leftColor={homeColor}
          rightColor={awayColor}
        />
        <StatRow
          label={t("expectedGoals")}
          leftDisplay={home.xg.toFixed(2)}
          rightDisplay={away.xg.toFixed(2)}
          leftVal={home.xg}
          rightVal={away.xg}
          leftColor={homeColor}
          rightColor={awayColor}
        />
        <StatRow
          label={t("totalShots")}
          leftDisplay={String(home.shots)}
          rightDisplay={String(away.shots)}
          leftVal={home.shots}
          rightVal={away.shots}
          leftColor={homeColor}
          rightColor={awayColor}
        />
        <StatRow
          label={t("shotsOnTarget")}
          leftDisplay={String(home.shotsOnTarget)}
          rightDisplay={String(away.shotsOnTarget)}
          leftVal={home.shotsOnTarget}
          rightVal={away.shotsOnTarget}
          leftColor={homeColor}
          rightColor={awayColor}
        />
        <StatRow
          label={t("bigChances")}
          leftDisplay={String(home.bigChances)}
          rightDisplay={String(away.bigChances)}
          leftVal={home.bigChances}
          rightVal={away.bigChances}
          leftColor={homeColor}
          rightColor={awayColor}
        />
        <StatRow
          label={t("passAccuracy")}
          leftDisplay={`${homePassAcc}%`}
          rightDisplay={`${awayPassAcc}%`}
          leftVal={homePassAcc}
          rightVal={awayPassAcc}
          leftColor={homeColor}
          rightColor={awayColor}
        />
        <StatRow
          label={t("corners")}
          leftDisplay={String(home.corners)}
          rightDisplay={String(away.corners)}
          leftVal={home.corners}
          rightVal={away.corners}
          leftColor={homeColor}
          rightColor={awayColor}
        />
        <StatRow
          label={t("tacklesWon")}
          leftDisplay={String(home.tacklesWon)}
          rightDisplay={String(away.tacklesWon)}
          leftVal={home.tacklesWon}
          rightVal={away.tacklesWon}
          leftColor={homeColor}
          rightColor={awayColor}
        />
      </div>

      {/* Top Rated Players */}
      {topPlayers.length > 0 && (
        <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
          <span className="text-sm font-extrabold uppercase tracking-widest text-slate-300">
            {t("topRatedPlayers")}
          </span>
          <div className="flex flex-col gap-2">
            {topPlayers.map((p) => {
              const playerColor = colorOf(p.team);
              const teamCode =
                p.team === homeTeam
                  ? teamShortCodes[0]
                  : p.team === awayTeam
                    ? teamShortCodes[1]
                    : "";
              const badgeColor =
                p.rating >= 7.5
                  ? "bg-emerald-500 text-slate-950"
                  : p.rating >= 6.8
                    ? "bg-amber-400 text-slate-950"
                    : "bg-slate-700 text-slate-200";

              return (
                <div
                  key={p.name}
                  className="flex min-w-0 items-center gap-3 bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5"
                >
                  <span
                    className={`px-2 py-0.5 rounded-md text-sm sm:text-base font-black tabular-nums shrink-0 ${badgeColor}`}
                  >
                    {p.rating.toFixed(1)}
                  </span>
                  <span className="min-w-0 flex-1 text-base font-bold text-slate-100">
                    {p.name}
                  </span>
                  <span
                    className="text-xs sm:text-sm font-bold shrink-0"
                    style={{ color: playerColor }}
                    title={p.team}
                  >
                    {teamCode || p.team}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({
  label,
  leftDisplay,
  rightDisplay,
  leftVal,
  rightVal,
  leftColor,
  rightColor,
}: {
  label: string;
  leftDisplay: string;
  rightDisplay: string;
  leftVal: number;
  rightVal: number;
  leftColor: string;
  rightColor: string;
}) {
  const total = leftVal + rightVal;
  const leftPct = total > 0 ? (leftVal / total) * 100 : 50;
  const rightPct = total > 0 ? (rightVal / total) * 100 : 50;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-lg sm:text-xl font-black text-white tabular-nums w-16 text-left">
          {leftDisplay}
        </span>
        <span className="text-sm sm:text-base font-bold text-slate-300 tracking-wide text-center">
          {label}
        </span>
        <span className="text-lg sm:text-xl font-black text-white tabular-nums w-16 text-right">
          {rightDisplay}
        </span>
      </div>

      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
        {total === 0 ? (
          <div className="w-full h-full bg-slate-800" />
        ) : (
          <>
            <div
              className="h-full rounded-l-full transition-all duration-500"
              style={{ width: `${leftPct}%`, backgroundColor: leftColor }}
            />
            <div
              className="h-full rounded-r-full transition-all duration-500"
              style={{ width: `${rightPct}%`, backgroundColor: rightColor }}
            />
          </>
        )}
      </div>
    </div>
  );
}