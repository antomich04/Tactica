import { useMemo } from "react";
import type { MatchEvent } from "../types";

interface Props {
  events: MatchEvent[];
  teams: string[];
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

export function MatchStats({ events, teams, colorOf }: Props) {
  const homeTeam = teams[0] || "Home";
  const awayTeam = teams[1] || "Away";
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
    <div className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 sm:p-5 shadow-lg flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <span
          className="text-xs sm:text-sm font-black uppercase tracking-widest"
          style={{ color: homeColor }}
        >
          {homeTeam}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Match Statistics
        </span>
        <span
          className="text-xs sm:text-sm font-black uppercase tracking-widest"
          style={{ color: awayColor }}
        >
          {awayTeam}
        </span>
      </div>

      {/* Stat Comparison Rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5">
        <StatRow
          label="Possession"
          leftDisplay={`${possessionHome}%`}
          rightDisplay={`${possessionAway}%`}
          leftVal={possessionHome}
          rightVal={possessionAway}
          leftColor={homeColor}
          rightColor={awayColor}
        />
        <StatRow
          label="Expected Goals (xG)"
          leftDisplay={home.xg.toFixed(2)}
          rightDisplay={away.xg.toFixed(2)}
          leftVal={home.xg}
          rightVal={away.xg}
          leftColor={homeColor}
          rightColor={awayColor}
        />
        <StatRow
          label="Total Shots"
          leftDisplay={String(home.shots)}
          rightDisplay={String(away.shots)}
          leftVal={home.shots}
          rightVal={away.shots}
          leftColor={homeColor}
          rightColor={awayColor}
        />
        <StatRow
          label="Shots on Target"
          leftDisplay={String(home.shotsOnTarget)}
          rightDisplay={String(away.shotsOnTarget)}
          leftVal={home.shotsOnTarget}
          rightVal={away.shotsOnTarget}
          leftColor={homeColor}
          rightColor={awayColor}
        />
        <StatRow
          label="Big Chances"
          leftDisplay={String(home.bigChances)}
          rightDisplay={String(away.bigChances)}
          leftVal={home.bigChances}
          rightVal={away.bigChances}
          leftColor={homeColor}
          rightColor={awayColor}
        />
        <StatRow
          label="Pass Accuracy"
          leftDisplay={`${homePassAcc}%`}
          rightDisplay={`${awayPassAcc}%`}
          leftVal={homePassAcc}
          rightVal={awayPassAcc}
          leftColor={homeColor}
          rightColor={awayColor}
        />
        <StatRow
          label="Corners"
          leftDisplay={String(home.corners)}
          rightDisplay={String(away.corners)}
          leftVal={home.corners}
          rightVal={away.corners}
          leftColor={homeColor}
          rightColor={awayColor}
        />
        <StatRow
          label="Tackles Won"
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
        <div className="border-t border-slate-800 pt-3.5 flex flex-col gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Top Rated Players
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {topPlayers.map((p) => {
              const playerColor = colorOf(p.team);
              const badgeColor =
                p.rating >= 7.5
                  ? "bg-emerald-500 text-slate-950"
                  : p.rating >= 6.8
                    ? "bg-amber-400 text-slate-950"
                    : "bg-slate-700 text-slate-200";

              return (
                <div
                  key={p.name}
                  className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-black tabular-nums shrink-0 ${badgeColor}`}
                    >
                      {p.rating.toFixed(1)}
                    </span>
                    <span className="text-sm font-bold text-slate-200 truncate">
                      {p.name}
                    </span>
                  </div>
                  <span
                    className="text-xs font-bold shrink-0 ml-2"
                    style={{ color: playerColor }}
                  >
                    {p.team}
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
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <span className="font-black text-white tabular-nums w-12 text-left">
          {leftDisplay}
        </span>
        <span className="text-xs font-semibold text-slate-400 tracking-wide">
          {label}
        </span>
        <span className="font-black text-white tabular-nums w-12 text-right">
          {rightDisplay}
        </span>
      </div>

      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
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
